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

/** The top completion for a single-token input, or "" — drives the ghost text. */
export function topCompletion(value: string): string {
  if (!value || value.includes(" ")) return "";
  const found = completionCandidates()
    .filter((c) => c.startsWith(value.toLowerCase()))
    .sort();
  const top = found[0];
  return top && top.length > value.length ? top : "";
}

interface CommandInputProps {
  /** Run a command line. */
  onSubmit: (line: string) => void;
  /** Command history, oldest first. */
  history: string[];
  /** Current working directory shown in the prompt (e.g. `~/projects`). */
  path?: string;
}

/**
 * The live prompt. Enter runs; ↑/↓ walk history; Tab completes the longest
 * unique prefix and, on a second press, lists matches as chips. A fish-style
 * ghost suggestion previews the top completion — → or End accepts it.
 */
export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(function CommandInput(
  { onSubmit, history, path = "~" },
  ref,
) {
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  // Steps back through history; 0 = the live draft.
  const histPos = useRef(0);
  const draft = useRef("");

  // The remaining suffix of the top completion, shown dimmed after the cursor.
  const completion = topCompletion(value);
  const ghost = completion ? completion.slice(value.length) : "";

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

  function acceptGhost() {
    if (!ghost) return;
    setValue(completion + " ");
    setMatches([]);
    histPos.current = 0;
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
    const atEnd =
      e.currentTarget.selectionStart === value.length &&
      e.currentTarget.selectionEnd === value.length;

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
      case "ArrowRight":
      case "End":
        // Accept the ghost suggestion when the cursor is at the end.
        if (ghost && atEnd) {
          e.preventDefault();
          acceptGhost();
        }
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
          <PromptLabel path={path} />
          <span className="sr-only">Type a command</span>
        </label>
        <div className="relative flex min-w-0 flex-1 items-center">
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
            className="relative z-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-fg caret-accent outline-none placeholder:text-muted"
          />
          {ghost && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center whitespace-pre font-mono text-sm"
            >
              <span className="invisible">{value}</span>
              <span className="text-muted">{ghost}</span>
            </span>
          )}
        </div>
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
