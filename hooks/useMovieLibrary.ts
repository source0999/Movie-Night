"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  moveMovieInLibrary,
  removeMovieFromLibrary,
  emptyLibrary,
  isWatchlistItemPassed,
  isTmdbItemMissingGenres,
  libraryItemFromFirestore,
  type LibraryCategory,
  type LibraryItem,
  type MediaLibrary,
} from "../lib/movieLibrary";
import { initFirebase } from "../src/lib/firebase";
import { tmdbGetMovieDetails, tmdbGetTvDetails } from "../src/lib/tmdbClient";
import {
  collection,
  deleteDoc,
  doc,
  query,
  setDoc,
  onSnapshot,
  where,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
function applyPatchToLibrary(
  library: MediaLibrary,
  docId: string,
  patch: Partial<LibraryItem>,
): { nextLib: MediaLibrary; item: LibraryItem; category: LibraryCategory } | null {
  const wi = library.watchlist.findIndex((m) => m.docId === docId);
  const di = library.watched.findIndex((m) => m.docId === docId);
  if (wi < 0 && di < 0) return null;
  const category: LibraryCategory = wi >= 0 ? "watchlist" : "watched";
  const idx = wi >= 0 ? wi : di;
  const source = wi >= 0 ? library.watchlist : library.watched;
  const item = source[idx]!;
  const nextItem: LibraryItem = { ...item, ...patch };
  const nextWatch =
    wi >= 0
      ? library.watchlist.map((m, i) => (i === wi ? nextItem : m))
      : library.watchlist;
  const nextWatched =
    di >= 0
      ? library.watched.map((m, i) => (i === di ? nextItem : m))
      : library.watched;

  return {
    nextLib: { watchlist: nextWatch, watched: nextWatched },
    item: nextItem,
    category,
  };
}

function itemToFirestoreData(item: LibraryItem, category: LibraryCategory) {
  const genreIdsForStore =
    item.mediaType === "misc"
      ? null
      : Array.isArray(item.genreIds) && item.genreIds.length > 0
        ? [...item.genreIds]
        : null;

  const base: Record<string, unknown> = {
    mediaType: item.mediaType,
    id: item.tmdbId,
    title: item.title,
    release_date: item.release_date,
    poster_path: item.poster_path,
    recommendedBy: item.recommendedBy ?? null,
    genre_ids: genreIdsForStore,
    category,
  };

  if (item.mediaType === "misc") {
    base.url = item.url ?? null;
    base.id = null;
    base.genre_ids = null;
  }

  if (category === "watchlist") {
    const s = item.seenIt ?? { alex: false, britton: false, nabi: false };
    base.seenIt = {
      alex: Boolean(s.alex),
      britton: Boolean(s.britton),
      nabi: Boolean(s.nabi),
    };
    base.passed = isWatchlistItemPassed(item);
    base.passedBy = item.passedBy?.trim() || null;
    return base;
  }

  const s = item.seenIt ?? { alex: false, britton: false, nabi: false };
  return {
    ...base,
    alexRating: item.alexRating ?? null,
    brittonRating: item.brittonRating ?? null,
    nabiRating: item.nabiRating ?? null,
    groupRatings: {
      alex: item.groupRatings?.alex ?? item.alexRating ?? null,
      britton: item.groupRatings?.britton ?? item.brittonRating ?? null,
      nabi: item.groupRatings?.nabi ?? item.nabiRating ?? null,
    },
    seenIt: {
      alex: Boolean(s.alex),
      britton: Boolean(s.britton),
      nabi: Boolean(s.nabi),
    },
  };
}

export function useMovieLibrary() {
  const [library, setLibrary] = useState<MediaLibrary>(emptyLibrary);
  const [hydrated, setHydrated] = useState(false);
  /** Bumps when genre backfill skips so the worker effect runs again without waiting on Firestore. */
  const [genreWorkerTick, setGenreWorkerTick] = useState(0);

  const dbRef = useRef<Firestore | null>(null);

  useEffect(() => {
    let cancelled = false;
    let watchlistLoaded = false;
    let watchedLoaded = false;
    let watchlist: LibraryItem[] = [];
    let watched: LibraryItem[] = [];
    let didHydrate = false;

    const forceHydrate = () => {
      if (didHydrate || cancelled) return;
      didHydrate = true;
      setLibrary({ watchlist, watched });
      setHydrated(true);
    };

    const normalizeItem = (docId: string, d: unknown): LibraryItem | null => {
      const obj = d as Record<string, unknown>;
      if (!obj || typeof obj !== "object") return null;
      return libraryItemFromFirestore(docId, obj);
    };

    const maybeHydrate = () => {
      if (!watchlistLoaded || !watchedLoaded) return;
      forceHydrate();
    };

    const run = async () => {
      await Promise.resolve();
      try {
        const { db } = initFirebase();
        dbRef.current = db;

        const moviesCollectionRef = collection(db, "movies");

        const watchlistQ = query(
          moviesCollectionRef,
          where("category", "==", "watchlist"),
        );
        const watchedQ = query(
          moviesCollectionRef,
          where("category", "==", "watched"),
        );

        const unsubWatchlist = onSnapshot(
          watchlistQ,
          (snap) => {
            if (cancelled) return;
            watchlist = snap.docs
              .map((docSnap) =>
                normalizeItem(docSnap.id, docSnap.data()),
              )
              .filter((m): m is LibraryItem => !!m);
            watchlistLoaded = true;
            maybeHydrate();
          },
          (err) => {
            if (cancelled) return;
            console.error("Firestore watchlist listener error", err);
            watchlist = [];
            watchlistLoaded = true;
            maybeHydrate();
          },
        );

        const unsubWatched = onSnapshot(
          watchedQ,
          (snap) => {
            if (cancelled) return;
            watched = snap.docs
              .map((docSnap) =>
                normalizeItem(docSnap.id, docSnap.data()),
              )
              .filter((m): m is LibraryItem => !!m);
            watchedLoaded = true;
            maybeHydrate();
          },
          (err) => {
            if (cancelled) return;
            console.error("Firestore watched listener error", err);
            watched = [];
            watchedLoaded = true;
            maybeHydrate();
          },
        );

        return () => {
          unsubWatchlist();
          unsubWatched();
        };
      } catch (err) {
        console.error("Firestore init failed", err);
        if (!cancelled) {
          watchlistLoaded = true;
          watchedLoaded = true;
          watchlist = [];
          watched = [];
          forceHydrate();
        }
        return () => {};
      }
    };

    let cleanup: undefined | (() => void);
    void run().then((c) => {
      cleanup = c ?? undefined;
    });

    const timeoutId = window.setTimeout(() => {
      watchlistLoaded = true;
      watchedLoaded = true;
      forceHydrate();
    }, 5_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, []);

  const saveMovie = useMemo(
    () => (item: LibraryItem, category: LibraryCategory) => {
      const db = dbRef.current;
      if (!db) return;

      setLibrary((prev) => moveMovieInLibrary(prev, item, category));

      const docRef = doc(db, "movies", item.docId);
      const data = itemToFirestoreData(item, category);

      void setDoc(docRef, data, { merge: false }).catch((err) => {
        console.error("Firestore saveMovie failed", err);
      });
    },
    [],
  );

  const removeMovie = useMemo(
    () => (docId: string) => {
      const db = dbRef.current;
      if (!db) return;

      setLibrary((prev) => removeMovieFromLibrary(prev, docId));

      const docRef = doc(db, "movies", docId);
      void deleteDoc(docRef).catch((err) => {
        console.error("Firestore removeMovie failed", err);
      });
    },
    [],
  );

  const moveMovie = useMemo(
    () => (item: LibraryItem, toCategory: LibraryCategory) => {
      const db = dbRef.current;
      if (!db) return;

      setLibrary((prev) => moveMovieInLibrary(prev, item, toCategory));

      const docRef = doc(db, "movies", item.docId);
      const data = itemToFirestoreData(item, toCategory);

      void setDoc(docRef, data, { merge: false }).catch((err) => {
        console.error("Firestore moveMovie failed", err);
      });
    },
    [],
  );

  const patchLibraryItem = useCallback(
    (docId: string, patch: Partial<LibraryItem>) => {
      setLibrary((prev) => {
        const r = applyPatchToLibrary(prev, docId, patch);
        if (!r) return prev;
        const db = dbRef.current;
        if (db) {
          queueMicrotask(() => {
            void setDoc(doc(db, "movies", docId), itemToFirestoreData(r.item, r.category), {
              merge: false,
            }).catch((err) => {
              console.error("Firestore patchLibraryItem failed", err);
            });
          });
        }
        return r.nextLib;
      });
    },
    [],
  );

  /** Skip TMDB retry after empty/error; awaiting = reserved slot or patch written, waiting for snapshot. */
  const genreSkipRef = useRef(new Set<string>());
  const genreAwaitingRef = useRef(new Set<string>());
  const genreAwaitSinceRef = useRef(new Map<string, number>());

  const backfillMissingGenres = useCallback(
    async (opts?: { maxItems?: number; clearSkipped?: boolean }) => {
      if (opts?.clearSkipped) {
        genreSkipRef.current.clear();
        genreAwaitingRef.current.clear();
        genreAwaitSinceRef.current.clear();
        setGenreWorkerTick((x) => x + 1);
      }
      const maxItems = opts?.maxItems ?? 80;
      let updated = 0;
      let failed = 0;

      const candidates: LibraryItem[] = [];
      for (const item of library.watchlist) {
        if (isTmdbItemMissingGenres(item)) candidates.push(item);
      }
      for (const item of library.watched) {
        if (isTmdbItemMissingGenres(item)) candidates.push(item);
      }

      const slice = candidates.slice(0, maxItems);
      for (const item of slice) {
        try {
          const d =
            item.mediaType === "movie"
              ? await tmdbGetMovieDetails(item.tmdbId!)
              : await tmdbGetTvDetails(item.tmdbId!);
          if (d.genre_ids.length > 0) {
            patchLibraryItem(item.docId, {
              genreIds: [...d.genre_ids],
            });
            genreAwaitingRef.current.add(item.docId);
            genreAwaitSinceRef.current.set(item.docId, Date.now());
            updated++;
          } else {
            genreSkipRef.current.add(item.docId);
          }
        } catch {
          failed++;
          genreSkipRef.current.add(item.docId);
        }
        await new Promise((r) => setTimeout(r, 320));
      }

      return {
        updated,
        failed,
        skipped: Math.max(0, candidates.length - slice.length),
      };
    },
    [library.watchlist, library.watched, patchLibraryItem, setGenreWorkerTick],
  );

  /** One title at a time: reserve → TMDB fetch → patch → wait for snapshot (or timeout). */
  useEffect(() => {
    if (!hydrated) return;

    const combined = [...library.watchlist, ...library.watched];
    const now = Date.now();
    let timedOutAny = false;

    for (const id of [...genreAwaitingRef.current]) {
      const row = combined.find((x) => x.docId === id);
      if (row?.genreIds?.length) {
        genreAwaitingRef.current.delete(id);
        genreAwaitSinceRef.current.delete(id);
        continue;
      }
      const t0 = genreAwaitSinceRef.current.get(id);
      if (t0 && now - t0 > 25_000) {
        genreAwaitingRef.current.delete(id);
        genreAwaitSinceRef.current.delete(id);
        genreSkipRef.current.add(id);
        timedOutAny = true;
        console.warn("[movieNight] genre snapshot timeout, skipping", id);
      }
    }
    if (timedOutAny) {
      setGenreWorkerTick((x) => x + 1);
    }

    const next = combined.find((i) => {
      if (!isTmdbItemMissingGenres(i)) return false;
      if (genreSkipRef.current.has(i.docId)) return false;
      if (genreAwaitingRef.current.has(i.docId)) return false;
      return true;
    });
    if (!next) return;

    genreAwaitingRef.current.add(next.docId);
    genreAwaitSinceRef.current.set(next.docId, Date.now());

    void (async () => {
      try {
        const d =
          next.mediaType === "movie"
            ? await tmdbGetMovieDetails(next.tmdbId!)
            : await tmdbGetTvDetails(next.tmdbId!);
        if (d.genre_ids.length > 0) {
          patchLibraryItem(next.docId, { genreIds: [...d.genre_ids] });
        } else {
          genreAwaitingRef.current.delete(next.docId);
          genreAwaitSinceRef.current.delete(next.docId);
          genreSkipRef.current.add(next.docId);
          setGenreWorkerTick((x) => x + 1);
        }
      } catch (e) {
        console.warn("[movieNight] auto genre backfill failed", next.docId, e);
        genreAwaitingRef.current.delete(next.docId);
        genreAwaitSinceRef.current.delete(next.docId);
        genreSkipRef.current.add(next.docId);
        setGenreWorkerTick((x) => x + 1);
      }
    })();
  }, [
    hydrated,
    library.watchlist,
    library.watched,
    patchLibraryItem,
    genreWorkerTick,
  ]);

  return {
    library,
    hydrated,
    saveMovie,
    removeMovie,
    moveMovie,
    patchLibraryItem,
    backfillMissingGenres,
  };
}
