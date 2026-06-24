use std::{cmp::Ordering, collections::HashMap};

use chrono::{DateTime, Datelike, Duration, FixedOffset, Local, Timelike};
use serde::Serialize;

use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::{RequestError, Result},
    models::*,
    types::{DakGgTeamMode, MatchingMode},
};

pub(crate) const CDN_PLACEHOLDER_URL: &str =
    "https://cdn.dak.gg/er/images/common/img-placeholder-wilson-round.png";
const MATCHES_PAGE_SIZE: i32 = 20;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSearchRender {
    pub mmr_stats: Option<PlayerMmrStats>,
    pub nickname: String,
    pub profile_image_url: String,
    pub level: i32,
    pub data: PlayerData,
    pub matches: Vec<PlayerMatchData>,
    pub recent_players: Vec<PlayerRecentPlay>,
    pub character_use_stats: Vec<CharacterUseStats>,
    pub season: String,
    pub season_id: i32,
    pub mode: String,
    pub summary: Option<PlayerSummary>,
    pub page: i32,
    pub total_page: i32,
    pub next_page: Option<i32>,
    pub has_next: bool,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerData {
    pub tier_image_url: String,
    pub rp_name: String,
    pub rp: String,
    pub play: i32,
    pub avg_tk: String,
    pub avg_kill: String,
    pub avg_rank: String,
    pub avg_dmg: String,
    pub avg_assists: String,
    pub top1: String,
    pub top2: String,
    pub top3: String,
    pub avg_animal: String,
    pub avg_credit: String,
    pub avg_vision: String,
    pub kda: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMmrStats {
    pub dates: Vec<String>,
    pub values: Vec<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerRecentPlay {
    pub image_url: String,
    pub plays: i32,
    pub nickname: String,
    pub win_rate: String,
    pub avg_rank: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterUseStats {
    pub character_name: String,
    pub image_url: String,
    pub win_rate: String,
    pub character_play: i32,
    pub get_rp: i32,
    pub avg_rank: String,
    pub avg_dmg: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSummary {
    pub count: usize,
    pub avg_rank: String,
    pub wins: String,
    pub avg_tk: String,
    pub ranks: Vec<i32>,
    pub avg_dmg: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMatchData {
    pub level: i32,
    pub rp: i32,
    pub rp_change: i32,
    pub server_name: String,
    pub nickname: String,
    pub character_name: String,
    pub rank: i32,
    pub type_name: String,
    pub mode_id: i32,
    pub kill: i32,
    pub tk: i32,
    pub assist: i32,
    pub equips: Vec<EquipRender>,
    pub weapon_url: String,
    pub weapon_id: i64,
    pub tactical_skill_url: String,
    pub tactical_skill_id: i64,
    pub trait_skill_url: String,
    pub trait_skill_id: i64,
    pub trait_skill_group_url: String,
    pub trait_skill_group_id: i64,
    pub character_avatar_url: String,
    pub date_hour: String,
    pub date_month: String,
    pub game_id: String,
    pub dmg: i64,
    pub kda: f64,
    pub route_id: String,
    pub version: String,
    pub ranked: bool,
    pub detail: MatchDetailRender,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipRender {
    pub item_id: i64,
    pub item_bg_url: String,
    pub item_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchDetailRender {
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

pub async fn assemble_player_search(
    nickname: &str,
    mode: MatchingMode,
    page: i32,
) -> Result<PlayerSearchRender> {
    let page = page.max(1);
    let matches_mode = mode;
    let profile_mode = if mode == MatchingMode::All {
        MatchingMode::Rank
    } else {
        mode
    };
    let team_mode = DakGgTeamMode::All;

    // 并发获取所有需要的数据
    let (
        profile,
        current_season,
        matches_response,
        characters,
        tiers,
        items,
        weapons,
        trait_skills,
        tactical_skills,
    ) = tokio::try_join!(
        EternalReturnDakGgApi::get_profile(nickname),
        EternalReturnDakGgApi::get_current_season(),
        EternalReturnDakGgApi::get_game(nickname, None, matches_mode, team_mode, page),
        EternalReturnDakGgApi::get_characters(),
        EternalReturnDakGgApi::get_tiers(),
        EternalReturnDakGgApi::get_items(),
        EternalReturnDakGgApi::get_weapons(),
        EternalReturnDakGgApi::get_trait_skills(),
        EternalReturnDakGgApi::get_tactical_skills(),
    )?;

    // 解构数据
    let games = matches_response.matches;
    let meta = matches_response.meta;

    // 数据转换逻辑
    let season_overviews = &profile.player_season_overviews;
    let season_overview = season_overviews
        .iter()
        .find(|overview| overview.matching_mode_id == profile_mode.value())
        .or_else(|| season_overviews.first());

    let profile_image_url = profile_image_url(season_overview, season_overviews, &characters);
    let recent_players = recent_players(season_overviews, &characters, profile_mode);
    let data = player_data_convert(
        season_overview,
        &profile.player_seasons,
        &tiers,
        profile_mode,
    )?;
    let mmr_stats = player_mmr_stats(season_overview);
    let character_use_stats = character_use_stats(season_overviews, &characters, profile_mode);
    let summary = player_summary(season_overviews);
    let matches = games
        .iter()
        .map(|game| {
            game_convert_match(
                game,
                &characters,
                &items,
                &weapons,
                &trait_skills,
                &tactical_skills,
            )
        })
        .collect();
    let current_page = if meta.page > 0 { meta.page } else { page };
    let total_page = if meta.count <= 0 {
        0
    } else {
        (meta.count + MATCHES_PAGE_SIZE - 1) / MATCHES_PAGE_SIZE
    };
    let next_page = if current_page < total_page {
        Some(current_page + 1)
    } else {
        None
    };

    Ok(PlayerSearchRender {
        mmr_stats,
        nickname: nickname.to_string(),
        profile_image_url,
        level: profile.player.account_level,
        data,
        matches,
        recent_players,
        character_use_stats,
        season: current_season.name,
        season_id: current_season.id,
        mode: matching_mode_name(profile_mode).to_string(),
        summary,
        page: current_page,
        total_page,
        next_page,
        has_next: next_page.is_some(),
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerOverviewRender {
    pub level: i32,
    pub total_play: i32,
    pub characters: Vec<CharacterUseStats>,
}

/// 轻量版玩家档案：只取等级 + 常用英雄使用率（不拉对局/装备），用于 Overlay 一次性查询多名玩家。
pub async fn assemble_player_overview(
    nickname: &str,
    mode: MatchingMode,
) -> Result<PlayerOverviewRender> {
    let profile_mode = if mode == MatchingMode::All {
        MatchingMode::Rank
    } else {
        mode
    };

    let profile = EternalReturnDakGgApi::get_profile(nickname).await?;
    let characters = EternalReturnDakGgApi::get_characters().await?;

    let season_overviews = &profile.player_season_overviews;
    let total_play = season_overviews
        .iter()
        .find(|overview| overview.matching_mode_id == profile_mode.value())
        .map(|overview| overview.play)
        .unwrap_or(0);
    let character_use_stats = character_use_stats(season_overviews, &characters, profile_mode);

    Ok(PlayerOverviewRender {
        level: profile.player.account_level,
        total_play,
        characters: character_use_stats,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfileRender {
    pub level: i32,
    pub total_play: i32,
    pub characters: Vec<CharacterUseStats>,
    pub summary: Option<PlayerSummary>,
    pub tier_image_url: Option<String>,
    pub tier_name: Option<String>,
}

/// 完整玩家档案：包含等级、常用英雄、段位、近期统计（仅 profile 数据，不拉取战绩列表）
pub async fn assemble_player_profile(
    nickname: &str,
    mode: MatchingMode,
) -> Result<PlayerProfileRender> {
    let profile_mode = if mode == MatchingMode::All {
        MatchingMode::Rank
    } else {
        mode
    };

    let profile = EternalReturnDakGgApi::get_profile(nickname).await?;
    let characters = EternalReturnDakGgApi::get_characters().await?;
    let tiers = EternalReturnDakGgApi::get_tiers().await?;

    let season_overviews = &profile.player_season_overviews;

    // 找到对应模式的 overview，如果没有数据则fallback到匹配模式
    let mode_overview = season_overviews
        .iter()
        .find(|overview| overview.matching_mode_id == profile_mode.value())
        .filter(|overview| overview.play > 0);

    let fallback_overview = if mode_overview.is_none() && profile_mode == MatchingMode::Rank {
        season_overviews
            .iter()
            .find(|overview| overview.matching_mode_id == MatchingMode::Normal.value())
    } else {
        None
    };

    let active_overview = mode_overview.or(fallback_overview);

    let total_play = active_overview.map(|o| o.play).unwrap_or(0);
    let character_use_stats = character_use_stats(
        season_overviews,
        &characters,
        if mode_overview.is_some() {
            profile_mode
        } else {
            MatchingMode::Normal
        },
    );

    // 获取段位信息（从 player_seasons 中获取 tier_id，然后匹配 tiers）
    let (tier_image_url, tier_name) = profile
        .player_seasons
        .first()
        .and_then(|player_season| {
            tiers
                .get_tier_by_id(player_season.tier_id)
                .or_else(|| tiers.get_unrank())
                .map(|t| (Some(t.icon_url.clone()), Some(t.name.clone())))
        })
        .unwrap_or((None, None));

    // 获取近期战绩总览（从 recent_matches）
    let summary = active_overview.and_then(|overview| {
        let recent_matches = &overview.recent_matches;
        if recent_matches.is_empty() {
            return None;
        }

        let count = recent_matches.len();
        let count_f64 = count as f64;
        let ranks = recent_matches
            .iter()
            .map(|m| m.game_rank())
            .collect::<Vec<_>>();

        Some(PlayerSummary {
            count,
            avg_rank: fmt1(ranks.iter().map(|r| *r as f64).sum::<f64>() / count_f64),
            wins: ranks.iter().filter(|r| **r == 1).count().to_string(),
            avg_tk: fmt1(
                recent_matches
                    .iter()
                    .map(|m| m.team_kill as f64)
                    .sum::<f64>()
                    / count_f64,
            ),
            ranks,
            avg_dmg: format!(
                "{:.0}",
                recent_matches
                    .iter()
                    .map(|m| m.damage_to_player as f64)
                    .sum::<f64>()
                    / count_f64
            ),
        })
    });

    Ok(PlayerProfileRender {
        level: profile.player.account_level,
        total_play,
        characters: character_use_stats,
        summary,
        tier_image_url,
        tier_name,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterBrief {
    pub id: i64,
    pub name: String,
    pub image_url: String,
    /// 职能（去掉 "None"），用于按职能分组。
    pub roles: Vec<String>,
}

/// 全角色的 id→名称/头像列表，供 Overlay 把 GameSnapshot 里的 character_id 解析成已选英雄。
pub async fn fetch_character_briefs() -> Result<Vec<CharacterBrief>> {
    let characters = EternalReturnDakGgApi::get_characters().await?;
    Ok(characters
        .characters
        .iter()
        .map(|character| CharacterBrief {
            id: character.id,
            name: character.name.clone(),
            image_url: character_url(
                &characters,
                character.id,
                0,
                DakGgCharacterImgType::CharProfile,
            ),
            roles: character
                .char_arche_types
                .iter()
                .filter(|role| !role.is_empty() && role.as_str() != "None")
                .cloned()
                .collect(),
        })
        .collect())
}

/// 通用参考项（物品/战术/天赋/武器）：id + 名称 + 说明 + 图标，供前端悬浮提示按 id 查询。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefEntry {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRef {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub image_url: String,
    pub character_id: i64,
    pub slot: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameReference {
    pub items: Vec<RefEntry>,
    pub skills: Vec<SkillRef>,
    pub tactical_skills: Vec<RefEntry>,
    pub trait_skills: Vec<RefEntry>,
    pub weapons: Vec<RefEntry>,
    /// 钴协议灌注：id（boughtInfusion 的 key）→ 名称/图标。
    pub infusions: Vec<InfusionRef>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfusionRef {
    pub id: i64,
    pub product_type: String,
    pub name: String,
    pub image_url: String,
    pub tooltip: String,
}

/// 一次性返回 4 类参考数据（再加武器精通），供前端构建 id→详情 映射做悬浮提示。
pub async fn fetch_game_reference() -> Result<GameReference> {
    let (items, skills, tacticals, traits, weapons, infusions) = tokio::try_join!(
        EternalReturnDakGgApi::get_items(),
        EternalReturnDakGgApi::get_skills(),
        EternalReturnDakGgApi::get_tactical_skills(),
        EternalReturnDakGgApi::get_trait_skills(),
        EternalReturnDakGgApi::get_weapons(),
        EternalReturnDakGgApi::get_infusions(),
    )?;

    Ok(GameReference {
        items: items
            .items
            .iter()
            .map(|i| RefEntry {
                id: i.id,
                name: i.name.clone(),
                tooltip: i.tooltip.clone(),
                image_url: cdn_url(&i.image_url),
            })
            .collect(),
        skills: skills
            .skills
            .iter()
            .map(|s| SkillRef {
                id: s.id,
                name: s.name.clone(),
                tooltip: s.tooltip.clone(),
                image_url: cdn_url(&s.image_url),
                character_id: s.character_id,
                slot: s.slot.clone(),
            })
            .collect(),
        tactical_skills: tacticals
            .tactical_skills
            .iter()
            .map(|t| RefEntry {
                id: t.id,
                name: t.name.clone(),
                tooltip: t.tooltip.clone(),
                image_url: cdn_url(&t.image_url),
            })
            .collect(),
        trait_skills: traits
            .trait_skills
            .iter()
            .map(|t| RefEntry {
                id: t.id,
                name: t.name.clone(),
                tooltip: t.tooltip.clone(),
                image_url: cdn_url(&t.image_url),
            })
            .collect(),
        weapons: weapons
            .masteries
            .iter()
            .map(|w| RefEntry {
                id: w.id as i64,
                name: w.name.clone(),
                tooltip: String::new(),
                image_url: cdn_url(&w.icon_url),
            })
            .collect(),
        infusions: infusions
            .infusions
            .iter()
            .map(|infusion| {
                let (name, image_url,tooltip) = match infusion.product_type.as_str() {
                    "EquipItemSelector" => {
                        ("装备选择器".to_string(), CDN_PLACEHOLDER_URL.to_string(),"上古时代的宝贝开始选择啦".to_string())
                    }
                    "EquipItemMythicSelector" => (
                        "神话装备选择器".to_string(),
                        CDN_PLACEHOLDER_URL.to_string(),
                        "上古时代的宝贝开始选择啦".to_string()
                    ),
                    _ => resolve_infusion_product(infusion.product_id, &traits, &items, &tacticals),
                };
                InfusionRef {
                    id: infusion.id,
                    product_type: infusion.product_type.clone(),
                    name,
                    image_url,
                    tooltip,
                }
            })
            .collect(),
    })
}

/// 角色详情（来自 dak.gg 角色页的 character_analysis），供 Characters 页展示。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterDetailRender {
    pub id: i64,
    pub name: String,
    pub title: String,
    pub image_url: String,
    pub archetypes: Vec<String>,
    pub weapon_types: Vec<String>,
    pub stats: Vec<CharacterStatRow>,
    pub skins: Vec<CharacterSkinRender>,
    /// 该角色的对局统计分析；页面无统计数据时为 None。
    pub analysis: Option<CharacterAnalysisRender>,
}

/// 一行属性：基础值 + 每级成长。attackSpeed/moveSpeed 无成长，perLevel 记 0。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterStatRow {
    pub label: String,
    pub base: f64,
    pub per_level: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterSkinRender {
    pub id: i64,
    pub name: String,
    pub grade: i64,
    pub image_url: String,
}

/// 角色对局统计（characterDetailStatSnapshot 等字段整形后的结果）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterAnalysisRender {
    pub patch: i64,
    /// 统计档位（如 "diamond_plus"）。
    pub tier: String,
    pub matching_mode: i64,
    pub team_mode: i64,
    pub updated_at: i64,
    /// 该档位 dt 天内总对局数（tierGameCount）。
    pub total_games: i64,
    /// 该角色对局数（characterDetailStat.count）。
    pub character_games: i64,
    /// 角色登场率 = character_games / total_games。
    pub pick_rate: f64,
    /// 角色梯度字母（取登场最高武器的 tier）。
    pub character_tier: String,
    pub patches: Vec<i64>,
    pub max_skill_rank: SkillRankRender,
    /// 各武器流派（按登场降序，首个为主流派）。
    pub weapons: Vec<WeaponBuildRender>,
    pub top_players: Vec<TopPlayerRender>,
    pub routes: Vec<WeaponRouteRender>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SkillRankRender {
    pub q: i64,
    pub w: i64,
    pub e: i64,
    pub r: i64,
    pub t: i64,
}

/// 单武器流派：概览统计 + 加点/出装/战术/强化。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeaponBuildRender {
    pub weapon: String,
    pub icon_url: String,
    /// 武器梯度字母（S/A/B/…）。
    pub tier: String,
    pub tier_score: f64,
    pub games: i64,
    pub pick_rate: f64,
    pub win_rate: f64,
    pub top3_rate: f64,
    pub avg_rank: f64,
    pub avg_kills: f64,
    pub avg_mmr_gain: f64,
    /// 登场数在全角色武器中的名次（rank.count / rank.size）。
    pub rank: i64,
    pub rank_size: i64,
    /// 该角色五个技能槽的图鉴（Q/W/E/R/T）。
    pub skills: Vec<SkillSlotRender>,
    /// 加点优先顺序 top 3。
    pub skill_builds: Vec<SkillBuildRender>,
    /// 最终整套出装（按登场降序）。
    pub item_builds: Vec<ItemBuildRender>,
    /// 战术技能 top 3。
    pub tacticals: Vec<PickRender>,
    /// 强化（核心 + 子强化）top。
    pub augments: Vec<AugmentRender>,
    /// 钴协议灌注选择率 top（普通/排位为空）。
    pub infusions: Vec<PickRender>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSlotRender {
    pub id: i64,
    pub slot: String,
    pub name: String,
    pub icon_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillBuildRender {
    /// 加点优先顺序的技能槽序列，如 ["T","E","W","Q"]。
    pub priority: Vec<String>,
    pub order: Vec<String>,
    pub pick_rate: f64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemBuildRender {
    /// 整套装备（[武器,胸甲,头部,手臂,腿部]）。
    pub items: Vec<PickRender>,
    pub order: Vec<PickRender>,
    pub pick_rate: f64,
    pub win_rate: f64,
}

/// 物品/战术/强化通用：名称、图标、占比、胜率。bgUrl 仅物品有。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickRender {
    /// 实体 id（物品/战术/天赋），供前端查悬浮说明。
    pub id: i64,
    pub name: String,
    pub icon_url: String,
    pub bg_url: String,
    pub pick_rate: f64,
    pub win_rate: f64,
    pub tooltip: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AugmentRender {
    pub core: PickRender,
    pub subs: Vec<PickRender>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopPlayerRender {
    pub name: String,
    pub mmr: i64,
    pub tier_name: String,
    pub tier_icon_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeaponRouteRender {
    pub id: i64,
    pub title: String,
    pub author: String,
    pub weapon: String,
    pub win_rate: f64,
    pub likes: i64,
}

const TOP_PLAYER_LIMIT: usize = 10;
const ROUTE_LIMIT: usize = 10;
const SKILL_BUILD_LIMIT: usize = 3;
const ITEM_BUILD_LIMIT: usize = 10;
const TACTICAL_LIMIT: usize = 3;
const AUGMENT_CORE_LIMIT: usize = 3;
const AUGMENT_SUB_LIMIT: usize = 6;
const INFUSION_LIMIT: usize = 12;
/// 技能槽展示顺序。
const SKILL_SLOTS: [&str; 5] = ["Q", "W", "E", "R", "T"];

/// 按角色 id 查询 dak.gg 角色分析数据：先用 get_characters 把 id 解析成 key，再抓详情页并整形。
/// team_mode/matching_mode 缺省为 SQUAD/RANK；tier 仅排位有意义（普通/钴协议忽略）。
pub async fn fetch_character_analysis(
    character_id: i64,
    team_mode: Option<String>,
    matching_mode: Option<String>,
    tier: Option<String>,
) -> Result<CharacterDetailRender> {
    let team_mode = team_mode.unwrap_or_else(|| "SQUAD".to_string());
    let matching_mode = matching_mode.unwrap_or_else(|| "RANK".to_string());

    let characters = EternalReturnDakGgApi::get_characters().await?;
    let character = characters
        .get_character_by_id(character_id)
        .ok_or_else(|| RequestError::NotFound(format!("character id {character_id}")))?;
    let key = character.key.clone();
    // 中文名取自 characters（?hl=zh_CN），而非角色页（可能英文）。
    let chinese_name = character.name.clone();

    let (analysis, weapons, tiers, items, tacticals, traits, skills) = tokio::try_join!(
        EternalReturnDakGgApi::character_analysis(
            &key,
            &team_mode,
            &matching_mode,
            tier.as_deref()
        ),
        EternalReturnDakGgApi::get_weapons(),
        EternalReturnDakGgApi::get_tiers(),
        EternalReturnDakGgApi::get_items(),
        EternalReturnDakGgApi::get_tactical_skills(),
        EternalReturnDakGgApi::get_trait_skills(),
        EternalReturnDakGgApi::get_skills(),
    )?;

    let image_url = character_url(
        &characters,
        character_id,
        0,
        DakGgCharacterImgType::CharResult,
    );
    let page = analysis.props.page_props;

    let refs = AnalysisRefs {
        character_id,
        weapons: &weapons,
        tiers: &tiers,
        items: &items,
        tacticals: &tacticals,
        traits: &traits,
        skills: &skills,
    };
    // 统计数据藏在 dehydratedState 的某个 query 里，按 snapshot 是否存在来定位。
    let analysis_render = page
        .dehydrated_state
        .queries
        .iter()
        .map(|query| &query.state.data)
        .find(|data| data.character_detail_stat_snapshot.is_some())
        .map(|data| build_character_analysis(data, &refs));

    let detail = page.character;
    let level = &detail.level_up_stat;
    let stats = vec![
        stat_row("生命值", detail.max_hp as f64, level.max_hp as f64),
        stat_row("攻击力", detail.attack_power as f64, level.attack_power),
        stat_row("防御力", detail.defense as f64, level.defense),
        stat_row("生命回复", detail.hp_regen, level.hp_regen),
        stat_row("攻击速度", detail.attack_speed, 0.0),
        stat_row("移动速度", detail.move_speed, 0.0),
    ];

    Ok(CharacterDetailRender {
        id: detail.id,
        name: chinese_name,
        title: page.character_title,
        image_url,
        archetypes: detail.char_arche_types,
        weapon_types: detail.weapon_types.into_iter().map(|w| w.key).collect(),
        stats,
        skins: detail
            .skins
            .into_iter()
            .map(|skin| CharacterSkinRender {
                id: skin.id,
                name: skin.name,
                grade: skin.grade,
                image_url: cdn_url(&skin.image_url),
            })
            .collect(),
        analysis: analysis_render,
    })
}

/// 整形角色分析所需的全部参考数据。
struct AnalysisRefs<'a> {
    character_id: i64,
    weapons: &'a DakGgWeaponResponse,
    tiers: &'a DakGgTiersResponse,
    items: &'a DakGgItemsResponse,
    tacticals: &'a DakGgTacticalSkillResponse,
    traits: &'a DakGgTraitSkillsResponse,
    skills: &'a DakGgSkillsResponse,
}

fn build_character_analysis(data: &Data, refs: &AnalysisRefs) -> CharacterAnalysisRender {
    let snapshot = data
        .character_detail_stat_snapshot
        .as_ref()
        .expect("snapshot presence checked by caller");
    let stat = &snapshot.character_detail_stat;
    let total_games = snapshot.tier_game_count;

    let mut weapons_render: Vec<WeaponBuildRender> = stat
        .weapon_stats
        .iter()
        .map(|weapon| build_weapon(weapon, total_games, refs))
        .collect();
    weapons_render.sort_by(|a, b| b.games.cmp(&a.games));
    let character_tier = weapons_render
        .first()
        .map(|w| w.tier.clone())
        .unwrap_or_default();

    // players + playerTiers 按 userNum 关联，按 mmr 降序取前若干名。
    let mut top_players: Vec<TopPlayerRender> = data
        .player_tiers
        .iter()
        .map(|player_tier| {
            let name = data
                .players
                .iter()
                .find(|p| p.user_num == player_tier.user_num)
                .map(|p| p.name.clone())
                .unwrap_or_default();
            let tier = refs.tiers.get_tier_by_id(player_tier.tier_id);
            TopPlayerRender {
                name,
                mmr: player_tier.mmr,
                tier_name: tier.map(|t| t.name.clone()).unwrap_or_default(),
                tier_icon_url: tier
                    .map(|t| cdn_url(&t.icon_url))
                    .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
            }
        })
        .collect();
    top_players.sort_by(|a, b| b.mmr.cmp(&a.mmr));
    top_players.truncate(TOP_PLAYER_LIMIT);

    let mut routes: Vec<WeaponRouteRender> = data
        .weapon_routes
        .iter()
        .map(|route| WeaponRouteRender {
            id: route.id,
            title: route.title.clone(),
            author: route.user_nickname.clone(),
            weapon: weapon_name(refs.weapons, route.weapon_type),
            win_rate: route.v2_win_rate,
            likes: route.v2_like,
        })
        .collect();
    routes.sort_by(|a, b| b.likes.cmp(&a.likes));
    routes.truncate(ROUTE_LIMIT);

    let skill = data.max_skill_rank_by_slot.clone().unwrap_or_default();

    CharacterAnalysisRender {
        patch: snapshot.patch,
        tier: snapshot.tier.clone(),
        matching_mode: snapshot.matching_mode,
        team_mode: snapshot.team_mode,
        updated_at: data.meta.as_ref().map(|m| m.updated_at).unwrap_or_default(),
        total_games,
        character_games: stat.count,
        pick_rate: rate(stat.count, total_games),
        character_tier,
        patches: data.patches.clone(),
        max_skill_rank: SkillRankRender {
            q: skill.q,
            w: skill.w,
            e: skill.e,
            r: skill.r,
            t: skill.t,
        },
        weapons: weapons_render,
        top_players,
        routes,
    }
}

fn build_weapon(
    weapon: &crate::request::models::WeaponStat,
    total_games: i64,
    refs: &AnalysisRefs,
) -> WeaponBuildRender {
    let count = weapon.count as i64;
    let rank = weapon.rank.clone().unwrap_or_default();

    // 五个技能槽图鉴。
    let skills = SKILL_SLOTS
        .iter()
        .filter_map(|slot| refs.skills.get_skill(refs.character_id, slot))
        .map(|skill| SkillSlotRender {
            id: skill.id,
            slot: skill.slot.clone(),
            name: skill.name.clone(),
            icon_url: cdn_url(&skill.image_url),
        })
        .collect();

    // 加点优先 top 3。
    let mut skill_builds: Vec<&crate::request::models::SkillBuildStat> =
        weapon.skill_build_stats.iter().collect();
    skill_builds.sort_by(|a, b| b.count.cmp(&a.count));
    let skill_builds = skill_builds
        .into_iter()
        .take(SKILL_BUILD_LIMIT)
        .map(|build| SkillBuildRender {
            priority: build.key.chars().map(|c| c.to_string()).collect(),
            order: build
                .order_stats
                .iter()
                .max_by_key(|order| order.count)
                .map(|order| order.key.chars().map(|c| c.to_string()).collect())
                .unwrap_or_default(),
            pick_rate: rate(build.count, count),
            win_rate: rate(build.win, build.count),
        })
        .collect();

    // 最终整套出装，按登场降序取 top 10；每件物品用 get_items 配图标/品级背景。
    let mut build_stats: Vec<&crate::request::models::ItemBuildStat> =
        weapon.item_build_stats.iter().collect();
    build_stats.sort_by(|a, b| b.count.cmp(&a.count));
    let item_builds = build_stats
        .into_iter()
        .take(ITEM_BUILD_LIMIT)
        .map(|build| {
            let items: Vec<PickRender> = build
                .key
                .iter()
                .map(|&item_id| {
                    let item = refs.items.get_item_by_id(item_id);
                    PickRender {
                        id: item_id,
                        name: item.map(|i| i.name.clone()).unwrap_or_default(),
                        icon_url: item
                            .map(|i| cdn_url(&i.image_url))
                            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
                        bg_url: item_bg_url(item.map(|i| item_grade_num(&i.grade)).unwrap_or(0)),
                        pick_rate: 0.0,
                        win_rate: 0.0,
                        tooltip: item.map(|i| i.tooltip.clone()).unwrap_or_default(),
                    }
                })
                .collect();
            let order = build
                .order_stats
                .iter()
                .max_by_key(|order| order.count)
                .map(|order| reorder_item_build(&items, &order.key))
                .unwrap_or_default();

            ItemBuildRender {
                items,
                order,
                pick_rate: rate(build.count, count),
                win_rate: rate(build.win, build.count),
            }
        })
        .collect();

    // 战术技能 top 3。
    let mut tactical_stats: Vec<&crate::request::models::TacticalSkillStat> =
        weapon.tactical_skill_stats.iter().collect();
    tactical_stats.sort_by(|a, b| b.count.cmp(&a.count));
    let tacticals = tactical_stats
        .into_iter()
        .take(TACTICAL_LIMIT)
        .map(|tactical| {
            let skill = refs.tacticals.get_tactical_skill(tactical.key);
            PickRender {
                id: tactical.key,
                name: skill.map(|s| s.name.clone()).unwrap_or_default(),
                icon_url: skill
                    .map(|s| cdn_url(&s.image_url))
                    .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
                bg_url: String::new(),
                pick_rate: rate(tactical.count, count),
                win_rate: rate(tactical.win, tactical.count),
                tooltip: skill.map(|s| s.tooltip.clone()).unwrap_or_default(),
            }
        })
        .collect();

    // 强化：核心 top 3，每核心带 top 6 子强化。
    let mut core_stats: Vec<&crate::request::models::TraitCoreStat> =
        weapon.trait_core_stats.iter().collect();
    core_stats.sort_by(|a, b| b.count.cmp(&a.count));
    let augments = core_stats
        .into_iter()
        .take(AUGMENT_CORE_LIMIT)
        .map(|core| {
            let mut subs: Vec<&crate::request::models::CountStat> = core.stats.iter().collect();
            subs.sort_by(|a, b| b.count.cmp(&a.count));
            AugmentRender {
                core: trait_pick(core.key, core.count, count, core.win, refs.traits),
                subs: subs
                    .into_iter()
                    .take(AUGMENT_SUB_LIMIT)
                    .map(|sub| trait_pick(sub.key, sub.count, core.count, sub.win, refs.traits))
                    .collect(),
            }
        })
        .collect();

    // 钴协议灌注选择率 top（infusionStats 的 key 为灌注 productId）。
    let mut infusion_stats: Vec<&crate::request::models::CountStat> =
        weapon.infusion_stats.iter().collect();
    infusion_stats.sort_by(|a, b| b.count.cmp(&a.count));
    let infusions = infusion_stats
        .into_iter()
        .take(INFUSION_LIMIT)
        .map(|infusion| infusion_pick(infusion.key, infusion.count, count, infusion.win, refs))
        .collect();

    WeaponBuildRender {
        weapon: weapon_name(refs.weapons, weapon.key),
        icon_url: refs
            .weapons
            .get_weapon_by_id(weapon.key)
            .map(|w| cdn_url(&w.icon_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        tier: weapon.tier.clone(),
        tier_score: weapon.tier_score.unwrap_or(0.0),
        games: count,
        pick_rate: rate(count, total_games),
        win_rate: rate(weapon.win as i64, count),
        top3_rate: rate(weapon.top3 as i64, count),
        avg_rank: avg(weapon.place as i64, count),
        avg_kills: avg(weapon.player_kill as i64, count),
        avg_mmr_gain: avg(weapon.mmr_gain as i64, count),
        rank: rank.count as i64,
        rank_size: rank.size as i64,
        skills,
        skill_builds,
        item_builds,
        tacticals,
        augments,
        infusions,
    }
}

fn weapon_name(weapons: &DakGgWeaponResponse, id: i32) -> String {
    weapons
        .get_weapon_by_id(id)
        .map(|weapon| weapon.name.clone())
        .unwrap_or_else(|| format!("武器 {id}"))
}

fn trait_pick(
    id: i64,
    count: i64,
    total: i64,
    win: i64,
    traits: &DakGgTraitSkillsResponse,
) -> PickRender {
    let skill = traits.get_trait_skill_by_id(id);
    PickRender {
        id,
        name: skill.map(|s| s.name.clone()).unwrap_or_default(),
        icon_url: skill
            .map(|s| cdn_url(&s.image_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        bg_url: String::new(),
        pick_rate: rate(count, total),
        win_rate: rate(win, count),
        tooltip: skill.map(|s| s.tooltip.clone()).unwrap_or_default()
    }
}

/// 钴协议灌注：key 为灌注 productId，依次按 强化 / 物品 / 战术技能 解析名称与图标。
fn infusion_pick(
    product_id: i64,
    count: i64,
    total: i64,
    win: i64,
    refs: &AnalysisRefs,
) -> PickRender {
    let (name, icon_url,tooltip) =
        resolve_infusion_product(product_id, refs.traits, refs.items, refs.tacticals);
    PickRender {
        id: product_id,
        name,
        icon_url,
        bg_url: String::new(),
        pick_rate: rate(count, total),
        win_rate: rate(win, count),
        tooltip
    }
}

/// 灌注 productId → (名称, 图标)。强化/遗物在 trait-skills，物品在 items，战术技能在 tactical-skills。
fn resolve_infusion_product(
    product_id: i64,
    traits: &DakGgTraitSkillsResponse,
    items: &DakGgItemsResponse,
    tacticals: &DakGgTacticalSkillResponse,
) -> (String, String,String) {
    if let Some(skill) = traits.get_trait_skill_by_id(product_id) {
        return (skill.name.clone(), cdn_url(&skill.image_url),skill.tooltip.clone());
    }
    if let Some(item) = items.get_item_by_id(product_id) {
        return (item.name.clone(), cdn_url(&item.image_url),item.tooltip.clone());
    }
    if let Some(skill) = tacticals.get_tactical_skill(product_id) {
        return (skill.name.clone(), cdn_url(&skill.image_url),skill.tooltip.clone());
    }
    (String::new(), CDN_PLACEHOLDER_URL.to_string(),"".to_string())
}

/// 物品品级字符串 → 序号（用于品级背景图）。
fn item_grade_num(grade: &str) -> i32 {
    match grade {
        "Common" => 1,
        "Uncommon" => 2,
        "Rare" => 3,
        "Epic" => 4,
        "Legend" => 5,
        "Mythic" => 6,
        _ => 0,
    }
}

/// 占比百分比，分母为 0 时返回 0。
fn rate(numerator: i64, denominator: i64) -> f64 {
    if denominator > 0 {
        numerator as f64 / denominator as f64 * 100.0
    } else {
        0.0
    }
}

/// 均值，分母为 0 时返回 0。
fn avg(numerator: i64, denominator: i64) -> f64 {
    if denominator > 0 {
        numerator as f64 / denominator as f64
    } else {
        0.0
    }
}

fn stat_row(label: &str, base: f64, per_level: f64) -> CharacterStatRow {
    CharacterStatRow {
        label: label.to_string(),
        base,
        per_level,
    }
}

fn profile_image_url(
    season_overview: Option<&ProfilePlayerSeasonOverview>,
    season_overviews: &[ProfilePlayerSeasonOverview],
    characters: &DakGgCharactersResponse,
) -> String {
    let character_stat = season_overview
        .and_then(|overview| overview.character_stats.first())
        .or_else(|| {
            season_overviews
                .iter()
                .find_map(|overview| overview.character_stats.first())
        });

    let Some(character_stat) = character_stat else {
        return CDN_PLACEHOLDER_URL.to_string();
    };

    let skin_id = character_stat
        .skin_stats
        .as_ref()
        .and_then(|skins| skins.first())
        .map(|skin| skin.key)
        .unwrap_or_default();

    character_url(
        characters,
        character_stat.key,
        skin_id,
        DakGgCharacterImgType::CharResult,
    )
}

fn recent_players(
    season_overviews: &[ProfilePlayerSeasonOverview],
    characters: &DakGgCharactersResponse,
    matching_mode: MatchingMode,
) -> Vec<PlayerRecentPlay> {
    season_overviews
        .iter()
        .find(|overview| {
            overview.matching_mode_id == matching_mode.value() && !overview.duo_stats.is_empty()
        })
        .or_else(|| {
            season_overviews
                .iter()
                .find(|overview| !overview.duo_stats.is_empty())
        })
        .map(|overview| {
            overview
                .duo_stats
                .iter()
                .take(8)
                .filter_map(|duo_stat| {
                    let character_id = duo_stat.character_stats.first()?.key;
                    let character = characters.get_character_by_id(character_id)?;
                    let skin_id = character
                        .skins
                        .first()
                        .map(|skin| skin.id)
                        .unwrap_or_default();
                    let plays = duo_stat.play.max(1);

                    Some(PlayerRecentPlay {
                        image_url: character_url(
                            characters,
                            character.id,
                            skin_id,
                            DakGgCharacterImgType::CharProfile,
                        ),
                        plays: duo_stat.play,
                        nickname: duo_stat.nickname.clone(),
                        win_rate: format!("{}%", fmt1(duo_stat.win as f64 / plays as f64 * 100.0)),
                        avg_rank: format!("#{}", fmt1(duo_stat.place as f64 / plays as f64)),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn player_data_convert(
    season_overview: Option<&ProfilePlayerSeasonOverview>,
    player_seasons: &[ProfilePlayerSeason],
    tiers: &DakGgTiersResponse,
    matching_mode: MatchingMode,
) -> Result<PlayerData> {
    let latest_play_season = player_seasons
        .first()
        .ok_or_else(|| RequestError::NotFound("player season".to_string()))?;

    let tier = if matching_mode == MatchingMode::Rank {
        tiers.get_tier_by_id(latest_play_season.tier_id)
    } else {
        tiers.get_unrank()
    };

    let tier_id = tier.map(|tier| tier.id).unwrap_or_default();
    let tier_name = tier
        .map(|tier| tier.name.clone())
        .unwrap_or_else(|| "Unrank".to_string());

    let mut data = PlayerData {
        tier_image_url: tier_round_url(tier_id),
        rp_name: "Normal data".to_string(),
        rp: "NULL".to_string(),
        ..Default::default()
    };

    if matching_mode == MatchingMode::Rank {
        data.rp_name = match tier_id {
            7 | 8 => {
                let rank = season_overview
                    .and_then(|overview| overview.rank.as_ref())
                    .and_then(|rank| rank.global.as_ref())
                    .map(|rank| rank.rank)
                    .unwrap_or_default();
                log::debug!("rank area tier_id={tier_id} global_rank=#{rank}");
                format!("{tier_name} - #{rank}")
            }
            _ => format!(
                "{tier_name} {} - {}",
                latest_play_season.tier_grade_id, latest_play_season.tier_mmr
            ),
        };
        data.rp = if latest_play_season.mmr == 0 {
            "段位未定义".to_string()
        } else {
            latest_play_season.mmr.to_string()
        };
    }

    if let Some(overview) = season_overview {
        let play = overview.play.max(1);
        let play_f64 = play as f64;
        data.play = overview.play;
        data.avg_tk = fmt2(overview.team_kill as f64 / play_f64);
        data.avg_kill = fmt2(overview.player_kill as f64 / play_f64);
        data.avg_rank = format!("#{}", fmt2(overview.place as f64 / play_f64));
        data.avg_dmg = (overview.damage_to_player / play).to_string();
        data.avg_assists = fmt2(overview.player_assistant as f64 / play_f64);
        data.top1 = format!("{}%", fmt1(overview.win as f64 / play_f64 * 100.0));
        data.top2 = format!("{}%", fmt1(overview.top2 as f64 / play_f64 * 100.0));
        data.top3 = format!("{}%", fmt1(overview.top3 as f64 / play_f64 * 100.0));
        data.avg_animal = fmt2(overview.monster_kill as f64 / play_f64);
        data.avg_credit = fmt2(overview.total_gain_vf_credit as f64 / play_f64);
        data.avg_vision = fmt2(overview.view_contribution as f64 / play_f64);
        let deaths = overview.player_deaths.max(1);
        data.kda = fmt2((overview.player_kill + overview.player_assistant) as f64 / deaths as f64);
    }

    Ok(data)
}

fn player_mmr_stats(overview: Option<&ProfilePlayerSeasonOverview>) -> Option<PlayerMmrStats> {
    let mmr_stats = overview?.mmr_stats.iter().take(7).rev();
    let mut dates = Vec::new();
    let mut values = Vec::new();

    for mmr in mmr_stats {
        if mmr.len() < 2 {
            continue;
        }
        let date = mmr[0].to_string();
        let short = date.get(4..).unwrap_or(&date);
        dates.push(match short.len().cmp(&4) {
            Ordering::Greater | Ordering::Equal => {
                format!("{}/{}", &short[0..2], &short[2..4])
            }
            Ordering::Less => short.to_string(),
        });
        values.push(mmr[1]);
    }

    if values.is_empty() {
        None
    } else {
        Some(PlayerMmrStats { dates, values })
    }
}

fn character_use_stats(
    season_overviews: &[ProfilePlayerSeasonOverview],
    characters: &DakGgCharactersResponse,
    matching_mode: MatchingMode,
) -> Vec<CharacterUseStats> {
    season_overviews
        .iter()
        .find(|overview| overview.matching_mode_id == matching_mode.value())
        .map(|overview| {
            overview
                .character_stats
                .iter()
                .take(8)
                .filter_map(|character_stat| {
                    let character = characters.get_character_by_id(character_stat.key)?;
                    let skin_id = character
                        .skins
                        .first()
                        .map(|skin| skin.id)
                        .unwrap_or_default();
                    let play = character_stat.play.max(1);

                    Some(CharacterUseStats {
                        character_name: character.name.clone(),
                        image_url: character_url(
                            characters,
                            character.id,
                            skin_id,
                            DakGgCharacterImgType::CharProfile,
                        ),
                        win_rate: format!(
                            "{}%",
                            fmt1(character_stat.win as f64 / play as f64 * 100.0)
                        ),
                        character_play: character_stat.play,
                        get_rp: character_stat.mmr_gain,
                        avg_rank: format!("#{}", fmt1(character_stat.place as f64 / play as f64)),
                        avg_dmg: if character_stat.damage_to_player == 0 {
                            0
                        } else {
                            character_stat.damage_to_player / play
                        },
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn player_summary(season_overviews: &[ProfilePlayerSeasonOverview]) -> Option<PlayerSummary> {
    let overview = season_overviews
        .iter()
        .find(|overview| overview.team_mode_id == 3 && overview.matching_mode_id == 3)?;
    let recent_matches = &overview.recent_matches;
    if recent_matches.is_empty() {
        return None;
    }

    let count = recent_matches.len();
    let count_f64 = count as f64;
    let ranks = recent_matches
        .iter()
        .map(|recent_match| recent_match.game_rank())
        .collect::<Vec<_>>();

    Some(PlayerSummary {
        count,
        avg_rank: fmt1(ranks.iter().map(|rank| *rank as f64).sum::<f64>() / count_f64),
        wins: ranks.iter().filter(|rank| **rank == 1).count().to_string(),
        avg_tk: fmt1(
            recent_matches
                .iter()
                .map(|recent_match| recent_match.team_kill as f64)
                .sum::<f64>()
                / count_f64,
        ),
        ranks,
        avg_dmg: fmt1(
            recent_matches
                .iter()
                .map(|recent_match| recent_match.damage_to_player as f64)
                .sum::<f64>()
                / count_f64,
        ),
    })
}

fn game_convert_match(
    game: &UserGame,
    characters: &DakGgCharactersResponse,
    items: &DakGgItemsResponse,
    weapons: &DakGgWeaponResponse,
    trait_skills: &DakGgTraitSkillsResponse,
    tactical_skills: &DakGgTacticalSkillResponse,
) -> PlayerMatchData {
    let kill_and_assist = game.player_kill + game.player_assistant;
    let date = parse_game_date(&game.start_dtm) - Duration::hours(1);
    let matching_mode = MatchingMode::from_value(Some(game.matching_mode));
    let detail = build_match_detail(game);
    let trait_group_url = trait_skill_group_url(matching_mode, game, trait_skills);
    PlayerMatchData {
        level: game.character_level as i32,
        rp: game.mmr_after,
        rp_change: game.mmr_gain,
        server_name: game.server_name().to_string(),
        nickname: game.nickname.clone(),
        character_name: characters
            .get_character_by_id(game.character_num)
            .map(|character| character.name.clone())
            .unwrap_or_else(|| game.character_num.to_string()),
        rank: game.game_rank(),
        type_name: matching_mode_name(matching_mode).to_string(),
        mode_id: game.matching_mode,
        kill: game.player_kill,
        tk: game.team_kill,
        assist: game.player_assistant,
        equips: game_equips(game, items),
        weapon_url: weapons
            .get_weapon_by_id(game.best_weapon)
            .map(|weapon| cdn_url(&weapon.icon_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        weapon_id: game.best_weapon as i64,
        tactical_skill_url: tactical_skills
            .get_tactical_skill(game.tactical_skill_group)
            .map(|skill| cdn_url(&skill.image_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        tactical_skill_id: game.tactical_skill_group,
        trait_skill_url: trait_skills
            .get_trait_skill_by_id(game.trait_first_core)
            .map(|skill| cdn_url(&skill.image_url))
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        trait_skill_id: game.trait_first_core,
        trait_skill_group_url: trait_group_url
            .clone()
            .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string()),
        trait_skill_group_id: match trait_group_url {
            Some(_) => game.trait_second_sub.first().copied().unwrap_or_default(),
            None => -1,
        },
        character_avatar_url: character_url(
            characters,
            game.character_num,
            game.skin_code,
            DakGgCharacterImgType::CharProfile,
        ),
        date_hour: format!(
            "{:02}:{:02}:{:02}",
            date.hour(),
            date.minute(),
            date.second()
        ),
        date_month: recent_date_convert(date),
        game_id: game.game_id.to_string(),
        dmg: game.damage_to_player,
        kda: if game.player_deaths == 0 {
            kill_and_assist as f64
        } else {
            kill_and_assist as f64 / game.player_deaths as f64
        },
        route_id: if game.route_id_of_start != 0 {
            game.route_id_of_start.to_string()
        } else {
            "Private".to_string()
        },
        version: format!("{}.{}", game.version_major, game.version_minor),
        ranked: matching_mode == MatchingMode::Rank,
        detail,
    }
}

fn build_match_detail(game: &UserGame) -> MatchDetailRender {
    MatchDetailRender {
        dmg_taken_direct: game.damage_from_player_direct,
        dmg_taken_item_skill: game.damage_from_player_item_skill,
        dmg_taken_unique_skill: game.damage_from_player_unique_skill,
        heal_amount: game.heal_amount,
        team_recover: game.team_recover,
        protect_absorb: game.protect_absorb,
        cc_time: game.cc_time_to_player,
        monster_kill: game.monster_kill,
        extra_kill: game.total_extra_kill,
        best_weapon_level: game.best_weapon_level,
        mastery: sorted_mastery(&game.mastery_level),
        skill_amp: game.skill_amp,
        credit_sources: sorted_credit_sources(game.credit_source.as_ref()),
        craft_uncommon: game.craft_uncommon,
        craft_rare: game.craft_rare,
        craft_epic: game.craft_epic,
        craft_legend: game.craft_legend,
        bought_infusion: game.bought_infusion.clone(),
        add_surveillance: game.add_surveillance_camera,
        add_telephoto: game.add_telephoto_camera,
        remove_surveillance: game.remove_surveillance_camera,
        remove_telephoto: game.remove_telephoto_camera,
        use_hyper_loop: game.use_hyper_loop,
        use_security_console: game.use_security_console,
        used_pair_loop: game.used_pair_loop,
        fishing_count: game.fishing_count,
        emoticon_count: game.use_emoticon_count,
        duration: game.duration,
        survivable_time: game.survivable_time,
        play_time: game.play_time,
        watch_time: game.watch_time,
        deaths_phase: [
            game.deaths_phase_one,
            game.deaths_phase_two,
            game.deaths_phase_three,
        ],
        team_down: game.team_down,
        team_battle_zone_down: game.team_battle_zone_down,
        team_repeat_down: game.team_repeat_down,
        escape_state: game.escape_state,
        give_up: game.give_up > 0,
        left_early: game.is_leaving_before_credit_revival_terminate,
        place_of_start: game.place_of_start.clone(),
        restricted_area_accelerated: game.restricted_area_accelerated,
        safe_areas: game.safe_areas,
        critical_strike_damage: game.critical_strike_damage,
        cool_down_reduction: game.cool_down_reduction,
        life_steal: game.life_steal,
        normal_life_steal: game.normal_life_steal,
        skill_life_steal: game.skill_life_steal,
        amplifier_to_monster: game.amplifier_to_monster,
        bonus_exp: game.bonus_exp,
        mmr_before: game.mmr_before,
        mmr_gain_in_game: game.mmr_gain_in_game,
        mmr_loss_entry_cost: game.mmr_loss_entry_cost,
        k_factor: game.gained_normal_mmr_k_factor,
        rank_point: game.rank_point,
    }
}

fn sorted_mastery(mastery: &HashMap<String, i64>) -> Vec<MasteryRender> {
    let mut items = mastery
        .iter()
        .map(|(key, level)| MasteryRender {
            key: key.clone(),
            level: *level,
        })
        .collect::<Vec<_>>();
    items.sort_by(|a, b| b.level.cmp(&a.level).then_with(|| a.key.cmp(&b.key)));
    items
}

fn sorted_credit_sources(credit_source: Option<&HashMap<String, f64>>) -> Vec<CreditSource> {
    let mut items = credit_source
        .into_iter()
        .flat_map(|map| map.iter())
        .map(|(key, amount)| CreditSource {
            key: key.clone(),
            amount: *amount,
        })
        .collect::<Vec<_>>();
    items.sort_by(|a, b| {
        b.amount
            .partial_cmp(&a.amount)
            .unwrap_or(Ordering::Equal)
            .then_with(|| a.key.cmp(&b.key))
    });
    items
}

pub(crate) fn trait_skill_group_url(
    matching_mode: MatchingMode,
    game: &UserGame,
    trait_skills: &DakGgTraitSkillsResponse,
) -> Option<String> {
    if matching_mode == MatchingMode::Cobalt {
        return None;
    }

    let skill_id = game.trait_second_sub.first()?;
    let skill = trait_skills.get_trait_skill_by_id(*skill_id)?;
    trait_skills
        .trait_skill_groups
        .iter()
        .find(|group| group.key == skill.group)
        .map(|group| cdn_url(&group.image_url))
}

pub(crate) fn game_equips(game: &UserGame, items: &DakGgItemsResponse) -> Vec<EquipRender> {
    let equipment = game.equipment();
    let grades = game.equipment_grade();
    let mut equipment = equipment
        .into_iter()
        .filter(|(_, item_id)| *item_id > 0)
        .collect::<Vec<_>>();
    equipment.sort_by_key(|(slot, _)| *slot);

    equipment
        .into_iter()
        .map(|(slot, item_id)| {
            let grade = grades.get(&slot).copied().unwrap_or(0);
            EquipRender {
                item_id: item_id as i64,
                item_bg_url: item_bg_url(grade),
                item_url: item_url(items, item_id as i64),
            }
        })
        .collect()
}

pub(crate) fn character_url(
    characters: &DakGgCharactersResponse,
    character_id: i64,
    skin_id: i64,
    image_type: DakGgCharacterImgType,
) -> String {
    characters
        .get_character_skin_by_id(character_id, skin_id)
        .map(|skin| DakGgCharacterImgType::replace_in_url(&skin.image_url, image_type))
        .or_else(|| {
            characters
                .get_character_by_id(character_id)
                .map(|character| {
                    DakGgCharacterImgType::replace_in_url(&character.image_url, image_type)
                })
        })
        .map(|url| cdn_url(&url))
        .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string())
}

fn item_url(items: &DakGgItemsResponse, item_id: i64) -> String {
    items
        .get_item_by_id(item_id)
        .map(|item| cdn_url(&item.image_url))
        .unwrap_or_else(|| CDN_PLACEHOLDER_URL.to_string())
}

fn item_bg_url(grade: i32) -> String {
    format!("https://cdn.dak.gg/er/images/item/ico-itemgradebg-{grade:02}.svg")
}

fn tier_round_url(tier_id: i32) -> String {
    format!("https://cdn.dak.gg/assets/er/images/rank/round/{tier_id}.png")
}

fn parse_game_date(date: &str) -> DateTime<FixedOffset> {
    DateTime::parse_from_str(date, "%Y-%m-%dT%H:%M:%S%.3f%z")
        .unwrap_or_else(|_| Local::now().fixed_offset())
}

fn recent_date_convert(date: DateTime<FixedOffset>) -> String {
    let now = Local::now().fixed_offset();
    if is_same_day(now, date) {
        return "今天".to_string();
    }
    if is_same_day(now - Duration::days(1), date) {
        return "昨天".to_string();
    }
    if is_same_day(now - Duration::days(2), date) {
        return "前天".to_string();
    }
    format!("{}月{}日", date.month(), date.day())
}

fn is_same_day(date1: DateTime<FixedOffset>, date2: DateTime<FixedOffset>) -> bool {
    date1.year() == date2.year() && date1.month() == date2.month() && date1.day() == date2.day()
}

fn matching_mode_name(mode: MatchingMode) -> &'static str {
    match mode {
        MatchingMode::Normal => "普通",
        MatchingMode::Rank => "排位",
        MatchingMode::Cobalt => "钴协议",
        MatchingMode::Union => "联合",
        MatchingMode::Lonely => "孤狼",
        MatchingMode::All => "全部",
    }
}

pub(crate) fn cdn_url(url: &str) -> String {
    if url.starts_with("//") {
        format!("https:{url}")
    } else if url.is_empty() {
        CDN_PLACEHOLDER_URL.to_string()
    } else {
        url.to_string()
    }
}

fn fmt1(value: f64) -> String {
    format!("{value:.1}")
}

fn fmt2(value: f64) -> String {
    format!("{value:.2}")
}

fn reorder_item_build(items: &[PickRender], order_key: &str) -> Vec<PickRender> {
    order_key
        .chars()
        .filter_map(|ch| ch.to_digit(10))
        .filter_map(|index| {
            let zero_based = usize::try_from(index).ok()?.checked_sub(1)?;
            items.get(zero_based).cloned()
        })
        .collect()
}
