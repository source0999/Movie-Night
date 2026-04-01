"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MovieNightUser } from "../lib/auth";
import AddMiscModal from "./AddMiscModal";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/movie-search", label: "Search" },
  { href: "/library", label: "Library" },
  { href: "/roulette", label: "Movie Roulette" },
] as const;

/** Matches next.config: no basePath in development, /Movie-Night in production export. */
const routeBasePath = (
  process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production" ? "/Movie-Night" : "")
).replace(/\/$/, "");

function normalizePath(p: string) {
  let t = p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;
  if (routeBasePath && t.startsWith(`${routeBasePath}/`)) {
    t = t.slice(routeBasePath.length) || "/";
  } else if (routeBasePath && t === routeBasePath) {
    t = "/";
  }
  return t.endsWith("/") && t.length > 1 ? t.slice(0, -1) : t;
}

function isActive(pathname: string, href: string) {
  const h = normalizePath(href);
  const c = normalizePath(pathname);

  if (h === "" || h === "/") return c === "" || c === "/";
  return c === h;
}

export default function TopNav({
  user,
  onLogout,
}: {
  user?: MovieNightUser | null;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [addMiscOpen, setAddMiscOpen] = useState(false);

  const closeAddMisc = useCallback(() => setAddMiscOpen(false), []);

  function resetAllSearchState() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("movieNight:resetHomeSearch"));
    window.dispatchEvent(new CustomEvent("movieNight:resetMovieSearch"));
    window.dispatchEvent(new CustomEvent("movieNight:resetTvSearch"));
  }

  useEffect(() => {
    const run = async () => {
      await Promise.resolve();
      setOpen(false);
    };
    void run();
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!user) {
        setDisplayName(null);
        return;
      }
      setDisplayName(user.name);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function openAddMisc() {
    setAddMiscOpen(true);
    setOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => resetAllSearchState()}
          className="min-h-[44px] min-w-0 shrink-0 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Movie Night
        </Link>

        {/* Desktop / large tablet: full nav row with wrap (no overlap with aggressive single line) */}
        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-2 lg:flex [&_a]:whitespace-nowrap">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            const isHome = l.href === "/";
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => {
                  if (isHome) resetAllSearchState();
                }}
                className={`inline-flex min-h-[40px] items-center rounded-lg px-2 py-2 text-sm font-medium transition ${
                  active
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                }`}
                style={
                  active
                    ? {
                        boxShadow: "inset 0 -2px 0 0 rgba(24,24,27,1)",
                      }
                    : undefined
                }
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
          {user ? (
            <button
              type="button"
              onClick={openAddMisc}
              className="min-h-[40px] shrink-0 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/50"
            >
              + Add Misc
            </button>
          ) : null}
        </div>

        {/* Right cluster: greeting, logout, menu — below lg use hamburger only for links */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden max-w-[140px] truncate text-sm font-medium text-zinc-900 dark:text-zinc-50 sm:block lg:max-w-none">
                Hi, {displayName}!
              </div>
              <button
                type="button"
                onClick={() => onLogout?.()}
                className="hidden min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 lg:inline-flex dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-50 dark:hover:bg-zinc-900/35"
              >
                Logout
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-50 dark:hover:bg-zinc-900/35"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 7h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 12h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/98 lg:hidden">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex max-h-[min(70vh,480px)] flex-col gap-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                const isHome = l.href === "/";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => {
                      setOpen(false);
                      if (isHome) resetAllSearchState();
                    }}
                    className={`min-h-[48px] rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : "bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                );
              })}
              {user ? (
                <button
                  type="button"
                  onClick={openAddMisc}
                  className="min-h-[48px] rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-violet-900 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-100"
                >
                  + Add Misc
                </button>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout?.();
                  }}
                  className="min-h-[48px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-50 dark:hover:bg-zinc-900/35"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {user && addMiscOpen ? (
        <AddMiscModal user={user} onClose={closeAddMisc} />
      ) : null}
    </nav>
  );
}
