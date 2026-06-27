import { memo, useCallback, useEffect, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  characterBriefAtom,
  fetchCharactersAtom,
  seasonListAtom,
  characterLeaderboardResultAtom,
  characterLeaderboardLoadingAtom,
  characterLeaderboardErrorAtom,
  characterLeaderboardCharacterIdAtom,
  characterLeaderboardSeasonKeyAtom,
  characterLeaderboardTeamModeAtom,
  characterLeaderboardSortTypeAtom,
  characterLeaderboardPageAtom,
  fetchCharacterLeaderboardAtom,
  fetchSeasonsAtom,
  searchPlayerAtom,
  searchQueryAtom,
} from "../store";
import type { CharacterLeaderboardRow } from "../types/leaderboard";
import { ErrorBanner, PageShell, RankBadge, RefreshIcon, Segmented } from "../components/ui";

const TEAM_MODE_OPTIONS = [
  { label: "排位", value: "SQUAD" },
  { label: "钴协议", value: "COBALT" },
];

const SORT_TYPE_OPTIONS = [
  { label: "场次", value: "MATCH_COUNT" },
  { label: "段位", value: "TIER" },
  { label: "胜率", value: "WIN_RATE" },
];

const GRID =
  "grid grid-cols-[60px_minmax(180px,1fr)_110px_72px_72px_72px_86px_86px_86px_100px] items-center gap-2";

const CharacterLeaderboardTableRow = memo(function CharacterLeaderboardTableRow({
  row,
  characterImageUrl,
  sortType,
  onSelect
}: {
  row: CharacterLeaderboardRow;
  characterImageUrl: string;
  sortType: string;
  onSelect: (name: string) => void
}) {
  return (
    <div className={`${GRID} border-t border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800`}>
      <RankBadge rank={row.rank} />

      <button type="button" onClick={() => onSelect(row.nickname)} className="flex min-w-0 items-center gap-2.5 text-left">
        <img
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
          src={characterImageUrl}
          alt=""
        />
        <div className="min-w-0 truncate font-semibold text-neutral-900 hover:underline dark:text-neutral-100">
          {row.nickname}
        </div>
      </button>

      <div className="flex items-center justify-end gap-2">
        {row.tierImageUrl && (
          <img className="h-7 w-7 shrink-0" src={row.tierImageUrl} alt={row.tierName} title={row.tierName} />
        )}
        <div className="text-right leading-tight">
          <div className={`font-bold tabular-nums ${sortType === "TIER" ? "text-[#ca9372]" : "text-neutral-700 dark:text-neutral-300"}`}>{row.rp}</div>
          {row.tierName && <div className="truncate text-[10px] text-neutral-500">{row.tierName}</div>}
        </div>
      </div>
      <div className={`text-right tabular-nums ${sortType === "MATCH_COUNT" ? "font-bold text-[#ca9372]" : "text-neutral-700 dark:text-neutral-300"}`}>{row.matchCount}</div>
      <div className={`text-right tabular-nums ${sortType === "WIN_RATE" ? "font-bold text-[#ca9372]" : "text-neutral-700 dark:text-neutral-300"}`}>{row.winRate}</div>
      <div className="text-right tabular-nums text-neutral-700 dark:text-neutral-300">{row.top3Rate}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgRank}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgKill}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgAssist}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgDamage.toLocaleString()}</div>
    </div>
  );
});

export default function CharacterLeaderboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const characters = useAtomValue(characterBriefAtom);
  const seasons = useAtomValue(seasonListAtom);
  const result = useAtomValue(characterLeaderboardResultAtom);
  const loading = useAtomValue(characterLeaderboardLoadingAtom);
  const error = useAtomValue(characterLeaderboardErrorAtom);

  const [characterId, setCharacterId] = useAtom(characterLeaderboardCharacterIdAtom);
  const [seasonKey, setSeasonKey] = useAtom(characterLeaderboardSeasonKeyAtom);
  const [teamMode, setTeamMode] = useAtom(characterLeaderboardTeamModeAtom);
  const [sortType, setSortType] = useAtom(characterLeaderboardSortTypeAtom);
  const [page, setPage] = useAtom(characterLeaderboardPageAtom);

  const fetchCharacters = useSetAtom(fetchCharactersAtom);
  const fetchCharacterLeaderboard = useSetAtom(fetchCharacterLeaderboardAtom);
  const fetchSeasons = useSetAtom(fetchSeasonsAtom);

  const setSearchQuery = useSetAtom(searchQueryAtom);
  const searchPlayer = useSetAtom(searchPlayerAtom);

  // 初始化：获取角色列表
  useEffect(() => {
    if (characters.length === 0) {
      void fetchCharacters();
    }
  }, [fetchCharacters, characters.length]);

  // 初始化：获取赛季列表
  useEffect(() => {
    if (seasons.length === 0) {
      void fetchSeasons();
    }
  }, [fetchSeasons, seasons.length]);

  // 从 URL 参数读取 characterId
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      const id = Number.parseInt(idParam, 10);
      if (!Number.isNaN(id)) {
        setCharacterId(id);
      }
    }
  }, [searchParams, setCharacterId]);

  // 当 characterId 变化时，自动加载数据
  useEffect(() => {
    if (characterId && !result) {
      void fetchCharacterLeaderboard();
    }
  }, [characterId, result, fetchCharacterLeaderboard]);

  const seasonOptions = useMemo(() => {
    return seasons.map((s) => ({ label: s.name, value: s.key }));
  }, [seasons]);

  const handleCharacterChange = (id: number) => {
    if (loading || id === characterId) return;
    setCharacterId(id);
    setPage(1);
    navigate(`/character-leaderboard?id=${id}`);
    void fetchCharacterLeaderboard({ characterId: id, page: 1 });
  };

  const handleSeasonChange = (value: string) => {
    if (loading || value === seasonKey) return;
    setSeasonKey(value);
    setPage(1);
    void fetchCharacterLeaderboard({ seasonKey: value, page: 1 });
  };

  const handleTeamModeChange = (value: string) => {
    if (loading || value === teamMode) return;
    setTeamMode(value);
    setPage(1);
    void fetchCharacterLeaderboard({ teamMode: value, page: 1 });
  };

  const handleSortTypeChange = (value: string) => {
    if (loading || value === sortType) return;
    setSortType(value);
    setPage(1);
    void fetchCharacterLeaderboard({ sortType: value, page: 1 });
  };

  const handleRefresh = () => {
    if (loading || !characterId) return;
    void fetchCharacterLeaderboard({ page });
  };

  const handlePlayerSelect = useCallback((name: string) => {
    setSearchQuery(name);
    void searchPlayer({ nickname: name, page: 1 });
    navigate("/search");
  }, [navigate, searchPlayer, setSearchQuery]);

  return (
    <PageShell>
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-950 dark:text-neutral-50">英雄排行榜</h1>
            <div className="mt-1 text-xs text-neutral-500">
              {result?.updatedAt && <span>更新于 {result.updatedAt}</span>}
              {result?.totalCount ? <span> / 共 {result.totalCount} 名玩家</span> : null}
              {result?.minMatchCount ? <span> / 最低 {result.minMatchCount} 场</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">赛季</span>
            <select
              value={seasonKey}
              onChange={(e) => handleSeasonChange(e.target.value)}
              disabled={loading}
              className="h-8 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
            >
              {seasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">英雄</span>
            <div className="max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleCharacterChange(char.id)}
                    disabled={loading}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all disabled:cursor-wait disabled:opacity-60 ${
                      characterId === char.id
                        ? "bg-[#ca9372]/10 ring-2 ring-[#ca9372]"
                        : "opacity-70 hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className={`text-[10px] leading-tight text-center line-clamp-2 ${
                      characterId === char.id
                        ? "font-semibold text-[#ca9372]"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}>
                      {char.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">模式</span>
              <Segmented options={TEAM_MODE_OPTIONS} value={teamMode} onChange={handleTeamModeChange} disabled={loading} />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">排序</span>
              <Segmented options={SORT_TYPE_OPTIONS} value={sortType} onChange={handleSortTypeChange} disabled={loading} />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || !characterId}
              title="刷新排行榜"
              aria-label="刷新排行榜"
              className="group ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <RefreshIcon
                className={`h-4 w-4 transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-180"}`}
              />
            </button>
          </div>
        </div>

        <ErrorBanner message={error} />

        {!characterId && !loading && (
          <div className="rounded-lg border border-neutral-200 bg-white px-3 py-16 text-center text-sm font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            请选择一个英雄查看排行榜
          </div>
        )}

        {characterId && result && (
          <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-255">
              <div className={`${GRID} bg-neutral-800 px-3 py-2.5 text-xs font-semibold text-white`}>
                <div className="text-center">排名</div>
                <div>玩家</div>
                <div className="text-right">段位 / RP</div>
                <div className="text-right">场次</div>
                <div className="text-right">胜率</div>
                <div className="text-right">TOP3</div>
                <div className="text-right">平均名次</div>
                <div className="text-right">平均击杀</div>
                <div className="text-right">平均助攻</div>
                <div className="text-right">平均伤害</div>
              </div>

              {result.rows.map((row) => (
                <CharacterLeaderboardTableRow
                  key={row.nickname}
                  row={row}
                  characterImageUrl={result.characterImageUrl}
                  sortType={sortType}
                  onSelect={handlePlayerSelect}
                />
              ))}

              {result.rows.length === 0 && (
                <div className="px-3 py-16 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {loading ? "加载中..." : "暂无数据"}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mt-4 h-6 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {loading && characterId ? "加载中..." : ""}
        </div>
    </PageShell>
  );
}
