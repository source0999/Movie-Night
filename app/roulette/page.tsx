"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMovieLibrary } from "../../hooks/useMovieLibrary";
import {
  isWatchlistItemPassed,
  itemMatchesGenreFilter,
  recommendedByLabel,
  type LibraryItem,
  type LibraryMediaType,
} from "../../lib/movieLibrary";
import { expandFairWheelSlots, recordRouletteWin } from "../../lib/rouletteWeights";
import { normalizeSeenIt } from "../../lib/watchlistGroup";
import { tmdbGenreLabel } from "../../src/lib/tmdbGenres";
import SpinningWheel from "../../components/SpinningWheel";
import ConfettiBurst from "../../components/ConfettiBurst";

type RecommenderFilter = "everyone" | "Alex" | "Britton" | "Nabi";

const SPIN_KINDS: Array<{ value: LibraryMediaType; label: string }> = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "misc", label: "Misc" },
];

const RECOMMENDER_OPTIONS: Array<{ value: RecommenderFilter; label: string }> = [
  { value: "everyone", label: "Everyone" },
  { value: "Alex", label: "Alex" },
  { value: "Britton", label: "Britton" },
  { value: "Nabi", label: "Nabi" },
];

/** Genres need at least this many eligible titles so random pick is meaningful. */
const MIN_TITLES_PER_GENRE_OPTION = 2;

function matchesRecommender(
  item: LibraryItem,
  filter: RecommenderFilter,
): boolean {
  if (filter === "everyone") return true;
  const rec = item.recommendedBy?.trim().toLowerCase() ?? "";
  return rec === filter.toLowerCase();
}

function nobodyHasSeenIt(item: LibraryItem): boolean {
  const s = normalizeSeenIt(item);
  return !s.alex && !s.britton && !s.nabi;
}

/** Pool before genre: passed excluded, media tab, recommender, pure unseen. */
function buildPoolBeforeGenre(
  watchlist: LibraryItem[],
  spinKind: LibraryMediaType,
  recommender: RecommenderFilter,
  pureUnseenOnly: boolean,
): LibraryItem[] {
  let pool = watchlist.filter((m) => !isWatchlistItemPassed(m));
  pool = pool.filter((m) => m.mediaType === spinKind);
  pool = pool.filter((m) => matchesRecommender(m, recommender));
  if (pureUnseenOnly) {
    pool = pool.filter(nobodyHasSeenIt);
  }
  return pool;
}

export default function RoulettePage() {
  const searchParams = useSearchParams();
  const { hydrated, library } = useMovieLibrary();
  const watchlistAll = library.watchlist;

  const [spinKind, setSpinKind] = useState<LibraryMediaType>("movie");
  const [recommenderFilter, setRecommenderFilter] =
    useState<RecommenderFilter>("everyone");
  const [pureUnseenOnly, setPureUnseenOnly] = useState(false);
  const [genreChoice, setGenreChoice] = useState<string>("all");

  const [winner, setWinner] = useState<LibraryItem | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    if (winner) {
      recordRouletteWin(winner.recommendedBy);
    }
  }, [winner]);

  useEffect(() => {
    const raw = searchParams.get("media")?.toLowerCase();
    if (raw === "movie" || raw === "tv" || raw === "misc") {
      setSpinKind(raw);
    }
  }, [searchParams]);

  const notPassedPool = useMemo(
    () => watchlistAll.filter((m) => !isWatchlistItemPassed(m)),
    [watchlistAll],
  );

  const basePool = useMemo(
    () =>
      buildPoolBeforeGenre(
        watchlistAll,
        spinKind,
        recommenderFilter,
        pureUnseenOnly,
      ),
    [watchlistAll, spinKind, recommenderFilter, pureUnseenOnly],
  );

  /** Genres with enough titles in the current pool for random selection (Movies/TV). */
  const genreOptions = useMemo(() => {
    if (spinKind !== "movie" && spinKind !== "tv") return [];
    const ids = new Set<number>();
    for (const m of basePool) {
      for (const id of m.genreIds ?? []) ids.add(id);
    }
    const withCounts = [...ids].filter((id) => {
      const n = basePool.filter((m) => itemMatchesGenreFilter(m, id)).length;
      return n >= MIN_TITLES_PER_GENRE_OPTION;
    });
    return withCounts.sort((a, b) =>
      tmdbGenreLabel(a).localeCompare(tmdbGenreLabel(b)),
    );
  }, [basePool, spinKind]);

  useEffect(() => {
    if (genreChoice === "all") return;
    const n = Number.parseInt(genreChoice, 10);
    if (!Number.isFinite(n) || !genreOptions.includes(n)) {
      setGenreChoice("all");
    }
  }, [genreChoice, genreOptions]);

  const genreApplies = spinKind === "movie" || spinKind === "tv";
  const selectedGenreId =
    !genreApplies || genreChoice === "all"
      ? null
      : Number.parseInt(genreChoice, 10);
  const effectiveGenreId =
    selectedGenreId !== null && Number.isFinite(selectedGenreId)
      ? selectedGenreId
      : null;

  const eligible = useMemo(
    () =>
      basePool.filter((m) => itemMatchesGenreFilter(m, effectiveGenreId)),
    [basePool, effectiveGenreId],
  );

  const wheelSlots = useMemo(
    () => (eligible.length === 0 ? [] : expandFairWheelSlots(eligible)),
    [eligible],
  );

  const passedCount = watchlistAll.length - notPassedPool.length;

  const recommenderDisplay = winner
    ? recommendedByLabel(winner.recommendedBy)
    : "Someone";

  const instruction = useMemo(() => {
    if (!hydrated) return "Syncing…";
    if (watchlistAll.length === 0) {
      return "Add items to your Watchlist to spin.";
    }
    if (notPassedPool.length === 0 && passedCount > 0) {
      return "Everything is marked Pass — un-pass titles in the Library to spin again.";
    }
    if (eligible.length === 0) {
      return "Nothing matches these filters. Try another genre or tab.";
    }
    if (eligible.length < 2) {
      return "Need at least two eligible titles (passed items are excluded).";
    }
    return `${eligible.length} titles — list shuffle.`;
  }, [
    hydrated,
    watchlistAll.length,
    notPassedPool.length,
    eligible.length,
    passedCount,
  ]);

  const allWatchlistPassed =
    watchlistAll.length > 0 && notPassedPool.length === 0;

  const showEmptyState =
    !winner &&
    hydrated &&
    (watchlistAll.length === 0 ||
      allWatchlistPassed ||
      eligible.length === 0 ||
      (eligible.length < 2 && notPassedPool.length > 0));

  const spinAreaKey = `${spinKind}-${recommenderFilter}-${pureUnseenOnly}-${genreChoice}`;

  return (
    <div className="min-h-screen bg-zinc-50 py-8 text-zinc-900 dark:bg-black dark:text-zinc-50 sm:py-12">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 sm:px-6">
        <header className="mb-8 w-full text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Roulette
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {instruction}
          </p>
        </header>

        {hydrated && watchlistAll.length > 0 ? (
          <section
            className="mb-10 w-full space-y-5 rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-6"
            aria-label="Roulette options"
          >
            <div>
              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Library
              </p>
              <div
                className="flex flex-wrap justify-center gap-2"
                role="group"
                aria-label="Media type"
              >
                {SPIN_KINDS.map((opt) => {
                  const active = spinKind === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSpinKind(opt.value)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 dark:bg-violet-500"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="roulette-genre"
                className="block text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Genre
              </label>
              <select
                id="roulette-genre"
                value={genreApplies ? genreChoice : "all"}
                disabled={!genreApplies}
                onChange={(e) => setGenreChoice(e.target.value)}
                className="mx-auto block w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-medium text-zinc-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-violet-400 dark:focus:ring-violet-400/20 sm:text-left"
              >
                <option value="all">All genres</option>
                {genreOptions.map((id) => (
                  <option key={id} value={String(id)}>
                    {tmdbGenreLabel(id)}
                  </option>
                ))}
              </select>
              {!genreApplies ? (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Genres apply to Movies and TV (movie database). Misc uses every
                  eligible link.
                </p>
              ) : genreOptions.length === 0 &&
                basePool.some((m) => (m.genreIds?.length ?? 0) > 0) ? (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Genres need at least two titles with your current filters to
                  appear here. Use All genres or relax filters.
                </p>
              ) : genreOptions.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No genre data yet. Save titles from search so movie database
                  genres are stored, or pick All genres.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="roulette-recommender"
                className="block text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Recommended by
              </label>
              <select
                id="roulette-recommender"
                value={recommenderFilter}
                onChange={(e) =>
                  setRecommenderFilter(e.target.value as RecommenderFilter)
                }
                className="mx-auto block w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-medium text-zinc-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-violet-400 dark:focus:ring-violet-400/20 sm:text-left"
              >
                {RECOMMENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {spinKind !== "misc" ? (
              <label className="flex cursor-pointer items-start justify-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40 sm:justify-start">
                <input
                  type="checkbox"
                  checked={pureUnseenOnly}
                  onChange={(e) => setPureUnseenOnly(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 dark:border-zinc-600"
                />
                <span className="text-left">
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Pure unseen only
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                    Alex, Britton, and Nabi have not marked “Seen it” yet.
                  </span>
                </span>
              </label>
            ) : null}
          </section>
        ) : null}

        {winner ? null : showEmptyState ? (
          <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">
              {watchlistAll.length === 0
                ? "Your Watchlist is empty."
                : allWatchlistPassed
                  ? "Everything on your Watchlist is marked Pass."
                  : eligible.length === 0
                    ? "Nothing matches these filters."
                    : "Not enough titles to spin."}
            </p>
            <p className="mt-2">
              {watchlistAll.length === 0
                ? "Add movies, TV, or misc links first."
                : allWatchlistPassed
                  ? "Un-pass titles in the Library. Passed items never qualify to spin."
                  : eligible.length === 0
                    ? "Try All genres, a different tab, or Everyone."
                    : "Add more titles or relax filters so at least two qualify."}
            </p>
            <Link
              href="/library"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
            >
              Open Library
            </Link>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center">
            <SpinningWheel
              key={spinAreaKey}
              slots={wheelSlots}
              onWinner={(w) => {
                setWinner(w);
                setConfettiKey((k) => k + 1);
              }}
            />
          </div>
        )}
      </div>

      {winner ? (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 text-center text-white sm:p-6">
          <div className="absolute inset-0 opacity-30">
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_45%)]" />
          </div>

          <div
            className="pointer-events-none absolute inset-0 digital-glitch-overlay"
            key={confettiKey}
          />

          <ConfettiBurst
            key={confettiKey}
            active={true}
            intensity="celebration"
            durationMs={4200}
          />

          <div className="relative z-[110] w-full max-w-lg px-2">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Winner!
            </h2>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-md dark:bg-black/30">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90">
                Tonight&apos;s pick
              </p>
              <p className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">
                {winner.title}
              </p>
              <p className="mt-5 text-lg font-medium leading-relaxed text-white/95 sm:text-xl">
                Recommended by {recommenderDisplay}
                <span className="text-cyan-200"> — Let&apos;s watch!</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWinner(null)}
              className="mt-10 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-zinc-100"
            >
              Spin again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
