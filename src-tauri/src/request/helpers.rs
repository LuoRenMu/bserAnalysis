pub(crate) fn encode_component(value: &str) -> String {
    urlencoding::encode(value).into_owned()
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_component_matches_url_query_requirements() {
        assert_eq!(encode_component("season type/1"), "season%20type%2F1");
    }

}
