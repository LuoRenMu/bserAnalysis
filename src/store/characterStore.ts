import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { CharacterBrief } from "../types/bser";

/**
 * List of all available characters.
 * Loaded once on application startup.
 */
export const characterBriefAtom = atom(
  await invoke<CharacterBrief[]>("fetch_characters")
);
