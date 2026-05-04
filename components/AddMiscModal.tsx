"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createMiscLibraryItem } from "../lib/movieLibrary";
import { useMovieLibrary } from "../hooks/useMovieLibrary";
import type { MovieNightUser } from "../lib/auth";
import { useModalFocusTrap } from "../hooks/useModalFocusTrap";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const { saveMovie, hydrated } = useMovieLibrary();
  const [miscUrl, setMiscUrl] = useState("");
  const [miscTitle, setMiscTitle] = useState("");
  const [recommendedByInput, setRecommendedByInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useModalFocusTrap(true, panelRef);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setMiscUrl("");
      setMiscTitle("");
      setRecommendedByInput(user.name?.trim() ?? "");
      setError(null);
    });
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

  const inputClass =
    "mt-1 w-full rounded-xl border border-mn-border bg-mn-input px-3 py-2 text-sm text-mn-fg placeholder:text-mn-fg-soft outline-none transition focus:border-mn-border-strong focus:ring-2 focus:ring-mn-focus/30";

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-misc-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60 mn-modal-backdrop-animate backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
      />

      <div
        ref={panelRef}
        className="mn-modal-shell relative z-10 m-0 flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)-1rem))] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[var(--mn-radius-lg)] border border-mn-border bg-mn-modal p-0 text-mn-fg shadow-[var(--mn-shadow-soft)] sm:max-h-[95vh] sm:max-w-lg sm:rounded-[var(--mn-radius-lg)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-mn-border-strong sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-mn-border p-5">
          <div className="min-w-0">
            <h2 id="add-misc-title" className="text-lg font-semibold">
              Add misc link
            </h2>
            <p className="mt-1 text-sm text-mn-fg-muted">
              YouTube, TikTok, Reels, or any URL — saves to your Misc watchlist.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mn-btn-press min-h-[44px] shrink-0 rounded-xl border border-mn-border bg-mn-input px-3 py-2 text-sm text-mn-fg hover:bg-mn-card-elev"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <label className="block text-sm">
            <span className="text-xs font-medium text-mn-fg-muted">URL</span>
            <input
              value={miscUrl}
              onChange={(e) => setMiscUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-mn-fg-muted">Title</span>
            <input
              value={miscTitle}
              onChange={(e) => setMiscTitle(e.target.value)}
              placeholder="Short label"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-mn-fg-muted">
              Recommended by
            </span>
            <input
              value={recommendedByInput}
              onChange={(e) => setRecommendedByInput(e.target.value)}
              placeholder="Alex"
              className={inputClass}
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-mn-danger/40 bg-mn-danger/10 px-3 py-2 text-sm text-mn-danger">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mn-btn-press min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-2 text-sm font-medium text-mn-fg hover:bg-mn-card-elev"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hydrated}
              className="mn-btn-press min-h-[44px] rounded-xl bg-mn-accent px-4 py-2 text-sm font-medium text-mn-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(modal, document.body);
}
