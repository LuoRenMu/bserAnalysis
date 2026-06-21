import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { CharacterBrief } from "../types/bser";
import { CacheDuration, generateCacheKey, getCache, setCache, invalidateCacheByPattern } from "../utils/cache";

/**
 * List of all available characters.
 * Cached for 7 days (static data).
 */
export const characterBriefAtom = atom<CharacterBrief[]>([]);

export const characterBriefLoadingAtom = atom(false);

/**
 * Fetches all characters with caching.
 * Characters are static data and cached for 7 days.
 */
export const fetchCharactersAtom = atom(
  null,
  async (get, set) => {
    // Return if already loaded
    if (get(characterBriefAtom).length > 0) {
      return;
    }

    // Check if already loading
    if (get(characterBriefLoadingAtom)) {
      return;
    }

    const cacheKey = generateCacheKey("fetch_characters");
    const cached = getCache<CharacterBrief[]>(cacheKey);

    if (cached) {
      set(characterBriefAtom, cached);
      return;
    }

    set(characterBriefLoadingAtom, true);

    try {
      const result = await invoke<CharacterBrief[]>("fetch_characters");
      set(characterBriefAtom, result);
      setCache(cacheKey, result, CacheDuration.STATIC);
    } catch (error) {
      console.error("fetch_characters failed:", error);
      throw error;
    } finally {
      set(characterBriefLoadingAtom, false);
    }
  }
);

/**
 * Clears character data and cache.
 * Use this when language changes.
 */
export const clearCharactersAtom = atom(
  null,
  (_get, set) => {
    set(characterBriefAtom, []);
    invalidateCacheByPattern("fetch_characters");
  }
);
