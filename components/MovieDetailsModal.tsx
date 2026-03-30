"use client";

import { useEffect, useState } from "react";
import { tmdbGetMovieDetails } from "../src/lib/tmdbClient";

type MovieDetails = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

function releaseYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

function isMissingApiKeyError(message: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("tmdb api key is missing") ||
    lower.includes("tmdb read access token is missing")
  );
}

export default function MovieDetailsModal({
  open,
  movieId,
  onClose,
}: {
  open: boolean;
  movieId: number | null;
  onClose: () => void;
}) {
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !movieId) return;

    let cancelled = false;

    const run = async () => {
      // Defer state updates to avoid eslint "set-state-in-effect" warnings.
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError(null);
      setMovie(null);

      try {
        const data = await tmdbGetMovieDetails(movieId);
        if (!cancelled) setMovie(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, movieId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const year = releaseYear(movie?.release_date ?? null);
  const missingKey = isMissingApiKeyError(error);
  const posterSrc = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-xl dark:bg-black dark:text-zinc-50">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold leading-6">
              {movie?.title || "Movie details"}
              {year ? (
                <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  ({year})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Loading..." : error ? error : "Plot summary"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
          <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {posterSrc ? (
              // Using <img> to keep config simple for TMDB remote images.
              <img
                src={posterSrc}
                alt={movie?.title ? `${movie.title} poster` : "Poster"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                No poster
              </div>
            )}
          </div>

          <div>
            {error ? (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  missingKey
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
                }`}
              >
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                Fetching plot summary...
              </div>
            ) : movie?.overview ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                {movie.overview}
              </p>
            ) : (
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                No plot summary available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

