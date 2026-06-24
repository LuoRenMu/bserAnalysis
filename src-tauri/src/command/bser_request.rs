use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::RequestError,
    types::{DakGgServerName, DakGgTeamMode, MatchingMode},
};
use crate::service::leaderboard_render::{assemble_leaderboard, LeaderboardRender};
use crate::service::match_render::{assemble_match_detail, MatchDetailRender};
use crate::service::player_render::{
    assemble_player_overview, assemble_player_search, fetch_character_briefs, CharacterBrief,
    CharacterDetailRender, GameReference, PlayerOverviewRender, PlayerSearchRender,
};

/// Helper function to log and convert errors to strings for Tauri commands.
/// Reduces boilerplate across command handlers.
fn log_error(operation: &str, context: &str, error: RequestError) -> String {
    log::warn!("{} failed {}: {}", operation, context, error);
    error.to_string()
}

use crate::request::cache::CACHE;

/// 清除所有缓存
#[tauri::command]
pub async fn clear_all_cache() -> Result<(), String> {
    CACHE.clear_all();
    Ok(())
}

#[tauri::command]
pub async fn set_language(
    manager: tauri::State<'_, crate::settings::SettingsManager>,
    hl: String,
) -> Result<(), String> {
    log::info!("set_language hl={hl:?}");

    // Update language in settings manager
    manager.set_language(&hl);

    // Update cache language and clear if changed
    crate::request::cache::CACHE.update_language(&hl);

    Ok(())
}

#[tauri::command]
pub async fn search_player(
    nickname: String,
    mode: Option<i32>,
    page: Option<i32>,
) -> Result<PlayerSearchRender, String> {
    let page = page.unwrap_or(1);
    log::info!("search_player nickname={nickname:?} mode={mode:?} page={page}");
    assemble_player_search(&nickname, MatchingMode::from_value(mode), page)
        .await
        .map_err(|e| log_error("search_player", &format!("nickname={nickname:?}"), e))
}

#[tauri::command]
pub async fn refresh_player(
    nickname: String,
    mode: Option<i32>,
    page: Option<i32>,
) -> Result<PlayerSearchRender, String> {
    let page = page.unwrap_or(1);
    log::info!("refresh_player nickname={nickname:?} mode={mode:?} page={page}");
    if let Err(error @ RequestError::NicknameNotFound(_)) =
        EternalReturnDakGgApi::sync(&nickname).await
    {
        return Err(log_error(
            "refresh_player sync",
            &format!("nickname={nickname:?}"),
            error,
        ));
    }

    assemble_player_search(&nickname, MatchingMode::from_value(mode), page)
        .await
        .map_err(|e| log_error("refresh_player", &format!("nickname={nickname:?}"), e))
}

#[tauri::command]
pub async fn fetch_characters() -> Result<Vec<CharacterBrief>, String> {
    log::info!("fetch_characters");
    fetch_character_briefs()
        .await
        .map_err(|e| log_error("fetch_characters", "", e))
}

#[tauri::command]
pub async fn fetch_character_analysis(
    character_id: i64,
    team_mode: Option<String>,
    matching_mode: Option<String>,
    tier: Option<String>,
) -> Result<CharacterDetailRender, String> {
    log::info!(
        "fetch_character_analysis character_id={character_id} team_mode={team_mode:?} matching_mode={matching_mode:?} tier={tier:?}"
    );
    crate::service::player_render::fetch_character_analysis(
        character_id,
        team_mode,
        matching_mode,
        tier,
    )
    .await
    .map_err(|e| {
        log_error(
            "fetch_character_analysis",
            &format!("character_id={character_id}"),
            e,
        )
    })
}

#[tauri::command]
pub async fn fetch_game_reference() -> Result<GameReference, String> {
    log::info!("fetch_game_reference");
    crate::service::player_render::fetch_game_reference()
        .await
        .map_err(|e| log_error("fetch_game_reference", "", e))
}

#[tauri::command]
pub async fn fetch_player_overview(
    nickname: String,
    mode: Option<i32>,
) -> Result<PlayerOverviewRender, String> {
    log::info!("fetch_player_overview nickname={nickname:?} mode={mode:?}");
    assemble_player_overview(&nickname, MatchingMode::from_value(mode))
        .await
        .map_err(|e| {
            log_error(
                "fetch_player_overview",
                &format!("nickname={nickname:?}"),
                e,
            )
        })
}

#[tauri::command]
pub async fn fetch_player_profile(
    nickname: String,
    mode: Option<i32>,
) -> Result<crate::service::player_render::PlayerProfileRender, String> {
    log::info!("fetch_player_profile nickname={nickname:?} mode={mode:?}");
    crate::service::player_render::assemble_player_profile(
        &nickname,
        MatchingMode::from_value(mode),
    )
    .await
    .map_err(|e| log_error("fetch_player_profile", &format!("nickname={nickname:?}"), e))
}

#[tauri::command]
pub async fn fetch_leaderboard(
    server: Option<String>,
    team: Option<String>,
    page: Option<i32>,
    season_id: Option<i32>,
) -> Result<LeaderboardRender, String> {
    let page = page.unwrap_or(1);
    let server = DakGgServerName::from_value(server.as_deref());
    let team_mode = DakGgTeamMode::from_value(team.as_deref());
    log::info!("fetch_leaderboard server={server:?} team={team_mode:?} page={page} season_id={season_id:?}");
    assemble_leaderboard(server, team_mode, page, season_id)
        .await
        .map_err(|e| log_error("fetch_leaderboard", "", e))
}

#[tauri::command]
pub async fn get_match_detail(
    nickname: String,
    season_id: i64,
    game_id: String,
) -> Result<MatchDetailRender, String> {
    let game_id_num = game_id.parse::<i64>().map_err(|e| e.to_string())?;
    log::info!("get_match_detail nickname={nickname:?} season_id={season_id} game_id={game_id}");
    assemble_match_detail(&nickname, season_id, game_id_num)
        .await
        .map_err(|e| log_error("get_match_detail", "", e))
}

#[tauri::command]
pub async fn fetch_character_leaderboard(
    character_id: i64,
    season_key: String,
    team_mode: String,
    sort_type: String,
    page: Option<i32>,
) -> Result<crate::service::leaderboard_render::CharacterLeaderboardRender, String> {
    let page = page.unwrap_or(1);
    log::info!(
        "fetch_character_leaderboard character_id={character_id} season_key={season_key:?} team_mode={team_mode:?} sort_type={sort_type:?} page={page}"
    );
    crate::service::leaderboard_render::assemble_character_leaderboard(
        character_id,
        &season_key,
        &team_mode,
        &sort_type,
        page,
    )
    .await
    .map_err(|e| log_error("fetch_character_leaderboard", "", e))
}

#[tauri::command]
pub async fn fetch_seasons() -> Result<Vec<crate::service::leaderboard_render::SeasonBrief>, String>
{
    log::info!("fetch_seasons");
    crate::service::leaderboard_render::fetch_seasons()
        .await
        .map_err(|e| log_error("fetch_seasons", "", e))
}

#[tauri::command]
pub async fn fetch_character_stats(
    matching_mode: String,
    team_mode: String,
    tier: Option<String>,
    dt: Option<i32>,
    patch: Option<String>,
) -> Result<crate::service::character_stats_render::CharacterStatsRender, String> {
    log::info!(
        "fetch_character_stats matching_mode={matching_mode} team_mode={team_mode} tier={tier:?} dt={dt:?} patch={patch:?}"
    );
    crate::service::character_stats_render::fetch_character_stats(
        &matching_mode,
        &team_mode,
        tier.as_deref(),
        dt,
        patch.as_deref(),
    )
    .await
    .map_err(|e| log_error("fetch_character_stats", "", e))
}
