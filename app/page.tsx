"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MovieDetailsModal from "../components/MovieDetailsModal";
import CategoryDropdown from "../components/CategoryDropdown";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import {
  categoryLabels,
  type LibraryCategory,
  type LibraryMovie,
} from "../lib/movieLibrary";
import SaveMoviePromptModal from "../components/SaveMoviePromptModal";
import { calculateGroupAverage } from "../lib/movieLibrary";
import MovieCard from "../components/MovieCard";
import { useAuth } from "../hooks/useAuth";
import { tmdbSearchMovies } from "../src/lib/tmdbClient";

const SAVE_OPTIONS: Array<{ value: LibraryCategory; label: string }> = [
  { value: "watchlist", label: categoryLabels.watchlist },
  { value: "watched", label: categoryLabels.watched },
];

function releaseYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

function isMissingApiKeyError(message: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("tmdb auth is missing") ||
    lower.includes("tmdb api key is missing") ||
    lower.includes("tmdb read access token is missing") ||
    lower.includes("invalid api key") ||
    lower.includes("\"status_code\": 7") ||
    lower.includes("\"status_code\":7")
  );
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<LibraryMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);

  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptCategory, setSavePromptCategory] = useState<LibraryCategory | null>(
    null,
  );
  const [savePromptMovie, setSavePromptMovie] = useState<LibraryMovie | null>(
    null,
  );
  const [saveFlash, setSaveFlash] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<number, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const searchResultsSectionRef = useRef<HTMLElement | null>(null);
  const searchRequestIdRef = useRef(0);

  const posterBase = "https://image.tmdb.org/t/p/w500";

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const { hydrated, library, saveMovie, removeMovie } = useMovieLibrary();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function formatRating10(value: number | null | undefined) {
    if (typeof value !== "number") return "-";
    if (value < 1 || value > 10) return "-";
    return value;
  }

  function resetSearchState() {
    setQuery("");
    setMovies([]);
    setLoading(false);
    setError(null);
  }

  useEffect(() => {
    resetSearchState();

    const onReset = () => resetSearchState();
    window.addEventListener("movieNight:resetHomeSearch", onReset);
    return () =>
      window.removeEventListener("movieNight:resetHomeSearch", onReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();

    const q = query.trim();
    if (!q) {
      setError("Type a movie title to search.");
      setMovies([]);
      return;
    }

    const requestId = (searchRequestIdRef.current += 1);

    setLoading(true);
    setMovies([]); // Avoid showing stale results while loading.
    setError(null);
    try {
      if (requestId !== searchRequestIdRef.current) return;
      const tmdbResults = await tmdbSearchMovies(q);
      if (requestId !== searchRequestIdRef.current) return;
      setMovies(
        tmdbResults.map((m) => ({
          id: m.id,
          title: m.title,
          release_date: m.release_date,
          poster_path: m.poster_path,
        })),
      );
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) return;
      setMovies([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function requestDelete(movieId: number) {
    if (pendingDeleteId !== null) return;
    if (deletingIds[movieId]) return;

    setPendingDeleteId(movieId);
    setUndoMessage("Deleted. Undo?");
    setDeletingIds((prev) => ({ ...prev, [movieId]: true }));

    if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);

    deleteTimerRef.current = window.setTimeout(() => {
      removeMovie(movieId);
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
      setDeletingIds((prev) => {
        const copy = { ...prev };
        delete copy[movieId];
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

    const movieId = pendingDeleteId;
    setDeletingIds((prev) => {
      const copy = { ...prev };
      delete copy[movieId];
      return copy;
    });
    setPendingDeleteId(null);
    setUndoMessage(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Movie Night</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Search TMDB and pick something for tonight.
            </p>
          </div>

          <div className="w-full sm:max-w-md">
            <form onSubmit={onSearch} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies (e.g. Inception)"
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-zinc-800"
                aria-label="Search movies"
              />
              <button
                type="submit"
                disabled={!hasQuery || loading}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
              >
                {loading ? "Loading..." : "Search"}
              </button>
            </form>
            {error ? (
              <div
                className={`mt-2 rounded-2xl border p-3 text-sm ${
                  isMissingApiKeyError(error)
                    ? "border-amber-200/70 bg-amber-50/5 text-amber-200 dark:border-amber-800/70 dark:bg-amber-950/20"
                    : "border-red-200/70 bg-red-50/5 text-red-200 dark:border-red-800/70 dark:bg-red-950/20"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-300" />
                  <span>
                    TMDB error
                    {isMissingApiKeyError(error) ? " (auth)" : ""}
                  </span>
                </div>
                <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-current">
                  {error}
                </pre>
                {isMissingApiKeyError(error) ? (
                  <p className="mt-2 text-xs text-amber-100/80 dark:text-amber-100/70">
                    Check that <code className="font-mono">NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN</code>{" "}
                    is a valid TMDB read access token (JWT with <code>scopes: [api_read]</code>). Also ensure
                    the GitHub Secret name matches exactly.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <section
          ref={searchResultsSectionRef}
          tabIndex={-1}
          className="mt-10 outline-none"
        >
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Loading...
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence initial={false}>
                {movies.map((movie, idx) => {
                const year = releaseYear(movie.release_date);
                const posterSrc = movie.poster_path
                  ? `${posterBase}${movie.poster_path}`
                  : null;
                const isSaved = library.watchlist.some((m) => m.id === movie.id);

                return (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      duration: 0.35,
                      ease: "easeOut",
                      delay: idx * 0.1,
                    }}
                  >
                    <MovieCard
                      movie={movie}
                      year={year}
                      posterSrc={posterSrc}
                      isSearch={true}
                      isSaved={isSaved}
                      isDeleting={deletingIds[movie.id]}
                      onDelete={
                        isSaved ? () => requestDelete(movie.id) : undefined
                      }
                      actionsNode={
                        <div className="flex items-center justify-between gap-2">
                          <CategoryDropdown
                            summaryLabel={
                              saveFlash[movie.id]
                                ? "Saved!"
                                : hydrated
                                  ? "Save to..."
                                  : "Loading..."
                            }
                            options={SAVE_OPTIONS}
                            disabled={!hydrated}
                            align="left"
                            onSelect={(cat) => {
                              setSavePromptCategory(cat);
                              setSavePromptMovie(movie);
                              setSavePromptOpen(true);
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovieId(movie.id);
                              setDetailsOpen(true);
                            }}
                            className="whitespace-nowrap rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
                          >
                            Details
                          </button>
                        </div>
                      }
                    />
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          ) : null}
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
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
                Based on your last stored “Watched” picks.
              </p>
            </div>
          </div>

          {!hydrated ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Loading...
            </div>
          ) : library.watched.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              No movies in Watched yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                  const avg = calculateGroupAverage(
                    movie.alexRating,
                    movie.brittonRating,
                    movie.nabiRating,
                  );

                  return (
                    <motion.div
                      key={movie.id}
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
                          deletingIds[movie.id] ? "is-deleting" : "opacity-100"
                        }`}
                      >
                      <button
                        type="button"
                        onClick={() => {
                          requestDelete(movie.id);
                        }}
                        aria-label="Delete movie"
                        className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-lg bg-white/90 p-2 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-white dark:bg-black/60 dark:text-zinc-200 dark:ring-zinc-800"
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

                      <div className="aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-[rgba(255,255,255,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
                        {posterSrc ? (
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

                      <div className="flex flex-1 flex-col gap-2 p-4">
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

                        <div className="rounded-xl border border-zinc-200/10 bg-[rgba(255,255,255,0.02)] p-3 dark:border-zinc-800/60 dark:bg-[rgba(255,255,255,0.02)]">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                            Recommended by
                          </p>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {movie.recommendedBy?.trim() || "Someone"}
                          </p>

                          <div className="mt-3 digital-readout rounded-xl p-3">
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                              Ratings (1-10)
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-cyan-200 dark:text-cyan-200">
                              A: {formatRating10(movie.alexRating)}, B:{" "}
                              {formatRating10(movie.brittonRating)}, N:{" "}
                              {formatRating10(movie.nabiRating)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-4">
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                              Group Average
                            </p>
                            <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                              {avg !== null ? avg : "-"}
                            </p>
                          </div>
                        </div>
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
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Watchlist</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Movies you have not seen yet.
              </p>
            </div>
          </div>

          {!hydrated ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Loading...
            </div>
          ) : library.watchlist.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              Nothing in your Watchlist yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {library.watchlist
                .slice()
                .reverse()
                .map((movie) => {
                  const year = releaseYear(movie.release_date);
                  const posterSrc = movie.poster_path
                    ? `${posterBase}${movie.poster_path}`
                    : null;

                  return (
                    <article
                      key={movie.id}
                      className={`movie-card relative flex flex-col overflow-visible ${
                        deletingIds[movie.id]
                          ? "is-deleting"
                          : "opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => requestDelete(movie.id)}
                        aria-label="Delete movie"
                        className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-lg bg-white/90 p-2 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-white dark:bg-black/60 dark:text-zinc-200 dark:ring-zinc-800"
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

                      <div className="aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-[rgba(255,255,255,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
                        {posterSrc ? (
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

                      <div className="flex flex-1 flex-col gap-2 p-4">
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

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                            Recommended by
                          </p>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {movie.recommendedBy?.trim() || "Someone"}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      <MovieDetailsModal
        open={detailsOpen}
        movieId={selectedMovieId}
        onClose={() => setDetailsOpen(false)}
      />

      <SaveMoviePromptModal
        open={savePromptOpen}
        category={savePromptCategory}
        onCancel={() => {
          setSavePromptOpen(false);
          setSavePromptCategory(null);
          setSavePromptMovie(null);
        }}
        onSave={(args) => {
          if (!savePromptMovie || !savePromptCategory) return;
          if (!user) return;

          const nextMovie: LibraryMovie = {
            ...savePromptMovie,
            recommendedBy: user.name,
            alexRating:
              savePromptCategory === "watched" ? args.alexRating ?? null : null,
            brittonRating:
              savePromptCategory === "watched" ? args.brittonRating ?? null : null,
            nabiRating:
              savePromptCategory === "watched" ? args.nabiRating ?? null : null,
            groupRatings:
              savePromptCategory === "watched"
                ? {
                    alex: args.alexRating ?? null,
                    britton: args.brittonRating ?? null,
                    nabi: args.nabiRating ?? null,
                  }
                : undefined,
          };

          saveMovie(nextMovie, savePromptCategory);

          const label = categoryLabels[savePromptCategory];
          showToast(`Saved to ${label}.`);

          setSaveFlash((prev) => ({ ...prev, [nextMovie.id]: Date.now() }));
          window.setTimeout(() => {
            setSaveFlash((prev) => {
              const copy = { ...prev };
              delete copy[nextMovie.id];
              return copy;
            });
          }, 2500);

          setSavePromptOpen(false);
          setSavePromptCategory(null);
          setSavePromptMovie(null);

          // Clean up search UX after saving.
          setQuery("");
          setMovies([]);
          setError(null);
          setLoading(false);
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900">
          {toast}
        </div>
      ) : null}

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

