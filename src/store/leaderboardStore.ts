import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { LeaderboardRender } from "../types/leaderboard";

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
  refresh?: boolean;
  seasonId?: number | null;
} | undefined;

/**
 * Fetches the general leaderboard data.
 */
export const fetchLeaderboardAtom = atom(null, async (get, set, params?: FetchLeaderboardParams) => {
  if (get(leaderboardLoadingAtom)) return;

  const server = params?.server ?? get(leaderboardServerAtom);
  const team = params?.team ?? get(leaderboardTeamAtom);
  const page = Math.max(1, params?.page ?? get(leaderboardPageAtom));
  const refresh = params?.refresh === true;
  const seasonId = params?.seasonId !== undefined ? params.seasonId : get(leaderboardSeasonIdAtom);

  set(leaderboardServerAtom, server);
  set(leaderboardTeamAtom, team);
  set(leaderboardPageAtom, page);
  if (params?.seasonId !== undefined) {
    set(leaderboardSeasonIdAtom, seasonId);
  }
  set(leaderboardLoadingAtom, true);
  set(leaderboardErrorAtom, null);

  try {
    const result = await invoke<LeaderboardRender>("fetch_leaderboard", {
      server,
      team,
      page,
      refresh,
      seasonId,
    });
    set(leaderboardResultAtom, result);
    set(leaderboardPageAtom, result.page);
  } catch (error) {
    console.error("fetch_leaderboard failed:", error);
    set(leaderboardErrorAtom, String(error));
  } finally {
    set(leaderboardLoadingAtom, false);
  }
});
