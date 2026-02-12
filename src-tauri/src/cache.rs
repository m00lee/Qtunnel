use chrono::{DateTime, Utc};
use lru::LruCache;
use serde::Serialize;
use std::num::NonZeroUsize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub size: usize,
    pub capacity: usize,
}

pub struct CacheEntry<T> {
    value: T,
    created_at: DateTime<Utc>,
    ttl_seconds: u64,
}

impl<T> CacheEntry<T> {
    fn is_expired(&self) -> bool {
        let elapsed = Utc::now()
            .signed_duration_since(self.created_at)
            .num_seconds() as u64;
        elapsed > self.ttl_seconds
    }
}

pub struct Cache<T> {
    cache: Arc<RwLock<LruCache<String, CacheEntry<T>>>>,
    stats: Arc<RwLock<CacheStats>>,
}

impl<T: Clone> Cache<T> {
    pub fn new(capacity: usize) -> Self {
        let size = NonZeroUsize::new(capacity).unwrap_or(NonZeroUsize::new(100).unwrap());
        Cache {
            cache: Arc::new(RwLock::new(LruCache::new(size))),
            stats: Arc::new(RwLock::new(CacheStats {
                hits: 0,
                misses: 0,
                size: 0,
                capacity,
            })),
        }
    }

    pub async fn get(&self, key: &str) -> Option<T> {
        let mut cache = self.cache.write().await;
        
        if let Some(entry) = cache.get_mut(key) {
            if entry.is_expired() {
                cache.pop(key);
                let mut stats = self.stats.write().await;
                stats.misses += 1;
                return None;
            }
            
            let mut stats = self.stats.write().await;
            stats.hits += 1;
            return Some(entry.value.clone());
        }
        
        let mut stats = self.stats.write().await;
        stats.misses += 1;
        None
    }

    pub async fn set(&self, key: String, value: T, ttl_seconds: u64) {
        let entry = CacheEntry {
            value,
            created_at: Utc::now(),
            ttl_seconds,
        };
        
        let mut cache = self.cache.write().await;
        cache.put(key, entry);
        
        let mut stats = self.stats.write().await;
        stats.size = cache.len();
    }

    pub async fn clear(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
        
        let mut stats = self.stats.write().await;
        stats.hits = 0;
        stats.misses = 0;
        stats.size = 0;
    }

    pub async fn get_stats(&self) -> CacheStats {
        self.stats.read().await.clone()
    }

    pub async fn remove(&self, key: &str) {
        let mut cache = self.cache.write().await;
        cache.pop(key);
        
        let mut stats = self.stats.write().await;
        stats.size = cache.len();
    }
}

impl<T: Clone> Clone for Cache<T> {
    fn clone(&self) -> Self {
        Cache {
            cache: self.cache.clone(),
            stats: self.stats.clone(),
        }
    }
}
