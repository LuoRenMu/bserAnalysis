/// Application configuration constants and settings.
use std::path::PathBuf;

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
}
