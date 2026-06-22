use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

/// HTTP 响应元数据（用于条件请求）
#[derive(Debug, Clone)]
pub struct HttpMetadata {
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

/// Cache entry with expiration time and metadata
struct CacheEntry {
    data: String,  // 存储 JSON 字符串
    expires_at: Instant,
    http_metadata: Option<HttpMetadata>,
}

impl CacheEntry {
    fn new(data: String, ttl: Duration) -> Self {
        Self {
            data,
            expires_at: Instant::now() + ttl,
            http_metadata: None,
        }
    }

    fn with_metadata(data: String, ttl: Duration, metadata: HttpMetadata) -> Self {
        Self {
            data,
            expires_at: Instant::now() + ttl,
            http_metadata: Some(metadata),
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() >= self.expires_at
    }

    fn get(&self) -> Option<&str> {
        if self.is_expired() {
            None
        } else {
            Some(&self.data)
        }
    }

    fn metadata(&self) -> Option<&HttpMetadata> {
        self.http_metadata.as_ref()
    }
}

/// Simplified cache using String storage
pub struct Cache {
    store: RwLock<HashMap<String, CacheEntry>>,
    current_language: RwLock<String>,
}

impl Cache {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
            current_language: RwLock::new(String::from("zh_CN")),
        }
    }

    /// Get cached JSON string by key
    pub fn get(&self, key: &str) -> Option<String> {
        let store = self.store.read().unwrap();
        store.get(key).and_then(|entry| entry.get().map(|s| s.to_string()))
    }

    /// Set cached JSON string with TTL
    pub fn set(&self, key: String, data: String, ttl: Duration) {
        let mut store = self.store.write().unwrap();
        store.insert(key, CacheEntry::new(data, ttl));
    }

    /// Set cached JSON string with TTL and HTTP metadata
    pub fn set_with_metadata(
        &self,
        key: String,
        data: String,
        ttl: Duration,
        metadata: HttpMetadata,
    ) {
        let mut store = self.store.write().unwrap();
        store.insert(key, CacheEntry::with_metadata(data, ttl, metadata));
    }

    /// Get HTTP metadata for cached data
    pub fn get_metadata(&self, key: &str) -> Option<HttpMetadata> {
        let store = self.store.read().unwrap();
        store.get(key).and_then(|entry| entry.metadata().cloned())
    }

    /// Remove cached data by key
    pub fn remove(&self, key: &str) {
        let mut store = self.store.write().unwrap();
        store.remove(key);
    }

    /// Clear all cached data
    pub fn clear_all(&self) {
        log::info!("Clearing all cache");
        let mut store = self.store.write().unwrap();
        store.clear();
    }

    /// Update language and clear cache if changed
    pub fn update_language(&self, new_lang: &str) {
        let mut current = self.current_language.write().unwrap();
        if *current != new_lang {
            log::info!("Language changed from {} to {}, clearing cache", *current, new_lang);
            *current = new_lang.to_string();
            drop(current);
            self.clear_all();
        }
    }

    /// Get current language
    pub fn current_language(&self) -> String {
        self.current_language.read().unwrap().clone()
    }
}

impl Default for Cache {
    fn default() -> Self {
        Self::new()
    }
}

/// Global cache instance
pub static CACHE: std::sync::LazyLock<Cache> = std::sync::LazyLock::new(Cache::new);

/// Cache duration presets
pub mod ttl {
    use std::time::Duration;

    /// Static data: 7 days
    pub const STATIC: Duration = Duration::from_secs(7 * 24 * 60 * 60);

    /// Semi-static data: 1 day
    pub const DAILY: Duration = Duration::from_secs(24 * 60 * 60);

    /// Moderate data: 1 hour
    pub const HOURLY: Duration = Duration::from_secs(60 * 60);

    /// Frequent data: 5 minutes
    pub const SHORT: Duration = Duration::from_secs(5 * 60);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_get_set() {
        let cache = Cache::new();

        cache.set("key1".to_string(), "value1".to_string(), Duration::from_secs(10));
        assert_eq!(cache.get("key1"), Some("value1".to_string()));

        cache.set("key2".to_string(), "value2".to_string(), Duration::from_secs(10));
        assert_eq!(cache.get("key2"), Some("value2".to_string()));
    }

    #[test]
    fn test_cache_expiration() {
        let cache = Cache::new();

        cache.set("key".to_string(), "value".to_string(), Duration::from_millis(10));
        assert_eq!(cache.get("key"), Some("value".to_string()));

        std::thread::sleep(Duration::from_millis(20));
        assert_eq!(cache.get("key"), None);
    }

    #[test]
    fn test_cache_remove() {
        let cache = Cache::new();

        cache.set("key".to_string(), "value".to_string(), Duration::from_secs(10));
        assert!(cache.get("key").is_some());

        cache.remove("key");
        assert!(cache.get("key").is_none());
    }

    #[test]
    fn test_cache_clear_all() {
        let cache = Cache::new();

        cache.set("key1".to_string(), "value1".to_string(), Duration::from_secs(10));
        cache.set("key2".to_string(), "value2".to_string(), Duration::from_secs(10));

        cache.clear_all();

        assert!(cache.get("key1").is_none());
        assert!(cache.get("key2").is_none());
    }

    #[test]
    fn test_language_change_clears_cache() {
        let cache = Cache::new();

        cache.set("key".to_string(), "value".to_string(), Duration::from_secs(10));
        assert!(cache.get("key").is_some());

        cache.update_language("en");
        assert!(cache.get("key").is_none());
    }

    #[test]
    fn test_metadata_storage() {
        let cache = Cache::new();

        let metadata = HttpMetadata {
            etag: Some("etag123".to_string()),
            last_modified: Some("Mon, 01 Jan 2024".to_string()),
        };

        cache.set_with_metadata(
            "key".to_string(),
            "value".to_string(),
            Duration::from_secs(10),
            metadata.clone(),
        );

        let retrieved = cache.get_metadata("key").unwrap();
        assert_eq!(retrieved.etag, Some("etag123".to_string()));
        assert_eq!(retrieved.last_modified, Some("Mon, 01 Jan 2024".to_string()));
    }
}
