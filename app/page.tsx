"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import {
  PassedRibbon,
  WatchlistGroupControls,
} from "../components/WatchlistGroupControls";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import {
  recommendedByLabel,
  calculateGroupAverage,
  youtubeVideoIdFromUrl,
} from "../lib/movieLibrary";

const posterBase = "https://image.tmdb.org/t/p/w500";

function RecommendedByFooter({ name }: { name: string }) {
  return (
    <div className="mt-auto flex items-start gap-1.5 border-t border-zinc-200/50 pt-2 dark:border-zinc-700/50">
      <svg
        className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <p className="min-w-0 leading-snug text-[10px] text-zinc-600 dark:text-zinc-400 sm:text-xs">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          Recommended by:
        </span>{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </span>
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
  const { hydrated, library, removeMovie, patchLibraryItem } = useMovieLibrary();

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
    "group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-white/95 via-cyan-50/40 to-violet-100/50 p-4 shadow-[0_0_24px_rgba(34,211,238,0.1)] transition hover:border-cyan-400/50 hover:shadow-[0_0_32px_rgba(139,92,246,0.15)] dark:border-cyan-500/20 dark:from-zinc-900/90 dark:via-zinc-950 dark:to-violet-950/40 dark:hover:border-cyan-400/35 sm:min-h-[140px] sm:p-5";

  return (
    <div className="min-h-screen font-sans text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Movie Night
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Search the movie database, build your library, and spin the roulette. Misc links:
            use{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              + Add Misc
            </span>{" "}
            in the header.
          </p>
        </header>

        <section className="mt-8 max-w-xl" aria-label="Search">
          <Link
            href="/movie-search"
            onClick={() => resetAllSearchState()}
            className={searchCardClass}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                Search database
              </p>
              <h2 className="mt-1 text-lg font-semibold">Movie &amp; TV search</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Find films and shows, then save to Library → Movies or TV.
              </p>
            </div>
            <span className="text-sm font-medium text-violet-600 group-hover:underline dark:text-violet-400">
              Open search →
            </span>
          </Link>
        </section>

        <section className="mt-12">
          <div>
            <motion.h2
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 22,
                mass: 0.6,
              }}
              className="text-2xl font-semibold tracking-tight"
            >
              Recently Watched
            </motion.h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Last items you marked watched.
            </p>
          </div>

          {!hydrated ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Syncing library…
            </div>
          ) : library.watched.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Nothing in Watched yet.
            </div>
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
                            className="absolute right-3 top-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/90 p-3 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-white dark:bg-black/60 dark:text-zinc-200 dark:ring-zinc-800"
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
                              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300 sm:text-xs sm:normal-case sm:tracking-normal">
                                Ratings (1-10)
                              </p>
                              <p className="mt-1 text-xs font-semibold tracking-tight text-cyan-200 dark:text-cyan-200 sm:text-sm">
                                A: {formatRating10(movie.alexRating)}, B:{" "}
                                {formatRating10(movie.brittonRating)}, N:{" "}
                                {formatRating10(movie.nabiRating)}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/10 pt-2 sm:mt-3 sm:pt-3">
                                <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 sm:text-xs">
                                  Group Average
                                </p>
                                <p className="text-base font-black text-zinc-900 dark:text-zinc-50 sm:text-lg">
                                  {avg !== null ? avg : "-"}
                                </p>
                              </div>
                            </div>

                            <WatchlistGroupControls
                              item={movie}
                              disabled={!hydrated}
                              compact
                              showPass={false}
                              onPatch={(next) =>
                                patchLibraryItem(movie.docId, {
                                  seenIt: next.seenIt,
                                })
                              }
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
            <h2 className="text-2xl font-semibold tracking-tight">Watchlist</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Saved titles you have not watched yet.
            </p>
          </div>

          {!hydrated ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Syncing library…
            </div>
          ) : library.watchlist.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Nothing in your Watchlist yet.
            </div>
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
                          className="absolute right-3 top-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/90 p-3 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-white dark:bg-black/60 dark:text-zinc-200 dark:ring-zinc-800"
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
                            onPatch={(next) =>
                              patchLibraryItem(movie.docId, {
                                seenIt: next.seenIt,
                                passed: next.passed,
                                passedBy: next.passedBy,
                              })
                            }
                          />

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

      {undoMessage ? (
        <div className="fixed bottom-5 left-1/2 z-[65] -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900">
          <span>{undoMessage}</span>
          <button
            type="button"
            onClick={undoDelete}
            className="ml-3 inline-flex rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25 dark:bg-zinc-900/10 dark:text-zinc-900 dark:hover:bg-zinc-900/20"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
