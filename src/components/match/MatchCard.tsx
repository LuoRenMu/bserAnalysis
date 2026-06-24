import { useMemo } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CharacterBrief } from "../../types/bser";
import type { EquipRender, UiMatch } from "../../types/search";
import type { GameData } from "../../utils/gameData";
import { lookupInfusion, lookupRef, stripTags } from "../../utils/gameData";
import { createCharacterNavigationHandler } from "../../utils/navigation";
import InfoTooltip from "../InfoTooltip";
import MatchScoreboard, { type MatchDetailState } from "./MatchScoreboard";

function SkillGrid({ skills, data }: { skills: UiMatch["skills"]; data: GameData | null }) {
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

function ItemGrid({ equips, data }: { equips: EquipRender[]; data: GameData | null }) {
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

function InfusionRow({ raw, data }: { raw: string; data: GameData | null }) {
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

export default function MatchCard({
    match,
    data,
    expanded,
    detailState,
    onToggle,
    characters,
    navigate,
}: {
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
