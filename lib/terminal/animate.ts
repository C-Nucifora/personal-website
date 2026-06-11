/**
 * Click-to-command animation (FLOW.md §5) — the teaching mechanism. Every
 * click with a command equivalent types that command into the active pane's
 * prompt, beats, then executes. Module load replaces the executor's direct
 * runClick with this version.
 */
import { activeWindowKey, getPane } from "./reducer";
import { executeCommand } from "./executor";
import { setRunClickImpl } from "./run-click";
import { store } from "./store";
import type { WindowKey } from "./types";

const CHAR_MS = 15;
const MAX_TYPE_MS = 250;
const BEAT_MS = 60;

interface Animation {
  command: string;
  stash: string;
  windowKey: WindowKey;
  shown: number;
  timer: ReturnType<typeof setInterval> | null;
  beat: ReturnType<typeof setTimeout> | null;
}

let current: Animation | null = null;

function execute(anim: Animation): void {
  executeCommand(anim.command, { source: "click", windowKey: anim.windowKey });
  store.dispatch({
    type: "set-input",
    windowKey: anim.windowKey,
    text: anim.stash,
    cursorPos: anim.stash.length,
  });
  store.dispatch({ type: "set-animating", animating: null });
}

/** Complete a running animation instantly (skip rule — keypress or click). */
export function finishAnimation(): void {
  if (!current) return;
  const anim = current;
  current = null;
  if (anim.timer) clearInterval(anim.timer);
  if (anim.beat) clearTimeout(anim.beat);
  execute(anim);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function animateClick(cmd: string): void {
  // Never queue: a click during an animation completes it first (§5).
  finishAnimation();

  const windowKey = activeWindowKey(store.getState());
  const pane = getPane(store.getState(), windowKey);

  // Clicking in NORMAL or COPY returns to INSERT, then animates (§5).
  if (pane.mode !== "INSERT") {
    store.dispatch({ type: "set-mode", windowKey, mode: "INSERT" });
  }

  if (prefersReducedMotion()) {
    // The echo is the teaching tool; the animation is garnish.
    executeCommand(cmd, { source: "click", windowKey });
    return;
  }

  const anim: Animation = {
    command: cmd,
    stash: pane.inputBuffer,
    windowKey,
    shown: 0,
    timer: null,
    beat: null,
  };
  current = anim;
  store.dispatch({ type: "set-animating", animating: { command: cmd, stash: anim.stash } });

  const perChar = Math.min(CHAR_MS, MAX_TYPE_MS / cmd.length);
  anim.timer = setInterval(() => {
    anim.shown += 1;
    store.dispatch({
      type: "set-input",
      windowKey,
      text: cmd.slice(0, anim.shown),
      cursorPos: anim.shown,
    });
    if (anim.shown >= cmd.length) {
      if (anim.timer) clearInterval(anim.timer);
      anim.timer = null;
      anim.beat = setTimeout(() => {
        current = null;
        execute(anim);
      }, BEAT_MS);
    }
  }, perChar);
}

setRunClickImpl(animateClick);
