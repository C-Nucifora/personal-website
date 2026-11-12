/**
 * Click-to-command animation (FLOW.md §5) — the teaching mechanism. Every
 * click with a command equivalent types that command into the active pane's
 * prompt, beats, then executes. Module load replaces the executor's direct
 * runClick with this version.
 */
import { activeWindowKey, getPane } from "./reducer";
import { executeCommand } from "./executor";
import { setRunClickImpl } from "./run-click";
import { focusActivePrompt } from "./focus";
import { store } from "./store";
import type { WindowKey } from "./types";

const CHAR_MS = 15;
const MAX_TYPE_MS = 250;
const BEAT_MS = 60;

interface Animation {
  command: string;
  stash: string;
  windowKey: WindowKey;
  paneId: string;
  session: number;
  navigationVersion: number;
  shown: number;
  timer: ReturnType<typeof setInterval> | null;
  beat: ReturnType<typeof setTimeout> | null;
}

let current: Animation | null = null;

function restoreDraft(anim: Animation): void {
  if (store.getSession() !== anim.session) return;
  store.dispatch({
    type: "set-input",
    windowKey: anim.windowKey,
    paneId: anim.paneId,
    text: anim.stash,
    cursorPos: anim.stash.length,
  });
  store.dispatch({ type: "set-animating", animating: null });
}

function stopAnimation(): Animation | null {
  const anim = current;
  if (!anim) return null;
  current = null;
  if (anim.timer) clearInterval(anim.timer);
  if (anim.beat) clearTimeout(anim.beat);
  return anim;
}

function isCurrent(anim: Animation): boolean {
  const state = store.getState();
  return store.getSession() === anim.session &&
    state.navigationVersion === anim.navigationVersion &&
    getPane(state, anim.windowKey).id === anim.paneId;
}

/** History navigation cancels pending work and preserves the origin draft. */
export function cancelAnimation(): void {
  const anim = stopAnimation();
  if (anim) restoreDraft(anim);
}

/** Complete a running animation instantly (skip rule — keypress or click). */
export function finishAnimation(): void {
  const anim = stopAnimation();
  if (!anim) return;
  const valid = isCurrent(anim);
  if (valid) executeCommand(anim.command, { source: "click", windowKey: anim.windowKey });
  restoreDraft(anim);
  if (valid) focusActivePrompt();
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function animateClick(cmd: string): void {
  // Never queue: a click during an animation completes it first (§5).
  finishAnimation();
  store.dispatch({ type: "set-pending-prefix", pending: false });

  const state = store.getState();
  const windowKey = activeWindowKey(state);
  const pane = getPane(state, windowKey);

  // Clicking in NORMAL or COPY returns to INSERT, then animates (§5).
  if (pane.mode !== "INSERT") {
    store.dispatch({ type: "set-mode", windowKey, mode: "INSERT" });
  }

  if (prefersReducedMotion()) {
    // The echo is the teaching tool; the animation is garnish.
    executeCommand(cmd, { source: "click", windowKey });
    focusActivePrompt();
    return;
  }

  const anim: Animation = {
    command: cmd,
    stash: pane.inputBuffer,
    windowKey,
    paneId: pane.id,
    session: store.getSession(),
    navigationVersion: state.navigationVersion,
    shown: 0,
    timer: null,
    beat: null,
  };
  current = anim;
  store.dispatch({ type: "set-animating", animating: { command: cmd, stash: anim.stash } });

  const perChar = Math.min(CHAR_MS, MAX_TYPE_MS / cmd.length);
  anim.timer = setInterval(() => {
    if (current !== anim) return;
    if (!isCurrent(anim)) {
      cancelAnimation();
      return;
    }
    anim.shown += 1;
    store.dispatch({
      type: "set-input",
      windowKey,
      paneId: anim.paneId,
      text: cmd.slice(0, anim.shown),
      cursorPos: anim.shown,
    });
    if (anim.shown >= cmd.length) {
      if (anim.timer) clearInterval(anim.timer);
      anim.timer = null;
      anim.beat = setTimeout(() => {
        if (current === anim) finishAnimation();
      }, BEAT_MS);
    }
  }, perChar);
}

setRunClickImpl(animateClick);
