import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { CharacterBrief } from "../types/bser";

/**
 * List of all available characters.
 * Cached on backend for 7 days (static data).
 */
export const characterBriefAtom = atom<CharacterBrief[]>([]);

export const characterBriefLoadingAtom = atom(false);

/**
 * Fetches all characters.
 * Backend handles caching automatically.
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

    set(characterBriefLoadingAtom, true);

    try {
      const result = await invoke<CharacterBrief[]>("fetch_characters");
      set(characterBriefAtom, result);
    } catch (error) {
      console.error("fetch_characters failed:", error);
      throw error;
    } finally {
      set(characterBriefLoadingAtom, false);
    }
  }
);

/**
 * Clears character data.
 * Use this when language changes - backend cache will be cleared automatically.
 */
export const clearCharactersAtom = atom(
  null,
  (_get, set) => {
    set(characterBriefAtom, []);
  }
);
