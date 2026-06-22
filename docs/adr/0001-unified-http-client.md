# ADR-0001: Unified HTTP Client Architecture

**Status**: Accepted  
**Date**: 2026-06-22  
**Context**: Refactoring scattered HTTP request, caching, and conditional request logic

---

## Context

The HTTP request layer was split across three modules with overlapping concerns:

- **`RequestManager`** — handled transport (retry, locks, backoff)
- **`Cache`** — handled caching (TTL, ETag, conditional requests)
- **`dakgg_api.rs`** — contained API-specific caching logic (`dakgg_json_conditional`) that duplicated concerns

Callers needed to understand:
- When to use `dakgg_json` vs `dakgg_json_conditional`
- Cache TTL constants scattered across call sites
- HTTP metadata handling (ETag/Last-Modified)
- Whether to use `CACHE.get()` manually or rely on the API layer

This created a **shallow interface** — the complexity of coordinating transport + caching leaked into every API call site.

## Decision

We unified HTTP concerns into a single **`HttpClient`** module with one deep interface:

```rust
HttpClient::fetch<T>(request: Request) -> Result<T>
```

Where `Request` encodes:
- URL, method, headers, body
- **Cache policy**: `NoCache`, `Cached { ttl }`, or `Conditional { ttl }`
- Whether the request is language-dependent (for automatic cache key namespacing)
- Whether to accept error status codes

### Cache Policy Design

```rust
enum CachePolicy {
    NoCache,                      // No caching
    Cached { ttl: Duration },     // Simple TTL-based cache
    Conditional { ttl: Duration }, // Uses ETag/Last-Modified, sends 304 on unchanged
}
```

### Language-Aware Cache Keys

Requests marked `.language_dependent()` automatically namespace their cache keys by language:
- Cache key: `{language}:{url}`
- Changing language naturally invalidates language-dependent entries
- No manual `CACHE.clear_all()` needed on language change

### API Usage Pattern

```rust
// Before: scattered logic
if let Some(cached) = CACHE.get::<T>() { return Ok(cached); }
let url = format!("/v1/data/items?hl={}", get_hl());
let data: T = dakgg_json(url).await?;
CACHE.set(data.clone(), ttl::STATIC);

// After: unified interface
let request = dakgg_request(format!("/v1/data/items?hl={}", get_hl()))
    .cache_policy(CachePolicy::Cached { ttl: ttl::STATIC });
HTTP_CLIENT.fetch(request).await
```

## Consequences

### Positive

- **Locality**: All HTTP concerns (transport, retry, caching, conditional requests) in one module
- **Leverage**: Callers just describe the request + cache policy; no manual cache checks or conditional request logic
- **Testability**: Mock one `HttpClient` interface instead of testing `RequestManager` + `Cache` + `dakgg_api` coordination
- **Language invalidation**: Automatic via cache key namespacing; no manual clearing

### Negative

- **Migration cost**: All API clients need to migrate from `dakgg_json`/`dakgg_json_conditional` to `HttpClient::fetch`
- **Breaking change**: Old `dakgg_json` functions removed (but this is internal API, no external consumers)

### Neutral

- `RequestManager` still exists for backward compatibility with non-HTTP-client code paths (resource downloads)
- Cache module's type-based API (`CACHE.get::<T>()`) still available for non-HTTP use cases

## Implementation Notes

- `dakgg_api.rs` migrated to use `HTTP_CLIENT.fetch()` exclusively
- All static game data APIs use `CachePolicy::Cached { ttl: ttl::STATIC }`
- Current season and tiers use `CachePolicy::Conditional { ttl }` to leverage ETag/Last-Modified
- Player/match queries use `CachePolicy::NoCache` (dynamic data)
- Request locking stays in `HttpClient` to prevent duplicate in-flight requests

## References

- Kotlin reference implementation: `E:\code\Kotlin Code\LoMu-QQBot\http-client\src\main\kotlin\cn\luorenmu\request\RequestManager.kt`
- Uses ktor's `HttpCache` plugin for transparent caching
- Similar pattern: unified transport + caching behind one interface
