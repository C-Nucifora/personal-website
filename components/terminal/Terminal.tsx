"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { TitleBar } from "./TitleBar";
import { bootEntries } from "./boot";
import { OutputLog } from "./OutputLog";
import { CommandInput } from "./CommandInput";
import { StatusBar } from "./StatusBar";
import { SectionNav } from "./SectionNav";
import { commandForHash } from "./sections";
import { loadHistory, saveHistory, HISTORY_MAX } from "./historyStore";
import { useTerminalKeys } from "./useTerminalKeys";
import type { LogEntry } from "./types";
import { HelpPanel } from "@/components/ui/HelpPanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { runCommandLine, type SessionActions } from "@/lib/commands";

export function Terminal() {
  // One continuous scrollback. Every command — content or toy — appends here;
  // `clear` empties it. There are no windows or sections.
  const [entries, setEntries] = useState<LogEntry[]>([]);
  // Lazy-load persisted history (recall only; not rendered, so no SSR mismatch).
  const [history, setHistory] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [helpOpen, setHelpOpen] = useState(false);

  const { themeId, setTheme } = useTheme();

  const idRef = useRef(0);
  const historyRef = useRef<string[]>(history);
  const themeIdRef = useRef(themeId);
  const runLineRef = useRef<(line: string) => void>(() => {});
  const runDepth = useRef(0);
  // The entry whose top should scroll into view after the next render.
  const pendingScrollId = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);

  useTerminalKeys({ onClear: () => runLineRef.current("clear") });

  const runLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      runDepth.current += 1;
      const isTop = runDepth.current === 1;
      let cleared = false;
      let childRan = false;

      const actions: SessionActions = {
        clear: () => {
          cleared = true;
        },
        run: (input) => {
          childRan = true;
          runLineRef.current(input);
        },
        history: historyRef.current,
        getThemeId: () => themeIdRef.current,
        setTheme,
        openHelpPanel: () => setHelpOpen(true),
        cwd: "~",
      };

      const { node } = runCommandLine(trimmed, actions);

      // Record top-level typed lines (skip a consecutive duplicate) and persist.
      if (isTop && historyRef.current[historyRef.current.length - 1] !== trimmed) {
        historyRef.current = [...historyRef.current, trimmed].slice(-HISTORY_MAX);
        setHistory(historyRef.current);
        saveHistory(historyRef.current);
      }

      // If the command navigated via ctx.run (e.g. `cd projects`), the nested
      // call already appended its result — don't also append this wrapper line.
      if (!childRan) {
        if (cleared) {
          setEntries([]);
          pendingScrollId.current = null;
        } else {
          const entry: LogEntry = { id: idRef.current++, command: trimmed, output: node };
          pendingScrollId.current = entry.id;
          setEntries((es) => [...es, entry]);
        }
      }

      runDepth.current -= 1;
    },
    [setTheme],
  );

  useEffect(() => {
    runLineRef.current = runLine;
  }, [runLine]);

  // After each change: scroll the newest command line to the top of the
  // viewport so its output reads from the start, then refocus the prompt.
  useEffect(() => {
    const id = pendingScrollId.current;
    if (id != null && bodyRef.current) {
      const el = bodyRef.current.querySelector<HTMLElement>(`[data-entry-id="${id}"]`);
      el?.scrollIntoView({ block: "start" });
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [entries]);

  // Seed the boot sequence once per page load, reveal the interactive terminal,
  // and honour a deep link. If hydration fails this never runs, so the readable
  // server-rendered content stays on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");

    const seed = bootEntries(themeIdRef.current, (cmd) => runLineRef.current(cmd)).map((e) => ({
      id: idRef.current++,
      command: e.command,
      output: e.output,
    }));
    setEntries(seed);
    pendingScrollId.current = seed[0]?.id ?? null; // boot reads from the top

    const cmd = commandForHash(window.location.hash);
    if (cmd) runLineRef.current(cmd);

    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Clicking empty space focuses the prompt — but never while selecting text or
  // when a real control/link was clicked.
  const focusOnBlankClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label")) return;
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-window">
      <TitleBar onHelp={() => setHelpOpen(true)} />

      <div
        ref={bodyRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <OutputLog entries={entries} />
        <CommandInput ref={inputRef} onSubmit={runLine} history={history} />
        <p id="input-hint" className="sr-only">
          Press Enter to run a command. Tab completes it. Up and Down arrows recall previous
          commands.
        </p>
      </div>

      <SectionNav onRun={runLine} />
      <StatusBar themeId={themeId} />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} onRun={runLine} />
    </div>
  );
}
