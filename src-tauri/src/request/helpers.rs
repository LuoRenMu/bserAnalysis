pub(crate) fn encode_component(value: &str) -> String {
    urlencoding::encode(value).into_owned()
}

pub(crate) fn mask_nickname(nickname: &str) -> String {
    let mut chars = nickname.chars();
    match chars.next() {
        Some(first) => format!("{first}***"),
        None => "***".to_string(),
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
    fn mask_nickname_keeps_first_character_only() {
        assert_eq!(mask_nickname("玩家A"), "玩***");
        assert_eq!(mask_nickname(""), "***");
    }
}
