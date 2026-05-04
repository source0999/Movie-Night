"use client";

import { useMemo, useState } from "react";
import type { MovieNightUserName } from "../lib/auth";
import { USER_ADMIN_FLAGS } from "../lib/auth";
import ThemeSwitcher from "./ThemeSwitcher";

const USERNAMES: MovieNightUserName[] = ["Britton", "Nabi", "Alex"];

const USER_META: Record<
  MovieNightUserName,
  { initial: string; hint: string }
> = {
  Britton: { initial: "B", hint: "Admin" },
  Nabi: { initial: "N", hint: "Standard" },
  Alex: { initial: "A", hint: "Standard" },
};

export default function LoginPage({
  onLogin,
  error,
}: {
  onLogin: (args: { username: MovieNightUserName; password: string }) => void;
  error: string | null;
}) {
  const [username, setUsername] = useState<MovieNightUserName>("Britton");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = useMemo(() => USER_ADMIN_FLAGS[username], [username]);

  return (
    <div className="relative min-h-screen bg-mn-bg px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] font-sans text-mn-fg">
      <div className="pointer-events-auto fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] sm:right-6">
        <ThemeSwitcher />
      </div>

      <div className="mx-auto max-w-md">
        <div
          className="overflow-hidden rounded-[var(--mn-radius-lg)] p-[1px] shadow-[var(--mn-shadow-glow)]"
          style={{
            background:
              "linear-gradient(135deg, var(--mn-accent), var(--mn-accent-2), var(--mn-accent-3))",
          }}
        >
          <div className="rounded-[calc(var(--mn-radius-lg)-1px)] bg-mn-card p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-mn-accent">
              Friend group
            </p>
            <h1
              className="mt-2 text-[clamp(1.75rem,6vw,2.25rem)] font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-orbitron), system-ui, sans-serif",
              }}
            >
              <span className="text-mn-accent">Movie</span> Night
            </h1>
            <p className="mt-2 text-sm text-mn-fg-muted">
              Log in to search, save, and spin the roulette with your crew.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                onLogin({ username, password });
              }}
            >
              <div>
                <span
                  id="username-label"
                  className="block text-sm font-medium text-mn-fg"
                >
                  Who&apos;s watching?
                </span>
                <div
                  className="mt-3 grid grid-cols-3 gap-2"
                  role="group"
                  aria-labelledby="username-label"
                >
                  {USERNAMES.map((u) => {
                    const active = username === u;
                    const meta = USER_META[u];
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUsername(u)}
                        aria-pressed={active}
                        className={`mn-btn-press flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition touch-manipulation ${
                          active
                            ? "border-mn-border-strong bg-mn-accent/15 text-mn-accent ring-2 ring-mn-accent/40"
                            : "border-mn-border bg-mn-input text-mn-fg hover:border-mn-border-strong hover:bg-mn-card-elev"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${
                            active
                              ? "bg-mn-accent text-mn-bg"
                              : "bg-mn-card-elev text-mn-fg-muted"
                          }`}
                        >
                          {meta.initial}
                        </span>
                        <span className="text-xs font-semibold">{u}</span>
                        {u === "Britton" ? (
                          <span className="text-[10px] text-mn-fg-soft">
                            Admin
                          </span>
                        ) : (
                          <span className="text-[10px] text-mn-fg-soft">
                            {meta.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-mn-fg"
                >
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full min-h-[48px] rounded-xl border border-mn-border bg-mn-input px-3 py-3 pr-24 text-sm text-mn-fg outline-none transition focus:border-mn-border-strong focus:ring-2 focus:ring-mn-accent/30"
                  />
                  <button
                    type="button"
                    className="mn-btn-press absolute right-2 top-1/2 min-h-[40px] -translate-y-1/2 rounded-lg px-2 text-xs font-semibold text-mn-accent touch-manipulation"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {isAdmin ? (
                <p className="text-xs text-mn-fg-muted">
                  You&apos;re signing in with admin privileges.
                </p>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-mn-danger/50 bg-mn-danger/10 px-3 py-2 text-sm text-mn-danger"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="mn-btn-press w-full min-h-[48px] rounded-xl bg-mn-accent px-4 py-3 text-sm font-bold text-mn-bg shadow-[var(--mn-shadow-soft)] transition hover:brightness-110 touch-manipulation"
              >
                Log in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
