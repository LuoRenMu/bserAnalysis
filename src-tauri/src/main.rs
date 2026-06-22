// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;

use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};
use tauri_plugin_prevent_default::Flags;

fn main() {
    // 初始化游戏数据源
    let dll_path = bseranalysis_lib::config::get_plugin_path();
    let data_source: Arc<dyn bseranalysis_lib::game_data::GameDataSource> =
        Arc::new(bseranalysis_lib::game_data::DllGameDataSource::new(dll_path));
    let game_data_manager =
        bseranalysis_lib::game_data::GameDataManager::new(Arc::clone(&data_source));

    // 初始化设置管理器
    let settings_manager = bseranalysis_lib::settings::SettingsManager::new();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("bseranalysis_lib", log::LevelFilter::Debug)
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .max_file_size(10_000_000)
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("bseranalysis".into()),
                    }),
                ])
                .build(),
        )
        .plugin(
            tauri_plugin_prevent_default::Builder::new()
                .with_flags(Flags::CONTEXT_MENU | Flags::PRINT | Flags::DOWNLOADS)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(game_data_manager)
        .manage(settings_manager)
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // 初始化 OverlayManager（需要 AppHandle + 数据源）
            let overlay_manager = bseranalysis_lib::overlay::OverlayManager::new(
                app_handle.clone(),
                data_source,
            );
            app.manage(overlay_manager);

            // 初始化键盘中心（rdev 监听线程）
            bseranalysis_lib::keyboard::init(app_handle.clone());

            // 创建隐藏的 overlay 窗口
            if let Err(e) = bseranalysis_lib::overlay::create_overlay_window(&app_handle) {
                log::error!("Failed to create overlay window: {}", e);
            }

            // 从已保存的设置中注册 overlay 快捷键
            let settings_manager =
                app.state::<bseranalysis_lib::settings::SettingsManager>();
            if let Ok(settings) = settings_manager.load(&app_handle) {
                match bseranalysis_lib::keyboard::parse_shortcut(&settings.overlay_shortcut) {
                    Ok(combo) => {
                        if let Err(e) = bseranalysis_lib::keyboard::set_overlay_combo(combo) {
                            log::error!("Failed to register overlay shortcut: {}", e);
                        }
                    }
                    Err(e) => {
                        log::warn!(
                            "Saved overlay shortcut '{}' invalid: {}",
                            settings.overlay_shortcut,
                            e
                        );
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bseranalysis_lib::command::bser_client::greet,
            bseranalysis_lib::command::bser_client::inject,
            bseranalysis_lib::command::bser_client::quit,
            bseranalysis_lib::command::bser_client::fetch,
            bseranalysis_lib::command::bser_client::reload_plugin,
            bseranalysis_lib::command::bser_client::set_plugin_path,
            bseranalysis_lib::command::bser_client::get_plugin_path,
            bseranalysis_lib::command::bser_request::set_language,
            bseranalysis_lib::command::bser_request::search_player,
            bseranalysis_lib::command::bser_request::refresh_player,
            bseranalysis_lib::command::bser_request::fetch_leaderboard,
            bseranalysis_lib::command::bser_request::fetch_player_overview,
            bseranalysis_lib::command::bser_request::fetch_player_profile,
            bseranalysis_lib::command::bser_request::fetch_characters,
            bseranalysis_lib::command::bser_request::fetch_character_analysis,
            bseranalysis_lib::command::bser_request::fetch_game_reference,
            bseranalysis_lib::command::bser_request::get_match_detail,
            bseranalysis_lib::command::bser_request::fetch_character_leaderboard,
            bseranalysis_lib::command::bser_request::fetch_seasons,
            bseranalysis_lib::command::bser_request::fetch_character_stats,
            bseranalysis_lib::command::bser_request::clear_all_cache,
            bseranalysis_lib::command::settings::get_settings,
            bseranalysis_lib::command::settings::update_settings,
            bseranalysis_lib::command::settings::get_setting_language,
            bseranalysis_lib::command::settings::set_setting_language,
            bseranalysis_lib::command::overlay::start_overlay_monitoring,
            bseranalysis_lib::command::overlay::stop_overlay_monitoring,
            bseranalysis_lib::command::overlay::is_overlay_monitoring,
            bseranalysis_lib::command::overlay::show_overlay_window,
            bseranalysis_lib::command::overlay::hide_overlay_window,
            bseranalysis_lib::command::overlay::toggle_overlay_window,
            bseranalysis_lib::command::overlay::is_overlay_window_visible,
            bseranalysis_lib::command::keyboard::start_shortcut_recording,
            bseranalysis_lib::command::keyboard::cancel_shortcut_recording,
            bseranalysis_lib::command::keyboard::is_shortcut_recording,
            bseranalysis_lib::command::keyboard::register_overlay_shortcut,
            bseranalysis_lib::command::keyboard::clear_overlay_shortcut
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                bseranalysis_lib::keyboard::stop();
            }
        });
}
