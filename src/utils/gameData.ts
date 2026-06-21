import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GameReference, InfusionRef, RefEntry, SkillRef } from "../types/bser";

/** id→详情 的查询表，供悬浮提示用。 */
export interface GameData {
    items: Map<number, RefEntry>;
    tacticalSkills: Map<number, RefEntry>;
    traitSkills: Map<number, RefEntry>;
    weapons: Map<number, RefEntry>;
    skills: Map<number, SkillRef>;
    /** 灌注 id（boughtInfusion 的 key）→ 名称/图标。 */
    infusions: Map<number, InfusionRef>;
}

function toMap<T extends { id: number }>(list: T[]): Map<number, T> {
    const map = new Map<number, T>();
    for (const entry of list) map.set(entry.id, entry);
    return map;
}

// 参考数据后端按周缓存，整个会话只拉一次。
let cache: Promise<GameData> | null = null;

export function loadGameData(): Promise<GameData> {
    if (!cache) {
        cache = invoke<GameReference>("fetch_game_reference")
            .then((ref) => ({
                items: toMap(ref.items),
                tacticalSkills: toMap(ref.tacticalSkills),
                traitSkills: toMap(ref.traitSkills),
                weapons: toMap(ref.weapons),
                skills: toMap(ref.skills),
                infusions: toMap(ref.infusions),
            }))
            .catch((error) => {
                // 失败不缓存，下次重试。
                cache = null;
                throw error;
            });
    }
    return cache;
}

export function useGameData(): GameData | null {
    const [data, setData] = useState<GameData | null>(null);
    useEffect(() => {
        let cancelled = false;
        void loadGameData()
            .then((d) => {
                if (!cancelled) setData(d);
            })
            .catch((error) => console.error("fetch_game_reference failed:", error));
        return () => {
            cancelled = true;
        };
    }, []);
    return data;
}

/** 去掉 dak.gg tooltip 里的 <color=…> 等富文本标签。 */
export function stripTags(text: string): string {
    return text.replace(/<[^>]+>/g, "");
}

export type RefKind = "item" | "tactical" | "trait" | "weapon" | "skill" | "traitGroup";

/** 从参考数据按 kind+id 查 {name, tooltip, imageUrl}。 */
export function lookupRef(
    data: GameData | null,
    kind: RefKind,
    id: number,
): { name: string; tooltip: string; imageUrl: string } | null {
    if (!data) return null;
    const map =
        kind === "item" ? data.items
        : kind === "tactical" ? data.tacticalSkills
        : kind === "trait" ? data.traitSkills
        : kind === "weapon" ? data.weapons
        : data.skills;
    const entry =
        id == -1
            ? { name: "威尔逊", tooltip: "神奇小威！", imageUrl: "" }
            : map.get(id);

    return entry
        ? { name: entry.name, tooltip: entry.tooltip, imageUrl: entry.imageUrl }
        : null;
}

/** 灌注 id（boughtInfusion 的 key）→ {name, imageUrl, productType}。 */
export function lookupInfusion(
    data: GameData | null,
    id: number,
): InfusionRef | null {
    if (!data) return null;
    return data.infusions.get(id) ?? null;
}
