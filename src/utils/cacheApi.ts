import { invoke } from "@tauri-apps/api/core";

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  await invoke("clear_all_cache");
}
