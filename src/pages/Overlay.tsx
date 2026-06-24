import {useEffect, useRef, useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import {useAtom, useAtomValue} from "jotai";
import {useTranslation} from "react-i18next";
import {normalizeName, ProfileView} from "../components/profile";
import type {PlayerStatsByName} from "../components/profile";
import {CharacterBrief} from "../types/bser";
import type {CharacterUseStats, PlayerSummary} from "../types/search";
import {injectAtom, snapshotAtom} from "../store";
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

export default function Overlay() {
    const {t} = useTranslation();
    const [snapshot, _setSnapshot] = useAtom(snapshotAtom);
    const [statsByName, setStatsByName] = useState<PlayerStatsByName>({});
    const [charactersById, setCharactersById] = useState<Record<number, CharacterBrief>>({});
    const fetchedRef = useRef<Set<string>>(new Set());
    const injected = useAtomValue(injectAtom);
    const settings = useAtomValue(appSettingsAtom);

    // 角色 id→头像
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

    // 注入断开后清空已查询缓存，下一局重新拉取。
    useEffect(() => {
        if (!injected) {
            fetchedRef.current.clear();
            setStatsByName({});
        }
    }, [injected]);

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
                {!injected ? ( <div className="mt-52 text-center text-5xl text-gray-500">{t('overlay.waitingForGame')}</div>) : snapshot ? (
                    <ProfileView snapshot={snapshot} statsByName={statsByName} charactersById={charactersById} settings={settings} />
                ) : (
                    <div className="mt-52 text-center text-5xl text-gray-500">等待进入大厅获取数据...</div>
                )}
            </div>
        </div>
    );
}
