import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { PlayerSearchRender } from "../types/search";
import { appSettingsAtom, resolvePlayerSearchName } from "../utils/settings";
import { CacheDuration, generateCacheKey, getCache, setCache, invalidateCacheByPattern } from "../utils/cache";

// ─────────────────────── Search State ───────────────────────

export const searchQueryAtom = atom("");
export const searchResultAtom = atom<PlayerSearchRender | null>(null);
export const searchLoadingAtom = atom(false);
export const searchErrorAtom = atom<string | null>(null);
export const searchPageAtom = atom(1);

/**
 * Selected matching-mode filter (MatchingMode::value(); 0 = All/全部).
 */
export const searchModeAtom = atom(0);

// ─────────────────────── Search Actions ───────────────────────

type SearchPlayerParams =
  | string
  | { nickname?: string; page?: number; append?: boolean; mode?: number; skipCache?: boolean }
  | undefined;

/**
 * Searches for a player by nickname with caching.
 * Cache duration: 5 minutes (player match data updates frequently)
 *
 * Note: When skipCache is true (or refresh command), all cached data for this player is invalidated.
 */
export const searchPlayerAtom = atom(null, async (get, set, params?: SearchPlayerParams) => {
  if (get(searchLoadingAtom)) return;

  const nickname = typeof params === "string" ? params : params?.nickname;
  const page = Math.max(1, typeof params === "object" && params?.page ? params.page : get(searchPageAtom));
  const append = typeof params === "object" && params?.append === true;
  const skipCache = typeof params === "object" && params?.skipCache === true;
  const mode = typeof params === "object" && params?.mode != null ? params.mode : get(searchModeAtom);
  const rawQuery = (nickname ?? get(searchQueryAtom)).trim();

  if (!rawQuery) return;

  const query = resolvePlayerSearchName(get(appSettingsAtom), rawQuery).trim();
  if (!query) return;

  set(searchQueryAtom, rawQuery);
  set(searchPageAtom, page);
  set(searchModeAtom, mode);

  const command = skipCache ? "refresh_player" : "search_player";
  const cacheKey = generateCacheKey(command, { nickname: query, mode, page });

  // If skipCache (refresh), invalidate all cache for this player
  if (skipCache) {
    invalidateCacheByPattern(`search_player:.*"nickname":"${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*`);
    invalidateCacheByPattern(`refresh_player:.*"nickname":"${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*`);
  }

  // Check cache first (only for search_player, not refresh_player)
  if (!skipCache) {
    const cached = getCache<PlayerSearchRender>(cacheKey);
    if (cached) {
      const current = get(searchResultAtom);

      if (append && current && current.nickname === cached.nickname) {
        const currentGameIds = new Set(current.matches.map((match) => match.gameId));
        const nextMatches = cached.matches.filter((match) => !currentGameIds.has(match.gameId));
        set(searchResultAtom, {
          ...cached,
          matches: [...current.matches, ...nextMatches],
        });
      } else {
        set(searchResultAtom, cached);
      }

      set(searchPageAtom, cached.page);
      return;
    }
  }

  set(searchLoadingAtom, true);
  set(searchErrorAtom, null);

  try {
    const result = await invoke<PlayerSearchRender>(command, { nickname: query, mode, page });
    const current = get(searchResultAtom);

    if (append && current && current.nickname === result.nickname) {
      const currentGameIds = new Set(current.matches.map((match) => match.gameId));
      const nextMatches = result.matches.filter((match) => !currentGameIds.has(match.gameId));
      const merged = {
        ...result,
        matches: [...current.matches, ...nextMatches],
      };
      set(searchResultAtom, merged);
      // Cache the merged result
      setCache(cacheKey, merged, CacheDuration.SHORT);
    } else {
      set(searchResultAtom, result);
      // Cache for 5 minutes - player data changes frequently
      setCache(cacheKey, result, CacheDuration.SHORT);
    }

    set(searchPageAtom, result.page);
  } catch (error) {
    console.error("search_player failed:", error);
    set(searchErrorAtom, String(error));
  } finally {
    set(searchLoadingAtom, false);
  }
});
