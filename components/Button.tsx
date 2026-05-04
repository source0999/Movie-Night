import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "border border-transparent bg-mn-accent text-mn-bg hover:brightness-110",
  secondary:
    "border border-mn-border bg-mn-card text-mn-fg hover:bg-mn-card-elev",
  ghost:
    "border border-transparent bg-transparent text-mn-fg-muted hover:bg-mn-input hover:text-mn-fg",
  danger:
    "border border-mn-danger/40 bg-mn-danger/15 text-mn-danger hover:bg-mn-danger/25",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-[40px] px-3 py-2 text-xs font-semibold",
  md: "min-h-[44px] px-4 py-3 text-sm font-medium",
  lg: "min-h-[48px] px-5 py-3 text-base font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      className={`mn-btn-press inline-flex touch-manipulation items-center justify-center rounded-xl font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mn-focus disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
