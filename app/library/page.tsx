"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMovieLibrary } from "../../hooks/useMovieLibrary";
import {
  categoryLabels,
  copyGenreIdsForPersist,
  libraryTabLabels,
  mergeWatchedRatingPatch,
  recommendedByLabel,
  youtubeVideoIdFromUrl,
  type LibraryCategory,
  type LibraryItem,
  type LibraryMediaType,
} from "../../lib/movieLibrary";
import SaveMoviePromptModal from "../../components/SaveMoviePromptModal";
import WatchlistCardRatingsRow from "../../components/WatchlistCardRatingsRow";
import EmptyCard from "../../components/EmptyCard";
import {
  PassedRibbon,
  WatchlistGroupControls,
} from "../../components/WatchlistGroupControls";
import { calculateGroupAverage } from "../../lib/movieLibrary";
import { useAuth } from "../../hooks/useAuth";
import {
  everyoneHasSeenIt,
  normalizeSeenIt,
  seenPersonForMovieNightUser,
  setSeenTrueForPerson,
} from "../../lib/watchlistGroup";

const posterBase = "https://image.tmdb.org/t/p/w500";

function releaseYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

const ALL_CATEGORIES: LibraryCategory[] = ["watchlist", "watched"];

const LIBRARY_TABS: LibraryMediaType[] = ["movie", "tv", "misc"];

export default function LibraryPage() {
  const [libraryTab, setLibraryTab] = useState<LibraryMediaType>("movie");
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>("watchlist");
  const { user } = useAuth();
  const {
    hydrated,
    library,
    removeMovie,
    moveMovie,
    patchLibraryItem,
  } = useMovieLibrary();

  const allInCategory = library[activeCategory];
  const movies = allInCategory.filter((m) => m.mediaType === libraryTab);

  const isWatched = activeCategory === "watched";
  const isWatchlist = activeCategory === "watchlist";

  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptCategory, setSavePromptCategory] = useState<LibraryCategory | null>(
    null,
  );
  const [savePromptMovie, setSavePromptMovie] = useState<LibraryItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function promoteIfWatchlistEveryoneSeen(
    movieBefore: LibraryItem,
    nextItem: LibraryItem,
  ) {
    const onWl = library.watchlist.some((m) => m.docId === movieBefore.docId);
    if (!onWl) return;
    const wasAll = everyoneHasSeenIt(movieBefore);
    const nowAll = everyoneHasSeenIt(nextItem);
    if (!wasAll && nowAll) {
      setSavePromptCategory("watched");
      setSavePromptMovie(nextItem);
      setSavePromptOpen(true);
    }
  }

  function formatRating10(value: number | null | undefined) {
    if (typeof value !== "number") return "-";
    if (value < 1 || value > 10) return "-";
    return value;
  }

  function requestDelete(docId: string) {
    if (pendingDeleteId !== null) return;
    if (deletingIds[docId]) return;

    setPendingDeleteId(docId);
    setUndoMessage("Deleted. Undo?");
    setDeletingIds((prev) => ({ ...prev, [docId]: true }));

    if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);

    deleteTimerRef.current = window.setTimeout(() => {
      removeMovie(docId);
      setDeletingIds((prev) => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });
      setPendingDeleteId(null);
      setUndoMessage(null);
      deleteTimerRef.current = null;
    }, 2200);
  }

  function undoDelete() {
    if (pendingDeleteId === null) return;
    if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = null;

    const docId = pendingDeleteId;
    setDeletingIds((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
    setPendingDeleteId(null);
    setUndoMessage(null);
  }

  return (
    <div className="min-h-screen py-10 text-mn-fg pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-semibold tracking-tight sm:text-3xl">
                My Library
              </h1>
              <p className="mt-1 text-sm text-mn-fg-muted">
                Movies and TV from the movie database, plus misc links (YouTube,
                TikTok, etc.). Use{" "}
                <span className="font-medium text-mn-accent">+ Add Misc</span>{" "}
                in the header to save a URL.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {LIBRARY_TABS.map((tab) => {
                const active = tab === libraryTab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLibraryTab(tab)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition touch-manipulation ${
                      active
                        ? "bg-mn-accent text-mn-bg shadow-[var(--mn-shadow-glow)]"
                        : "border border-mn-border bg-mn-input text-mn-fg hover:bg-mn-card-elev"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {libraryTabLabels[tab]}
                  </button>
                );
              })}
              {libraryTab === "misc" && isWatchlist ? (
                <Link
                  href="/roulette?media=misc"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-mn-border-strong bg-mn-card-elev px-4 py-2 text-sm font-semibold text-mn-accent shadow-md transition hover:bg-mn-input"
                >
                  Random misc
                </Link>
              ) : null}
            </div>
          </div>

          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border border-mn-border bg-mn-input/60 p-1"
            role="tablist"
            aria-label="Watchlist or Watched"
          >
            {ALL_CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition touch-manipulation ${
                    active
                      ? "bg-mn-card-elev text-mn-accent shadow-sm"
                      : "text-mn-fg-muted hover:text-mn-fg"
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              );
            })}
          </div>
        </header>

        <section className="mt-8">
          {!hydrated && movies.length === 0 ? (
            <EmptyCard
              title="Syncing library…"
              description="Your saved titles will appear here in a moment."
            />
          ) : movies.length === 0 ? (
            <EmptyCard
              title={`Nothing in ${libraryTabLabels[libraryTab]} — ${categoryLabels[activeCategory]} yet.`}
            />
          ) : (
              <div className="mt-2 grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {movies.map((movie: LibraryItem) => {
                const year = releaseYear(movie.release_date);
                const posterSrc = movie.poster_path
                  ? `${posterBase}${movie.poster_path}`
                  : null;
                const avg = calculateGroupAverage(
                  movie.alexRating,
                  movie.brittonRating,
                  movie.nabiRating,
                );
                const by = recommendedByLabel(movie.recommendedBy);
                const ytId =
                  movie.mediaType === "misc"
                    ? youtubeVideoIdFromUrl(movie.url)
                    : null;
                const ytThumb =
                  ytId !== null
                    ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                    : null;

                return (
                  <article
                    key={movie.docId}
                      className={`movie-card flex flex-col overflow-visible ${
                      deletingIds[movie.docId]
                          ? "is-deleting"
                          : "opacity-100"
                    }`}
                  >
                    <div className="relative">
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-[rgba(255,255,255,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
                        {movie.mediaType === "misc" && ytThumb ? (
                          <div className="relative h-full w-full">
                            <img
                              src={ytThumb}
                              alt={movie.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
                            <div className="absolute inset-0 flex flex-col items-center justify-end gap-1.5 px-3 pb-4 text-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                                YouTube
                              </span>
                              <span className="line-clamp-4 text-sm font-semibold text-white drop-shadow-sm">
                                {movie.title}
                              </span>
                            </div>
                          </div>
                        ) : movie.mediaType === "misc" ? (
                          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              Link
                            </div>
                            <div className="line-clamp-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {movie.title}
                            </div>
                          </div>
                        ) : posterSrc ? (
                          <img
                            src={posterSrc}
                            alt={movie.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              No poster
                            </div>
                            <div className="line-clamp-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {movie.title}
                            </div>
                          </div>
                        )}
                        {isWatchlist && movie.mediaType !== "misc" ? (
                          <PassedRibbon item={movie} />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <h2 className="line-clamp-2 text-base font-semibold leading-5">
                          {movie.title}
                        </h2>
                        {movie.mediaType === "misc" && movie.url ? (
                          <a
                            href={movie.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                          >
                            Open link
                          </a>
                        ) : year ? (
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {year}
                          </p>
                        ) : movie.mediaType !== "misc" ? (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Year unknown
                          </p>
                        ) : null}
                      </div>

                      {isWatchlist && movie.mediaType !== "misc" ? (
                        <WatchlistGroupControls
                          item={movie}
                          disabled={!hydrated}
                          showPass
                          onPatch={(next) => {
                            patchLibraryItem(movie.docId, {
                              seenIt: next.seenIt,
                              passed: next.passed,
                              passedBy: next.passedBy,
                            });
                            promoteIfWatchlistEveryoneSeen(movie, next);
                          }}
                        />
                      ) : null}

                      {isWatchlist ? (
                        <WatchlistCardRatingsRow item={movie} />
                      ) : null}

                      {isWatched ? (
                        <div className="mt-1 grid gap-3">
                          <div className="rounded-xl digital-readout border border-white/5 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Group ratings
                                </p>
                                <p className="mt-1 text-sm font-semibold tracking-tight text-cyan-200 dark:text-cyan-200">
                                  A: {formatRating10(movie.alexRating)}, B:{" "}
                                  {formatRating10(movie.brittonRating)}, N:{" "}
                                  {formatRating10(movie.nabiRating)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  Group Average
                                </p>
                                <p className="mt-1 text-3xl font-black leading-none text-zinc-900 dark:text-zinc-50">
                                  {avg !== null ? avg : "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-xl border border-zinc-200/10 bg-[rgba(255,255,255,0.02)] p-3 dark:border-zinc-800/60 dark:bg-[rgba(255,255,255,0.02)]">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Recommended by:{" "}
                          <span className="font-semibold">{by}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {isWatchlist && movie.mediaType === "misc" ? (
                          <Link
                            href="/roulette?media=misc"
                            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-mn-accent px-3 py-2 text-center text-sm font-semibold text-mn-bg shadow-[var(--mn-shadow-soft)] transition hover:opacity-95"
                          >
                            Shuffle
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => requestDelete(movie.docId)}
                          aria-label="Delete item"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-mn-border bg-mn-input p-3 text-mn-fg transition hover:bg-mn-card-elev"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 3h6l1 2h4v2H4V5h4l1-2Z"
                              fill="currentColor"
                              opacity="0.9"
                            />
                            <path
                              d="M6 9h12l-1 12H7L6 9Z"
                              fill="currentColor"
                              opacity="0.9"
                            />
                          </svg>
                        </button>

                        {isWatchlist ? (
                          <button
                            type="button"
                            disabled={!hydrated || !user}
                            title={
                              !user
                                ? "Sign in from the header to mark as watched"
                                : undefined
                            }
                            onClick={() => {
                              if (!user) return;
                              const person = seenPersonForMovieNightUser(
                                user.name,
                              );
                              const baseline = normalizeSeenIt(movie);
                              const nextForModal = setSeenTrueForPerson(
                                movie,
                                person,
                              );
                              if (!baseline[person]) {
                                patchLibraryItem(movie.docId, {
                                  seenIt: nextForModal.seenIt,
                                });
                              }
                              setSavePromptCategory("watched");
                              setSavePromptMovie(nextForModal);
                              setSavePromptOpen(true);
                            }}
                            className="min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm font-medium text-mn-fg shadow-sm transition hover:bg-mn-card-elev disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Watch
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!hydrated || !user}
                            title={
                              !user
                                ? "Sign in from the header to move titles"
                                : undefined
                            }
                            onClick={() => {
                              setSavePromptCategory("watchlist");
                              setSavePromptMovie(movie);
                              setSavePromptOpen(true);
                            }}
                            className="min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm font-medium text-mn-fg shadow-sm transition hover:bg-mn-card-elev disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {categoryLabels.watchlist}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <SaveMoviePromptModal
        open={savePromptOpen}
        category={savePromptCategory}
        ratedByUserName={user?.name ?? null}
        ratingBaseItem={savePromptMovie}
        onCancel={() => {
          setSavePromptOpen(false);
          setSavePromptCategory(null);
          setSavePromptMovie(null);
        }}
        onSave={(args) => {
          if (!savePromptMovie || !savePromptCategory) return;
          if (!user) return;

          if (savePromptCategory === "watchlist") {
            const nextMovie: LibraryItem = {
              ...savePromptMovie,
              genreIds: copyGenreIdsForPersist(savePromptMovie),
              recommendedBy: user.name,
              alexRating: null,
              brittonRating: null,
              nabiRating: null,
              groupRatings: undefined,
            };
            moveMovie(nextMovie, "watchlist");
            showToast(`Moved to ${categoryLabels.watchlist}.`);
          } else {
            const live =
              library.watchlist.find(
                (m) => m.docId === savePromptMovie.docId,
              ) ??
              library.watched.find((m) => m.docId === savePromptMovie.docId) ??
              savePromptMovie;

            const merged = setSeenTrueForPerson(
              {
                ...live,
                genreIds: copyGenreIdsForPersist(savePromptMovie),
                recommendedBy: user.name,
                ...mergeWatchedRatingPatch(live, args),
              },
              seenPersonForMovieNightUser(user.name),
            );

            const stillOnWatchlist = library.watchlist.some(
              (m) => m.docId === merged.docId,
            );

            if (stillOnWatchlist && !everyoneHasSeenIt(merged)) {
              patchLibraryItem(merged.docId, {
                seenIt: merged.seenIt,
                alexRating: merged.alexRating,
                brittonRating: merged.brittonRating,
                nabiRating: merged.nabiRating,
                groupRatings: merged.groupRatings,
              });
              showToast(
                "Rating saved on Watchlist. It moves to Watched when everyone has watched.",
              );
            } else {
              moveMovie(merged, "watched");
              showToast(`Moved to ${categoryLabels.watched}.`);
            }
          }

          setSavePromptOpen(false);
          setSavePromptCategory(null);
          setSavePromptMovie(null);
        }}
      />

      {toast ? (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-mn-border bg-mn-modal px-4 py-2 text-sm text-mn-fg shadow-[var(--mn-shadow-soft)]">
          {toast}
        </div>
      ) : null}

      {undoMessage ? (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[65] -translate-x-1/2 rounded-xl border border-mn-border bg-mn-modal px-4 py-2 text-sm text-mn-fg shadow-[var(--mn-shadow-soft)]">
          <span>{undoMessage}</span>
          <button
            type="button"
            onClick={undoDelete}
            className="ml-3 inline-flex rounded-lg bg-mn-accent/20 px-2 py-1 text-xs font-semibold text-mn-accent hover:bg-mn-accent/30"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
