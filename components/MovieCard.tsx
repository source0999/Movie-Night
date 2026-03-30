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
      className={`relative flex flex-col overflow-visible rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900 ${
        // Avoid `transform` (e.g. `scale-100`) in the normal state so this card
        // doesn't create a stacking context that can hide the dropdown menu.
        isDeleting ? "scale-[0.98] opacity-0" : "opacity-100"
      }`}
    >
      {shouldShowDelete ? (
        <button
          type="button"
          onClick={onDelete}
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
      ) : null}

      <div className="relative">
        <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt={movie.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 text-center dark:from-zinc-800 dark:to-zinc-900">
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

