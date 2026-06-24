import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {invoke} from "@tauri-apps/api/core";
import {useAtomValue, useSetAtom} from "jotai";
import type {
    AugmentRender,
    CharacterDetailRender,
    PickRender,
    WeaponBuildRender,
} from "../types/bser";
import InfoTooltip from "../components/InfoTooltip";
import {lookupRef, stripTags, type GameData, type RefKind} from "../utils/gameData";
import {gameDataAtom} from "../store";
import {searchPlayerAtom} from "../store";
import {appSettingsAtom, resolvePlayerName} from "../utils/settings";
import {
    CHARACTER_MODES,
    MATCHING_MODE_NAMES,
    TEAM_MODE_NAMES,
    TIERS,
    TIER_LABELS,
} from "../utils/modes";
import {formatUpdated, pct, tierColor} from "../utils/format";
import {ErrorBanner, PageShell} from "../components/ui";

const INITIAL_ITEM_BUILD_COUNT = 5;

function TierBadge({tier, size = "md"}: { tier: string; size?: "md" | "lg" }) {
    const dim = size === "lg" ? "h-10 w-10" : "h-6 w-6";
    const validTier = ["S", "A", "B", "C", "D"].includes(tier) ? tier : null;

    if (!validTier) {
        return (
            <span
                className={`inline-flex ${dim} items-center justify-center rounded font-black text-white`}
                style={{backgroundColor: tierColor(tier)}}
            >
                {tier || "?"}
            </span>
        );
    }

    return (
        <img
            className={dim}
            src={`https://cdn.dak.gg/er/images/character/tier/character-tier-${validTier}.svg`}
            alt={`Tier ${validTier}`}
            title={`Tier ${validTier}`}
        />
    );
}

function PickIcon({
                      pick,
                      kind,
                      data,
                      showRates = true,
                      showName = false,
                  }: {
    pick: PickRender;
    kind: RefKind;
    data: GameData | null;
    showRates?: boolean;
    showName?: boolean;
}) {
    const ref = lookupRef(data, kind, pick.id);
    const title = ref?.name || pick.name;
    const body = ref?.tooltip ? stripTags(ref.tooltip) : undefined;

    return (
        <InfoTooltip title={title} body={body}>
            <div className="flex w-14 flex-col items-center gap-1">
                <div className="relative h-11 w-11 overflow-hidden rounded dark:bg-neutral-800">
                    {pick.bgUrl ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{backgroundImage: `url("${pick.bgUrl}")`}}
                        />
                    ) : null}
                    <img
                        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain"
                        src={pick.iconUrl}
                        alt={pick.name}
                        loading="lazy"
                    />
                </div>
                {showName ? (
                    <div
                        className="w-full truncate text-center text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                        {pick.name}
                    </div>
                ) : null}
                {showRates ? (
                    <div className="text-center leading-tight">
                        <div className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                            {pct(pick.pickRate)}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {pct(pick.winRate)}
                        </div>
                    </div>
                ) : null}
            </div>
        </InfoTooltip>
    );
}

function Section({title, children}: { title: string; children: React.ReactNode }) {
    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="border-b border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-950 dark:border-neutral-800 dark:text-neutral-50">
                {title}
            </h3>
            <div className="p-4">{children}</div>
        </section>
    );
}

function WeaponBuild({build, data}: { build: WeaponBuildRender; data: GameData | null }) {
    const [showAllBuilds, setShowAllBuilds] = useState(false);

    const skillBySlot = useMemo(() => {
        const map: Record<string, { id: number; name: string; iconUrl: string }> = {};
        for (const s of build.skills) {
            map[s.slot] = {id: s.id, name: s.name, iconUrl: s.iconUrl};
        }
        return map;
    }, [build.skills]);

    const skillBuilds = build.skillBuilds.map((skillBuild) => {
        const order = Array.isArray((skillBuild as { order?: string[] }).order)
            ? (skillBuild as { order?: string[] }).order ?? []
            : [];
        return {...skillBuild, order};
    });

    const itemBuilds = build.itemBuilds.map((itemBuild) => {
        const order = Array.isArray((itemBuild as { order?: PickRender[] }).order)
            ? (itemBuild as { order?: PickRender[] }).order ?? []
            : [];
        return {...itemBuild, order};
    });

    return (
        <div className="space-y-4">
            <Section title="武器流派">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-neutral-800">
                            <img className="h-10 w-10 object-contain" src={build.iconUrl} alt={build.weapon}/>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-neutral-950 dark:text-neutral-50">
                                    {build.weapon}
                                </span>
                                <TierBadge tier={build.tier}/>
                            </div>
                            <div className="text-xs text-neutral-500">
                                评分 {build.tierScore.toFixed(1)} · 第 {build.rank}/{build.rankSize} 热门
                            </div>
                        </div>
                    </div>

                    <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6">
                        {[
                            ["登场率", pct(build.pickRate)],
                            ["胜率", pct(build.winRate)],
                            ["前三率", pct(build.top3Rate)],
                            ["平均名次", `#${build.avgRank.toFixed(1)}`],
                            ["平均击杀", build.avgKills.toFixed(1)],
                            ["场次", build.games.toString()],
                        ].map(([label, value]) => (
                            <div key={label}
                                 className="rounded bg-neutral-100 px-2 py-1.5 text-center dark:bg-neutral-800">
                                <div className="text-[10px] text-neutral-500">{label}</div>
                                <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {skillBuilds.length > 0 ? (
                <Section title="技能学习顺序">
                    <div className="space-y-3">
                        {skillBuilds.map((sb, idx) => (
                            <div key={idx} className="rounded bg-neutral-100 p-2 dark:bg-neutral-800/50">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div
                                        className="inline-flex items-center rounded-full bg-[#ca9372]/12 px-2 py-1 text-[11px] font-bold text-[#ca9372]">
                                        方案 #{idx + 1}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        登场率{" "}
                                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                            {pct(sb.pickRate)}
                                        </span>
                                        {" · "}胜率{" "}
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {pct(sb.winRate)}
                                        </span>
                                    </div>
                                </div>

                                {sb.order.length > 0 ? (
                                    <>
                                        <div className="mb-2 text-[11px] font-semibold text-neutral-500">1-15级加点
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1">
                                            {sb.order.map((slot, i) => {
                                                const skill = skillBySlot[slot];
                                                const ref = skill ? lookupRef(data, "skill", skill.id) : null;
                                                return (
                                                    <div key={`${slot}-${i}`} className="flex items-center gap-1">
                                                        {i > 0 ? <span className="text-neutral-400">→</span> : null}
                                                        <InfoTooltip
                                                            title={ref?.name || skill?.name || slot}
                                                            body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                                                        >
                                                            <div className="relative h-10 w-10 overflow-hidden rounded">
                                                                {skill?.iconUrl ? (
                                                                    <img
                                                                        className="h-full w-full object-cover"
                                                                        src={skill.iconUrl}
                                                                        alt={skill?.name ?? slot}
                                                                    />
                                                                ) : null}
                                                                <span
                                                                    className="absolute left-0 top-0 rounded-br bg-[#ca9372] px-1 text-[10px] font-bold text-white">
                                                                    {i + 1}
                                                                </span>
                                                                <span
                                                                    className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] font-bold text-white">
                                                                    {slot}
                                                                </span>
                                                            </div>
                                                        </InfoTooltip>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : null}

                                {sb.priority.length > 0 ? (
                                    <div className="mt-2">
                                        <div className="mb-1 text-[11px] text-neutral-500">满级优先级</div>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {sb.priority.map((slot, i) => {
                                                const skill = skillBySlot[slot];
                                                const ref = skill ? lookupRef(data, "skill", skill.id) : null;
                                                return (
                                                    <div key={`priority-${slot}-${i}`}
                                                         className="flex items-center gap-1">
                                                        {i > 0 ? <span className="text-neutral-400">{">"}</span> : null}
                                                        <InfoTooltip
                                                            title={ref?.name || skill?.name || slot}
                                                            body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                                                        >
                                                            <div className="relative h-8 w-8 overflow-hidden rounded">
                                                                {skill?.iconUrl ? (
                                                                    <img
                                                                        className="h-full w-full object-cover"
                                                                        src={skill.iconUrl}
                                                                        alt={skill?.name ?? slot}
                                                                    />
                                                                ) : null}
                                                                <span
                                                                    className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] font-bold text-white">
                                                                    {slot}
                                                                </span>
                                                            </div>
                                                        </InfoTooltip>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </Section>
            ) : null}

            {itemBuilds.length > 0 ? (
                <Section title="推荐出装顺序">
                    <div className="space-y-2">
                        {(showAllBuilds ? itemBuilds : itemBuilds.slice(0, INITIAL_ITEM_BUILD_COUNT)).map((b, idx) => {
                            const orderItems = b.order.length > 0 ? b.order : b.items;
                            return (
                                <div key={idx} className="rounded bg-neutral-100 p-2 dark:bg-neutral-800/50">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <div
                                            className="inline-flex items-center rounded-full bg-[#ca9372]/12 px-2 py-1 text-[11px] font-bold text-[#ca9372]">
                                            方案 #{idx + 1}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            登场率{" "}
                                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                                {pct(b.pickRate)}
                                            </span>
                                            {" · "}胜率{" "}
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {pct(b.winRate)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-2 text-[11px] font-semibold text-neutral-500">前期出装顺序</div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {orderItems.map((it, i) => {
                                            const ref = lookupRef(data, "item", it.id);
                                            return (
                                                <InfoTooltip
                                                    key={`${it.id}-${i}`}
                                                    title={ref?.name || it.name}
                                                    body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                                                >
                                                    <div
                                                        className="relative h-10 w-10 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                                                        {it.bgUrl ? (
                                                            <div
                                                                className="absolute inset-0 bg-cover bg-center"
                                                                style={{backgroundImage: `url("${it.bgUrl}")`}}
                                                            />
                                                        ) : null}
                                                        <img
                                                            className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 object-contain"
                                                            src={it.iconUrl}
                                                            alt={it.name}
                                                        />
                                                        <span
                                                            className="absolute left-0 top-0 rounded-br bg-[#ca9372] px-1 text-[10px] font-bold text-white">
                                                            {i + 1}
                                                        </span>
                                                    </div>
                                                </InfoTooltip>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-2 text-[11px] text-neutral-500">最终成装</div>
                                    <div className="mt-1 flex flex-wrap gap-1.5 opacity-80">
                                        {b.items.map((it, i) => {
                                            const ref = lookupRef(data, "item", it.id);
                                            return (
                                                <InfoTooltip
                                                    key={`final-${it.id}-${i}`}
                                                    title={ref?.name || it.name}
                                                    body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                                                >
                                                    <div
                                                        className="relative h-9 w-9 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                                                        {it.bgUrl ? (
                                                            <div
                                                                className="absolute inset-0 bg-cover bg-center"
                                                                style={{backgroundImage: `url("${it.bgUrl}")`}}
                                                            />
                                                        ) : null}
                                                        <img
                                                            className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain"
                                                            src={it.iconUrl}
                                                            alt={it.name}
                                                        />
                                                    </div>
                                                </InfoTooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {itemBuilds.length > INITIAL_ITEM_BUILD_COUNT ? (
                        <button
                            type="button"
                            onClick={() => setShowAllBuilds((v) => !v)}
                            className="mt-2 text-xs font-semibold text-[#ca9372] hover:underline"
                        >
                            {showAllBuilds ? "收起" : `显示更多 (${itemBuilds.length - INITIAL_ITEM_BUILD_COUNT})`}
                        </button>
                    ) : null}
                </Section>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                {build.tacticals.length > 0 ? (
                    <Section title="战术技能">
                        <div className="flex flex-wrap gap-3">
                            {build.tacticals.map((t, i) => (
                                <PickIcon key={i} pick={t} kind="tactical" data={data} showName/>
                            ))}
                        </div>
                    </Section>
                ) : null}

                {build.augments.length > 0 ? (
                    <Section title="潜能">
                        <div className={build.augments.every((aug: AugmentRender) => aug.subs.length === 0) ? "flex flex-wrap gap-3" : "space-y-3"}>
                            {build.augments.map((aug: AugmentRender, i) => (
                                aug.subs.length === 0 ? (
                                    <PickIcon key={i} pick={aug.core} kind="trait" data={data} showName/>
                                ) : (
                                    <div
                                        key={i}
                                        className="flex flex-wrap items-center gap-3 rounded bg-neutral-100 p-2 dark:bg-neutral-800/50"
                                    >
                                        <PickIcon pick={aug.core} kind="trait" data={data} showName/>
                                        <div>
                                            <span className="text-neutral-400">→</span>
                                            <div className="flex flex-wrap gap-2">
                                                {aug.subs.map((sub, j) => (
                                                    <PickIcon
                                                        key={j}
                                                        pick={sub}
                                                        kind="trait"
                                                        data={data}
                                                        showName
                                                        showRates={false}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </Section>
                ) : null}
            </div>

            {build.infusions.length > 0 ? (
                <Section title="灌注选择率">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {build.infusions.map((inf, i) => (
                                <PickIcon key={`${inf.id}-${i}`} pick={inf} kind="trait" data={data} showName/>
                            ))}
                        </div>
                    </div>
                </Section>
            ) : null}
        </div>
    );
}

export default function CharacterDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const gameData = useAtomValue(gameDataAtom);
    const settings = useAtomValue(appSettingsAtom);
    const searchPlayer = useSetAtom(searchPlayerAtom);

    const openInSearch = (name: string) => {
        if (!name) return;
        void searchPlayer({nickname: name, page: 1});
        navigate("/search");
    };

    const [detail, setDetail] = useState<CharacterDetailRender | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [weaponIndex, setWeaponIndex] = useState(0);
    const [modeKey, setModeKey] = useState("rank");
    const [tier, setTier] = useState("diamond_plus");

    useEffect(() => {
        const characterId = Number(id);
        if (!Number.isFinite(characterId)) {
            setDetail(null);
            setLoading(false);
            setError("无效的角色 ID");
            return;
        }

        const mode = CHARACTER_MODES.find((m) => m.key === modeKey) ?? CHARACTER_MODES[0];
        let cancelled = false;
        setLoading(true);
        setError(null);
        setDetail(null);
        setWeaponIndex(0);

        void (async () => {
            try {
                const result = await invoke<CharacterDetailRender>("fetch_character_analysis", {
                    characterId,
                    teamMode: mode.teamMode,
                    matchingMode: mode.matchingMode,
                    tier: mode.hasTier ? tier : undefined,
                });
                if (cancelled) return;
                setDetail(result);
            } catch (err) {
                if (cancelled) return;
                console.error("fetch_character_analysis failed:", err);
                setDetail(null);
                setError(String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, modeKey, tier]);

    const mode = CHARACTER_MODES.find((m) => m.key === modeKey) ?? CHARACTER_MODES[0];
    const analysis = detail?.analysis ?? null;
    const weapon = analysis?.weapons[weaponIndex] ?? analysis?.weapons[0] ?? null;

    return (
        <PageShell>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-4 inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                    ← 返回
                </button>

                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-900">
                        {CHARACTER_MODES.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setModeKey(m.key)}
                                className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                                    modeKey === m.key
                                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
                                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {mode.hasTier ? (
                        <select
                            value={tier}
                            onChange={(e) => setTier(e.target.value)}
                            className="h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            {TIERS.map((t) => (
                                <option key={t.key} value={t.key}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    ) : null}
                </div>

                {loading ? <div className="mt-32 text-center text-sm text-neutral-500">Loading...</div> : null}
                {error ? <ErrorBanner message={error}/> : null}

                {detail && !loading ? (
                    <div className="space-y-4">
                        <header
                            className="flex flex-wrap items-center gap-5 overflow-hidden rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                            <img className="h-28 w-28 rounded-lg object-cover" src={detail.imageUrl} alt={detail.name}/>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-neutral-950 dark:text-neutral-50">
                                        {detail.name}
                                    </h1>
                                    {analysis ? <TierBadge tier={analysis.characterTier} size="lg"/> : null}
                                </div>
                                {detail.title ?
                                    <div className="mt-1 text-sm text-neutral-500">{detail.title}</div> : null}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {detail.archetypes
                                        .filter((tag) => tag && tag !== "None")
                                        .map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-[#ca9372]/15 px-2.5 py-0.5 text-xs font-semibold text-[#ca9372]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                </div>
                                {analysis ? (
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                                        <span>
                                            登场率{" "}
                                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                                {pct(analysis.pickRate)}
                                            </span>
                                        </span>
                                        <span>
                                            {MATCHING_MODE_NAMES[analysis.matchingMode] ?? analysis.matchingMode}
                                            {" · "}
                                            {TEAM_MODE_NAMES[analysis.teamMode] ?? analysis.teamMode}
                                        </span>
                                        <span>{TIER_LABELS[analysis.tier] ?? analysis.tier}</span>
                                        <span>版本 {analysis.patches.join(" / ")}</span>
                                        <span>更新 {formatUpdated(analysis.updatedAt)}</span>
                                    </div>
                                ) : null}
                            </div>
                        </header>

                        {analysis && weapon ? (
                            <>
                                {analysis.weapons.length > 1 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.weapons.map((w, i) => (
                                            <button
                                                key={w.weapon}
                                                type="button"
                                                onClick={() => setWeaponIndex(i)}
                                                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                                    i === weaponIndex
                                                        ? "border-[#ca9372] bg-[#ca9372]/10 text-[#ca9372]"
                                                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                                                }`}
                                            >
                                                <span
                                                    className="flex h-5 w-5 items-center justify-center rounded bg-neutral-800">
                                                    <img className="h-4 w-4 object-contain" src={w.iconUrl} alt=""/>
                                                </span>
                                                {w.weapon}
                                                <TierBadge tier={w.tier}/>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                <WeaponBuild key={weapon.weapon} build={weapon} data={gameData}/>

                                {analysis.topPlayers.length > 0 ? (
                                    <Section title="高分玩家">
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                            {analysis.topPlayers.map((p, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => openInSearch(p.name)}
                                                    title={`在 Search 中查询 ${p.name}`}
                                                    className="flex cursor-pointer items-center gap-2 rounded bg-neutral-100 px-2 py-1.5 text-left transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                                >
                                                    {p.tierIconUrl ? (
                                                        <img className="h-7 w-7" src={p.tierIconUrl} alt={p.tierName}/>
                                                    ) : null}
                                                    <div className="min-w-0">
                                                        <div
                                                            className="truncate text-xs font-semibold text-neutral-900 hover:underline dark:text-neutral-100">
                                                            {resolvePlayerName(settings, p.name)}
                                                        </div>
                                                        <div className="text-[10px] text-neutral-500">{p.mmr} MMR</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </Section>
                                ) : null}
                            </>
                        ) : (
                            <div
                                className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                                暂无该角色的统计数据
                            </div>
                        )}

                        <Section title="基础属性">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {detail.stats.map((stat) => (
                                    <div key={stat.label}
                                         className="rounded bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                                        <div className="text-[11px] text-neutral-500">{stat.label}</div>
                                        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                            {Number.isInteger(stat.base) ? stat.base : stat.base.toFixed(2)}
                                            {stat.perLevel ? (
                                                <span className="ml-1 text-[10px] font-normal text-neutral-400">
                                                    +
                                                    {Number.isInteger(stat.perLevel)
                                                        ? stat.perLevel
                                                        : stat.perLevel.toFixed(2)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {detail.skins.length > 0 ? (
                            <Section title={`皮肤 (${detail.skins.length})`}>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                                    {detail.skins.map((skin) => (
                                        <div key={skin.id}
                                             className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                                            <img
                                                className="aspect-square w-full object-cover"
                                                src={skin.imageUrl}
                                                alt={skin.name}
                                                loading="lazy"
                                            />
                                            <div
                                                className="truncate px-2 py-1.5 text-center text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                                                {skin.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        ) : null}
                    </div>
                ) : null}
        </PageShell>
    );
}
