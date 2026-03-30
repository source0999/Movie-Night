"use client";

import { useMemo, useState } from "react";
import type { MovieNightUserName } from "../lib/auth";
import { USER_ADMIN_FLAGS } from "../lib/auth";

const USERNAMES: MovieNightUserName[] = ["Britton", "Nabi", "Alex"];

export default function LoginPage({
  onLogin,
  error,
}: {
  onLogin: (args: { username: MovieNightUserName; password: string }) => void;
  error: string | null;
}) {
  const [username, setUsername] = useState<MovieNightUserName>("Britton");
  const [password, setPassword] = useState("");

  const isAdmin = useMemo(() => USER_ADMIN_FLAGS[username], [username]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight">Movie Night</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please log in to continue.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onLogin({ username, password });
            }}
          >
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                User
              </label>
              <select
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value as MovieNightUserName)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-zinc-800"
              >
                {USERNAMES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                    {u === "Britton" ? " (admin)" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {isAdmin ? "Admin access." : "Standard access."}
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-zinc-800"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

