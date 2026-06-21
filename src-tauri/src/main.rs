// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};
use tauri_plugin_prevent_default::Flags;

fn main() {
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
                .build()
        )
        .plugin(
            tauri_plugin_prevent_default::Builder::new()
                .with_flags(Flags::CONTEXT_MENU | Flags::PRINT | Flags::DOWNLOADS)
                .build()
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bseranalysis_lib::command::bser_client::greet,
            bseranalysis_lib::command::bser_client::inject,
            bseranalysis_lib::command::bser_client::quit,
            bseranalysis_lib::command::bser_client::fetch,
            bseranalysis_lib::command::bser_client::reload_plugin,
            bseranalysis_lib::command::bser_client::set_plugin_path,
            bseranalysis_lib::command::bser_client::get_plugin_path,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
