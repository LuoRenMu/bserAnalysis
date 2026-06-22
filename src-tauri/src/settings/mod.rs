use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{LazyLock, RwLock};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const SETTINGS_KEY: &str = "bser_analysis_settings_v1";

/// 全局语言设置（用于 API 请求）
/// 这是为了方便在没有 Tauri state 的地方访问
static GLOBAL_LANGUAGE: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new("zh_CN".to_string()));

/// 获取全局语言设置（用于 API 请求）
pub fn get_language() -> String {
    GLOBAL_LANGUAGE
        .read()
        .map(|lang| lang.clone())
        .unwrap_or_else(|_| "zh_CN".to_string())
}

/// 设置全局语言
fn set_global_language(lang: &str) {
    let normalized = match lang {
        "en" => "en",
        "ko" => "ko",
        "ja" => "ja",
        "zh-CN" | "zh_CN" => "zh_CN",
        "zh-TW" | "zh_TW" => "zh_TW",
        _ => "zh_CN",
    };

    if let Ok(mut current) = GLOBAL_LANGUAGE.write() {
        *current = normalized.to_string();
    }
}

/// 别名条目
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AliasEntry {
    pub source: String,
    pub alias: String,
}

/// 应用设置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub player_aliases: Vec<AliasEntry>,
    pub character_aliases: Vec<AliasEntry>,
    pub dll_path: String,
    pub skip_injection_confirm: bool,
    pub bound_player_name: String,
    pub overlay_shortcut: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            player_aliases: Vec::new(),
            character_aliases: Vec::new(),
            dll_path: "dakgg-er-plugin.dll".to_string(),
            skip_injection_confirm: false,
            bound_player_name: String::new(),
            overlay_shortcut: "`".to_string(),
        }
    }
}

impl AppSettings {
    /// 规范化设置（清理和验证）
    pub fn normalize(mut self) -> Self {
        self.player_aliases = clean_aliases(self.player_aliases);
        self.character_aliases = clean_aliases(self.character_aliases);
        self.dll_path = self.dll_path.trim().to_string();
        if self.dll_path.is_empty() {
            self.dll_path = "dakgg-er-plugin.dll".to_string();
        }
        self.bound_player_name = self.bound_player_name.trim().to_string();
        self.overlay_shortcut = self.overlay_shortcut.trim().to_string();
        if self.overlay_shortcut.is_empty() {
            self.overlay_shortcut = "`".to_string();
        }
        self
    }

    /// 获取 DLL 路径作为 PathBuf
    pub fn dll_path_buf(&self) -> PathBuf {
        PathBuf::from(&self.dll_path)
    }
}

/// 清理别名列表（去重、验证）
fn clean_aliases(entries: Vec<AliasEntry>) -> Vec<AliasEntry> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();

    for entry in entries {
        let source = entry.source.trim();
        let alias = entry.alias.trim();

        if source.is_empty() || alias.is_empty() {
            continue;
        }

        let key = format!("{}::{}", source.to_lowercase(), alias.to_lowercase());
        if seen.contains(&key) {
            continue;
        }

        seen.insert(key);
        result.push(AliasEntry {
            source: source.to_string(),
            alias: alias.to_string(),
        });
    }

    result
}

/// Settings 管理器（使用 Tauri store 作为持久化）
pub struct SettingsManager;

impl SettingsManager {
    pub fn new() -> Self {
        Self
    }

    /// 加载设置
    pub fn load(&self, app: &AppHandle) -> Result<AppSettings, String> {
        let store = app
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to open store: {}", e))?;

        let settings: Option<AppSettings> = store
            .get(SETTINGS_KEY)
            .and_then(|v| serde_json::from_value(v.clone()).ok());

        Ok(settings.unwrap_or_default().normalize())
    }

    /// 保存设置
    pub fn save(&self, app: &AppHandle, settings: AppSettings) -> Result<(), String> {
        let settings = settings.normalize();

        let store = app
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to open store: {}", e))?;

        let value = serde_json::to_value(&settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        store.set(SETTINGS_KEY, value);

        store
            .save()
            .map_err(|e| format!("Failed to persist settings: {}", e))?;

        log::info!("Settings saved successfully");
        Ok(())
    }

    /// 获取当前语言
    pub fn get_language(&self) -> String {
        get_language()
    }

    /// 设置当前语言
    pub fn set_language(&self, lang: &str) {
        set_global_language(lang);
        log::info!("Language set to: {}", lang);
    }
}

impl Default for SettingsManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = AppSettings::default();
        assert_eq!(settings.dll_path, "dakgg-er-plugin.dll");
        assert_eq!(settings.overlay_shortcut, "`");
        assert!(!settings.skip_injection_confirm);
    }

    #[test]
    fn test_normalize_settings() {
        let settings = AppSettings {
            player_aliases: vec![],
            character_aliases: vec![],
            dll_path: "  test.dll  ".to_string(),
            skip_injection_confirm: false,
            bound_player_name: "  Player  ".to_string(),
            overlay_shortcut: "  Ctrl+O  ".to_string(),
        };

        let normalized = settings.normalize();
        assert_eq!(normalized.dll_path, "test.dll");
        assert_eq!(normalized.bound_player_name, "Player");
        assert_eq!(normalized.overlay_shortcut, "Ctrl+O");
    }

    #[test]
    fn test_clean_aliases_removes_duplicates() {
        let aliases = vec![
            AliasEntry {
                source: "Player1".to_string(),
                alias: "P1".to_string(),
            },
            AliasEntry {
                source: "player1".to_string(), // 重复（忽略大小写）
                alias: "p1".to_string(),
            },
            AliasEntry {
                source: "Player2".to_string(),
                alias: "P2".to_string(),
            },
        ];

        let cleaned = clean_aliases(aliases);
        assert_eq!(cleaned.len(), 2);
    }

    #[test]
    fn test_clean_aliases_removes_empty() {
        let aliases = vec![
            AliasEntry {
                source: "".to_string(),
                alias: "P1".to_string(),
            },
            AliasEntry {
                source: "Player1".to_string(),
                alias: "".to_string(),
            },
            AliasEntry {
                source: "Player2".to_string(),
                alias: "P2".to_string(),
            },
        ];

        let cleaned = clean_aliases(aliases);
        assert_eq!(cleaned.len(), 1);
        assert_eq!(cleaned[0].source, "Player2");
    }

    #[test]
    fn test_settings_manager_language() {
        let manager = SettingsManager::new();

        manager.set_language("en");
        assert_eq!(manager.get_language(), "en");

        manager.set_language("zh-CN");
        assert_eq!(manager.get_language(), "zh_CN");

        manager.set_language("invalid");
        assert_eq!(manager.get_language(), "zh_CN"); // 默认值
    }

    #[test]
    fn test_global_language() {
        set_global_language("ja");
        assert_eq!(get_language(), "ja");

        set_global_language("ko");
        assert_eq!(get_language(), "ko");
    }
}
