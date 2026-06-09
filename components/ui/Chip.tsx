"use client";

import type { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The command this chip runs, shown as `> label` so the click teaches it. */
  label: string;
  /** Visual emphasis for the primary suggestions. */
  accent?: boolean;
}

/**
 * A clickable suggestion that runs a command. Rendered as a real <button> so
 * it's keyboard-operable and announced. Min height keeps the tap target >=44px.
 */
export function Chip({ label, accent = false, className = "", ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5",
        "font-mono text-sm transition-colors cursor-pointer",
        "focus-visible:outline-2",
        accent
          ? "border-accent/40 text-accent hover:bg-accent/10"
          : "border-border bg-elevated text-fg hover:border-accent/60 hover:text-accent",
        className,
      ].join(" ")}
      {...rest}
    >
      <span aria-hidden="true" className="text-muted">
        &gt;
      </span>
      {label}
    </button>
  );
}
