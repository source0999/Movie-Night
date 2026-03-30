export type TMDBSearchMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

type TmdbAuth =
  | { type: "bearer"; token: string }
  | { type: "apiKey"; key: string };

function getTmdbAuth(): TmdbAuth {
  const value = process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN;
  if (!value) {
    throw new Error(
      "TMDB auth is missing. Add NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN to your environment.",
    );
  }

  // TMDB “read access token” is JWT-like (three dot-separated parts).
  const looksLikeJwt =
    value.includes(".") && value.split(".").length === 3 && value.startsWith("eyJ");

  if (looksLikeJwt) return { type: "bearer", token: value };

  // Fallback: if someone placed the raw API key into the same env var,
  // use it as the `api_key` query parameter instead of Bearer.
  return { type: "apiKey", key: value };
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
    const details = await res.text().catch(() => "");
    throw new Error(details || "TMDB search failed.");
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
      } satisfies TMDBSearchMovie;
    })
    .filter((m): m is TMDBSearchMovie => !!m);
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
    const details = await res.text().catch(() => "");
    throw new Error(details || "TMDB movie details request failed.");
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
  };
}

