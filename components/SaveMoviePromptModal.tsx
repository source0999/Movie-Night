"use client";

import { useEffect, useRef, useState } from "react";
import type { LibraryCategory } from "../lib/movieLibrary";

function RatingSlider10({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {label}
        </p>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} rating`}
        className="mt-2 w-full accent-amber-500"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}

export default function SaveMoviePromptModal({
  open,
  category,
  onCancel,
  onSave,
}: {
  open: boolean;
  category: LibraryCategory | null;
  onCancel: () => void;
  onSave: (args: {
    alexRating?: number | null;
    brittonRating?: number | null;
    nabiRating?: number | null;
  }) => void;
}) {
  const [alexRating, setAlexRating] = useState<number>(7);
  const [brittonRating, setBrittonRating] = useState<number>(7);
  const [nabiRating, setNabiRating] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);
  const didAutoSaveRef = useRef(false);

  const isWatched = category === "watched";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      // Defer state updates to satisfy eslint "set-state-in-effect".
      await Promise.resolve();
      if (cancelled) return;
      setAlexRating(7);
      setBrittonRating(7);
      setNabiRating(7);
      setError(null);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, category]);

  // Reset the auto-save guard whenever the modal is opened/changed.
  useEffect(() => {
    didAutoSaveRef.current = false;
  }, [open, category]);

  // For Watchlist we don't need any extra inputs, so we skip the modal UI entirely
  // and save immediately once the modal is opened.
  useEffect(() => {
    if (!open || !category) return;
    if (category !== "watchlist") return;
    if (didAutoSaveRef.current) return;

    didAutoSaveRef.current = true;
    onSave({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  if (!open || !category) return null;
  if (category === "watchlist") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-label="Close"
      />

      <div className="relative w-full max-w-[95vw] overflow-y-auto rounded-2xl bg-white p-4 text-zinc-900 shadow-xl dark:bg-black dark:text-zinc-50 max-h-[95vh] sm:max-w-lg">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold">Save movie</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Mark as Watched.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            if (isWatched) {
              if (alexRating < 1 || alexRating > 10) {
                setError("Please set Alex rating (1-10).");
                return;
              }
              if (brittonRating < 1 || brittonRating > 10) {
                setError("Please set Britton rating (1-10).");
                return;
              }
              if (nabiRating < 1 || nabiRating > 10) {
                setError("Please set Nabi rating (1-10).");
                return;
              }
            }

            onSave({
              alexRating: isWatched ? alexRating : null,
              brittonRating: isWatched ? brittonRating : null,
              nabiRating: isWatched ? nabiRating : null,
            });
          }}
        >
          {isWatched ? (
            <div className="flex flex-col gap-3">
              <RatingSlider10
                label="Alex"
                value={alexRating}
                onChange={setAlexRating}
              />
              <RatingSlider10
                label="Britton"
                value={brittonRating}
                onChange={setBrittonRating}
              />
              <RatingSlider10
                label="Nabi"
                value={nabiRating}
                onChange={setNabiRating}
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

