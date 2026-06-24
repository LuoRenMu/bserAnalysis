import type { MatchDetail } from "../types/search";

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

export function formatFixed(value: number | null | undefined, digits = 1) {
    if (value == null || Number.isNaN(value)) return "-";
    return value.toFixed(digits);
}

 export function accentForRank(rank: number,isCobalt:boolean=false) {
    if (isCobalt && rank == 2) return "#4b525d";
    if (rank <= 2) return "#11b288";
    if (rank <= 3) return "#207ac7";
    if (rank == 99) return "#f5a623";
    return "#4b525d";
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

export function damageTakenTotal(detail: MatchDetail) {
    return detail.dmgTakenDirect + detail.dmgTakenItemSkill + detail.dmgTakenUniqueSkill;
}
