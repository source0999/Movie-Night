"use client";

import type { ReactNode } from "react";
import TopNav from "./TopNav";
import LoginPage from "./LoginPage";
import { useAuth } from "../hooks/useAuth";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, hydrated, login, error, logout } = useAuth();

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black" aria-busy="true" />
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} error={error} />;
  }

  return (
    <>
      <TopNav user={user} onLogout={logout} />
      {children}
    </>
  );
}

