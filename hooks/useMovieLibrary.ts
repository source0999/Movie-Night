"use client";

import { useEffect, useMemo, useState } from "react";
import {
  moveMovieInLibrary,
  removeMovieFromLibrary,
  emptyLibrary,
  type LibraryCategory,
  type LibraryMovie,
  type MovieLibrary,
} from "../lib/movieLibrary";
import { db } from "../src/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

export function useMovieLibrary() {
  const [library, setLibrary] = useState<MovieLibrary>(emptyLibrary);
  const [hydrated, setHydrated] = useState(false);

  const moviesCollectionRef = useMemo(() => {
    // Ensure stable references inside memo.
    return collection(db, "movies");
  }, []);

  useEffect(() => {
    let watchlistLoaded = false;
    let watchedLoaded = false;
    let watchlist: LibraryMovie[] = [];
    let watched: LibraryMovie[] = [];

    const normalizeMovie = (d: unknown): LibraryMovie | null => {
      const obj = d as Record<string, unknown>;
      if (!obj || typeof obj !== "object") return null;

      const id =
        typeof obj.id === "number"
          ? obj.id
          : typeof obj.movieId === "number"
            ? (obj.movieId as number)
            : null;
      const title = typeof obj.title === "string" ? obj.title : null;
      if (typeof id !== "number" || !title) return null;

      const recommendedBy =
        typeof obj.recommendedBy === "string" ? obj.recommendedBy : undefined;

      const release_date =
        typeof obj.release_date === "string" ? obj.release_date : null;
      const poster_path =
        typeof obj.poster_path === "string" ? obj.poster_path : null;

      const alexRating =
        typeof obj.alexRating === "number" ? obj.alexRating : null;
      const brittonRating =
        typeof obj.brittonRating === "number" ? obj.brittonRating : null;
      const nabiRating =
        typeof obj.nabiRating === "number" ? obj.nabiRating : null;

      const groupRatingsObj = obj.groupRatings as
        | Record<string, unknown>
        | undefined;
      const groupRatings =
        groupRatingsObj &&
        typeof groupRatingsObj === "object" &&
        ("alex" in groupRatingsObj ||
          "britton" in groupRatingsObj ||
          "nabi" in groupRatingsObj)
          ? {
              alex:
                typeof groupRatingsObj.alex === "number"
                  ? (groupRatingsObj.alex as number)
                  : null,
              britton:
                typeof groupRatingsObj.britton === "number"
                  ? (groupRatingsObj.britton as number)
                  : null,
              nabi:
                typeof groupRatingsObj.nabi === "number"
                  ? (groupRatingsObj.nabi as number)
                  : null,
            }
          : undefined;

      return {
        id,
        title,
        release_date,
        poster_path,
        recommendedBy,
        groupRatings,
        alexRating,
        brittonRating,
        nabiRating,
      };
    };

    const maybeHydrate = () => {
      if (!watchlistLoaded || !watchedLoaded) return;
      setLibrary({
        watchlist,
        watched,
      });
      setHydrated(true);
    };

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
        watchlist = snap.docs
          .map((docSnap) => normalizeMovie(docSnap.data()))
          .filter((m): m is LibraryMovie => !!m);
        watchlistLoaded = true;
        maybeHydrate();
      },
      (err) => {
        console.error("Firestore watchlist listener error", err);
        watchlist = [];
        watchlistLoaded = true;
        maybeHydrate();
      },
    );

    const unsubWatched = onSnapshot(
      watchedQ,
      (snap) => {
        watched = snap.docs
          .map((docSnap) => normalizeMovie(docSnap.data()))
          .filter((m): m is LibraryMovie => !!m);
        watchedLoaded = true;
        maybeHydrate();
      },
      (err) => {
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
  }, [moviesCollectionRef]);

  const saveMovie = useMemo(
    () => (movie: LibraryMovie, category: LibraryCategory) => {
      setLibrary((prev) => moveMovieInLibrary(prev, movie, category));

      const docRef = doc(db, "movies", String(movie.id));
      const data =
        category === "watchlist"
          ? {
              id: movie.id,
              title: movie.title,
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              recommendedBy: movie.recommendedBy ?? null,
              category,
            }
          : {
              id: movie.id,
              title: movie.title,
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              recommendedBy: movie.recommendedBy ?? null,
              category,
              alexRating: movie.alexRating ?? null,
              brittonRating: movie.brittonRating ?? null,
              nabiRating: movie.nabiRating ?? null,
              groupRatings: {
                alex: movie.groupRatings?.alex ?? movie.alexRating ?? null,
                britton: movie.groupRatings?.britton ?? movie.brittonRating ?? null,
                nabi: movie.groupRatings?.nabi ?? movie.nabiRating ?? null,
              },
            };

      void setDoc(docRef, data, { merge: false }).catch((err) => {
        console.error("Firestore saveMovie failed", err);
      });
    },
    [],
  );

  const removeMovie = useMemo(
    () => (movieId: number) => {
      setLibrary((prev) => removeMovieFromLibrary(prev, movieId));

      const docRef = doc(db, "movies", String(movieId));
      void deleteDoc(docRef).catch((err) => {
        console.error("Firestore removeMovie failed", err);
      });
    },
    [],
  );

  const moveMovie = useMemo(
    () => (movie: LibraryMovie, toCategory: LibraryCategory) => {
      setLibrary((prev) => moveMovieInLibrary(prev, movie, toCategory));

      const docRef = doc(db, "movies", String(movie.id));
      const data =
        toCategory === "watchlist"
          ? {
              id: movie.id,
              title: movie.title,
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              recommendedBy: movie.recommendedBy ?? null,
              category: "watchlist",
            }
          : {
              id: movie.id,
              title: movie.title,
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              recommendedBy: movie.recommendedBy ?? null,
              category: "watched",
              alexRating: movie.alexRating ?? null,
              brittonRating: movie.brittonRating ?? null,
              nabiRating: movie.nabiRating ?? null,
              groupRatings: {
                alex: movie.groupRatings?.alex ?? movie.alexRating ?? null,
                britton:
                  movie.groupRatings?.britton ?? movie.brittonRating ?? null,
                nabi: movie.groupRatings?.nabi ?? movie.nabiRating ?? null,
              },
            };

      void setDoc(docRef, data, { merge: false }).catch((err) => {
        console.error("Firestore moveMovie failed", err);
      });
    },
    [],
  );

  return {
    library,
    hydrated,
    saveMovie,
    removeMovie,
    moveMovie,
  };
}

