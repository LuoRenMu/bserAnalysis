/** One entry of the trailing array (stride 0x38 = 56 bytes). */
export interface PlayerEntry {
  /** entry+0x00 userId (in-game) / UserNum (lobby). */
  user_id: number;
  /** entry+0x08 team ID. */
  team_id: number;
  /** entry+0x0c character ID（角色ID）. */
  character_id: number;
  /** entry+0x10 weapon ID（武器ID）. */
  weapon_id: number;
  /** entry+0x14 rank (in-game only; -1 in lobby). */
  rank: number;
  /** entry+0x18 name / NickName (31 bytes + NUL). */
  name: string;
}

/** Snapshot of game state parsed from the shared DLL record (1888 bytes). */
export interface GameSnapshot {
  // --- header fields -------------------------------------------------------

  /** dword[0] — command/state echo (+0x00). */
  command: number;
  /** UserService._instance.User.UserNum (+0x08). */
  user_num: number;
  /** Player nickname (+0x10, NUL-terminated, ≤31 bytes). */
  nickname: string;
  /** UserService._instance.User.Level (+0x30). */
  level: number;
  /** GlobalUserData.matchingRegion (+0x34). */
  matching_region: number;
  /** GlobalUserData.matching_mode (+0x38). */
  matching_mode: number;
  /** GlobalUserData.matchingTeamMode (+0x3c). */
  matching_team_mode: number;
  /** GlobalUserData.botDifficulty (+0x40). */
  bot_difficulty: number;
  /** GlobalUserData.lastGameId (+0x48). */
  last_game_id: number;

  // --- scene / state flags -------------------------------------------------

  /** LoadingView.IsOpen (+0x50). */
  is_loading_open: boolean;
  /** GameLobbyUI.IsOpenCharacterSelectWindow (+0x51). */
  is_character_select_open: boolean;
  /** LobbyService.LobbyState (+0x52). */
  lobby_state: boolean;
  /** ClientService.GamePlayPhase (+0x53). */
  game_play_phase: boolean;
  /** ClientService.IsGameStarted (+0x54). */
  is_game_started: boolean;
  /** ClientService.IsBattleStarted (+0x55). */
  is_battle_started: boolean;
  /** ClientService.IsGameEnd (+0x56). */
  is_game_end: boolean;
  /** LobbyService.isGameResult (+0x57). */
  is_game_result: boolean;
  /** IsReplay (+0x58). */
  is_replay: boolean;
  /** Number of valid entries in the array (+0x5c, capped at 32). */
  entry_count: number;

  // --- player entries ------------------------------------------------------

  /** Parsed player entries (up to 32). */
  raw: PlayerEntry[];
}

/** Character id → name/image, from the dak.gg character list (fetch_characters). */
export interface CharacterBrief {
  id: number;
  name: string;
  imageUrl: string;
  /** Roles (archetypes, "None" stripped) used to group the character grid. */
  roles: string[];
}

/** One stat row: base value plus per-level growth (fetch_character_analysis). */
export interface CharacterStatRow {
  label: string;
  base: number;
  perLevel: number;
}

export interface CharacterSkinRender {
  id: number;
  name: string;
  grade: number;
  imageUrl: string;
}

/** Character detail parsed from the dak.gg character page (fetch_character_analysis). */
export interface CharacterDetailRender {
  id: number;
  name: string;
  title: string;
  imageUrl: string;
  archetypes: string[];
  weaponTypes: string[];
  stats: CharacterStatRow[];
  skins: CharacterSkinRender[];
  analysis: CharacterAnalysisRender | null;
}

export interface SkillRankRender {
  q: number;
  w: number;
  e: number;
  r: number;
  t: number;
}

export interface SkillSlotRender {
  id: number;
  slot: string;
  name: string;
  iconUrl: string;
}

export interface SkillBuildRender {
  priority: string[];
  order: string[];
  pickRate: number;
  winRate: number;
}

/** Item / tactical / augment pick row. bgUrl is only set for items. */
export interface PickRender {
  id: number;
  name: string;
  iconUrl: string;
  bgUrl: string;
  pickRate: number;
  winRate: number;
}

export interface ItemBuildRender {
  items: PickRender[];
  order: PickRender[];
  pickRate: number;
  winRate: number;
}

export interface AugmentRender {
  core: PickRender;
  subs: PickRender[];
}

export interface WeaponBuildRender {
  weapon: string;
  iconUrl: string;
  tier: string;
  tierScore: number;
  games: number;
  pickRate: number;
  winRate: number;
  top3Rate: number;
  avgRank: number;
  avgKills: number;
  avgMmrGain: number;
  rank: number;
  rankSize: number;
  skills: SkillSlotRender[];
  skillBuilds: SkillBuildRender[];
  itemBuilds: ItemBuildRender[];
  tacticals: PickRender[];
  augments: AugmentRender[];
  /** 钴协议灌注选择率（普通/排位为空）。 */
  infusions: PickRender[];
}

export interface TopPlayerRender {
  name: string;
  mmr: number;
  tierName: string;
  tierIconUrl: string;
}

export interface WeaponRouteRender {
  id: number;
  title: string;
  author: string;
  weapon: string;
  winRate: number;
  likes: number;
}

export interface CharacterAnalysisRender {
  patch: number;
  tier: string;
  matchingMode: number;
  teamMode: number;
  updatedAt: number;
  totalGames: number;
  characterGames: number;
  pickRate: number;
  characterTier: string;
  patches: number[];
  maxSkillRank: SkillRankRender;
  weapons: WeaponBuildRender[];
  topPlayers: TopPlayerRender[];
  routes: WeaponRouteRender[];
}

/** Reference entry (item / tactical / trait / weapon) for hover tooltips (fetch_game_reference). */
export interface RefEntry {
  id: number;
  name: string;
  tooltip: string;
  imageUrl: string;
}

export interface SkillRef {
  id: number;
  name: string;
  tooltip: string;
  imageUrl: string;
  characterId: number;
  slot: string;
}

export interface GameReference {
  items: RefEntry[];
  skills: SkillRef[];
  tacticalSkills: RefEntry[];
  traitSkills: RefEntry[];
  weapons: RefEntry[];
  infusions: InfusionRef[];
}

/** 钴协议灌注引用：id（boughtInfusion 的 key）→ 名称/图标。 */
export interface InfusionRef {
  id: number;
  productType: string;
  name: string;
  imageUrl: string;
  tooltip: string;
}
