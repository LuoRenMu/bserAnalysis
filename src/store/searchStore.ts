import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { PlayerSearchRender } from "../types/search";
import { appSettingsAtom, resolvePlayerSearchName } from "../utils/settings";

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
  | { nickname?: string; page?: number; append?: boolean; mode?: number; refresh?: boolean }
  | undefined;

/**
 * Searches for a player by nickname.
 * Backend handles caching automatically.
 *
 * - refresh: true calls refresh_player (syncs from server)
 * - refresh: false/undefined calls search_player (uses backend cache)
 */
export const searchPlayerAtom = atom(null, async (get, set, params?: SearchPlayerParams) => {
  if (get(searchLoadingAtom)) return;

  const nickname = typeof params === "string" ? params : params?.nickname;
  const page = Math.max(1, typeof params === "object" && params?.page ? params.page : get(searchPageAtom));
  const append = typeof params === "object" && params?.append === true;
  const refresh = typeof params === "object" && params?.refresh === true;
  const mode = typeof params === "object" && params?.mode != null ? params.mode : get(searchModeAtom);
  const rawQuery = (nickname ?? get(searchQueryAtom)).trim();

  if (!rawQuery) return;

  const query = resolvePlayerSearchName(get(appSettingsAtom), rawQuery).trim();
  if (!query) return;

  set(searchQueryAtom, rawQuery);
  set(searchPageAtom, page);
  set(searchModeAtom, mode);

  const command = refresh ? "refresh_player" : "search_player";

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
    } else {
      set(searchResultAtom, result);
    }

    set(searchPageAtom, result.page);
  } catch (error) {
    console.error("search_player failed:", error);
    set(searchErrorAtom, String(error));
  } finally {
    set(searchLoadingAtom, false);
  }
});
