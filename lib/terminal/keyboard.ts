/**
 * One global keyboard listener, capture phase (FLOW.md §6.4, §12.5).
 * Priority: pending confirm → Ctrl+b prefix → prefix table → mode dispatch.
 * Never touches Ctrl+t/w/n, Cmd+anything, or F-keys.
 *
 * INSERT-mode line editing stays on the prompt <input>; NORMAL/COPY arrive
 * with the vim grammar phase and slot in below the prefix handling here.
 */
import { WINDOW_IDS, type WindowId } from "@/lib/vfs/types";
import { activeWindowKey } from "./reducer";
import { ensureWindowDisplayed } from "./executor";
import { finishAnimation } from "./animate";
import { store } from "./store";

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
  const digit = Number(key);
  if (digit >= 1 && digit <= WINDOW_IDS.length) {
    return switchWindow(WINDOW_IDS[digit - 1]);
  }
  // Any unbound key cancels the prefix silently (§6.4).
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
