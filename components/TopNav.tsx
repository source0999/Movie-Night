"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MovieNightUser } from "../lib/auth";
import AddMiscModal from "./AddMiscModal";
import ThemeSwitcher from "./ThemeSwitcher";

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
    <nav className="sticky top-0 z-50 border-b border-mn-border bg-mn-nav/95 backdrop-blur-md supports-[backdrop-filter]:bg-mn-nav/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => resetAllSearchState()}
          className="min-h-[44px] min-w-0 shrink-0 py-2 text-sm font-bold tracking-tight text-mn-fg"
          style={{
            fontFamily: "var(--font-orbitron), system-ui, sans-serif",
          }}
        >
          <span className="text-mn-accent">Movie</span> Night
        </Link>

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
                className={`inline-flex min-h-[40px] items-center rounded-lg px-2 py-2 text-sm font-medium transition touch-manipulation ${
                  active
                    ? "font-semibold text-mn-accent"
                    : "text-mn-fg-muted hover:text-mn-fg"
                }`}
                style={
                  active
                    ? {
                        boxShadow: "inset 0 -2px 0 0 var(--mn-accent)",
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
              className="mn-btn-press min-h-[40px] shrink-0 rounded-xl border border-mn-border-strong bg-mn-input px-3 py-2 text-sm font-semibold text-mn-accent transition hover:bg-mn-card-elev"
            >
              + Add Misc
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden max-w-[140px] truncate text-sm font-medium text-mn-fg sm:block lg:max-w-none">
                Hi, {displayName}!
              </div>
              <ThemeSwitcher />
              <button
                type="button"
                onClick={() => onLogout?.()}
                className="mn-btn-press hidden min-h-[44px] rounded-xl border border-mn-border bg-mn-card px-3 py-2 text-sm font-medium text-mn-fg shadow-sm transition hover:bg-mn-card-elev lg:inline-flex"
              >
                Logout
              </button>
            </>
          ) : (
            <ThemeSwitcher />
          )}

          <button
            type="button"
            className="mn-btn-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mn-border bg-mn-card text-mn-fg shadow-sm transition hover:bg-mn-card-elev lg:hidden"
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
        <>
          <button
            type="button"
            className="fixed inset-0 z-[48] bg-black/50 mn-nav-backdrop-enter lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-[49] border-t border-mn-border bg-mn-modal/98 backdrop-blur-md lg:hidden">
            <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
              <div className="mn-nav-drawer-enter flex max-h-[min(70vh,480px)] flex-col gap-1 overflow-y-auto rounded-2xl border border-mn-border bg-mn-card p-2 shadow-[var(--mn-shadow-soft)]">
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
                      className={`min-h-[48px] rounded-xl px-4 py-3 text-sm font-medium transition touch-manipulation ${
                        active
                          ? "bg-mn-accent/20 font-semibold text-mn-accent ring-1 ring-mn-border-strong"
                          : "bg-mn-input text-mn-fg hover:bg-mn-card-elev"
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
                    className="min-h-[48px] rounded-xl border border-mn-border-strong bg-mn-input px-4 py-3 text-left text-sm font-semibold text-mn-accent touch-manipulation"
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
                    className="min-h-[48px] rounded-xl border border-mn-border bg-mn-card px-4 py-3 text-left text-sm font-medium text-mn-fg transition hover:bg-mn-card-elev touch-manipulation"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {user && addMiscOpen ? (
        <AddMiscModal user={user} onClose={closeAddMisc} />
      ) : null}
    </nav>
  );
}
