import { useState } from "react";
import type { MatchDetailRender, MatchPlayerRender, TeamRender } from "../../types/match";
import type { GameData } from "../../utils/gameData";
import { lookupInfusion, lookupRef, stripTags, type RefKind } from "../../utils/gameData";
import InfoTooltip from "../InfoTooltip";
import {
    creditSourceLabel,
    damageTakenTotal,
    escapeStateLabel,
    formatDuration,
    formatFixed,
    formatNumber,
    formatSignedNumber,
} from "../../utils/convert";

/** 单局详情的加载状态，Search 与记分板共用。 */
export interface MatchDetailState {
    loading: boolean;
    error: string | null;
    data: MatchDetailRender | null;
}

type StatTile = [label: string, value: string];

// 组队竖线配色（按队内分组下标循环）。
const PREMADE_COLORS = ["#ca9372", "#11b288", "#207ac7", "#a855f7", "#eab308"];

function premadeColor(groupId: number | null): string | null {
    if (groupId == null) return null;
    return PREMADE_COLORS[groupId % PREMADE_COLORS.length];
}

function rankColor(rank: number): string {
    if (rank === 1) return "#f5a623";
    if (rank <= 3) return "#11b288";
    if (rank <= 5) return "#207ac7";
    return "#4b525d";
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
    );
}

export default function MatchScoreboard({
    state,
    gameData,
}: {
    state: MatchDetailState | undefined;
    gameData: GameData | null;
}) {
    if (!state || state.loading) {
        return (
            <div className="border-t border-neutral-200 px-6 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
                加载对局详情...
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="border-t border-neutral-200 px-6 py-4 text-center text-sm text-red-600 dark:border-neutral-800 dark:text-red-400">
                加载失败：{state.error}
            </div>
        );
    }

    if (!state.data) return null;
    const { data } = state;

    return (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-[11px] text-neutral-500 max-xl:px-4">
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">{data.mode}</span>
                <span>{data.serverName}</span>
                <span>{data.matchSize} 名玩家</span>
                <span>时长 {formatDuration(data.durationSec)}</span>
                <span>{data.version}</span>
            </div>
            <div className="space-y-2 px-4 pb-4 max-xl:px-3">
                {data.teams.map((team) => (
                    <TeamBlock key={team.teamNumber} team={team} gameData={gameData} />
                ))}
            </div>
        </div>
    );
}

function TeamBlock({ team, gameData }: { team: TeamRender; gameData: GameData | null }) {
    const isMyTeam = team.players.some((player) => player.isSelf);

    return (
        <div
            className={`overflow-hidden rounded-lg border ${
                isMyTeam
                    ? "border-amber-400/60 dark:border-amber-500/40"
                    : "border-neutral-200 dark:border-neutral-800"
            }`}
        >
            <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800/60">
                <span
                    className="flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-black text-white"
                    style={{ backgroundColor: rankColor(team.rank) }}
                >
                    #{team.rank}
                </span>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    队伍 {team.teamNumber}
                </span>
                {isMyTeam && (
                    <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        我的队伍
                    </span>
                )}
                <span className="ml-auto text-xs text-neutral-500">共 {team.totalKill} 杀</span>
            </div>
            <div>
                {team.players.map((player) => (
                    <PlayerRow key={player.userNum} player={player} gameData={gameData} />
                ))}
            </div>
        </div>
    );
}

function PlayerRow({ player, gameData }: { player: MatchPlayerRender; gameData: GameData | null }) {
    const [open, setOpen] = useState(false);
    const bar = premadeColor(player.premadeGroupId);

    return (
        <div className="border-t border-neutral-200 first:border-t-0 dark:border-neutral-800">
            <div
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpen((value) => !value);
                    }
                }}
                className={`relative flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${
                    player.isSelf ? "bg-amber-50 dark:bg-amber-500/10" : ""
                }`}
            >
                {bar && <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: bar }} />}

                <img
                    src={player.characterAvatarUrl}
                    alt={player.characterName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                />

                <div className="min-w-0 flex-1">
                    <div
                        className={`truncate text-xs font-semibold ${
                            player.isSelf
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-neutral-900 dark:text-neutral-100"
                        }`}
                    >
                        {player.nickname}
                    </div>
                    <div className="truncate text-[11px] text-neutral-500">
                        {player.characterName} · Lv.{player.level}
                    </div>
                </div>

                <SkillGrid player={player} gameData={gameData} />

                <div className="w-20 shrink-0 text-center">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {player.kill} / {player.death} / {player.assist}
                    </div>
                    <div className="text-[10px] text-neutral-500">K / D / A</div>
                </div>

                <div className="w-16 shrink-0 text-right">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(player.dmg)}
                    </div>
                    <div className="text-[10px] text-neutral-500">伤害</div>
                </div>

                <ItemGrid equips={player.equips} gameData={gameData} />

                <Chevron open={open} />
            </div>

            {open && <PlayerDetail player={player} gameData={gameData} />}
        </div>
    );
}

function SkillGrid({ player, gameData }: { player: MatchPlayerRender; gameData: GameData | null }) {
    const skills: { url: string; kind: RefKind; id: number }[] = [
        { url: player.weaponUrl, kind: "weapon", id: player.weaponId },
        { url: player.tacticalSkillUrl, kind: "tactical", id: player.tacticalSkillId },
        { url: player.traitSkillUrl, kind: "trait", id: player.traitSkillId },
        { url: player.traitSkillGroupUrl, kind: "traitGroup", id: player.traitSkillGroupId },
    ];

    return (
        <div className="grid h-14 w-14 shrink-0 grid-cols-2 gap-1">
            {skills.map((skill, index) => {
                const ref = lookupRef(gameData, skill.kind, skill.id);
                return (
                    <InfoTooltip
                        key={index}
                        title={ref?.name ?? ""}
                        body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                    >
                        <div
                            className={`h-6 w-6 overflow-hidden rounded ${
                                index === 0 ? "bg-neutral-800" : "dark:bg-neutral-800"
                            }`}
                        >
                            <img src={skill.url} alt="" className="h-full w-full object-cover" />
                        </div>
                    </InfoTooltip>
                );
            })}
        </div>
    );
}

function ItemGrid({ equips, gameData }: { equips: MatchPlayerRender["equips"]; gameData: GameData | null }) {
    return (
        <div className="flex w-[5.5rem] shrink-0 flex-wrap justify-center gap-0.5">
            {equips.map((equip, index) => {
                const ref = lookupRef(gameData, "item", equip.itemId);
                return (
                    <InfoTooltip
                        key={`${equip.itemId}-${index}`}
                        title={ref?.name ?? ""}
                        body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                    >
                        <div className="relative h-7 w-7 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                            {equip.itemBgUrl ? (
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url("${equip.itemBgUrl}")` }}
                                />
                            ) : null}
                            <img
                                className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain"
                                src={equip.itemUrl}
                                alt=""
                            />
                        </div>
                    </InfoTooltip>
                );
            })}
        </div>
    );
}

function PlayerDetail({ player, gameData }: { player: MatchPlayerRender; gameData: GameData | null }) {
    const d = player.detail;

    const combat: StatTile[] = [
        ["造成伤害", formatNumber(player.dmg)],
        ["承受伤害", formatNumber(damageTakenTotal(d))],
        ["治疗量", formatNumber(d.healAmount)],
        ["团队治疗", formatNumber(d.teamRecover)],
        ["护盾吸收", formatNumber(d.protectAbsorb)],
        ["控制时间", `${formatFixed(d.ccTime, 1)}s`],
        ["野怪击杀", formatNumber(d.monsterKill)],
        ["技能增幅", formatNumber(d.skillAmp)],
    ];

    const survival: StatTile[] = [
        ["存活时间", formatDuration(d.survivableTime)],
        ["游玩时间", formatDuration(d.playTime)],
        ["撤离状态", escapeStateLabel(d.escapeState)],
        ["最高武器等级", String(d.bestWeaponLevel)],
    ];

    const craft: StatTile[] = [
        ["高级制作", formatNumber(d.craftUncommon)],
        ["稀有制作", formatNumber(d.craftRare)],
        ["史诗制作", formatNumber(d.craftEpic)],
        ["传说制作", formatNumber(d.craftLegend)],
    ];

    const ranked: StatTile[] = [
        ["MMR 变化", formatSignedNumber(d.mmrGainInGame)],
        ["赛前 MMR", formatNumber(d.mmrBefore)],
        ["K 因子", formatFixed(d.kFactor, 1)],
        ["段位分", formatNumber(d.rankPoint)],
    ];
    const showRanked =
        d.mmrGainInGame !== 0 || d.mmrBefore !== 0 || d.kFactor !== 0 || d.rankPoint !== 0;

    const credits = d.creditSources.filter((source) => source.amount > 0);
    const transferItems = [...player.creditDrone, ...player.creditKiosk];
    const infusions = player.boughtInfusions;

    return (
        <div className="space-y-3 border-t border-neutral-200 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
            <StatSection title="战斗" tiles={combat} />
            <StatSection title="生存" tiles={survival} />

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <SectionTitle>经济来源</SectionTitle>
                    {credits.length > 0 ? (
                        <div className="space-y-1">
                            {credits.map((source) => (
                                <div
                                    key={source.key}
                                    className="flex items-center justify-between rounded bg-white px-2 py-1 text-[11px] dark:bg-neutral-800"
                                >
                                    <span className="text-neutral-600 dark:text-neutral-300">
                                        {creditSourceLabel(source.key)}
                                    </span>
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                        {formatNumber(Math.round(source.amount))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[11px] text-neutral-400">无数据</div>
                    )}
                </div>
                <StatSection title="制作" tiles={craft} compact />
            </div>

            <KillDeathSection player={player} />

            {infusions.length > 0 && (
                <div>
                    <SectionTitle>购买灌注</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                        {infusions.map((stack) => {
                            const ref = lookupInfusion(gameData, stack.id);
                            return (
                                <InfoTooltip key={stack.id} title={ref?.name ?? `灌注 ${stack.id}`}>
                                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                                        {ref?.imageUrl ? (
                                            <img src={ref.imageUrl} alt={ref.name} className="h-full w-full object-cover" />
                                        ) : null}
                                        {stack.count > 1 && (
                                            <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] font-bold text-white">
                                                {stack.count}
                                            </span>
                                        )}
                                    </div>
                                </InfoTooltip>
                            );
                        })}
                    </div>
                </div>
            )}

            {transferItems.length > 0 && (
                <div>
                    <SectionTitle>信用传送物品</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                        {transferItems.map((item, index) => {
                            const ref = lookupRef(gameData, "item", item.id);
                            return (
                                <InfoTooltip
                                    key={`${item.id}-${index}`}
                                    title={ref?.name ?? `物品 ${item.id}`}
                                    body={ref?.tooltip ? stripTags(ref.tooltip) : undefined}
                                >
                                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                                        {ref?.imageUrl ? (
                                            <img src={ref.imageUrl} alt={ref.name} className="h-full w-full object-contain" />
                                        ) : null}
                                    </div>
                                </InfoTooltip>
                            );
                        })}
                    </div>
                </div>
            )}

            {showRanked && <StatSection title="排位" tiles={ranked} />}
        </div>
    );
}

function KillDeathSection({ player }: { player: MatchPlayerRender }) {
    const { kills, deaths, deathRegions } = player;
    if (kills.length === 0 && deaths.length === 0 && deathRegions.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <div>
                <SectionTitle>击杀</SectionTitle>
                {kills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {kills.map((kill) => (
                            <span
                                key={kill.userNum}
                                className="rounded bg-white px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                                {kill.nickname}
                                {kill.count > 1 && <span className="font-semibold"> ×{kill.count}</span>}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] text-neutral-400">无</div>
                )}
            </div>
            <div>
                <SectionTitle>被击杀</SectionTitle>
                {deaths.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {deaths.map((death) => (
                            <span
                                key={death.userNum}
                                className="rounded bg-white px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                                {death.nickname}
                                {death.count > 1 && <span className="font-semibold"> ×{death.count}</span>}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] text-neutral-400">无</div>
                )}
                {deathRegions.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-neutral-500">
                        死亡地区：
                        <span className="text-neutral-700 dark:text-neutral-300">
                            {deathRegions.join(" · ")}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionTitle({ children }: { children: string }) {
    return (
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {children}
        </div>
    );
}

function StatSection({ title, tiles, compact }: { title: string; tiles: StatTile[]; compact?: boolean }) {
    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            <div className={`grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                {tiles.map(([label, value]) => (
                    <div key={label} className="rounded bg-white px-2 py-1.5 text-center dark:bg-neutral-800">
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</div>
                        <div className="mt-0.5 text-xs font-bold text-neutral-900 dark:text-neutral-100">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
