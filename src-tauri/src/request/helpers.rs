pub(crate) fn encode_component(value: &str) -> String {
    urlencoding::encode(value).into_owned()
}

#[derive(Debug, Default)]
pub(crate) struct QueryParams {
    pairs: Vec<(String, String)>,
}

impl QueryParams {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    pub(crate) fn push(mut self, key: impl AsRef<str>, value: impl ToString) -> Self {
        self.pairs.push((
            encode_component(key.as_ref()),
            encode_component(&value.to_string()),
        ));
        self
    }

    pub(crate) fn push_optional(mut self, key: impl AsRef<str>, value: Option<&str>) -> Self {
        if let Some(value) = value {
            self = self.push(key, value);
        }
        self
    }

    pub(crate) fn build_path(self, path: impl Into<String>) -> String {
        let mut path = path.into();
        if self.pairs.is_empty() {
            return path;
        }

        let separator = if path.contains('?') { '&' } else { '?' };
        path.push(separator);
        path.push_str(
            &self
                .pairs
                .into_iter()
                .map(|(key, value)| format!("{key}={value}"))
                .collect::<Vec<_>>()
                .join("&"),
        );
        path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_component_matches_url_query_requirements() {
        assert_eq!(encode_component("season type/1"), "season%20type%2F1");
    }

    #[test]
    fn query_params_skip_absent_optional_values() {
        let path = QueryParams::new()
            .push_optional("season", None)
            .push("matchingMode", "RANK")
            .push("teamMode", "SQUAD")
            .push("page", 2)
            .build_path("/v1/players/test/matches");

        assert_eq!(
            path,
            "/v1/players/test/matches?matchingMode=RANK&teamMode=SQUAD&page=2"
        );
    }

    #[test]
    fn query_params_encode_values() {
        let path = QueryParams::new()
            .push("season", "season type/1")
            .build_path("/v1/data");

        assert_eq!(path, "/v1/data?season=season%20type%2F1");
    }
}
