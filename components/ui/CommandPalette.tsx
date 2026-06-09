"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { commandMetas } from "@/lib/commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onRun: (command: string) => void;
}

/** ⌘K / Ctrl-K fuzzy command launcher. */
export function CommandPalette({ open, onClose, onRun }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = commandMetas.filter((c) => !c.hidden);
    if (!q) return visible;
    return visible.filter(
      (c) =>
        c.name.includes(q) ||
        c.aliases.some((a) => a.includes(q)) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, [open]);

  if (!open) return null;

  const choose = (name: string) => {
    onRun(name);
    setQuery("");
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (list[sel]) choose(list[sel].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-window shadow-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSel(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Run a command…"
          aria-label="Search commands"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-b border-border bg-elevated px-4 py-3 font-mono text-sm text-fg caret-accent outline-none placeholder:text-muted"
        />
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox" aria-label="Commands">
          {list.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No matching command.</li>
          )}
          {list.map((c, i) => (
            <li key={c.name} role="option" aria-selected={i === sel}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => choose(c.name)}
                className={[
                  "flex w-full items-baseline gap-3 px-4 py-2 text-left transition-colors",
                  i === sel ? "bg-elevated" : "",
                ].join(" ")}
              >
                <span className="w-24 shrink-0 font-mono text-sm text-accent">{c.name}</span>
                <span className="truncate font-sans text-sm text-muted">{c.description}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2 font-mono text-[11px] text-muted">
          ↑↓ navigate · ↵ run · esc close
        </div>
      </div>
    </div>
  );
}
