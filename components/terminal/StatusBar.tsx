"use client";

import { useEffect, useState } from "react";
import type { VimMode } from "./useTerminalKeys";
import type { TerminalWindow } from "./windows";

interface StatusBarProps {
  mode: VimMode;
  prefix: boolean;
  windows: readonly TerminalWindow[];
  active: number;
  onSelect: (id: number) => void;
}

/**
 * tmux-style status line: the interactive window list on the left (kitty-style
 * tabs you can click or jump to with the Ctrl-b prefix), mode + clock on the
 * right.
 */
export function StatusBar({ mode, prefix, windows, active, onSelect }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px]">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="shrink-0 rounded-sm bg-accent px-1.5 py-0.5 font-semibold text-bg"
          aria-hidden="true"
        >
          portfolio
        </span>
        <nav
          aria-label="Windows"
          className="flex items-center gap-1 overflow-x-auto whitespace-nowrap"
        >
          {windows.map((w) => {
            const isActive = w.id === active;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelect(w.id)}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "shrink-0 rounded-sm px-1.5 py-0.5 transition-colors focus-visible:outline-2",
                  isActive
                    ? "bg-selection font-semibold text-accent"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {w.id}:{w.label}
                {isActive ? "*" : ""}
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
