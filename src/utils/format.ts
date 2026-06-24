/**
 * 格式化已为百分比的数值（接收 0-100 范围的值）
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
