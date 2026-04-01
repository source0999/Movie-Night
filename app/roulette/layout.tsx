import { Suspense, type ReactNode } from "react";

export default function RouletteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-zinc-50 dark:bg-black" />}
    >
      {children}
    </Suspense>
  );
}
