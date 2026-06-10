"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { TitleBar } from "./TitleBar";
import { bootEntries } from "./boot";
import { OutputLog } from "./OutputLog";
import { CommandInput } from "./CommandInput";
import { StatusBar } from "./StatusBar";
import { WindowSwitcher } from "./WindowSwitcher";
import { MobileBar } from "./MobileBar";
import { WINDOWS, windowForCommand, windowForLabel, pathForWindow } from "./windows";
import { loadHistory, saveHistory, HISTORY_MAX } from "./historyStore";
import { useTerminalKeys } from "./useTerminalKeys";
import type { LogEntry } from "./types";
import { HelpPanel } from "@/components/ui/HelpPanel";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useTheme } from "@/components/theme/ThemeProvider";
import { themes } from "@/lib/themes";
import { runCommandLine, type SessionActions } from "@/lib/commands";

export function Terminal() {
  // The shell (window 0) keeps a persistent scrollback until `clear`. Sections
  // (windows 1+) are ephemeral: one view at a time, never added to the shell.
  const [shellEntries, setShellEntries] = useState<LogEntry[]>([]);
  const [sectionEntry, setSectionEntry] = useState<LogEntry | null>(null);
  // Lazy-load persisted history (recall only; it isn't rendered, so no SSR mismatch).
  const [history, setHistory] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState(0);

  const { themeId, setTheme } = useTheme();

  // Refs hold the latest mutable values for callbacks captured inside output.
  const idRef = useRef(0);
  const historyRef = useRef<string[]>(history);
  const themeIdRef = useRef(themeId);
  const activeWindowRef = useRef(activeWindow);
  const runLineRef = useRef<(line: string) => void>(() => {});
  const selectWindowRef = useRef<(id: number) => void>(() => {});
  const stepWindowRef = useRef<(delta: number) => void>(() => {});
  const runDepth = useRef(0);
  const scrollDir = useRef<"top" | "bottom">("bottom");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Cycle to the next theme in the registry (used by the tmux `prefix t`).
  const cycleTheme = useCallback(() => {
    const ids = themes.map((t) => t.id);
    const next = ids[(ids.indexOf(themeIdRef.current) + 1) % ids.length];
    setTheme(next);
  }, [setTheme]);

  // Reflect the active window in the URL hash so sections are deep-linkable and
  // the browser back/forward buttons move between them. Setting a section hash
  // pushes a history entry; returning to the shell clears it quietly.
  const updateHash = useCallback((id: number) => {
    if (typeof window === "undefined") return;
    const w = WINDOWS.find((x) => x.id === id) ?? WINDOWS[0];
    if (w.id === 0) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } else if (window.location.hash !== `#${w.label}`) {
      window.location.hash = w.label;
    }
  }, []);

  const goHome = useCallback(() => selectWindowRef.current(0), []);

  // vim/tmux keyboard layer (modes, motions, and the Ctrl-b prefix).
  const { mode, prefix } = useTerminalKeys({
    inputRef,
    bodyRef,
    onClear: () => runLineRef.current("clear"),
    onHelp: () => setHelpOpen(true),
    onCycleTheme: cycleTheme,
    onPalette: () => setPaletteOpen(true),
    onSelectWindow: (id) => selectWindowRef.current(id),
    onNextWindow: () => stepWindowRef.current(1),
    onPrevWindow: () => stepWindowRef.current(-1),
    onWindowSwitcher: () => setSwitcherOpen(true),
    onHome: () => goHome(),
    getActiveWindow: () => activeWindowRef.current,
  });

  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);

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
        cwd: pathForWindow(activeWindowRef.current),
      };

      const { node, resolved } = runCommandLine(trimmed, actions);

      // Record top-level typed lines (skip a consecutive duplicate) and persist.
      if (isTop && historyRef.current[historyRef.current.length - 1] !== trimmed) {
        historyRef.current = [...historyRef.current, trimmed].slice(-HISTORY_MAX);
        setHistory(historyRef.current);
        saveHistory(historyRef.current);
      }

      // If the command navigated via ctx.run (cd, ls <section>, history click),
      // the nested call already rendered the result — don't double-handle here.
      if (!childRan) {
        const target = windowForCommand(resolved);
        const entry: LogEntry = { id: idRef.current++, command: trimmed, output: node };
        activeWindowRef.current = target;
        setActiveWindow(target);
        updateHash(target);

        if (target >= 1) {
          // A section: show it on its own, ephemerally. The shell buffer is left
          // untouched, ready to resume when you return.
          setSectionEntry(entry);
          scrollDir.current = "top";
        } else {
          // A shell command: return to the shell view and either clear it
          // (`clear`) or append to its persistent scrollback.
          setSectionEntry(null);
          if (cleared) {
            setShellEntries([]);
          } else {
            setShellEntries((es) => [...es, entry]);
          }
          scrollDir.current = "bottom";
        }
      }

      runDepth.current -= 1;
    },
    [setTheme, updateHash],
  );

  useEffect(() => {
    runLineRef.current = runLine;
  }, [runLine]);

  useEffect(() => {
    activeWindowRef.current = activeWindow;
  }, [activeWindow]);

  // Switch windows. Section windows run their command (ephemeral view); the
  // shell restores its persistent scrollback — it is never cleared by navigation.
  const selectWindow = useCallback(
    (id: number) => {
      const w = WINDOWS.find((x) => x.id === id);
      if (!w) return;
      if (w.command) {
        runLineRef.current(w.command);
      } else {
        activeWindowRef.current = 0;
        setActiveWindow(0);
        updateHash(0);
        setSectionEntry(null);
        scrollDir.current = "bottom";
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [updateHash],
  );

  const stepWindow = useCallback(
    (delta: number) => {
      const i = WINDOWS.findIndex((w) => w.id === activeWindowRef.current);
      const next = WINDOWS[(i + delta + WINDOWS.length) % WINDOWS.length];
      selectWindow(next.id);
    },
    [selectWindow],
  );

  useEffect(() => {
    selectWindowRef.current = selectWindow;
    stepWindowRef.current = stepWindow;
  }, [selectWindow, stepWindow]);

  // Scroll to the welcome on navigation, or to the newest output in the shell.
  useEffect(() => {
    if (scrollDir.current === "top") {
      bodyRef.current?.scrollTo({ top: 0 });
    } else {
      bottomRef.current?.scrollIntoView({ block: "nearest" });
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [shellEntries, sectionEntry, activeWindow]);

  // Back/forward between deep-linked sections.
  useEffect(() => {
    const onHash = () => {
      const w = windowForLabel(window.location.hash);
      const targetId = w ? w.id : 0;
      if (targetId === activeWindowRef.current) return;
      selectWindowRef.current(targetId);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Seed the shell with the boot sequence (once per page load), reveal the
  // interactive terminal, and honour a deep link. If hydration fails this never
  // runs, so the readable server-rendered content stays on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");

    const seed = bootEntries(themeIdRef.current, (cmd) => runLineRef.current(cmd)).map((e) => ({
      id: idRef.current++,
      command: e.command,
      output: e.output,
    }));
    // one-time client-only seed; cannot run during SSR (localStorage) without
    // a hydration mismatch, and is not a cascading update.
    setShellEntries(seed);

    const w = windowForLabel(window.location.hash);
    if (w && w.command) {
      runLineRef.current(w.command);
    }

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

  // The shell shows its scrollback; a section shows only its own output.
  const displayed = activeWindow === 0 ? shellEntries : sectionEntry ? [sectionEntry] : [];

  return (
    <div className="flex h-dvh flex-col bg-window">
      <TitleBar onHelp={() => setHelpOpen(true)} />

      <div
        ref={bodyRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <OutputLog entries={displayed} />
        <CommandInput
          ref={inputRef}
          onSubmit={runLine}
          history={history}
          path={pathForWindow(activeWindow)}
        />
        <p id="input-hint" className="sr-only">
          Press Enter to run a command. Tab completes it. Up and Down arrows recall previous
          commands.
        </p>
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <MobileBar
        onRun={runLine}
        onClear={() => runLine("clear")}
        onPalette={() => setPaletteOpen(true)}
        onCycleTheme={cycleTheme}
      />

      <StatusBar
        mode={mode}
        prefix={prefix}
        active={activeWindow}
        onSelect={selectWindow}
      />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} onRun={runLine} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onRun={runLine} />
      <WindowSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onSelect={selectWindow}
        windows={WINDOWS}
        active={activeWindow}
      />
    </div>
  );
}
