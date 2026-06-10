"use client";

import { useEffect, useRef } from "react";
import { PromptLabel } from "./PromptLabel";
import { activeWindowKey, getPane } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { executeCommand } from "@/lib/terminal/executor";
import { completeLine } from "@/lib/terminal/completion";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

/** NORMAL-mode line rendering: text with a block cursor (§6.2). */
function NormalLine({ text, pos }: { text: string; pos: number }) {
  const at = Math.min(pos, Math.max(0, text.length - 1));
  return (
    <span className="whitespace-pre font-mono text-sm text-fg">
      {text.slice(0, at)}
      <span className="bg-[var(--accent)] text-[var(--bg-window)]">
        {text[at] ?? " "}
      </span>
      {text.slice(at + 1)}
    </span>
  );
}

/**
 * One shell prompt, store-backed. INSERT editing lives on the native input
 * (soft keyboards, IME, a11y); in NORMAL the global keyboard module drives
 * the vim machine and this renders the buffer with a block cursor.
 */
export function Prompt({ windowKey }: { windowKey: WindowKey }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = useTerminalStore((s) => getPane(s, windowKey).inputBuffer);
  const cursorPos = useTerminalStore((s) => getPane(s, windowKey).cursorPos);
  const mode = useTerminalStore((s) => getPane(s, windowKey).mode);
  const cwd = useTerminalStore((s) => getPane(s, windowKey).cwd);
  const isActive = useTerminalStore((s) => activeWindowKey(s) === windowKey);

  // The active pane's prompt takes focus (fine pointers only — never raise
  // the soft keyboard uninvited, §11). Re-acquire focus and the stored
  // cursor when returning from NORMAL.
  useEffect(() => {
    if (isActive && mode === "INSERT" && window.matchMedia?.("(pointer: fine)").matches) {
      const el = inputRef.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(cursorPos, cursorPos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, mode]);

  const setInput = (text: string, pos: number) =>
    store.dispatch({ type: "set-input", windowKey, text, cursorPos: pos });

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode !== "INSERT") {
      // NORMAL/COPY keys belong to the global listener.
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      // INSERT → NORMAL; the cursor steps left, like vim (§6.1).
      e.preventDefault();
      const sel = inputRef.current?.selectionStart ?? value.length;
      store.dispatch({ type: "set-cursor", windowKey, pos: Math.max(0, sel - 1) });
      store.dispatch({ type: "set-mode", windowKey, mode: "NORMAL" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const line = value;
      setInput("", 0);
      executeCommand(line, { source: "typed" });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      store.dispatch({ type: "history-walk", windowKey, direction: -1 });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      store.dispatch({ type: "history-walk", windowKey, direction: 1 });
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const result = completeLine(value, cwd);
      if (result.text) {
        setInput(result.text, result.text.length);
      } else if (result.candidates) {
        store.dispatch({
          type: "append-line",
          windowKey,
          command: null,
          node: (
            <p className="font-mono text-sm text-muted">{result.candidates.join("  ")}</p>
          ),
        });
      }
      return;
    }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setInput("", 0);
      return;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <PromptLabel path={cwd} />
      {mode === "NORMAL" ? (
        <NormalLine text={value} pos={cursorPos} />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setInput(e.target.value, e.target.selectionStart ?? 0)}
          onSelect={(e) => {
            const pos = e.currentTarget.selectionStart ?? 0;
            store.dispatch({ type: "set-cursor", windowKey, pos });
          }}
          onKeyDown={onKeyDown}
          aria-label="Terminal command input"
          aria-describedby="input-hint"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-w-0 flex-1 border-none bg-transparent font-mono text-sm text-fg caret-[var(--accent)] outline-none"
        />
      )}
    </div>
  );
}
