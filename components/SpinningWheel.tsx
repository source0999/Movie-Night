"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LibraryMovie } from "../lib/movieLibrary";

function polarToCartesian({
  cx,
  cy,
  radius,
  angleDeg,
}: {
  cx: number;
  cy: number;
  radius: number;
  angleDeg: number;
}) {
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function clampText(s: string, maxChars: number) {
  const trimmed = s.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, Math.max(0, maxChars - 1)) + "…";
}

const COLORS = [
  "fill-rose-100 dark:fill-rose-900",
  "fill-emerald-100 dark:fill-emerald-900",
  "fill-sky-100 dark:fill-sky-900",
  "fill-amber-100 dark:fill-amber-900",
  "fill-violet-100 dark:fill-violet-900",
  "fill-lime-100 dark:fill-lime-900",
];

export default function SpinningWheel({
  movies,
  onWinner,
}: {
  movies: LibraryMovie[];
  onWinner: (winner: LibraryMovie) => void;
}) {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [activeWinner, setActiveWinner] = useState<LibraryMovie | null>(null);
  const [spinDurationMs, setSpinDurationMs] = useState(4000);

  const timeoutRef = useRef<number | null>(null);

  const segmentCount = movies.length;
  const anglePerSegment = segmentCount > 0 ? 360 / segmentCount : 0;

  const wheelSize = 320;
  const cx = wheelSize / 2;
  const cy = wheelSize / 2;
  const outerRadius = wheelSize * 0.46;
  const innerRadius = wheelSize * 0.08;
  const textRadius = wheelSize * 0.33;

  const truncatedTitles = useMemo(() => {
    return movies.map((m) => clampText(m.title, 18));
  }, [movies]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function computeFinalRotation({
    winnerIndex,
    extraTurns,
    currentRotationDeg,
  }: {
    winnerIndex: number;
    extraTurns: number;
    currentRotationDeg: number;
  }) {
    // We draw segments starting at -90 degrees (top). Segment i is centered at:
    // centerAngle = -90 + i*anglePer + anglePer/2.
    // We want winner center to land on pointer at -90 after rotation.
    const targetWithin = (() => {
      const desired = -(
        (winnerIndex + 0.5) * anglePerSegment
      ); /* modulo will normalize */;
      const mod = ((desired % 360) + 360) % 360;
      return mod;
    })();

    const currentMod = ((currentRotationDeg % 360) + 360) % 360;
    let delta = targetWithin - currentMod;
    if (delta < 0) delta += 360;

    return currentRotationDeg + extraTurns * 360 + delta;
  }

  const canSpin = segmentCount >= 2 && !spinning;

  function onSpin() {
    if (!canSpin) return;

    setSpinning(true);
    setActiveWinner(null);

    const winnerIndex = Math.floor(Math.random() * segmentCount);
    const winner = movies[winnerIndex];
    setActiveWinner(winner);

    const extraTurns = 4 + Math.floor(Math.random() * 3); // 4-6 turns
    const durationMs = 3000 + Math.floor(Math.random() * 2000); // 3-5s
    setSpinDurationMs(durationMs);

    const finalRotation = computeFinalRotation({
      winnerIndex,
      extraTurns,
      currentRotationDeg: rotationDeg,
    });

    setRotationDeg(finalRotation);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      onWinner(winner);
      setSpinning(false);
    }, durationMs);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[14px] border-x-transparent border-b-[24px] border-b-zinc-900 dark:border-b-white" />
        </div>

        <div
          className="transition-transform ease-out"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transitionDuration: spinning ? `${spinDurationMs}ms` : "300ms",
          }}
        >
          <svg
            width={wheelSize}
            height={wheelSize}
            viewBox={`0 0 ${wheelSize} ${wheelSize}`}
            className="block"
          >
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="4"
                  floodColor="#000"
                  floodOpacity="0.25"
                />
              </filter>
            </defs>

            <g filter="url(#shadow)">
              {movies.map((movie, i) => {
                const startAngle = -90 + i * anglePerSegment;
                const endAngle = startAngle + anglePerSegment;

                const p1 = polarToCartesian({
                  cx,
                  cy,
                  radius: outerRadius,
                  angleDeg: startAngle,
                });
                const p2 = polarToCartesian({
                  cx,
                  cy,
                  radius: outerRadius,
                  angleDeg: endAngle,
                });
                const p3 = polarToCartesian({
                  cx,
                  cy,
                  radius: innerRadius,
                  angleDeg: endAngle,
                });
                const p4 = polarToCartesian({
                  cx,
                  cy,
                  radius: innerRadius,
                  angleDeg: startAngle,
                });

                const largeArc = anglePerSegment > 180 ? 1 : 0;

                const d = [
                  `M ${p1.x} ${p1.y}`,
                  `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
                  `L ${p3.x} ${p3.y}`,
                  `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
                  "Z",
                ].join(" ");

                const midAngle = startAngle + anglePerSegment / 2;
                const labelPoint = polarToCartesian({
                  cx,
                  cy,
                  radius: textRadius,
                  angleDeg: midAngle,
                });

                return (
                  <g key={movie.id}>
                    <path
                      d={d}
                      className={COLORS[i % COLORS.length]}
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth="1"
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      transform={`rotate(${midAngle + 90} ${labelPoint.x} ${labelPoint.y})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="select-none fill-zinc-900 dark:fill-zinc-900"
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      {truncatedTitles[i]}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* center cap */}
            <circle
              cx={cx}
              cy={cy}
              r={innerRadius * 1.2}
              className="fill-zinc-900 dark:fill-white"
            />
            <circle
              cx={cx}
              cy={cy}
              r={innerRadius * 0.55}
              className="fill-zinc-200 dark:fill-zinc-900"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onSpin}
          disabled={!canSpin}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
        >
          {spinning ? "Spinning..." : "Spin"}
        </button>

        {activeWinner ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Landing on a random choice...
          </p>
        ) : null}
      </div>
    </div>
  );
}

