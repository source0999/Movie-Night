export type TMDBSearchMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

function getTmdbAccessToken(): string {
  const token = process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "TMDB read access token is missing. Add NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN to your environment.",
    );
  }
  return token;
}

export async function tmdbSearchMovies(
  query: string,
  language = "en-US",
): Promise<TMDBSearchMovie[]> {
  const accessToken = getTmdbAccessToken();

  const url = new URL(
    "https://api.themoviedb.org/3/search/movie",
  );
  url.search = new URLSearchParams({
    query,
    include_adult: "false",
    language,
  }).toString();

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
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
  const accessToken = getTmdbAccessToken();

  const url = `https://api.themoviedb.org/3/movie/${movieId}?${new URLSearchParams(
    { language },
  ).toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
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

