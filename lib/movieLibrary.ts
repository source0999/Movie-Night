export type LibraryCategory = "watchlist" | "watched";

/** TMDB-backed entries use movie_ / tv_ prefixes; misc uses misc_ + uuid */
export type LibraryMediaType = "movie" | "tv" | "misc";

export type LibraryItem = {
  docId: string;
  mediaType: LibraryMediaType;
  /** TMDB id for movie and tv; null for misc */
  tmdbId: number | null;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  /** Link for misc items (YouTube, TikTok, Reels, etc.) */
  url?: string | null;
  /** TMDB genre ids (movies/TV from search); misc usually omitted. */
  genreIds?: number[] | null;
  recommendedBy?: string;
  groupRatings?: {
    alex: number | null;
    britton: number | null;
    nabi: number | null;
  } | null;
  alexRating?: number | null;
  brittonRating?: number | null;
  nabiRating?: number | null;
  /** Watchlist: who has seen the trailer / is ready (group tracking). */
  seenIt?: {
    alex: boolean;
    britton: boolean;
    nabi: boolean;
  };
  /** Watchlist: group voted to skip — hidden from roulette. */
  passed?: boolean;
  /** Watchlist: who tapped Pass (shown on card). */
  passedBy?: string | null;
};

/** True if the item counts as passed (legacy `passed` flag or newer `passedBy`). */
export function isWatchlistItemPassed(item: LibraryItem): boolean {
  if (item.passed === true) return true;
  const by = item.passedBy?.trim();
  return !!by;
}

/** @deprecated Use LibraryItem */
export type LibraryMovie = LibraryItem;

export type MediaLibrary = {
  watchlist: LibraryItem[];
  watched: LibraryItem[];
};

/** @deprecated Use MediaLibrary */
export type MovieLibrary = MediaLibrary;

export const LIBRARY_KEY = "movieNight.library.v2";

export const emptyLibrary: MediaLibrary = {
  watchlist: [],
  watched: [],
};

export const categoryLabels: Record<LibraryCategory, string> = {
  watchlist: "Watchlist",
  watched: "Watched",
};

export const libraryTabLabels: Record<
  Exclude<LibraryMediaType, never>,
  string
> = {
  movie: "Movies",
  tv: "TV",
  misc: "Misc",
};

export function libraryItemDocId(
  mediaType: "movie" | "tv",
  tmdbId: number,
): string {
  return `${mediaType}_${tmdbId}`;
}

/**
 * Reads genre ids from Firestore/TMDB-shaped objects: genre_ids, genreIds, or genres[{id}].
 */
export function parseGenreIdsFromRecord(
  obj: Record<string, unknown>,
): number[] | undefined {
  const coerceOne = (x: unknown): number | null => {
    if (typeof x === "number" && Number.isFinite(x)) return Math.trunc(x);
    if (typeof x === "bigint") return Number(x);
    if (typeof x === "string" && /^\d+$/.test(x)) return Number(x);
    return null;
  };

  const tryArray = (arr: unknown): number[] | undefined => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    const ids = arr
      .map(coerceOne)
      .filter((x): x is number => x !== null);
    return ids.length ? ids : undefined;
  };

  const fromIds = tryArray(obj.genre_ids ?? obj.genreIds);
  if (fromIds?.length) return fromIds;

  const genres = obj.genres;
  if (!Array.isArray(genres) || genres.length === 0) return undefined;
  const out: number[] = [];
  for (const g of genres) {
    if (g && typeof g === "object" && !Array.isArray(g)) {
      const n = coerceOne((g as Record<string, unknown>).id);
      if (n !== null) out.push(n);
    }
  }
  return out.length ? out : undefined;
}

const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Returns the 11-char YouTube video id for thumbnail URLs, or null. */
export function youtubeVideoIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  try {
    const withProto = s.includes("://") ? s : `https://${s}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (!host.endsWith("youtube.com")) return null;

    const fromQuery = u.searchParams.get("v");
    if (fromQuery && YOUTUBE_ID_RE.test(fromQuery)) return fromQuery;

    const parts = u.pathname.split("/").filter(Boolean);
    const embedI = parts.indexOf("embed");
    if (embedI >= 0 && parts[embedI + 1] && YOUTUBE_ID_RE.test(parts[embedI + 1]!)) {
      return parts[embedI + 1]!;
    }
    const shortsI = parts.indexOf("shorts");
    if (shortsI >= 0 && parts[shortsI + 1] && YOUTUBE_ID_RE.test(parts[shortsI + 1]!)) {
      return parts[shortsI + 1]!;
    }
    const vi = parts.indexOf("v");
    if (vi >= 0 && parts[vi + 1] && YOUTUBE_ID_RE.test(parts[vi + 1]!)) {
      return parts[vi + 1]!;
    }
    return null;
  } catch {
    return null;
  }
}

const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

/** TMDB poster URL or YouTube thumbnail for misc links; null if nothing to show. */
export function libraryItemCoverImageUrl(
  item: LibraryItem | null | undefined,
): string | null {
  if (!item) return null;
  if (item.mediaType === "misc") {
    const id = youtubeVideoIdFromUrl(item.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  const p = item.poster_path?.trim();
  if (p) return `${TMDB_POSTER_BASE}${p}`;
  return null;
}

export function createMiscLibraryItem(
  url: string,
  title: string,
  recommendedBy: string,
): LibraryItem {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return {
    docId: `misc_${id}`,
    mediaType: "misc",
    tmdbId: null,
    title: title.trim(),
    release_date: null,
    poster_path: null,
    url: url.trim(),
    recommendedBy: recommendedBy.trim(),
  };
}

export function libraryItemFromTmdbHit(args: {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  genreIds?: number[] | null;
}): LibraryItem {
  return {
    docId: libraryItemDocId(args.mediaType, args.tmdbId),
    mediaType: args.mediaType,
    tmdbId: args.tmdbId,
    title: args.title,
    release_date: args.release_date,
    poster_path: args.poster_path,
    url: null,
    genreIds:
      args.genreIds && args.genreIds.length > 0 ? args.genreIds : undefined,
  };
}

export function itemMatchesGenreFilter(
  item: LibraryItem,
  genreId: number | null,
): boolean {
  if (genreId === null) return true;
  const ids = item.genreIds;
  if (!ids?.length) return false;
  return ids.includes(genreId);
}

/** Snapshot genre ids for Firestore / saves (movies & TV only). */
export function copyGenreIdsForPersist(item: LibraryItem): number[] | undefined {
  if (item.mediaType === "misc") return undefined;
  const g = item.genreIds;
  if (!Array.isArray(g) || g.length === 0) return undefined;
  return [...g];
}

/** Movie/TV rows that need a TMDB genre fetch (legacy saves or missing field). */
export function isTmdbItemMissingGenres(item: LibraryItem): boolean {
  if (item.mediaType === "misc") return false;
  if (item.tmdbId == null || !Number.isFinite(item.tmdbId)) return false;
  return !item.genreIds?.length;
}

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

function parseDocIdMedia(
  docId: string,
): { mediaType: LibraryMediaType; tmdbId: number | null } | null {
  if (docId.startsWith("misc_")) {
    return { mediaType: "misc", tmdbId: null };
  }
  const moviePrefix = "movie_";
  const tvPrefix = "tv_";
  if (docId.startsWith(moviePrefix)) {
    const n = Number(docId.slice(moviePrefix.length));
    return Number.isFinite(n) ? { mediaType: "movie", tmdbId: n } : null;
  }
  if (docId.startsWith(tvPrefix)) {
    const n = Number(docId.slice(tvPrefix.length));
    return Number.isFinite(n) ? { mediaType: "tv", tmdbId: n } : null;
  }
  if (/^\d+$/.test(docId)) {
    return { mediaType: "movie", tmdbId: Number(docId) };
  }
  return null;
}

export function safeParseLibrary(value: string | null): MediaLibrary {
  if (!value) return emptyLibrary;
  try {
    const parsed = JSON.parse(value) as Partial<MediaLibrary> | null;
    if (!parsed) return emptyLibrary;

    const normalize = (m: unknown): LibraryItem | null => {
      const obj = m as Record<string, unknown>;
      if (!obj || typeof obj !== "object") return null;

      const mediaTypeRaw = obj.mediaType;
      const mediaType: LibraryMediaType =
        mediaTypeRaw === "tv"
          ? "tv"
          : mediaTypeRaw === "misc"
            ? "misc"
            : "movie";

      const tmdbIdFromObj =
        typeof obj.tmdbId === "number"
          ? obj.tmdbId
          : typeof obj.id === "number"
            ? obj.id
            : null;

      let docId: string | null =
        typeof obj.docId === "string" ? obj.docId : null;
      if (!docId && mediaType === "misc" && typeof obj.id === "string") {
        docId = obj.id.startsWith("misc_") ? obj.id : `misc_${obj.id}`;
      }
      if (!docId && tmdbIdFromObj !== null && mediaType !== "misc") {
        docId = libraryItemDocId(mediaType, tmdbIdFromObj);
      }

      if (!docId) return null;

      const parsedFromDoc = parseDocIdMedia(docId);
      const effectiveMedia = parsedFromDoc?.mediaType ?? mediaType;
      const effectiveTmdb =
        effectiveMedia === "misc"
          ? null
          : (parsedFromDoc?.tmdbId ?? tmdbIdFromObj);

      if (
        effectiveMedia !== "misc" &&
        (effectiveTmdb === null || !Number.isFinite(effectiveTmdb))
      ) {
        return null;
      }

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

      const url =
        typeof obj.url === "string"
          ? obj.url
          : effectiveMedia === "misc"
            ? null
            : null;

      const seenItLoc = obj.seenIt as Record<string, unknown> | undefined;
      const seenIt =
        seenItLoc && typeof seenItLoc === "object"
          ? {
              alex: Boolean(seenItLoc.alex),
              britton: Boolean(seenItLoc.britton),
              nabi: Boolean(seenItLoc.nabi),
            }
          : undefined;

      return {
        docId,
        mediaType: effectiveMedia,
        tmdbId: effectiveTmdb,
        title: obj.title as string,
        release_date:
          typeof obj.release_date === "string" ? (obj.release_date as string) : null,
        poster_path:
          typeof obj.poster_path === "string" ? (obj.poster_path as string) : null,
        url: effectiveMedia === "misc" ? url : null,
        genreIds: parseGenreIdsFromRecord(obj),
        recommendedBy:
          typeof obj.recommendedBy === "string"
            ? (obj.recommendedBy as string)
            : undefined,
        groupRatings: finalGroupRatings,
        seenIt,
        passed:
          obj.passed === true ||
          (typeof obj.passedBy === "string" && obj.passedBy.trim().length > 0),
        passedBy:
          typeof obj.passedBy === "string" ? obj.passedBy : undefined,
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

    const obj = parsed as unknown as Record<string, unknown>;

    const migratedToWatchRaw = obj["toWatch"];
    const migratedGroupRecommendationsRaw = obj["groupRecommendations"];
    const watchlistFromNewSchemaRaw = obj["watchlist"];
    const watchedRaw = obj["watched"];

    const migratedToWatch = Array.isArray(migratedToWatchRaw)
      ? migratedToWatchRaw.map(normalize).filter((m): m is LibraryItem => !!m)
      : [];

    const migratedGroupRecommendations = Array.isArray(
      migratedGroupRecommendationsRaw,
    )
      ? migratedGroupRecommendationsRaw
          .map(normalize)
          .filter((m): m is LibraryItem => !!m)
      : [];

    const watchlistFromNewSchema = Array.isArray(watchlistFromNewSchemaRaw)
      ? watchlistFromNewSchemaRaw
          .map(normalize)
          .filter((m): m is LibraryItem => !!m)
      : null;

    const watchlist =
      watchlistFromNewSchema ?? [
        ...migratedToWatch,
        ...migratedGroupRecommendations,
      ];

    const watched = Array.isArray(watchedRaw)
      ? watchedRaw.map(normalize).filter((m): m is LibraryItem => !!m)
      : [];

    return {
      watchlist,
      watched,
    };
  } catch {
    return emptyLibrary;
  }
}

export function readLibraryFromLocalStorage(): MediaLibrary {
  if (typeof window === "undefined") return emptyLibrary;
  return safeParseLibrary(window.localStorage.getItem(LIBRARY_KEY));
}

export function writeLibraryToLocalStorage(library: MediaLibrary) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function moveMovieInLibrary(
  library: MediaLibrary,
  item: LibraryItem,
  toCategory: LibraryCategory,
): MediaLibrary {
  if (toCategory === "watchlist") {
    const cleared: LibraryItem = { ...item };
    delete cleared.groupRatings;
    delete cleared.alexRating;
    delete cleared.brittonRating;
    delete cleared.nabiRating;
    cleared.seenIt = { alex: false, britton: false, nabi: false };
    cleared.passed = false;
    cleared.passedBy = undefined;
    return {
      watchlist: [
        ...library.watchlist.filter((m) => m.docId !== item.docId),
        cleared,
      ],
      watched: library.watched.filter((m) => m.docId !== item.docId),
    };
  }

  return {
    watchlist: library.watchlist.filter((m) => m.docId !== item.docId),
    watched: [...library.watched.filter((m) => m.docId !== item.docId), item],
  };
}

export function removeMovieFromLibrary(
  library: MediaLibrary,
  docId: string,
): MediaLibrary {
  return {
    watchlist: library.watchlist.filter((m) => m.docId !== docId),
    watched: library.watched.filter((m) => m.docId !== docId),
  };
}

export function recommendedByLabel(name: string | undefined | null) {
  const n = name?.trim();
  return n && n.length > 0 ? n : "Someone";
}

/**
 * Build a LibraryItem from a Firestore document id + stored fields.
 * Supports legacy docs whose id is a numeric string (movies only).
 */
export function libraryItemFromFirestore(
  docId: string,
  raw: Record<string, unknown>,
): LibraryItem | null {
  const explicitMt = raw.mediaType;
  const mediaType: LibraryMediaType =
    explicitMt === "tv"
      ? "tv"
      : explicitMt === "misc"
        ? "misc"
        : explicitMt === "movie"
          ? "movie"
          : parseDocIdMedia(docId)?.mediaType ?? "movie";

  const idFromData =
    typeof raw.id === "number"
      ? raw.id
      : typeof raw.movieId === "number"
        ? raw.movieId
        : null;

  const parsed = parseDocIdMedia(docId);
  const tmdbId =
    mediaType === "misc"
      ? null
      : (parsed?.tmdbId ?? idFromData);

  if (mediaType !== "misc" && (tmdbId === null || !Number.isFinite(tmdbId))) {
    return null;
  }

  const title = typeof raw.title === "string" ? raw.title : null;
  if (!title) return null;

  const recommendedBy =
    typeof raw.recommendedBy === "string" ? raw.recommendedBy : undefined;

  const release_date =
    typeof raw.release_date === "string" ? raw.release_date : null;
  const poster_path =
    typeof raw.poster_path === "string" ? raw.poster_path : null;
  const url =
    mediaType === "misc" && typeof raw.url === "string" ? raw.url : null;

  const alexRating =
    typeof raw.alexRating === "number" ? raw.alexRating : null;
  const brittonRating =
    typeof raw.brittonRating === "number" ? raw.brittonRating : null;
  const nabiRating =
    typeof raw.nabiRating === "number" ? raw.nabiRating : null;

  const groupRatingsObj = raw.groupRatings as
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

  const seenItRaw = raw.seenIt as Record<string, unknown> | undefined;
  const seenIt =
    seenItRaw && typeof seenItRaw === "object"
      ? {
          alex: Boolean(seenItRaw.alex),
          britton: Boolean(seenItRaw.britton),
          nabi: Boolean(seenItRaw.nabi),
        }
      : undefined;

  const passedBy =
    typeof raw.passedBy === "string" && raw.passedBy.trim().length > 0
      ? raw.passedBy.trim()
      : null;
  const passed =
    raw.passed === true || (passedBy !== null && passedBy.length > 0);

  const genreIdsParsed = parseGenreIdsFromRecord(raw);

  return {
    docId,
    mediaType,
    tmdbId,
    title,
    release_date,
    poster_path,
    url,
    genreIds: genreIdsParsed?.length ? genreIdsParsed : undefined,
    recommendedBy,
    groupRatings,
    alexRating,
    brittonRating,
    nabiRating,
    seenIt,
    passed,
    passedBy: passedBy ?? undefined,
  };
}
