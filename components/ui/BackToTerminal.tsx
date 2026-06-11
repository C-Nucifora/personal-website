"use client";

import { setViewMode } from "@/lib/view-mode";

/**
 * Returns from plain view to the terminal. It lives inside the static
 * fallback, so CSS hides it until JS has booted (`.back-to-terminal` rule
 * in globals.css) — without JS there is no terminal to go back to.
 */
export function BackToTerminal() {
  return (
    <button
      type="button"
      onClick={() => setViewMode("terminal")}
      className="back-to-terminal inline-flex cursor-pointer items-center gap-2 rounded-md border border-accent/40 px-3 py-2 font-mono text-sm text-accent transition-colors hover:bg-accent/10"
    >
      Back to the terminal
    </button>
  );
}
