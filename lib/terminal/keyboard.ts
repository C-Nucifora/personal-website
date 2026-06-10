/**
 * One global keyboard listener, capture phase (FLOW.md §6.4, §12.5).
 * Priority: pending confirm → Ctrl+b prefix → prefix table → mode dispatch.
 * Never touches Ctrl+t/w/n, Cmd+anything, or F-keys.
 *
 * INSERT-mode line editing stays on the prompt <input>; NORMAL/COPY arrive
 * with the vim grammar phase and slot in below the prefix handling here.
 */
import { WINDOW_IDS, type WindowId } from "@/lib/vfs/types";
import { handleKey } from "@/lib/vim/machine";
import { activePane, activeWindowKey } from "./reducer";
import { executeCommand, ensureWindowDisplayed } from "./executor";
import { finishAnimation } from "./animate";
import { getScroller, LINE_PX } from "./scroll-registry";
import { store } from "./store";
import type { WindowKey } from "./types";

function switchWindow(target: WindowId | null): void {
  store.dispatch({ type: "switch-window", window: target });
  ensureWindowDisplayed();
}

function cycleWindow(delta: 1 | -1): void {
  const current = store.getState().activeWindow;
  const idx = current ? WINDOW_IDS.indexOf(current) : delta === 1 ? -1 : 1;
  const next = (idx + delta + WINDOW_IDS.length) % WINDOW_IDS.length;
  switchWindow(WINDOW_IDS[next]);
}

function handlePrefixKey(key: string): void {
  store.dispatch({ type: "set-pending-prefix", pending: false });
  if (key === "n") return cycleWindow(1);
  if (key === "p") return cycleWindow(-1);
  if (key === "[") {
    store.dispatch({ type: "set-mode", windowKey: activeWindowKey(store.getState()), mode: "COPY" });
    return;
  }
  const digit = Number(key);
  if (digit >= 1 && digit <= WINDOW_IDS.length) {
    return switchWindow(WINDOW_IDS[digit - 1]);
  }
  // Any unbound key cancels the prefix silently (§6.4).
}

// ---- COPY mode (FLOW §6.3): keyboard scrollback navigation. ---------------

let copyCount = ""; // {count}G
let copyPendingG = false; // gg

function exitCopy(windowKey: WindowKey): void {
  copyCount = "";
  copyPendingG = false;
  store.dispatch({ type: "set-mode", windowKey, mode: "INSERT" });
  const el = getScroller(windowKey);
  if (el) el.scrollTop = el.scrollHeight; // re-pin to bottom (§6.3)
}

function handleCopyKey(e: KeyboardEvent, windowKey: WindowKey): void {
  const el = getScroller(windowKey);
  const scrollBy = (px: number) => {
    if (!el) return;
    el.scrollTop = Math.max(0, Math.min(el.scrollHeight, el.scrollTop + px));
  };
  const page = el ? el.clientHeight : 0;

  if (e.ctrlKey) {
    e.preventDefault();
    if (e.key === "d") return scrollBy(page / 2);
    if (e.key === "u") return scrollBy(-page / 2);
    if (e.key === "f") return scrollBy(page);
    if (e.key === "b") return scrollBy(-page);
    return;
  }

  e.preventDefault();
  const key = e.key;

  if (copyPendingG) {
    copyPendingG = false;
    if (key === "g" && el) el.scrollTop = 0; // gg
    return;
  }
  if (/^[0-9]$/.test(key)) {
    copyCount += key;
    return;
  }
  switch (key) {
    case "j":
      return scrollBy(LINE_PX);
    case "k":
      return scrollBy(-LINE_PX);
    case "g":
      copyPendingG = true;
      return;
    case "G":
      if (el) {
        el.scrollTop = copyCount ? (parseInt(copyCount, 10) - 1) * LINE_PX : el.scrollHeight;
      }
      copyCount = "";
      return;
    case "q":
    case "Escape":
    case "Enter":
      return exitCopy(windowKey);
    default:
      copyCount = "";
  }
}

// ---- NORMAL mode (FLOW §6.2): feed the vim machine. -----------------------

function handleNormalKey(e: KeyboardEvent, windowKey: WindowKey): void {
  // Modifier combos other than plain Ctrl+r are not vim's business.
  if (e.altKey || (e.ctrlKey && e.key !== "r")) return;
  if (e.key.length !== 1 && !["Escape", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)) {
    return; // Shift, Tab, Home… leave defaults alone
  }
  e.preventDefault();

  const pane = activePane(store.getState());
  const result = handleKey(
    { text: pane.inputBuffer, pos: pane.cursorPos },
    pane.vim,
    { key: e.key, ctrl: e.ctrlKey },
  );

  if (result.effect === "execute") {
    const line = result.buf.text;
    store.dispatch({
      type: "apply-vim",
      windowKey,
      text: "",
      pos: 0,
      vim: result.vim,
      toInsert: true,
    });
    executeCommand(line, { source: "typed" });
    return;
  }

  store.dispatch({
    type: "apply-vim",
    windowKey,
    text: result.buf.text,
    pos: result.buf.pos,
    vim: result.vim,
    toInsert: result.mode === "INSERT",
  });

  if (result.effect === "history-up") {
    store.dispatch({ type: "history-walk", windowKey, direction: -1 });
  } else if (result.effect === "history-down") {
    store.dispatch({ type: "history-walk", windowKey, direction: 1 });
  }
  if (result.flash) store.dispatch({ type: "flash-mode" });
}

export function initKeyboard(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    // Hands off the browser's keys (§6.4).
    if (e.metaKey) return;
    if (e.ctrlKey && ["t", "w", "n"].includes(e.key.toLowerCase())) return;
    if (/^F\d+$/.test(e.key)) return;

    const state = store.getState();

    // A keypress during a click animation completes it instantly (§5).
    if (state.animating) {
      e.preventDefault();
      finishAnimation();
      return;
    }

    // Pending status-bar confirm consumes y/n (FLOW §10.2).
    if (state.pendingConfirm && !e.ctrlKey && !e.altKey) {
      if (e.key === "y" || e.key === "Y") {
        if (state.pendingConfirm.kind === "openUrl") {
          window.open(state.pendingConfirm.payload, "_blank", "noopener,noreferrer");
        }
        store.dispatch({ type: "set-confirm", confirm: null });
        e.preventDefault();
        return;
      }
      if (e.key === "n" || e.key === "N" || e.key === "Escape") {
        store.dispatch({ type: "set-confirm", confirm: null });
        e.preventDefault();
        return;
      }
      return;
    }

    // Ctrl+b: the tmux prefix, consumed in all modes and views (§6.4).
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      store.dispatch({ type: "set-pending-prefix", pending: true });
      return;
    }

    if (state.pendingPrefix) {
      e.preventDefault();
      if (e.key === "Escape") {
        store.dispatch({ type: "set-pending-prefix", pending: false });
        return;
      }
      handlePrefixKey(e.key);
      return;
    }

    // Mode dispatch for the active pane (§6.4 priority order).
    const windowKey = activeWindowKey(state);
    const pane = activePane(state);
    if (pane.view === "shell") {
      if (pane.mode === "COPY") {
        handleCopyKey(e, windowKey);
        return;
      }
      if (pane.mode === "NORMAL") {
        handleNormalKey(e, windowKey);
        return;
      }
    }

    // Ctrl+l clears the active pane (INSERT affordance, §6.1).
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      store.dispatch({ type: "clear-scrollback", windowKey: activeWindowKey(state) });
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
