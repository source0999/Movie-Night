"use client";

import type { LibraryItem } from "../lib/movieLibrary";
import { isWatchlistItemPassed } from "../lib/movieLibrary";
import type { MovieNightUserName } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import {
  normalizeSeenIt,
  togglePassed,
  toggleSeenForPerson,
} from "../lib/watchlistGroup";

const PERSON_BY_LOGIN: Record<MovieNightUserName, "alex" | "britton" | "nabi"> =
  {
    Alex: "alex",
    Britton: "britton",
    Nabi: "nabi",
  };

const PERSON_LABEL: Record<"alex" | "britton" | "nabi", string> = {
  alex: "Alex",
  britton: "Britton",
  nabi: "Nabi",
};

/** Compact badge on the poster (bottom) when a watchlist title is passed — no full-poster overlay. */
export function PassedRibbon({ item }: { item: LibraryItem }) {
  if (!isWatchlistItemPassed(item)) return null;
  const by = item.passedBy?.trim();
  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 right-2 z-[6] flex justify-center"
      role="status"
    >
      <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-rose-400/70 bg-rose-950/92 px-2 py-1 shadow-md shadow-black/30 ring-1 ring-rose-500/25 backdrop-blur-sm dark:bg-rose-950/95">
        <svg
          className="h-3 w-3 shrink-0 text-rose-200"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M5 5l6 6M11 5l-6 6"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
        <p className="truncate text-[10px] font-semibold leading-tight text-rose-50 sm:text-[11px]">
          {by ? (
            <>
              Passed by <span className="text-white">{by}</span>
            </>
          ) : (
            "Passed"
          )}
        </p>
      </div>
    </div>
  );
}

function seenButtonClass(
  active: boolean,
  color: "violet" | "cyan" | "green",
  canToggle: boolean,
  compact: boolean,
) {
  const size = compact
    ? "h-8 w-8 border-[2px] text-[11px]"
    : "h-10 w-10 border-[2.5px] text-sm";
  const base = `flex ${size} shrink-0 items-center justify-center rounded-full font-bold transition select-none focus:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-400/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950`;
  const cursor = canToggle ? "cursor-pointer" : "cursor-not-allowed";

  if (!active) {
    const dim =
      "border-zinc-300 bg-zinc-100 text-zinc-500 shadow-inner dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400";
    const hover =
      canToggle
        ? " hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        : "";
    return `${base} ${dim} ${hover} ${cursor}`;
  }

  const glow =
    color === "violet"
      ? "border-violet-500 bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.65)] ring-2 ring-violet-400/50 dark:border-violet-400 dark:bg-violet-500"
      : color === "cyan"
        ? "border-cyan-500 bg-cyan-600 text-white shadow-[0_0_16px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400/50 dark:border-cyan-400 dark:bg-cyan-500"
        : "border-emerald-500 bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/45 dark:border-emerald-400 dark:bg-emerald-500";

  const activeHover =
    canToggle ? " hover:brightness-110 active:brightness-95" : "";
  return `${base} ${glow} ${cursor} ${activeHover}`;
}

type Person = "alex" | "britton" | "nabi";

function SeenToggle({
  person,
  active,
  color,
  canToggle,
  hydrated,
  compact,
  onToggle,
}: {
  person: Person;
  active: boolean;
  color: "violet" | "cyan" | "green";
  canToggle: boolean;
  hydrated: boolean;
  compact: boolean;
  onToggle: () => void;
}) {
  const label = PERSON_LABEL[person];
  const initial = label[0]!.toUpperCase();
  const blockedTip = `Only ${label} can change this`;
  const tip = canToggle ? `${label} — tap to toggle` : blockedTip;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label} seen it`}
      title={tip}
      disabled={!hydrated}
      className={seenButtonClass(
        active,
        color,
        canToggle && hydrated,
        compact,
      )}
      onClick={() => {
        if (!hydrated || !canToggle) return;
        onToggle();
      }}
    >
      {initial}
    </button>
  );
}

function SeenItEyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function WatchlistGroupControls({
  item,
  disabled,
  onPatch,
  showPass = true,
  compact = false,
}: {
  item: LibraryItem;
  disabled: boolean;
  onPatch: (next: LibraryItem) => void;
  /** Hide on non-watchlist surfaces; Pass is watchlist-only. */
  showPass?: boolean;
  /** Tighter layout and smaller A/B/N chips (e.g. home cards on mobile). */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const seen = normalizeSeenIt(item);
  const passed = isWatchlistItemPassed(item);

  const myPerson: Person | null = user?.name
    ? PERSON_BY_LOGIN[user.name]
    : null;

  const hydrated = !disabled;

  const rowGap = compact ? "gap-1.5 px-1.5 py-1.5" : "gap-2.5 px-2 py-2";

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
      <div
        className={`flex flex-wrap items-center rounded-xl border border-zinc-200/60 bg-zinc-50/80 dark:border-zinc-700/60 dark:bg-zinc-900/40 ${rowGap}`}
        title="Seen it"
      >
        <span
          className={`ml-0.5 shrink-0 text-zinc-500 dark:text-zinc-400 ${compact ? "sm:ml-1" : ""}`}
        >
          <span className="sr-only sm:not-sr-only">
            <span
              className={
                compact
                  ? "text-[9px] font-bold uppercase tracking-wider"
                  : "text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
              }
            >
              Seen it
            </span>
          </span>
          <span className="inline sm:hidden" aria-hidden>
            <SeenItEyeIcon className="text-zinc-500 dark:text-zinc-400" />
          </span>
        </span>
        <SeenToggle
          person="alex"
          color="violet"
          active={seen.alex}
          hydrated={hydrated}
          compact={compact}
          canToggle={myPerson === "alex"}
          onToggle={() => onPatch(toggleSeenForPerson(item, "alex"))}
        />
        <SeenToggle
          person="britton"
          color="cyan"
          active={seen.britton}
          hydrated={hydrated}
          compact={compact}
          canToggle={myPerson === "britton"}
          onToggle={() => onPatch(toggleSeenForPerson(item, "britton"))}
        />
        <SeenToggle
          person="nabi"
          color="green"
          active={seen.nabi}
          hydrated={hydrated}
          compact={compact}
          canToggle={myPerson === "nabi"}
          onToggle={() => onPatch(toggleSeenForPerson(item, "nabi"))}
        />
      </div>

      {showPass ? (
        <div className="flex w-full justify-center px-0.5">
          <button
            type="button"
            disabled={disabled || (!passed && !user?.name)}
            aria-pressed={passed}
            className={`w-full max-w-[240px] rounded-xl border-2 font-bold shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
              compact
                ? "min-h-[40px] px-3 py-2 text-xs"
                : "min-h-[44px] px-5 py-2.5 text-sm"
            } ${
              passed
                ? "border-rose-400 bg-gradient-to-b from-rose-100 to-rose-50 text-rose-950 shadow-rose-500/20 dark:border-rose-600 dark:from-rose-950/80 dark:to-rose-900/50 dark:text-rose-100"
                : "border-violet-400/80 bg-gradient-to-b from-violet-600 to-violet-700 text-white shadow-violet-900/25 hover:from-violet-500 hover:to-violet-600 disabled:opacity-50 dark:border-violet-500 dark:from-violet-600 dark:to-violet-800"
            }`}
            onClick={() =>
              onPatch(togglePassed(item, user?.name ?? null))
            }
          >
            {passed ? "Undo pass" : "Pass"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
