import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { type UnlistenFn } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import type { CharacterBrief, GameSnapshot, PlayerEntry } from "../types/bser";
import type { CharacterUseStats, PlayerSummary } from "../types/search";
import { appSettingsAtom } from "../utils/settings";
import {
    listenOverlayDataUpdated,
    listenOverlayEvents,
    listenOverlayMock,
    listenOverlayOpacity,
    tryTakeOverlayMock,
} from "../utils/overlayApi";
import { accentForRank } from "../utils/convert.ts";

const BASELINE_WIDTH = 1056;
const BASELINE_HEIGHT = 756;
const TOTAL_MOCK_PLAYERS = 24;
const OVERVIEW_MODE = 3;

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

function normalizeName(name: string) {
    return name.trim().toLocaleLowerCase();
}

export default function GameOverlay() {
    const { t } = useTranslation();
    const settings = useAtomValue(appSettingsAtom);
    const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
    const [charactersById, setCharactersById] = useState<Record<number, CharacterBrief>>({});
    const [statsByName, setStatsByName] = useState<PlayerStatsByName>({});
    const fetchedRef = useRef<Set<string>>(new Set());
    const mockModeRef = useRef(false);
    const [scale, setScale] = useState(1);
    const [bgOpacity, setBgOpacity] = useState(settings.overlayBackgroundOpacity);
    const [mockRequested, setMockRequested] = useState(false);
    const charactersByIdRef = useRef<Record<number, CharacterBrief>>({});
    charactersByIdRef.current = charactersById;
    const boundPlayerRef = useRef(settings.boundPlayerName);
    boundPlayerRef.current = settings.boundPlayerName;

    const applyMockSnapshot = async () => {
        const name = boundPlayerRef.current.trim();
        if (!name) return;
        mockModeRef.current = true;
        try {
            const profile = await invoke<PlayerProfileResponse>("fetch_player_profile", {
                nickname: name,
                mode: OVERVIEW_MODE,
            });

            const realStats: PlayerStats = {
                loading: false,
                level: profile.level,
                totalPlay: profile.totalPlay,
                characters: profile.characters,
                summary: profile.summary,
                tierImageUrl: profile.tierImageUrl,
                tierName: profile.tierName,
            };

            const topCharIds = (profile.characters ?? [])
                .map((c) => {
                    const brief = Object.values(charactersByIdRef.current).find(
                        (b) => b.name === c.characterName,
                    );
                    return brief?.id ?? 0;
                })
                .filter((id) => id > 0);

            const pp = 3;
            const raw: PlayerEntry[] = Array.from({ length: TOTAL_MOCK_PLAYERS }, (_, i) => ({
                user_id: 900000 + i,
                team_id: Math.floor(i / pp),
                character_id:
                    topCharIds.length > 0
                        ? topCharIds[i % topCharIds.length]
                        : 1 + (i % 64),
                weapon_id: 1,
                rank: i === 0 ? -1 : (i % 8) + 1,
                name,
            }));

            const snap: GameSnapshot = {
                command: 0,
                user_num: raw.length,
                nickname: name,
                level: profile.level,
                matching_region: 0,
                matching_mode: 3,
                matching_team_mode: 3,
                bot_difficulty: 0,
                last_game_id: 0,
                is_loading_open: false,
                is_character_select_open: false,
                lobby_state: false,
                game_play_phase: false,
                is_game_started: false,
                is_battle_started: false,
                is_game_end: false,
                is_game_result: false,
                is_replay: false,
                entry_count: raw.length,
                raw,
            };

            const stats: PlayerStatsByName = {};
            const key = normalizeName(name);
            fetchedRef.current.add(key);
            for (let i = 0; i < TOTAL_MOCK_PLAYERS; i++) {
                stats[normalizeName(raw[i].name)] = realStats;
            }

            setStatsByName(stats);
            setSnapshot(snap);
        } catch (error) {
            console.error("applyMockSnapshot failed:", error);
        }
    };
    const applyMockRef = useRef(applyMockSnapshot);
    applyMockRef.current = applyMockSnapshot;

    useEffect(() => {
        document.body.classList.add("overlay-window");
        document.body.style.backgroundColor = "transparent";
        const root = document.getElementById("root");
        if (root) root.style.backgroundColor = "transparent";
        return () => {
            document.body.classList.remove("overlay-window");
            document.body.style.backgroundColor = "";
            if (root) root.style.backgroundColor = "";
        };
    }, []);

    useEffect(() => {
        const updateScale = () => {
            const sx = window.innerWidth / BASELINE_WIDTH;
            const sy = window.innerHeight / BASELINE_HEIGHT;
            setScale(Math.min(sx, sy));
        };
        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    // 加载角色列表
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

    // 挂载时主动检查是否有 mock 预览请求
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const pending = await tryTakeOverlayMock();
                if (cancelled) return;
                if (pending) setMockRequested(true);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, []);

    // 两个条件就绪后应用 mock
    useEffect(() => {
        if (!mockRequested) return;
        if (Object.keys(charactersById).length === 0) return;
        void applyMockRef.current().then(() => setMockRequested(false));
    }, [mockRequested, charactersById]);

    // 事件监听 + 轮询
    useEffect(() => {
        let unlistenData: (() => void) | undefined;
        let unlistenOverlay: (() => void) | undefined;
        let unlistenMock: UnlistenFn | undefined;
        let unlistenOpacity: UnlistenFn | undefined;
        let cancelled = false;

        void (async () => {
            unlistenData = await listenOverlayDataUpdated<GameSnapshot>((snap) => {
                if (cancelled) return;
                if (mockModeRef.current) return;
                setSnapshot(snap);
            });

            unlistenOverlay = await listenOverlayEvents(
                () => {
                    mockModeRef.current = false;
                    fetchedRef.current.clear();
                    void invoke<GameSnapshot>("fetch")
                        .then((snap) => {
                            if (cancelled) return;
                            if (snap.nickname.trim().length > 0) setSnapshot(snap);
                        })
                        .catch((e) => console.error("fetch on show failed:", e));
                },
                () => {},
            );

            unlistenMock = await listenOverlayMock(() => {
                if (cancelled) return;
                void applyMockRef.current();
            });

            unlistenOpacity = await listenOverlayOpacity((opacity) => {
                if (cancelled) return;
                setBgOpacity(opacity);
            });
        })();

        const pollId = setInterval(async () => {
            if (cancelled) return;
            if (mockModeRef.current) return;
            try {
                const snap = await invoke<GameSnapshot>("fetch");
                if (cancelled) return;
                if (snap.nickname.trim().length > 0) setSnapshot(snap);
            } catch { /* no game running */ }
        }, 2000);

        return () => {
            cancelled = true;
            clearInterval(pollId);
            unlistenData?.();
            unlistenOverlay?.();
            unlistenMock?.();
            unlistenOpacity?.();
        };
    }, []);

    // snapshot 变化后拉取玩家档案
    useEffect(() => {
        if (!snapshot) return;
        const names = Array.from(
            new Set(
                snapshot.raw
                    .map((entry) => entry.name.trim())
                    .filter((n) => n.length > 0),
            ),
        );
        const fresh = names.filter((n) => !fetchedRef.current.has(normalizeName(n)));
        if (fresh.length === 0) return;

        fresh.forEach((n) => fetchedRef.current.add(normalizeName(n)));
        setStatsByName((prev) => {
            const next = { ...prev };
            for (const n of fresh) next[normalizeName(n)] = { loading: true };
            return next;
        });

        const CONCURRENCY = 8;

        void (async () => {
            let cursor = 0;
            const workers: Promise<void>[] = [];
            const runNext = async (): Promise<void> => {
                while (cursor < fresh.length) {
                    const idx = cursor++;
                    const name = fresh[idx];
                    const key = normalizeName(name);
                    try {
                        const result = await invoke<PlayerProfileResponse>(
                            "fetch_player_profile",
                            { nickname: name, mode: OVERVIEW_MODE },
                        );
                        setStatsByName((prev) => ({
                            ...prev,
                            [key]: {
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
                            [key]: { loading: false, error: String(error) },
                        }));
                    }
                }
            };
            for (let w = 0; w < Math.min(CONCURRENCY, fresh.length); w++) {
                workers.push(runNext());
            }
            await Promise.all(workers);
        })();
    }, [snapshot]);

    if (!snapshot) {
        return (
            <div className="flex h-screen w-screen items-center justify-center overflow-hidden">
                <div
                    style={{
                        width: BASELINE_WIDTH,
                        height: BASELINE_HEIGHT,
                        transform: `scale(${scale})`,
                        transformOrigin: "center center",
                    }}
                    className="flex items-center justify-center"
                >
                    <div
                        className="rounded-lg px-6 py-4 backdrop-blur-md"
                        style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
                    >
                        <div className="text-sm text-white/80">{t("overlay.waitingForGame")}</div>
                    </div>
                </div>
            </div>
        );
    }

    const myPlayer = snapshot.raw.find((p) => p.name === snapshot.nickname);
    const enemies = snapshot.raw.slice(1, snapshot.entry_count);

    return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden">
            <div
                style={{
                    width: BASELINE_WIDTH,
                    height: BASELINE_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
                }}
                className="flex flex-col overflow-hidden rounded-2xl p-2 shadow-2xl backdrop-blur-xl"
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-1 pb-1.5">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-white">{t("overlay.title")}</span>
                    <span className="ml-auto text-[10px] text-white/40">
                        {snapshot.raw.filter((p) => p.name.trim().length > 0).length}P
                    </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden pt-1.5">
                    {myPlayer && (
                        <div className="shrink-0">
                            <SectionLabel text={t("overlay.you")} />
                            <PlayerCard
                                player={myPlayer}
                                character={charactersById[myPlayer.character_id]}
                                stats={
                                    statsByName[normalizeName(myPlayer.name)] ?? {
                                        loading: true,
                                    }
                                }
                                variant="you"
                            />
                        </div>
                    )}

                    {enemies.length > 0 && (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <SectionLabel
                                text={`${t("overlay.enemies")} (${enemies.length})`}
                            />
                            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-4 gap-1 overflow-hidden">
                                {enemies.map((p) => (
                                    <PlayerCard
                                        key={p.user_id}
                                        player={p}
                                        character={charactersById[p.character_id]}
                                        stats={
                                            statsByName[normalizeName(p.name)] ?? {
                                                loading: true,
                                            }
                                        }
                                        variant="enemy"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  UI 小组件 (与之前版本一致)                                          */
/* ------------------------------------------------------------------ */

function SectionLabel({ text }: { text: string }) {
    return (
        <div className="mb-0.5 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">
            {text}
        </div>
    );
}

function tierAbbrev(name: string | undefined): string {
    if (!name) return "?";
    const upper = name.toUpperCase();
    const map: Record<string, string> = {
        GRAND: "GM",
        GRANDMASTER: "GM",
        MASTER: "MST",
        MASTERS: "MST",
        DIA: "DIA",
        DIAMOND: "DIA",
        PLAT: "PLT",
        PLATINUM: "PLT",
        GOLD: "GLD",
        SILVER: "SLV",
        BRONZE: "BRZ",
        IRON: "IRN",
        BEGINNER: "BG",
        UNRANKED: "-",
        UNRANK: "-",
    };
    const parts = upper.replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && map[parts[0]]) {
        return `${map[parts[0]]}${parts[parts.length - 1]}`;
    }
    if (map[upper]) return map[upper];
    return upper.slice(0, 4);
}

function tierColor(name: string | undefined): string {
    if (!name) return "#4b525d";
    const upper = name.toUpperCase();
    if (upper.startsWith("GRAND")) return "#ff4d6d";
    if (upper.startsWith("MAS")) return "#ff7a45";
    if (upper.startsWith("DIA")) return "#3b9eff";
    if (upper.startsWith("PLAT")) return "#36cfc9";
    if (upper.startsWith("GOLD")) return "#fadb14";
    if (upper.startsWith("SILVER")) return "#a0a0a0";
    if (upper.startsWith("BRONZE")) return "#d08770";
    if (upper.startsWith("IRON")) return "#8d6e63";
    return "#4b525d";
}

function TierBadge({ stats, size = 16 }: { stats: PlayerStats; size?: number }) {
    const [failed, setFailed] = useState(false);
    if (!stats.tierImageUrl && !stats.tierName) return null;
    if (!stats.tierImageUrl || failed) {
        return <TierChip name={stats.tierName} size={size} />;
    }
    return (
        <img
            style={{ height: size, width: size }}
            className="shrink-0 object-contain"
            src={stats.tierImageUrl}
            alt={stats.tierName || "Tier"}
            title={stats.tierName || ""}
            onError={() => setFailed(true)}
        />
    );
}

function TierChip({ name, size }: { name?: string; size: number }) {
    const color = tierColor(name);
    const abbr = tierAbbrev(name);
    const fontSize = size <= 14 ? 7 : Math.max(8, Math.floor(size * 0.55));
    return (
        <span
            className="inline-flex shrink-0 items-center justify-center rounded font-bold leading-none text-white"
            style={{
                height: size,
                minWidth: size,
                padding: "0 3px",
                backgroundColor: color,
                fontSize,
            }}
            title={name || "Tier"}
        >
            {abbr}
        </span>
    );
}

function RankSquare({ rank, size = 14 }: { rank: number; size?: number }) {
    const fontSize = size <= 14 ? 7 : 9;
    if (rank === 99) {
        return (
            <span
                className="flex items-center justify-center rounded text-white"
                style={{
                    height: size,
                    width: size,
                    backgroundColor: accentForRank(rank),
                }}
            >
                <svg width={size - 2} height={size - 2} viewBox="0 0 16 16" fill="none">
                    <path
                        d="M5.79 9.72C5.98 10.03 6.22 10.31 6.55 10.5L6.82 10.67L6.44 11.57C6.2 12.13 5.66 12.5 5.07 12.5H3.05C2.67 12.5 2.4 12.22 2.4 11.83C2.4 11.46 2.67 11.15 3.05 11.15H5.07C5.15 11.15 5.23 11.12 5.25 11.04L5.79 9.72ZM9.72 3.5C9 3.5 8.43 2.91 8.43 2.15C8.43 1.42 9 0.8 9.72 0.8C10.42 0.8 11.02 1.42 11.02 2.15C11.02 2.91 10.42 3.5 9.72 3.5ZM12.95 7.58C13.3 7.58 13.6 7.89 13.6 8.25C13.6 8.62 13.3 8.93 12.93 8.93H11.63C10.96 8.93 10.4 8.48 10.21 7.8L9.83 6.51C9.78 6.4 9.72 6.28 9.64 6.17L8.51 9.13L9.91 10C10.37 10.31 10.64 10.81 10.64 11.35C10.64 11.49 10.61 11.66 10.58 11.8L9.7 14.72C9.62 15.03 9.35 15.2 9.08 15.2C8.59 15.2 8.43 14.75 8.43 14.53C8.43 14.47 8.43 14.41 8.46 14.36L9.35 11.43C9.35 11.4 9.35 11.38 9.35 11.35C9.35 11.29 9.32 11.21 9.24 11.15L6.98 9.74C6.52 9.43 6.25 8.93 6.25 8.39C6.25 8.2 6.3 8 6.38 7.8L7.33 5.33L6.92 5.24C6.84 5.24 6.76 5.22 6.68 5.22C6.44 5.22 6.22 5.3 6.03 5.47L4.72 6.51C4.61 6.59 4.47 6.65 4.34 6.65C3.93 6.65 3.69 6.31 3.69 5.98C3.69 5.78 3.77 5.58 3.93 5.44L5.23 4.4C5.66 4.06 6.17 3.87 6.68 3.87C6.84 3.87 7.03 3.89 7.22 3.92L9.32 4.43C10.15 4.63 10.8 5.27 11.07 6.12L11.42 7.41C11.45 7.52 11.55 7.58 11.63 7.58H12.95Z"
                        fill="white"
                    />
                </svg>
            </span>
        );
    }
    return (
        <span
            className="flex items-center justify-center rounded font-bold leading-none text-white"
            style={{
                height: size,
                width: size,
                fontSize,
                backgroundColor: accentForRank(rank),
            }}
        >
            {rank}
        </span>
    );
}

function SummaryRow({
    stats,
    rankSquareSize,
    showWinsInline,
}: {
    stats: PlayerStats;
    rankSquareSize: number;
    showWinsInline: boolean;
}) {
    if (!stats.summary) return null;
    return (
        <div className="flex items-center gap-1">
            {showWinsInline && (
                <div className="flex shrink-0 items-baseline gap-0.5">
                    <span className="text-[11px] font-bold text-emerald-400">
                        {stats.summary.wins}W
                    </span>
                    <span className="text-[9px] text-white/40">/{stats.summary.count}</span>
                </div>
            )}
            <div className="flex flex-1 flex-wrap gap-0.5">
                {stats.summary.ranks.map((rank, index) => (
                    <RankSquare
                        key={`${rank}-${index}`}
                        rank={rank}
                        size={rankSquareSize}
                    />
                ))}
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-white/70">
                {stats.summary.avgDmg}
            </span>
        </div>
    );
}

function CharsRow({
    stats,
    characterCount,
    characterIconSize,
    characterFontSize,
}: {
    stats: PlayerStats;
    characterCount: number;
    characterIconSize: number;
    characterFontSize: number;
}) {
    if (!stats.characters || stats.characters.length === 0) return null;
    return (
        <div className="flex w-full items-center gap-1">
            {stats.characters.slice(0, characterCount).map((stat) => (
                <div
                    key={stat.characterName}
                    className="flex items-center gap-0.5 rounded bg-white/5 px-1 py-px"
                    title={`${stat.characterName} · ${stat.characterPlay}场 · 均${stat.avgDmg.toFixed(0)}`}
                >
                    <img
                        style={{
                            height: characterIconSize,
                            width: characterIconSize,
                        }}
                        className="shrink-0 rounded-full object-cover"
                        src={stat.imageUrl}
                        alt={stat.characterName}
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                    <span
                        className="shrink-0 font-semibold text-[#ca9372]"
                        style={{ fontSize: characterFontSize }}
                    >
                        {stat.avgDmg.toFixed(0)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PlayerCard({
    player,
    character,
    stats,
    variant,
}: {
    player: PlayerEntry;
    character?: CharacterBrief;
    stats: PlayerStats;
    variant: "you" | "team" | "enemy";
}) {
    const isYou = variant === "you";
    const isTeam = variant === "team";

    const containerCls = isYou
        ? "bg-blue-500/20 ring-1 ring-blue-400/30"
        : isTeam
            ? "bg-emerald-500/5 ring-1 ring-emerald-400/20"
            : "bg-white/5";

    const avatar = isYou ? 32 : 28;
    const nameSize = isYou ? 13 : 12;
    const subSize = isYou ? 10 : 9;
    const tierSize = isYou ? 18 : 16;
    const rankSize = isYou ? 16 : 12;
    const charCount = isYou ? 4 : 3;
    const charIcon = isYou ? 16 : 14;
    const charFont = isYou ? 9 : 8;

    return (
        <div className={`rounded-md px-2 py-1.5 ${containerCls}`}>
            <div className="flex items-center gap-1.5">
                {character?.imageUrl && (
                    <img
                        style={{ height: avatar, width: avatar }}
                        className="shrink-0 rounded-full object-cover"
                        src={character.imageUrl}
                        alt={character.name}
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                )}
                <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1">
                        <span
                            className="truncate font-semibold text-white"
                            style={{ fontSize: nameSize }}
                        >
                            {player.name}
                        </span>
                        <TierBadge stats={stats} size={tierSize} />
                        {stats.tierName && (
                            <span
                                className="shrink-0 font-semibold text-white/60"
                                style={{ fontSize: subSize }}
                            >
                                {stats.tierName}
                            </span>
                        )}
                    </div>
                    <div className="truncate text-white/50" style={{ fontSize: subSize }}>
                        {character?.name ?? `#${player.character_id}`}
                        {stats.level ? ` · Lv${stats.level}` : ""}
                        {stats.totalPlay ? ` · ${stats.totalPlay}场` : ""}
                    </div>
                </div>
                {!isYou && stats.summary && (
                    <div className="flex shrink-0 flex-col items-end leading-tight">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-[10px] font-bold text-emerald-400">
                                {stats.summary.wins}W
                            </span>
                            <span className="text-[8px] text-white/40">
                                /{stats.summary.count}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {isYou && (
                <div className="mt-1.5 space-y-1">
                    {stats.summary ? (
                        <SummaryRow
                            stats={stats}
                            rankSquareSize={rankSize}
                            showWinsInline={true}
                        />
                    ) : stats.loading ? (
                        <div className="text-center text-[10px] text-white/30">...</div>
                    ) : stats.error ? (
                        <div className="text-center text-[10px] text-red-400/60">!</div>
                    ) : null}
                    <CharsRow
                        stats={stats}
                        characterCount={charCount}
                        characterIconSize={charIcon}
                        characterFontSize={charFont}
                    />
                </div>
            )}

            {!isYou && (stats.summary || stats.characters?.length) && (
                <div className="mt-1 space-y-1">
                    <SummaryRow
                        stats={stats}
                        rankSquareSize={rankSize}
                        showWinsInline={false}
                    />
                    <CharsRow
                        stats={stats}
                        characterCount={charCount}
                        characterIconSize={charIcon}
                        characterFontSize={charFont}
                    />
                </div>
            )}

            {!isYou && stats.loading && (
                <div className="mt-1 text-center text-[9px] text-white/30">...</div>
            )}
            {!isYou && stats.error && (
                <div className="mt-1 text-center text-[9px] text-red-400/60">!</div>
            )}
        </div>
    );
}
