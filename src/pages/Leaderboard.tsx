import { useEffect, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import {
  fetchLeaderboardAtom,
  leaderboardErrorAtom,
  leaderboardLoadingAtom,
  leaderboardPageAtom,
  leaderboardResultAtom,
  leaderboardServerAtom,
  leaderboardSeasonIdAtom,
  searchPlayerAtom,
  searchQueryAtom,
  seasonListAtom,
  fetchSeasonsAtom,
} from "../store";
import type { LeaderboardCharacter, LeaderboardRow } from "../types/leaderboard";
import { calculateVisiblePages } from "../utils/pagination";
import { ErrorBanner, PageShell, PaginationNav, RankBadge, RefreshIcon, Segmented } from "../components/ui";

const SERVER_OPTIONS = [
  { label: "亚服", value: "seoul" },
  { label: "亚服2", value: "asia2" },
  { label: "亚服3", value: "asia3" },
  { label: "美服", value: "ohio" },
  { label: "欧服", value: "frankfurt" },
  { label: "南美", value: "saopaulo" },
  { label: "全球", value: "global" },
];

const GRID =
  "grid grid-cols-[60px_minmax(180px,1fr)_110px_72px_72px_86px_86px_68px_minmax(180px,220px)] items-center gap-2";

const PAGE_BUTTON_LIMIT = 10;

function CharacterUsage({ character }: { character: LeaderboardCharacter }) {
  return (
    <div className="flex w-12 flex-col items-center gap-1" title={character.characterName}>
      <img
        className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
        src={character.imageUrl}
        alt={character.characterName}
      />
      <span className="text-[10px] font-bold leading-none tabular-nums text-[#ca9372]">{character.pickRate}</span>
    </div>
  );
}

function LeaderboardTableRow({ row, delta, onSelect }: { row: LeaderboardRow; delta?: number; onSelect: (name: string) => void }) {
  const mainCharacter = row.characters[0];

  return (
    <div className={`${GRID} border-t border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800`}>
      <RankBadge rank={row.rank} delta={delta} />

      <button type="button" onClick={() => onSelect(row.nickname)} className="flex min-w-0 items-center gap-2.5 text-left">
        <img
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
          src={mainCharacter?.imageUrl ?? row.tierImageUrl}
          alt={row.nickname}
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
          <div className="font-bold tabular-nums text-[#ca9372]">{row.rp}</div>
          {row.tierName && <div className="truncate text-[10px] text-neutral-500">{row.tierName}</div>}
        </div>
      </div>
      <div className="text-right tabular-nums text-neutral-700 dark:text-neutral-300">{row.winRate}</div>
      <div className="text-right tabular-nums text-neutral-700 dark:text-neutral-300">{row.top3Rate}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgRank}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.avgKill}</div>
      <div className="text-right tabular-nums text-neutral-500">{row.playCount}</div>

      <div className="flex items-start justify-end gap-3">
        {row.characters.length > 0 ? (
          row.characters.map((character) => <CharacterUsage key={`${row.userNum}-${character.characterName}`} character={character} />)
        ) : (
          <div className="self-center text-neutral-500">-</div>
        )}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const result = useAtomValue(leaderboardResultAtom);
  const loading = useAtomValue(leaderboardLoadingAtom);
  const error = useAtomValue(leaderboardErrorAtom);
  const [page, setPage] = useAtom(leaderboardPageAtom);
  const [server, setServer] = useAtom(leaderboardServerAtom);
  const [seasonId, setSeasonId] = useAtom(leaderboardSeasonIdAtom);
  const fetchLeaderboard = useSetAtom(fetchLeaderboardAtom);

  const navigate = useNavigate();
  const setSearchQuery = useSetAtom(searchQueryAtom);
  const searchPlayer = useSetAtom(searchPlayerAtom);

  const seasons = useAtomValue(seasonListAtom);
  const fetchSeasons = useSetAtom(fetchSeasonsAtom);

  useEffect(() => {
    if (!result) void fetchLeaderboard();
  }, [fetchLeaderboard, result]);

  useEffect(() => {
    void fetchSeasons();
  }, [fetchSeasons]);

  const visiblePages = calculateVisiblePages(page, result?.totalPage ?? 0, PAGE_BUTTON_LIMIT);

  // dak.gg 的 rankDiff 实测恒为 0，所以排名涨跌由本地对比上一次看到的排名得出
  const snapshotKey = result ? `lb_ranks_${server}__${result.seasonId}` : null;

  const rankDeltas = useMemo(() => {
    const deltas = new Map<number, number>();
    if (!result || !snapshotKey || !Array.isArray(result.rows)) return deltas;
    let prev: Record<string, number>;
    try {
      prev = JSON.parse(localStorage.getItem(snapshotKey) ?? "{}");
    } catch {
      prev = {};
    }
    for (const row of result.rows) {
      const prevRank = prev[row.userNum];
      if (typeof prevRank === "number") deltas.set(row.userNum, prevRank - row.rank);
    }
    return deltas;
  }, [result, snapshotKey]);

  useEffect(() => {
    if (!result || !snapshotKey || !Array.isArray(result.rows)) return;
    let prev: Record<string, number>;
    try {
      prev = JSON.parse(localStorage.getItem(snapshotKey) ?? "{}");
    } catch {
      prev = {};
    }
    for (const row of result.rows) prev[row.userNum] = row.rank;
    try {
      localStorage.setItem(snapshotKey, JSON.stringify(prev));
    } catch {
      /* localStorage 不可用/已满 —— 忽略，仅影响涨跌显示 */
    }
  }, [result, snapshotKey]);

  const handleServerChange = (value: string) => {
    if (loading || value === server) return;
    setServer(value);
    setPage(1);
    void fetchLeaderboard({ server: value, page: 1 });
  };

  const handleSeasonChange = (value: string) => {
    if (loading) return;
    const newSeasonId = value === "current" ? null : parseInt(value, 10);
    if (newSeasonId === seasonId) return;
    setSeasonId(newSeasonId);
    setPage(1);
    void fetchLeaderboard({ seasonId: newSeasonId, page: 1 });
  };

  const handleRefresh = () => {
    if (loading) return;
    void fetchLeaderboard({});
  };

  const handlePageChange = (nextPage: number) => {
    const totalPage = result?.totalPage ?? 0;
    const normalized = Math.max(1, totalPage > 0 ? Math.min(nextPage, totalPage) : nextPage);
    if (normalized === page) return;
    setPage(normalized);
    void fetchLeaderboard({ page: normalized });
  };

  const handlePlayerSelect = (name: string) => {
    setSearchQuery(name);
    void searchPlayer({ nickname: name, page: 1 });
    navigate("/search");
  };

  return (
    <PageShell>
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-neutral-950 dark:text-neutral-50">排行榜</h1>
            <div className="mt-1 text-xs text-neutral-500">
              {result?.season ?? "-"}
              {result?.updatedAt && <span> / 更新于 {result.updatedAt}</span>}
              {result?.totalCount ? <span> / 共 {result.totalCount} 名玩家</span> : null}
            </div>
          </div>

          {result && result.cutoffs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {result.cutoffs.map((cutoff) => (
                <div
                  key={cutoff.tierName + cutoff.mmr}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <img className="h-5 w-5" src={cutoff.tierImageUrl} alt={cutoff.tierName} />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{cutoff.tierName}</span>
                  <span className="text-xs font-bold tabular-nums text-[#ca9372]">{cutoff.mmr}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">服务器</span>
            <Segmented options={SERVER_OPTIONS} value={server} onChange={handleServerChange} disabled={loading} />
          </div>
          {seasons.length > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">赛季</span>
              <select
                value={seasonId === null ? "current" : String(seasonId)}
                onChange={(e) => handleSeasonChange(e.target.value)}
                disabled={loading}
                className="h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none disabled:cursor-wait disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="刷新排行榜"
            aria-label="刷新排行榜"
            className="group ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <RefreshIcon
              className={`h-4 w-4 transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-180"}`}
            />
          </button>
        </div>

        <ErrorBanner message={error} />

        {(result && result.totalCount != 0) ? (<section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-255">
            <div className={`${GRID} bg-neutral-800 px-3 py-2.5 text-xs font-semibold text-white`}>
              <div className="text-center">排名</div>
              <div>玩家</div>
              <div className="text-right">段位 / RP</div>
              <div className="text-right">胜率</div>
              <div className="text-right">TOP3</div>
              <div className="text-right">平均名次</div>
              <div className="text-right">平均击杀</div>
              <div className="text-right">场次</div>
              <div className="text-right">常用英雄 / 使用率</div>
            </div>

            {Array.isArray(result?.rows) && result.rows.map((row) => (
                <LeaderboardTableRow key={row.userNum} row={row} delta={rankDeltas.get(row.userNum)} onSelect={handlePlayerSelect} />
            ))}
          </div>
        </section>) : loading ? ( <div className="rounded-lg border border-neutral-200 bg-white px-3 py-16 text-center text-sm font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">加载中...</div>) :(
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-16 text-center text-sm font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              没有数据
            </div>
          )}

        {visiblePages.length > 0 && (
          <PaginationNav
            page={page}
            visiblePages={visiblePages}
            loading={loading}
            hasNext={result?.hasNext}
            nextPage={result?.nextPage}
            onPageChange={handlePageChange}
          />
        )}
    </PageShell>
  );
}
