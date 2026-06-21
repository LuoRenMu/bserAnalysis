use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

/// Cache entry with expiration time
struct CacheEntry {
    data: Box<dyn Any + Send + Sync>,
    expires_at: Instant,
    clone_fn: fn(&Box<dyn Any + Send + Sync>) -> Box<dyn Any + Send + Sync>,
}

impl CacheEntry {
    fn new<T: Any + Send + Sync + Clone>(data: T, ttl: Duration) -> Self {
        Self {
            data: Box::new(data),
            expires_at: Instant::now() + ttl,
            clone_fn: |data| {
                let typed = data.downcast_ref::<T>().unwrap();
                Box::new(typed.clone())
            },
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() >= self.expires_at
    }

    fn get<T: Any + Send + Sync + Clone>(&self) -> Option<T> {
        if self.is_expired() {
            None
        } else {
            self.data.downcast_ref::<T>().cloned()
        }
    }
}

impl Clone for CacheEntry {
    fn clone(&self) -> Self {
        Self {
            data: (self.clone_fn)(&self.data),
            expires_at: self.expires_at,
            clone_fn: self.clone_fn,
        }
    }
}

/// Generic cache manager using TypeId as key
pub struct Cache {
    store: RwLock<HashMap<TypeId, CacheEntry>>,
    current_language: RwLock<String>,
}

impl Cache {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
            current_language: RwLock::new(String::from("zh_CN")),
        }
    }

    /// Get cached data by type
    pub fn get<T: Any + Send + Sync + Clone>(&self) -> Option<T> {
        let store = self.store.read().unwrap();
        let type_id = TypeId::of::<T>();

        store.get(&type_id).and_then(|entry| entry.get::<T>())
    }

    /// Set cached data with TTL
    pub fn set<T: Any + Send + Sync + Clone>(&self, data: T, ttl: Duration) {
        let mut store = self.store.write().unwrap();
        let type_id = TypeId::of::<T>();

        store.insert(type_id, CacheEntry::new(data, ttl));
    }

    /// Remove specific type from cache
    pub fn remove<T: Any>(&self) {
        let mut store = self.store.write().unwrap();
        let type_id = TypeId::of::<T>();

        store.remove(&type_id);
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

        cache.set("test_string".to_string(), Duration::from_secs(10));
        assert_eq!(cache.get::<String>(), Some("test_string".to_string()));

        cache.set(42i32, Duration::from_secs(10));
        assert_eq!(cache.get::<i32>(), Some(42));
    }

    #[test]
    fn test_cache_expiration() {
        let cache = Cache::new();

        cache.set("test".to_string(), Duration::from_millis(10));
        assert_eq!(cache.get::<String>(), Some("test".to_string()));

        std::thread::sleep(Duration::from_millis(20));
        assert_eq!(cache.get::<String>(), None);
    }

    #[test]
    fn test_cache_different_types() {
        let cache = Cache::new();

        cache.set("string".to_string(), Duration::from_secs(10));
        cache.set(123i32, Duration::from_secs(10));
        cache.set(vec![1, 2, 3], Duration::from_secs(10));

        assert_eq!(cache.get::<String>(), Some("string".to_string()));
        assert_eq!(cache.get::<i32>(), Some(123));
        assert_eq!(cache.get::<Vec<i32>>(), Some(vec![1, 2, 3]));
    }

    #[test]
    fn test_cache_remove() {
        let cache = Cache::new();

        cache.set("test".to_string(), Duration::from_secs(10));
        assert!(cache.get::<String>().is_some());

        cache.remove::<String>();
        assert!(cache.get::<String>().is_none());
    }

    #[test]
    fn test_cache_clear_all() {
        let cache = Cache::new();

        cache.set("string".to_string(), Duration::from_secs(10));
        cache.set(42i32, Duration::from_secs(10));

        cache.clear_all();

        assert!(cache.get::<String>().is_none());
        assert!(cache.get::<i32>().is_none());
    }

    #[test]
    fn test_language_change_clears_cache() {
        let cache = Cache::new();

        cache.set("test".to_string(), Duration::from_secs(10));
        assert!(cache.get::<String>().is_some());

        cache.update_language("en");
        assert!(cache.get::<String>().is_none());
    }
}
