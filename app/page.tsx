"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import SaveMoviePromptModal from "../components/SaveMoviePromptModal";
import WatchlistCardRatingsRow from "../components/WatchlistCardRatingsRow";
import EmptyCard from "../components/EmptyCard";
import {
  PassedRibbon,
  WatchlistGroupControls,
} from "../components/WatchlistGroupControls";
import { useAuth } from "../hooks/useAuth";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import {
  categoryLabels,
  copyGenreIdsForPersist,
  mergeWatchedRatingPatch,
  recommendedByLabel,
  calculateGroupAverage,
  youtubeVideoIdFromUrl,
  type LibraryCategory,
  type LibraryItem,
} from "../lib/movieLibrary";
import {
  everyoneHasSeenIt,
  normalizeSeenIt,
  seenPersonForMovieNightUser,
  setSeenTrueForPerson,
} from "../lib/watchlistGroup";

const posterBase = "https://image.tmdb.org/t/p/w500";

function RecommendedByFooter({ name }: { name: string }) {
  return (
    <div className="mt-auto flex items-start gap-1.5 border-t border-mn-border pt-2">
      <svg
        className="mt-0.5 h-3 w-3 shrink-0 text-mn-fg-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <p className="min-w-0 leading-snug text-[10px] text-mn-fg-muted sm:text-xs">
        <span className="font-semibold text-mn-fg-soft">Recommended by:</span>{" "}
        <span className="font-medium text-mn-fg">{name}</span>
      </p>
    </div>
  );
}

function releaseYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

function resetAllSearchState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("movieNight:resetHomeSearch"));
  window.dispatchEvent(new CustomEvent("movieNight:resetMovieSearch"));
  window.dispatchEvent(new CustomEvent("movieNight:resetTvSearch"));
}

export default function Home() {
  const { user } = useAuth();
  const {
    hydrated,
    library,
    removeMovie,
    patchLibraryItem,
    moveMovie,
  } = useMovieLibrary();

  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptCategory, setSavePromptCategory] =
    useState<LibraryCategory | null>(null);
  const [savePromptMovie, setSavePromptMovie] = useState<LibraryItem | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

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

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  /** When the third person marks “seen” on the watchlist, open ratings → Watched. */
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

  const searchCardClass =
    "group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-2xl border border-mn-border-strong bg-gradient-to-br from-mn-card via-mn-input/40 to-mn-card-elev p-4 shadow-[var(--mn-shadow-glow)] transition hover:border-mn-accent/50 hover:shadow-[var(--mn-shadow-soft)] sm:min-h-[140px] sm:p-5";

  return (
    <div className="min-h-screen pb-[max(env(safe-area-inset-bottom),24px)] font-sans text-mn-fg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mn-accent-2">
            Movie lounge
          </p>
          <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-semibold tracking-tight">
            Movie Night
          </h1>
          {user ? (
            <p className="mt-2 text-sm text-mn-fg-muted">
              Hi, {user.name} — pick something good.
            </p>
          ) : (
            <p className="mt-2 text-sm text-mn-fg-muted">
              Sign in from the header to save ratings and sync your library.
            </p>
          )}
          <p className="mt-2 text-sm text-mn-fg-muted">
            Search the movie database, build your library, and spin the roulette.
            Misc links: use{" "}
            <span className="font-medium text-mn-accent">+ Add Misc</span> in the
            header.
          </p>
        </header>

        <section className="mt-8 max-w-xl" aria-label="Search">
          <Link
            href="/movie-search"
            onClick={() => resetAllSearchState()}
            className={searchCardClass}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-mn-accent">
                Search database
              </p>
              <h2 className="mt-1 text-lg font-semibold text-mn-fg">
                Movie &amp; TV search
              </h2>
              <p className="mt-1 text-sm text-mn-fg-muted">
                Find films and shows, then save to Library → Movies or TV.
              </p>
            </div>
            <span className="text-sm font-medium text-mn-accent group-hover:underline">
              Open search →
            </span>
          </Link>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mn-accent-2">
              Last watched
            </p>
            <motion.h2
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 22,
                mass: 0.6,
              }}
              className="text-2xl font-semibold tracking-tight text-mn-fg"
            >
              Recently Watched
            </motion.h2>
            <p className="mt-1 text-sm text-mn-fg-muted">
              Last items you marked watched.
            </p>
          </div>

          {!hydrated ? (
            <EmptyCard
              className="mt-6"
              title="Syncing library…"
              description="Hang tight — your lists will show up in a moment."
            />
          ) : library.watched.length === 0 ? (
            <EmptyCard className="mt-6" title="Nothing in Watched yet." />
          ) : (
            <div className="mt-6 flex snap-x snap-proximity gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth touch-pan-x md:grid md:gap-6 md:overflow-visible md:snap-none md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <AnimatePresence initial={false}>
                {library.watched
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((movie, idx) => {
                    const year = releaseYear(movie.release_date);
                    const posterSrc = movie.poster_path
                      ? `${posterBase}${movie.poster_path}`
                      : null;
                    const ytId =
                      movie.mediaType === "misc"
                        ? youtubeVideoIdFromUrl(movie.url)
                        : null;
                    const ytThumb =
                      ytId !== null
                        ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                        : null;
                    const avg = calculateGroupAverage(
                      movie.alexRating,
                      movie.brittonRating,
                      movie.nabiRating,
                    );
                    const by = recommendedByLabel(movie.recommendedBy);

                    return (
                      <motion.div
                        key={movie.docId}
                        className="w-[46vw] min-w-[160px] max-w-[220px] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{
                          duration: 0.35,
                          ease: "easeOut",
                          delay: idx * 0.1,
                        }}
                      >
                        <article
                          className={`movie-card relative flex flex-col overflow-visible ${
                            deletingIds[movie.docId] ? "is-deleting" : "opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => requestDelete(movie.docId)}
                            aria-label="Remove from library"
                            className="absolute right-3 top-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-mn-modal/95 p-3 text-mn-fg shadow-sm ring-1 ring-mn-border hover:bg-mn-card-elev"
                          >
                            <svg
                              width="16"
                              height="16"
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
                              <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                                No poster
                              </div>
                            )}
                          </div>

                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:p-4">
                            <div>
                              <h3 className="line-clamp-2 text-base font-semibold leading-5">
                                {movie.title}
                              </h3>
                              {year ? (
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                  {year}
                                </p>
                              ) : null}
                            </div>

                            <div className="digital-readout rounded-xl p-2.5 sm:p-3">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-mn-fg-muted sm:text-xs sm:normal-case sm:tracking-normal">
                                Ratings (1-10)
                              </p>
                              <p className="mt-1 font-mono text-xs font-semibold tracking-tight text-mn-accent sm:text-sm">
                                A: {formatRating10(movie.alexRating)}, B:{" "}
                                {formatRating10(movie.brittonRating)}, N:{" "}
                                {formatRating10(movie.nabiRating)}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/10 pt-2 sm:mt-3 sm:pt-3">
                                <p className="text-[10px] font-medium text-mn-fg-muted sm:text-xs">
                                  Group Average
                                </p>
                                <p className="font-mono text-base font-black text-mn-fg sm:text-lg">
                                  {avg !== null ? avg : "-"}
                                </p>
                              </div>
                            </div>

                            <WatchlistGroupControls
                              item={movie}
                              disabled={!hydrated}
                              compact
                              showPass={false}
                              onPatch={(next) => {
                                patchLibraryItem(movie.docId, {
                                  seenIt: next.seenIt,
                                });
                                promoteIfWatchlistEveryoneSeen(movie, next);
                              }}
                            />

                            <RecommendedByFooter name={by} />
                          </div>
                        </article>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section className="mt-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mn-accent-3">
              Queue
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-mn-fg">
              Watchlist
            </h2>
            <p className="mt-1 text-sm text-mn-fg-muted">
              Tap Watched to rate. The title stays here until Alex, Britton, and
              Nabi have all marked watched (Watched or A/B/N), then it moves to
              Recently Watched.
            </p>
          </div>

          {!hydrated ? (
            <EmptyCard
              className="mt-6"
              title="Syncing library…"
              description="Hang tight — your lists will show up in a moment."
            />
          ) : library.watchlist.length === 0 ? (
            <EmptyCard className="mt-6" title="Nothing in your Watchlist yet." />
          ) : (
            <div className="mt-6 flex snap-x snap-proximity gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth touch-pan-x md:grid md:gap-6 md:overflow-visible md:snap-none md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {library.watchlist
                .slice()
                .reverse()
                .map((movie) => {
                  const year = releaseYear(movie.release_date);
                  const posterSrc = movie.poster_path
                    ? `${posterBase}${movie.poster_path}`
                    : null;
                  const ytId =
                    movie.mediaType === "misc"
                      ? youtubeVideoIdFromUrl(movie.url)
                      : null;
                  const ytThumb =
                    ytId !== null
                      ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                      : null;
                  const by = recommendedByLabel(movie.recommendedBy);

                  return (
                    <div
                      key={movie.docId}
                      className="w-[46vw] min-w-[160px] max-w-[220px] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink"
                    >
                      <article
                        className={`movie-card relative flex flex-col overflow-visible ${
                          deletingIds[movie.docId] ? "is-deleting" : "opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => requestDelete(movie.docId)}
                          aria-label="Remove from library"
                          className="absolute right-3 top-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-mn-modal/95 p-3 text-mn-fg shadow-sm ring-1 ring-mn-border hover:bg-mn-card-elev"
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
                            <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                              No poster
                            </div>
                          )}
                          <PassedRibbon item={movie} />
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:p-4">
                          <div>
                            <h3 className="line-clamp-2 text-base font-semibold leading-5">
                              {movie.title}
                            </h3>
                            {year ? (
                              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {year}
                              </p>
                            ) : null}
                          </div>

                          <WatchlistGroupControls
                            item={movie}
                            disabled={!hydrated}
                            compact
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

                          <WatchlistCardRatingsRow item={movie} compact />

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
                            className="w-full min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm font-medium text-mn-fg shadow-sm transition hover:bg-mn-card-elev disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Watched
                          </button>

                          <RecommendedByFooter name={by} />
                        </div>
                      </article>
                    </div>
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

          if (savePromptCategory === "watched") {
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
                "Rating saved on your watchlist. It moves to Watched when everyone has watched.",
              );
            } else {
              moveMovie(merged, "watched");
              showToast(`Moved to ${categoryLabels.watched}.`);
            }
          } else {
            const nextMovie: LibraryItem = {
              ...savePromptMovie,
              genreIds: copyGenreIdsForPersist(savePromptMovie),
              recommendedBy: user.name,
              alexRating: null,
              brittonRating: null,
              nabiRating: null,
              groupRatings: undefined,
            };
            moveMovie(nextMovie, savePromptCategory);
            showToast(
              `Moved to ${categoryLabels[savePromptCategory]}.`,
            );
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
