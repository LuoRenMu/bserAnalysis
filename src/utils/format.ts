/**
 * 格式化数值为千位分隔格式
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString("en-US");
}

/**
 * 格式化时间（秒）为 mm:ss 格式
 * @example formatTime(125) => "2:05"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * 格式化时长为可读格式
 * @example formatDuration(3665) => "1h 1m 5s"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * 格式化百分比
 * @example formatPercent(0.1234, 1) => "12.3%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 对局模式映射
 */
export const MATCHING_MODE_MAP: Record<number, string> = {
  0: "全部",
  1: "普通",
  2: "排位",
  3: "钴协议",
};

/**
 * 队伍模式映射
 */
export const TEAM_MODE_MAP: Record<number, string> = {
  1: "单排",
  2: "双排",
  3: "三排",
};

/**
 * 武器类型映射
 */
export const WEAPON_TYPE_MAP: Record<string, string> = {
  Glove: "格斗",
  Tonfa: "双截棍",
  Bat: "球棒",
  Whip: "鞭子",
  HighAngleFire: "投掷",
  DirectFire: "弓",
  Crossbow: "弩",
  Pistol: "手枪",
  AssaultRifle: "突击步枪",
  SniperRifle: "狙击枪",
  Cannon: "火炮",
  Axe: "斧",
  TwoHandedSword: "双手剑",
  Polearm: "长柄",
  DualSword: "双剑",
  Rapier: "刺剑",
  Guitar: "吉他",
  Nunchaku: "双节棍",
  Shuriken: "手里剑",
  Bow: "弓",
};

/**
 * 格式化 MMR 变化（带颜色标识）
 */
export function formatMMRChange(change: number): { text: string; positive: boolean } {
  const positive = change > 0;
  const text = positive ? `+${change}` : String(change);
  return { text, positive };
}

/**
 * 格式化 KDA 比率
 */
export function formatKDA(kills: number, deaths: number, assists: number): string {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  return kda.toFixed(2);
}

/**
 * 获取排名颜色类
 */
export function getRankColorClass(rank: number): string {
  if (rank === 1) return "text-yellow-600 dark:text-yellow-400";
  if (rank === 2) return "text-gray-400 dark:text-gray-300";
  if (rank === 3) return "text-orange-600 dark:text-orange-400";
  return "text-neutral-600 dark:text-neutral-400";
}

/**
 * 获取段位名称
 */
export const TIER_MAP: Record<string, string> = {
  iron: "黑铁",
  bronze: "青铜",
  silver: "白银",
  gold: "黄金",
  platinum: "铂金",
  diamond: "钻石",
  mythril: "秘银",
  titan: "泰坦",
  immortal: "不朽",
};

/**
 * 格式化已为百分比的数值（与 formatPercent 不同，本函数接收 0-100 范围的值）
 * @example pct(12.34) => "12.3%"
 */
export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * 给整数加正号；非正数原样返回字符串
 * @example signed(5) => "+5"; signed(-3) => "-3"; signed(0) => "0"
 */
export function signed(value: number): string {
  return value > 0 ? `+${value}` : value.toString();
}

/**
 * 格式化毫秒时间戳为 "YYYY-MM-DD HH:mm"
 * @example formatUpdated(0) => ""
 */
export function formatUpdated(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 按评级字母返回对应颜色（S/A/B/C/D 及其它）
 * @example tierColor("S") => "#e0457b"
 */
export function tierColor(tier: string): string {
  switch (tier) {
    case "S":
      return "#e0457b";
    case "A":
      return "#ca9372";
    case "B":
      return "#3b82f6";
    case "C":
      return "#10b981";
    default:
      return "#6b7280";
  }
}
