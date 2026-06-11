"use client";

import { useSyncExternalStore } from "react";
import { runClick } from "@/lib/terminal/run-click";

export const WELCOME_DISMISSED_KEY = "portfolio:welcome-dismissed";

/**
 * Dismissal lives in localStorage; a tiny external store keeps React in
 * sync with it. The server snapshot says "dismissed" so nothing renders
 * during SSR/hydration — the strip appears only client-side.
 */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const isDismissed = () => {
  try {
    return localStorage.getItem(WELCOME_DISMISSED_KEY) === "1";
  } catch {
    return true; // storage unavailable — keep it hidden
  }
};
const dismiss = () => {
  try {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((cb) => cb());
};

/**
 * One-time plain-language orientation for visitors who have never used a
 * terminal. Renders nothing after dismissal — the choice persists so it
 * never nags.
 */
export function WelcomeStrip() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  if (dismissed) return null;

  return (
    <div
      role="note"
      aria-label="Welcome"
      className="flex items-center justify-between gap-3 border-b border-border bg-accent/10 px-3 py-1.5"
    >
      <p className="font-sans text-sm text-fg">
        New to terminals? Click the tabs above to browse — or{" "}
        <button
          type="button"
          onClick={() => runClick("plain")}
          className="cursor-pointer text-accent underline underline-offset-2 transition-colors hover:text-fg focus-visible:outline-2"
        >
          switch to plain view
        </button>
        .
      </p>
      <button
        type="button"
        aria-label="Dismiss welcome message"
        onClick={dismiss}
        className="cursor-pointer px-1 font-mono text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2"
      >
        ✕
      </button>
    </div>
  );
}
