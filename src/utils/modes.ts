/**
 * 角色统计/详情页共享的模式、段位、时间窗等常量。
 *
 * 来源：CharacterStats.tsx 与 CharacterDetail.tsx 此前各自定义的重复常量。
 *
 * @example
 * ```ts
 * import { TIERS, TIER_OPTIONS, CHARACTER_MODES, DT_OPTIONS } from "../utils/modes";
 * // CharacterDetail 直接用 CHARACTER_MODES
 * const mode = CHARACTER_MODES.find((m) => m.key === modeKey);
 * // CharacterStats 用 MODE_OPTIONS（{label, value, teamMode} 形态）
 * MODE_OPTIONS.map((opt) => <button onClick={() => handleModeChange(opt.value)}>{opt.label}</button>)
 * ```
 */

/** 段位选项，key 对应 API 参数，label 为用户可见文本 */
export interface TierOption {
    key: string;
    label: string;
}

/**
 * 段位筛选选项列表（CharacterStats 的 TIER_OPTIONS 与 CharacterDetail 的 TIERS 合并）。
 * readonly 保证不会被意外修改。
 */
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

/** `key → label` 快速查找表 */
export const TIER_LABELS: Record<string, string> = Object.fromEntries(
    TIERS.map((t) => [t.key, t.label]),
);

/** 段位下拉组件使用的 `{label, value}` 形态（CharacterStats 直接使用） */
export const TIER_OPTIONS: { label: string; value: string }[] = TIERS.map((t) => ({
    label: t.label,
    value: t.key,
}));

/** 角色页模式选项的结构 */
export interface CharacterMode {
    key: string;
    label: string;
    matchingMode: string;
    teamMode: string;
    hasTier: boolean;
}

/**
 * 角色页的模式选项基础定义（readonly）。
 *
 * CharacterStats 通过 {@link MODE_OPTIONS} 使用 `{label, value, teamMode}` 形态，
 * CharacterDetail 直接使用 `{key, label, matchingMode, teamMode, hasTier}` 形态。
 */
export const CHARACTER_MODES: readonly CharacterMode[] = [
    {key: "rank", label: "排位", matchingMode: "RANK", teamMode: "SQUAD", hasTier: true},
    {key: "cobalt", label: "钴协议", matchingMode: "COBALT", teamMode: "COBALT", hasTier: false},
] as const;

/** CharacterStats 使用的 `{label, value, teamMode}` 形态 */
export const MODE_OPTIONS: { label: string; value: string; teamMode: string }[] =
    CHARACTER_MODES.map((m) => ({label: m.label, value: m.matchingMode, teamMode: m.teamMode}));

/** matchingMode 数字 → 中文名称 */
export const MATCHING_MODE_NAMES: Record<number, string> = {
    2: "普通",
    3: "排位",
    6: "钴协议",
};

/** teamMode 数字 → 中文名称 */
export const TEAM_MODE_NAMES: Record<number, string> = {
    1: "单人",
    2: "双人",
    3: "三人",
    4: "钴协议",
};

/** CharacterStats 最近 N 天的时间窗选项 */
export const DT_OPTIONS: { label: string; value: number }[] = [
    {label: "最近3天", value: 3},
    {label: "最近7天", value: 7},
];
