use serde::Serialize;
use std::collections::HashMap;

use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::{RequestError, Result},
    models::{
        DakGgAreasResponse, DakGgCharacterImgType, DakGgCharactersResponse, DakGgItemsResponse,
        DakGgTacticalSkillResponse, DakGgTraitSkillsResponse, DakGgWeaponResponse, UserGame,
    },
    types::MatchingMode,
};
use crate::service::player_render::{
    cdn_url, character_url, game_equips, trait_skill_group_url, EquipRender, CDN_PLACEHOLDER_URL,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchDetailRender {
    pub game_id: String,
    pub mode: String,
    pub season: i32,
    pub version: String,
    pub match_size: i64,
    pub server_name: String,
    pub start_date: String,
    pub duration_sec: i64,
    pub teams: Vec<TeamRender>,
    pub kill_log: Vec<KillLogEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamRender {
    pub team_number: i64,
    pub rank: i32,
    pub total_kill: i32,
    pub premade_groups: Vec<Vec<i64>>,
    pub players: Vec<MatchPlayerRender>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchPlayerRender {
    pub user_num: i64,
    pub nickname: String,
    pub is_self: bool,
    pub premade_group_id: Option<usize>,
    pub character_name: String,
    pub character_avatar_url: String,
    pub weapon_url: String,
    pub weapon_id: i64,
    pub tactical_skill_url: String,
    pub tactical_skill_id: i64,
    pub trait_skill_url: String,
    pub trait_skill_id: i64,
    pub trait_skill_group_url: String,
    pub trait_skill_group_id: i64,
    pub level: i64,
    pub kill: i32,
    pub death: i32,
    pub assist: i32,
    pub dmg: i64,
    pub detail: MatchDetail,
    pub credit_drone: Vec<ItemRef>,
    pub credit_kiosk: Vec<ItemRef>,
    /// 该玩家最终装备（武器/防具六件）。
    pub equips: Vec<EquipRender>,
    /// 该玩家击杀的对象（被杀者）。
    pub kills: Vec<KillRef>,
    /// 击杀该玩家的对象（击杀者）。
    pub deaths: Vec<KillRef>,
    /// 死亡地区名称（placeOfDeath/2/3 解析自 areas）。
    pub death_regions: Vec<String>,
    /// 钴协议购买的灌注：id（对应 infusions API）→ 数量。
    pub bought_infusions: Vec<InfusionStack>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KillRef {
    pub user_num: i64,
    pub nickname: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfusionStack {
    pub id: i64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchDetail {
    pub dmg_taken_direct: i64,
    pub dmg_taken_item_skill: i64,
    pub dmg_taken_unique_skill: i64,
    pub heal_amount: i64,
    pub team_recover: i64,
    pub protect_absorb: i64,
    pub cc_time: f64,
    pub monster_kill: i64,
    pub extra_kill: i64,
    pub best_weapon_level: i32,
    pub mastery: Vec<MasteryRender>,
    pub skill_amp: i64,
    pub credit_sources: Vec<CreditSource>,
    pub craft_uncommon: i64,
    pub craft_rare: i64,
    pub craft_epic: i64,
    pub craft_legend: i64,
    pub bought_infusion: String,
    pub add_surveillance: i64,
    pub add_telephoto: i64,
    pub remove_surveillance: i64,
    pub remove_telephoto: i64,
    pub use_hyper_loop: i64,
    pub use_security_console: i64,
    pub used_pair_loop: i64,
    pub fishing_count: i64,
    pub emoticon_count: i64,
    pub duration: i64,
    pub survivable_time: i64,
    pub play_time: i64,
    pub watch_time: i64,
    pub deaths_phase: [i64; 3],
    pub team_down: i64,
    pub team_battle_zone_down: i64,
    pub team_repeat_down: i64,
    pub escape_state: i32,
    pub give_up: bool,
    pub left_early: bool,
    pub place_of_start: String,
    pub restricted_area_accelerated: i64,
    pub safe_areas: i64,
    pub critical_strike_damage: f64,
    pub cool_down_reduction: f64,
    pub life_steal: f64,
    pub normal_life_steal: f64,
    pub skill_life_steal: f64,
    pub amplifier_to_monster: f64,
    pub bonus_exp: i64,
    pub mmr_before: i32,
    pub mmr_gain_in_game: i64,
    pub mmr_loss_entry_cost: i64,
    pub k_factor: f64,
    pub rank_point: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MasteryRender {
    pub key: String,
    pub level: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditSource {
    pub key: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KillLogEntry {
    pub time_sec: i64,
    pub killer_user_num: Option<i64>,
    pub victim_user_num: i64,
    pub kind: String,
    pub weapon_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemRef {
    pub id: i64,
}

pub async fn assemble_match_detail(
    nickname: &str,
    season_id: i64,
    game_id: i64,
) -> Result<MatchDetailRender> {
    let response = EternalReturnDakGgApi::get_match_detail(nickname, season_id, game_id).await?;
    let user_games = response.matches;

    if user_games.is_empty() {
        return Err(RequestError::NotFound(format!(
            "Match {} not found",
            game_id
        )));
    }

    let (characters, weapons, areas, items, trait_skills, tactical_skills) = tokio::try_join!(
        EternalReturnDakGgApi::get_characters(),
        EternalReturnDakGgApi::get_weapons(),
        EternalReturnDakGgApi::get_areas(),
        EternalReturnDakGgApi::get_items(),
        EternalReturnDakGgApi::get_trait_skills(),
        EternalReturnDakGgApi::get_tactical_skills(),
    )?;

    // userNum → 昵称，用于把击杀/死亡详情里的 userNum 映射为可读昵称。
    let nick_map: HashMap<i64, String> = user_games
        .iter()
        .map(|game| (game.user_num, game.nickname.clone()))
        .collect();

    let first_game = &user_games[0];
    let mode = format_mode(first_game.matching_mode, first_game.matching_team_mode);
    let season = first_game.season_id as i32;
    let version = format!("v{}.{}", first_game.version_major, first_game.version_minor);
    let match_size = first_game.match_size;
    let server_name = first_game.server_name().to_string();
    let start_date = first_game.start_dtm.clone();
    let duration_sec = first_game.duration;

    let mut teams_map: HashMap<i64, Vec<&UserGame>> = HashMap::new();
    for game in &user_games {
        teams_map.entry(game.team_number).or_default().push(game);
    }

    let mut teams: Vec<TeamRender> = teams_map
        .into_iter()
        .map(|(team_number, players)| {
            let rank = players.first().map(|p| p.game_rank()).unwrap_or(99);
            let total_kill: i32 = players.iter().map(|p| p.player_kill).sum();
            let premade_groups = cluster_premade(&players);
            let rendered_players: Vec<MatchPlayerRender> = players
                .iter()
                .map(|p| {
                    render_player(
                        p,
                        &premade_groups,
                        nickname,
                        &characters,
                        &weapons,
                        &areas,
                        &items,
                        &trait_skills,
                        &tactical_skills,
                        &nick_map,
                    )
                })
                .collect();

            TeamRender {
                team_number,
                rank,
                total_kill,
                premade_groups,
                players: rendered_players,
            }
        })
        .collect();

    teams.sort_by_key(|t| t.rank);

    let kill_log = parse_kill_log(&user_games);

    Ok(MatchDetailRender {
        game_id: game_id.to_string(),
        mode,
        season,
        version,
        match_size,
        server_name,
        start_date,
        duration_sec,
        teams,
        kill_log,
    })
}

fn cluster_premade(players: &[&UserGame]) -> Vec<Vec<i64>> {
    let mut premade_map: HashMap<i64, Vec<i64>> = HashMap::new();

    for player in players {
        premade_map
            .entry(player.pre_made)
            .or_default()
            .push(player.user_num);
    }

    premade_map
        .into_iter()
        .filter_map(|(_, members)| {
            if members.len() > 1 {
                Some(members)
            } else {
                None
            }
        })
        .collect()
}

fn render_player(
    player: &UserGame,
    premade_groups: &[Vec<i64>],
    search_nickname: &str,
    characters: &DakGgCharactersResponse,
    weapons: &DakGgWeaponResponse,
    areas: &DakGgAreasResponse,
    items: &DakGgItemsResponse,
    trait_skills: &DakGgTraitSkillsResponse,
    tactical_skills: &DakGgTacticalSkillResponse,
    nick_map: &HashMap<i64, String>,
) -> MatchPlayerRender {
    let premade_group_id = premade_groups
        .iter()
        .position(|group| group.contains(&player.user_num));
    let is_self = player.nickname.eq_ignore_ascii_case(search_nickname);

    let matching_mode = MatchingMode::from_value(Some(player.matching_mode));
    let trait_group_url = trait_skill_group_url(matching_mode, player, trait_skills);

    let kills = parse_kill_map(&player.kill_details, nick_map);
    let deaths = parse_kill_map(&player.death_details, nick_map);
    let death_regions = [
        &player.place_of_death,
        &player.place_of_death2,
        &player.place_of_death3,
    ]
    .into_iter()
    .filter_map(|code| area_name(areas, code))
    .collect();
    let bought_infusions = parse_bought_infusion(&player.bought_infusion);

    let credit_sources: Vec<CreditSource> = player
        .credit_source
        .as_ref()
        .map(|map| {
            let mut sources: Vec<CreditSource> = map
                .iter()
                .map(|(key, &amount)| CreditSource {
                    key: key.clone(),
                    amount,
                })
                .collect();
            sources.sort_by(|a, b| {
                b.amount
                    .partial_cmp(&a.amount)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            sources
        })
        .unwrap_or_default();

    let mastery: Vec<MasteryRender> = player
        .mastery_level
        .iter()
        .map(|(key, &level)| MasteryRender {
            key: key.clone(),
            level,
        })
        .collect();

    let detail = MatchDetail {
        dmg_taken_direct: player.damage_from_player_direct,
        dmg_taken_item_skill: player.damage_from_player_item_skill,
        dmg_taken_unique_skill: player.damage_from_player_unique_skill,
        heal_amount: player.heal_amount,
        team_recover: player.team_recover,
        protect_absorb: player.protect_absorb,
        cc_time: player.cc_time_to_player,
        monster_kill: player.monster_kill,
        extra_kill: player.total_extra_kill,
        best_weapon_level: player.best_weapon_level,
        mastery,
        skill_amp: player.skill_amp,
        credit_sources,
        craft_uncommon: player.craft_uncommon,
        craft_rare: player.craft_rare,
        craft_epic: player.craft_epic,
        craft_legend: player.craft_legend,
        bought_infusion: player.bought_infusion.clone(),
        add_surveillance: player.add_surveillance_camera,
        add_telephoto: player.add_telephoto_camera,
        remove_surveillance: player.remove_surveillance_camera,
        remove_telephoto: player.remove_telephoto_camera,
        use_hyper_loop: player.use_hyper_loop,
        use_security_console: player.use_security_console,
        used_pair_loop: player.used_pair_loop,
        fishing_count: player.fishing_count,
        emoticon_count: player.use_emoticon_count,
        duration: player.duration,
        survivable_time: player.survivable_time,
        play_time: player.play_time,
        watch_time: player.watch_time,
        deaths_phase: [
            player.deaths_phase_one,
            player.deaths_phase_two,
            player.deaths_phase_three,
        ],
        team_down: player.team_down,
        team_battle_zone_down: player.team_battle_zone_down,
        team_repeat_down: player.team_repeat_down,
        escape_state: player.escape_state,
        give_up: player.give_up != 0,
        left_early: player.is_leaving_before_credit_revival_terminate,
        place_of_start: player.place_of_start.clone(),
        restricted_area_accelerated: player.restricted_area_accelerated,
        safe_areas: player.safe_areas,
        critical_strike_damage: player.critical_strike_damage,
        cool_down_reduction: player.cool_down_reduction,
        life_steal: player.life_steal,
        normal_life_steal: player.normal_life_steal,
        skill_life_steal: player.skill_life_steal,
        amplifier_to_monster: player.amplifier_to_monster,
        bonus_exp: player.bonus_exp,
        mmr_before: player.mmr_before,
        mmr_gain_in_game: player.mmr_gain_in_game,
        mmr_loss_entry_cost: player.mmr_loss_entry_cost,
        k_factor: player.gained_normal_mmr_k_factor,
        rank_point: player.rank_point,
    };

    MatchPlayerRender {
        user_num: player.user_num,
        nickname: player.nickname.clone(),
        is_self,
        premade_group_id,
        character_name: characters
            .get_character_by_id(player.character_num)
            .map(|character| character.name.clone())
            .unwrap_or_else(|| player.character_num.to_string()),
        character_avatar_url: character_url(
            characters,
            player.character_num,
            player.skin_code,
            DakGgCharacterImgType::CharProfile,
        ),
        weapon_url: weapons
            .get_weapon_by_id(player.best_weapon)
            .map(|weapon| cdn_url(&weapon.icon_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        weapon_id: player.best_weapon as i64,
        tactical_skill_url: tactical_skills
            .get_tactical_skill(player.tactical_skill_group)
            .map(|skill| cdn_url(&skill.image_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        tactical_skill_id: player.tactical_skill_group,
        trait_skill_url: trait_skills
            .get_trait_skill_by_id(player.trait_first_core)
            .map(|skill| cdn_url(&skill.image_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        trait_skill_id: player.trait_first_core,
        trait_skill_group_url: trait_group_url
            .clone()
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        trait_skill_group_id: match trait_group_url {
            Some(_) => player.trait_second_sub.first().copied().unwrap_or_default(),
            None => -1,
        },
        level: player.character_level,
        kill: player.player_kill,
        death: player.player_deaths,
        assist: player.player_assistant,
        dmg: player.damage_to_player,
        detail,
        credit_drone: player
            .item_transferred_drone
            .iter()
            .map(|&id| ItemRef { id })
            .collect(),
        credit_kiosk: player
            .item_transferred_console
            .iter()
            .map(|&id| ItemRef { id })
            .collect(),
        kills,
        deaths,
        death_regions,
        bought_infusions,
        equips: game_equips(player, items),
    }
}

/// 解析击杀/死亡详情 JSON（userNum→次数）为可读条目，按次数降序。
fn parse_kill_map(raw: &str, nick_map: &HashMap<i64, String>) -> Vec<KillRef> {
    if raw.is_empty() {
        return Vec::new();
    }
    let map = match serde_json::from_str::<HashMap<String, i32>>(raw) {
        Ok(map) => map,
        Err(_) => return Vec::new(),
    };
    let mut entries: Vec<KillRef> = map
        .into_iter()
        .filter_map(|(user_str, count)| {
            let user_num = user_str.parse::<i64>().ok()?;
            Some(KillRef {
                user_num,
                nickname: nick_map
                    .get(&user_num)
                    .cloned()
                    .unwrap_or_else(|| format!("#{user_num}")),
                count,
            })
        })
        .collect();
    entries.sort_by(|a, b| b.count.cmp(&a.count));
    entries
}

/// 地区代码（字符串）→ 地区名；空/0/无匹配返回 None。
fn area_name(areas: &DakGgAreasResponse, code: &str) -> Option<String> {
    let id = code.trim().parse::<i64>().ok()?;
    if id == 0 {
        return None;
    }
    areas.get_area_name(id).map(|name| name.to_string())
}

/// 解析 boughtInfusion JSON（灌注 id→数量）为列表，按数量降序。
fn parse_bought_infusion(raw: &str) -> Vec<InfusionStack> {
    if raw.is_empty() {
        return Vec::new();
    }
    let map = match serde_json::from_str::<HashMap<String, i64>>(raw) {
        Ok(map) => map,
        Err(_) => return Vec::new(),
    };
    let mut entries: Vec<InfusionStack> = map
        .into_iter()
        .filter_map(|(id_str, count)| {
            Some(InfusionStack {
                id: id_str.parse::<i64>().ok()?,
                count,
            })
        })
        .collect();
    entries.sort_by(|a, b| b.count.cmp(&a.count));
    entries
}

fn parse_kill_log(user_games: &[UserGame]) -> Vec<KillLogEntry> {
    let mut entries = Vec::new();

    for game in user_games {
        if game.kill_details.is_empty() {
            continue;
        }

        match serde_json::from_str::<HashMap<String, i32>>(&game.kill_details) {
            Ok(kills) => {
                for (victim_str, _count) in kills {
                    if let Ok(victim_num) = victim_str.parse::<i64>() {
                        entries.push(KillLogEntry {
                            time_sec: 0,
                            killer_user_num: Some(game.user_num),
                            victim_user_num: victim_num,
                            kind: "player".to_string(),
                            weapon_name: None,
                        });
                    }
                }
            }
            Err(e) => {
                log::warn!(
                    "Failed to parse kill_details for user {}: {}",
                    game.user_num,
                    e
                );
            }
        }
    }

    entries
}

fn format_mode(matching_mode: i32, matching_team_mode: i64) -> String {
    let mode_name = match matching_mode {
        0 => "全部",
        1 => "普通",
        2 => "排位",
        3 => "钴蓝协议",
        _ => "未知",
    };

    let team_name = match matching_team_mode {
        1 => "单排",
        2 => "双排",
        3 => "三排",
        _ => "",
    };

    if team_name.is_empty() {
        mode_name.to_string()
    } else {
        format!("{} · {}", mode_name, team_name)
    }
}
