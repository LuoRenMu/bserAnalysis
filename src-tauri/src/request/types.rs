use crate::request::dakgg_api::EternalReturnDakGgApi;
use crate::request::error::Result;
use crate::request::models::DakGgCharacterImgType;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchingMode {
    Normal,
    Rank,
    Cobalt,
    Union,
    Lonely,
    All,
}

impl MatchingMode {
    pub fn value(self) -> i32 {
        match self {
            Self::Normal => 2,
            Self::Rank => 3,
            Self::Cobalt => 6,
            Self::Union => 8,
            Self::Lonely => 9,
            Self::All => 0,
        }
    }

    pub fn dak_gg_mode(self) -> &'static str {
        match self {
            Self::Normal => "NORMAL",
            Self::Rank => "RANK",
            Self::Cobalt => "COBALT",
            Self::Union => "UNION",
            Self::Lonely => "LONE_WOLF",
            Self::All => "ALL",
        }
    }

    pub fn from_value(value: Option<i32>) -> Self {
        match value {
            Some(2) => Self::Normal,
            Some(3) => Self::Rank,
            Some(6) => Self::Cobalt,
            Some(8) => Self::Union,
            Some(9) => Self::Lonely,
            Some(0) => Self::All,
            _ => Self::Rank,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchingTeamMode {
    Lonely,
    Double,
    Squad,
    Cobalt,
    All,
}

impl MatchingTeamMode {
    pub fn value(self) -> i32 {
        match self {
            Self::Lonely => 1,
            Self::Double => 2,
            Self::Squad => 3,
            Self::Cobalt => 4,
            Self::All => 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DakGgTeamMode {
    All,
    Solo,
    Duo,
    Squad,
    Cobalt,
}

impl DakGgTeamMode {
    pub fn value(self) -> &'static str {
        match self {
            Self::All => "ALL",
            Self::Solo => "SOLO",
            Self::Duo => "DUO",
            Self::Squad => "SQUAD",
            Self::Cobalt => "COBALT",
        }
    }

    pub fn from_value(value: Option<&str>) -> Self {
        match value.unwrap_or_default().to_ascii_uppercase().as_str() {
            "ALL" => Self::All,
            "SOLO" => Self::Solo,
            "DUO" => Self::Duo,
            "SQUAD" => Self::Squad,
            "COBALT" => Self::Cobalt,
            _ => Self::Squad,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DakGgServerName {
    Asia,
    Asia2,
    Asia3,
    Na,
    Eu,
    Sa,
    Global,
}

impl DakGgServerName {
    pub fn value(self) -> &'static str {
        match self {
            Self::Asia => "seoul",
            Self::Asia2 => "asia2",
            Self::Asia3 => "asia3",
            Self::Na => "ohio",
            Self::Eu => "frankfurt",
            Self::Sa => "saopaulo",
            Self::Global => "global",
        }
    }

    pub fn from_value(value: Option<&str>) -> Self {
        match value.unwrap_or_default().to_ascii_lowercase().as_str() {
            "seoul" | "asia" => Self::Asia,
            "asia2" => Self::Asia2,
            "asia3" => Self::Asia3,
            "ohio" | "na" => Self::Na,
            "frankfurt" | "eu" | "europe" => Self::Eu,
            "saopaulo" | "sa" => Self::Sa,
            "global" => Self::Global,
            _ => Self::Asia,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DakGgRank {
    DiamondPlus,
    MithrilPlus,
    MeteoritePlus,
    PlatinumPlus,
    Gold,
    Silver,
    Bronze,
    Iron,
    In1000,
}

impl DakGgRank {
    pub fn value(self) -> &'static str {
        match self {
            Self::DiamondPlus => "diamond_plus",
            Self::MithrilPlus => "mithril_plus",
            Self::MeteoritePlus => "meteorite_plus",
            Self::PlatinumPlus => "platinum_plus",
            Self::Gold => "gold",
            Self::Silver => "silver",
            Self::Bronze => "bronze",
            Self::Iron => "iron",
            Self::In1000 => "in1000",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResourcesType {
    Weapon,
    Character,
    Item,
    TacticalSkill,
    TraitSkill,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageResourcesType {
    Weapon,
    TierFull,
    TierRound,
    Character,
    Item,
    ItemBg,
    TacticalSkill,
    TraitSkill,
    TraitSkillGroupPlaceholder,
    TraitSkillGroup,
}

impl ImageResourcesType {
    pub const TRAIT_SKILL_GROUP_PLACEHOLDER_WILSON_URL: &'static str =
        "//cdn.dak.gg/er/images/common/img-placeholder-wilson-round.png";

    fn path_and_extension(self) -> (&'static str, &'static str) {
        match self {
            Self::Weapon => ("/weapon/", ".png"),
            Self::TierFull => ("/tier/full/", ".png"),
            Self::TierRound => ("/tier/round/", ".png"),
            Self::Character => ("/character/", ".png"),
            Self::Item => ("/item/", ".png"),
            Self::ItemBg => ("/item/bg/", ".svg"),
            Self::TacticalSkill => ("/tactical/skill/", ".png"),
            Self::TraitSkill => ("/trait/skill/", ".png"),
            Self::TraitSkillGroupPlaceholder => ("/trait/group/wilson", ".png"),
            Self::TraitSkillGroup => ("/trait/group/", ".png"),
        }
    }

    pub async fn general_path(self, name: impl AsRef<str>) -> Result<String> {
        let (base, extension) = self.path_and_extension();
        let mut name = name.as_ref().to_string();
        if self == Self::TraitSkillGroup && name.chars().all(|c| c.is_ascii_digit()) {
            let id = name.parse::<i64>().unwrap_or_default();
            let trait_skills = EternalReturnDakGgApi::get_trait_skills().await?;
            if let Some(skill) = trait_skills.get_trait_skill_by_id(id) {
                name = skill.group.clone();
            }
        }

        Ok(format!("resources/images{base}{name}{extension}"))
    }

    pub fn character_path(
        self,
        character_id: i32,
        skin_id: i64,
        img_type: DakGgCharacterImgType,
    ) -> String {
        let (_, extension) = self.path_and_extension();
        format!(
            "resources/images/character/{}/{}/{}{}",
            character_id,
            img_type.value(),
            skin_id,
            extension
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn character_path_is_relative_to_workspace_resources() {
        assert_eq!(
            ImageResourcesType::Character.character_path(
                1,
                1001,
                DakGgCharacterImgType::CharProfile
            ),
            "resources/images/character/1/CharProfile/1001.png"
        );
    }
}
