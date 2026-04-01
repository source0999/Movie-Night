import type { LibraryItem } from "./movieLibrary";

const STORAGE_KEY = "movieNight.roulette.winCounts";

function normalizeRecommenderKey(name: string | undefined | null): string {
  return (name?.trim().toLowerCase() || "someone");
}

export function getRouletteWinCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof v === "number" && v >= 0) out[k] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

export function recordRouletteWin(recommendedBy: string | undefined | null) {
  if (typeof window === "undefined") return;
  try {
    const k = normalizeRecommenderKey(recommendedBy);
    const counts = getRouletteWinCounts();
    counts[k] = (counts[k] ?? 0) + 1;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore
  }
}

export function expandFairWheelSlots(items: LibraryItem[]): LibraryItem[] {
  return items.slice();
}

/**
 * Duplicate items so recommenders with fewer recorded wins get more segments.
 * Capped so the wheel does not explode (max weight per title 8).
 */
export function expandRecommenderWeightedSlots(items: LibraryItem[]): LibraryItem[] {
  if (items.length === 0) return [];
  const counts = getRouletteWinCounts();
  const winFor = (item: LibraryItem) =>
    counts[normalizeRecommenderKey(item.recommendedBy)] ?? 0;
  let maxWin = 0;
  for (const it of items) {
    maxWin = Math.max(maxWin, winFor(it));
  }

  const slots: LibraryItem[] = [];
  for (const item of items) {
    const w = winFor(item);
    const weight = Math.min(8, Math.max(1, 1 + (maxWin - w)));
    for (let j = 0; j < weight; j++) slots.push(item);
  }

  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = slots[i]!;
    const b = slots[j]!;
    slots[i] = b;
    slots[j] = a;
  }
  return slots;
}
