"use client";

import { useEffect } from "react";

interface Options {
  /** Clear the log (Ctrl-L / Cmd-L). */
  onClear: () => void;
}

/**
 * The terminal's one global key binding: Ctrl-L (or Cmd-L) clears the log, like
 * a real shell. History recall (↑/↓) and Tab-completion live in CommandInput.
 */
export function useTerminalKeys({ onClear }: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClear]);
}
