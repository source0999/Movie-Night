"use client";

import type { ReactNode } from "react";
import type { LibraryMovie } from "../lib/movieLibrary";

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
  movie: LibraryMovie;
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
      ) : null}

      <div className="relative flex-1">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-[15px] bg-[rgba(255,255,255,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt={movie.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[rgba(168,85,247,0.18)] to-[rgba(34,211,238,0.08)] px-4 text-center">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-300">
                No poster image
              </div>
              <div className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
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
              <h2 className="line-clamp-2 text-base font-semibold leading-5">
                {movie.title}
              </h2>
              {year ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {year}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Year unknown
                </p>
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

