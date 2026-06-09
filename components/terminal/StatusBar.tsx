"use client";

import { useEffect, useState } from "react";
import type { VimMode } from "./useTerminalKeys";

/** tmux-style status line: session/window on the left, mode + clock on the right. */
export function StatusBar({ mode, prefix }: { mode: VimMode; prefix: boolean }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-accent px-1.5 py-0.5 font-semibold text-bg">portfolio</span>
        <span className="text-muted">0:terminal*</span>
      </div>
      <div className="flex items-center gap-2">
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
