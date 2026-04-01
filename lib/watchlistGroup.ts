import { isWatchlistItemPassed, type LibraryItem } from "./movieLibrary";

export type SeenPerson = "alex" | "britton" | "nabi";

export const defaultSeenIt = (): NonNullable<LibraryItem["seenIt"]> => ({
  alex: false,
  britton: false,
  nabi: false,
});

export function normalizeSeenIt(
  item: LibraryItem,
): NonNullable<LibraryItem["seenIt"]> {
  const s = item.seenIt;
  if (!s) return defaultSeenIt();
  return {
    alex: Boolean(s.alex),
    britton: Boolean(s.britton),
    nabi: Boolean(s.nabi),
  };
}

export function toggleSeenForPerson(
  item: LibraryItem,
  person: SeenPerson,
): LibraryItem {
  const seenIt = normalizeSeenIt(item);
  return {
    ...item,
    seenIt: {
      ...seenIt,
      [person]: !seenIt[person],
    },
  };
}

export function togglePassed(
  item: LibraryItem,
  actorName: string | null,
): LibraryItem {
  if (isWatchlistItemPassed(item)) {
    return { ...item, passed: false, passedBy: undefined };
  }
  const name = actorName?.trim();
  if (!name) return item;
  return { ...item, passed: true, passedBy: name };
}
