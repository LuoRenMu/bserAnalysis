import {useCallback, useMemo, useState} from "react";
import type {ComponentProps} from "react";
import {invoke} from "@tauri-apps/api/core";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {useNavigate, type NavigateFunction} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {
    characterBriefAtom,
    searchErrorAtom,
    searchLoadingAtom,
    searchModeAtom,
    searchPageAtom,
    searchPlayerAtom,
    searchQueryAtom,
    searchResultAtom
} from "../store";
import type {EquipRender, PlayerData, PlayerMatchData, PlayerMmrStats, PlayerSearchRender, PlayerSummary} from "../types/search";
import InfoTooltip from "../components/InfoTooltip";
import MatchScoreboard, {type MatchDetailState} from "../components/match/MatchScoreboard";
import type {MatchDetailRender} from "../types/match";
import {lookupInfusion, lookupRef, stripTags, useGameData, type GameData, type RefKind} from "../utils/gameData";
import {createCharacterNavigationHandler, navigateToCharacterByName} from "../utils/navigation";
import type {CharacterBrief} from "../types/bser";
import {calculateVisiblePages} from "../utils/pagination";

interface SkillIcon {
    url: string;
    kind: RefKind;
    id: number;
}

type StatRow = [string, string];

interface TableRow {
    name: string;
    plays: string;
    image: string;
    rp?: string;
    avgRank: string;
    avgDmg?: string;
    winRate?: string;
}

interface UiMatch {
    raw: PlayerMatchData;
    gameId: string;
    version: string;
    rank: string;
    mode: string;
    time: string;
    date: string;
    accent: string;
    character: string;
    characterImage: string;
    level: number;
    modeId: number;
    skills: SkillIcon[];
    kda: string;
    damage: string;
    rp: string;
    rpDiff: number;
    route: string;
    boughtInfusion: string;
    equipment: EquipRender[];
    ranked: boolean;
    kdaRatio: string;
}

function SearchIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="7" cy="7" r="4.5"/>
            <line x1="10.2" y1="10.2" x2="14" y2="14"/>
        </svg>
    );
}

function RefreshIcon({className = "h-4 w-4"}: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M13.65 8a5.65 5.65 0 1 1-1.55-3.9"/>
            <path d="M13.6 2.3v2.6H11"/>
        </svg>
    );
}

function TrendChart({stats}: { stats?: PlayerMmrStats | null }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const values = stats?.values.length ? stats.values : [0];
    const labels = stats?.dates ?? [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = values.length > 1 ? 250 / (values.length - 1) : 0;
    const pointsData = values.map((value, index) => {
        const x = 50 + index * step;
        const y = 94 - ((value - min) / Math.max(max - min, 1)) * 58;
        return { x, y, value };
    });
    const points = pointsData.map(p => `${p.x},${p.y}`).join(" ");

    // 计算Y轴刻度
    const yTicks = [max, Math.round((max + min) / 2), min];

    return (
        <div className="relative">
            <svg viewBox="0 0 330 118" className="h-32 w-full" role="img" aria-label="RP trend">
                {/* Y轴刻度线和文字 */}
                {yTicks.map((tick, index) => {
                    const y = 36 + index * 29; // 36, 65, 94
                    return (
                        <g key={tick}>
                            <line x1="50" y1={y} x2="310" y2={y} stroke="currentColor"
                                  className="text-neutral-200 dark:text-neutral-800" strokeDasharray="2,2"/>
                            <text x="45" y={y + 3} textAnchor="end" className="fill-neutral-500 dark:fill-neutral-400 text-[10px] font-semibold">
                                {tick}
                            </text>
                        </g>
                    );
                })}

                <polyline points={points} fill="none" stroke="#ca9372" strokeWidth="3" strokeLinecap="round"
                          strokeLinejoin="round"/>
                {pointsData.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#ca9372"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                        {hoveredIndex === index && (
                            <>
                                <circle cx={point.x} cy={point.y} r="6" fill="none" stroke="#ca9372" strokeWidth="2"/>
                                <rect
                                    x={point.x - 60}
                                    y={point.y - 11}
                                    width="50"
                                    height="22"
                                    rx="4"
                                    fill="#1f2937"
                                    className="dark:fill-neutral-800"
                                />
                                <text
                                    x={point.x - 35}
                                    y={point.y + 4}
                                    textAnchor="middle"
                                    className="fill-white text-xs font-bold"
                                >
                                    {point.value}
                                </text>
                            </>
                        )}
                    </g>
                ))}
                {labels.map((label, index) => (
                    <text key={`${label}-${index}`} x={50 + index * step} y="112" className="fill-neutral-400 text-[10px]">
                        {label}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function RankSummary({data, season, mode, mmrStats}: {
    data: PlayerData;
    season: string;
    mode: string;
    mmrStats?: PlayerMmrStats | null
}) {
    const { t } = useTranslation();
    const statItems: StatRow[] = [
        [t('search.statsGames'), data.play.toString()],
        [t('search.statsAvgTK'), data.avgTk],
        [t('search.statsAvgKills'), data.avgKill],
        [t('search.statsAvgAssists'), data.avgAssists],
        [t('search.statsAvgRank'), data.avgRank],
        [t('search.statsAvgDamage'), data.avgDmg],
        [t('search.statsTop1'), data.top1],
        [t('search.statsTop2'), data.top2],
        [t('search.statsTop3'), data.top3],
        [t('search.statsAvgAnimals'), data.avgAnimal],
        [t('search.statsAvgCredits'), data.avgCredit],
        [t('search.statsAvgVision'), data.avgVision],
    ];

    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="border-b border-neutral-200 px-4 py-3 text-center text-lg font-semibold text-neutral-950 dark:border-neutral-800 dark:text-neutral-50">
                {mode} {season}
            </h2>

            <div
                className="flex items-center justify-center gap-4 border-b border-neutral-200 px-4 py-5 dark:border-neutral-800">
                <img className="h-16 w-16" src={data.tierImageUrl} alt="rank tier"/>
                <div>
                    <div
                        className="text-2xl font-black text-[#ca9372]">{data.rp == "NULL" ? data.kda + " KDA" : data.rp + " RP"} </div>
                    <div
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{data.rp == "NULL" ? t('search.avgKDA') : data.rpName}</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3">
                {statItems.map(([label, value]) => (
                    <div key={label}
                         className="h-12 rounded bg-neutral-100 px-2 py-1.5 text-center dark:bg-neutral-800">
                        <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{label}</div>
                        <div className="mt-0.5 text-sm font-bold text-orange-600 dark:text-orange-400">{value}</div>
                    </div>
                ))}
            </div>

            {mmrStats && (<div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
                <TrendChart stats={mmrStats}/>
            </div>)}
        </section>
    );
}


function StatsTable({
                        title,
                        rows,
                        onRowSelect,
                        onCharacterSelect,
                    }: {
    title: string;
    rows: TableRow[];
    onRowSelect?: (name: string) => void;
    onCharacterSelect?: (name: string) => void;
}) {
    const { t } = useTranslation();
    if (rows.length === 0) return null;

    const isCharacterTable = title === t('search.tableCharacter');
    const handleClick = isCharacterTable ? onCharacterSelect : onRowSelect;

    return (
        <section
            className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div
                className="grid  grid-cols-[minmax(0,1fr)_72px_72px_82px] bg-neutral-800 px-3 py-2 text-xs font-semibold text-white">
                <div>{title}</div>
                <div className="text-center">{rows[0]?.rp ? t('search.rp') : t('search.winRate')}</div>
                <div className="text-right">{t('search.avgRank')}</div>
                <div className="text-right">{rows[0]?.rp ? t('search.avgDamage') : t('search.games')}</div>
            </div>
            {rows.map((row) => (
                <div
                    key={row.name}
                    className="grid grid-cols-[minmax(0,1fr)_72px_72px_82px] items-center border-t border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800"
                >
                    <button
                        type="button"
                        className={`flex min-w-0 items-center gap-2 text-left ${handleClick ? "cursor-pointer" : "cursor-default"}`}
                        onClick={() => handleClick?.(row.name)}
                    >
                        <img className="h-10 w-10 rounded-full object-cover" src={row.image} alt={row.name}/>
                        <div className="min-w-0">
                            <div
                                className={`truncate font-semibold text-neutral-900 dark:text-neutral-100 ${handleClick && "hover:underline"}`}>{row.name}</div>
                            <div className="truncate text-neutral-500">{row.plays}</div>
                            {row.rp != null && row.winRate != null && (
                                <div className="truncate text-neutral-500">({row.winRate})</div>
                            )}
                        </div>
                    </button>
                    <div
                        className={`text-center font-semibold text-emerald-600 dark:text-emerald-400 ${(row.rp && (parseInt(row.rp) < 0)) && "text-red-500"}`}>{row.rp ?? row.winRate}</div>
                    <div className="text-right font-semibold text-neutral-900 dark:text-neutral-100">{row.avgRank}</div>
                    <div className="text-right text-neutral-500">{row.avgDmg ?? row.plays.split(" ")[0]}</div>
                </div>
            ))}
        </section>
    );
}


function RecentSummary({summary}: { summary?: PlayerSummary | null }) {
    const { t } = useTranslation();
    if (!summary) return null;

    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-semibold text-neutral-950 dark:border-neutral-800 dark:text-neutral-50">
                {t('search.recentSummary')}
            </h2>
            <div className="grid grid-cols-3 gap-3 px-4 py-4 text-center">
                {[
                    [t('search.recentWins', { count: summary.count }), summary.wins],
                    [t('search.recentAvgRank', { count: summary.count }), `#${summary.avgRank}`],
                    [t('search.recentAvgDamage', { count: summary.count }), summary.avgDmg],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <div className="truncate text-xs text-neutral-500">{label}</div>
                        <div className="mt-1 text-lg font-bold text-neutral-950 dark:text-neutral-50">{value}</div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 px-4 pb-4">
                {summary.ranks.map((rank, index) => (
                    <span
                        key={`${rank}-${index}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                        style={{backgroundColor: accentForRank(rank)}}
                    >
                        {rank == 99 ? (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M5.79221 9.71567C5.98067 10.025 6.22298 10.3063 6.54606 10.5032L6.81529 10.6719L6.43836 11.5719C6.19606 12.1344 5.65759 12.5 5.06529 12.5H3.04606C2.66913 12.5 2.3999 12.2188 2.3999 11.825C2.3999 11.4594 2.66913 11.15 3.04606 11.15H5.06529C5.14606 11.15 5.22683 11.1219 5.25375 11.0375L5.79221 9.71567ZM9.72298 3.50005C8.99606 3.50005 8.43067 2.90942 8.43067 2.15005C8.43067 1.4188 8.99606 0.800049 9.72298 0.800049C10.423 0.800049 11.0153 1.4188 11.0153 2.15005C11.0153 2.90942 10.423 3.50005 9.72298 3.50005ZM12.9537 7.57817C13.3037 7.57817 13.5999 7.88755 13.5999 8.25317C13.5999 8.6188 13.3037 8.92817 12.9268 8.92817H11.6345C10.9614 8.92817 10.3961 8.47817 10.2076 7.80317L9.83067 6.50942C9.77683 6.39692 9.72298 6.28442 9.64221 6.17192L8.51144 9.12505L9.91144 9.99692C10.3691 10.3063 10.6384 10.8125 10.6384 11.3469C10.6384 11.4875 10.6114 11.6563 10.5845 11.7969L9.69606 14.7219C9.61529 15.0313 9.34606 15.2 9.07683 15.2C8.59221 15.2 8.43067 14.75 8.43067 14.525C8.43067 14.4688 8.43067 14.4125 8.45759 14.3563L9.34606 11.4313C9.34606 11.4032 9.34606 11.375 9.34606 11.3469C9.34606 11.2907 9.31913 11.2063 9.23836 11.15L6.97683 9.7438C6.51913 9.43442 6.2499 8.92817 6.2499 8.3938C6.2499 8.19692 6.30375 8.00005 6.38452 7.80317L7.32683 5.32817L6.92298 5.2438C6.84221 5.2438 6.76144 5.21567 6.68067 5.21567C6.43836 5.21567 6.22298 5.30005 6.03452 5.4688L4.71529 6.50942C4.60759 6.5938 4.47298 6.65005 4.33836 6.65005C3.93452 6.65005 3.69221 6.31255 3.69221 5.97505C3.69221 5.77817 3.77298 5.5813 3.93452 5.44067L5.22683 4.40005C5.65759 4.06255 6.16913 3.86567 6.68067 3.86567C6.84221 3.86567 7.03067 3.8938 7.21913 3.92192L9.31913 4.42817C10.1537 4.62505 10.7999 5.27192 11.0691 6.11567L11.4191 7.40942C11.4461 7.52192 11.5537 7.57817 11.6345 7.57817H12.9537Z"
                                fill="white"></path>
                        </svg>) : rank}
                    </span>
                ))}
            </div>
        </section>
    );
}

function SkillGrid({skills, data}: { skills: SkillIcon[]; data: GameData | null }) {

    return (
        <div className="grid h-14 w-14 shrink-0 grid-cols-2 gap-1">
            {skills.map((skill, index) => {
                const ref = lookupRef(data, skill.kind, skill.id);
                return (
                    <InfoTooltip key={index} title={ref?.name ?? ""} body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}>
                        <div className={`h-6 w-6 overflow-hidden rounded ${index === 0 ? "bg-neutral-800" : "dark:bg-neutral-800"}`}>
                            <img src={skill.url} alt="" className="h-full w-full object-cover"/>
                        </div>
                    </InfoTooltip>
                );
            })}
        </div>
    );
}

function ItemGrid({equips, data}: { equips: EquipRender[]; data: GameData | null }) {
    return (
        <div className="flex flex-wrap w-22 shrink-0 justify-center grid-cols-[repeat(3,28px)] gap-0.5">
            {equips.map((equip, index) => {
                const ref = lookupRef(data, "item", equip.itemId);
                return (
                    <InfoTooltip key={`${equip.itemUrl}-${index}`} title={ref?.name ?? ""} body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}>
                        <div className="relative h-7 w-7 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                            <div className="absolute inset-0 block h-full w-full bg-cover bg-center"
                                 style={{backgroundImage: `url("${equip.itemBgUrl}")`}}/>
                            <img className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain"
                                 src={equip.itemUrl} alt=""/>
                        </div>
                    </InfoTooltip>
                );
            })}
        </div>
    );
}

function InfusionRow({raw, data}: { raw: string; data: GameData | null }) {
    // 战绩页固定展示 3 个灌注槽：取灌注里的强化（Trait）类，按数量降序取前 3，不足补空槽。
    const slots = useMemo(() => {
        let entries: { id: number; count: number }[] = [];
        try {
            const map = JSON.parse(raw || "{}") as Record<string, number>;
            entries = Object.entries(map).map(([id, count]) => ({id: Number(id), count}));
        } catch {
            entries = [];
        }
        const traits = entries
            .filter((entry) => lookupInfusion(data, entry.id)?.productType === "Trait")
            .sort((a, b) => b.count - a.count || b.id - a.id)
            .slice(0, 3);
        return Array.from({length: 3}, (_, i) => traits[i] ?? null);
    }, [raw, data]);

    return (
        <div className="flex justify-center gap-0.5">
            {slots.map((entry, index) => {
                const ref = entry ? lookupInfusion(data, entry.id) : null;
                return (
                    <InfoTooltip key={entry ? entry.id : `empty-${index}`} title={ref?.name ?? ""}>
                        <div className="relative h-6 w-6 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                            {ref?.imageUrl ? (
                                <img src={ref.imageUrl} alt={ref.name} className="h-full w-full object-cover"/>
                            ) : null}
                            {entry && entry.count > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/70 px-0.5 text-[9px] font-bold leading-tight text-white">
                                    {entry.count}
                                </span>
                            )}
                        </div>
                    </InfoTooltip>
                );
            })}
        </div>
    );
}

function MatchCard({match, data, expanded, detailState, onToggle, characters, navigate}: {
    match: UiMatch;
    data: GameData | null;
    expanded: boolean;
    detailState: MatchDetailState | undefined;
    onToggle: () => void;
    characters: CharacterBrief[];
    navigate: NavigateFunction;
}) {
    const { t } = useTranslation();

    return (
        <article style={{minWidth: "700px"}}
                 className="relative mt-5 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="absolute bottom-0 left-0 top-0 w-2" style={{backgroundColor: match.accent}}/>
            <div className="absolute bottom-0 right-0 top-0 w-2" style={{backgroundColor: match.accent}}/>
            <div
                className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-neutral-100 px-3 py-0.5 text-xs font-semibold text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                Game ID {match.gameId} ({match.version})
            </div>
            <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={onToggle}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onToggle();
                    }
                }}
                className="grid cursor-pointer grid-cols-[74px_76px_64px_minmax(220px,1fr)_96px_20px] items-center gap-3 rounded-lg px-6 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 max-xl:grid-cols-[64px_64px_56px_minmax(150px,1fr)_96px_20px] max-xl:gap-2 max-xl:px-4">
                <div className="text-center text-xs text-neutral-500">
                    <div className="text-base font-bold " style={{color:match.accent}}>{match.rank}</div>
                    <div className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">{match.mode}</div>
                    <div className="mt-1">{match.time}</div>
                    <div>{match.date}</div>
                </div>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={createCharacterNavigationHandler(navigate, characters, match.character)}
                        className="relative mx-auto h-16 w-16 transition-opacity hover:opacity-80"
                    >
                        <img className="h-16 w-16 rounded-full object-cover" src={match.characterImage}
                             alt={match.character}/>
                        <span
                            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-700 bg-white text-[10px] font-black text-neutral-900">
              {match.level}
            </span>
                    </button>
                    <div
                        className="mt-1 truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">{match.character}</div>
                </div>

                <SkillGrid skills={match.skills} data={data}/>

                <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                        {key: "tkka", value: match.kda, label: "TK / K / A"},
                        {key: "damage", value: match.damage, label: "DMG"},
                        ...(match.ranked ? [{
                                key: "rp",
                                value: match.rp,
                                label: `RP`,
                                color: match.rpDiff > 0 ? "green" : "red"
                            }
                        ] : [
                            {key: "kda", value: match.kdaRatio, label: "KDA"}
                        ]),
                    ].map((item) => (
                        <div key={item.key} className="min-w-0">
                            <div className="truncate text-sm font-bold text-neutral-950 dark:text-neutral-50">
                                {item.value}
                            </div>
                            <div className="mt-1 truncate text-xs text-neutral-500">{item.label}&nbsp;&nbsp;
                                {item.color && (<span style={{color: item.color}}>{match.rpDiff > 0 ? '+' : ''}{match.rpDiff}</span>)}
                            </div>
                        </div>
                    ))}
                    {/* 钴协议显示所选灌注；其它模式显示路线 ID。 */}
                    <div className="min-w-0">
                        {match.modeId === 6 ? (
                            <>
                                <InfusionRow raw={match.boughtInfusion} data={data}/>
                                <div className="mt-1 truncate text-xs text-neutral-500">{t('search.infusion')}</div>
                            </>
                        ) : (
                            <>
                                <div className="truncate text-sm font-bold text-neutral-950 dark:text-neutral-50">
                                    {match.route}
                                </div>
                                <div className="mt-1 truncate text-xs text-neutral-500">{t('search.routeId')}</div>
                            </>
                        )}
                    </div>
                </div>

                <ItemGrid equips={match.equipment} data={data}/>
                <div className="flex items-center justify-end text-neutral-400">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3.5 6 8 10.5 12.5 6" />
                    </svg>
                </div>
            </div>
            {expanded && <MatchScoreboard state={detailState} gameData={data}/>}
        </article>
    );
}

function mapRender(render: PlayerSearchRender, t: (key: string, params?: any) => string) {
    const summaryRows: [string, string][] = [
        [t('search.statsGames'), render.data.play.toString()],
        [t('search.statsAvgRank'), render.data.avgRank],
        [t('search.statsAvgKills'), render.data.avgKill],
        [t('search.statsAvgAssists'), render.data.avgAssists],
        [t('search.statsAvgDamage'), render.data.avgDmg],
        ["KDA", render.data.kda],
    ];

    const characterRows = render.characterUseStats.map<TableRow>((row) => ({
        name: row.characterName,
        plays: t('search.gamesPlayed', { count: row.characterPlay }),
        winRate: row.winRate,
        image: row.imageUrl,
        rp: signed(row.getRp),
        avgRank: row.avgRank,
        avgDmg: row.avgDmg.toString(),
    }));

    const partnerRows = render.recentPlayers.map<TableRow>((row) => ({
        name: row.nickname,
        plays: t('search.gamesPlayed', { count: row.plays }),
        winRate: row.winRate,
        avgRank: row.avgRank,
        image: row.imageUrl,
    }));

    const matches = render.matches.map<UiMatch>((match) => ({
        raw: match,
        gameId: match.gameId,
        version: match.version,
        rank: match.modeId == 6 ? match.rank == 1 ? t('search.victory') : t('search.defeat') : match.rank == 99 ? t('search.escaped') : `#${match.rank}`,
        modeId: match.modeId,
        mode: match.typeName,
        time: match.dateHour,
        date: match.dateMonth,
        accent: accentForRank(match.rank,match.modeId == 6),
        character: match.characterName,
        characterImage: match.characterAvatarUrl,
        level: match.level,
        skills: [
            { url: match.weaponUrl, kind: "weapon", id: match.weaponId },
            { url: match.tacticalSkillUrl, kind: "tactical", id: match.tacticalSkillId },
            { url: match.traitSkillUrl, kind: "trait", id: match.traitSkillId },
            { url: match.traitSkillGroupUrl, kind: "traitGroup", id: match.traitSkillGroupId },
        ],
        kda: `${match.tk} / ${match.kill} / ${match.assist}`,
        damage: match.dmg.toString(),
        rp: match.rp.toString(),
        rpDiff: match.rpChange,
        route: match.routeId,
        boughtInfusion: match.detail?.boughtInfusion ?? "{}",
        equipment: match.equips,
        ranked: match.ranked,
        kdaRatio: match.kda.toFixed(2),
    }));

    return {summaryRows, characterRows, partnerRows, matches};
}

function signed(value: number) {
    return value > 0 ? `+${value}` : value.toString();
}


// 6 为钴协议
function accentForRank(rank: number,isCobalt:boolean=false) {
    if (isCobalt && rank == 2) return "#4b525d";
    if (rank <= 2) return "#11b288";
    if (rank <= 3) return "#207ac7";
    if (rank == 99) return "#f5a623";
    return "#4b525d";
}

const PAGE_BUTTON_LIMIT = 20;

export default function Search() {
    const { t } = useTranslation();
    const [query, setQuery] = useAtom(searchQueryAtom);
    const navigate = useNavigate();
    const gameData = useGameData();
    const characters = useAtomValue(characterBriefAtom);
    const render = useAtomValue(searchResultAtom);
    const loading = useAtomValue(searchLoadingAtom);
    const error = useAtomValue(searchErrorAtom);
    const [page, setPage] = useAtom(searchPageAtom);
    const [mode, setMode] = useAtom(searchModeAtom);
    const searchPlayer = useSetAtom(searchPlayerAtom);

    // Wrap mapRender to use translations
    const view = useMemo(() => {
        if (!render) return null;
        return mapRender(render, t);
    }, [render, t]);

    const visiblePages = useMemo(() => calculateVisiblePages(page, render?.totalPage ?? 0, PAGE_BUTTON_LIMIT), [page, render?.totalPage]);
    const [expandedMatches, setExpandedMatches] = useState<Set<string>>(() => new Set());
    const [matchDetails, setMatchDetails] = useState<Record<string, MatchDetailState>>({});

    // 比较模式状态
    const [compareMode, setCompareMode] = useState(false);
    const [compareQuery, setCompareQuery] = useState("");
    const [compareRender, setCompareRender] = useState<PlayerSearchRender | null>(null);
    const [compareLoading, setCompareLoading] = useState(false);
    const [compareError, setCompareError] = useState<string | null>(null);
    const compareView = useMemo(() => {
        if (!compareRender) return null;
        return mapRender(compareRender, t);
    }, [compareRender, t]);

    const loadMatchDetail = useCallback(async (gameId: string, nickname: string, seasonId: number) => {
        setMatchDetails((prev) => ({
            ...prev,
            [gameId]: {loading: true, error: null, data: prev[gameId]?.data ?? null},
        }));
        try {
            const data = await invoke<MatchDetailRender>("get_match_detail", {nickname, seasonId, gameId});
            setMatchDetails((prev) => ({...prev, [gameId]: {loading: false, error: null, data}}));
        } catch (error) {
            console.error("get_match_detail failed:", error);
            setMatchDetails((prev) => ({...prev, [gameId]: {loading: false, error: String(error), data: null}}));
        }
    }, []);

    const handleToggleMatch = useCallback(({gameId,seasonId}: { gameId:string,seasonId:number}) => {
        if (!render) return;
        const willExpand = !expandedMatches.has(gameId);
        setExpandedMatches((prev) => {
            const next = new Set(prev);
            if (next.has(gameId)) next.delete(gameId);
            else next.add(gameId);
            return next;
        });
        if (willExpand) {
            const existing = matchDetails[gameId];
            if (!existing || (!existing.data && !existing.loading)) {
                void loadMatchDetail(gameId, render.nickname,seasonId);
            }
        }
    }, [render, expandedMatches, matchDetails, loadMatchDetail]);

    const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
        event.preventDefault();
        setPage(1);
        void searchPlayer({page: 1});

        // 比较模式下同时查询第二个玩家
        if (compareMode && compareQuery.trim()) {
            void handleCompareSubmit();
        }
    };

    const handleCompareSubmit = async () => {
        if (!compareQuery.trim() || compareLoading) return;

        setCompareLoading(true);
        setCompareError(null);
        try {
            const result = await invoke<PlayerSearchRender>("search_player", {
                nickname: compareQuery,
                mode,
                page: 1,
            });
            setCompareRender(result);
        } catch (error) {
            console.error("compare search failed:", error);
            setCompareError(String(error));
            setCompareRender(null);
        } finally {
            setCompareLoading(false);
        }
    };

    const handleRefresh = () => {
        setPage(1);
        void searchPlayer({skipCache: true, page: 1});
        // 比较模式下也刷新第二个玩家
        if (compareMode && compareQuery.trim()) {
            void handleCompareSubmit();
        }
    };
    const handleModeChange = (value: number) => {
        if (loading || value === mode) return;
        setMode(value);
        setPage(1);
        void searchPlayer({mode: value, page: 1});
        // 比较模式下也更新第二个玩家的模式
        if (compareMode && compareQuery.trim()) {
            void handleCompareSubmit();
        }
    };
    const handlePlayerSelect = (name: string) => {
        setQuery(name);
        setPage(1);
        void searchPlayer({nickname: name, page: 1});
    };
    const handlePageChange = (nextPage: number) => {
        const totalPage = render?.totalPage ?? 0;
        const normalizedPage = Math.max(1, totalPage > 0 ? Math.min(nextPage, totalPage) : nextPage);
        if (normalizedPage === page) return;

        setPage(normalizedPage);
        void searchPlayer({page: normalizedPage});
    };
    const seasonId = render?.seasonId ?? 39;
    let bannerId = Math.floor((seasonId - 1) / 2) * 2 - 27
    const banner = `https://cdn.dak.gg/er/images/bg/bg-landing-search-v${bannerId}.jpg`
    return (
        <div
            className="h-full overflow-auto bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            <div className="mx-auto max-w-312.5">
                <div className={`transition-all duration-500 ease-out ${render ? "translate-y-0" : "translate-y-[34vh]"}`}>
                    {!render && (
                        <div className="mb-4 text-center select-none">
                            <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100">{t('search.title')}</h1>
                            <p className="mt-1 text-sm text-neutral-500">{t('search.subtitle')}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="mb-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {compareMode ? (
                                <>
                                    <div className="relative min-w-64 flex-1">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                            <SearchIcon/>
                                        </div>
                                        <input
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            type="search"
                                            placeholder={t('search.player1Placeholder')}
                                            className="h-10 w-full rounded border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-600"
                                        />
                                    </div>
                                    <div className="relative min-w-64 flex-1">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                            <SearchIcon/>
                                        </div>
                                        <input
                                            value={compareQuery}
                                            onChange={(event) => setCompareQuery(event.target.value)}
                                            type="search"
                                            placeholder={t('search.player2Placeholder')}
                                            className="h-10 w-full rounded border border-blue-500 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-600 dark:border-blue-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="relative min-w-64 flex-1">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <SearchIcon/>
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        type="search"
                                        placeholder={t('search.placeholder')}
                                        className="h-10 w-full rounded border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-600"
                                    />
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || (compareMode && compareLoading)}
                                className="h-10 rounded bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300"
                            >
                                {(loading || compareLoading) ? t('search.loadingButton') : t('search.searchButton')}
                            </button>
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={loading || !query.trim()}
                                title={t('search.refreshTooltip')}
                                aria-label={t('search.refreshTooltip')}
                                className="group flex h-10 w-10 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            >
                                <RefreshIcon
                                    className={`h-4 w-4 transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-180"}`}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCompareMode(!compareMode);
                                    if (compareMode) {
                                        setCompareQuery("");
                                        setCompareRender(null);
                                        setCompareError(null);
                                    }
                                }}
                                className={`h-10 rounded px-4 text-sm font-semibold transition-colors ${
                                    compareMode
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                }`}
                            >
                                {compareMode ? t('search.exitCompare') : t('search.compareMode')}
                            </button>
                        </div>

                        {/* 模式选择器 */}
                        <div className="flex flex-wrap items-center gap-2.5">
                        <span
                            className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{t('search.mode')}</span>
                        <div
                            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-900">
                            {[
                                { label: t('search.all'), value: 0 },
                                { label: t('search.rank'), value: 3 },
                                { label: t('search.normal'), value: 2 },
                                { label: t('search.cobalt'), value: 6 },
                            ].map((option) => {
                                const active = option.value === mode;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={active}
                                        disabled={loading}
                                        onClick={() => handleModeChange(option.value)}
                                        className={`relative h-8 rounded-md px-3.5 text-xs font-semibold transition-all disabled:cursor-wait disabled:opacity-60 ${
                                        active
                                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
                                            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                                    }`}
                                >
                                    {option.label}
                                    {active &&
                                        <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#ca9372]"/>}
                                </button>
                            );
                        })}
                        </div>
                    </div>
                    </form>
                </div>

                {error && <div
                    className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

                {compareError && <div
                    className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{t('search.compareFailed')}: {compareError}</div>}

                {/* 比较模式：双栏显示 */}
                {compareMode && render && view && compareRender && compareView ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* 左侧：玩家1 */}
                        <div className="space-y-4">
                            <header className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                                <div className="flex min-h-36 items-center bg-cover bg-center" style={{backgroundImage: `url(${banner})`}}>
                                    <img className="h-36 w-44 object-cover object-top" src={render.profileImageUrl} alt={`${render.nickname} profile`}/>
                                    <div className="min-w-0 px-4 text-white">
                                        <div className="inline-flex h-6 items-center rounded-full border-2 border-white px-3 text-xs font-bold">Lv.{render.level}</div>
                                        <h2 className="mt-2 truncate text-xl font-black">{render.nickname}</h2>
                                    </div>
                                </div>
                            </header>

                            {render.data.rp && render.data.rpName && (
                                <div className="flex items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                                    {render.data.tierImageUrl && (
                                        <img src={render.data.tierImageUrl} alt={render.data.rpName} className="h-12 w-12 object-contain"/>
                                    )}
                                    <div className="text-center">
                                        <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{render.data.rpName}</div>
                                        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{render.data.rp} RP</div>
                                    </div>
                                </div>
                            )}

                            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <h3 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">{t('search.basicStats')}</h3>
                                <div className="space-y-2">
                                    {view.summaryRows.map(([label, value1], i) => {
                                        const value2 = compareView.summaryRows[i][1];
                                        const num1 = parseFloat(value1.replace(/[,\s]/g, ''));
                                        const num2 = parseFloat(value2.replace(/[,\s]/g, ''));
                                        const isHigher = !isNaN(num1) && !isNaN(num2) && num1 > num2;

                                        return (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
                                                <span className={`text-sm font-semibold ${isHigher ? "text-green-600 dark:text-green-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                                                    {value1}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <h3 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">{t('search.commonCharacters')}</h3>
                                <div className="space-y-2">
                                    {view.characterRows.slice(0, 5).map((row, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <img src={row.image} alt={row.name} className="h-8 w-8 rounded-full"/>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{row.name}</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">{row.plays}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{row.winRate}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* 右侧：玩家2 */}
                        <div className="space-y-4">
                            <header className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                                <div className="flex min-h-36 items-center bg-cover bg-center" style={{backgroundImage: `url(${banner})`}}>
                                    <img className="h-36 w-44 object-cover object-top" src={compareRender.profileImageUrl} alt={`${compareRender.nickname} profile`}/>
                                    <div className="min-w-0 px-4 text-white">
                                        <div className="inline-flex h-6 items-center rounded-full border-2 border-white px-3 text-xs font-bold">Lv.{compareRender.level}</div>
                                        <h2 className="mt-2 truncate text-xl font-black">{compareRender.nickname}</h2>
                                    </div>
                                </div>
                            </header>

                            {compareRender.data.rp && compareRender.data.rpName && (
                                <div className="flex items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                                    {compareRender.data.tierImageUrl && (
                                        <img src={compareRender.data.tierImageUrl} alt={compareRender.data.rpName} className="h-12 w-12 object-contain"/>
                                    )}
                                    <div className="text-center">
                                        <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{compareRender.data.rpName}</div>
                                        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{compareRender.data.rp} RP</div>
                                    </div>
                                </div>
                            )}

                            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <h3 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">{t('search.basicStats')}</h3>
                                <div className="space-y-2">
                                    {compareView.summaryRows.map(([label, value2], i) => {
                                        const value1 = view.summaryRows[i][1];
                                        const num1 = parseFloat(value1.replace(/[,\s]/g, ''));
                                        const num2 = parseFloat(value2.replace(/[,\s]/g, ''));
                                        const isHigher = !isNaN(num1) && !isNaN(num2) && num2 > num1;

                                        return (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
                                                <span className={`text-sm font-semibold ${isHigher ? "text-green-600 dark:text-green-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                                                    {value2}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <h3 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">{t('search.commonCharacters')}</h3>
                                <div className="space-y-2">
                                    {compareView.characterRows.slice(0, 5).map((row, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <img src={row.image} alt={row.name} className="h-8 w-8 rounded-full"/>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{row.name}</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">{row.plays}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{row.winRate}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    /* 正常模式：单栏显示 */
                    render && view && (
                    <>
                        <header className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                            <div
                                className="flex min-h-44 items-center bg-cover bg-center"
                                style={{backgroundImage: `url(${banner})`}}
                            >
                                <img className="h-44 w-56 object-cover object-top" src={render.profileImageUrl}
                                     alt={`${render.nickname} character result`}/>
                                <div className="min-w-0 px-5 text-white">
                                    <div
                                        className="inline-flex h-7 items-center rounded-full border-2 border-white px-4 text-sm font-bold">Lv.{render.level}</div>
                                    <h1 className="mt-3 truncate text-3xl font-black">{render.nickname}</h1>
                                    <div className="mt-4 max-w-xl text-xs font-semibold text-white/85">BETA Version
                                    </div>
                                </div>
                            </div>
                            <div
                                className="h-9 bg-neutral-800 text-center text-[11px] leading-9 text-neutral-300">Design
                                inspired by DakGG · Powered by LoMu-Bot
                            </div>
                        </header>

                        <div className="mt-5 grid gap-5 lg:grid-cols-[370px_minmax(0,1fr)]">
                            <aside className="min-w-0">
                                <RankSummary data={render.data} season={render.season} mode={render.mode}
                                             mmrStats={render.mmrStats}/>
                                <StatsTable
                                    title={t('search.tableCharacter')}
                                    rows={view.characterRows}
                                    onCharacterSelect={(characterName) =>
                                        navigateToCharacterByName(navigate, characters, characterName)
                                    }
                                />
                                <StatsTable title={t('search.tablePartner')} rows={view.partnerRows}
                                            onRowSelect={handlePlayerSelect}/>
                            </aside>

                            <main className="min-w-0">
                                <RecentSummary summary={render.summary}/>
                                {view.matches.map((match) => (
                                    <MatchCard
                                        key={match.gameId}
                                        match={match}
                                        data={gameData}
                                        expanded={expandedMatches.has(match.gameId)}
                                        detailState={matchDetails[match.gameId]}
                                        onToggle={() => handleToggleMatch({gameId: match.gameId, seasonId: match.modeId == 3 ? render.seasonId : 0})}
                                        characters={characters}
                                        navigate={navigate}
                                    />
                                ))}
                                {visiblePages.length > 0 && (
                                    <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
                                         aria-label="Pagination">
                                        <button
                                            type="button"
                                            disabled={loading || page <= 1}
                                            onClick={() => handlePageChange(page - 1)}
                                            className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        >
                                            {t('search.prevPage')}
                                        </button>
                                        {visiblePages.slice(Math.max(0, page - 5), Math.min(page + 5, visiblePages.length)).map((pageNumber) => {
                                            const active = pageNumber === page;

                                            return (
                                                <button
                                                    key={pageNumber}
                                                    type="button"
                                                    aria-current={active ? "page" : undefined}
                                                    disabled={loading}
                                                    onClick={() => handlePageChange(pageNumber)}
                                                    className={`h-9 rounded border px-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                                                        active
                                                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                                                            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                                    }`}
                                                    style={{minWidth: "2.25rem"}}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            disabled={loading || !render.hasNext}
                                            onClick={() => handlePageChange(render.nextPage ?? page + 1)}
                                            className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        >
                                            {t('search.nextPage')}
                                        </button>
                                    </nav>
                                )}
                                <div
                                    className="mt-4 h-9 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                                    {loading ? t('search.loading') : render.hasNext ? "" : t('search.noMoreMatches')}
                                </div>
                            </main>
                        </div>
                    </>
                ))}
            </div>

        </div>
    );
}
