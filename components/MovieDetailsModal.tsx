"use client";

import { useEffect, useState } from "react";
import { tmdbGetMovieDetails, tmdbGetTvDetails } from "../src/lib/tmdbClient";

type MediaDetails = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids?: number[];
};

function releaseYear(releaseDate: string | null) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

function isMissingApiKeyError(message: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("movie database authentication is missing") ||
    lower.includes("tmdb api key is missing") ||
    lower.includes("tmdb read access token is missing")
  );
}

export default function MovieDetailsModal({
  open,
  mediaType,
  tmdbId,
  onClose,
}: {
  open: boolean;
  mediaType: "movie" | "tv" | null;
  tmdbId: number | null;
  onClose: () => void;
}) {
  const [media, setMedia] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tmdbId || !mediaType) return;

    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError(null);
      setMedia(null);

      try {
        const data =
          mediaType === "tv"
            ? await tmdbGetTvDetails(tmdbId)
            : await tmdbGetMovieDetails(tmdbId);
        if (!cancelled) setMedia(data);
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
  }, [open, tmdbId, mediaType]);

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

  const year = releaseYear(media?.release_date ?? null);
  const missingKey = isMissingApiKeyError(error);
  const posterSrc = media?.poster_path
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  const heading =
    mediaType === "tv"
      ? "TV details"
      : mediaType === "movie"
        ? "Movie details"
        : "Details";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-[95vw] overflow-y-auto rounded-2xl bg-white text-zinc-900 shadow-xl dark:bg-black dark:text-zinc-50 max-h-[95vh] sm:max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold leading-6">
              {media?.title || heading}
              {year ? (
                <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  ({year})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Fetching…" : error ? error : "Plot summary"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
          <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {posterSrc ? (
              <img
                src={posterSrc}
                alt={media?.title ? `${media.title} poster` : "Poster"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                No poster
              </div>
            )}
          </div>

          <div>
            {!tmdbId || !mediaType ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                No database details for this item.
              </p>
            ) : null}

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
                Fetching plot summary…
              </div>
            ) : media?.overview ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                {media.overview}
              </p>
            ) : tmdbId && mediaType ? (
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                No plot summary available.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
