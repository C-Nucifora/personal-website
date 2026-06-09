"use client";

import { forwardRef, useRef, useState, type KeyboardEvent } from "react";
import { PromptLabel } from "./PromptLabel";
import { completionCandidates } from "@/lib/commands";

function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (const s of strings) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) break;
  }
  return prefix;
}

interface CommandInputProps {
  /** Run a command line. */
  onSubmit: (line: string) => void;
  /** Command history, oldest first. */
  history: string[];
}

/**
 * The live prompt. Enter runs; ↑/↓ walk history; Tab completes the longest
 * unique prefix and, on a second press, lists matches as chips.
 */
export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(function CommandInput(
  { onSubmit, history },
  ref,
) {
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  // Steps back through history; 0 = the live draft.
  const histPos = useRef(0);
  const draft = useRef("");

  function handleChange(next: string) {
    setValue(next);
    histPos.current = 0;
    if (matches.length) setMatches([]);
  }

  function recallHistory(direction: "up" | "down") {
    if (history.length === 0) return;
    if (histPos.current === 0 && direction === "up") draft.current = value;

    let pos = histPos.current + (direction === "up" ? 1 : -1);
    pos = Math.max(0, Math.min(pos, history.length));
    histPos.current = pos;

    setValue(pos === 0 ? draft.current : history[history.length - pos]);
    setMatches([]);
  }

  function complete() {
    const token = value.trimStart();
    // Only complete the command word (before the first space).
    if (token.includes(" ")) return;
    const found = completionCandidates().filter((c) => c.startsWith(token.toLowerCase()));
    if (found.length === 0) return;
    if (found.length === 1) {
      setValue(found[0] + " ");
      setMatches([]);
      return;
    }
    const lcp = longestCommonPrefix(found);
    if (lcp.length > token.length) setValue(lcp);
    setMatches(found);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Enter": {
        e.preventDefault();
        const line = value.trim();
        if (!line) return;
        onSubmit(line);
        setValue("");
        setMatches([]);
        histPos.current = 0;
        draft.current = "";
        break;
      }
      case "ArrowUp":
        e.preventDefault();
        recallHistory("up");
        break;
      case "ArrowDown":
        e.preventDefault();
        recallHistory("down");
        break;
      case "Tab":
        e.preventDefault();
        complete();
        break;
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="command-input" className="contents">
          <PromptLabel />
          <span className="sr-only">Type a command</span>
        </label>
        <input
          id="command-input"
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="type a command, or tap a suggestion"
          aria-describedby="input-hint"
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-fg caret-accent outline-none placeholder:text-muted"
        />
      </div>

      {matches.length > 1 && (
        <ul className="flex flex-wrap gap-2 pl-1" aria-label="Completions">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => {
                  setValue(m + " ");
                  setMatches([]);
                  if (ref && typeof ref !== "function") ref.current?.focus();
                }}
                className="rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-fg transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
