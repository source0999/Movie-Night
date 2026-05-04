"use client";

import { getPersonWatchedRating, type LibraryItem } from "../lib/movieLibrary";
import { normalizeSeenIt } from "../lib/watchlistGroup";

function formatRatingSlot(hasSeen: boolean, value: number | null): string {
  if (!hasSeen) return "—";
  if (typeof value === "number" && value >= 1 && value <= 10) {
    return String(value);
  }
  return "—";
}

/** Compact A/B/N scores on watchlist cards when someone has seen and rated. */
export default function WatchlistCardRatingsRow({
  item,
  compact = false,
}: {
  item: LibraryItem;
  /** Tighter padding on narrow home cards. */
  compact?: boolean;
}) {
  const seen = normalizeSeenIt(item);
  const a = getPersonWatchedRating(item, "alex");
  const b = getPersonWatchedRating(item, "britton");
  const n = getPersonWatchedRating(item, "nabi");

  const showA = seen.alex && a !== null;
  const showB = seen.britton && b !== null;
  const showN = seen.nabi && n !== null;
  if (!showA && !showB && !showN) return null;

  const pad = compact ? "p-2 sm:p-2.5" : "p-2.5";

  return (
    <div
      className={`digital-readout rounded-xl border border-mn-border ${pad} text-mn-fg`}
      aria-label="Ratings from people who have watched"
    >
      <p
        className={`font-bold uppercase tracking-wider text-mn-fg-muted ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        Ratings (1–10)
      </p>
      <p
        className={`mt-1 font-semibold tabular-nums text-mn-fg ${compact ? "text-[11px] sm:text-xs" : "text-xs"}`}
      >
        A: {formatRatingSlot(seen.alex, a)}, B:{" "}
        {formatRatingSlot(seen.britton, b)}, N:{" "}
        {formatRatingSlot(seen.nabi, n)}
      </p>
    </div>
  );
}
