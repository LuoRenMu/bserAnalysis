import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {AliasEntry} from "../../utils/settings";
import type {CharacterBrief} from "../../types/bser";
import CharacterAliasPicker from "./CharacterAliasPicker";

export interface AliasSectionProps {
    title: string;
    description: string;
    entries: AliasEntry[];
    sourceLabel: string;
    aliasLabel: string;
    onChange: (entries: AliasEntry[]) => void;
    characters?: CharacterBrief[];
}

export default function AliasSection({
                                        title,
                                        description,
                                        entries,
                                        sourceLabel,
                                        aliasLabel,
                                        onChange,
                                        characters,
                                    }: AliasSectionProps) {
    const {t} = useTranslation();
    const [source, setSource] = useState("");
    const [alias, setAlias] = useState("");

    const sourceMeta = useMemo(() => {
        const map = new Map<string, CharacterBrief>();
        for (const character of characters ?? []) {
            map.set(character.name, character);
        }
        return map;
    }, [characters]);

    const addEntry = () => {
        const nextSource = source.trim();
        const nextAlias = alias.trim();
        if (!nextSource || !nextAlias) return;

        const exists = entries.some(
            (entry) =>
                entry.source.trim().toLocaleLowerCase() === nextSource.toLocaleLowerCase() &&
                entry.alias.trim().toLocaleLowerCase() === nextAlias.toLocaleLowerCase(),
        );
        if (exists) return;

        onChange([...entries, {source: nextSource, alias: nextAlias}]);
        setSource("");
        setAlias("");
    };

    const removeEntry = (index: number) => {
        onChange(entries.filter((_, entryIndex) => entryIndex !== index));
    };

    return (
        <section className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{title}</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
            </div>

            <div className="space-y-3 p-4">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_84px]">
                    {characters ? (
                        <CharacterAliasPicker
                            value={source}
                            onChange={setSource}
                            placeholder={sourceLabel}
                            characters={characters}
                        />
                    ) : (
                        <input
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") addEntry();
                            }}
                            placeholder={sourceLabel}
                            className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                        />
                    )}

                    <input
                        value={alias}
                        onChange={(event) => setAlias(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") addEntry();
                        }}
                        placeholder={aliasLabel}
                        className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                    />

                    <button
                        type="button"
                        onClick={addEntry}
                        disabled={!source.trim() || !alias.trim()}
                        className="h-10 rounded bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300"
                    >
                        {t('common.add')}
                    </button>
                </div>

                {entries.length === 0 ? (
                    <div
                        className="rounded border border-dashed border-neutral-200 px-3 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                        {t('settings.noAliases')}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
                        {entries.map((entry, index) => {
                            const meta = sourceMeta.get(entry.source);
                            return (
                                <div
                                    key={`${entry.source}-${entry.alias}-${index}`}
                                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px] items-center gap-2 border-t border-neutral-200 px-3 py-2 first:border-t-0 dark:border-neutral-800"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        {meta ? (
                                            <img
                                                className="h-8 w-8 rounded-full object-cover"
                                                src={meta.imageUrl}
                                                alt={entry.source}
                                            />
                                        ) : null}
                                        <div
                                            className="min-w-0 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                            {entry.source}
                                        </div>
                                    </div>

                                    <div className="min-w-0 truncate text-sm text-[#ca9372]">{entry.alias}</div>

                                    <button
                                        type="button"
                                        onClick={() => removeEntry(index)}
                                        className="h-8 rounded text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                        {t('common.delete')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
