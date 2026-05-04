"use client";

import type { ReactNode } from "react";
import type { LibraryItem } from "../lib/movieLibrary";

export default function MovieCard({
  movie,
  year,
  posterSrc,
  isSearch,
  isSaved,
  isDeleting = false,
  onDelete,
  titleNode,
  infoNode,
  actionsNode,
}: {
  movie: LibraryItem;
  year: string | null;
  posterSrc: string | null;
  isSearch: boolean;
  isSaved?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  titleNode?: ReactNode;
  infoNode?: ReactNode;
  actionsNode?: ReactNode;
}) {
  const shouldShowDelete = Boolean(onDelete) && (!isSearch || isSaved === true);

  return (
    <article
      className={`movie-card relative flex flex-col overflow-visible ${
        isDeleting ? "is-deleting" : "opacity-100"
      }`}
    >
      {shouldShowDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete movie"
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
      ) : null}

      <div className="relative flex-1">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-[15px] bg-mn-input/40">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt={movie.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[color-mix(in_srgb,var(--mn-accent)_22%,transparent)] to-[color-mix(in_srgb,var(--mn-accent-2)_14%,transparent)] px-4 text-center">
              <div className="text-xs font-medium text-mn-fg-muted">
                No poster image
              </div>
              <div className="line-clamp-2 text-sm font-semibold text-mn-fg">
                {movie.title}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          {titleNode ?? (
            <>
              <h2 className="line-clamp-2 text-base font-semibold leading-5 text-mn-fg">
                {movie.title}
              </h2>
              {year ? (
                <p className="mt-1 text-sm text-mn-fg-muted">{year}</p>
              ) : (
                <p className="mt-1 text-sm text-mn-fg-muted">Year unknown</p>
              )}
            </>
          )}
          {infoNode}
        </div>

        {actionsNode}
      </div>
    </article>
  );
}

