use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::Result,
    types::{DakGgRank, DakGgTeamMode, MatchingMode},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterStatsItem {
    pub character_id: i64,
    pub character_name: String,
    pub character_image_url: String,
    pub character_tier: String,
    pub character_tier_score: f64,
    pub weapon_id: i32,
    pub weapon_name: String,
    pub weapon_image_url: String,
    pub match_count: i32,
    pub avg_rp: f64,
    pub avg_damage: f64,
    pub avg_sight: f64,
    pub win_rate: f64,
    pub top3_rate: f64,
    pub avg_team_kill: f64,
    pub avg_player_kill: f64,
    pub pick_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterStatsRender {
    pub items: Vec<CharacterStatsItem>,
    pub updated_at: String,
    pub matching_mode: String,
    pub team_mode: String,
    pub tier: Option<String>,
    pub patch: Option<String>,
    pub dt: i32,
}

pub async fn fetch_character_stats(
    matching_mode: &str,
    team_mode: &str,
    tier: Option<&str>,
    dt: Option<i32>,
    patch: Option<&str>,
) -> Result<CharacterStatsRender> {
    let matching_mode_enum = match matching_mode {
        "RANK" => MatchingMode::Rank,
        "COBALT" => MatchingMode::Cobalt,
        _ => MatchingMode::Rank,
    };

    let team_mode_enum = match team_mode {
        "SQUAD" => DakGgTeamMode::Squad,
        "COBALT" => DakGgTeamMode::Cobalt,
        _ => DakGgTeamMode::Squad,
    };

    let tier_enum = tier.and_then(|t| match t {
        "in1000" => Some(DakGgRank::In1000),
        "diamond_plus" => Some(DakGgRank::DiamondPlus),
        "mithril_plus" => Some(DakGgRank::MithrilPlus),
        "meteorite_plus" => Some(DakGgRank::MeteoritePlus),
        "platinum_plus" => Some(DakGgRank::PlatinumPlus),
        "gold" => Some(DakGgRank::Gold),
        "silver" => Some(DakGgRank::Silver),
        "bronze" => Some(DakGgRank::Bronze),
        "iron" => Some(DakGgRank::Iron),
        _ => None,
    });

    let response = EternalReturnDakGgApi::get_character_stats(
        team_mode_enum,
        matching_mode_enum,
        tier_enum,
        dt,
        patch,
    )
    .await?;

    let snapshot = response.character_stat_snapshot;
    let characters_resp = EternalReturnDakGgApi::get_characters().await?;
    let weapons_resp = EternalReturnDakGgApi::get_weapons().await?;

    let mut items = Vec::new();
    let total_count: i32 = snapshot.character_stats.iter().map(|cs| cs.count).sum();

    for character_stat in snapshot.character_stats {
        let character = characters_resp
            .characters
            .iter()
            .find(|c| c.id == character_stat.key as i64);

        if let Some(character) = character {
            for weapon_stat in character_stat.weapon_stats {
                let weapon = weapons_resp.masteries.iter().find(|w| w.id == weapon_stat.key);

                if let Some(weapon) = weapon {
                    let match_count = weapon_stat.count;
                    if match_count == 0 {
                        continue;
                    }

                    let win_rate = (weapon_stat.win as f64 / match_count as f64) * 100.0;
                    let top3_rate = (weapon_stat.top3 as f64 / match_count as f64) * 100.0;
                    let avg_rp = weapon_stat.mmr_gain as f64 / match_count as f64;
                    let avg_damage =
                        weapon_stat.damage_to_player as f64 / match_count as f64;
                    let avg_sight =
                        weapon_stat.view_contribution as f64 / match_count as f64;
                    let avg_team_kill = weapon_stat.team_kill as f64 / match_count as f64;
                    let avg_player_kill =
                        weapon_stat.player_kill as f64 / match_count as f64;
                    let pick_rate = if total_count > 0 {
                        (character_stat.count as f64 / total_count as f64) * 100.0
                    } else {
                        0.0
                    };

                    items.push(CharacterStatsItem {
                        character_id: character.id,
                        character_name: character.name.clone(),
                        character_image_url: character.image_url.clone(),
                        character_tier: weapon_stat.tier.clone(),
                        character_tier_score: weapon_stat.tier_score.unwrap_or(0.0),
                        weapon_id: weapon.id,
                        weapon_name: weapon.name.clone(),
                        weapon_image_url: weapon.icon_url.clone(),
                        match_count,
                        avg_rp,
                        avg_damage,
                        avg_sight,
                        win_rate,
                        top3_rate,
                        avg_team_kill,
                        avg_player_kill,
                        pick_rate,
                    });
                }
            }
        }
    }

    // 按 tier_score 降序排序
    items.sort_by(|a, b| {
        b.character_tier_score
            .partial_cmp(&a.character_tier_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let patch_str = if snapshot.patch > 0 {
        Some(snapshot.patch.to_string())
    } else {
        None
    };

    Ok(CharacterStatsRender {
        items,
        updated_at: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
        matching_mode: matching_mode.to_string(),
        team_mode: team_mode.to_string(),
        tier: tier.map(|s| s.to_string()),
        patch: patch_str,
        dt: snapshot.dt,
    })
}
