"use client";

import { WINDOW_IDS } from "@/lib/vfs/types";
import { ensureWindowDisplayed } from "@/lib/terminal/executor";
import { store } from "@/lib/terminal/store";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";

/** Ctrl+b w: the tmux window picker — j/k + Enter, or click (§7.2). */
export function WindowPicker() {
  const picker = useTerminalStore((s) => s.picker);
  const active = useTerminalStore((s) => s.activeWindow);
  if (!picker) return null;

  const choose = (index: number) => {
    store.dispatch({ type: "set-picker", picker: null });
    store.dispatch({ type: "switch-window", window: WINDOW_IDS[index] });
    ensureWindowDisplayed();
  };

  return (
    <div
      role="dialog"
      aria-label="Window picker"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
      onClick={() => store.dispatch({ type: "set-picker", picker: null })}
    >
      <ul
        className="min-w-64 rounded-md border border-border bg-elevated p-2 font-mono text-sm shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {WINDOW_IDS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => choose(i)}
              className={[
                "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left",
                i === picker.index ? "bg-selection text-accent" : "text-fg hover:bg-selection/50",
              ].join(" ")}
            >
              <span className="text-subtle">({i + 1})</span>
              {id}
              {id === active && <span className="ml-auto text-xs text-muted">active</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
