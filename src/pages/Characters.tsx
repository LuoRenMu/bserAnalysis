import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {useAtom, useAtomValue} from "jotai";
import type { CharacterBrief } from "../types/bser";
import { appSettingsAtom, matchesAliasQuery, resolveCharacterName } from "../utils/settings";
import {characterBriefAtom} from "../store";

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

/** 职能英文 → 中文，及分组展示顺序。 */
const ROLE_NAMES: Record<string, string> = {
    Warrior: "战士",
    Mage: "法师",
    Marksman: "射手",
    Tanker: "坦克",
    Assasin: "刺客",
    Supporter: "辅助",
};
const ROLE_ORDER = ["Warrior", "Marksman", "Mage", "Assasin", "Tanker", "Supporter"];

function primaryRole(character: CharacterBrief) {
    return character.roles[0] ?? "Other";
}

export default function Characters() {
    const navigate = useNavigate();
    const settings = useAtomValue(appSettingsAtom);
    const [characters] = useAtom<CharacterBrief[]>(characterBriefAtom);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        void (async () => {
            try {
                if (cancelled) return;
            } catch (err) {
                if (cancelled) return;
                console.error("fetch_characters failed:", err);
                setError(String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const groups = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        const list = keyword
            ? characters.filter((character) => matchesAliasQuery(character.name, settings.characterAliases, keyword))
            : characters;
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

        const byRole = new Map<string, CharacterBrief[]>();
        for (const character of sorted) {
            const role = primaryRole(character);
            const bucket = byRole.get(role) ?? [];
            bucket.push(character);
            byRole.set(role, bucket);
        }
        // 已知职能按 ROLE_ORDER，其余追加到末尾。
        const ordered = [
            ...ROLE_ORDER.filter((role) => byRole.has(role)),
            ...[...byRole.keys()].filter((role) => !ROLE_ORDER.includes(role)),
        ];
        return ordered.map((role) => ({ role, characters: byRole.get(role)! }));
    }, [characters, query, settings.characterAliases]);

    const matchedCount = useMemo(
        () => groups.reduce((sum, group) => sum + group.characters.length, 0),
        [groups],
    );

    return (
        <div
            className="flex h-full flex-col bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            <div className="mx-auto flex min-h-0 w-full max-w-312.5 flex-1 flex-col">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-64 flex-1">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                            <SearchIcon/>
                        </div>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            type="search"
                            placeholder="搜索角色名称"
                            className="h-10 w-full rounded border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-600"
                        />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {matchedCount} / {characters.length}
                    </span>
                </div>

                {error && <div
                    className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

                {loading && characters.length === 0 ? (
                    <div className="mt-32 text-center text-sm text-neutral-500 dark:text-neutral-400">Loading...</div>
                ) : (
                    // 网格限高，超出滚动查看更多。
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                        {groups.map((group) => (
                            <div key={group.role}>
                                <div className="mb-2 flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                        {ROLE_NAMES[group.role] ?? group.role}
                                    </h2>
                                    <span className="text-xs text-neutral-400">{group.characters.length}</span>
                                </div>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3">
                                    {group.characters.map((character) => (
                                        <button
                                            key={character.id}
                                            type="button"
                                            onClick={() => navigate(`/characters/${character.id}`)}
                                            className="flex cursor-pointer flex-col items-center overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
                                        >
                                            <img
                                                className="h-16 w-16 rounded-full object-cover"
                                                src={character.imageUrl}
                                                alt={character.name}
                                                loading="lazy"
                                            />
                                            <div
                                                className="mt-2 w-full truncate text-center text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                                {resolveCharacterName(settings, character.name)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {!loading && !error && matchedCount === 0 && (
                            <div className="mt-32 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                没有匹配的角色
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
