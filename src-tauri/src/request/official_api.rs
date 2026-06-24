use crate::request::{
    error::Result,
    manager::{ApiRequest, REQUEST_MANAGER},
    models::EternalReturnNews,
};

const BASE_URL: &str = "https://playeternalreturn.com/api/v1/";

pub struct EternalReturnOfficialApi;

impl EternalReturnOfficialApi {
    pub async fn get_news() -> Result<EternalReturnNews> {
        let api = ApiRequest::new(BASE_URL, "posts/news?page=1&search_type=title&search_text=")
            .header(
                "Accept-language",
                "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            );
        REQUEST_MANAGER.call_json(&api).await
    }
}
