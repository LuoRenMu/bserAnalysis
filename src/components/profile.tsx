import type { GameSnapshot, PlayerEntry, CharacterBrief } from "../types/bser";
import type { CharacterUseStats, PlayerSummary } from "../types/search";
import { resolveCharacterName, resolvePlayerName, type AppSettings } from "../utils/settings";

/** Per-player frequently-used-character stats, fetched asynchronously. */
export interface PlayerStats {
  loading: boolean;
  error?: string;
  level?: number;
  /** Total ranked games: denominator for the usage rate. */
  totalPlay?: number;
  characters?: CharacterUseStats[];
  /** Player summary stats (from recent 20 games) */
  summary?: PlayerSummary;
  /** Tier info */
  tierImageUrl?: string;
  tierName?: string;
}

export type PlayerStatsByName = Readonly<Record<string, PlayerStats>>;
/** Character id → brief (name/image), used to resolve each player's picked character. */
export type CharactersById = Readonly<Record<number, CharacterBrief>>;

const MAX_CHARACTERS = 4;

export function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function usageRate(play: number, totalPlay?: number): string {
  if (!totalPlay || totalPlay <= 0) return "-";
  return `${Math.min(100, (play / totalPlay) * 100).toFixed(1)}%`;
}

function CharacterRow({
  stat,
  totalPlay,
  settings,
}: {
  stat: CharacterUseStats;
  totalPlay?: number;
  settings?: AppSettings | null;
}) {
  const rate = usageRate(stat.characterPlay, totalPlay);
  const pct = totalPlay && totalPlay > 0 ? Math.min(100, (stat.characterPlay / totalPlay) * 100) : 0;
  const characterName = resolveCharacterName(settings, stat.characterName);

  return (
    <div className="flex items-center gap-2 py-1">
      <img className="h-8 w-8 rounded-full object-cover" src={stat.imageUrl} alt={characterName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100">{characterName}</span>
          <span className="shrink-0 text-xs font-bold text-[#ca9372]">{rate}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
          <div className="h-full rounded bg-[#ca9372]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
          <span>{stat.characterPlay} 场 / 胜率 {stat.winRate}</span>
          <span>伤害 {stat.avgDmg.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({
  nickname,
  stats,
  selectedCharacter,
  settings,
}: {
  nickname: string;
  stats: PlayerStats;
  selectedCharacter?: CharacterBrief;
  settings?: AppSettings | null;
}) {
  const characters = stats.characters ?? [];
  const displayNickname = resolvePlayerName(settings, nickname);
  const selectedCharacterName = selectedCharacter
    ? resolveCharacterName(settings, selectedCharacter.name)
    : "";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="mb-2 flex items-center gap-2">
        {selectedCharacter ? (
          <img
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#ca9372]"
            src={selectedCharacter.imageUrl}
            alt={selectedCharacterName}
            title={selectedCharacterName}
          />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">{displayNickname}</div>
          <div className="truncate text-[11px] font-semibold text-[#ca9372]">
            {selectedCharacter ? selectedCharacterName : "未选择"}
          </div>
        </div>
        {stats.level != null && (
          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Lv.{stats.level}
          </span>
        )}
      </div>

      {/* 段位和近20场统计 */}
      {(stats.tierImageUrl || stats.summary) && (
        <div className="mb-2 flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/50">
          {stats.tierImageUrl && (
           <div>
             <img className="h-8 w-8 shrink-0 object-contain" src={stats.tierImageUrl} alt={stats.tierName || "Tier"} />
             <span className="ml-1 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">{stats.tierName}</span>
           </div>
          )}
          <div className="min-w-0 flex-1 text-[10px]">
            {(stats.totalPlay ?? 0)  > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                  {stats.summary ? `近${stats.summary.count}场` : `共${stats.totalPlay}场`}
                </span>
                {stats.summary && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.summary.wins}胜</span>
                )}
              </div>
            )}
            {stats.summary && (
              <div className="mt-0.5 flex items-center justify-between gap-2 text-neutral-500 dark:text-neutral-400">
                <span>平均伤害</span>
                <span className="font-semibold">{stats.summary.avgDmg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {stats.loading && <div className="py-2 text-center text-xs text-neutral-500">Loading...</div>}
      {stats.error && <div className="py-2 text-center text-xs text-red-500 dark:text-red-400">{stats.error}</div>}
      {!stats.loading && !stats.error && characters.length === 0 && (

        <div className="py-2 text-center text-xs text-neutral-500">No frequent characters</div>
      )}

      {characters.slice(0, MAX_CHARACTERS).map((stat) => (
        <CharacterRow key={stat.characterName} stat={stat} totalPlay={stats.totalPlay} settings={settings} />
      ))}
    </div>
  );
}

function visiblePlayers(snapshot: GameSnapshot): PlayerEntry[] {
  return snapshot.raw
    .filter((entry) => entry.name.trim().length > 0)
    .sort((left, right) => left.team_id - right.team_id || left.user_id - right.user_id);
}

export interface ProfileViewProps {
    snapshot: GameSnapshot;
    statsByName?: PlayerStatsByName;
    charactersById?: CharactersById;
    settings?: AppSettings | null;
}

/** 覆盖层仪表板：队伍分组 + 玩家卡片列表。 */
export function ProfileView({ snapshot, statsByName = {}, charactersById = {}, settings }: ProfileViewProps) {
    const players = visiblePlayers(snapshot);
    return (
        <div className="h-full overflow-auto bg-neutral-100 p-4 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{snapshot.nickname || "Overlay"}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {players.length} players / mode {snapshot.matching_mode} / team {snapshot.matching_team_mode}
                    </div>
                </div>
                <div className="shrink-0 rounded border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {snapshot.is_battle_started ? "Battle" : snapshot.is_character_select_open ? "Pick" : "Lobby"}
                </div>
            </div>

            {players.length === 0 ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-400">
                    Waiting for player data...
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {players.map((player) => {
                        const nickname = player.name.trim();
                        const stats = statsByName[normalizeName(nickname)] ?? { loading: true };
                        const selectedCharacter = charactersById[player.character_id];

                        return (
                            <div key={`${player.team_id}-${player.user_id}-${nickname}`} className="min-w-0">
                                <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                                    <span>Team {player.team_id}</span>
                                    <span>#{player.rank > 0 ? player.rank : "-"}</span>
                                </div>
                                <PlayerCard nickname={nickname} stats={stats} selectedCharacter={selectedCharacter} settings={settings} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
