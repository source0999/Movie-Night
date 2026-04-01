"use client";

import type { ReactNode } from "react";
import TopNav from "./TopNav";
import LoginPage from "./LoginPage";
import { useAuth } from "../hooks/useAuth";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, hydrated, login, error, logout } = useAuth();

  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center dark:bg-black"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Syncing…
        </p>
        <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-500">
          If this stays for more than a few seconds, refresh the page or check your connection.
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} error={error} />;
  }

  return (
    <>
      <TopNav user={user} onLogout={logout} />
      <main className="relative z-0 min-h-0 flex-1">{children}</main>
    </>
  );
}

