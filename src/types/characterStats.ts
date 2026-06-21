export interface CharacterStatsItem {
  characterId: number;
  characterName: string;
  characterImageUrl: string;
  characterTier: string;
  characterTierScore: number;
  weaponId: number;
  weaponName: string;
  weaponImageUrl: string;
  matchCount: number;
  avgRp: number;
  avgDamage: number;
  avgSight: number;
  winRate: number;
  top3Rate: number;
  avgTeamKill: number;
  avgPlayerKill: number;
  pickRate: number;
}

export interface CharacterStatsRender {
  items: CharacterStatsItem[];
  updatedAt: string;
  matchingMode: string;
  teamMode: string;
  tier?: string;
  patch?: string;
  dt: number;
}
