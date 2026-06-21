export interface LeaderboardRender {
  season: string;
  seasonId: number;
  server: string;
  teamMode: string;
  updatedAt: string;
  totalCount: number;
  page: number;
  totalPage: number;
  nextPage?: number | null;
  hasNext: boolean;
  cutoffs: LeaderboardCutoff[];
  rows: LeaderboardRow[];
}

export interface LeaderboardCutoff {
  tierName: string;
  tierImageUrl: string;
  mmr: number;
}

export interface LeaderboardRow {
  rank: number;
  rankDiff: number;
  userNum: number;
  nickname: string;
  tierImageUrl: string;
  tierName: string;
  rp: number;
  winRate: string;
  top3Rate: string;
  avgRank: string;
  avgKill: string;
  playCount: number;
  characters: LeaderboardCharacter[];
}

export interface LeaderboardCharacter {
  characterName: string;
  imageUrl: string;
  pickRate: string;
}

export interface CharacterLeaderboardRender {
  characterId: number;
  characterKey: string;
  characterName: string;
  characterImageUrl: string;
  seasonKey: string;
  teamMode: string;
  sortType: string;
  minMatchCount: number;
  totalCount: number;
  updatedAt: string;
  rows: CharacterLeaderboardRow[];
}

export interface CharacterLeaderboardRow {
  rank: number;
  nickname: string;
  tierName: string;
  tierImageUrl: string;
  rp: number;
  matchCount: number;
  winRate: string;
  top3Rate: string;
  avgRank: string;
  avgKill: string;
  avgAssist: string;
  avgDamage: number;
}

export interface SeasonBrief {
  id: number;
  key: string;
  name: string;
  isCurrent: boolean;
}
