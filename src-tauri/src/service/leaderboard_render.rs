use chrono::{Local, TimeZone};
use serde::Serialize;

use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::{RequestError, Result},
    models::DakGgCharacterImgType,
    types::{DakGgServerName, DakGgTeamMode},
};
use crate::service::player_render::character_url;

const LEADERBOARD_PAGE_SIZE: i32 = 100;
const CDN_BASE: &str = "https://cdn.dak.gg";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardRender {
    pub season: String,
    pub season_id: i32,
    pub server: String,
    pub team_mode: String,
    pub updated_at: String,
    pub total_count: i32,
    pub page: i32,
    pub total_page: i32,
    pub next_page: Option<i32>,
    pub has_next: bool,
    pub cutoffs: Vec<LeaderboardCutoff>,
    pub rows: Vec<LeaderboardRow>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardCutoff {
    pub tier_name: String,
    pub tier_image_url: String,
    pub mmr: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardRow {
    pub rank: i32,
    pub rank_diff: i32,
    pub user_num: i64,
    pub nickname: String,
    pub tier_image_url: String,
    pub tier_name: String,
    pub rp: i32,
    pub win_rate: String,
    pub top3_rate: String,
    pub avg_rank: String,
    pub avg_kill: String,
    pub play_count: i32,
    pub characters: Vec<LeaderboardCharacter>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardCharacter {
    pub character_name: String,
    pub image_url: String,
    pub pick_rate: String,
}

pub async fn assemble_leaderboard(
    server: DakGgServerName,
    team_mode: DakGgTeamMode,
    page: i32,
    season_id: Option<i32>,
) -> Result<LeaderboardRender> {
    let page = page.max(1);

    let (season_type, season_name, season_id_value) = if let Some(id) = season_id {
        // 获取指定赛季
        let all_seasons = EternalReturnDakGgApi::get_game_data_by_season().await?;
        let found_season = all_seasons
            .seasons
            .into_iter()
            .find(|s| s.id == id)
            .ok_or_else(|| RequestError::NotFound(format!("Season {}", id)))?;
        (found_season.key.clone(), found_season.name.clone(), found_season.id)
    } else {
        // 获取当前赛季
        let current = EternalReturnDakGgApi::get_current_season().await?;
        (current.season_type.clone(), current.name.clone(), current.id)
    };

    let response =
        EternalReturnDakGgApi::get_leaderboard(page, &season_type, server, team_mode)
            .await?;
    let characters = EternalReturnDakGgApi::get_characters().await?;
    let tiers = EternalReturnDakGgApi::get_tiers().await?;

    let rows = response
        .leaderboards
        .iter()
        .map(|player| {
            let tier = response
                .player_tier_by_user_num
                .get(&(player.user_num as i32));
            LeaderboardRow {
                rank: player.rank,
                rank_diff: player.rank_diff,
                user_num: player.user_num,
                nickname: player.nickname.clone(),
                tier_image_url: tier
                    .map(|tier| cdn_url(&tier.image_url))
                    .unwrap_or_default(),
                tier_name: tier.map(|tier| tier.name.clone()).unwrap_or_default(),
                rp: player.mmr,
                win_rate: pct(player.win_rate),
                top3_rate: pct(player.top3_rate),
                avg_rank: format!("#{:.1}", player.avg_placement),
                avg_kill: format!("{:.1}", player.avg_player_kill),
                play_count: player.play_count,
                characters: player
                    .most_characters
                    .iter()
                    .take(3)
                    .filter_map(|character| {
                        let character_info =
                            characters.get_character_by_id(character.character_id as i64)?;

                        Some(LeaderboardCharacter {
                            character_name: character_info.name.clone(),
                            image_url: character_url(
                                &characters,
                                character.character_id as i64,
                                0,
                                DakGgCharacterImgType::CharProfile,
                            ),
                            pick_rate: pct(character.pick_rate),
                        })
                    })
                    .collect(),
            }
        })
        .collect();

    let cutoffs = response
        .cutoffs
        .iter()
        .map(|cutoff| LeaderboardCutoff {
            tier_name: tiers
                .get_tier_by_id(cutoff.tier_type)
                .map(|tier| tier.name.clone())
                .unwrap_or_default(),
            tier_image_url: format!("{CDN_BASE}/er/images/tier/round/{}.png", cutoff.tier_type),
            mmr: cutoff.mmr,
        })
        .collect();

    let total_count = response.total_leader_board_count;
    let total_page = if total_count <= 0 {
        0
    } else {
        (total_count + LEADERBOARD_PAGE_SIZE - 1) / LEADERBOARD_PAGE_SIZE
    };
    let next_page = if page < total_page {
        Some(page + 1)
    } else {
        None
    };

    Ok(LeaderboardRender {
        season: season_name,
        season_id: season_id_value,
        server: server.value().to_string(),
        team_mode: team_mode.value().to_string(),
        updated_at: format_updated_at(response.updated_at),
        total_count,
        page,
        total_page,
        next_page,
        has_next: next_page.is_some(),
        cutoffs,
        rows,
    })
}

/// dak.gg tier/profile assets are returned as protocol-relative or absolute paths.
fn cdn_url(url: &str) -> String {
    if url.is_empty() {
        String::new()
    } else if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else if url.starts_with("//") {
        format!("https:{url}")
    } else {
        format!("{CDN_BASE}{url}")
    }
}

fn format_updated_at(millis: i64) -> String {
    if millis <= 0 {
        return String::new();
    }
    Local
        .timestamp_millis_opt(millis)
        .single()
        .map(|datetime| datetime.format("%Y-%m-%d %H:%M").to_string())
        .unwrap_or_default()
}

fn pct(value: f64) -> String {
    format!("{:.1}%", value * 100.0)
}

// ───────────────────────── 单英雄玩家排行 ─────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterLeaderboardRender {
    pub character_id: i64,
    pub character_key: String,
    pub character_name: String,
    pub character_image_url: String,
    pub season_key: String,
    pub team_mode: String,
    pub sort_type: String,
    pub min_match_count: i32,
    pub total_count: i32,
    pub updated_at: String,
    pub rows: Vec<CharacterLeaderboardRow>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterLeaderboardRow {
    pub rank: i32,
    pub nickname: String,
    pub tier_name: String,
    pub tier_image_url: String,
    pub rp: i32,
    pub match_count: i32,
    pub win_rate: String,
    pub top3_rate: String,
    pub avg_rank: String,
    pub avg_kill: String,
    pub avg_assist: String,
    pub avg_damage: i32,
}

const VALID_SORT_TYPES: [&str; 3] = ["MATCH_COUNT", "TIER", "WIN_RATE"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonBrief {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub is_current: bool,
}

/// 赛季列表（按 id 降序），供英雄排行的赛季选择器使用。
pub async fn fetch_seasons() -> Result<Vec<SeasonBrief>> {
    let response = EternalReturnDakGgApi::get_game_data_by_season().await?;
    let current_id = EternalReturnDakGgApi::get_current_season()
        .await
        .ok()
        .map(|season| season.id);
    let mut seasons: Vec<SeasonBrief> = response
        .seasons
        .iter()
        .map(|season| SeasonBrief {
            id: season.id,
            key: season.key.clone(),
            name: season.name.clone(),
            is_current: season.is_current || current_id == Some(season.id),
        })
        .collect();
    seasons.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(seasons)
}

pub async fn assemble_character_leaderboard(
    character_id: i64,
    season_key: &str,
    team_mode: &str,
    sort_type: &str,
    page: i32,
) -> Result<CharacterLeaderboardRender> {
    let characters = EternalReturnDakGgApi::get_characters().await?;
    let character = characters
        .get_character_by_id(character_id)
        .ok_or_else(|| RequestError::NotFound(format!("character {character_id}")))?;
    let character_key = character.key.clone();
    let character_name = character.name.clone();
    let character_image_url =
        character_url(&characters, character_id, 0, DakGgCharacterImgType::CharProfile);

    // 钴协议固定使用 NORMAL 赛季；排序类型校验后回退到 MATCH_COUNT。
    let team_mode = team_mode.to_uppercase();
    let season_key = if team_mode == "COBALT" {
        "NORMAL".to_string()
    } else {
        season_key.to_string()
    };
    let sort_type = {
        let upper = sort_type.to_uppercase();
        if VALID_SORT_TYPES.contains(&upper.as_str()) {
            upper
        } else {
            "MATCH_COUNT".to_string()
        }
    };

    let response = EternalReturnDakGgApi::get_character_leaderboard(
        &character_key,
        &season_key,
        &team_mode,
        &sort_type,
        page.max(1),
    )
    .await?;

    let rows = response
        .rankings
        .iter()
        .enumerate()
        .map(|(index, ranking)| {
            let tier = response.player_tier_by_user_num.get(&ranking.user_num);
            let pick = ranking.pick_count.max(1) as f64;
            CharacterLeaderboardRow {
                rank: (index + 1) as i32,
                nickname: ranking.nickname.clone(),
                tier_name: tier.map(|tier| tier.name.clone()).unwrap_or_default(),
                tier_image_url: tier
                    .map(|tier| cdn_url(&tier.image_url))
                    .unwrap_or_default(),
                rp: ranking.mmr,
                match_count: ranking.pick_count,
                win_rate: pct(ranking.win_count as f64 / pick),
                top3_rate: pct(ranking.top3_count as f64 / pick),
                avg_rank: format!("#{:.1}", ranking.avg_placement),
                avg_kill: format!("{:.1}", ranking.avg_player_kill),
                avg_assist: format!("{:.1}", ranking.avg_player_assistant),
                avg_damage: ranking.avg_damage_to_player.round() as i32,
            }
        })
        .collect();

    Ok(CharacterLeaderboardRender {
        character_id,
        character_key,
        character_name,
        character_image_url,
        season_key,
        team_mode,
        sort_type,
        min_match_count: response.min_match_count,
        total_count: response.total_count,
        updated_at: format_updated_at(response.created_at),
        rows,
    })
}
