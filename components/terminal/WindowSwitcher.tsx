"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { TerminalWindow } from "./windows";

interface WindowSwitcherProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: number) => void;
  windows: readonly TerminalWindow[];
  active: number;
}

/** tmux `prefix s` window picker: choose a window with ↑↓ / number / click. */
export function WindowSwitcher({ open, onClose, onSelect, windows, active }: WindowSwitcherProps) {
  const [sel, setSel] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Reset the highlight to the current window each time the picker opens
  // (render-time state adjustment — the React-recommended alternative to an
  // effect that mirrors a prop into state).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSel(Math.max(0, windows.findIndex((w) => w.id === active)));
  }

  // Move DOM focus into the list on open, restore it on close.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    listRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, [open]);

  if (!open) return null;

  const choose = (id: number) => {
    onSelect(id);
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, windows.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (windows[sel]) choose(windows[sel].id);
    } else if (/^[0-9]$/.test(e.key)) {
      const target = windows.find((w) => w.id === Number(e.key));
      if (target) {
        e.preventDefault();
        choose(target.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch window"
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-window shadow-2xl"
      >
        <p className="border-b border-border bg-elevated px-4 py-2 font-mono text-xs text-muted">
          choose a window
        </p>
        <ul
          ref={listRef}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          role="listbox"
          aria-label="Windows"
          aria-activedescendant={windows[sel] ? `window-opt-${windows[sel].id}` : undefined}
          className="max-h-[50vh] overflow-y-auto py-1 outline-none"
        >
          {windows.map((w, i) => (
            <li
              key={w.id}
              id={`window-opt-${w.id}`}
              role="option"
              aria-selected={i === sel}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setSel(i)}
                onClick={() => choose(w.id)}
                className={[
                  "flex w-full items-baseline gap-3 px-4 py-2 text-left font-mono text-sm transition-colors",
                  i === sel ? "bg-elevated" : "",
                ].join(" ")}
              >
                <span className="w-6 shrink-0 text-accent">{w.id}</span>
                <span className="text-fg">{w.label}</span>
                {w.id === active && <span className="ml-auto text-muted">current</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2 font-mono text-[11px] text-muted">
          ↑↓ navigate · 0–9 jump · ↵ select · esc close
        </div>
      </div>
    </div>
  );
}
