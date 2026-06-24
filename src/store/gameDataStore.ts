import { invoke } from "@tauri-apps/api/core";
import { atom } from "jotai";
import type { GameReference } from "../types/bser";
import type { GameData } from "../utils/gameData";
import { toMap } from "../utils/gameData";

/** 全局唯一的游戏参考数据（技能/物品/武器/灌注等），应用启动后首次消费时加载。 */
export const gameDataAtom = atom<GameData | null>(null);
export const gameDataLoadingAtom = atom(false);

export const fetchGameDataAtom = atom(null, async (get, set) => {
    if (get(gameDataAtom)) return;
    if (get(gameDataLoadingAtom)) return;

    set(gameDataLoadingAtom, true);
    try {
        const ref = await invoke<GameReference>("fetch_game_reference");
        set(gameDataAtom, {
            items: toMap(ref.items),
            tacticalSkills: toMap(ref.tacticalSkills),
            traitSkills: toMap(ref.traitSkills),
            weapons: toMap(ref.weapons),
            skills: toMap(ref.skills),
            infusions: toMap(ref.infusions),
        });
    } catch (error) {
        console.error("fetch_game_reference failed:", error);
    } finally {
        set(gameDataLoadingAtom, false);
    }
});
