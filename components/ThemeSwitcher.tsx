"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_MN_THEME,
  MN_THEME_IDS,
  MN_THEME_LABELS,
  MN_THEME_STORAGE_KEY,
  MN_THEME_SWATCHES,
  isValidMnThemeId,
  type MnThemeId,
} from "../lib/theme";

export default function ThemeSwitcher() {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const focusedIdxRef = useRef(0);
  const [currentTheme, setCurrentTheme] = useState<MnThemeId>(DEFAULT_MN_THEME);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    queueMicrotask(() => {
      const v = document.documentElement.getAttribute("data-theme");
      if (isValidMnThemeId(v ?? "")) setCurrentTheme(v as MnThemeId);
    });
  }, []);

  const applyTheme = useCallback((id: MnThemeId) => {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(MN_THEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setCurrentTheme(id);
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let raf = 0;
    queueMicrotask(() => {
      if (cancelled) return;
      let idx = 0;
      try {
        const s = localStorage.getItem(MN_THEME_STORAGE_KEY);
        if (s && isValidMnThemeId(s)) {
          idx = MN_THEME_IDS.indexOf(s);
          if (idx < 0) idx = 0;
        }
      } catch {
        /* ignore */
      }
      focusedIdxRef.current = idx;
      raf = requestAnimationFrame(() => {
        if (!cancelled) itemRefs.current[idx]?.focus();
      });
    });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (menuRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const n = (focusedIdxRef.current + 1) % MN_THEME_IDS.length;
        focusedIdxRef.current = n;
        itemRefs.current[n]?.focus();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const n =
          (focusedIdxRef.current - 1 + MN_THEME_IDS.length) %
          MN_THEME_IDS.length;
        focusedIdxRef.current = n;
        itemRefs.current[n]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-mn-border bg-mn-card text-mn-accent shadow-sm transition hover:border-mn-border-strong hover:bg-mn-card-elev focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mn-focus sm:h-10 sm:w-10"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Switch color theme"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">Theme</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/40 mn-nav-backdrop-enter lg:hidden"
            aria-hidden
          />
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Color themes"
            className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,280px)] rounded-2xl border border-mn-border bg-mn-modal p-2 shadow-[var(--mn-shadow-soft)] sm:left-auto sm:right-0"
          >
            {MN_THEME_IDS.map((id, idx) => {
              const selected = currentTheme === id;
              const sw = MN_THEME_SWATCHES[id];
              return (
                <button
                  key={id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-mn-input focus-visible:bg-mn-input ${
                    selected ? "text-mn-accent ring-1 ring-mn-border-strong" : "text-mn-fg"
                  }`}
                  onClick={() => applyTheme(id)}
                  onFocus={() => {
                    focusedIdxRef.current = idx;
                  }}
                >
                  <span className="flex h-8 w-24 shrink-0 overflow-hidden rounded-md ring-1 ring-mn-border">
                    {sw.map((hex) => (
                      <span
                        key={hex}
                        className="min-w-0 flex-1"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">{MN_THEME_LABELS[id]}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
