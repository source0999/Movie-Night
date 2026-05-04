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
import EmptyCard from "../../components/EmptyCard";

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

const chipBase =
  "shrink-0 snap-start rounded-xl border px-3 py-2.5 text-sm font-semibold transition touch-manipulation";

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
      queueMicrotask(() => setSpinKind(raw));
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
      queueMicrotask(() => setGenreChoice("all"));
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

  const genreHint = !genreApplies ? (
    <p className="text-center text-xs text-mn-fg-muted">
      Genres apply to Movies and TV (movie database). Misc uses every eligible
      link.
    </p>
  ) : genreOptions.length === 0 &&
    basePool.some((m) => (m.genreIds?.length ?? 0) > 0) ? (
    <p className="text-center text-xs text-mn-fg-muted">
      Genres need at least two titles with your current filters to appear here.
      Use All genres or relax filters.
    </p>
  ) : genreOptions.length === 0 ? (
    <p className="text-center text-xs text-mn-fg-muted">
      No genre data yet. Save titles from search so movie database genres are
      stored, or pick All genres.
    </p>
  ) : null;

  return (
    <div className="min-h-screen py-8 text-mn-fg sm:py-12 pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 sm:px-6">
        <header className="mb-8 w-full text-center">
          <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-bold tracking-tight sm:text-4xl">
            Roulette
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-mn-fg-muted">
            {instruction}
          </p>
        </header>

        {hydrated && watchlistAll.length > 0 ? (
          <section
            className="mb-10 w-full space-y-5 rounded-2xl border border-mn-border bg-mn-card/95 p-5 shadow-[var(--mn-shadow-soft)] sm:p-6"
            aria-label="Roulette options"
          >
            <div>
              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-mn-fg-muted">
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
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition touch-manipulation ${
                        active
                          ? "bg-mn-accent text-mn-bg shadow-[var(--mn-shadow-glow)]"
                          : "border border-mn-border bg-mn-input text-mn-fg hover:bg-mn-card-elev"
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
              <p
                id="roulette-genre-label"
                className="block text-center text-[11px] font-bold uppercase tracking-[0.18em] text-mn-fg-muted"
              >
                Genre
              </p>

              <div
                className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory touch-pan-x"
                role="listbox"
                aria-labelledby="roulette-genre-label"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={genreChoice === "all"}
                  disabled={!genreApplies}
                  onClick={() => setGenreChoice("all")}
                  className={`${chipBase} ${
                    genreChoice === "all"
                      ? "border-mn-accent-strong bg-mn-accent/15 text-mn-accent"
                      : "border-mn-border bg-mn-input text-mn-fg"
                  } disabled:opacity-50`}
                >
                  All genres
                </button>
                {genreOptions.map((id) => {
                  const sel = genreChoice === String(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      onClick={() => setGenreChoice(String(id))}
                      className={`${chipBase} ${
                        sel
                          ? "border-mn-accent-strong bg-mn-accent/15 text-mn-accent"
                          : "border-mn-border bg-mn-input text-mn-fg"
                      }`}
                    >
                      {tmdbGenreLabel(id)}
                    </button>
                  );
                })}
              </div>

              <select
                id="roulette-genre"
                value={genreApplies ? genreChoice : "all"}
                disabled={!genreApplies}
                onChange={(e) => setGenreChoice(e.target.value)}
                aria-labelledby="roulette-genre-label"
                className="mx-auto hidden w-full max-w-md rounded-xl border border-mn-border bg-mn-input px-3 py-3 text-center text-sm font-medium text-mn-fg shadow-sm outline-none focus:border-mn-border-strong focus:ring-2 focus:ring-mn-focus/25 disabled:cursor-not-allowed disabled:opacity-60 sm:block sm:text-left"
              >
                <option value="all">All genres</option>
                {genreOptions.map((id) => (
                  <option key={id} value={String(id)}>
                    {tmdbGenreLabel(id)}
                  </option>
                ))}
              </select>
              {genreHint}
            </div>

            <div className="space-y-2">
              <p
                id="roulette-recommender-label"
                className="block text-center text-[11px] font-bold uppercase tracking-[0.18em] text-mn-fg-muted"
              >
                Recommended by
              </p>

              <div
                className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory touch-pan-x"
                role="listbox"
                aria-labelledby="roulette-recommender-label"
              >
                {RECOMMENDER_OPTIONS.map((o) => {
                  const sel = recommenderFilter === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      onClick={() => setRecommenderFilter(o.value)}
                      className={`${chipBase} ${
                        sel
                          ? "border-mn-accent-strong bg-mn-accent/15 text-mn-accent"
                          : "border-mn-border bg-mn-input text-mn-fg"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              <select
                id="roulette-recommender"
                value={recommenderFilter}
                onChange={(e) =>
                  setRecommenderFilter(e.target.value as RecommenderFilter)
                }
                aria-labelledby="roulette-recommender-label"
                className="mx-auto hidden w-full max-w-md rounded-xl border border-mn-border bg-mn-input px-3 py-3 text-center text-sm font-medium text-mn-fg shadow-sm outline-none focus:border-mn-border-strong focus:ring-2 focus:ring-mn-focus/25 sm:block sm:text-left"
              >
                {RECOMMENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {spinKind !== "misc" ? (
              <label className="flex cursor-pointer items-start justify-center gap-3 rounded-xl border border-mn-border bg-mn-input/80 px-3 py-3 sm:justify-start">
                <input
                  type="checkbox"
                  checked={pureUnseenOnly}
                  onChange={(e) => setPureUnseenOnly(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-mn-border focus:ring-mn-focus/30"
                  style={{ accentColor: "var(--mn-accent)" }}
                />
                <span className="text-left">
                  <span className="block text-sm font-semibold text-mn-fg">
                    Pure unseen only
                  </span>
                  <span className="mt-0.5 block text-xs text-mn-fg-muted">
                    Alex, Britton, and Nabi have not marked “Seen it” yet.
                  </span>
                </span>
              </label>
            ) : null}
          </section>
        ) : null}

        {winner ? null : showEmptyState ? (
          <EmptyCard
            title={
              watchlistAll.length === 0
                ? "Your Watchlist is empty."
                : allWatchlistPassed
                  ? "Everything on your Watchlist is marked Pass."
                  : eligible.length === 0
                    ? "Nothing matches these filters."
                    : "Not enough titles to spin."
            }
            description={
              watchlistAll.length === 0
                ? "Add movies, TV, or misc links first."
                : allWatchlistPassed
                  ? "Un-pass titles in the Library. Passed items never qualify to spin."
                  : eligible.length === 0
                    ? "Try All genres, a different tab, or Everyone."
                    : "Add more titles or relax filters so at least two qualify."
            }
          >
            <Link
              href="/library"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-mn-accent px-5 py-3 text-sm font-semibold text-mn-bg transition hover:opacity-90"
            >
              Open Library
            </Link>
          </EmptyCard>
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-mn-bg p-4 text-center text-mn-fg sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden
          >
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--mn-accent)_40%,transparent),transparent_60%)]" />
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

          <div className="relative z-[110] flex w-full max-w-lg flex-col items-center px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <h2 className="text-4xl font-black tracking-tight text-mn-fg sm:text-5xl">
              Winner!
            </h2>

            <div className="mt-8 w-full rounded-2xl border border-mn-border-strong bg-mn-modal/90 p-6 text-left shadow-[var(--mn-shadow-soft)] backdrop-blur-md sm:text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-mn-accent">
                Tonight&apos;s pick
              </p>
              <p className="mt-3 text-2xl font-bold leading-snug text-mn-fg sm:text-3xl">
                {winner.title}
              </p>
              <p className="mt-5 text-lg font-medium leading-relaxed text-mn-fg-muted sm:text-xl">
                Recommended by {recommenderDisplay}
                <span className="text-mn-accent"> — Let&apos;s watch!</span>
              </p>
            </div>

            <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="mn-btn-press inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-mn-accent px-6 py-3 text-center text-sm font-semibold text-mn-bg shadow-[var(--mn-shadow-soft)] transition hover:opacity-95"
              >
                Add to tonight
              </Link>
              <button
                type="button"
                onClick={() => setWinner(null)}
                className="mn-btn-press inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-mn-border bg-mn-input px-6 py-3 text-sm font-semibold text-mn-fg transition hover:bg-mn-card-elev"
              >
                Spin again
              </button>
            </div>
            <p className="mt-4 max-w-md text-center text-xs text-mn-fg-muted">
              Pick another from your library anytime — filters stay as you left
              them.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
