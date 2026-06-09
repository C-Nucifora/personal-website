"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { TitleBar } from "./TitleBar";
import { NavBar } from "./NavBar";
import { Greeting } from "./Greeting";
import { SuggestionChips } from "./SuggestionChips";
import { OutputLog } from "./OutputLog";
import { CommandInput } from "./CommandInput";
import type { LogEntry } from "./types";
import { HelpPanel } from "@/components/ui/HelpPanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { runCommandLine, type SessionActions } from "@/lib/commands";

export function Terminal() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  const { themeId, setTheme } = useTheme();

  // Refs hold the latest mutable values for callbacks captured inside output.
  const idRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const themeIdRef = useRef(themeId);
  const runLineRef = useRef<(line: string) => void>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);

  const runLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let cleared = false;
      const actions: SessionActions = {
        clear: () => {
          cleared = true;
        },
        run: (input) => runLineRef.current(input),
        history: historyRef.current,
        getThemeId: () => themeIdRef.current,
        setTheme,
        openHelpPanel: () => setHelpOpen(true),
      };

      const { node } = runCommandLine(trimmed, actions);

      // Record history (skip a consecutive duplicate).
      if (historyRef.current[historyRef.current.length - 1] !== trimmed) {
        historyRef.current = [...historyRef.current, trimmed];
        setHistory(historyRef.current);
      }

      if (cleared) {
        setEntries([]);
      } else {
        setEntries((es) => [...es, { id: idRef.current++, command: trimmed, output: node }]);
      }
    },
    [setTheme],
  );

  useEffect(() => {
    runLineRef.current = runLine;
  }, [runLine]);

  // Keep the newest output and the prompt in view; return focus to the input.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
    inputRef.current?.focus({ preventScroll: true });
  }, [entries]);

  // Signal a successful mount: CSS then hides the static fallback and reveals
  // the interactive terminal. If hydration fails this never runs, so the
  // readable server-rendered content stays on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");
    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Clicking empty space in the body focuses the prompt — but never when the
  // user is selecting text or clicked a real control or link.
  const focusOnBlankClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label")) return;
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-window shadow-[0_24px_60px_-12px_var(--shadow)]">
      <TitleBar onHelp={() => setHelpOpen(true)} />
      <NavBar onRun={runLine} />

      <div
        className="max-h-[min(78vh,720px)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <Greeting />
        <SuggestionChips onRun={runLine} />
        <OutputLog entries={entries} />
        <CommandInput ref={inputRef} onSubmit={runLine} history={history} />
        <p id="input-hint" className="sr-only">
          Press Enter to run a command. Tab completes it. Up and Down arrows recall previous
          commands.
        </p>
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} onRun={runLine} />
    </div>
  );
}
