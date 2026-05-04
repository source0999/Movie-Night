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
        className="flex min-h-screen flex-col items-center justify-center gap-5 bg-mn-bg px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className="mn-loading-ring relative h-14 w-14 rounded-full border-2 border-mn-border border-t-mn-accent"
          aria-hidden
        />
        <div>
          <p
            className="text-sm font-semibold tracking-wide text-mn-fg"
            style={{
              fontFamily: "var(--font-orbitron), system-ui, sans-serif",
            }}
          >
            Movie Night
          </p>
          <p className="mt-2 text-sm font-medium text-mn-fg-muted">
            Syncing…
          </p>
          <p className="mt-1 max-w-sm text-xs text-mn-fg-soft">
            If this stays for more than a few seconds, refresh the page or check
            your connection.
          </p>
        </div>
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
