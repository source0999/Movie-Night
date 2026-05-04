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
      className="relative overflow-hidden rounded-2xl border border-mn-border-strong bg-gradient-to-br from-mn-card via-mn-card to-mn-card-elev p-[1px] shadow-[var(--mn-shadow-glow)]"
    >
      <div
        className="flex flex-col gap-3 rounded-[15px] bg-mn-input/85 px-3 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-2.5"
        style={{
          boxShadow: "inset 0 1px 0 0 color-mix(in srgb, var(--mn-fg) 6%, transparent)",
        }}
      >
        {children}
      </div>
    </form>
  );
}

export const futuristicSearchInputClass =
  "min-h-[48px] w-full min-w-0 flex-1 rounded-xl border border-mn-border bg-mn-card px-4 py-3 text-sm text-mn-fg placeholder:text-mn-fg-soft shadow-inner outline-none transition " +
  "focus:border-mn-border-strong focus:ring-2 focus:ring-mn-focus/25";

export const futuristicSearchButtonClass =
  "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center rounded-xl bg-mn-accent px-5 py-3 text-sm font-semibold tracking-wide text-mn-bg shadow-[var(--mn-shadow-soft)] transition hover:opacity-90 " +
  "disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[122px]";
