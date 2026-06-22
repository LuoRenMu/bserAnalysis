import { atom } from "jotai";
import { loadSettings, saveSettings, type AppSettings } from "./settingsApi";

/**
 * Settings atom - 后端为 source of truth
 *
 * 这个 atom 只是缓存，真实数据在后端
 */
export const settingsAtom = atom<AppSettings | null>(null);

/**
 * 加载设置的 action atom
 */
export const loadSettingsAtom = atom(
  null,
  async (_get, set) => {
    try {
      const settings = await loadSettings();
      set(settingsAtom, settings);
      return settings;
    } catch (error) {
      console.error("Failed to load settings:", error);
      throw error;
    }
  }
);

/**
 * 保存设置的 action atom
 */
export const saveSettingsAtom = atom(
  null,
  async (_get, set, settings: AppSettings) => {
    try {
      await saveSettings(settings);
      set(settingsAtom, settings);
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }
);

/**
 * 更新部分设置的 action atom
 */
export const updateSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<AppSettings>) => {
    const current = get(settingsAtom);
    if (!current) {
      throw new Error("Settings not loaded");
    }

    const updated = { ...current, ...updates };
    await set(saveSettingsAtom, updated);
  }
);

// 工具函数用于解析别名
function aliasKey(value: string) {
  return value.trim().toLowerCase();
}

function findAlias(name: string, aliases: AppSettings["playerAliases"]): string | null {
  const key = aliasKey(name);
  for (const entry of aliases) {
    if (aliasKey(entry.source) === key) {
      return entry.alias;
    }
  }
  return null;
}

function findSource(name: string, aliases: AppSettings["playerAliases"]): string {
  const key = aliasKey(name);
  if (!key) return name;

  // 先找 source
  for (const entry of aliases) {
    if (aliasKey(entry.source) === key) {
      return entry.source;
    }
  }

  // 再找 alias
  for (const entry of aliases) {
    if (aliasKey(entry.alias) === key) {
      return entry.source;
    }
  }

  return name;
}

export function resolvePlayerName(settings: AppSettings | null, name: string): string {
  if (!settings) return name;
  return findAlias(name, settings.playerAliases) || name;
}

export function resolveCharacterName(settings: AppSettings | null, name: string): string {
  if (!settings) return name;
  return findAlias(name, settings.characterAliases) || name;
}

export function resolvePlayerSearchName(settings: AppSettings | null, name: string): string {
  if (!settings) return name;
  return findSource(name, settings.playerAliases);
}

export function resolveCharacterSearchName(settings: AppSettings | null, name: string): string {
  if (!settings) return name;
  return findSource(name, settings.characterAliases);
}

export function matchesAliasQuery(
  name: string,
  aliases: AppSettings["playerAliases"],
  query: string
): boolean {
  const normalizedQuery = aliasKey(query);
  if (!normalizedQuery) return true;

  if (aliasKey(name).includes(normalizedQuery)) {
    return true;
  }

  const sourceKey = aliasKey(name);
  return aliases.some(
    (entry) =>
      aliasKey(entry.source) === sourceKey && aliasKey(entry.alias).includes(normalizedQuery)
  );
}
