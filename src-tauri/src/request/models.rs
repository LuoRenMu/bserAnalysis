use std::collections::HashMap;

use chrono::{Local, NaiveDateTime};
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseGameDataResponse<T> {
    pub code: i32,
    pub message: String,
    pub description: Option<String>,
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDataSeasonResponse {
    #[serde(rename = "seasonID")]
    pub season_id: i32,
    pub season_name: String,
    #[serde(with = "local_datetime")]
    pub season_start: NaiveDateTime,
    #[serde(with = "local_datetime")]
    pub season_end: NaiveDateTime,
    pub is_current: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserNickNameResponse {
    pub code: i32,
    pub message: String,
    pub description: Option<String>,
    pub user: UserNickName,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserNickName {
    pub user_id: String,
    pub nickname: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserStatsResponse {
    #[serde(default)]
    pub code: i32,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub user: Vec<UserStats>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct UserStats {
    pub season_id: i32,
    pub matching_mode: i32,
    pub matching_team_mode: i32,
    pub mmr: i32,
    pub nickname: String,
    pub rank: i32,
    pub rank_size: i32,
    pub total_games: i32,
    pub total_wins: i32,
    pub total_team_kills: i32,
    pub total_deaths: i32,
    pub escape_count: i32,
    pub rank_percent: f64,
    pub average_rank: f64,
    pub average_kills: f64,
    pub average_assistants: f64,
    pub average_hunts: f64,
    pub top1: f64,
    pub top2: f64,
    pub top3: f64,
    pub top5: f64,
    pub top7: f64,
    pub character_stats: Vec<UserCharacterStats>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct UserCharacterStats {
    pub character_code: i32,
    pub total_games: i32,
    pub usages: i32,
    pub max_killings: i32,
    pub top3: i32,
    pub wins: i32,
    pub top3_rate: f64,
    pub average_rank: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct BattleUserGamesResponse {
    pub next: Option<i32>,
    pub code: i32,
    pub message: String,
    #[serde(rename = "userGames")]
    pub user_games: Vec<UserGame>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct UserGame {
    #[serde(rename = "equipment")]
    pub equipment_virtual: Value,
    #[serde(rename = "equipmentGrade")]
    pub equipment_grade_virtual: Value,
    pub user_num: i64,
    pub nickname: String,
    pub game_id: i64,
    pub season_id: i64,
    pub matching_mode: i32,
    pub matching_team_mode: i64,
    pub character_num: i64,
    pub skin_code: i64,
    pub character_level: i64,
    pub squad_rumble_rank: i32,
    #[serde(rename = "gameRank")]
    pub game_rank_virtual: i32,
    pub player_kill: i32,
    pub player_deaths: i32,
    pub player_assistant: i32,
    pub account_level: i32,
    pub monster_kill: i64,
    pub mmr_before: i32,
    pub mmr_after: i32,
    pub mmr_gain: i32,
    pub best_weapon: i32,
    pub best_weapon_level: i32,
    pub mastery_level: HashMap<String, i64>,
    pub version_major: i64,
    pub version_minor: i64,
    #[serde(rename = "serverName")]
    pub server_name_virtual: String,
    pub critical_strike_damage: f64,
    pub cool_down_reduction: f64,
    pub life_steal: f64,
    pub normal_life_steal: f64,
    pub skill_life_steal: f64,
    pub amplifier_to_monster: f64,
    pub bonus_exp: i64,
    pub start_dtm: String,
    pub duration: i64,
    pub play_time: i64,
    pub watch_time: i64,
    pub total_time: i64,
    pub survivable_time: i64,
    pub bot_added: i64,
    pub bot_remain: i64,
    pub restricted_area_accelerated: i64,
    pub safe_areas: i64,
    pub team_number: i64,
    pub pre_made: i64,
    pub gained_normal_mmr_k_factor: f64,
    pub victory: i64,
    pub craft_uncommon: i64,
    pub craft_rare: i64,
    pub craft_epic: i64,
    pub craft_legend: i64,
    pub damage_to_player: i64,
    pub damage_from_player_item_skill: i64,
    pub damage_from_player_direct: i64,
    pub damage_from_player_unique_skill: i64,
    pub heal_amount: i64,
    pub team_recover: i64,
    pub protect_absorb: i64,
    pub add_surveillance_camera: i64,
    pub add_telephoto_camera: i64,
    pub remove_surveillance_camera: i64,
    pub remove_telephoto_camera: i64,
    pub use_hyper_loop: i64,
    pub use_security_console: i64,
    pub give_up: i64,
    pub team_spectator: i64,
    pub pc_cafe: i64,
    pub route_id_of_start: i64,
    pub route_slot_id: i64,
    pub place_of_start: String,
    pub match_size: i64,
    pub team_kill: i32,
    pub fishing_count: i64,
    pub use_emoticon_count: i64,
    pub expire_dtm: String,
    pub trait_first_core: i64,
    #[serde(deserialize_with = "mixed_i64_vec", default)]
    pub trait_second_sub: Vec<i64>,
    pub rank_point: i32,
    #[serde(deserialize_with = "mixed_i64_vec", default)]
    pub scored_point: Vec<i64>,
    pub kill_details: String,
    pub death_details: String,
    /// 死亡地区代码（对应 areas API 的 id），最多三次死亡。
    pub place_of_death: String,
    pub place_of_death2: String,
    pub place_of_death3: String,
    pub deaths_phase_one: i64,
    pub deaths_phase_two: i64,
    pub deaths_phase_three: i64,
    pub used_pair_loop: i64,
    pub cc_time_to_player: f64,
    pub credit_source: Option<HashMap<String, f64>>,
    pub bought_infusion: String,
    #[serde(deserialize_with = "mixed_i64_vec", default)]
    pub item_transferred_console: Vec<i64>,
    #[serde(deserialize_with = "mixed_i64_vec", default)]
    pub item_transferred_drone: Vec<i64>,
    pub escape_state: i32,
    pub total_extra_kill: i64,
    #[serde(deserialize_with = "mixed_i64_vec", default)]
    pub collect_item_for_log: Vec<i64>,
    pub tactical_skill_group: i64,
    pub tactical_skill_level: i64,
    pub team_down: i64,
    pub team_battle_zone_down: i64,
    pub team_repeat_down: i64,
    pub skill_amp: i64,
    pub is_leaving_before_credit_revival_terminate: bool,
    pub mmr_gain_in_game: i64,
    pub mmr_loss_entry_cost: i64,
}

impl UserGame {
    pub fn server_name(&self) -> &str {
        match self.server_name_virtual.to_ascii_lowercase().as_str() {
            "asia" => return "亚一",
            "asia2" => return "亚二",
            "asia3" => return "亚三",
            "europe" => return "欧服",
            "ohio" => return "美东",
            "frankfurt" => return "法兰克福",
            "saopaulo" => return "南美",
            "global" => return "全球",
            _ => {}
        }
        match self.server_name_virtual.to_ascii_lowercase().as_str() {
            "asia" => "亚一",
            "asia2" => "亚二",
            "asia3" => "亚三",
            "europe" => "欧服",
            "ohio" => "美东",
            "frankfurt" => "法兰克福",
            "saopaulo" => "南美",
            "global" => "全球",
            _ => &self.server_name_virtual,
        }
    }

    pub fn game_rank(&self) -> i32 {
        if self.escape_state != 0 {
            99
        } else {
            self.game_rank_virtual
        }
    }

    pub fn equipment(&self) -> HashMap<i32, i32> {
        json_element_to_i32_map(&self.equipment_virtual)
    }

    pub fn equipment_grade(&self) -> HashMap<i32, i32> {
        json_element_to_i32_map(&self.equipment_grade_virtual)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgCharactersResponse {
    pub characters: Vec<DakGgCharacterById>,
}

impl DakGgCharactersResponse {
    pub fn get_character_by_id(&self, character_id: i64) -> Option<&DakGgCharacterById> {
        self.characters
            .iter()
            .find(|character| character.id == character_id)
    }

    pub fn get_character_skin_by_id(&self, character_id: i64, skin_id: i64) -> Option<&DakGgSkin> {
        self.get_character_by_id(character_id)
            .and_then(|character| character.get_character_skin_by_id(skin_id))
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgCharacterById {
    pub id: i64,
    pub key: String,
    pub name: String,
    pub image_name: String,
    pub image_url: String,
    pub community_image_url: String,
    pub weapon_types: Vec<DakGgWeaponType>,
    pub skins: Vec<DakGgSkin>,
    #[serde(default)]
    pub char_arche_types: Vec<String>,
}

impl DakGgCharacterById {
    pub fn get_character_skin_by_id(&self, skin_id: i64) -> Option<&DakGgSkin> {
        self.skins.iter().find(|skin| skin.id == skin_id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgSkin {
    pub id: i64,
    pub name: String,
    pub grade: i32,
    pub image_name: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DakGgWeaponType {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub key: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DakGgCharacterImgType {
    CharProfile,
    CharResult,
}

impl DakGgCharacterImgType {
    pub fn value(self) -> &'static str {
        match self {
            Self::CharProfile => "CharProfile",
            Self::CharResult => "CharResult",
        }
    }

    pub fn replace_in_url(url: &str, image_type: Self) -> String {
        url.replace("CharProfile", image_type.value())
            .replace("CharResult", image_type.value())
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DakGgItemsResponse {
    #[serde(default)]
    pub items: Vec<DakGgItem>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgItem {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub image_url: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub misc_item_type: Option<String>,
    pub grade: String,
    #[serde(deserialize_with = "mixed_option_i64_vec", default)]
    pub spawn_areas: Option<Vec<i64>>,
    pub weapon_type: Option<String>,
    #[serde(deserialize_with = "mixed_option_i64", default)]
    pub make_material1: Option<i64>,
    #[serde(deserialize_with = "mixed_option_i64", default)]
    pub make_material2: Option<i64>,
    #[serde(deserialize_with = "mixed_option_i64_vec", default)]
    pub make_materials: Option<Vec<i64>>,
    pub armor_type: Option<String>,
    pub consumable_type: Option<String>,
    pub consumable_tag: Option<String>,
    pub special_item_type: Option<String>,
}

impl DakGgItemsResponse {
    pub fn get_item_by_id(&self, id: i64) -> Option<&DakGgItem> {
        self.items.iter().find(|item| item.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgAreasResponse {
    pub areas: Vec<DakGgArea>,
}

impl DakGgAreasResponse {
    pub fn get_area_name(&self, id: i64) -> Option<&str> {
        self.areas
            .iter()
            .find(|area| area.id == id)
            .map(|area| area.name.as_str())
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgArea {
    pub id: i64,
    pub key: String,
    pub name: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgInfusionsResponse {
    pub infusions: Vec<DakGgInfusion>,
}

impl DakGgInfusionsResponse {
    pub fn get_by_id(&self, id: i64) -> Option<&DakGgInfusion> {
        self.infusions.iter().find(|infusion| infusion.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgInfusion {
    pub id: i64,
    pub product_type: String,
    pub product_id: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgWeaponResponse {
    pub masteries: Vec<DakGgWeapon>,
}

impl DakGgWeaponResponse {
    pub fn get_weapon_by_id(&self, id: i32) -> Option<&DakGgWeapon> {
        self.masteries.iter().find(|weapon| weapon.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgWeapon {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub icon_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgTraitSkillsResponse {
    pub trait_skill_groups: Vec<TraitSkillGroup>,
    pub trait_skills: Vec<TraitSkill>,
}

impl DakGgTraitSkillsResponse {
    pub fn get_trait_skill_by_id(&self, id: i64) -> Option<&TraitSkill> {
        self.trait_skills.iter().find(|skill| skill.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TraitSkillGroup {
    pub key: String,
    pub name: String,
    pub tooltip: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TraitSkill {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub group: String,
    #[serde(rename = "type")]
    pub skill_type: String,
    pub image_url: String,
    pub active: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgTacticalSkillResponse {
    pub tactical_skills: Vec<TacticalSkill>,
}

impl DakGgTacticalSkillResponse {
    pub fn get_tactical_skill(&self, id: i64) -> Option<&TacticalSkill> {
        self.tactical_skills.iter().find(|skill| skill.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TacticalSkill {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgSkillsResponse {
    pub skills: Vec<DakGgSkill>,
}

impl DakGgSkillsResponse {
    /// 按角色 id + 技能槽（"Q"/"W"/"E"/"R"/"T"）查技能。
    pub fn get_skill(&self, character_id: i64, slot: &str) -> Option<&DakGgSkill> {
        self.skills
            .iter()
            .find(|skill| skill.character_id == character_id && skill.slot == slot)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgSkill {
    pub id: i64,
    pub name: String,
    pub tooltip: String,
    pub character_id: i64,
    pub max_level: i64,
    pub slot: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgTiersResponse {
    pub tiers: Vec<EternalReturnTier>,
}

impl DakGgTiersResponse {
    pub fn get_unrank(&self) -> Option<&EternalReturnTier> {
        self.get_tier_by_id(0)
    }

    pub fn get_tier_by_id(&self, id: i32) -> Option<&EternalReturnTier> {
        self.tiers.iter().find(|tier| tier.id == id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct EternalReturnTier {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub image_url: String,
    pub icon_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DakGgCurrentSeasonResponse {
    pub id: i32,
    #[serde(rename = "type")]
    pub season_type: String,
    pub name: String,
}

impl DakGgCurrentSeasonResponse {
    pub fn convert(self) -> GameDataSeasonResponse {
        GameDataSeasonResponse {
            season_id: self.id,
            season_name: self.name,
            season_start: NaiveDateTime::MIN,
            season_end: NaiveDateTime::MAX,
            is_current: 1,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DakGgSeasonResponse {
    #[serde(default)]
    pub seasons: Vec<DakGgSeason>,
}

impl DakGgSeasonResponse {
    pub fn get_current_season(&self) -> Option<&DakGgSeason> {
        self.seasons.iter().find(|season| season.is_current)
    }

    pub fn get_season_by_id(&self, id: i32) -> Option<&DakGgSeason> {
        self.seasons.iter().find(|season| season.id == id)
    }

    pub fn get_latest_season(&self) -> Option<&DakGgSeason> {
        self.seasons.iter().max_by_key(|season| season.id)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgSeason {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub is_current: bool,
}

/// 单英雄玩家排行（/v0/leaderboard/characters/{key}）。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgCharacterLeaderboardResponse {
    pub rankings: Vec<DakGgCharacterRanking>,
    pub player_tier_by_user_num: HashMap<i64, DakGgCharacterPlayerTier>,
    pub min_match_count: i32,
    pub total_count: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgCharacterRanking {
    pub season_id: i32,
    pub user_num: i64,
    pub team_mode_id: i32,
    pub mmr: i32,
    pub nickname: String,
    pub character_id: i64,
    pub pick_count: i32,
    pub win_count: i32,
    pub top2_count: i32,
    pub top3_count: i32,
    pub avg_placement: f64,
    pub avg_player_kill: f64,
    pub avg_player_assistant: f64,
    pub avg_monster_kill: f64,
    pub avg_damage_to_player: f64,
    pub avg_damage_to_monster: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgCharacterPlayerTier {
    pub mmr: i32,
    pub tier_type: i32,
    pub tier_grade: i32,
    pub lp: i32,
    pub name: String,
    pub season_id: i32,
    pub image_url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct DakGgSyncResponse {
    #[serde(rename = "user_num")]
    pub user_num: Option<i32>,
    #[serde(rename = "player_name")]
    pub player_name: Option<String>,
    #[serde(rename = "not_found")]
    pub not_found: Option<bool>,
    #[serde(rename = "retry_after")]
    pub retry_after: Option<i32>,
}

impl DakGgSyncResponse {
    pub fn is_success(&self) -> bool {
        self.user_num.is_some() && self.player_name.is_some()
    }

    pub fn is_not_found(&self) -> bool {
        self.not_found == Some(true)
    }

    pub fn is_rate_limited(&self) -> bool {
        self.retry_after.is_some()
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DakGgMatchesResponse {
    #[serde(default)]
    pub meta: DakGgMatchesMetaData,
    #[serde(default)]
    pub matches: Vec<UserGame>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgMatchDetailResponse {
    #[serde(default)]
    pub player_tiers: Vec<Value>,
    #[serde(default)]
    pub skill_infos: Vec<Value>,
    #[serde(default)]
    pub match_tier: Value,
    #[serde(default)]
    pub matches: Vec<UserGame>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgMatchesMetaData {
    pub count: i32,
    pub matching_mode: String,
    pub page: i32,
    pub season: String,
    pub team_mode: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgLeaderboardResponse {
    pub cutoffs: Vec<Cutoff>,
    pub leaderboards: Vec<LeaderboardPlayer>,
    pub player_tier_by_user_num: HashMap<i32, PlayerTierByUserNum>,
    pub tier_distribution_dtos: Vec<TierDistributionDto>,
    pub total_leader_board_count: i32,
    pub updated_at: i64,
}

impl DakGgLeaderboardResponse {
    pub fn resolve_cutoffs(&self) -> Option<(&Cutoff, &Cutoff)> {
        match self.cutoffs.len() {
            1 => Some((&self.cutoffs[0], &self.cutoffs[0])),
            2 => Some((&self.cutoffs[1], &self.cutoffs[0])),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Cutoff {
    pub mmr: i32,
    pub team_mode_id: i32,
    pub tier_type: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LeaderboardPlayer {
    pub avg_placement: f64,
    pub avg_player_kill: f64,
    pub character_ids: Option<Vec<i32>>,
    pub mmr: i32,
    pub most_characters: Vec<CharacterPickRate>,
    pub nickname: String,
    pub play_count: i32,
    pub rank: i32,
    pub rank_diff: i32,
    pub top3_rate: f64,
    pub user_num: i64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterPickRate {
    pub character_id: i32,
    pub pick_rate: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PlayerTierByUserNum {
    pub image_url: String,
    pub lp: i32,
    pub mmr: i32,
    pub name: String,
    pub season_id: i32,
    pub tier_grade: i32,
    pub tier_type: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TierDistributionDto {
    pub count: i32,
    pub rate: f64,
    pub tier_grade: i32,
    pub tier_image_url: String,
    pub tier_type: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TierDistributionsResponse {
    pub distributions: Vec<TierDistributionDto>,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgCharacterStatsResponse {
    pub character_stat_snapshot: CharacterStatSnapshot,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterStatSnapshot {
    pub dt: i32,
    pub patch: i32,
    pub matching_mode: i32,
    pub team_mode: i32,
    pub tier: String,
    pub tier_count: i32,
    pub tier_game_count: i32,
    pub character_stats: Vec<CharacterStat>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterStat {
    pub key: i32,
    pub count: i32,
    pub weapon_stats: Vec<WeaponStat>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct WeaponStat {
    pub key: i32,
    pub count: i32,
    pub win: i32,
    pub top3: i32,
    pub place: i32,
    pub player_kill: i32,
    pub player_assistant: i32,
    pub player_deaths: i32,
    pub damage_to_player: i32,
    pub damage_to_monster: i64,
    pub monster_kill: i32,
    pub team_kill: i32,
    pub mmr_gain: i32,
    pub tier: String,
    pub tier_score: Option<f64>,
    pub view_contribution: i32,
    pub rank: Option<RankStat>,
    // 角色页特有的子统计（/v1/character-stats 不返回，缺省即空）。
    pub skill_build_stats: Vec<SkillBuildStat>,
    pub item_stats: Vec<ItemSlotStat>,
    pub item_build_stats: Vec<ItemBuildStat>,
    pub tactical_skill_stats: Vec<TacticalSkillStat>,
    pub trait_core_stats: Vec<TraitCoreStat>,
    /// 钴协议灌注选择统计：key 为灌注 productId（对应 trait/item/tactical 的 id）。
    pub infusion_stats: Vec<CountStat>,
}

/// 通用计数项：key 为物品/技能/强化 id，配合占比统计。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CountStat {
    pub key: i64,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
}

/// 技能加点优先：key 如 "TEWQ"（满级优先顺序）。orderStats 暂不取。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct SkillBuildStat {
    pub key: String,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
    pub order_stats: Vec<OrderStat<String>>,
}

/// 单部位物品统计：key 为部位序号(0=武器…4)，stats 为该部位各物品占比。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ItemSlotStat {
    pub key: i32,
    pub count: i64,
    pub stats: Vec<CountStat>,
}

/// 整套最终装备：key 为各部位物品 id（[武器,胸甲,头部,手臂,腿部]）。orderStats 不取。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ItemBuildStat {
    pub key: Vec<i64>,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
    pub order_stats: Vec<OrderStat<String>>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct OrderStat<T> {
    pub key: T,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TacticalSkillStat {
    pub key: i64,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
}

/// 强化核心：key 为核心强化 id，stats 为该核心下各子强化占比。buildStats 体量大，不取。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TraitCoreStat {
    pub key: i64,
    pub count: i64,
    pub win: i64,
    pub top3: i64,
    pub place: i64,
    pub stats: Vec<CountStat>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct RankStat {
    pub size: i32,
    pub count: i32,
    pub win: i32,
    pub top3: i32,
    pub place: i32,
    pub player_kill: i32,
    pub player_assistant: i32,
    pub player_deaths: i32,
    pub damage_to_player: i32,
    pub damage_to_monster: i32,
    pub mmr_gain: i32,
    pub monster_kill: i32,
    pub team_kill: i32,
    pub view_contribution: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DakGgProfileResponse {
    pub meta: ProfileMeta,
    pub player: ProfilePlayer,
    pub player_season_overviews: Vec<ProfilePlayerSeasonOverview>,
    pub player_seasons: Vec<ProfilePlayerSeason>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfileMeta {
    pub season: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfilePlayer {
    pub account_level: i32,
    pub last_played_season_id: i32,
    pub name: String,
    pub synced_at: i64,
    pub user_num: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfilePlayerSeason {
    pub season_id: i32,
    pub mmr: i32,
    pub tier_id: i32,
    pub tier_grade_id: i32,
    pub tier_mmr: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfilePlayerSeasonOverview {
    #[serde(rename = "seasonID")]
    pub season_id: i32,
    pub user_num: i64,
    pub matching_mode_id: i32,
    pub team_mode_id: i32,
    pub updated_at: i64,
    pub mmr: i32,
    pub play: i32,
    pub win: i32,
    pub top2: i32,
    pub top3: i32,
    pub place: i32,
    pub player_kill: i32,
    pub player_assistant: i32,
    pub team_kill: i32,
    pub monster_kill: i32,
    pub damage_to_player: i32,
    pub damage_to_monster: i32,
    pub mmr_gain: i32,
    pub play_time: i64,
    pub player_deaths: i32,
    pub character_stats: Vec<ProfileStat>,
    pub mmr_stats: Vec<Vec<i32>>,
    pub duo_stats: Vec<ProfileDuoStat>,
    pub recent_matches: Vec<RecentGameMatcher>,
    #[serde(rename = "totalGainVFCredit")]
    pub total_gain_vf_credit: i32,
    pub view_contribution: i32,
    pub rank: Option<RankArea>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct RankArea {
    pub global: Option<RankAreaRank>,
    pub in1000: Option<RankAreaRank>,
    pub local: Option<RankAreaRank>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct RankAreaRank {
    pub rank: i32,
    pub rank_size: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfileStat {
    pub key: i64,
    pub updated_at: Option<i64>,
    pub play: i32,
    pub win: i64,
    pub top2: i64,
    pub top3: i64,
    pub place: i64,
    pub player_kill: i64,
    pub player_assistant: i64,
    pub team_kill: i64,
    pub monster_kill: i64,
    pub damage_to_player: i32,
    pub damage_to_monster: i64,
    pub mmr_gain: i32,
    pub play_time: i64,
    pub player_deaths: i64,
    pub weapon_stats: Option<Vec<ProfileStat>>,
    pub skin_stats: Option<Vec<ProfileStat>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct RecentGameMatcher {
    pub game_id: i64,
    pub season_id: i32,
    pub matching_mode: i32,
    pub team_mode: i32,
    pub character_num: i32,
    pub skin_code: i32,
    #[serde(rename = "gameRank")]
    pub game_rank_virtual: i32,
    pub player_kill: i32,
    pub player_assistant: i32,
    pub monster_kill: i32,
    pub best_weapon: i32,
    pub mmr_gain: i32,
    pub pre_made: i32,
    pub damage_to_player: i32,
    pub damage_to_monster: i32,
    pub give_up: i32,
    pub team_kill: i32,
    pub player_deaths: i32,
    pub escape_state: i32,
}

impl RecentGameMatcher {
    pub fn game_rank(&self) -> i32 {
        if self.escape_state != 0 {
            99
        } else {
            self.game_rank_virtual
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfileDuoStat {
    pub user_num: i64,
    pub nickname: String,
    pub updated_at: i64,
    pub play: i32,
    pub win: i32,
    pub place: i32,
    pub character_stats: Vec<ProfileCharacterStat>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProfileCharacterStat {
    pub key: i64,
    pub updated_at: i64,
    pub play: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EternalReturnNews {
    #[serde(rename = "per_page")]
    pub per_page: i32,
    #[serde(rename = "current_page")]
    pub current_page: i32,
    #[serde(rename = "total_page")]
    pub total_page: i32,
    #[serde(rename = "article_count")]
    pub article_count: i32,
    pub articles: Vec<Article>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Article {
    pub id: i32,
    #[serde(rename = "board_id")]
    pub board_id: i32,
    #[serde(rename = "category_id")]
    pub category_id: i32,
    #[serde(rename = "thumbnail_url")]
    pub thumbnail_url: Option<String>,
    #[serde(rename = "view_count")]
    pub view_count: i32,
    #[serde(rename = "is_hidden")]
    pub is_hidden: i32,
    #[serde(rename = "is_pinned")]
    pub is_pinned: bool,
    #[serde(rename = "created_at")]
    pub created_at: String,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
    pub i18ns: I18ns,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct I18ns {
    #[serde(rename = "zh_CN")]
    pub zh_cn: Option<LocaleContent>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct LocaleContent {
    pub locale: String,
    pub title: String,
    pub summary: Option<String>,
    #[serde(rename = "created_at_for_humans")]
    pub created_at_for_humans: Option<String>,
    #[serde(rename = "is_hidden")]
    pub is_hidden: bool,
    #[serde(rename = "content_type")]
    pub content_type: Option<i32>,
    #[serde(rename = "content_link")]
    pub content_link: Option<String>,
    #[serde(rename = "content_link_target")]
    pub content_link_target: Option<String>,
}

fn json_element_to_i32_map(value: &Value) -> HashMap<i32, i32> {
    match value {
        Value::Array(items) => items
            .iter()
            .enumerate()
            .filter_map(|(index, item)| item.as_i64().map(|value| (index as i32, value as i32)))
            .collect(),
        Value::Object(items) => items
            .iter()
            .filter_map(|(key, value)| Some((key.parse::<i32>().ok()?, value.as_i64()? as i32)))
            .collect(),
        _ => HashMap::new(),
    }
}

fn mixed_i64_vec<'de, D>(deserializer: D) -> Result<Vec<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    match value {
        Value::Null => Ok(Vec::new()),
        Value::Array(items) => items.into_iter().map(value_to_i64).collect(),
        Value::Number(_) | Value::String(_) => value_to_i64(value).map(|value| vec![value]),
        other => Err(serde::de::Error::custom(format!(
            "expected i64 or i64 array, got {other}"
        ))),
    }
}

fn mixed_option_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    match value {
        Value::Null => Ok(None),
        Value::Number(_) | Value::String(_) => value_to_i64(value).map(Some),
        other => Err(serde::de::Error::custom(format!(
            "expected optional i64, got {other}"
        ))),
    }
}

fn mixed_option_i64_vec<'de, D>(deserializer: D) -> Result<Option<Vec<i64>>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    match value {
        Value::Null => Ok(None),
        Value::Array(items) => items
            .into_iter()
            .map(value_to_i64)
            .collect::<Result<Vec<_>, _>>()
            .map(Some),
        Value::Number(_) | Value::String(_) => value_to_i64(value).map(|value| Some(vec![value])),
        other => Err(serde::de::Error::custom(format!(
            "expected optional i64 array, got {other}"
        ))),
    }
}

fn value_to_i64<E>(value: Value) -> Result<i64, E>
where
    E: serde::de::Error,
{
    match value {
        Value::Number(number) => number
            .as_i64()
            .ok_or_else(|| E::custom(format!("invalid i64 number: {number}"))),
        Value::String(text) => text
            .parse::<i64>()
            .map_err(|error| E::custom(format!("invalid i64 string {text:?}: {error}"))),
        other => Err(E::custom(format!("expected i64, got {other}"))),
    }
}

pub fn now_local_naive() -> NaiveDateTime {
    Local::now().naive_local()
}

mod local_datetime {
    use chrono::NaiveDateTime;
    use serde::{self, Deserialize, Deserializer, Serializer};

    const FORMAT: &str = "%Y-%m-%d %H:%M:%S";

    pub fn serialize<S>(value: &NaiveDateTime, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&value.format(FORMAT).to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<NaiveDateTime, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        NaiveDateTime::parse_from_str(&value, FORMAT).map_err(serde::de::Error::custom)
    }
}
use serde::{Deserialize, Deserializer, Serialize};

use serde_json::Value;

// character

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CharacterAnalysis {
    pub props: CharacterAnalysisRoot,
}
#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CharacterAnalysisRoot {
    #[serde(rename = "initialProps")]
    pub initial_props: InitialProps,
    #[serde(rename = "pageProps")]
    pub page_props: PageProps,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageProps {
    #[serde(rename = "characterTitle")]
    pub character_title: String,
    #[serde(rename = "seoTitle")]
    pub seo_title: String,
    pub character: Character,
    #[serde(rename = "dehydratedState")]
    pub dehydrated_state: DehydratedState,
    #[serde(rename = "teamMode")]
    pub team_mode: String,
    #[serde(rename = "isPreSeason")]
    pub is_pre_season: bool,
    #[serde(rename = "matchingMode")]
    pub matching_mode: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DehydratedState {
    pub mutations: Vec<Value>,
    pub queries: Vec<Queries>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Queries {
    pub state: State,
    #[serde(rename = "queryKey")]
    pub query_key: Vec<Value>,
    #[serde(rename = "queryHash")]
    pub query_hash: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct State {
    pub data: Data,
    #[serde(rename = "dataUpdateCount")]
    pub data_update_count: i64,
    #[serde(rename = "dataUpdatedAt")]
    pub data_updated_at: i64,
    pub error: Value,
    #[serde(rename = "errorUpdateCount")]
    pub error_update_count: i64,
    #[serde(rename = "errorUpdatedAt")]
    pub error_updated_at: i64,
    #[serde(rename = "fetchFailureCount")]
    pub fetch_failure_count: i64,
    #[serde(rename = "fetchMeta")]
    pub fetch_meta: Value,
    #[serde(rename = "isInvalidated")]
    pub is_invalidated: bool,
    pub status: String,
    #[serde(rename = "fetchStatus")]
    pub fetch_status: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Data {
    pub seasons: Vec<Seasons>,
    pub meta: Option<CharacterStatMeta>,
    pub patches: Vec<i64>,
    pub character_detail_stat_snapshot: Option<CharacterDetailStatSnapshot>,
    pub max_skill_rank_by_slot: Option<MaxSkillRankBySlot>,
    pub weapon_routes: Vec<WeaponRoute>,
    pub players: Vec<CharacterStatPlayer>,
    pub player_tiers: Vec<CharacterPlayerTier>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterStatMeta {
    pub patch: i64,
    pub dt: i64,
    pub tier: String,
    pub character: String,
    pub updated_at: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct MaxSkillRankBySlot {
    #[serde(rename = "Q")]
    pub q: i64,
    #[serde(rename = "W")]
    pub w: i64,
    #[serde(rename = "E")]
    pub e: i64,
    #[serde(rename = "R")]
    pub r: i64,
    #[serde(rename = "T")]
    pub t: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterDetailStatSnapshot {
    pub dt: i64,
    pub patch: i64,
    pub matching_mode: i64,
    pub team_mode: i64,
    pub tier: String,
    pub tier_count: i64,
    pub tier_game_count: i64,
    pub character_detail_stat: CharacterDetailStat,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterDetailStat {
    pub key: i64,
    pub count: i64,
    /// 复用 /v1/character-stats 的单武器统计结构（字段一致，多余字段 serde 忽略）。
    pub weapon_stats: Vec<WeaponStat>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct WeaponRoute {
    pub id: i64,
    pub title: String,
    pub user_nickname: String,
    pub weapon_type: i32,
    pub count: i64,
    pub v2_like: i64,
    pub v2_win_rate: f64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterStatPlayer {
    pub user_num: i64,
    pub name: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CharacterPlayerTier {
    pub user_num: i64,
    pub mmr: i64,
    pub tier_id: i32,
    pub tier_grade_id: i32,
    pub tier_mmr: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Seasons {
    pub id: i64,
    pub key: String,
    pub name: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Character {
    pub id: i64,
    pub key: String,
    pub name: String,
    #[serde(rename = "imageName")]
    pub image_name: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "communityImageUrl")]
    pub community_image_url: String,
    #[serde(rename = "maxHp")]
    pub max_hp: i64,
    #[serde(rename = "maxVp")]
    pub max_vp: i64,
    #[serde(rename = "attackPower")]
    pub attack_power: i64,
    pub defense: i64,
    #[serde(rename = "hpRegen")]
    pub hp_regen: f64,
    #[serde(rename = "vpRegen")]
    pub vp_regen: i64,
    #[serde(rename = "attackSpeed")]
    pub attack_speed: f64,
    #[serde(rename = "moveSpeed")]
    pub move_speed: f64,
    #[serde(rename = "levelUpStat")]
    pub level_up_stat: LevelUpStat,
    #[serde(rename = "weaponTypes")]
    pub weapon_types: Vec<WeaponTypes>,
    pub masteries: Vec<String>,
    #[serde(rename = "masteryStats")]
    pub mastery_stats: Vec<MasteryStats>,
    pub skins: Vec<Skins>,
    #[serde(rename = "charArcheTypes")]
    pub char_arche_types: Vec<String>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Skins {
    pub id: i64,
    pub name: String,
    pub grade: i64,
    #[serde(rename = "imageName")]
    pub image_name: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MasteryStats {
    pub r#type: String,
    pub options: Vec<Options>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Options {
    pub key: String,
    pub value: f64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeaponTypes {
    pub id: i64,
    pub key: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LevelUpStat {
    #[serde(rename = "maxHp")]
    pub max_hp: i64,
    #[serde(rename = "maxVp")]
    pub max_vp: i64,
    #[serde(rename = "attackPower")]
    pub attack_power: f64,
    pub defense: f64,
    #[serde(rename = "hpRegen")]
    pub hp_regen: f64,
    #[serde(rename = "vpRegen")]
    pub vp_regen: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InitialProps {
    pub locale: String,
    pub notifications: Vec<Value>,
    #[serde(rename = "isDakggMobile")]
    pub is_dakgg_mobile: bool,
    #[serde(rename = "isDakggER")]
    pub is_dakgg_e_r: bool,
    #[serde(rename = "isMobile")]
    pub is_mobile: bool,
    #[serde(rename = "isNoBannerToShow")]
    pub is_no_banner_to_show: bool,
    #[serde(rename = "serverTime")]
    pub server_time: String,
    #[serde(rename = "showEventPortrait")]
    pub show_event_portrait: bool,
    #[serde(rename = "notificationKey")]
    pub notification_key: String,
    #[serde(rename = "bannerKey")]
    pub banner_key: String,
    #[serde(rename = "defaultTheme")]
    pub default_theme: String,
    #[serde(rename = "deviceOs")]
    pub device_os: String,
    #[serde(rename = "hideMobileAppNotice")]
    pub hide_mobile_app_notice: bool,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn user_game_equipment_accepts_array_and_object_shapes() {
        let array_game = UserGame {
            equipment_virtual: json!([101, 102]),
            ..Default::default()
        };
        assert_eq!(array_game.equipment().get(&0), Some(&101));
        assert_eq!(array_game.equipment().get(&1), Some(&102));

        let object_game = UserGame {
            equipment_virtual: json!({"0": 201, "2": 203}),
            ..Default::default()
        };
        assert_eq!(object_game.equipment().get(&0), Some(&201));
        assert_eq!(object_game.equipment().get(&2), Some(&203));
    }

    #[test]
    fn user_game_item_id_lists_accept_numeric_strings() {
        let game: UserGame = serde_json::from_value(json!({
            "traitSecondSub": ["301111"],
            "scoredPoint": ["1", 2],
            "itemTransferredConsole": ["301111"],
            "itemTransferredDrone": ["301112"],
            "collectItemForLog": ["301113"]
        }))
        .unwrap();

        assert_eq!(game.trait_second_sub, vec![301111]);
        assert_eq!(game.scored_point, vec![1, 2]);
        assert_eq!(game.item_transferred_console, vec![301111]);
        assert_eq!(game.item_transferred_drone, vec![301112]);
        assert_eq!(game.collect_item_for_log, vec![301113]);
    }

    #[test]
    fn dakgg_item_materials_accept_numeric_strings() {
        let items: DakGgItemsResponse = serde_json::from_value(json!({
            "items": [{
                "id": 1,
                "spawnAreas": ["1", 2],
                "makeMaterial1": "301110",
                "makeMaterial2": "301111",
                "makeMaterials": ["301110", 301111]
            }]
        }))
        .unwrap();
        let item = &items.items[0];

        assert_eq!(item.spawn_areas, Some(vec![1, 2]));
        assert_eq!(item.make_material1, Some(301110));
        assert_eq!(item.make_material2, Some(301111));
        assert_eq!(item.make_materials, Some(vec![301110, 301111]));
    }

    #[test]
    fn user_game_rank_and_server_name_match_kotlin_helpers() {
        let escaped = UserGame {
            game_rank_virtual: 3,
            escape_state: 1,
            server_name_virtual: "asia2".to_string(),
            ..Default::default()
        };
        assert_eq!(escaped.game_rank(), 99);
        assert_eq!(escaped.server_name(), "亚二");

        let normal = UserGame {
            game_rank_virtual: 5,
            escape_state: 0,
            server_name_virtual: "custom".to_string(),
            ..Default::default()
        };
        assert_eq!(normal.game_rank(), 5);
        assert_eq!(normal.server_name(), "custom");
    }

    #[test]
    fn game_data_season_parses_kotlin_datetime_format() {
        let season: GameDataSeasonResponse = serde_json::from_value(json!({
            "seasonID": 1,
            "seasonName": "Season",
            "seasonStart": "2025-10-25 16:24:00",
            "seasonEnd": "2025-11-25 16:24:00",
            "isCurrent": 1
        }))
        .unwrap();

        assert_eq!(season.season_id, 1);
        assert_eq!(
            season.season_start,
            NaiveDateTime::parse_from_str("2025-10-25 16:24:00", "%Y-%m-%d %H:%M:%S").unwrap()
        );
    }
}
