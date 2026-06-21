use crate::core::dll::*;
use crate::core::ipc::GameSnapshot;
use std::sync::{Arc, Mutex, LazyLock};
use std::path::PathBuf;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

static PLUGIN: LazyLock<Mutex<Option<Result<Arc<Plugin>, String>>>> = LazyLock::new(|| Mutex::new(None));
static PLUGIN_PATH: LazyLock<Mutex<Option<PathBuf>>> = LazyLock::new(|| Mutex::new(None));

fn get_or_load_plugin() -> Result<Arc<Plugin>, String> {
    let mut guard = PLUGIN.lock().unwrap();

    // 如果已经加载过，返回缓存的结果
    if let Some(cached) = guard.as_ref() {
        return cached.clone();
    }

    // 首次加载
    let plugin_path = {
        let path_guard = PLUGIN_PATH.lock().unwrap();
        if let Some(custom_path) = path_guard.as_ref() {
            custom_path.clone()
        } else {
            crate::config::get_plugin_path()
        }
    };

    log::info!(target: "dll", "attempting to load plugin from: {}", plugin_path.display());

    let result = match Plugin::load(plugin_path.to_string_lossy().to_string()) {
        Ok(p) => {
            log::info!(target: "dll", "plugin loaded successfully");
            Ok(Arc::new(p))
        }
        Err(e) => {
            log::error!(target: "dll", "failed to load plugin: {e}");
            Err(format!("DLL加载失败: {} (路径: {})", e, plugin_path.display()))
        }
    };

    *guard = Some(result.clone());
    result
}

/// 设置 DLL 路径并重新加载
#[tauri::command]
pub fn set_plugin_path(path: String) -> Result<(), String> {
    let mut path_guard = PLUGIN_PATH.lock().unwrap();
    *path_guard = Some(PathBuf::from(path));
    drop(path_guard);

    // 清除缓存，下次调用时会重新加载
    let mut guard = PLUGIN.lock().unwrap();
    *guard = None;
    drop(guard);

    log::info!(target: "dll", "plugin path updated and cache cleared");
    Ok(())
}

/// 获取当前配置的 DLL 路径
#[tauri::command]
pub fn get_plugin_path() -> String {
    let path_guard = PLUGIN_PATH.lock().unwrap();
    if let Some(custom_path) = path_guard.as_ref() {
        custom_path.to_string_lossy().to_string()
    } else {
        crate::config::get_plugin_path().to_string_lossy().to_string()
    }
}

/// 重新加载 DLL（当设置变更时调用）
#[tauri::command]
pub fn reload_plugin() -> Result<(), String> {
    let mut guard = PLUGIN.lock().unwrap();
    *guard = None; // 清除缓存
    drop(guard);

    log::info!(target: "dll", "plugin cache cleared, will reload on next use");
    Ok(())
}

#[tauri::command]
pub fn inject() -> Result<bool, String> {
    let plugin = get_or_load_plugin()?;

    let result = plugin.inject();
    if result {
        log::info!(target: "dll", "injected successfully");
        Ok(true)
    } else {
        log::error!(target: "dll", "failed to inject");
        Err("注入失败，请确保游戏正在运行".to_string())
    }
}

#[tauri::command]
pub fn quit() -> Result<bool, String> {
    let plugin = get_or_load_plugin()?;

    let result = plugin.quit();
    if result {
        log::info!(target: "dll", "quit successfully");
        Ok(true)
    } else {
        log::warn!(target: "dll", "quit failed or already quit");
        Err("退出失败或已经退出".to_string())
    }
}

#[tauri::command]
pub fn fetch() -> Result<GameSnapshot, String> {
    let plugin = get_or_load_plugin()?;

    match plugin.fetch() {
        Some(buf) => Ok(GameSnapshot::from_bytes(buf)),
        None => Err("无法获取游戏数据，请确保已注入且游戏正在运行".to_string()),
    }
}
