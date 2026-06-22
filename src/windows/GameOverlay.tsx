import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { CharacterBrief, GameSnapshot, PlayerEntry } from "../types/bser";
import { listenOverlayDataUpdated, listenOverlayEvents } from "../utils/overlayApi";

/**
 * 独立的 overlay 窗口。运行在单独的 Tauri webview 中，与主窗口不共享 JS 状态，
 * 因此所有数据都通过后端事件 + `invoke("fetch")` 自行获取。
 *
 * 可见性由后端键盘中心驱动（长按快捷键显示，松开隐藏）。
 */
export default function GameOverlay() {
    const { t } = useTranslation();
    const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
    const [charactersById, setCharactersById] = useState<Record<number, CharacterBrief>>({});

    // 透明背景
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

    // 拉取角色 id→信息映射（后端按周缓存）
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

    // 订阅后端推送的快照更新 + 显示事件时主动拉取一次最新快照
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

        return () => {
            cancelled = true;
            unlistenData?.();
            unlistenOverlay?.();
        };
    }, []);

    if (!snapshot || !snapshot.is_game_started) {
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
        <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl bg-black/70 p-3 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm font-semibold text-white">{t('overlay.title')}</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
                {myPlayer && (
                    <PlayerCard
                        player={myPlayer}
                        character={charactersById[myPlayer.character_id]}
                        highlight
                    />
                )}

                {teammates.length > 0 && (
                    <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                            {t('overlay.teammates')} ({teammates.length})
                        </div>
                        <div className="space-y-1.5">
                            {teammates.map((p) => (
                                <PlayerCard
                                    key={p.name}
                                    player={p}
                                    character={charactersById[p.character_id]}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {enemies.length > 0 && (
                    <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                            {t('overlay.enemies')} ({enemies.length})
                        </div>
                        <div className="space-y-1.5">
                            {enemies.map((p) => (
                                <PlayerCard
                                    key={p.name}
                                    player={p}
                                    character={charactersById[p.character_id]}
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
    highlight,
}: {
    player: PlayerEntry;
    character?: CharacterBrief;
    highlight?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-2 rounded-lg p-2 ${
                highlight ? 'bg-blue-500/20 ring-1 ring-blue-400/30' : 'bg-white/5'
            }`}
        >
            {character && (
                <img
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    src={character.imageUrl}
                    alt={character.name}
                />
            )}
            <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">{player.name}</div>
                <div className="truncate text-[10px] text-white/60">
                    {character?.name ?? `#${player.character_id}`}
                </div>
            </div>
            <div className="shrink-0 text-[10px] text-white/80">
                {player.team_id >= 0 ? `T${player.team_id}` : ''}
            </div>
        </div>
    );
}
