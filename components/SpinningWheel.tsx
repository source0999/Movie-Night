"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  libraryItemCoverImageUrl,
  type LibraryItem,
} from "../lib/movieLibrary";

function clampText(s: string, maxChars: number) {
  const trimmed = s.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, Math.max(0, maxChars - 1)) + "…";
}

function useSpinClickSound(spinning: boolean, durationMs: number) {
  const ctxRef = useRef<AudioContext | null>(null);

  const playTick = useCallback(() => {
    let ctx = ctxRef.current;
    if (!ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctx();
      ctxRef.current = ctx;
    }
    void ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1100, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }, []);

  useEffect(() => {
    if (!spinning) return;
    const start = performance.now();
    let raf = 0;
    let lastTick = start;

    const loop = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= durationMs) return;
      const progress = elapsed / durationMs;
      const minGap = 42;
      const maxGap = 340;
      const gap = minGap + (maxGap - minGap) * (progress * progress);
      if (performance.now() - lastTick >= gap) {
        playTick();
        lastTick = performance.now();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, durationMs, playTick]);
}

type Phase = "idle" | "spinning" | "spotlight";

function MarqueeRail({
  active,
  fast,
}: {
  active: boolean;
  fast: boolean;
}) {
  const trackClass = !active
    ? "mn-marquee-track mn-marquee-track--paused"
    : fast
      ? "mn-marquee-track mn-marquee-track--fast"
      : "mn-marquee-track";
  return (
    <div
      className="h-1 w-full shrink-0 overflow-hidden bg-mn-input/60 sm:h-1.5"
      aria-hidden
    >
      <div className={`flex w-max gap-2 px-1 py-0.5 ${trackClass}`}>
        {Array.from({ length: 56 }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-1 w-1 shrink-0 rounded-full bg-mn-accent opacity-75"
          />
        ))}
      </div>
    </div>
  );
}

function RoulettePosterCard({
  item,
  spotlight,
  unframed = false,
  className = "",
}: {
  item: LibraryItem | null | undefined;
  spotlight?: boolean;
  /** No outer border/radius (e.g. embedded in a bordered parent). */
  unframed?: boolean;
  className?: string;
}) {
  const src = libraryItemCoverImageUrl(item);
  const frame = unframed
    ? "rounded-none border-0 shadow-none"
    : "rounded-2xl border-2 border-mn-border bg-mn-input shadow-xl";
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden bg-mn-input transition ${frame} ${
        spotlight && !unframed
          ? "border-mn-accent shadow-[0_0_0_2px_var(--mn-accent),0_0_32px_var(--mn-glow)] mn-spotlight-pulse"
          : ""
      } ${spotlight && unframed ? "ring-2 ring-mn-accent ring-inset mn-spotlight-pulse" : ""} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mn-accent/30 to-mn-card-elev p-3 text-center text-sm font-bold text-mn-fg">
          {item ? clampText(item.title, 24) : "—"}
        </div>
      )}
    </div>
  );
}

const SPIN_BTN =
  "mn-btn-press touch-manipulation min-h-[56px] w-full max-w-xs rounded-2xl px-8 text-base font-bold shadow-[var(--mn-shadow-soft)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mn-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mn-bg disabled:cursor-not-allowed disabled:opacity-55";

/** Slot-machine style picker when the wheel would be too crowded. */
export function ListShufflePicker({
  slots,
  onWinner,
}: {
  slots: LibraryItem[];
  onWinner: (winner: LibraryItem) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayIndex, setDisplayIndex] = useState(0);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState(3200);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReducedMotion(mq.matches));
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useSpinClickSound(phase === "spinning", totalMs);

  const canSpin = slots.length >= 2 && phase === "idle";
  const segmentCount = slots.length;

  const idleFan = useMemo(() => {
    if (slots.length === 0) return [];
    const b = slots[1 % segmentCount]!;
    const c = slots[2 % segmentCount]!;
    return [b, c];
  }, [slots, segmentCount]);

  const onSpin = () => {
    if (!canSpin) return;
    const wIdx = Math.floor(Math.random() * segmentCount);

    if (reducedMotion) {
      setWinnerIdx(wIdx);
      setDisplayIndex(wIdx);
      setTotalMs(700);
      setPhase("spinning");
      window.setTimeout(() => {
        setPhase("spotlight");
        window.setTimeout(() => {
          onWinner(slots[wIdx]!);
          setPhase("idle");
          setWinnerIdx(null);
        }, 1100);
      }, 700);
      return;
    }

    const durationMs = 2800 + Math.floor(Math.random() * 900);
    setTotalMs(durationMs);
    setPhase("spinning");
    setWinnerIdx(wIdx);
    setDisplayIndex(Math.floor(Math.random() * segmentCount));

    const start = performance.now();
    let lastFrame = start;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const minGap = 35;
      const maxGap = 220;
      const gap = minGap + (maxGap - minGap) * (progress * progress);
      if (now - lastFrame >= gap) {
        if (progress < 0.92) {
          setDisplayIndex(
            (i) => (i + 1 + Math.floor(Math.random() * 3)) % segmentCount,
          );
        } else {
          setDisplayIndex(wIdx);
        }
        lastFrame = now;
      }
      if (elapsed < durationMs) {
        requestAnimationFrame(tick);
      } else {
        setDisplayIndex(wIdx);
        setPhase("spotlight");
        window.setTimeout(() => {
          onWinner(slots[wIdx]!);
          setPhase("idle");
          setWinnerIdx(null);
        }, 1100);
      }
    };
    requestAnimationFrame(tick);
  };

  const current =
    slots[displayIndex] ?? slots[0] ?? slots.find(Boolean);
  const isSpot = phase === "spotlight" && winnerIdx === displayIndex;
  const bgSrc = libraryItemCoverImageUrl(current);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div
        className={`relative w-full overflow-hidden rounded-2xl border-2 text-center shadow-xl transition sm:flex sm:min-h-[min(360px,52vw)] sm:text-left ${
          isSpot
            ? "border-mn-accent bg-mn-card-elev shadow-[0_0_0_2px_var(--mn-accent),0_0_32px_var(--mn-glow)]"
            : "border-mn-border bg-mn-card"
        }`}
      >
        <MarqueeRail active={phase !== "idle"} fast={phase === "spinning"} />

        {phase === "spinning" || phase === "spotlight" ? (
          <div
            className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${
              phase === "spotlight" ? "bg-black/45 opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        <div className="relative flex w-full flex-col sm:flex-row sm:items-stretch">
          <div className="relative mx-auto aspect-[2/3] w-[min(280px,88vw)] shrink-0 sm:mx-0 sm:w-[48%] sm:max-w-[280px]">
            {phase === "idle" && idleFan.length >= 2 ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
                aria-hidden
              >
                <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] scale-[0.82] opacity-35">
                  <RoulettePosterCard item={idleFan[0]} unframed />
                </div>
                <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rotate-[8deg] scale-[0.82] opacity-35">
                  <RoulettePosterCard item={idleFan[1]} unframed />
                </div>
              </div>
            ) : null}

            <div
              className={`relative z-10 h-full w-full ${
                phase === "spinning" ? "mn-spin-jitter blur-[0.6px]" : ""
              }`}
            >
              <RoulettePosterCard
                item={current}
                spotlight={isSpot}
                unframed
                className="h-full w-full sm:rounded-l-xl"
              />
            </div>
          </div>

          <div className="relative flex flex-1 flex-col justify-center px-5 py-8 sm:py-6">
            {bgSrc ? (
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bgSrc}
                  alt=""
                  className="h-full w-full scale-110 object-cover blur-2xl"
                />
              </div>
            ) : null}

            <p
              className={`relative z-20 text-[10px] font-bold uppercase tracking-[0.2em] ${
                isSpot ? "text-mn-accent" : "text-mn-fg-muted"
              }`}
            >
              {phase === "spinning"
                ? "Shuffling…"
                : phase === "spotlight"
                  ? "Spotlight"
                  : "Ready to spin"}
            </p>
            <p
              className={`relative z-20 mt-3 min-h-[4.5rem] text-xl font-bold leading-tight sm:text-2xl ${
                isSpot
                  ? "text-mn-fg drop-shadow-[0_0_12px_var(--mn-glow)]"
                  : "text-mn-fg"
              }`}
              style={{
                fontFamily: "var(--font-orbitron), system-ui, sans-serif",
              }}
            >
              {clampText(current?.title ?? "", 52)}
            </p>
            <p
              className={`relative z-20 mt-3 text-xs ${
                isSpot ? "text-mn-fg-muted" : "text-mn-fg-muted"
              }`}
            >
              {segmentCount} in the mix
            </p>
          </div>
        </div>

        <MarqueeRail active={phase !== "idle"} fast={phase === "spinning"} />
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin}
        className={`${SPIN_BTN} bg-mn-accent text-mn-bg hover:opacity-95`}
      >
        {phase === "spinning"
          ? "Shuffling…"
          : phase === "spotlight"
            ? "…"
            : "Spin"}
      </button>
    </div>
  );
}

/** List shuffle only (wheel removed). */
export default function SpinningWheel({
  slots,
  onWinner,
}: {
  slots: LibraryItem[];
  onWinner: (winner: LibraryItem) => void;
}) {
  const cleanSlots = useMemo(
    () =>
      (Array.isArray(slots) ? slots : []).filter(
        (s): s is LibraryItem => s != null && typeof s === "object",
      ),
    [slots],
  );

  if (cleanSlots.length < 2) {
    return null;
  }

  return <ListShufflePicker slots={cleanSlots} onWinner={onWinner} />;
}
