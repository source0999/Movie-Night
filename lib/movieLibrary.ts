export type LibraryCategory = "watchlist" | "watched";

export type LibraryMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  recommendedBy?: string;
  groupRatings?: {
    alex: number | null;
    britton: number | null;
    nabi: number | null;
  } | null;
  alexRating?: number | null;
  brittonRating?: number | null;
  nabiRating?: number | null;
};

export type MovieLibrary = {
  watchlist: LibraryMovie[];
  watched: LibraryMovie[];
};

export const LIBRARY_KEY = "movieNight.library.v1";

export const emptyLibrary: MovieLibrary = {
  watchlist: [],
  watched: [],
};

export const categoryLabels: Record<LibraryCategory, string> = {
  watchlist: "Watchlist",
  watched: "Watched",
};

export function calculateGroupAverage(
  alex: number | null | undefined,
  britton: number | null | undefined,
  nabi: number | null | undefined,
) {
  const a =
    typeof alex === "number" && alex >= 1 && alex <= 10 ? alex : null;
  const b =
    typeof britton === "number" && britton >= 1 && britton <= 10
      ? britton
      : null;
  const c =
    typeof nabi === "number" && nabi >= 1 && nabi <= 10 ? nabi : null;
  if (a === null || b === null || c === null) return null;
  const avg = (a + b + c) / 3;
  return Math.round(avg * 10) / 10;
}

export function safeParseLibrary(value: string | null): MovieLibrary {
  if (!value) return emptyLibrary;
  try {
    const parsed = JSON.parse(value) as Partial<MovieLibrary> | null;
    if (!parsed) return emptyLibrary;

    const normalize = (m: unknown): LibraryMovie | null => {
      const obj = m as Record<string, unknown>;
      if (!obj || typeof obj !== "object") return null;
      if (typeof obj.id !== "number") return null;
      if (typeof obj.title !== "string") return null;

      const oldGroupRating = typeof obj.groupRating === "number"
        ? (obj.groupRating as number)
        : null;

      const groupRatingsObj =
        obj.groupRatings && typeof obj.groupRatings === "object"
          ? (obj.groupRatings as Record<string, unknown>)
          : null;

      const groupRatings =
        groupRatingsObj &&
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

      const oldRating10 =
        oldGroupRating !== null
          ? Math.max(1, Math.min(10, Math.round(oldGroupRating * 2)))
          : null;

      const finalGroupRatings =
        groupRatings !== undefined
          ? groupRatings
          : oldRating10 !== null
            ? { alex: oldRating10, britton: oldRating10, nabi: oldRating10 }
            : undefined;

      return {
        id: obj.id as number,
        title: obj.title as string,
        release_date:
          typeof obj.release_date === "string" ? (obj.release_date as string) : null,
        poster_path:
          typeof obj.poster_path === "string" ? (obj.poster_path as string) : null,
        recommendedBy:
          typeof obj.recommendedBy === "string"
            ? (obj.recommendedBy as string)
            : undefined,
        groupRatings: finalGroupRatings,
        alexRating:
          typeof obj.alexRating === "number"
            ? (obj.alexRating as number)
            : finalGroupRatings
              ? finalGroupRatings.alex
              : oldGroupRating !== null
                ? Math.max(1, Math.min(10, Math.round(oldGroupRating * 2)))
                : null,
        brittonRating:
          typeof obj.brittonRating === "number"
            ? (obj.brittonRating as number)
            : finalGroupRatings
              ? finalGroupRatings.britton
              : oldGroupRating !== null
                ? Math.max(1, Math.min(10, Math.round(oldGroupRating * 2)))
                : null,
        nabiRating:
          typeof obj.nabiRating === "number"
            ? (obj.nabiRating as number)
            : finalGroupRatings
              ? finalGroupRatings.nabi
              : oldGroupRating !== null
                ? Math.max(1, Math.min(10, Math.round(oldGroupRating * 2)))
                : null,
      };
    };

    // Backwards compatible migration:
    // - Older versions stored `toWatch` + `groupRecommendations`.
    // - New version stores a single `watchlist`.
    const obj = parsed as unknown as Record<string, unknown>;

    const migratedToWatchRaw = obj["toWatch"];
    const migratedGroupRecommendationsRaw = obj["groupRecommendations"];
    const watchlistFromNewSchemaRaw = obj["watchlist"];
    const watchedRaw = obj["watched"];

    const migratedToWatch = Array.isArray(migratedToWatchRaw)
      ? migratedToWatchRaw.map(normalize).filter((m): m is LibraryMovie => !!m)
      : [];

    const migratedGroupRecommendations = Array.isArray(
      migratedGroupRecommendationsRaw,
    )
      ? migratedGroupRecommendationsRaw
          .map(normalize)
          .filter((m): m is LibraryMovie => !!m)
      : [];

    const watchlistFromNewSchema = Array.isArray(watchlistFromNewSchemaRaw)
      ? watchlistFromNewSchemaRaw
          .map(normalize)
          .filter((m): m is LibraryMovie => !!m)
      : null;

    const watchlist =
      watchlistFromNewSchema ?? [
        ...migratedToWatch,
        ...migratedGroupRecommendations,
      ];

    const watched = Array.isArray(watchedRaw)
      ? watchedRaw.map(normalize).filter((m): m is LibraryMovie => !!m)
      : [];

    return {
      watchlist,
      watched,
    };
  } catch {
    return emptyLibrary;
  }
}

export function readLibraryFromLocalStorage(): MovieLibrary {
  if (typeof window === "undefined") return emptyLibrary;
  return safeParseLibrary(window.localStorage.getItem(LIBRARY_KEY));
}

export function writeLibraryToLocalStorage(library: MovieLibrary) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function moveMovieInLibrary(
  library: MovieLibrary,
  movie: LibraryMovie,
  toCategory: LibraryCategory,
): MovieLibrary {
  if (toCategory === "watchlist") {
    const clearedMovie: LibraryMovie = { ...movie };
    delete clearedMovie.groupRatings;
    delete clearedMovie.alexRating;
    delete clearedMovie.brittonRating;
    delete clearedMovie.nabiRating;
    return {
      watchlist: [
        ...library.watchlist.filter((m) => m.id !== movie.id),
        clearedMovie,
      ],
      watched: library.watched.filter((m) => m.id !== movie.id),
    };
  }

  return {
    watchlist: library.watchlist.filter((m) => m.id !== movie.id),
    watched: [...library.watched.filter((m) => m.id !== movie.id), movie],
  };
}

export function removeMovieFromLibrary(
  library: MovieLibrary,
  movieId: number,
): MovieLibrary {
  return {
    watchlist: library.watchlist.filter((m) => m.id !== movieId),
    watched: library.watched.filter((m) => m.id !== movieId),
  };
}

