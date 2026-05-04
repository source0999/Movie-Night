import type { ReactNode } from "react";

export default function EmptyCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-mn-border bg-mn-card p-6 text-sm text-mn-fg-muted shadow-[var(--mn-shadow-soft)] sm:p-8 ${className}`}
    >
      <p className="font-medium text-mn-fg">{title}</p>
      {description ? (
        <p className="mt-2 leading-relaxed text-mn-fg-muted">{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
