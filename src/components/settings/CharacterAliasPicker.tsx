import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import type {CharacterBrief} from "../../types/bser";

export interface CharacterAliasPickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    characters: CharacterBrief[];
}

export default function CharacterAliasPicker({
                                                value,
                                                onChange,
                                                placeholder,
                                                characters,
                                            }: CharacterAliasPickerProps) {
    const {t} = useTranslation();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const selected = useMemo(
        () => characters.find((character) => character.name === value) ?? null,
        [characters, value],
    );

    const filtered = useMemo(() => {
        const keyword = query.trim().toLocaleLowerCase();
        if (!keyword) return characters;
        return characters
            .filter((character) => character.name.toLocaleLowerCase().includes(keyword));
    }, [characters, query]);

    const showSelectedPreview = !!selected && query === selected.name;

    useEffect(() => {
        if (!open) {
            setQuery(selected?.name ?? "");
        }
    }, [open, selected]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        window.addEventListener("mousedown", onPointerDown);
        return () => window.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const commitCharacter = (name: string) => {
        onChange(name);
        setQuery(name);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="relative">
            <div className="relative">
                {showSelectedPreview ? (
                    <img
                        className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full object-cover"
                        src={selected.imageUrl}
                        alt={selected.name}
                    />
                ) : null}

                <input
                    ref={inputRef}
                    value={query}
                    onFocus={() => setOpen(true)}
                    onClick={() => setOpen(true)}
                    onChange={(event) => {
                        setOpen(true);
                        setQuery(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setOpen(false);
                            inputRef.current?.blur();
                            return;
                        }

                        if (event.key === "Enter" && filtered.length > 0) {
                            event.preventDefault();
                            commitCharacter(filtered[0].name);
                        }
                    }}
                    placeholder={placeholder}
                    className={`h-10 w-full rounded border border-neutral-300 bg-white pr-8 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600 ${
                        showSelectedPreview ? "pl-11" : "px-3"
                    }`}
                />

                <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
          {open ? "▲" : "▼"}
        </span>
            </div>

            {open && (
                <div
                    className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="max-h-72 overflow-y-auto p-1.5">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                {t('settings.noAliases')}
                            </div>
                        ) : (
                            filtered.map((character) => {
                                const active = character.name === value;
                                return (
                                    <button
                                        key={character.id}
                                        type="button"
                                        onClick={() => commitCharacter(character.name)}
                                        className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${
                                            active
                                                ? "bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50"
                                                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        }`}
                                    >
                                        <img
                                            className="h-8 w-8 rounded-full object-cover"
                                            src={character.imageUrl}
                                            alt={character.name}
                                        />
                                        <span className="min-w-0 flex-1 truncate">{character.name}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
