"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type VimMode = "insert" | "normal";

interface Options {
  inputRef: RefObject<HTMLInputElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  onClear: () => void;
  onHelp: () => void;
  onCycleTheme: () => void;
  onPalette: () => void;
  /** prefix 0-9: jump to a window by number. */
  onSelectWindow: (id: number) => void;
  /** prefix n / prefix p: next / previous window. */
  onNextWindow: () => void;
  onPrevWindow: () => void;
  /** prefix s / prefix w: open the window switcher overlay. */
  onWindowSwitcher: () => void;
}

/**
 * vim + tmux style keyboard navigation.
 *
 * Modes mirror vim: typing in the prompt is INSERT; pressing Escape blurs it
 * into NORMAL, where the output scrolls with vim motions:
 *   j / k        scroll down / up
 *   Ctrl-d / -u  half page down / up
 *   g g / G      jump to top / bottom
 *   i a : /      back to INSERT (focus the prompt)
 *
 * tmux lives behind a Ctrl-b prefix; the next key is an action:
 *   prefix c     clear the screen   (new window)
 *   prefix ?     open the guide
 *   prefix t     cycle the theme
 *   prefix [     enter scroll (NORMAL) mode
 *   prefix 0-9   jump to window N
 *   prefix n / p next / previous window
 *   prefix s / w open the window switcher
 *
 * vim motions only fire when nothing else holds focus, so buttons, the theme
 * select, and the help dialog keep their normal keyboard behaviour.
 */
export function useTerminalKeys({
  inputRef,
  bodyRef,
  onClear,
  onHelp,
  onCycleTheme,
  onPalette,
  onSelectWindow,
  onNextWindow,
  onPrevWindow,
  onWindowSwitcher,
}: Options) {
  const [mode, setMode] = useState<VimMode>("insert");
  const [prefix, setPrefix] = useState(false);

  const modeRef = useRef(mode);
  const prefixRef = useRef(prefix);
  const lastG = useRef(0);
  const prefixTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror the latest mode/prefix into refs so the (once-registered) keydown
  // listener can read current values without re-subscribing.
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    prefixRef.current = prefix;
  }, [prefix]);

  // Mode follows the prompt's focus.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onFocus = () => setMode("insert");
    const onBlur = () => setMode("normal");
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    setMode(document.activeElement === input ? "insert" : "normal");
    return () => {
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
    };
  }, [inputRef]);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    const blurInput = () => inputRef.current?.blur();
    const scrollBy = (top: number) => bodyRef.current?.scrollBy({ top, behavior: "auto" });
    const clearPrefix = () => {
      setPrefix(false);
      if (prefixTimer.current) clearTimeout(prefixTimer.current);
    };

    const onKey = (e: KeyboardEvent) => {
      // 0) ⌘K / Ctrl-K opens the command palette from anywhere.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onPalette();
        return;
      }

      // 1) A tmux prefix is pending: consume the next key as an action.
      if (prefixRef.current) {
        e.preventDefault();
        clearPrefix();
        if (/^[0-9]$/.test(e.key)) {
          onSelectWindow(Number(e.key));
          return;
        }
        switch (e.key) {
          case "c":
            onClear();
            break;
          case "?":
            onHelp();
            break;
          case "t":
            onCycleTheme();
            break;
          case "[":
            blurInput();
            break;
          case "n":
            onNextWindow();
            break;
          case "p":
            onPrevWindow();
            break;
          case "s":
          case "w":
            onWindowSwitcher();
            break;
        }
        return;
      }

      // 2) The tmux prefix key itself.
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setPrefix(true);
        if (prefixTimer.current) clearTimeout(prefixTimer.current);
        prefixTimer.current = setTimeout(() => setPrefix(false), 2000);
        return;
      }

      // 3) Escape always drops to NORMAL mode.
      if (e.key === "Escape") {
        blurInput();
        return;
      }

      // 4) While typing, leave the prompt alone.
      if (modeRef.current === "insert") return;

      // 5) NORMAL mode — only when nothing else holds focus.
      const ae = document.activeElement;
      if (ae && ae !== document.body && ae !== bodyRef.current) return;

      const half = (bodyRef.current?.clientHeight ?? 400) / 2;
      switch (e.key) {
        case "j":
          e.preventDefault();
          scrollBy(64);
          break;
        case "k":
          e.preventDefault();
          scrollBy(-64);
          break;
        case "d":
          if (e.ctrlKey) {
            e.preventDefault();
            scrollBy(half);
          }
          break;
        case "u":
          if (e.ctrlKey) {
            e.preventDefault();
            scrollBy(-half);
          }
          break;
        case "G":
          e.preventDefault();
          bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
          break;
        case "g": {
          const now = Date.now();
          if (now - lastG.current < 400) {
            e.preventDefault();
            bodyRef.current?.scrollTo({ top: 0 });
            lastG.current = 0;
          } else {
            lastG.current = now;
          }
          break;
        }
        case "i":
        case "a":
        case ":":
        case "/":
          e.preventDefault();
          focusInput();
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prefixTimer.current) clearTimeout(prefixTimer.current);
    };
  }, [
    inputRef,
    bodyRef,
    onClear,
    onHelp,
    onCycleTheme,
    onPalette,
    onSelectWindow,
    onNextWindow,
    onPrevWindow,
    onWindowSwitcher,
  ]);

  return { mode, prefix };
}
