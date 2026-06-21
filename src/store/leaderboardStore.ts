import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { LeaderboardRender } from "../types/leaderboard";
import { CacheDuration, generateCacheKey, getCache, setCache } from "../utils/cache";

// ─────────────────────── Leaderboard State ───────────────────────

export const leaderboardResultAtom = atom<LeaderboardRender | null>(null);
export const leaderboardLoadingAtom = atom(false);
export const leaderboardErrorAtom = atom<string | null>(null);
export const leaderboardPageAtom = atom(1);

/**
 * Selected leaderboard server region (DakGgServerName::value()).
 */
export const leaderboardServerAtom = atom("seoul");

/**
 * Selected leaderboard team mode (DakGgTeamMode::value()).
 */
export const leaderboardTeamAtom = atom("SQUAD");

/**
 * Selected season ID (null = current season)
 */
export const leaderboardSeasonIdAtom = atom<number | null>(null);

// ─────────────────────── Leaderboard Actions ───────────────────────

type FetchLeaderboardParams = {
  server?: string;
  team?: string;
  page?: number;
  skipCache?: boolean;
  seasonId?: number | null;
} | undefined;

/**
 * Fetches the general leaderboard data with caching.
 * Cache duration: 1 hour (leaderboards update frequently but not every second)
 */
export const fetchLeaderboardAtom = atom(null, async (get, set, params?: FetchLeaderboardParams) => {
  if (get(leaderboardLoadingAtom)) return;

  const server = params?.server ?? get(leaderboardServerAtom);
  const team = params?.team ?? get(leaderboardTeamAtom);
  const page = Math.max(1, params?.page ?? get(leaderboardPageAtom));
  const skipCache = params?.skipCache === true;
  const seasonId = params?.seasonId !== undefined ? params.seasonId : get(leaderboardSeasonIdAtom);

  set(leaderboardServerAtom, server);
  set(leaderboardTeamAtom, team);
  set(leaderboardPageAtom, page);
  if (params?.seasonId !== undefined) {
    set(leaderboardSeasonIdAtom, seasonId);
  }

  // Check cache first
  const cacheKey = generateCacheKey("fetch_leaderboard", {
    server,
    team,
    page,
    seasonId,
  });

  if (!skipCache) {
    const cached = getCache<LeaderboardRender>(cacheKey);
    if (cached) {
      set(leaderboardResultAtom, cached);
      set(leaderboardPageAtom, cached.page);
      return;
    }
  }

  set(leaderboardLoadingAtom, true);
  set(leaderboardErrorAtom, null);

  try {
    const result = await invoke<LeaderboardRender>("fetch_leaderboard", {
      server,
      team,
      page,
      seasonId,
    });
    set(leaderboardResultAtom, result);
    set(leaderboardPageAtom, result.page);
    // Cache for 1 hour - leaderboards change moderately
    setCache(cacheKey, result, CacheDuration.MEDIUM);
  } catch (error) {
    console.error("fetch_leaderboard failed:", error);
    set(leaderboardErrorAtom, String(error));
  } finally {
    set(leaderboardLoadingAtom, false);
  }
});
