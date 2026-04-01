"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MovieNightUser,
  MovieNightUserName,
} from "../lib/auth";
import {
  AUTH_LOCALSTORAGE_KEY,
  USER_ADMIN_FLAGS,
  USER_PASSWORDS,
} from "../lib/auth";

type AuthState = {
  user: MovieNightUser | null;
  hydrated: boolean;
  error: string | null;
  login: (args: { username: MovieNightUserName; password: string }) => void;
  logout: () => void;
};

function safeReadUser(): MovieNightUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "name" in parsed &&
      "admin" in parsed
    ) {
      const name = (parsed as { name?: unknown }).name;
      const admin = (parsed as { admin?: unknown }).admin;
      const validName =
        name === "Britton" || name === "Nabi" || name === "Alex";
      const validAdmin = typeof admin === "boolean";
      if (validName && validAdmin) {
        return { name: name as MovieNightUserName, admin };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<MovieNightUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setUser(safeReadUser());
      setHydrated(true);
    };
    void run();

    // Never block the app indefinitely if the effect stalls (extensions, rare runtimes).
    const failSafe = window.setTimeout(() => {
      if (cancelled) return;
      setUser((prev) => prev ?? safeReadUser());
      setHydrated(true);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
    };
  }, []);

  const login = useCallback(
    ({ username, password }: { username: MovieNightUserName; password: string }) => {
      const expected = USER_PASSWORDS[username];
      const ok = password === expected;
      if (!ok) {
        setError("Invalid username or password.");
        return;
      }

      const nextUser: MovieNightUser = {
        name: username,
        admin: USER_ADMIN_FLAGS[username],
      };

      try {
        window.localStorage.setItem(
          AUTH_LOCALSTORAGE_KEY,
          JSON.stringify(nextUser),
        );
      } catch {
        // If storage is blocked, still allow the session in-memory.
      }

      setUser(nextUser);
      setError(null);
    },
    [],
  );

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(AUTH_LOCALSTORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setError(null);
  }, []);

  return useMemo(
    () => ({ user, hydrated, error, login, logout }),
    [user, hydrated, error, login, logout],
  );
}

