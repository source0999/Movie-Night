import { NextRequest, NextResponse } from "next/server";

type TMDBMovieDetails = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ error: "Invalid movie id." }, { status: 400 });
  }

  const url = new URL(request.url);
  const language = url.searchParams.get("language") || "en-US";

  const tmdbUrl =
    "https://api.themoviedb.org/3/movie/" +
    movieId +
    "?" +
    new URLSearchParams({
      api_key: apiKey,
      language,
    }).toString();

  const tmdbRes = await fetch(tmdbUrl, { cache: "no-store" });
  if (!tmdbRes.ok) {
    const details = await tmdbRes.text().catch(() => "");
    return NextResponse.json(
      { error: "TMDB movie request failed.", details },
      { status: tmdbRes.status },
    );
  }

  const data = (await tmdbRes.json()) as {
    id?: number;
    title?: string;
    release_date?: string | null;
    poster_path?: string | null;
    overview?: string | null;
  };

  const movie: TMDBMovieDetails = {
    id: data.id ?? movieId,
    title: data.title ?? "Untitled",
    release_date: data.release_date ?? null,
    poster_path: data.poster_path ?? null,
    overview: data.overview ?? null,
  };

  return NextResponse.json({ movie });
}

