import { invoke } from "@tauri-apps/api/core";

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
  overlayShortcut: string;
}

/**
 * 从后端加载设置
 */
export async function loadSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>("get_settings");
}

/**
 * 保存设置到后端
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  await invoke("update_settings", { settings });
}

/**
 * 获取当前语言设置
 */
export async function getLanguage(): Promise<string> {
  return await invoke<string>("get_setting_language");
}

/**
 * 设置语言
 */
export async function setLanguage(language: string): Promise<void> {
  await invoke("set_setting_language", { language });
}
