"use client";

import { useEffect, useState } from "react";
import { themes } from "@/lib/themes";
import { profile } from "@/data/profile";

interface StatusBarProps {
  /** The active theme id, resolved to its human label for display. */
  themeId: string;
}

/**
 * Decorative status line — terminal flavor, not navigation. Shows the working
 * directory, the current theme, and a clock. Marked aria-hidden because every
 * value here is available through a real control elsewhere (the theme switcher,
 * the prompt path).
 */
export function StatusBar({ themeId }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const themeLabel = themes.find((t) => t.id === themeId)?.label ?? themeId;

  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted"
    >
      <span className="truncate">
        {profile.username}@portfolio:<span className="text-accent">~</span>
      </span>
      <div className="flex shrink-0 items-center gap-3">
        {/* Theme is only known client-side; the mismatch on this decorative
            label is expected and harmless. */}
        <span suppressHydrationWarning>{themeLabel}</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
