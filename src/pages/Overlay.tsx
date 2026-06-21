import {useEffect, useRef, useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import {useAtom, useAtomValue} from "jotai";
import {useTranslation} from "react-i18next";
import {normalizeName, profile} from "../components/profile";
import type {PlayerStatsByName} from "../components/profile";
import {CharacterBrief, GameSnapshot} from "../types/bser";
import type {CharacterUseStats, PlayerSummary} from "../types/search";
import {activeAtom, injectAtom, snapshotAtom} from "../store";
import {appSettingsAtom} from "../utils/settings";

interface PlayerProfileResponse {
    level: number;
    totalPlay: number;
    characters: CharacterUseStats[];
    summary?: PlayerSummary;
    tierImageUrl?: string;
    tierName?: string;
}

/// 用排位档案（mode 3）展示对局玩家的常用英雄。
const OVERVIEW_MODE = 3;
/// 未开始游戏（大厅/选人）时高频轮询以跟踪选人；游戏中降频，仅用于探测结束。
const POLL_PREGAME_MS = 1000;
const POLL_INGAME_MS = 3000;

export default function Overlay() {
    const {t} = useTranslation();
    const [active, setActive] = useAtom(activeAtom);
    const [snapshot, setSnapshot] = useAtom(snapshotAtom);
    const [statsByName, setStatsByName] = useState<PlayerStatsByName>({});
    const [charactersById, setCharactersById] = useState<Record<number, CharacterBrief>>({});
    const fetchedRef = useRef<Set<string>>(new Set());
    const injected = useAtomValue(injectAtom);
    const [settings, setSettings] = useAtom(appSettingsAtom);
    const boundPlayerNameRef = useRef<string>("");
    const playerDataFetchedRef = useRef(false);

    // 更新绑定玩家名称引用
    useEffect(() => {
        boundPlayerNameRef.current = settings.boundPlayerName;
        // 当绑定玩家名称改变时，重置已获取标记
        playerDataFetchedRef.current = false;
    }, [settings.boundPlayerName]);

    // 角色 id→头像 映射只需拉一次（后端按周缓存）。
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const list = await invoke<CharacterBrief[]>("fetch_characters");
                if (cancelled) return;
                const map: Record<number, CharacterBrief> = {};
                for (const character of list) map[character.id] = character;
                setCharactersById(map);
            } catch (error) {
                console.error("fetch_characters failed:", error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!injected) return;
        if (!active) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const tick = async () => {
            if (cancelled) return;
            let nextDelay = POLL_INGAME_MS;
            try {
                const result = await invoke<GameSnapshot>("fetch");
                if (cancelled) return;

                // 如果有绑定玩家名称且 snapshot 还没有名称，使用绑定的名称
                if (boundPlayerNameRef.current && result.nickname.trim().length === 0) {
                    result.nickname = boundPlayerNameRef.current;
                }

                if (result.nickname.trim().length > 0) {
                    setSnapshot(result);
                    nextDelay = result.is_game_started ? POLL_INGAME_MS : POLL_PREGAME_MS;

                    // 自动将玩家名称设置到 settings
                    if (result.nickname !== settings.boundPlayerName) {
                        setSettings((prev) => ({
                            ...prev,
                            boundPlayerName: result.nickname,
                        }));
                    }
                } else if (result.command === 0) {
                    console.log("game ended");
                    setActive(false);
                    return;
                }
            } catch (error) {
                console.error("fetch snapshot failed:", error);
            }
            if (!cancelled) timer = setTimeout(tick, nextDelay);
        };

        void tick();
        return () => {
            cancelled = true;
            if (timer != null) clearTimeout(timer);
        };
    }, [active, injected, setActive, setSnapshot]);

    // 游戏结束后清空已查询缓存，下一局重新拉取。
    useEffect(() => {
        if (!active) {
            fetchedRef.current.clear();
            setStatsByName({});
        }
    }, [active]);

    // 对局玩家出现后，按昵称查询其档案常用英雄。每个昵称只查一次，
    // 分组并发查询：>8人时每3人一组，≤8人时每4人一组。
    useEffect(() => {
        if (!snapshot) return;
        const names = Array.from(
            new Set(snapshot.raw.map((entry) => entry.name.trim()).filter((name) => name.length > 0)),
        );
        const fresh = names.filter((name) => !fetchedRef.current.has(normalizeName(name)));
        if (fresh.length === 0) return;

        fresh.forEach((name) => fetchedRef.current.add(normalizeName(name)));
        setStatsByName((prev) => {
            const next = {...prev};
            for (const name of fresh) next[normalizeName(name)] = {loading: true};
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
                                [normalizeName(name)]: {loading: false, error: String(error)},
                            }));
                        }
                    }),
                );
            }
        })();
    }, [snapshot]);
    return (
        <div className="h-full">
            <div className="h-full">
                {snapshot ? (
                    profile(snapshot, statsByName, charactersById, settings)
                ) : (
                    <div className="mt-52 text-center text-5xl text-gray-500">{t('overlay.waitingForGame')}</div>
                )}
            </div>
        </div>
    );
}
