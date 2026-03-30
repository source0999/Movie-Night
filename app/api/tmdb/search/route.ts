import { NextResponse } from "next/server";

type TMDBMovieResult = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

export async function GET(req: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "TMDB API key is missing. Add `TMDB_API_KEY` to `moveNight/.env.local` and restart the server.",
      },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] as TMDBMovieResult[] });
  }

  const language = url.searchParams.get("language") || "en-US";

  const tmdbUrl =
    "https://api.themoviedb.org/3/search/movie?" +
    new URLSearchParams({
      api_key: apiKey,
      query,
      include_adult: "false",
      language,
    }).toString();

  const tmdbRes = await fetch(tmdbUrl, { cache: "no-store" });
  if (!tmdbRes.ok) {
    const details = await tmdbRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "TMDB search failed.",
        details,
      },
      { status: tmdbRes.status },
    );
  }

  const data = (await tmdbRes.json()) as {
    results?: Array<{
      id: number;
      title?: string;
      release_date?: string | null;
      poster_path?: string | null;
      overview?: string | null;
    }>;
  };

  const results: TMDBMovieResult[] = (data.results ?? []).map((m) => ({
    id: m.id,
    title: m.title ?? "Untitled",
    release_date: m.release_date ?? null,
    poster_path: m.poster_path ?? null,
    overview: m.overview ?? null,
  }));

  return NextResponse.json({ results });
}

