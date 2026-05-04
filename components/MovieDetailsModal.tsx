"use client";

import { useEffect, useRef, useState } from "react";
import { useModalFocusTrap } from "../hooks/useModalFocusTrap";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalFocusTrap(open, panelRef);

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
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-details-title"
    >
      <div
        className="absolute inset-0 z-0 bg-black/55 mn-modal-backdrop-animate"
        role="presentation"
        onClick={onClose}
        onKeyDown={() => {}}
      />

      <div
        ref={panelRef}
        className="mn-modal-shell relative z-10 flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)-1rem))] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[var(--mn-radius-lg)] border border-mn-border bg-mn-modal text-mn-fg shadow-[var(--mn-shadow-soft)] sm:max-h-[95vh] sm:max-w-2xl sm:rounded-[var(--mn-radius-lg)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-mn-border-strong sm:hidden" />

        <div className="flex items-start justify-between gap-4 border-b border-mn-border p-4">
          <div className="min-w-0">
            <h2
              id="movie-details-title"
              className="text-lg font-semibold leading-6 text-mn-fg"
            >
              {media?.title || heading}
              {year ? (
                <span className="ml-2 text-sm font-normal text-mn-fg-muted">
                  ({year})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-mn-fg-muted">
              {loading ? "Fetching…" : error ? error : "Plot summary"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mn-btn-press min-h-[44px] shrink-0 rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm text-mn-fg hover:bg-mn-card-elev"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-lg border border-mn-border bg-mn-card md:max-w-none">
              {posterSrc ? (
                <img
                  src={posterSrc}
                  alt={media?.title ? `${media.title} poster` : "Poster"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-sm text-mn-fg-muted">
                  No poster
                </div>
              )}
            </div>

            <div>
              {!tmdbId || !mediaType ? (
                <p className="text-sm text-mn-fg-muted">
                  No database details for this item.
                </p>
              ) : null}

              {error ? (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    missingKey
                      ? "border-mn-warning/40 bg-mn-warning/10 text-mn-warning"
                      : "border-mn-danger/40 bg-mn-danger/10 text-mn-danger"
                  }`}
                >
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="text-sm text-mn-fg-muted">
                  Fetching plot summary…
                </div>
              ) : media?.overview ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-mn-fg">
                  {media.overview}
                </p>
              ) : tmdbId && mediaType ? (
                <p className="text-sm leading-6 text-mn-fg-muted">
                  No plot summary available.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
