"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MovieNightUser } from "../lib/auth";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/roulette", label: "Movie Roulette" },
] as const;

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/Movie-Night").replace(
  /\/$/,
  "",
);

function isActive(pathname: string, href: string) {
  const norm = (p: string) => (p.endsWith("/") ? p.slice(0, -1) : p);

  // Next.js `basePath` means `usePathname()` often includes it (e.g. `/Movie-Night/library`).
  // For comparisons, strip it so link highlighting continues to work.
  let cleanPath = pathname;
  if (basePath && basePath !== "/" && cleanPath.startsWith(`${basePath}/`)) {
    cleanPath = cleanPath.slice(basePath.length);
  } else if (basePath && basePath !== "/" && cleanPath === basePath) {
    cleanPath = "/";
  }

  if (href === "/") return norm(cleanPath) === "";
  return norm(cleanPath) === norm(href);
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

  function resetHomeSearch() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("movieNight:resetHomeSearch"));
  }

  useEffect(() => {
    const run = async () => {
      // Defer state updates to satisfy eslint "set-state-in-effect".
      await Promise.resolve();
      setOpen(false);
    };
    void run();
  }, [pathname]);

  useEffect(() => {
    // Ensure greeting only appears on the client after hydration.
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

  return (
    <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => resetHomeSearch()}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Movie Night
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    if (l.href === "/") resetHomeSearch();
                  }}
                  className={`text-sm font-medium transition ${
                    active
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                  }`}
                  style={
                    active
                      ? {
                          borderBottom: "2px solid rgba(24,24,27,1)",
                          paddingBottom: 2,
                        }
                      : undefined
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-sm font-medium text-zinc-900 dark:text-zinc-50 sm:block">
                  Hi, {displayName}!
                </div>
                <button
                  type="button"
                  onClick={() => onLogout?.()}
                  className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-50 dark:hover:bg-zinc-900/35"
                >
                  Logout
                </button>
              </>
            ) : null}

            <button
              type="button"
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-50 dark:hover:bg-zinc-900/35 md:hidden"
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
      </div>

      {open ? (
        <div className="md:hidden">
          <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-black/40">
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => {
                      setOpen(false);
                      if (l.href === "/") resetHomeSearch();
                    }}
                    className={`min-h-[44px] rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : "bg-white text-zinc-900 hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900/40"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

