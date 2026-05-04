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

    const close = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const t = e.target;
      if (!t || !(t instanceof Node)) return;
      if (el.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${open ? "z-[9999]" : ""}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        className="mn-btn-press min-h-[44px] rounded-xl border border-mn-border bg-mn-input px-4 py-3 text-sm font-medium text-mn-fg shadow-sm hover:bg-mn-card-elev"
      >
        {summaryLabel}
      </button>

      {open ? (
        <div
          style={menuStyle}
          role="listbox"
          className="mn-modal-panel-animate absolute z-[9999] mt-2 w-64 overflow-hidden rounded-xl border border-mn-border bg-mn-modal shadow-[var(--mn-shadow-soft)]"
        >
          <div className="p-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className="w-full min-h-[44px] rounded-lg px-4 py-3 text-left text-sm text-mn-fg transition hover:bg-mn-input"
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
