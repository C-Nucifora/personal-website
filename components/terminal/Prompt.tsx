"use client";

import { useEffect, useRef } from "react";
import { PromptLabel } from "./PromptLabel";
import { activeWindowKey, getPane } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { executeCommand } from "@/lib/terminal/executor";
import { completeLine } from "@/lib/terminal/completion";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

/**
 * One shell prompt, store-backed. Each pane owns one; the active pane's
 * prompt holds focus. INSERT-mode editing lives on the native input (soft
 * keyboards, IME, a11y); modal editing arrives with the vim grammar.
 */
export function Prompt({ windowKey }: { windowKey: WindowKey }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = useTerminalStore((s) => getPane(s, windowKey).inputBuffer);
  const cwd = useTerminalStore((s) => getPane(s, windowKey).cwd);
  const isActive = useTerminalStore((s) => activeWindowKey(s) === windowKey);

  // The active pane's prompt takes focus (fine pointers only — never raise
  // the soft keyboard uninvited, §11).
  useEffect(() => {
    if (isActive && window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isActive]);

  const setInput = (text: string, cursorPos: number) =>
    store.dispatch({ type: "set-input", windowKey, text, cursorPos });

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setInput(e.target.value, e.target.selectionStart ?? 0)}
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
    </div>
  );
}
