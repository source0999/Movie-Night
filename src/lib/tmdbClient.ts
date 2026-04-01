export type TMDBSearchMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[];
};

export type TMDBSearchTv = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[];
};

function parseGenreIdsFromResult(obj: Record<string, unknown>): number[] {
  const g = obj.genre_ids;
  if (!Array.isArray(g)) return [];
  return g.filter(
    (x): x is number =>
      typeof x === "number" && Number.isInteger(x),
  );
}

/** Movie/TV detail responses use `genres: [{ id, name }]`, not always `genre_ids`. */
function genreIdsFromDetailPayload(data: Record<string, unknown>): number[] {
  const genres = data.genres;
  if (Array.isArray(genres) && genres.length > 0) {
    const ids: number[] = [];
    for (const g of genres) {
      if (g && typeof g === "object" && "id" in g) {
        const id = (g as { id: unknown }).id;
        if (typeof id === "number" && Number.isFinite(id)) {
          ids.push(Math.trunc(id));
        }
      }
    }
    if (ids.length > 0) return ids;
  }
  return parseGenreIdsFromResult(data);
}

type TmdbAuth =
  | { type: "bearer"; token: string; tokenLooksLikeJwt: true }
  | { type: "apiKey"; key: string; tokenLooksLikeJwt: false };

function base64UrlDecode(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return atob(normalized + pad);
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): { aud?: unknown; scopes?: unknown } | null {
  // JWT format: header.payload.signature
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadJson = base64UrlDecode(parts[1]);
  if (!payloadJson) return null;
  try {
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    return {
      aud: payload.aud,
      scopes: payload.scopes,
    };
  } catch {
    return null;
  }
}

function getTmdbAuth(): TmdbAuth {
  const value = process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN?.trim();
  if (!value) {
    throw new Error(
      "Movie database authentication is missing. Add NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN to your environment.",
    );
  }

  // Read access token is JWT-like (three dot-separated parts).
  const looksLikeJwt =
    value.includes(".") && value.split(".").length === 3 && value.startsWith("eyJ");

  if (looksLikeJwt) return { type: "bearer", token: value, tokenLooksLikeJwt: true };

  // Fallback: if someone placed the raw API key into the same env var,
  // use it as the `api_key` query parameter instead of Bearer.
  return { type: "apiKey", key: value, tokenLooksLikeJwt: false };
}

function getOptionalTmdbApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
  return key ? key : null;
}

export async function tmdbSearchMovies(
  query: string,
  language = "en-US",
): Promise<TMDBSearchMovie[]> {
  const tmdbAuth = getTmdbAuth();

  const url = new URL(
    "https://api.themoviedb.org/3/search/movie",
  );
  url.search = new URLSearchParams({
    query,
    include_adult: "false",
    language,
    ...(tmdbAuth.type === "apiKey" ? { api_key: tmdbAuth.key } : {}),
  }).toString();

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...(tmdbAuth.type === "bearer" ? { Authorization: `Bearer ${tmdbAuth.token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await parseTmdbError(res);

    // Retry once using the alternate auth method (helpful if a secret is the wrong type).
    if (err.status_code === 7 && tmdbAuth.type === "bearer") {
      const retryUrl = new URL(url.toString());
      const apiKey = getOptionalTmdbApiKey();
      const apiKeyRetryUsed = apiKey
        ? "NEXT_PUBLIC_TMDB_API_KEY"
        : "TMDB_READ_ACCESS_TOKEN-as-api_key";
      retryUrl.searchParams.set("api_key", apiKey ?? tmdbAuth.token);

      const retryRes = await fetch(retryUrl.toString(), {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (retryRes.ok) {
        const data = (await retryRes.json()) as { results?: unknown[] };
        const results = Array.isArray(data.results) ? data.results : [];
        return results
          .map((m: unknown) => {
            const obj = m as Record<string, unknown>;
            const id = typeof obj.id === "number" ? obj.id : null;
            const title =
              typeof obj.title === "string" ? obj.title : ("Untitled" as const);
            if (id === null) return null;

            const release_date =
              typeof obj.release_date === "string" ? obj.release_date : null;
            const poster_path =
              typeof obj.poster_path === "string" ? obj.poster_path : null;
            const overview =
              typeof obj.overview === "string" ? obj.overview : null;

            return {
              id,
              title,
              release_date,
              poster_path,
              overview,
              genre_ids: parseGenreIdsFromResult(obj),
            } satisfies TMDBSearchMovie;
          })
          .filter((m): m is TMDBSearchMovie => !!m);
      }

      const retryErr = await parseTmdbError(retryRes);
      throw new Error(
        JSON.stringify(
          {
            tmdb: {
              status_code: err.status_code,
              status_message: err.status_message,
              authStrategyTried: ["bearer", "api_key"],
              tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
              jwtPayload: decodeJwtPayload(tmdbAuth.token),
              apiKeyRetryUsed,
              retryStatus_code: retryErr.status_code,
              retryStatus_message: retryErr.status_message,
            },
          },
          null,
          2,
        ),
      );
    }

    throw new Error(
      JSON.stringify(
        {
          tmdb: {
            status_code: err.status_code,
            status_message: err.status_message,
            authStrategyTried: [tmdbAuth.type],
            tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
            jwtPayload: tmdbAuth.type === "bearer" ? decodeJwtPayload(tmdbAuth.token) : null,
            details: err.details,
          },
        },
        null,
        2,
      ),
    );
  }

  const data = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .map((m: unknown) => {
      const obj = m as Record<string, unknown>;
      const id = typeof obj.id === "number" ? obj.id : null;
      const title =
        typeof obj.title === "string" ? obj.title : ("Untitled" as const);
      if (id === null) return null;

      const release_date =
        typeof obj.release_date === "string" ? obj.release_date : null;
      const poster_path =
        typeof obj.poster_path === "string" ? obj.poster_path : null;
      const overview =
        typeof obj.overview === "string" ? obj.overview : null;

      return {
        id,
        title,
        release_date,
        poster_path,
        overview,
        genre_ids: parseGenreIdsFromResult(obj),
      } satisfies TMDBSearchMovie;
    })
    .filter((m): m is TMDBSearchMovie => !!m);
}

export async function tmdbSearchTv(
  query: string,
  language = "en-US",
): Promise<TMDBSearchTv[]> {
  const tmdbAuth = getTmdbAuth();

  const url = new URL("https://api.themoviedb.org/3/search/tv");
  url.search = new URLSearchParams({
    query,
    include_adult: "false",
    language,
    ...(tmdbAuth.type === "apiKey" ? { api_key: tmdbAuth.key } : {}),
  }).toString();

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...(tmdbAuth.type === "bearer" ? { Authorization: `Bearer ${tmdbAuth.token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await parseTmdbError(res);

    if (err.status_code === 7 && tmdbAuth.type === "bearer") {
      const retryUrl = new URL(url.toString());
      const apiKey = getOptionalTmdbApiKey();
      retryUrl.searchParams.set("api_key", apiKey ?? tmdbAuth.token);

      const retryRes = await fetch(retryUrl.toString(), {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (retryRes.ok) {
        const data = (await retryRes.json()) as { results?: unknown[] };
        const results = Array.isArray(data.results) ? data.results : [];
        return results
          .map((m: unknown) => {
            const obj = m as Record<string, unknown>;
            const id = typeof obj.id === "number" ? obj.id : null;
            const name =
              typeof obj.name === "string" ? obj.name : ("Untitled" as const);
            if (id === null) return null;

            const first_air_date =
              typeof obj.first_air_date === "string"
                ? obj.first_air_date
                : null;
            const poster_path =
              typeof obj.poster_path === "string" ? obj.poster_path : null;
            const overview =
              typeof obj.overview === "string" ? obj.overview : null;

            return {
              id,
              title: name,
              release_date: first_air_date,
              poster_path,
              overview,
              genre_ids: parseGenreIdsFromResult(obj),
            } satisfies TMDBSearchTv;
          })
          .filter((m): m is TMDBSearchTv => !!m);
      }

      const retryErr = await parseTmdbError(retryRes);
      throw new Error(
        JSON.stringify(
          {
            tmdb: {
              status_code: err.status_code,
              status_message: err.status_message,
              authStrategyTried: ["bearer", "api_key"],
              tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
              jwtPayload: decodeJwtPayload(tmdbAuth.token),
              retryStatus_code: retryErr.status_code,
              retryStatus_message: retryErr.status_message,
            },
          },
          null,
          2,
        ),
      );
    }

    throw new Error(
      JSON.stringify(
        {
          tmdb: {
            status_code: err.status_code,
            status_message: err.status_message,
            authStrategyTried: [tmdbAuth.type],
            tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
            jwtPayload: tmdbAuth.type === "bearer" ? decodeJwtPayload(tmdbAuth.token) : null,
            details: err.details,
          },
        },
        null,
        2,
      ),
    );
  }

  const data = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .map((m: unknown) => {
      const obj = m as Record<string, unknown>;
      const id = typeof obj.id === "number" ? obj.id : null;
      const name =
        typeof obj.name === "string" ? obj.name : ("Untitled" as const);
      if (id === null) return null;

      const first_air_date =
        typeof obj.first_air_date === "string" ? obj.first_air_date : null;
      const poster_path =
        typeof obj.poster_path === "string" ? obj.poster_path : null;
      const overview =
        typeof obj.overview === "string" ? obj.overview : null;

      return {
        id,
        title: name,
        release_date: first_air_date,
        poster_path,
        overview,
        genre_ids: parseGenreIdsFromResult(obj),
      } satisfies TMDBSearchTv;
    })
    .filter((m): m is TMDBSearchTv => !!m);
}

export async function tmdbGetMovieDetails(
  movieId: number,
  language = "en-US",
): Promise<{
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[];
}> {
  const tmdbAuth = getTmdbAuth();

  const url = `https://api.themoviedb.org/3/movie/${movieId}?${new URLSearchParams({
    language,
    ...(tmdbAuth.type === "apiKey" ? { api_key: tmdbAuth.key } : {}),
  }).toString()}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(tmdbAuth.type === "bearer" ? { Authorization: `Bearer ${tmdbAuth.token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await parseTmdbError(res);

    if (err.status_code === 7 && tmdbAuth.type === "bearer") {
      const retryUrl = new URL(url);
      const apiKey = getOptionalTmdbApiKey();
      const apiKeyRetryUsed = apiKey
        ? "NEXT_PUBLIC_TMDB_API_KEY"
        : "TMDB_READ_ACCESS_TOKEN-as-api_key";
      retryUrl.searchParams.set("api_key", apiKey ?? tmdbAuth.token);

      const retryRes = await fetch(retryUrl.toString(), {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (retryRes.ok) {
        const data = (await retryRes.json()) as Record<string, unknown>;
        return {
          id: typeof data.id === "number" ? data.id : movieId,
          title: typeof data.title === "string" ? data.title : "Untitled",
          release_date:
            typeof data.release_date === "string"
              ? data.release_date
              : null,
          poster_path:
            typeof data.poster_path === "string" ? data.poster_path : null,
          overview:
            typeof data.overview === "string" ? data.overview : null,
          genre_ids: genreIdsFromDetailPayload(data),
        };
      }

      const retryErr = await parseTmdbError(retryRes);
      throw new Error(
        JSON.stringify(
          {
            tmdb: {
              status_code: err.status_code,
              status_message: err.status_message,
              authStrategyTried: ["bearer", "api_key"],
              tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
              jwtPayload: decodeJwtPayload(tmdbAuth.token),
              apiKeyRetryUsed,
              retryStatus_code: retryErr.status_code,
              retryStatus_message: retryErr.status_message,
            },
          },
          null,
          2,
        ),
      );
    }

    throw new Error(
      JSON.stringify(
        {
          tmdb: {
            status_code: err.status_code,
            status_message: err.status_message,
            authStrategyTried: [tmdbAuth.type],
            tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
            jwtPayload: tmdbAuth.type === "bearer" ? decodeJwtPayload(tmdbAuth.token) : null,
            details: err.details,
          },
        },
        null,
        2,
      ),
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: typeof data.id === "number" ? data.id : movieId,
    title: typeof data.title === "string" ? data.title : "Untitled",
    release_date:
      typeof data.release_date === "string" ? data.release_date : null,
    poster_path:
      typeof data.poster_path === "string" ? data.poster_path : null,
    overview: typeof data.overview === "string" ? data.overview : null,
    genre_ids: genreIdsFromDetailPayload(data),
  };
}

export async function tmdbGetTvDetails(
  tvId: number,
  language = "en-US",
): Promise<{
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genre_ids: number[];
}> {
  const tmdbAuth = getTmdbAuth();

  const url = `https://api.themoviedb.org/3/tv/${tvId}?${new URLSearchParams({
    language,
    ...(tmdbAuth.type === "apiKey" ? { api_key: tmdbAuth.key } : {}),
  }).toString()}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(tmdbAuth.type === "bearer" ? { Authorization: `Bearer ${tmdbAuth.token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await parseTmdbError(res);

    if (err.status_code === 7 && tmdbAuth.type === "bearer") {
      const retryUrl = new URL(url);
      const apiKey = getOptionalTmdbApiKey();
      retryUrl.searchParams.set("api_key", apiKey ?? tmdbAuth.token);

      const retryRes = await fetch(retryUrl.toString(), {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (retryRes.ok) {
        const data = (await retryRes.json()) as Record<string, unknown>;
        return {
          id: typeof data.id === "number" ? data.id : tvId,
          title:
            typeof data.name === "string" ? data.name : "Untitled",
          release_date:
            typeof data.first_air_date === "string"
              ? data.first_air_date
              : null,
          poster_path:
            typeof data.poster_path === "string" ? data.poster_path : null,
          overview:
            typeof data.overview === "string" ? data.overview : null,
          genre_ids: genreIdsFromDetailPayload(data),
        };
      }

      const retryErr = await parseTmdbError(retryRes);
      throw new Error(
        JSON.stringify(
          {
            tmdb: {
              status_code: err.status_code,
              status_message: err.status_message,
              authStrategyTried: ["bearer", "api_key"],
              tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
              jwtPayload: decodeJwtPayload(tmdbAuth.token),
              retryStatus_code: retryErr.status_code,
              retryStatus_message: retryErr.status_message,
            },
          },
          null,
          2,
        ),
      );
    }

    throw new Error(
      JSON.stringify(
        {
          tmdb: {
            status_code: err.status_code,
            status_message: err.status_message,
            authStrategyTried: [tmdbAuth.type],
            tokenLooksLikeJwt: tmdbAuth.tokenLooksLikeJwt,
            jwtPayload: tmdbAuth.type === "bearer" ? decodeJwtPayload(tmdbAuth.token) : null,
            details: err.details,
          },
        },
        null,
        2,
      ),
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: typeof data.id === "number" ? data.id : tvId,
    title: typeof data.name === "string" ? data.name : "Untitled",
    release_date:
      typeof data.first_air_date === "string" ? data.first_air_date : null,
    poster_path:
      typeof data.poster_path === "string" ? data.poster_path : null,
    overview: typeof data.overview === "string" ? data.overview : null,
    genre_ids: genreIdsFromDetailPayload(data),
  };
}

type ParsedTmdbError = {
  status_code?: number;
  status_message?: string;
  details?: unknown;
};

async function parseTmdbError(res: Response): Promise<ParsedTmdbError> {
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return {
      status_code:
        typeof data.status_code === "number" ? data.status_code : undefined,
      status_message:
        typeof data.status_message === "string"
          ? data.status_message
          : undefined,
      details: data,
    };
  } catch {
    return {
      status_code: undefined,
      status_message: undefined,
      details: text || undefined,
    };
  }
}

