import type { MatchDetail } from "./search";
import type { EquipRender } from "./search";

/**
 * 单局对局详情：包含所有队伍与玩家（队友 + 敌人）。
 * 对应后端 service::match_render::MatchDetailRender（serde camelCase）。
 */
export interface MatchDetailRender {
  gameId: string;
  mode: string;
  season: number;
  version: string;
  matchSize: number;
  serverName: string;
  startDate: string;
  durationSec: number;
  teams: TeamRender[];
  killLog: KillLogEntry[];
}

export interface TeamRender {
  teamNumber: number;
  rank: number;
  totalKill: number;
  /** 同队内的组队分组（每个子数组为一组 userNum）。 */
  premadeGroups: number[][];
  players: MatchPlayerRender[];
}

export interface MatchPlayerRender {
  userNum: number;
  nickname: string;
  /** 是否为被搜索的玩家本人。 */
  isSelf: boolean;
  /** 该玩家所属组队分组下标（队内），无组队为 null。 */
  premadeGroupId: number | null;
  characterName: string;
  characterAvatarUrl: string;
  weaponUrl: string;
  weaponId: number;
  tacticalSkillUrl: string;
  tacticalSkillId: number;
  traitSkillUrl: string;
  traitSkillId: number;
  traitSkillGroupUrl: string;
  traitSkillGroupId: number;
  level: number;
  kill: number;
  death: number;
  assist: number;
  dmg: number;
  detail: MatchDetail;
  /** 通过无人机传送的物品。 */
  creditDrone: ItemRef[];
  /** 通过信用控制台传送的物品。 */
  creditKiosk: ItemRef[];
  /** 该玩家最终装备。 */
  equips: EquipRender[];
  /** 该玩家击杀的对象（被杀者）。 */
  kills: KillRef[];
  /** 击杀该玩家的对象（击杀者）。 */
  deaths: KillRef[];
  /** 死亡地区名称（最多三次）。 */
  deathRegions: string[];
  /** 钴协议购买的灌注：id → 数量。 */
  boughtInfusions: InfusionStack[];
}

export interface KillRef {
  userNum: number;
  nickname: string;
  count: number;
}

export interface InfusionStack {
  id: number;
  count: number;
}

export interface ItemRef {
  id: number;
}

export interface KillLogEntry {
  timeSec: number;
  killerUserNum: number | null;
  victimUserNum: number;
  kind: string;
  weaponName: string | null;
}
