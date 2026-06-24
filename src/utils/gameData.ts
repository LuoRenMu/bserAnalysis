import type { InfusionRef, RefEntry, SkillRef } from "../types/bser";

/** id → 详情 的查询表，供悬浮提示用。 */
export interface GameData {
    items: Map<number, RefEntry>;
    tacticalSkills: Map<number, RefEntry>;
    traitSkills: Map<number, RefEntry>;
    weapons: Map<number, RefEntry>;
    skills: Map<number, SkillRef>;
    infusions: Map<number, InfusionRef>;
}

export function toMap<T extends { id: number }>(list: T[]): Map<number, T> {
    const map = new Map<number, T>();
    for (const entry of list) map.set(entry.id, entry);
    return map;
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

/**
 * 使用 Jotai atom 获取游戏参考数据（全局唯一，无 inject 依赖）。
 * 首次消费时自动触发加载；所有组件共享同一份缓存。
 */
export { gameDataAtom, fetchGameDataAtom } from "../store/gameDataStore";
