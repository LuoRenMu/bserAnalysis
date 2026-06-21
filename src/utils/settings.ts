import { atom } from "jotai";
import { load, type Store } from "@tauri-apps/plugin-store";

export interface AliasEntry {
  source: string;
  alias: string;
}

export interface AppSettings {
  playerAliases: AliasEntry[];
  characterAliases: AliasEntry[];
  dllPath: string;
  skipInjectionConfirm: boolean;
  boundPlayerName: string;
}

export const DEFAULT_DLL_PATH =
  "resources\\dakgg-client\\resources\\app.asar.unpacked\\node_modules\\@playxp\\dakgg-er-plugin\\build\\dakgg-er-plugin.dll";

const STORAGE_KEY = "bser_analysis_settings_v1";
const STORE_FILE = "settings.json";

export const defaultSettings: AppSettings = {
  playerAliases: [],
  characterAliases: [],
  dllPath: DEFAULT_DLL_PATH,
  skipInjectionConfirm: false,
  boundPlayerName: "",
};

function aliasKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function cleanAliases(entries: AliasEntry[] | undefined): AliasEntry[] {
  const seen = new Set<string>();
  const result: AliasEntry[] = [];

  for (const entry of entries ?? []) {
    const source = entry.source.trim();
    const alias = entry.alias.trim();
    const key = `${aliasKey(source)}::${aliasKey(alias)}`;
    if (!source || !alias || seen.has(key)) continue;
    seen.add(key);
    result.push({ source, alias });
  }

  return result;
}

function normalizeSettings(value: Partial<AppSettings> | undefined): AppSettings {
  return {
    playerAliases: cleanAliases(value?.playerAliases),
    characterAliases: cleanAliases(value?.characterAliases),
    dllPath: value?.dllPath?.trim() || DEFAULT_DLL_PATH,
    skipInjectionConfirm: value?.skipInjectionConfirm ?? false,
    boundPlayerName: value?.boundPlayerName?.trim() || "",
  };
}

function readLegacyLocalSettings(): AppSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return null;
  }
}

function clearLegacyLocalSettings() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cleanup failures; the migrated store remains the source of truth.
  }
}

let settingsStorePromise: Promise<Store> | null = null;

function getSettingsStore(): Promise<Store> {
  if (!settingsStorePromise) {
    settingsStorePromise = load(STORE_FILE, {
      autoSave: false,
      defaults: {
        [STORAGE_KEY]: defaultSettings,
      },
    });
  }

  return settingsStorePromise;
}

export async function loadSettings(): Promise<AppSettings> {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const store = await getSettingsStore();
    const value = await store.get<Partial<AppSettings>>(STORAGE_KEY);
    if (value) return normalizeSettings(value);

    const legacySettings = readLegacyLocalSettings();
    if (!legacySettings) return defaultSettings;

    await store.set(STORAGE_KEY, legacySettings);
    await store.save();
    clearLegacyLocalSettings();
    return legacySettings;
  } catch {
    return readLegacyLocalSettings() ?? defaultSettings;
  }
}

async function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;

  try {
    const store = await getSettingsStore();
    await store.set(STORAGE_KEY, settings);
    await store.save();
    clearLegacyLocalSettings();
  } catch {
    // Settings are convenience state; failed persistence should not break the app.
  }
}

export const settingsBaseAtom = atom<AppSettings>(defaultSettings);

export const appSettingsAtom = atom(
  (get) => get(settingsBaseAtom),
  (get, set, update: AppSettings | ((current: AppSettings) => AppSettings)) => {
    const next = normalizeSettings(typeof update === "function" ? update(get(settingsBaseAtom)) : update);
    set(settingsBaseAtom, next);
    saveSettings(next);
  },
);

function resolveDisplayAlias(name: string, aliases: AliasEntry[] | undefined) {
  const key = aliasKey(name);
  let resolved: string | null = null;

  for (const entry of aliases ?? []) {
    if (aliasKey(entry.source) === key) {
      resolved = entry.alias;
    }
  }

  return resolved || name;
}

function resolveAliasSource(name: string, aliases: AliasEntry[] | undefined) {
  const key = aliasKey(name);
  if (!key) return name;

  for (const entry of aliases ?? []) {
    if (aliasKey(entry.source) === key) {
      return entry.source;
    }
  }

  for (const entry of aliases ?? []) {
    if (aliasKey(entry.alias) === key) {
      return entry.source;
    }
  }

  return name;
}

export function resolvePlayerName(settings: AppSettings | null | undefined, name: string) {
  return resolveDisplayAlias(name, settings?.playerAliases);
}

export function resolveCharacterName(settings: AppSettings | null | undefined, name: string) {
  return resolveDisplayAlias(name, settings?.characterAliases);
}

export function resolvePlayerSearchName(settings: AppSettings | null | undefined, name: string) {
  return resolveAliasSource(name, settings?.playerAliases);
}

export function resolveCharacterSearchName(settings: AppSettings | null | undefined, name: string) {
  return resolveAliasSource(name, settings?.characterAliases);
}

export function matchesAliasQuery(name: string, aliases: AliasEntry[] | undefined, query: string) {
  const normalizedQuery = aliasKey(query);
  if (!normalizedQuery) return true;

  if (aliasKey(name).includes(normalizedQuery)) {
    return true;
  }

  const sourceKey = aliasKey(name);
  return (
    aliases?.some(
      (entry) =>
        aliasKey(entry.source) === sourceKey &&
        aliasKey(entry.alias).includes(normalizedQuery),
    ) ?? false
  );
}
