"use client";

import { NAV_SECTIONS } from "./sections";

/**
 * The single persistent nav row, shown on every viewport. Each button runs its
 * section's command into the log — identical to typing it — so clicking and
 * typing teach each other. Replaces the old desktop tab strip and mobile bar.
 */
export function SectionNav({ onRun }: { onRun: (command: string) => void }) {
  const btn =
    "min-h-[40px] flex-1 rounded-md border border-border bg-elevated px-2 font-mono text-xs text-fg transition-colors hover:border-accent/60 hover:text-accent active:text-accent focus-visible:outline-2";

  return (
    <nav
      aria-label="Sections"
      className="flex items-center gap-2 border-t border-border bg-window px-2 py-1.5"
    >
      {NAV_SECTIONS.map((s) => (
        <button key={s.command} type="button" onClick={() => onRun(s.command)} className={btn}>
          {s.label}
        </button>
      ))}
      <button type="button" onClick={() => onRun("help")} className={btn}>
        help
      </button>
    </nav>
  );
}
