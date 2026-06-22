import {useEffect, useMemo, useRef, useState} from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {useTranslation} from "react-i18next";
import {appSettingsAtom, DEFAULT_DLL_PATH, type AliasEntry} from "../utils/settings";
import {characterBriefAtom, injectAtom} from "../store";
import type {CharacterBrief} from "../types/bser";
import DoubleConfirmDialog from "../components/DoubleConfirmDialog";
import LanguageSelector from "../components/LanguageSelector";
import {
    registerOverlayShortcut,
    toggleOverlayWindow,
} from "../utils/overlayApi";
import {clearAllCache} from "../utils/cacheApi";
import {addErrorNotificationAtom, addSuccessNotificationAtom} from "../store/errorStore";

function CharacterAliasPicker({
                                  value,
                                  onChange,
                                  placeholder,
                                  characters,
                              }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    characters: CharacterBrief[];
}) {
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

function AliasSection({
                          title,
                          description,
                          entries,
                          sourceLabel,
                          aliasLabel,
                          onChange,
                          characters,
                      }: {
    title: string;
    description: string;
    entries: AliasEntry[];
    sourceLabel: string;
    aliasLabel: string;
    onChange: (entries: AliasEntry[]) => void;
    characters?: CharacterBrief[];
}) {
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

export default function Settings() {
    const {t} = useTranslation();
    const [settings, setSettings] = useAtom(appSettingsAtom);
    const characters = useAtomValue(characterBriefAtom);
    const setInjected = useAtom(injectAtom)[1];
    const [confirmOpen, setConfirmOpen] = useState(false);
    const addErrorNotification = useSetAtom(addErrorNotificationAtom);
    const addSuccessNotification = useSetAtom(addSuccessNotificationAtom);
    const [pendingSkipConfirm, setPendingSkipConfirm] = useState(false);

    return (
        <div
            className="h-full overflow-auto bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            <div className="mx-auto max-w-312.5 space-y-4">
                <header>
                    <h1 className="text-2xl font-black text-neutral-950 dark:text-neutral-50">{t('settings.title')}</h1>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('settings.betaVersion')}
                    </p>
                </header>

                <section
                    className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.boundPlayerSection')}</h2>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.boundPlayerDesc')}
                        </p>
                    </div>

                    <div className="space-y-3 p-4">
                        <input
                            value={settings.boundPlayerName}
                            onChange={(event) =>
                                setSettings((current) => ({...current, boundPlayerName: event.target.value}))
                            }
                            placeholder={t('settings.boundPlayerPlaceholder')}
                            spellCheck={false}
                            className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                        />
                    </div>
                </section>

                <section
                    className="overflow-hidden `rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.languageSection')}</h2>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.languageDesc')}
                        </p>
                    </div>

                    <div className="space-y-3 p-4">
                        <LanguageSelector />
                    </div>
                </section>

                <section
                    className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.injectionSection')}</h2>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                           {t('settings.injectionDesc')}
                        </p>
                    </div>

                    <div className="space-y-4 p-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={settings.skipInjectionConfirm}
                                onChange={(event) => {
                                    if (event.target.checked) {
                                        // 勾选时显示确认对话框
                                        setPendingSkipConfirm(true);
                                        setConfirmOpen(true);
                                    } else {
                                        // 取消勾选直接设置
                                        setSettings((current) => ({
                                            ...current,
                                            skipInjectionConfirm: false,
                                        }));
                                    }
                                }}
                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {t('settings.enableInjection')}
                            </span>
                        </label>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.dllPathHint1')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.dllPathHint2')}
                        </p>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                {t('settings.dllPluginPath')}
                            </label>
                            <input
                                value={settings.dllPath}
                                onChange={(event) =>
                                    setSettings((current) => ({...current, dllPath: event.target.value}))
                                }
                                spellCheck={false}
                                placeholder={t('settings.dllPathPlaceholder')}
                                className="h-10 w-full rounded border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {t('settings.dllPathPlaceholder')}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSettings((current) => ({...current, dllPath: DEFAULT_DLL_PATH}))}
                                    className="h-7 rounded border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                >
                                    {t('settings.resetToDefault')}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <AliasSection
                    title={t('settings.characterAliasSection')}
                    description={t('settings.characterAliasDesc')}
                    entries={settings.characterAliases}
                    sourceLabel={t('settings.originalName')}
                    aliasLabel={t('settings.aliasName')}
                    onChange={(characterAliases) =>
                        setSettings((current) => ({...current, characterAliases}))
                    }
                    characters={characters}
                />

                <AliasSection
                    title={t('settings.playerAliasSection')}
                    description={t('settings.playerAliasDesc')}
                    entries={settings.playerAliases}
                    sourceLabel={t('settings.originalName')}
                    aliasLabel={t('settings.aliasName')}
                    onChange={(playerAliases) => setSettings((current) => ({...current, playerAliases}))}
                />

                {/* 游戏覆盖层测试 */}
                <section
                    className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">游戏覆盖层</h2>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            测试游戏内覆盖层窗口
                        </p>
                    </div>

                    <div className="space-y-4 p-4">
                        {/* 快捷键设置 */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                快捷键
                            </label>
                            <input
                                type="text"
                                value={settings.overlayShortcut}
                                onChange={(event) =>
                                    setSettings((current) => ({
                                        ...current,
                                        overlayShortcut: event.target.value,
                                    }))
                                }
                                onBlur={() => {
                                    const shortcut = settings.overlayShortcut.trim();
                                    if (!shortcut) return;
                                    registerOverlayShortcut(shortcut).catch((error) => {
                                        console.error('Failed to register shortcut:', error);
                                        addErrorNotification(`快捷键无效: ${error}`);
                                    });
                                }}
                                placeholder="如：` 或 Ctrl+Shift+O 或 F1"
                                spellCheck={false}
                                className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                            />
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                输入快捷键组合（修饰键用 Ctrl/Shift/Alt/Meta，主键用字母/数字/F1-F12/` 等），用 + 连接。长按显示覆盖层，松开关闭。
                            </p>
                        </div>

                        {/* 测试按钮 */}
                        <button
                            type="button"
                            onClick={() => {
                                toggleOverlayWindow().catch((error) => {
                                    console.error('Failed to toggle overlay:', error);
                                });
                            }}
                            className="h-10 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                        >
                            显示/隐藏覆盖层
                        </button>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            长按设置的快捷键也可在游戏中显示覆盖层，松开关闭
                        </p>
                    </div>
                </section>

                {/* 缓存管理 */}
                <section
                    className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.cacheManagement')}</h2>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.cacheManagementDesc')}
                        </p>
                    </div>

                    <div className="space-y-3 p-4">
                        {/* 清除所有缓存 */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    {t('settings.clearAllCache')}
                                </div>
                                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                    {t('settings.clearAllCacheDesc')}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await clearAllCache();
                                        addSuccessNotification(t('settings.cacheCleared'));
                                    } catch (error) {
                                        console.error('Failed to clear all cache:', error);
                                        addErrorNotification(t('settings.cacheClearFailed'));
                                    }
                                }}
                                className="h-8 rounded border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-neutral-950 dark:text-red-400 dark:hover:bg-red-950"
                            >
                                {t('settings.clearAll')}
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <DoubleConfirmDialog
                open={confirmOpen}
                showRememberOption={false}
                firstStep={{
                    title: t('settings.confirmEnableInjectionTitle'),
                    description: t('settings.confirmEnableInjectionDesc'),
                    confirmLabel: t('settings.confirmEnableInjectionContinue'),
                }}
                secondStep={{
                    title: t('settings.confirmEnableInjectionSecondTitle'),
                    description: t('settings.confirmEnableInjectionSecondDesc'),
                    confirmLabel: t('settings.confirmEnableInjectionConfirm'),
                }}
                onCancel={async () => {
                    setConfirmOpen(false);
                    setPendingSkipConfirm(false);
                }}
                onConfirm={async () => {
                    setConfirmOpen(false);
                    if (pendingSkipConfirm) {
                        setSettings((current) => ({
                            ...current,
                            skipInjectionConfirm: true,
                        }));
                        // 立即启用注入
                        setInjected(true);
                        setPendingSkipConfirm(false);
                    }
                }}
            />
        </div>
    );
}
