/**
 * 角色统计/详情页共享的模式、段位、时间窗等常量。
 * 来源：CharacterStats.tsx 与 CharacterDetail.tsx 此前各自定义的重复常量。
 */

export interface TierOption {
    key: string;
    label: string;
}

/** 段位筛选选项（CharacterStats 的 TIER_OPTIONS 与 CharacterDetail 的 TIERS 合并） */
export const TIERS: readonly TierOption[] = [
    {key: "in1000", label: "in1000"},
    {key: "diamond_plus", label: "钻石+"},
    {key: "mithril_plus", label: "无暇+"},
    {key: "meteorite_plus", label: "星陨+"},
    {key: "platinum_plus", label: "修罗+"},
    {key: "gold", label: "黄金"},
    {key: "silver", label: "铁阎"},
    {key: "bronze", label: "黄铜"},
    {key: "iron", label: "黑铁"},
] as const;

export const TIER_LABELS: Record<string, string> = Object.fromEntries(
    TIERS.map((t) => [t.key, t.label]),
);

/** 段位下拉用 {label, value} 形态（CharacterStats 直接以 TIER_OPTIONS 使用） */
export const TIER_OPTIONS: { label: string; value: string }[] = TIERS.map((t) => ({
    label: t.label,
    value: t.key,
}));

export interface CharacterMode {
    key: string;
    label: string;
    matchingMode: string;
    teamMode: string;
    hasTier: boolean;
}

/**
 * 角色页的模式选项。CharacterStats 以 {label, value, teamMode} 形态使用，
 * CharacterDetail 以 {key, label, matchingMode, teamMode, hasTier} 形态使用。
 * 这里同时提供两种形态以避免两处各自维护。
 */
export const CHARACTER_MODES: readonly CharacterMode[] = [
    {key: "rank", label: "排位", matchingMode: "RANK", teamMode: "SQUAD", hasTier: true},
    {key: "cobalt", label: "钴协议", matchingMode: "COBALT", teamMode: "COBALT", hasTier: false},
] as const;

/** CharacterStats 使用的 {label, value, teamMode} 形态 */
export const MODE_OPTIONS: { label: string; value: string; teamMode: string }[] =
    CHARACTER_MODES.map((m) => ({label: m.label, value: m.matchingMode, teamMode: m.teamMode}));

/** matchingMode 数字 → 中文（CharacterDetail 的 MATCHING_MODE_NAMES） */
export const MATCHING_MODE_NAMES: Record<number, string> = {
    2: "普通",
    3: "排位",
    6: "钴协议",
};

/** teamMode 数字 → 中文（CharacterDetail 的 TEAM_MODE_NAMES） */
export const TEAM_MODE_NAMES: Record<number, string> = {
    1: "单人",
    2: "双人",
    3: "三人",
    4: "钴协议",
};

/** 时间窗选项（CharacterStats 的 DT_OPTIONS） */
export const DT_OPTIONS: { label: string; value: number }[] = [
    {label: "最近3天", value: 3},
    {label: "最近7天", value: 7},
];
