"use client";

import { useEffect, useState } from "react";
import type { VimMode } from "./useTerminalKeys";
import type { TerminalWindow } from "./windows";
import { SECTIONS } from "./windows";
import { profile } from "@/data/profile";

interface StatusBarProps {
  mode: VimMode;
  prefix: boolean;
  active: number;
  onSelect: (id: number) => void;
}

/**
 * tmux-style status line. The left host label is the home control (window 0);
 * the section tabs sit to its right; mode + clock on the far right.
 */
export function StatusBar({ mode, prefix, active, onSelect }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const home = active === 0;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          data-home="true"
          onClick={() => onSelect(0)}
          aria-current={home ? "true" : undefined}
          aria-label="Home (shell session)"
          className={[
            "shrink-0 rounded-sm px-1.5 py-0.5 font-semibold transition-colors focus-visible:outline-2",
            home ? "bg-accent text-bg" : "bg-selection text-accent hover:text-fg",
          ].join(" ")}
        >
          {profile.username}@portfolio
        </button>
        <nav
          aria-label="Windows"
          className="flex items-center gap-1 overflow-x-auto whitespace-nowrap"
        >
          {SECTIONS.map((w: TerminalWindow) => {
            const on = w.id === active;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelect(w.id)}
                aria-current={on ? "true" : undefined}
                className={[
                  "shrink-0 rounded-sm px-1.5 py-0.5 transition-colors focus-visible:outline-2",
                  on ? "bg-selection font-semibold text-accent" : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {w.id}:{w.label}
                {on ? "*" : ""}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
        {prefix && (
          <span className="rounded-sm bg-warning px-1.5 py-0.5 font-semibold text-bg">^b</span>
        )}
        <span className={mode === "normal" ? "text-warning" : "text-success"}>
          -- {mode.toUpperCase()} --
        </span>
        <span className="text-muted">{time}</span>
      </div>
    </div>
  );
}
