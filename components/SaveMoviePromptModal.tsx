"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useModalFocusTrap } from "../hooks/useModalFocusTrap";
import type { MovieNightUserName } from "../lib/auth";
import {
  calculateGroupAverage,
  getPersonWatchedRating,
  mergeWatchedRatingPatch,
  type LibraryCategory,
  type LibraryItem,
  type WatchedPerson,
  type WatchedRatingPatch,
} from "../lib/movieLibrary";

const PERSON_BY_LOGIN: Record<MovieNightUserName, WatchedPerson> = {
  Alex: "alex",
  Britton: "britton",
  Nabi: "nabi",
};

const PERSON_LABELS: Record<WatchedPerson, string> = {
  alex: "Alex",
  britton: "Britton",
  nabi: "Nabi",
};

const PERSON_ORDER: WatchedPerson[] = ["alex", "britton", "nabi"];

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
    <div className="rounded-xl border border-mn-border bg-mn-input p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-mn-fg">{label}</p>
        <span className="text-sm font-semibold text-mn-fg">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} rating`}
        className="mt-2 w-full"
        style={{ accentColor: "var(--mn-accent)" }}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-mn-fg-muted">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}

function OthersRatingReadout({
  person,
  value,
}: {
  person: WatchedPerson;
  value: number | null;
}) {
  const label = PERSON_LABELS[person];
  return (
    <div className="rounded-xl border border-mn-border bg-mn-input p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-mn-fg">{label}</p>
        <span className="text-sm font-semibold text-mn-fg">
          {value !== null ? value : "—"}
        </span>
      </div>
      <p className="mt-2 text-xs text-mn-fg-muted">
        {value !== null
          ? "Only they can change this rating."
          : "Not rated yet — they add theirs when they watch."}
      </p>
    </div>
  );
}

export default function SaveMoviePromptModal({
  open,
  category,
  ratedByUserName,
  ratingBaseItem,
  onCancel,
  onSave,
}: {
  open: boolean;
  category: LibraryCategory | null;
  /** Logged-in Movie Night user; required to submit a watched rating. */
  ratedByUserName: MovieNightUserName | null;
  /** Row being saved (watchlist → watched or rating updates); used for merge + readouts. */
  ratingBaseItem: LibraryItem | null;
  onCancel: () => void;
  onSave: (args: WatchedRatingPatch) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [myRating, setMyRating] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);
  const didAutoSaveRef = useRef(false);

  const myPerson: WatchedPerson | null = ratedByUserName
    ? PERSON_BY_LOGIN[ratedByUserName]
    : null;

  const trapActive = open && Boolean(category) && category !== "watchlist";
  useModalFocusTrap(trapActive, panelRef);

  const groupPreview = useMemo(() => {
    if (category !== "watched" || !ratingBaseItem || !myPerson) return null;
    const patch: WatchedRatingPatch = {};
    if (myPerson === "alex") patch.alexRating = myRating;
    else if (myPerson === "britton") patch.brittonRating = myRating;
    else patch.nabiRating = myRating;
    const m = mergeWatchedRatingPatch(ratingBaseItem, patch);
    return calculateGroupAverage(m.alexRating, m.brittonRating, m.nabiRating);
  }, [category, ratingBaseItem, myPerson, myRating]);

  useEffect(() => {
    if (!open || category !== "watched") return;
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (myPerson && ratingBaseItem) {
        setMyRating(getPersonWatchedRating(ratingBaseItem, myPerson) ?? 7);
      } else {
        setMyRating(7);
      }
      setError(null);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, category, myPerson, ratingBaseItem]);

  useEffect(() => {
    didAutoSaveRef.current = false;
  }, [open, category]);

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
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-prompt-title"
    >
      <div
        className="absolute inset-0 z-0 bg-black/55 mn-modal-backdrop-animate"
        role="presentation"
        onClick={onCancel}
        onKeyDown={() => {}}
      />

      <div
        ref={panelRef}
        className="mn-modal-shell relative z-10 flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom)-1rem))] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[var(--mn-radius-lg)] border border-mn-border bg-mn-modal text-mn-fg shadow-[var(--mn-shadow-soft)] sm:max-h-[95vh] sm:max-w-lg sm:rounded-[var(--mn-radius-lg)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-mn-border-strong sm:hidden" />

        <div className="flex items-start justify-between gap-4 border-b border-mn-border p-4">
          <div className="min-w-0">
            <h2 id="save-prompt-title" className="text-lg font-semibold">
              Save movie
            </h2>
            <p className="mt-1 text-sm text-mn-fg-muted">
              Mark as Watched — set your score (1–10). Others add theirs when
              they watch.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="mn-btn-press min-h-[44px] shrink-0 rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm text-mn-fg hover:bg-mn-card-elev"
          >
            Close
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            if (!ratedByUserName || !myPerson) {
              setError("Sign in from the header to save your rating.");
              return;
            }
            if (myRating < 1 || myRating > 10) {
              setError("Set a rating between 1 and 10.");
              return;
            }

            const patch: WatchedRatingPatch = {};
            if (myPerson === "alex") patch.alexRating = myRating;
            else if (myPerson === "britton") patch.brittonRating = myRating;
            else patch.nabiRating = myRating;

            onSave(patch);
          }}
        >
          <div className="flex flex-col gap-3">
            {PERSON_ORDER.map((person) => {
              const existing = ratingBaseItem
                ? getPersonWatchedRating(ratingBaseItem, person)
                : null;
              const isMine = myPerson === person;
              if (isMine) {
                return (
                  <RatingSlider10
                    key={person}
                    label={`${PERSON_LABELS[person]} (you)`}
                    value={myRating}
                    onChange={setMyRating}
                  />
                );
              }
              return (
                <OthersRatingReadout
                  key={person}
                  person={person}
                  value={existing}
                />
              );
            })}
          </div>

          {groupPreview !== null ? (
            <p className="text-sm text-mn-fg-muted">
              Group average (so far):{" "}
              <span className="font-semibold text-mn-fg">{groupPreview}</span>
            </p>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-mn-danger/40 bg-mn-danger/10 p-3 text-sm text-mn-danger">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="mn-btn-press min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm font-medium text-mn-fg transition hover:bg-mn-card-elev"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ratedByUserName}
              className="mn-btn-press min-h-[44px] rounded-xl bg-mn-accent px-4 py-3 text-sm font-medium text-mn-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
