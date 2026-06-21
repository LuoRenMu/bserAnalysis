import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { CharacterLeaderboardRender, SeasonBrief } from "../types/leaderboard";
import { CacheDuration, generateCacheKey, getCache, setCache } from "../utils/cache";

// ─────────────────────── Character Leaderboard State ───────────────────────

export const seasonListAtom = atom<SeasonBrief[]>([]);
export const characterLeaderboardResultAtom = atom<CharacterLeaderboardRender | null>(null);
export const characterLeaderboardLoadingAtom = atom(false);
export const characterLeaderboardErrorAtom = atom<string | null>(null);
export const characterLeaderboardCharacterIdAtom = atom<number | null>(null);
export const characterLeaderboardSeasonKeyAtom = atom("SEASON_20");
export const characterLeaderboardTeamModeAtom = atom("SQUAD");
export const characterLeaderboardSortTypeAtom = atom("MATCH_COUNT");
export const characterLeaderboardPageAtom = atom(1);

// ─────────────────────── Character Leaderboard Actions ───────────────────────

type FetchCharacterLeaderboardParams = {
  characterId?: number;
  seasonKey?: string;
  teamMode?: string;
  sortType?: string;
  page?: number;
  skipCache?: boolean;
} | undefined;

/**
 * Fetches the character-specific leaderboard data with caching.
 * Cache duration: 1 hour (character leaderboards update moderately)
 */
export const fetchCharacterLeaderboardAtom = atom(
  null,
  async (get, set, params?: FetchCharacterLeaderboardParams) => {
    if (get(characterLeaderboardLoadingAtom)) return;

    const characterId = params?.characterId ?? get(characterLeaderboardCharacterIdAtom);
    if (!characterId) return;

    const seasonKey = params?.seasonKey ?? get(characterLeaderboardSeasonKeyAtom);
    const teamMode = params?.teamMode ?? get(characterLeaderboardTeamModeAtom);
    const sortType = params?.sortType ?? get(characterLeaderboardSortTypeAtom);
    const page = Math.max(1, params?.page ?? get(characterLeaderboardPageAtom));
    const skipCache = params?.skipCache === true;

    set(characterLeaderboardCharacterIdAtom, characterId);
    set(characterLeaderboardSeasonKeyAtom, seasonKey);
    set(characterLeaderboardTeamModeAtom, teamMode);
    set(characterLeaderboardSortTypeAtom, sortType);
    set(characterLeaderboardPageAtom, page);

    // Check cache first
    const cacheKey = generateCacheKey("fetch_character_leaderboard", {
      characterId,
      seasonKey,
      teamMode,
      sortType,
      page,
    });

    if (!skipCache) {
      const cached = getCache<CharacterLeaderboardRender>(cacheKey);
      if (cached) {
        set(characterLeaderboardResultAtom, cached);
        return;
      }
    }

    set(characterLeaderboardLoadingAtom, true);
    set(characterLeaderboardErrorAtom, null);

    try {
      const result = await invoke<CharacterLeaderboardRender>("fetch_character_leaderboard", {
        characterId,
        seasonKey,
        teamMode,
        sortType,
        page,
      });
      set(characterLeaderboardResultAtom, result);
      // Cache for 1 hour
      setCache(cacheKey, result, CacheDuration.MEDIUM);
    } catch (error) {
      console.error("fetch_character_leaderboard failed:", error);
      set(characterLeaderboardErrorAtom, String(error));
    } finally {
      set(characterLeaderboardLoadingAtom, false);
    }
  }
);

/**
 * Fetches the list of available seasons with caching.
 * Cache duration: 7 days (seasons are relatively static)
 */
export const fetchSeasonsAtom = atom(null, async (get, set) => {
  // Return if already loaded
  if (get(seasonListAtom).length > 0) {
    return;
  }

  const cacheKey = generateCacheKey("fetch_seasons");
  const cached = getCache<SeasonBrief[]>(cacheKey);

  if (cached) {
    set(seasonListAtom, cached);

    // Set the current season as default
    const currentSeason = cached.find((s) => s.isCurrent);
    if (currentSeason) {
      set(characterLeaderboardSeasonKeyAtom, currentSeason.key);
    }
    return;
  }

  try {
    const seasons = await invoke<SeasonBrief[]>("fetch_seasons");
    set(seasonListAtom, seasons);
    setCache(cacheKey, seasons, CacheDuration.STATIC);

    // Set the current season as default
    const currentSeason = seasons.find((s) => s.isCurrent);
    if (currentSeason) {
      set(characterLeaderboardSeasonKeyAtom, currentSeason.key);
    }
  } catch (error) {
    console.error("fetch_seasons failed:", error);
  }
});
