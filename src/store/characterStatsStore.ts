import { atom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import type { CharacterStatsRender } from "../types/characterStats";

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
    }
  ) => {
    const matchingMode = params?.matchingMode ?? get(characterStatsMatchingModeAtom);
    const teamMode = params?.teamMode ?? get(characterStatsTeamModeAtom);
    const tier = params?.tier !== undefined ? params.tier : get(characterStatsTierAtom);
    const dt = params?.dt ?? get(characterStatsDtAtom);
    const patch = params?.patch !== undefined ? params.patch : get(characterStatsPatchAtom);

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
    } catch (error) {
      console.error("fetch_character_stats failed:", error);
      set(characterStatsErrorAtom, String(error));
      set(characterStatsResultAtom, null);
    } finally {
      set(characterStatsLoadingAtom, false);
    }
  }
);
