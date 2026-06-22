import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { GameSnapshot } from "../types/bser";
import type { PlayerSearchRender } from "../types/search";

/**
 * Latest game-data snapshot (null = no data yet).
 */
export const snapshotAtom = atom<GameSnapshot | null>(null);

/**
 * Whether the user has enabled injection attempts (frontend setting).
 * Distinct from `injectAtom` which is only true after backend confirms success.
 */
export const injectEnabledAtom = atom<boolean>(false);

/**
 * Whether the backend has successfully injected into the game.
 */
export const injectAtom = atom<boolean>(false);

/**
 * Overlay player search data (full data from search_player API).
 */
export const overlayPlayerDataAtom = atom<PlayerSearchRender | null>(null);

/**
 * Whether overlay player data is loading.
 */
export const overlayPlayerLoadingAtom = atom(false);

/**
 * Action to fetch overlay player data by nickname.
 */
export const fetchOverlayPlayerAtom = atom(
  null,
  async (get, set, nickname: string) => {
    if (!nickname.trim()) return;
    if (get(overlayPlayerLoadingAtom)) return;

    set(overlayPlayerLoadingAtom, true);
    try {
      const result = await invoke<PlayerSearchRender>("search_player", {
        nickname: nickname.trim(),
        mode: 0,
        page: 1,
      });
      set(overlayPlayerDataAtom, result);
    } catch (error) {
      console.error("fetch overlay player data failed:", error);
      set(overlayPlayerDataAtom, null);
    } finally {
      set(overlayPlayerLoadingAtom, false);
    }
  }
);
