import type { CreditSource, MatchDetail, PlayerMatchData } from "../types/search";

export type MatchTabKey = "combat" | "economy" | "survival" | "stats" | "mmr";

export function formatNumber(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return "-";
    return value.toLocaleString();
}

export function formatSignedNumber(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return "-";
    if (value > 0) return `+${value.toLocaleString()}`;
    return value.toLocaleString();
}

export function formatDuration(seconds: number | null | undefined) {
    if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatPercentMaybeRatio(value: number | null | undefined, digits = 1) {
    if (value == null || Number.isNaN(value)) return "-";
    const normalized = Math.abs(value) <= 1 ? value * 100 : value;
    return `${normalized.toFixed(digits)}%`;
}

export function formatFixed(value: number | null | undefined, digits = 1) {
    if (value == null || Number.isNaN(value)) return "-";
    return value.toFixed(digits);
}

export function toneForDiff(value: number) {
    if (value > 0) return "pos" as const;
    if (value < 0) return "neg" as const;
    return "default" as const;
}

export function ratioTone(value: number) {
    if (value >= 0.8) return "#11b288";
    if (value >= 0.5) return "#ca9372";
    return "#ef4444";
}

export function escapeStateLabel(state: number) {
    switch (state) {
        case 0:
            return "未撤离";
        case 1:
            return "撤离成功";
        case 2:
            return "撤离失败";
        default:
            return String(state);
    }
}

export function creditSourceLabel(key: string) {
    const map: Record<string, string> = {
        kill: "击杀",
        assist: "助攻",
        animal: "野怪",
        item: "物品",
        airSupply: "空投",
        quest: "任务",
        collection: "采集",
        craft: "制作",
        mastery: "熟练度",
    };
    return map[key] ?? key;
}

export function masteryLabel(key: string) {
    const map: Record<string, string> = {
        baton: "警棍",
        tonfa: "双拐",
        glove: "拳套",
        nunchaku: "双节棍",
        whip: "鞭",
        throwable: "投掷",
        shuriken: "暗器",
        bow: "弓",
        crossbow: "弩",
        pistol: "手枪",
        assaultRifle: "突击步枪",
        sniperRifle: "狙击枪",
        hammer: "锤",
        axe: "斧",
        dualSword: "双剑",
        twoHandSword: "双手剑",
        spear: "长枪",
        bat: "球棒",
    };
    return map[key] ?? key;
}

export function creditSourceTotal(sources: CreditSource[]) {
    return sources.reduce((sum, entry) => sum + entry.amount, 0);
}

export function damageTakenTotal(detail: MatchDetail) {
    return detail.dmgTakenDirect + detail.dmgTakenItemSkill + detail.dmgTakenUniqueSkill;
}

export function isRankedMatch(match: PlayerMatchData) {
    return match.ranked || match.modeId === 3;
}
