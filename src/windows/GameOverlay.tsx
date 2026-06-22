import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { CharacterBrief, GameSnapshot, PlayerEntry } from "../types/bser";
import type { CharacterUseStats, PlayerSummary } from "../types/search";
import { listenOverlayDataUpdated, listenOverlayEvents } from "../utils/overlayApi";

interface PlayerProfileResponse {
    level: number;
    totalPlay: number;
    characters: CharacterUseStats[];
    summary?: PlayerSummary;
    tierImageUrl?: string;
    tierName?: string;
}

interface PlayerStats {
    loading: boolean;
    error?: string;
    level?: number;
    totalPlay?: number;
    characters?: CharacterUseStats[];
    summary?: PlayerSummary;
    tierImageUrl?: string;
    tierName?: string;
}

type PlayerStatsByName = Record<string, PlayerStats>;

const OVERVIEW_MODE = 3;

function normalizeName(name: string) {
    return name.trim().toLocaleLowerCase();
}

function accentForRank(rank: number): string {
    if (rank <= 2) return "#11b288";
    if (rank <= 3) return "#207ac7";
    if (rank === 99) return "#f5a623";
    return "#4b525d";
}

export default function GameOverlay() {
    const { t } = useTranslation();
    const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
    const [charactersById, setCharactersById] = useState<Record<number, CharacterBrief>>({});
    const [statsByName, setStatsByName] = useState<PlayerStatsByName>({});
    const fetchedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        document.body.classList.add('overlay-window');
        document.body.style.backgroundColor = "transparent";
        const root = document.getElementById("root");
        if (root) root.style.backgroundColor = "transparent";
        return () => {
            document.body.classList.remove('overlay-window');
            document.body.style.backgroundColor = "";
            if (root) root.style.backgroundColor = "";
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await invoke<CharacterBrief[]>("fetch_characters");
                if (cancelled) return;
                const map: Record<number, CharacterBrief> = {};
                for (const c of list) map[c.id] = c;
                setCharactersById(map);
            } catch (error) {
                console.error("fetch_characters failed:", error);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let unlistenData: (() => void) | undefined;
        let unlistenOverlay: (() => void) | undefined;
        let cancelled = false;

        void (async () => {
            unlistenData = await listenOverlayDataUpdated<GameSnapshot>((snap) => {
                if (cancelled) return;
                setSnapshot(snap);
            });

            unlistenOverlay = await listenOverlayEvents(
                () => {
                    void invoke<GameSnapshot>("fetch")
                        .then((snap) => {
                            if (cancelled) return;
                            if (snap.nickname.trim().length > 0) setSnapshot(snap);
                        })
                        .catch((error) => console.error("fetch on show failed:", error));
                },
                () => {},
            );
        })();

        const pollId = setInterval(async () => {
            if (cancelled) return;
            try {
                const snap = await invoke<GameSnapshot>("fetch");
                if (cancelled) return;
                if (snap.nickname.trim().length > 0) setSnapshot(snap);
            } catch {
            }
        }, 2000);

        return () => {
            cancelled = true;
            clearInterval(pollId);
            unlistenData?.();
            unlistenOverlay?.();
        };
    }, []);

    useEffect(() => {
        if (!snapshot) return;
        const names = Array.from(
            new Set(snapshot.raw.map((entry) => entry.name.trim()).filter((name) => name.length > 0)),
        );
        const fresh = names.filter((name) => !fetchedRef.current.has(normalizeName(name)));
        if (fresh.length === 0) return;

        fresh.forEach((name) => fetchedRef.current.add(normalizeName(name)));
        setStatsByName((prev) => {
            const next = { ...prev };
            for (const name of fresh) next[normalizeName(name)] = { loading: true };
            return next;
        });

        const batchSize = names.length > 8 ? 3 : 4;

        void (async () => {
            for (let i = 0; i < fresh.length; i += batchSize) {
                const batch = fresh.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(async (name) => {
                        try {
                            const result = await invoke<PlayerProfileResponse>("fetch_player_profile", {
                                nickname: name,
                                mode: OVERVIEW_MODE,
                            });
                            setStatsByName((prev) => ({
                                ...prev,
                                [normalizeName(name)]: {
                                    loading: false,
                                    level: result.level,
                                    totalPlay: result.totalPlay,
                                    characters: result.characters,
                                    summary: result.summary,
                                    tierImageUrl: result.tierImageUrl,
                                    tierName: result.tierName,
                                },
                            }));
                        } catch (error) {
                            console.error("fetch_player_profile failed:", name, error);
                            setStatsByName((prev) => ({
                                ...prev,
                                [normalizeName(name)]: { loading: false, error: String(error) },
                            }));
                        }
                    }),
                );
            }
        })();
    }, [snapshot]);

    if (!snapshot) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <div className="rounded-lg bg-black/60 px-6 py-4 backdrop-blur-md">
                    <div className="text-sm text-white/80">{t('overlay.waitingForGame')}</div>
                </div>
            </div>
        );
    }

    const myPlayer = snapshot.raw.find((p) => p.name === snapshot.nickname);
    const myTeamId = myPlayer?.team_id;

    const teammates = myTeamId !== undefined
        ? snapshot.raw.filter((p) => p.team_id === myTeamId && p.name !== snapshot.nickname)
        : [];

    const enemies = myTeamId !== undefined
        ? snapshot.raw.filter((p) => p.team_id !== myTeamId)
        : snapshot.raw.filter((p) => p.name !== snapshot.nickname);

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl bg-black/70 p-2 shadow-2xl backdrop-blur-xl">
            <div className="mb-1 flex shrink-0 items-center gap-2 border-b border-white/10 px-1 pb-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-white">{t('overlay.title')}</span>
                <span className="ml-auto text-[10px] text-white/40">
                    {snapshot.raw.filter((p) => p.name.trim().length > 0).length} players
                </span>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto">
                {myPlayer && (
                    <div>
                        <div className="mb-0.5 px-1 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                            {t('overlay.you')}
                        </div>
                        <PlayerCard
                            player={myPlayer}
                            character={charactersById[myPlayer.character_id]}
                            stats={statsByName[normalizeName(myPlayer.name)] ?? { loading: true }}
                            highlight
                        />
                    </div>
                )}

                {teammates.length > 0 && (
                    <div>
                        <div className="mb-0.5 mt-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                            {t('overlay.teammates')} ({teammates.length})
                        </div>
                        <div className="space-y-1">
                            {teammates.map((p) => (
                                <PlayerCard
                                    key={p.name}
                                    player={p}
                                    character={charactersById[p.character_id]}
                                    stats={statsByName[normalizeName(p.name)] ?? { loading: true }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {enemies.length > 0 && (
                    <div>
                        <div className="mb-0.5 mt-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                            {t('overlay.enemies')} ({enemies.length})
                        </div>
                        <div className="space-y-1">
                            {enemies.map((p) => (
                                <PlayerCard
                                    key={p.name}
                                    player={p}
                                    character={charactersById[p.character_id]}
                                    stats={statsByName[normalizeName(p.name)] ?? { loading: true }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PlayerCard({
    player,
    character,
    stats,
    highlight,
}: {
    player: PlayerEntry;
    character?: CharacterBrief;
    stats: PlayerStats;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-lg p-1.5 ${
                highlight ? 'bg-blue-500/20 ring-1 ring-blue-400/30' : 'bg-white/5'
            }`}
        >
            {/* Row 1: character + name + tier */}
            <div className="flex items-center gap-1.5">
                {character?.imageUrl && (
                    <img
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                        src={character.imageUrl}
                        alt={character.name}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                )}
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold text-white">{player.name}</div>
                    <div className="truncate text-[9px] text-white/50">
                        {character?.name ?? `#${player.character_id}`}
                    </div>
                </div>
                {stats.tierImageUrl && (
                    <img
                        className="h-6 w-6 shrink-0 object-contain"
                        src={stats.tierImageUrl}
                        alt={stats.tierName || "Tier"}
                        title={stats.tierName || ""}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                )}
                {stats.tierName && (
                    <span className="shrink-0 text-[8px] font-semibold text-white/60">{stats.tierName}</span>
                )}
            </div>

            {/* Row 2: recent summary (wins + avg rank squares + avg dmg) */}
            {stats.summary && (
                <div className="mt-1 flex items-center gap-1.5 px-0.5">
                    <span className="shrink-0 text-[9px] font-bold text-emerald-400">
                        {stats.summary.wins}W
                    </span>
                    <span className="shrink-0 text-[8px] text-white/40">
                        /{stats.summary.count}
                    </span>
                    <div className="flex flex-1 flex-wrap gap-0.5">
                        {stats.summary.ranks.map((rank, index) => (
                            <span
                                key={`${rank}-${index}`}
                                className="flex h-3.5 w-3.5 items-center justify-center rounded text-[7px] font-bold text-white"
                                style={{ backgroundColor: accentForRank(rank) }}
                            >
                                {rank === 99 ? (
                                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                                        <path
                                            d="M5.79 9.72C5.98 10.03 6.22 10.31 6.55 10.5L6.82 10.67L6.44 11.57C6.2 12.13 5.66 12.5 5.07 12.5H3.05C2.67 12.5 2.4 12.22 2.4 11.83C2.4 11.46 2.67 11.15 3.05 11.15H5.07C5.15 11.15 5.23 11.12 5.25 11.04L5.79 9.72ZM9.72 3.5C9 3.5 8.43 2.91 8.43 2.15C8.43 1.42 9 0.8 9.72 0.8C10.42 0.8 11.02 1.42 11.02 2.15C11.02 2.91 10.42 3.5 9.72 3.5ZM12.95 7.58C13.3 7.58 13.6 7.89 13.6 8.25C13.6 8.62 13.3 8.93 12.93 8.93H11.63C10.96 8.93 10.4 8.48 10.21 7.8L9.83 6.51C9.78 6.4 9.72 6.28 9.64 6.17L8.51 9.13L9.91 10C10.37 10.31 10.64 10.81 10.64 11.35C10.64 11.49 10.61 11.66 10.58 11.8L9.7 14.72C9.62 15.03 9.35 15.2 9.08 15.2C8.59 15.2 8.43 14.75 8.43 14.53C8.43 14.47 8.43 14.41 8.46 14.36L9.35 11.43C9.35 11.4 9.35 11.38 9.35 11.35C9.35 11.29 9.32 11.21 9.24 11.15L6.98 9.74C6.52 9.43 6.25 8.93 6.25 8.39C6.25 8.2 6.3 8 6.38 7.8L7.33 5.33L6.92 5.24C6.84 5.24 6.76 5.22 6.68 5.22C6.44 5.22 6.22 5.3 6.03 5.47L4.72 6.51C4.61 6.59 4.47 6.65 4.34 6.65C3.93 6.65 3.69 6.31 3.69 5.98C3.69 5.78 3.77 5.58 3.93 5.44L5.23 4.4C5.66 4.06 6.17 3.87 6.68 3.87C6.84 3.87 7.03 3.89 7.22 3.92L9.32 4.43C10.15 4.63 10.8 5.27 11.07 6.12L11.42 7.41C11.45 7.52 11.55 7.58 11.63 7.58H12.95Z"
                                            fill="white"
                                        />
                                    </svg>
                                ) : (
                                    rank
                                )}
                            </span>
                        ))}
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold text-white/70">
                        {stats.summary.avgDmg}
                    </span>
                </div>
            )}

            {/* Row 3: top 3 characters with avg dmg */}
            {stats.characters && stats.characters.length > 0 && (
                <div className="mt-1 space-y-0.5 px-0.5">
                    {stats.characters.slice(0, 3).map((stat) => (
                        <div key={stat.characterName} className="flex items-center gap-1">
                            <img
                                className="h-4 w-4 shrink-0 rounded-full object-cover"
                                src={stat.imageUrl}
                                alt={stat.characterName}
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[8px] text-white/50">
                                {stat.characterName}
                            </span>
                            <span className="shrink-0 text-[8px] text-white/40">{stat.characterPlay}场</span>
                            <span className="shrink-0 text-[8px] font-semibold text-[#ca9372]">
                                {stat.avgDmg.toFixed(0)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {stats.loading && (
                <div className="mt-1 text-center text-[8px] text-white/30">...</div>
            )}
            {stats.error && (
                <div className="mt-1 text-center text-[8px] text-red-400/60">!</div>
            )}
        </div>
    );
}
