pub mod dakgg_api;
pub mod error;
mod helpers;
pub mod manager;
pub mod models;
pub mod official_api;
pub mod open_api;
pub mod types;

pub use dakgg_api::EternalReturnDakGgApi;
pub use error::{RequestError, Result};
pub use official_api::EternalReturnOfficialApi;
pub use open_api::EternalReturnOpenApi;
