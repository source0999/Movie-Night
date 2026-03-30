"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  w: number;
  h: number;
  color: string;
  life: number;
  maxLife: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function ConfettiBurst({
  active,
  durationMs = 1800,
}: {
  active: boolean;
  durationMs?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const start = performance.now();
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const colors = [
      "#F43F5E",
      "#FB923C",
      "#FDE047",
      "#4ADE80",
      "#22C55E",
      "#38BDF8",
      "#60A5FA",
      "#A78BFA",
    ];

    const particles: Particle[] = [];
    const count = Math.floor(140 + Math.random() * 40);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.28,
        vx: rand(-5, 5),
        vy: rand(-8, -2),
        rotation: rand(0, Math.PI * 2),
        rotationSpeed: rand(-0.25, 0.25),
        w: rand(6, 10),
        h: rand(10, 16),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: rand(durationMs * 0.6, durationMs),
      });
    }

    const tick = (now: number) => {
      const elapsed = now - start;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Coordinate system in CSS pixels.
      ctx.save();
      ctx.scale(dpr, dpr);

      for (const p of particles) {
        p.life += 16.67;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rotationSpeed;

        const t = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = t;

        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      ctx.restore();
      ctx.globalAlpha = 1;

      if (elapsed < durationMs) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [active, durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[120]"
    />
  );
}

