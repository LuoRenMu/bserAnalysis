import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  characterStatsResultAtom,
  characterStatsLoadingAtom,
  characterStatsErrorAtom,
  characterStatsMatchingModeAtom,
  characterStatsTeamModeAtom,
  characterStatsTierAtom,
  characterStatsDtAtom,
  characterStatsPatchAtom,
  fetchCharacterStatsAtom,
} from "../store";
import type { CharacterStatsItem } from "../types/characterStats";

const MODE_OPTIONS = [
  { label: "排位", value: "RANK", teamMode: "SQUAD" },
  { label: "钴协议", value: "COBALT", teamMode: "COBALT" },
];

const TIER_OPTIONS = [
  { label: "in1000", value: "in1000" },
  { label: "钻石+", value: "diamond_plus" },
  { label: "无暇+", value: "mithril_plus" },
  { label: "星陨+", value: "meteorite_plus" },
  { label: "修罗+", value: "platinum_plus" },
  { label: "黄金", value: "gold" },
  { label: "铁阎", value: "silver" },
  { label: "黄铜", value: "bronze" },
  { label: "黑铁", value: "iron" },
];

const DT_OPTIONS = [
  { label: "最近3天", value: 3 },
  { label: "最近7天", value: 7 },
];

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function TierBadge({ tier }: { tier: string }) {
  const validTier = ["S", "A", "B", "C", "D"].includes(tier) ? tier : null;

  if (!validTier) {
    return <span className="text-xs font-bold text-neutral-500">{tier || "?"}</span>;
  }

  return (
    <img
      className="h-6 w-6"
      src={`https://cdn.dak.gg/er/images/character/tier/character-tier-${validTier}.svg`}
      alt={`Tier ${validTier}`}
      title={`Tier ${validTier}`}
    />
  );
}

function CharacterStatsRow({ item }: { item: CharacterStatsItem }) {
  return (
    <div className="grid grid-cols-[80px_minmax(120px,1fr)_70px_80px_70px_80px_80px_80px_80px_90px_90px_80px] items-center gap-3 border-t border-neutral-200 px-4 py-3 text-xs dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <div className="relative">
          <img
            className="h-12 w-12 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
            src={item.characterImageUrl}
            alt={item.characterName}
          />
          <img
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-neutral-800 object-contain p-0.5"
            src={item.weaponImageUrl}
            alt={item.weaponName}
            title={item.weaponName}
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
          {item.characterName}
        </div>
        <div className="truncate text-[10px] text-neutral-500">{item.weaponName}</div>
      </div>

      <div className="flex items-center justify-center">
        <TierBadge tier={item.characterTier} />
      </div>

      <div className="text-right tabular-nums text-neutral-700 dark:text-neutral-300">
        {item.matchCount}
      </div>

      <div className="text-right tabular-nums text-neutral-700 dark:text-neutral-300">
        {item.avgRp.toFixed(0)}
      </div>

      <div className="text-right tabular-nums text-neutral-500">
        {item.avgDamage.toFixed(0)}
      </div>

      <div className="text-right tabular-nums text-neutral-500">
        {item.avgSight.toFixed(1)}
      </div>

      <div className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
        {pct(item.winRate)}
      </div>

      <div className="text-right tabular-nums text-neutral-500">{pct(item.top3Rate)}</div>

      <div className="text-right tabular-nums text-neutral-500">
        {item.avgTeamKill.toFixed(1)}
      </div>

      <div className="text-right tabular-nums text-neutral-500">
        {item.avgPlayerKill.toFixed(1)}
      </div>

      <div className="text-right tabular-nums text-neutral-500">{item.pickRate.toFixed(1)}%</div>
    </div>
  );
}

export default function CharacterStats() {
  const result = useAtomValue(characterStatsResultAtom);
  const loading = useAtomValue(characterStatsLoadingAtom);
  const error = useAtomValue(characterStatsErrorAtom);

  const [matchingMode, setMatchingMode] = useAtom(characterStatsMatchingModeAtom);
  const [_teamMode, setTeamMode] = useAtom(characterStatsTeamModeAtom);
  const [tier, setTier] = useAtom(characterStatsTierAtom);
  const [dt, setDt] = useAtom(characterStatsDtAtom);
  const [patch, setPatch] = useAtom(characterStatsPatchAtom);

  const fetchCharacterStats = useSetAtom(fetchCharacterStatsAtom);

  const [patchInput, setPatchInput] = useState("");

  useEffect(() => {
    void fetchCharacterStats();
  }, [fetchCharacterStats]);

  const handleModeChange = (value: string) => {
    if (loading) return;
    const mode = MODE_OPTIONS.find((m) => m.value === value);
    if (!mode) return;
    setMatchingMode(mode.value);
    setTeamMode(mode.teamMode);
    if (mode.value === "COBALT") {
      setTier(null);
    } else if (tier === null) {
      setTier("diamond_plus");
    }
    void fetchCharacterStats({
      matchingMode: mode.value,
      teamMode: mode.teamMode,
      tier: mode.value === "COBALT" ? null : tier || "diamond_plus",
    });
  };

  const handleTierChange = (value: string) => {
    if (loading || matchingMode === "COBALT") return;
    setTier(value);
    void fetchCharacterStats({ tier: value });
  };

  const handleDtChange = (value: number) => {
    if (loading || patch) return;
    setDt(value);
    void fetchCharacterStats({ dt: value, patch: null });
  };

  const handlePatchApply = () => {
    if (loading || !patchInput.trim()) return;
    const patchValue = patchInput.trim();
    setPatch(patchValue);
    void fetchCharacterStats({ patch: patchValue, tier: null });
  };

  const handlePatchClear = () => {
    if (loading) return;
    setPatch(null);
    setPatchInput("");
    void fetchCharacterStats({ patch: null, tier: matchingMode === "COBALT" ? null : tier });
  };

  const isCobalt = matchingMode === "COBALT";
  const hasPatch = !!patch;

  return (
    <div className="h-full overflow-auto bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
      <div className="mx-auto max-w-312.5">
        <header className="mb-4">
          <h1 className="text-2xl font-black text-neutral-950 dark:text-neutral-50">
            角色统计排行
          </h1>
          {result?.updatedAt && (
            <div className="mt-1 text-xs text-neutral-500">更新于 {result.updatedAt}</div>
          )}
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-900">
            {MODE_OPTIONS.map((option) => {
              const active = option.value === matchingMode;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleModeChange(option.value)}
                  disabled={loading}
                  className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                    active
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {!hasPatch && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-900">
              {DT_OPTIONS.map((option) => {
                const active = option.value === dt;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDtChange(option.value)}
                    disabled={loading}
                    className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      active
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={patchInput}
              onChange={(e) => setPatchInput(e.target.value)}
              placeholder="版本号 (如 11040)"
              disabled={loading}
              className="h-8 w-32 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            />
            {hasPatch ? (
              <button
                type="button"
                onClick={handlePatchClear}
                disabled={loading}
                className="h-8 rounded border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                清除版本
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePatchApply}
                disabled={loading || !patchInput.trim()}
                className="h-8 rounded border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                应用版本
              </button>
            )}
          </div>

          {!isCobalt && !hasPatch && (
            <select
              value={tier || "diamond_plus"}
              onChange={(e) => handleTierChange(e.target.value)}
              disabled={loading}
              className="ml-auto h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-312">
              <div className="grid grid-cols-[80px_minmax(120px,1fr)_70px_80px_70px_80px_80px_80px_80px_90px_90px_80px] items-center gap-3 bg-neutral-800 px-4 py-2.5 text-xs font-semibold text-white">
                <div>角色</div>
                <div>名称</div>
                <div className="text-center">评级</div>
                <div className="text-right">场次</div>
                <div className="text-right">平均RP</div>
                <div className="text-right">伤害</div>
                <div className="text-right">视野</div>
                <div className="text-right">WIN</div>
                <div className="text-right">TOP3</div>
                <div className="text-right">队伍击杀</div>
                <div className="text-right">玩家击杀</div>
                <div className="text-right">PICK</div>
              </div>

              {result.items.map((item, index) => (
                <CharacterStatsRow key={`${item.characterId}-${item.weaponId}-${index}`} item={item} />
              ))}

              {result.items.length === 0 && (
                <div className="px-4 py-16 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {loading ? "加载中..." : "暂无数据"}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mt-4 h-6 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {loading ? "加载中..." : ""}
        </div>
      </div>
    </div>
  );
}
