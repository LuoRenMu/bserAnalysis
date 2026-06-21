use std::{
    collections::HashMap,
    sync::{LazyLock, RwLock},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::time::sleep;

use crate::request::{
    dakgg_api::EternalReturnDakGgApi,
    error::{RequestError, Result},
    helpers::{encode_component, mask_nickname},
    manager::{ApiRequest, ResponseBytes, REQUEST_MANAGER},
    models::{
        now_local_naive, BaseGameDataResponse, BattleUserGamesResponse, GameDataSeasonResponse,
        UserNickNameResponse, UserStatsResponse,
    },
    types::{MatchingMode, MatchingTeamMode},
};

static API_KEY_HEADERS: LazyLock<RwLock<HashMap<String, String>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

const BASE_URL: &str = "https://open-api.bser.io";

pub struct EternalReturnOpenApi;

impl EternalReturnOpenApi {
    pub fn set_api_key_headers(headers: HashMap<String, String>) {
        let mut current = API_KEY_HEADERS.write().expect("api key map poisoned");
        *current = headers;
    }

    pub async fn get_id_by_nickname(nickname: &str) -> Result<UserNickNameResponse> {
        let encoded = encode_component(nickname);
        let api = open_request(
            format!("/v1/user/nickname?query={encoded}"),
        );
        let response = open_call(&api).await?;
        let body: Value = serde_json::from_slice(&response.bytes)?;

        if response.status == 404 || json_code_is_404(&body) {
            return Err(RequestError::NicknameNotFound(mask_nickname(nickname)));
        }

        if !response.is_success() {
            return Err(response.status_error(&api));
        }

        Ok(serde_json::from_value(body)?)
    }

    pub async fn get_user_stats_v1(user_id: &str, season_id: i32) -> Result<UserStatsResponse> {
        Self::open_json(
            format!("/v1/user/stats/uid/{user_id}/{season_id}"),
        )
        .await
    }

    pub async fn get_user_stats_v2(
        user_id: &str,
        season_id: i32,
        matching_mode: MatchingMode,
    ) -> Result<UserStatsResponse> {
        Self::open_json(
            format!(
                "/v2/user/stats/uid/{user_id}/{season_id}/{}",
                matching_mode.value()
            ),
        )
        .await
    }

    pub async fn get_games_by_user_id(user_id: &str) -> Result<BattleUserGamesResponse> {
        Self::open_json(format!("/v1/user/games/uid/{user_id}")).await
    }

    pub async fn get_game_by_game_id(game_id: i64) -> Result<BattleUserGamesResponse> {
        Self::open_json(format!("/v1/games/{game_id}")).await
    }

    pub async fn get_game_data_hash() -> Result<BaseGameDataResponse<Value>> {
        Self::open_json("/v2/data/hash").await
    }

    pub async fn get_game_data_season() -> Result<GameDataSeasonResponse> {
        let seasons: BaseGameDataResponse<Vec<GameDataSeasonResponse>> =
            Self::open_json("/v1/data/Season").await?;
        let season = seasons
            .data
            .into_iter()
            .find(|season| season.is_current == 1)
            .ok_or_else(|| RequestError::NotFound("current season".to_string()))?;

        if season.season_end < now_local_naive() {
            let dakgg_season = EternalReturnDakGgApi::get_current_season().await?;
            if dakgg_season.id != season.season_id {
                return Ok(dakgg_season.convert());
            }
        }

        Ok(season)
    }

    pub async fn get_game_data_by_meta_type(
        meta_type: &str,
    ) -> Result<BaseGameDataResponse<Value>> {
        Self::open_json(format!("/v2/data/{meta_type}")).await
    }

    pub async fn get_global_rank(
        season_id: i32,
        matching_team_mode: MatchingTeamMode,
    ) -> Result<Value> {
        Self::open_json(
            format!("/v1/rank/top/{season_id}/{}", matching_team_mode.value()),
        )
        .await
    }

    async fn open_json<T>(url: impl Into<String>) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let api = open_request(url);
        let response = open_call(&api).await?;
        response.ensure_success(&api)?;
        Ok(serde_json::from_slice(&response.bytes)?)
    }
}

fn open_request(url: impl Into<String>) -> ApiRequest {
    let mut api = ApiRequest::new(BASE_URL, url);
    for (key, value) in API_KEY_HEADERS.read().expect("api key map poisoned").iter() {
        api.headers.insert(key.clone(), value.clone());
    }
    api.accept_error_status()
}

async fn open_call(api: &ApiRequest) -> Result<ResponseBytes> {
    loop {
        let response = REQUEST_MANAGER.call(api).await?;
        let body = serde_json::from_slice::<Value>(&response.bytes).unwrap_or(Value::Null);
        match body.get("message").and_then(Value::as_str) {
            Some("Too Many Requests") => sleep(random_retry_delay()).await,
            Some("Forbidden") => return Err(RequestError::Forbidden),
            _ => return Ok(response),
        }
    }
}

fn random_retry_delay() -> Duration {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_millis() as u64)
        .unwrap_or_default();
    Duration::from_millis(1000 + (millis % 2000))
}

fn json_code_is_404(body: &Value) -> bool {
    match body.get("code") {
        Some(Value::String(code)) => code == "404",
        Some(Value::Number(code)) => code.as_i64() == Some(404),
        _ => false,
    }
}
