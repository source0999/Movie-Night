"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MovieDetailsModal from "./MovieDetailsModal";
import CategoryDropdown from "./CategoryDropdown";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import {
  categoryLabels,
  copyGenreIdsForPersist,
  libraryItemFromTmdbHit,
  type LibraryCategory,
  type LibraryItem,
} from "../lib/movieLibrary";
import SaveMoviePromptModal from "./SaveMoviePromptModal";
import MovieCard from "./MovieCard";
import { useAuth } from "../hooks/useAuth";
import { tmdbSearchMovies, tmdbSearchTv } from "../src/lib/tmdbClient";
import {
  FuturisticSearchForm,
  futuristicSearchButtonClass,
  futuristicSearchInputClass,
} from "./FuturisticSearchBar";

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
    lower.includes("movie database authentication is missing") ||
    lower.includes("tmdb auth is missing") ||
    lower.includes("tmdb api key is missing") ||
    lower.includes("tmdb read access token is missing") ||
    lower.includes("invalid api key") ||
    lower.includes("\"status_code\": 7") ||
    lower.includes("\"status_code\":7")
  );
}

function TmdbErrorBlock({ error }: { error: string }) {
  return (
    <div
      className={`mt-3 rounded-2xl border p-3 text-sm ${
        isMissingApiKeyError(error)
          ? "border-amber-200/70 bg-amber-50/5 text-amber-200 dark:border-amber-800/70 dark:bg-amber-950/20"
          : "border-red-200/70 bg-red-50/5 text-red-200 dark:border-red-800/70 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-300" />
        <span>
          Search error
          {isMissingApiKeyError(error) ? " (auth)" : ""}
        </span>
      </div>
      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-current">
        {error}
      </pre>
      {isMissingApiKeyError(error) ? (
        <p className="mt-2 text-xs text-amber-100/80 dark:text-amber-100/70">
          Check that the movie database read token env var is set and valid
          (<code className="font-mono">NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN</code>).
        </p>
      ) : null}
    </div>
  );
}

export default function TmdbSearchExperience() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"movie" | "tv">("movie");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTmdbId, setDetailsTmdbId] = useState<number | null>(null);

  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptCategory, setSavePromptCategory] = useState<LibraryCategory | null>(
    null,
  );
  const [savePromptMovie, setSavePromptMovie] = useState<LibraryItem | null>(
    null,
  );
  const [saveFlash, setSaveFlash] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const posterBase = "https://image.tmdb.org/t/p/w500";
  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const { hydrated, library, saveMovie, removeMovie } = useMovieLibrary();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    const onReset = () => {
      setQuery("");
      setResults([]);
      setLoading(false);
      setError(null);
      setDetailsOpen(false);
      setDetailsTmdbId(null);
    };
    window.addEventListener("movieNight:resetMovieSearch", onReset);
    window.addEventListener("movieNight:resetTvSearch", onReset);
    return () => {
      window.removeEventListener("movieNight:resetMovieSearch", onReset);
      window.removeEventListener("movieNight:resetTvSearch", onReset);
    };
  }, []);

  function switchMode(next: "movie" | "tv") {
    if (next === mode) return;
    setMode(next);
    setQuery("");
    setResults([]);
    setLoading(false);
    setError(null);
    setDetailsOpen(false);
    setDetailsTmdbId(null);
  }

  const heading = "Search database";
  const subheading =
    "Search movies and TV shows in our movie database. Save movies under Library → Movies and shows under Library → TV.";
  const searchPlaceholder =
    mode === "movie"
      ? "Search movies (e.g. Inception)"
      : "Search TV shows (e.g. Severance)";

  async function onSearch(e: FormEvent) {
    e.preventDefault();

    const q = query.trim();
    if (!q) {
      setError(
        mode === "movie"
          ? "Type a movie title to search."
          : "Type a TV show title to search.",
      );
      setResults([]);
      return;
    }

    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    setResults([]);
    setError(null);

    try {
      if (requestId !== requestIdRef.current) return;
      const rows =
        mode === "movie" ? await tmdbSearchMovies(q) : await tmdbSearchTv(q);
      if (requestId !== requestIdRef.current) return;
      setResults(
        rows.map((m) =>
                            libraryItemFromTmdbHit({
                              mediaType: mode,
                              tmdbId: m.id,
                              title: m.title,
                              release_date: m.release_date,
                              poster_path: m.poster_path,
                              genreIds: m.genre_ids,
                            }),
                          ),
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
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
      setResults((prev) => prev.filter((m) => m.docId !== docId));
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

  function clearAfterSave() {
    setQuery("");
    setResults([]);
    setError(null);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {subheading}
          </p>
          <div
            className="mt-6 inline-flex rounded-xl border border-zinc-200/80 bg-white/80 p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50"
            role="tablist"
            aria-label="Search type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "movie"}
              onClick={() => switchMode("movie")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "movie"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Movies
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "tv"}
              onClick={() => switchMode("tv")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "tv"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              TV shows
            </button>
          </div>
        </header>

        <section
          className="mt-8 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/35 sm:p-6"
          aria-labelledby="search-heading"
        >
          <h2 id="search-heading" className="sr-only">
            Search
          </h2>
          <FuturisticSearchForm onSubmit={onSearch}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={futuristicSearchInputClass}
              aria-label={mode === "movie" ? "Search movies" : "Search TV shows"}
            />
            <button
              type="submit"
              disabled={!hasQuery || loading}
              className={futuristicSearchButtonClass}
            >
              {loading ? "…" : "Search"}
            </button>
          </FuturisticSearchForm>

          {error ? <TmdbErrorBlock error={error} /> : null}

          {!loading && results.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
              <AnimatePresence initial={false}>
                {results.map((movie, idx) => {
                  const year = releaseYear(movie.release_date);
                  const posterSrc = movie.poster_path
                    ? `${posterBase}${movie.poster_path}`
                    : null;
                  const isSaved = library.watchlist.some(
                    (m) => m.docId === movie.docId,
                  );

                  return (
                    <motion.div
                      key={movie.docId}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: idx * 0.06,
                      }}
                      className="min-w-0"
                    >
                      <MovieCard
                        movie={movie}
                        year={year}
                        posterSrc={posterSrc}
                        isSearch={true}
                        isSaved={isSaved}
                        isDeleting={deletingIds[movie.docId]}
                        onDelete={
                          isSaved ? () => requestDelete(movie.docId) : undefined
                        }
                        actionsNode={
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <CategoryDropdown
                              summaryLabel={
                                saveFlash[movie.docId]
                                    ? "Saved!"
                                    : hydrated
                                      ? "Save to…"
                                      : "Syncing…"
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
                                setDetailsTmdbId(movie.tmdbId);
                                setDetailsOpen(true);
                              }}
                              disabled={movie.tmdbId === null}
                              className="min-h-[44px] whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
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
      </div>

      <MovieDetailsModal
        open={detailsOpen}
        mediaType={mode}
        tmdbId={detailsTmdbId}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsTmdbId(null);
        }}
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

          const nextMovie: LibraryItem = {
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

          setSaveFlash((prev) => ({ ...prev, [nextMovie.docId]: Date.now() }));
          window.setTimeout(() => {
            setSaveFlash((prev) => {
              const copy = { ...prev };
              delete copy[nextMovie.docId];
              return copy;
            });
          }, 2500);

          setSavePromptOpen(false);
          setSavePromptCategory(null);
          setSavePromptMovie(null);
          clearAfterSave();
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
