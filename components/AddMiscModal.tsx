"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createMiscLibraryItem } from "../lib/movieLibrary";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import type { MovieNightUser } from "../lib/auth";

function normalizePastedUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

export default function AddMiscModal({
  user,
  onClose,
}: {
  user: MovieNightUser;
  onClose: () => void;
}) {
  const { saveMovie, hydrated } = useMovieLibrary();
  const [miscUrl, setMiscUrl] = useState("");
  const [miscTitle, setMiscTitle] = useState("");
  const [recommendedByInput, setRecommendedByInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMiscUrl("");
    setMiscTitle("");
    setRecommendedByInput(user.name?.trim() ?? "");
    setError(null);
  }, [user.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const url = normalizePastedUrl(miscUrl);
    const title = miscTitle.trim();
    const by = recommendedByInput.trim() || user.name?.trim() || "";

    if (!url) {
      setError("Enter a valid URL (YouTube, TikTok, Reels, etc.).");
      return;
    }
    if (!title) {
      setError("Enter a title.");
      return;
    }
    if (!by) {
      setError("Enter who is recommending this link.");
      return;
    }
    if (!hydrated) {
      setError("Library is still syncing. Try again in a moment.");
      return;
    }

    const item = createMiscLibraryItem(url, title, by);
    saveMovie(item, "watchlist");
    onClose();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-misc-title"
    >
      <button
        type="button"
        className="fixed inset-0 z-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
      />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200/80 bg-white p-5 text-zinc-900 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div>
            <h2 id="add-misc-title" className="text-lg font-semibold">
              Add misc link
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              YouTube, TikTok, Reels, or any URL — saves to your Misc watchlist.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Close
          </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              URL
            </span>
            <input
              value={miscUrl}
              onChange={(e) => setMiscUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Title
            </span>
            <input
              value={miscTitle}
              onChange={(e) => setMiscTitle(e.target.value)}
              placeholder="Short label"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Recommended by
            </span>
            <input
              value={recommendedByInput}
              onChange={(e) => setRecommendedByInput(e.target.value)}
              placeholder="Alex"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hydrated}
              className="min-h-[44px] rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
            >
              Add
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(modal, document.body);
}
