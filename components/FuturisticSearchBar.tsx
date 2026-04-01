"use client";

import type { FormEvent, ReactNode } from "react";

/**
 * Glass / neon search shell — stacks vertically on small screens, row on sm+.
 */
export function FuturisticSearchForm({
  onSubmit,
  children,
  id,
}: {
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  /** Optional id for aria-labelledby from page heading */
  id?: string;
}) {
  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-white/90 via-cyan-50/30 to-violet-100/40 p-[1px] shadow-[0_0_28px_rgba(34,211,238,0.12)] dark:border-cyan-400/25 dark:from-zinc-900/90 dark:via-zinc-950 dark:to-violet-950/50 dark:shadow-[0_0_32px_rgba(139,92,246,0.12)]"
    >
      <div
        className="flex flex-col gap-3 rounded-[15px] bg-white/85 px-3 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-2.5 dark:bg-zinc-950/75"
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
        }}
      >
        {children}
      </div>
    </form>
  );
}

export const futuristicSearchInputClass =
  "min-h-[48px] w-full min-w-0 flex-1 rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-inner outline-none transition " +
  "focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-400/25 " +
  "dark:border-cyan-500/20 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-cyan-400/40 dark:focus:ring-cyan-400/20";

export const futuristicSearchButtonClass =
  "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-cyan-500/25 transition " +
  "hover:from-violet-500 hover:via-violet-500 hover:to-cyan-500 hover:shadow-cyan-400/30 " +
  "disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[122px]";
