import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { CharacterStatsRender } from "../types/characterStats";
import { CacheDuration, generateCacheKey, getCache, setCache } from "../utils/cache";

export const characterStatsResultAtom = atom<CharacterStatsRender | null>(null);
export const characterStatsLoadingAtom = atom(false);
export const characterStatsErrorAtom = atom<string | null>(null);

export const characterStatsMatchingModeAtom = atom("RANK");
export const characterStatsTeamModeAtom = atom("SQUAD");
export const characterStatsTierAtom = atom<string | null>("diamond_plus");
export const characterStatsDtAtom = atom(7);
export const characterStatsPatchAtom = atom<string | null>(null);

export const fetchCharacterStatsAtom = atom(
  null,
  async (
    get,
    set,
    params?: {
      matchingMode?: string;
      teamMode?: string;
      tier?: string | null;
      dt?: number;
      patch?: string | null;
      skipCache?: boolean;
    }
  ) => {
    const matchingMode = params?.matchingMode ?? get(characterStatsMatchingModeAtom);
    const teamMode = params?.teamMode ?? get(characterStatsTeamModeAtom);
    const tier = params?.tier !== undefined ? params.tier : get(characterStatsTierAtom);
    const dt = params?.dt ?? get(characterStatsDtAtom);
    const patch = params?.patch !== undefined ? params.patch : get(characterStatsPatchAtom);
    const skipCache = params?.skipCache === true;

    // Update atoms
    set(characterStatsMatchingModeAtom, matchingMode);
    set(characterStatsTeamModeAtom, teamMode);
    set(characterStatsTierAtom, tier);
    set(characterStatsDtAtom, dt);
    set(characterStatsPatchAtom, patch);

    // Check cache first
    const cacheKey = generateCacheKey("fetch_character_stats", {
      matchingMode,
      teamMode,
      tier,
      dt,
      patch,
    });

    if (!skipCache) {
      const cached = getCache<CharacterStatsRender>(cacheKey);
      if (cached) {
        set(characterStatsResultAtom, cached);
        return;
      }
    }

    set(characterStatsLoadingAtom, true);
    set(characterStatsErrorAtom, null);

    try {
      const result = await invoke<CharacterStatsRender>("fetch_character_stats", {
        matchingMode,
        teamMode,
        tier,
        dt,
        patch,
      });
      set(characterStatsResultAtom, result);
      // Cache for 1 hour - character stats change moderately
      setCache(cacheKey, result, CacheDuration.MEDIUM);
    } catch (error) {
      console.error("fetch_character_stats failed:", error);
      set(characterStatsErrorAtom, String(error));
      set(characterStatsResultAtom, null);
    } finally {
      set(characterStatsLoadingAtom, false);
    }
  }
);
