/// Application configuration constants and settings.
use std::path::PathBuf;
use std::sync::RwLock;

/// Global language setting for API requests
static CURRENT_LANGUAGE: RwLock<&str> = RwLock::new("zh_CN");

/// Set the current language for API requests
pub fn set_language(lang: &str) {
    if let Ok(mut current) = CURRENT_LANGUAGE.write() {
        *current = match lang {
            "en" => "en",
            "ko" => "ko",
            "ja" => "ja",
            "zh-CN" | "zh_CN" => "zh_CN",
            "zh-TW" | "zh_TW" => "zh_TW",
            _ => "zh_CN", // default to Simplified Chinese
        };
    }
}

/// Get the current language for API requests
pub fn get_language() -> String {
    CURRENT_LANGUAGE
        .read()
        .map(|lang| lang.to_string())
        .unwrap_or_else(|_| "zh_CN".to_string())
}

/// Gets the DLL plugin path from environment variable or uses default.
///
/// Set the `DAKGG_PLUGIN_PATH` environment variable to override the default path.
///
/// # Example
/// ```bash
/// set DAKGG_PLUGIN_PATH=C:\path\to\dakgg-er-plugin.dll
/// ```
pub fn get_plugin_path() -> PathBuf {
    if let Ok(path) = std::env::var("DAKGG_PLUGIN_PATH") {
        return PathBuf::from(path);
    }

    // Default: look in the same directory as the executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return exe_dir.join("dakgg-er-plugin.dll");
        }
    }

    // Fallback for development
    PathBuf::from("dakgg-er-plugin.dll")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_path_default() {
        let path = get_plugin_path();
        assert!(path.to_string_lossy().contains("dakgg-er-plugin.dll"));
    }

    #[test]
    fn test_language_setting() {
        set_language("en");
        assert_eq!(get_language(), "en");

        set_language("zh-CN");
        assert_eq!(get_language(), "zh_CN");

        set_language("zh_TW");
        assert_eq!(get_language(), "zh_TW");
    }
}
