"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMovieLibrary } from "../../hooks/useMovieLibrary";
import type { LibraryMovie } from "../../lib/movieLibrary";
import SpinningWheel from "../../components/SpinningWheel";
import ConfettiBurst from "../../components/ConfettiBurst";

export default function RoulettePage() {
  const { hydrated, library } = useMovieLibrary();
  const watchlist = library.watchlist;

  const [winner, setWinner] = useState<LibraryMovie | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const canSpin = hydrated && watchlist.length >= 2 && !winner;

  const winnerName = winner?.recommendedBy?.trim() || "Someone";

  const instruction = useMemo(() => {
    if (!hydrated) return "Loading...";
    if (watchlist.length === 0) {
      return "Add movies to your Watchlist to use Roulette.";
    }
    if (watchlist.length < 2) {
      return "Add at least two movies to your Watchlist before spinning.";
    }
    return "Spin the wheel to pick tonight's movie.";
  }, [hydrated, watchlist.length]);

  return (
    <div className="min-h-screen bg-zinc-50 py-10 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Roulette</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {instruction}
          </p>
        </header>

        {winner ? null : hydrated && watchlist.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">
              Your Watchlist is empty.
            </p>
            <p className="mt-1">
              Add some movies so the wheel can pick tonight’s option.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
            >
              Go add some movies!
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <SpinningWheel
              movies={watchlist}
              onWinner={(w) => {
                setWinner(w);
                setConfettiKey((k) => k + 1);
              }}
            />
            {!canSpin ? null : null}
          </div>
        )}
      </div>

      {winner ? (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-center text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_45%)]" />
          </div>

          {/* Subtle digital glitch overlay (purple + cyan) */}
          <div className="absolute inset-0 pointer-events-none digital-glitch-overlay" key={confettiKey} />

          <div className="relative w-full max-w-2xl">
            <h2 className="text-5xl font-black tracking-tight">Winner!</h2>
            <p className="mt-4 text-lg text-white/90">
              Tonight’s pick:{" "}
              <span className="font-semibold text-white">{winner.title}</span>
            </p>
            <p className="mt-1 text-sm text-white/80">
              Recommended by: <span className="font-medium">{winnerName}</span>
            </p>

            <ConfettiBurst key={confettiKey} active={true} />

            <button
              type="button"
              onClick={() => setWinner(null)}
              className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              Spin again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

