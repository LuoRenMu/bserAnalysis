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
            // Try vendor path first (bundled DLL location)
            let vendor_path = exe_dir.join("_up_/vendor/dakgg-client/resources/app.asar.unpacked/node_modules/@playxp/dakgg-er-plugin/build/dakgg-er-plugin.dll");
            if vendor_path.exists() {
                log::info!("Found plugin DLL at vendor path: {}", vendor_path.display());
                return vendor_path;
            }

            // Fallback to same directory
            let same_dir = exe_dir.join("dakgg-er-plugin.dll");
            if same_dir.exists() {
                log::info!("Found plugin DLL at same directory: {}", same_dir.display());
                return same_dir;
            }

            // Development fallback: check relative to exe_dir
            let dev_path = exe_dir.join("_up_/vendor/dakgg-client/resources/app.asar.unpacked/node_modules/@playxp/dakgg-er-plugin/build/dakgg-er-plugin.dll");
            if dev_path.exists() {
                log::info!("Found plugin DLL at dev path: {}", dev_path.display());
                return dev_path;
            }
        }
    }

    // Final fallback: relative path (will likely fail but try anyway)
    log::warn!("Could not locate plugin DLL, using fallback relative path");
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
