import type { RefKind } from "../utils/gameData";

export interface PlayerSearchRender {
  mmrStats?: PlayerMmrStats | null;
  nickname: string;
  profileImageUrl: string;
  level: number;
  data: PlayerData;
  matches: PlayerMatchData[];
  recentPlayers: PlayerRecentPlay[];
  characterUseStats: CharacterUseStats[];
  season: string;
  seasonId:number;
  mode: string;
  summary?: PlayerSummary | null;
  page: number;
  totalPage: number;
  nextPage?: number | null;
  hasNext: boolean;
}

export interface PlayerData {
  tierImageUrl: string;
  rpName: string;
  rp: string;
  play: number;
  avgTk: string;
  avgKill: string;
  avgRank: string;
  avgDmg: string;
  avgAssists: string;
  top1: string;
  top2: string;
  top3: string;
  avgAnimal: string;
  avgCredit: string;
  avgVision: string;
  kda: string;
}

export interface PlayerMmrStats {
  dates: string[];
  values: number[];
}

export interface PlayerRecentPlay {
  imageUrl: string;
  plays: number;
  nickname: string;
  winRate: string;
  avgRank: string;
}

export interface CharacterUseStats {
  characterName: string;
  imageUrl: string;
  winRate: string;
  characterPlay: number;
  getRp: number;
  avgRank: string;
  avgDmg: number;
}

export interface PlayerOverviewRender {
  level: number;
  totalPlay: number;
  characters: CharacterUseStats[];
}

export interface PlayerSummary {
  count: number;
  avgRank: string;
  wins: string;
  avgTk: string;
  ranks: number[];
  avgDmg: string;
}

export interface PlayerMatchData {
  level: number;
  rp: number;
  rpChange: number;
  serverName: string;
  nickname: string;
  characterName: string;
  rank: number;
  typeName: string;
  modeId: number;
  kill: number;
  tk: number;
  assist: number;
  equips: EquipRender[];
  weaponUrl: string;
  weaponId: number;
  tacticalSkillUrl: string;
  tacticalSkillId: number;
  traitSkillUrl: string;
  traitSkillId: number;
  traitSkillGroupUrl: string;
  traitSkillGroupId: number;
  characterAvatarUrl: string;
  dateHour: string;
  dateMonth: string;
  gameId: string;
  dmg: number;
  routeId: string;
  version: string;
  kda: number;
  ranked: boolean;
  detail: MatchDetail;
}

export interface EquipRender {
  itemId: number;
  itemBgUrl: string;
  itemUrl: string;
}

export interface MatchDetail {
  dmgTakenDirect: number;
  dmgTakenItemSkill: number;
  dmgTakenUniqueSkill: number;
  healAmount: number;
  teamRecover: number;
  protectAbsorb: number;
  ccTime: number;
  monsterKill: number;
  extraKill: number;
  bestWeaponLevel: number;
  mastery: MasteryRender[];
  skillAmp: number;
  creditSources: CreditSource[];
  craftUncommon: number;
  craftRare: number;
  craftEpic: number;
  craftLegend: number;
  boughtInfusion: string;
  addSurveillance: number;
  addTelephoto: number;
  removeSurveillance: number;
  removeTelephoto: number;
  useHyperLoop: number;
  useSecurityConsole: number;
  usedPairLoop: number;
  fishingCount: number;
  emoticonCount: number;
  duration: number;
  survivableTime: number;
  playTime: number;
  watchTime: number;
  deathsPhase: [number, number, number];
  teamDown: number;
  teamBattleZoneDown: number;
  teamRepeatDown: number;
  escapeState: number;
  giveUp: boolean;
  leftEarly: boolean;
  placeOfStart: string;
  restrictedAreaAccelerated: number;
  safeAreas: number;
  criticalStrikeDamage: number;
  coolDownReduction: number;
  lifeSteal: number;
  normalLifeSteal: number;
  skillLifeSteal: number;
  amplifierToMonster: number;
  bonusExp: number;
  mmrBefore: number;
  mmrGainInGame: number;
  mmrLossEntryCost: number;
  kFactor: number;
  rankPoint: number;
}

export interface MasteryRender {
  key: string;
  level: number;
}

export interface CreditSource {
  key: string;
  amount: number;
}

// --- Search 页面 UI 渲染类型（原在 Search.tsx 文件内定义） ---

/** 技能图标展示用的数据 */
export interface SkillIcon {
  url: string;
  kind: RefKind;
  id: number;
}

/** StatsTable / RankSummary 的表格行 */
export interface TableRow {
  name: string;
  plays: string;
  image: string;
  rp?: string;
  avgRank: string;
  avgDmg?: string;
  winRate?: string;
}

/** 对局卡片渲染数据，由 mapRender 从 PlayerMatchData 组装 */
export interface UiMatch {
  raw: PlayerMatchData;
  gameId: string;
  version: string;
  rank: string;
  mode: string;
  time: string;
  date: string;
  accent: string;
  character: string;
  characterImage: string;
  level: number;
  modeId: number;
  skills: SkillIcon[];
  kda: string;
  damage: string;
  rp: string;
  rpDiff: number;
  route: string;
  boughtInfusion: string;
  equipment: EquipRender[];
  ranked: boolean;
  kdaRatio: string;
}
