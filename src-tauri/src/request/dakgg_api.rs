use std::{path::PathBuf, sync::LazyLock, time::Duration};

use crate::request::cache::{CACHE, ttl};
use crate::request::models::CharacterAnalysis;
use crate::request::{
    error::{RequestError, Result},
    helpers::{encode_component},
    manager::{ApiRequest, ResourceRequest, REQUEST_MANAGER},
    models::{
        DakGgCharacterImgType, DakGgCharacterStatsResponse, DakGgCharactersResponse,
        DakGgCurrentSeasonResponse, DakGgItemsResponse, DakGgLeaderboardResponse,
        DakGgMatchDetailResponse, DakGgMatchesResponse, DakGgProfileResponse, DakGgSeasonResponse,
        DakGgSkillsResponse, DakGgSyncResponse, DakGgTacticalSkillResponse, DakGgTiersResponse,
        DakGgTraitSkillsResponse, DakGgWeaponResponse, TierDistributionsResponse,
        DakGgAreasResponse, DakGgInfusionsResponse, DakGgCharacterLeaderboardResponse,
    },
    types::{
        DakGgRank, DakGgServerName, DakGgTeamMode, ImageResourcesType, MatchingMode,
    },
};
use regex::Regex;
use reqwest::Method;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::time::sleep;

const BASE_URL: &str = "https://er.dakgg.io/api";
const DAKGG_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                                (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0";

static CHARACTER_ANALYSIS_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?s)<script id="__NEXT_DATA__"[^>]*>(.*?)</script>"#)
        .expect("invalid __NEXT_DATA__ regex")
});

/// Get the current language code for API requests
fn get_hl() -> String {
    crate::config::get_language()
}

pub struct EternalReturnDakGgApi;

impl EternalReturnDakGgApi {
    pub async fn get_tiers() -> Result<DakGgTiersResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgTiersResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/tiers?hl={}", get_hl());
        let data: DakGgTiersResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_game_data_by_season() -> Result<DakGgSeasonResponse> {

        let url = format!("/v1/data/seasons?hl={}", get_hl());
        dakgg_json(url).await
    }

    pub async fn get_character_leaderboard(
        character_key: &str,
        season_key: &str,
        team_mode: &str,
        sort_type: &str,
        page: i32,
    ) -> Result<DakGgCharacterLeaderboardResponse> {
        let url = format!(
            "/v0/leaderboard/characters/{}?seasonKey={}&teamMode={}&sortType={}&page={}&hl={}",
            encode_component(character_key),
            encode_component(season_key),
            encode_component(team_mode),
            encode_component(sort_type),
            page,
            get_hl(),
        );
        dakgg_json(url).await
    }

    pub async fn get_current_season() -> Result<DakGgCurrentSeasonResponse> {
        if let Some(cached) = CACHE.get::<DakGgCurrentSeasonResponse>() {
            return Ok(cached);
        }
        let url = format!("/v0/current-season?hl={}", get_hl());
        let result: DakGgCurrentSeasonResponse = dakgg_json(url).await?;
        CACHE.set(result.clone(), ttl::DAILY);
        Ok(result)
    }

    pub async fn get_characters() -> Result<DakGgCharactersResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgCharactersResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/characters?hl={}", get_hl());
        let data: DakGgCharactersResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_items() -> Result<DakGgItemsResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgItemsResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/items?hl={}", get_hl());
        let data: DakGgItemsResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_weapons() -> Result<DakGgWeaponResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgWeaponResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/masteries?hl={}", get_hl());
        let data: DakGgWeaponResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_trait_skills() -> Result<DakGgTraitSkillsResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgTraitSkillsResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/trait-skills?hl={}", get_hl());
        let data: DakGgTraitSkillsResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_areas() -> Result<DakGgAreasResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgAreasResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/areas?hl={}", get_hl());
        let data: DakGgAreasResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_infusions() -> Result<DakGgInfusionsResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgInfusionsResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/infusions?hl={}", get_hl());
        let data: DakGgInfusionsResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_tactical_skills() -> Result<DakGgTacticalSkillResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgTacticalSkillResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/tactical-skills?hl={}", get_hl());
        let data: DakGgTacticalSkillResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_skills() -> Result<DakGgSkillsResponse> {
        // Check cache first
        if let Some(cached) = CACHE.get::<DakGgSkillsResponse>() {
            return Ok(cached);
        }

        // Cache miss, fetch from API
        let url = format!("/v1/data/skills?hl={}", get_hl());
        let data: DakGgSkillsResponse = dakgg_json(url).await?;

        // Store in cache
        CACHE.set(data.clone(), ttl::STATIC);
        Ok(data)
    }

    pub async fn get_profile(nickname: &str) -> Result<DakGgProfileResponse> {
        let encoded = encode_component(nickname);
        let api = dakgg_request_accepting_error_status(
            format!("/v1/players/{encoded}/profile"),
        );
        dakgg_json_with_nickname(&api, nickname).await
    }

    pub async fn sync(nickname: &str) -> Result<DakGgSyncResponse> {
        let encoded = encode_component(nickname);
        let api = dakgg_request(
            format!("/v0/rpc/player-sync/by-name/{encoded}"),
        );

        let mut last_response = None;
        for attempt in 1..=3 {
            match REQUEST_MANAGER.call_json::<DakGgSyncResponse>(&api).await {
                Ok(body) => {
                    if body.is_not_found() {
                        return Err(RequestError::NicknameNotFound(nickname.to_string()));
                    }
                    if body.is_success() {
                        return Ok(body);
                    }
                    if body.is_rate_limited() {
                        let wait = body.retry_after.unwrap_or(1000).max(0) as u64;
                        last_response = Some(body);
                        sleep(Duration::from_millis(wait)).await;
                        continue;
                    }
                    return Ok(body);
                }
                Err(error) if attempt < 3 => {
                    sleep(Duration::from_millis(1000 * attempt as u64)).await;
                    if matches!(error, RequestError::NicknameNotFound(_)) {
                        return Err(error);
                    }
                }
                Err(error) => return Err(error),
            }
        }

        Ok(last_response.unwrap_or_default())
    }

    pub async fn get_game(
        nickname: &str,
        season_type: Option<&str>,
        matching_mode: MatchingMode,
        team_mode: DakGgTeamMode,
        page: i32,
    ) -> Result<DakGgMatchesResponse> {
        let api = dakgg_request_accepting_error_status(
            game_url(nickname, season_type, matching_mode, team_mode, page),
        );
        dakgg_json_with_nickname(&api, nickname).await
    }

    pub async fn get_match_detail(
        nickname: &str,
        season_id: i64,
        game_id: i64,
    ) -> Result<DakGgMatchDetailResponse> {
        let encoded = encode_component(nickname);
        let url = format!("/v1/players/{encoded}/matches/{season_id}/{game_id}?hl={}", get_hl());
        let api = dakgg_request_accepting_error_status(url);
        dakgg_json_with_nickname(&api, nickname).await
    }

    pub async fn get_leaderboard(
        page: i32,
        season_type: &str,
        server_name: DakGgServerName,
        team_mode: DakGgTeamMode,
    ) -> Result<DakGgLeaderboardResponse> {
        let url = format!(
            "/v0/leaderboard?page={page}&seasonKey={}&serverName={}&teamMode={}&hl={}",
            encode_component(season_type),
            server_name.value(),
            team_mode.value(),
            get_hl(),
        );
        dakgg_json(url).await
    }

    pub async fn get_tier_distribution(
        team_mode: DakGgTeamMode,
    ) -> Result<TierDistributionsResponse> {
        dakgg_json(
            format!(
                "/v0/statistics/tier-distribution?teamMode={}&hl={}",
                team_mode.value(),
                get_hl(),
            ),
        )
        .await
    }

    pub async fn get_character_stats(
        team_mode: DakGgTeamMode,
        matching_mode: MatchingMode,
        tier: Option<DakGgRank>,
        dt: Option<i32>,
        patch: Option<&str>,
    ) -> Result<DakGgCharacterStatsResponse> {
        let mut url = format!(
            "/v1/character-stats?matchingMode={}&teamMode={}",
            matching_mode.dak_gg_mode(),
            team_mode.value()
        );

        // patch 和 tier/dt 互斥
        if let Some(patch_value) = patch {
            url.push_str(&format!("&dt=0&patch={}", encode_component(patch_value)));
        } else {
            let dt_value = dt.unwrap_or(7);
            url.push_str(&format!("&dt={}", dt_value));
            if let Some(tier_value) = tier {
                url.push_str(&format!("&tier={}", tier_value.value()));
            }
        }

        url.push_str(&format!("&hl={}", get_hl()));
        dakgg_json(url).await
    }

    pub fn image_url_character(
        url: &str,
        character_id: i32,
        skin_id: i64,
        image_type: DakGgCharacterImgType,
    ) -> ResourceRequest {
        let url = DakGgCharacterImgType::replace_in_url(url, image_type);
        let path = ImageResourcesType::Character.character_path(character_id, skin_id, image_type);
        resource_request(url, path)
    }

    pub fn image_url_item_bg(name: &str) -> ResourceRequest {
        resource_request(
            format!("//cdn.dak.gg/er/images/item/ico-itemgradebg-0{name}.svg"),
            format!("resources/images/item/bg/{name}.svg"),
        )
    }

    pub async fn character_analysis(
        character_key: &str,
        team_mode: &str,
        matching_mode: &str,
        tier: Option<&str>,
    ) -> Result<CharacterAnalysis> {
        let mut url = format!(
            "https://dak.gg/er/characters/{}?hl={}&tab=introduction&teamMode={}&matchingMode={}",
            character_key, get_hl(), team_mode, matching_mode
        );
        // tier 仅排位有意义；普通/钴协议忽略它（返回 unrank）。
        if let Some(tier) = tier {
            url.push_str("&tier=");
            url.push_str(tier);
        }
        // URL 作为 url 段（base 留空），否则 normalize_url 会在末尾补 `/`，把末位查询值弄脏。
        let request = ApiRequest::new("", url)
            .header("User-Agent", DAKGG_USER_AGENT);
        let response = REQUEST_MANAGER.call(&request).await?;
        let html = String::from_utf8(response.bytes)
            .map_err(|_| RequestError::UnexpectedDakGgResponse)?;
        let json_data = CHARACTER_ANALYSIS_REGEX
            .captures(&html)
            .and_then(|cap: regex::Captures<'_>| cap.get(1))
            .map(|m: regex::Match<'_>| m.as_str().trim())
            .ok_or(RequestError::UnexpectedDakGgResponse)?;
        serde_json::from_str(json_data).map_err(Into::into)
    }
}

async fn dakgg_json<T>(url: impl Into<String>) -> Result<T>
where
    T: DeserializeOwned,
{
    let api = dakgg_request(url);
    REQUEST_MANAGER.call_json(&api).await
}

async fn dakgg_json_with_nickname<T>(api: &ApiRequest, nickname: &str) -> Result<T>
where
    T: DeserializeOwned,
{
    let response = REQUEST_MANAGER.call(api).await?;
    match serde_json::from_slice::<T>(&response.bytes) {
        Ok(body) if response.is_success() => Ok(body),
        Ok(_) => {
            name_found_check(nickname, &response.bytes)?;
            Err(response.status_error(api))
        }
        Err(_) => {
            name_found_check(nickname, &response.bytes)?;
            if response.is_success() {
                Err(RequestError::UnexpectedDakGgResponse)
            } else {
                Err(response.status_error(api))
            }
        }
    }
}

fn dakgg_request(url: impl Into<String>) -> ApiRequest {
    ApiRequest::new(BASE_URL, url).header("User-Agent", DAKGG_USER_AGENT)
}

fn game_url(
    nickname: &str,
    season_type: Option<&str>,
    matching_mode: MatchingMode,
    team_mode: DakGgTeamMode,
    page: i32,
) -> String {
    let encoded = encode_component(nickname);
    let season = season_type
        .map(|season| format!("season={}", encode_component(season)))
        .unwrap_or_default();

    format!(
        "/v1/players/{encoded}/matches?{season}&matchingMode={}&teamMode={}&page={page}",
        matching_mode.dak_gg_mode(),
        team_mode.value()
    )
}

fn dakgg_request_accepting_error_status(
    url: impl Into<String>,
) -> ApiRequest {
    dakgg_request(url).accept_error_status()
}

fn resource_request(url: impl Into<String>, path: impl Into<PathBuf>) -> ResourceRequest {
    let mut request = ApiRequest::new("", url)
        .header("User-Agent", DAKGG_USER_AGENT)
        .resource();
    request.method = Method::GET;
    ResourceRequest {
        request,
        path: path.into(),
    }
}

fn name_found_check(nickname: &str, body: &[u8]) -> Result<()> {
    let json = serde_json::from_slice::<Value>(body)?;
    let status = json
        .get("error")
        .and_then(|error| error.get("status"))
        .and_then(Value::as_i64);
    if status == Some(404) {
        return Err(RequestError::NicknameNotFound(nickname.to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn image_item_bg_uses_relative_resource_path_and_protocol_relative_url() {
        let resource = EternalReturnDakGgApi::image_url_item_bg("4");
        assert_eq!(
            resource.request.full_url(),
            "https://cdn.dak.gg/er/images/item/ico-itemgradebg-04.svg"
        );
        assert_eq!(
            resource.path,
            PathBuf::from("resources/images/item/bg/4.svg")
        );
    }

    #[test]
    fn image_character_rewrites_requested_image_type() {
        let resource = EternalReturnDakGgApi::image_url_character(
            "https://cdn.test/CharProfile/skin.png",
            12,
            34,
            DakGgCharacterImgType::CharResult,
        );
        assert_eq!(
            resource.request.full_url(),
            "https://cdn.test/CharResult/skin.png"
        );
        assert_eq!(
            resource.path,
            PathBuf::from("resources/images/character/12/CharResult/34.png")
        );
    }

    #[test]
    fn game_url_encodes_nickname_and_season_query_param() {
        assert_eq!(
            game_url(
                "玩家 A",
                Some("season type/1"),
                MatchingMode::Rank,
                DakGgTeamMode::Squad,
                2,
            ),
            "/v1/players/%E7%8E%A9%E5%AE%B6%20A/matches?season=season%20type%2F1&matchingMode=RANK&teamMode=SQUAD&page=2"
        );
    }
    #[tokio::test]
     async fn character_analysis_url() {
         println!("{:?}", EternalReturnDakGgApi::character_analysis("Bernice", "SQUAD", "RANK", Some("diamond_plus")).await)
    }
}
