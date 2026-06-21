/**
 * Cache utilities for managing API response caching.
 * Provides time-based expiration and cache key generation.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  /**
   * Cache duration in milliseconds.
   * Default: 5 minutes (300000ms)
   */
  ttl?: number;

  /**
   * Whether to ignore cache and force fresh data.
   * Default: false
   */
  skipCache?: boolean;
}

/**
 * Cache duration presets (in milliseconds)
 */
export const CacheDuration = {
  /** 5 minutes - for frequently changing data (match details, player stats) */
  SHORT: 5 * 60 * 1000,

  /** 1 hour - for moderately stable data (leaderboards, character stats) */
  MEDIUM: 60 * 60 * 1000,

  /** 24 hours - for stable data (game data, items, weapons) */
  LONG: 24 * 60 * 60 * 1000,

  /** 7 days - for static data (characters, skills, tiers) */
  STATIC: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * In-memory cache storage.
 * Key: cache key string
 * Value: CacheEntry with data and expiration info
 */
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Generates a cache key from a command name and parameters.
 *
 * @param command - The backend command name (e.g., "fetch_characters")
 * @param params - Optional parameters object
 * @returns A unique cache key string
 */
export function generateCacheKey(command: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return command;
  }

  // Sort keys for consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      // Skip null/undefined values
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

  return `${command}:${JSON.stringify(sortedParams)}`;
}

/**
 * Retrieves data from cache if valid, otherwise returns null.
 *
 * @param key - Cache key
 * @returns Cached data if valid, null otherwise
 */
export function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    // Cache expired, remove it
    cacheStore.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Stores data in cache with expiration time.
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 */
export function setCache<T>(key: string, data: T, ttl: number = CacheDuration.SHORT): void {
  const now = Date.now();
  cacheStore.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

/**
 * Invalidates (removes) a specific cache entry.
 *
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * Invalidates all cache entries matching a pattern.
 * Useful for invalidating all related caches (e.g., all search results for a player).
 *
 * @param pattern - String pattern or RegExp to match cache keys
 */
export function invalidateCacheByPattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  for (const key of cacheStore.keys()) {
    if (regex.test(key)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clears all cache entries.
 */
export function clearAllCache(): void {
  cacheStore.clear();
}

/**
 * Gets cache statistics.
 *
 * @returns Object with cache size and entry count
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cacheStore.size,
    entries: Array.from(cacheStore.keys()),
  };
}

/**
 * Cleans up expired cache entries.
 * This should be called periodically to prevent memory leaks.
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
