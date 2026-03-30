"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LibraryCategory } from "../lib/movieLibrary";

type Option = {
  value: LibraryCategory;
  label: string;
};

export default function CategoryDropdown({
  summaryLabel,
  options,
  onSelect,
  align = "right",
  disabled = false,
}: {
  summaryLabel: string;
  options: Option[];
  onSelect: (value: LibraryCategory) => void;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const menuStyle = useMemo(() => {
    return align === "left" ? { left: 0 } : { right: 0 };
  }, [align]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!e.target) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? "z-[9999]" : ""}`}
    >
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-disabled={disabled}
        className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        {summaryLabel}
      </button>

      {open ? (
        <div
          style={menuStyle}
          className="absolute z-[9999] mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="p-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className="w-full min-h-[44px] rounded-lg px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

