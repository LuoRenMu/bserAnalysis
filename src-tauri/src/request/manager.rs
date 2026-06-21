use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, LazyLock, Mutex},
    time::Duration,
};

use reqwest::{header, Client, Method};
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::{fs, sync::Mutex as AsyncMutex, time::sleep};

use crate::request::error::{RequestError, Result};

pub static REQUEST_MANAGER: LazyLock<RequestManager> = LazyLock::new(RequestManager::new);

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                          (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";

#[derive(Debug, Clone)]
pub struct ApiRequest {
    pub base_url: String,
    pub url: String,
    pub method: Method,
    pub headers: HashMap<String, String>,
    pub body: Option<Value>,
    pub is_resource: bool,
    pub accept_error_status: bool,
}

impl ApiRequest {
    pub fn new(base_url: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            url: url.into(),
            method: Method::GET,
            headers: HashMap::new(),
            body: None,
            is_resource: false,
            accept_error_status: false,
        }
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    pub fn body(mut self, body: Value) -> Self {
        self.body = Some(body);
        self
    }

    pub fn resource(mut self) -> Self {
        self.is_resource = true;
        self
    }

    pub fn accept_error_status(mut self) -> Self {
        self.accept_error_status = true;
        self
    }

    pub fn full_url(&self) -> String {
        normalize_url(&self.base_url, &self.url)
    }
}

#[derive(Debug, Clone)]
pub struct ResourceRequest {
    pub request: ApiRequest,
    pub path: PathBuf,
}

#[derive(Debug, Clone)]
pub struct ResponseBytes {
    pub status: u16,
    pub bytes: Vec<u8>,
}

impl ResponseBytes {
    pub fn is_success(&self) -> bool {
        (200..=207).contains(&self.status)
    }

    pub fn status_error(&self, api: &ApiRequest) -> RequestError {
        RequestError::HttpStatus {
            status: self.status,
            url: api.full_url(),
        }
    }

    pub fn ensure_success(&self, api: &ApiRequest) -> Result<()> {
        if self.is_success() {
            Ok(())
        } else {
            Err(self.status_error(api))
        }
    }
}

pub struct RequestManager {
    client: Client,
    locks: Mutex<HashMap<String, Arc<AsyncMutex<()>>>>,
}

impl RequestManager {
    pub fn new() -> Self {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::USER_AGENT,
            header::HeaderValue::from_static(USER_AGENT),
        );

        let client = Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(60))
            .connect_timeout(Duration::from_secs(60))
            .pool_max_idle_per_host(100)
            .build()
            .expect("failed to build reqwest client");

        Self {
            client,
            locks: Mutex::new(HashMap::new()),
        }
    }

    pub async fn call_json<T>(&self, api: &ApiRequest) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let response = self.call(api).await?;
        Ok(serde_json::from_slice(&response.bytes)?)
    }

    pub async fn call(&self, api: &ApiRequest) -> Result<ResponseBytes> {
        let full_url = api.full_url();

        let key_lock = self.key_lock(&api.url);
        let _guard = key_lock.lock().await;

        let response = self.execute_with_retry(api).await?;
        if !api.accept_error_status && !response.is_success() {
            log::error!("{} {full_url} → HTTP {}", api.method, response.status);
            return Err(response.status_error(api));
        }

        Ok(response)
    }

    pub async fn call_stream(&self, resource: &ResourceRequest, max_retries: usize) -> Result<()> {
        if resource_exists(&resource.path).await {
            return Ok(());
        }

        if let Some(parent) = resource.path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut last_error = None;
        for attempt in 0..max_retries {
            match self.call(&resource.request).await {
                Ok(response) => {
                    fs::write(&resource.path, response.bytes).await?;
                    return Ok(());
                }
                Err(error) => {
                    last_error = Some(error);
                    if is_empty_file(&resource.path).await {
                        let _ = fs::remove_file(&resource.path).await;
                    }
                    if attempt + 1 < max_retries {
                        sleep(Duration::from_millis(250 * (attempt as u64 + 1))).await;
                    }
                }
            }
        }

        Err(last_error.unwrap_or(RequestError::UnexpectedDakGgResponse))
    }

    async fn execute_with_retry(&self, api: &ApiRequest) -> Result<ResponseBytes> {
        let mut last_error = None;
        for attempt in 0..5 {
            match self.execute(api).await {
                Ok(response) if response.status >= 500 && attempt < 4 => {
                    log::warn!(
                        "retry {} after HTTP {} ({}/5)",
                        api.full_url(),
                        response.status,
                        attempt + 1
                    );
                    sleep(backoff(attempt)).await;
                    continue;
                }
                Ok(response) => return Ok(response),
                Err(error) if attempt < 4 => {
                    log::warn!(
                        "retry {} after error: {error} ({}/5)",
                        api.full_url(),
                        attempt + 1
                    );
                    last_error = Some(error);
                    sleep(backoff(attempt)).await;
                }
                Err(error) => {
                    log::error!("giving up {} after error: {error}", api.full_url());
                    return Err(error);
                }
            }
        }

        Err(last_error.unwrap_or(RequestError::UnexpectedDakGgResponse))
    }

    async fn execute(&self, api: &ApiRequest) -> Result<ResponseBytes> {
        let full_url = api.full_url();
        log::debug!("→ {} {full_url}", api.method);

        let mut request = self.client.request(api.method.clone(), &full_url);
        for (key, value) in &api.headers {
            request = request.header(key, value);
        }
        if let Some(body) = &api.body {
            request = request.json(body);
        }

        let response = request.send().await.map_err(|error| {
            log::warn!("✗ {} {full_url} transport error: {error}", api.method);
            error
        })?;
        let status = response.status().as_u16();
        let bytes = response.bytes().await?.to_vec();
        log::debug!("← {status} {full_url} ({} bytes)", bytes.len());

        Ok(ResponseBytes { status, bytes })
    }

    fn key_lock(&self, key: &str) -> Arc<AsyncMutex<()>> {
        let mut locks = self.locks.lock().expect("request lock map poisoned");
        locks
            .entry(key.to_string())
            .or_insert_with(|| Arc::new(AsyncMutex::new(())))
            .clone()
    }
}

impl Default for RequestManager {
    fn default() -> Self {
        Self::new()
    }
}

fn normalize_url(base_url: &str, url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }
    if url.starts_with("//") {
        return format!("https:{url}");
    }
    if base_url.is_empty() {
        return url.to_string();
    }
    match (base_url.ends_with('/'), url.starts_with('/')) {
        (true, true) => format!("{}{}", base_url.trim_end_matches('/'), url),
        (false, false) => format!("{base_url}/{url}"),
        _ => format!("{base_url}{url}"),
    }
}

fn backoff(attempt: usize) -> Duration {
    Duration::from_millis(200 * 2_u64.pow(attempt as u32))
}

async fn resource_exists(path: &Path) -> bool {
    fs::metadata(path)
        .await
        .map(|meta| meta.len() > 0)
        .unwrap_or(false)
}

async fn is_empty_file(path: &Path) -> bool {
    fs::metadata(path)
        .await
        .map(|meta| meta.len() == 0)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_url_handles_slashes_and_protocol_relative_urls() {
        assert_eq!(
            normalize_url("https://example.com/api", "/v1/data"),
            "https://example.com/api/v1/data"
        );
        assert_eq!(
            normalize_url("https://example.com/api/", "v1/data"),
            "https://example.com/api/v1/data"
        );
        assert_eq!(
            normalize_url("", "//cdn.dak.gg/image.png"),
            "https://cdn.dak.gg/image.png"
        );
        assert_eq!(
            normalize_url("https://example.com", "https://other.test/a"),
            "https://other.test/a"
        );
    }

    #[test]
    fn response_success_accepts_kotlin_success_range() {
        assert!(ResponseBytes {
            status: 207,
            bytes: Vec::new(),
        }
        .is_success());
        assert!(!ResponseBytes {
            status: 208,
            bytes: Vec::new(),
        }
        .is_success());
    }

    #[test]
    fn api_request_rejects_error_status_by_default() {
        let api = ApiRequest::new("https://example.com", "/a");
        assert!(!api.accept_error_status);
        assert!(api.accept_error_status().accept_error_status);
    }
}
