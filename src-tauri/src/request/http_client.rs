use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};

use reqwest::Method;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::sync::Mutex as AsyncMutex;

use super::{
    cache::{Cache, HttpMetadata, CACHE},
    error::{RequestError, Result},
    manager::{ApiRequest, ResponseBytes, REQUEST_MANAGER},
};

/// Cache policy for HTTP requests
#[derive(Debug, Clone, Copy)]
pub enum CachePolicy {
    /// No caching
    NoCache,
    /// Simple TTL-based caching
    Cached { ttl: Duration },
    /// Conditional caching using ETag/Last-Modified headers
    Conditional { ttl: Duration },
}

impl CachePolicy {
    pub fn is_cached(&self) -> bool {
        !matches!(self, CachePolicy::NoCache)
    }

    pub fn is_conditional(&self) -> bool {
        matches!(self, CachePolicy::Conditional { .. })
    }

    pub fn ttl(&self) -> Option<Duration> {
        match self {
            CachePolicy::NoCache => None,
            CachePolicy::Cached { ttl } | CachePolicy::Conditional { ttl } => Some(*ttl),
        }
    }
}

/// HTTP request with cache policy and configuration
#[derive(Debug, Clone)]
pub struct Request {
    pub url: String,
    pub base_url: String,
    pub method: Method,
    pub headers: HashMap<String, String>,
    pub body: Option<Value>,
    pub cache_policy: CachePolicy,
    pub accept_error_status: bool,
    pub language_dependent: bool,
}

impl Request {
    pub fn new(base_url: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            base_url: base_url.into(),
            method: Method::GET,
            headers: HashMap::new(),
            body: None,
            cache_policy: CachePolicy::NoCache,
            accept_error_status: false,
            language_dependent: false,
        }
    }

    pub fn get(url: impl Into<String>) -> Self {
        Self::new("", url)
    }

    pub fn method(mut self, method: Method) -> Self {
        self.method = method;
        self
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    pub fn body(mut self, body: Value) -> Self {
        self.body = Some(body);
        self
    }

    pub fn cache_policy(mut self, policy: CachePolicy) -> Self {
        self.cache_policy = policy;
        self
    }

    pub fn accept_error_status(mut self) -> Self {
        self.accept_error_status = true;
        self
    }

    pub fn language_dependent(mut self) -> Self {
        self.language_dependent = true;
        self
    }

    pub fn full_url(&self) -> String {
        if self.url.starts_with("http://") || self.url.starts_with("https://") {
            self.url.clone()
        } else if self.url.starts_with("//") {
            format!("https:{}", self.url)
        } else if self.base_url.is_empty() {
            self.url.clone()
        } else {
            match (self.base_url.ends_with('/'), self.url.starts_with('/')) {
                (true, true) => format!("{}{}", self.base_url.trim_end_matches('/'), self.url),
                (false, false) => format!("{}/{}", self.base_url, self.url),
                _ => format!("{}{}", self.base_url, self.url),
            }
        }
    }

    fn cache_key(&self) -> String {
        if self.language_dependent {
            let lang = crate::settings::get_language();
            format!("{}:{}", lang, self.url)
        } else {
            self.url.clone()
        }
    }

    fn to_api_request(&self) -> ApiRequest {
        let mut api = ApiRequest::new(&self.base_url, &self.url);
        api.method = self.method.clone();
        api.headers = self.headers.clone();
        api.body = self.body.clone();
        api.accept_error_status = self.accept_error_status;
        api
    }
}

/// Unified HTTP client with integrated caching
pub struct HttpClient {
    cache: &'static Cache,
    locks: Mutex<HashMap<String, Arc<AsyncMutex<()>>>>,
}

impl HttpClient {
    pub fn new() -> Self {
        Self {
            cache: &CACHE,
            locks: Mutex::new(HashMap::new()),
        }
    }

    /// Fetch and deserialize JSON response
    pub async fn fetch<T>(&self, request: Request) -> Result<T>
    where
        T: DeserializeOwned,
    {
        match request.cache_policy {
            CachePolicy::NoCache => self.fetch_nocache(&request).await,
            CachePolicy::Cached { ttl } => self.fetch_cached(&request, ttl).await,
            CachePolicy::Conditional { ttl } => self.fetch_conditional(&request, ttl).await,
        }
    }

    /// Fetch raw bytes
    pub async fn fetch_bytes(&self, request: Request) -> Result<Vec<u8>> {
        let api = request.to_api_request();
        let response = self.execute_with_lock(&api).await?;
        Ok(response.bytes)
    }

    /// Fetch and write to file
    pub async fn fetch_to_file(&self, request: Request, path: PathBuf) -> Result<()> {
        use tokio::fs;

        // Check if file already exists
        if fs::metadata(&path)
            .await
            .map(|meta| meta.len() > 0)
            .unwrap_or(false)
        {
            return Ok(());
        }

        // Create parent directory
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let bytes = self.fetch_bytes(request).await?;
        fs::write(&path, bytes).await?;

        Ok(())
    }

    // === Private methods ===

    async fn fetch_nocache<T>(&self, request: &Request) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let api = request.to_api_request();
        let response = self.execute_with_lock(&api).await?;
        Ok(serde_json::from_slice(&response.bytes)?)
    }

    async fn fetch_cached<T>(&self, request: &Request, ttl: Duration) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let cache_key = request.cache_key();

        // Check cache first
        if let Some(cached_json) = self.cache.get(&cache_key) {
            log::debug!("Cache hit for {}", request.full_url());
            return Ok(serde_json::from_str(&cached_json)?);
        }

        // Cache miss - fetch from network
        let api = request.to_api_request();
        let response = self.execute_with_lock(&api).await?;

        // Store raw JSON string in cache
        let json_str = String::from_utf8(response.bytes.clone())
            .map_err(|_| RequestError::UnexpectedDakGgResponse)?;
        self.cache.set(cache_key, json_str, ttl);

        // Deserialize and return
        Ok(serde_json::from_slice(&response.bytes)?)
    }

    async fn fetch_conditional<T>(&self, request: &Request, ttl: Duration) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let cache_key = request.cache_key();

        // Check cache and metadata
        if let Some(cached_json) = self.cache.get(&cache_key) {
            if let Some(metadata) = self.cache.get_metadata(&cache_key) {
                // Build conditional request
                let mut api = request.to_api_request();
                if let Some(etag) = &metadata.etag {
                    api.headers
                        .insert("If-None-Match".to_string(), etag.clone());
                }
                if let Some(last_modified) = &metadata.last_modified {
                    api.headers
                        .insert("If-Modified-Since".to_string(), last_modified.clone());
                }

                let response = self.execute_with_lock(&api).await?;

                // 304 Not Modified - refresh cache TTL and return cached data
                if response.is_not_modified() {
                    log::debug!(
                        "← 304 Not Modified, using cached data for {}",
                        request.full_url()
                    );
                    self.cache
                        .set_with_metadata(cache_key, cached_json.clone(), ttl, metadata);
                    return Ok(serde_json::from_str(&cached_json)?);
                }

                // 200 OK - data updated, parse and cache new data
                if response.is_success() {
                    let json_str = String::from_utf8(response.bytes.clone())
                        .map_err(|_| RequestError::UnexpectedDakGgResponse)?;
                    let new_metadata = HttpMetadata {
                        etag: response.etag,
                        last_modified: response.last_modified,
                    };
                    self.cache
                        .set_with_metadata(cache_key, json_str, ttl, new_metadata);
                    return Ok(serde_json::from_slice(&response.bytes)?);
                }

                return Err(response.status_error(&api));
            } else {
                // Cache hit but no metadata - return cached data
                return Ok(serde_json::from_str(&cached_json)?);
            }
        }

        // Cache miss - first request
        let api = request.to_api_request();
        let response = self.execute_with_lock(&api).await?;

        if !response.is_success() {
            return Err(response.status_error(&api));
        }

        let json_str = String::from_utf8(response.bytes.clone())
            .map_err(|_| RequestError::UnexpectedDakGgResponse)?;
        let metadata = HttpMetadata {
            etag: response.etag,
            last_modified: response.last_modified,
        };
        self.cache
            .set_with_metadata(cache_key, json_str, ttl, metadata);

        Ok(serde_json::from_slice(&response.bytes)?)
    }

    async fn execute_with_lock(&self, api: &ApiRequest) -> Result<ResponseBytes> {
        let lock = self.key_lock(&api.url);
        let _guard = lock.lock().await;
        REQUEST_MANAGER.call(api).await
    }

    fn key_lock(&self, key: &str) -> Arc<AsyncMutex<()>> {
        let mut locks = self.locks.lock().expect("http client lock map poisoned");
        locks
            .entry(key.to_string())
            .or_insert_with(|| Arc::new(AsyncMutex::new(())))
            .clone()
    }
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Global HTTP client instance
pub static HTTP_CLIENT: std::sync::LazyLock<HttpClient> = std::sync::LazyLock::new(HttpClient::new);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_builder_constructs_full_url() {
        let req = Request::new("https://api.example.com", "/v1/users");
        assert_eq!(req.full_url(), "https://api.example.com/v1/users");

        let req = Request::get("https://api.example.com/v1/users");
        assert_eq!(req.full_url(), "https://api.example.com/v1/users");

        let req = Request::get("//cdn.example.com/image.png");
        assert_eq!(req.full_url(), "https://cdn.example.com/image.png");
    }

    #[test]
    fn cache_key_includes_language_when_dependent() {
        let req = Request::get("/api/data").language_dependent();
        let key = req.cache_key();
        assert!(key.contains(":"));
        assert!(key.ends_with("/api/data"));
    }

    #[test]
    fn cache_policy_predicates() {
        let policy = CachePolicy::NoCache;
        assert!(!policy.is_cached());
        assert!(!policy.is_conditional());
        assert_eq!(policy.ttl(), None);

        let policy = CachePolicy::Cached {
            ttl: Duration::from_secs(60),
        };
        assert!(policy.is_cached());
        assert!(!policy.is_conditional());
        assert_eq!(policy.ttl(), Some(Duration::from_secs(60)));

        let policy = CachePolicy::Conditional {
            ttl: Duration::from_secs(60),
        };
        assert!(policy.is_cached());
        assert!(policy.is_conditional());
        assert_eq!(policy.ttl(), Some(Duration::from_secs(60)));
    }
}
