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
import { MAX_PANES, activePane, activeWindowKey } from "./reducer";
import { executeCommand, ensureWindowDisplayed } from "./executor";
import { finishAnimation } from "./animate";
import { getThemeEnv } from "./env";
import { printBindingCheatsheet } from "./cheatsheet";
import { getScroller, LINE_PX } from "./scroll-registry";
import { store } from "./store";
import type { Direction, WindowKey } from "./types";

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

function notify(text: string): void {
  store.dispatch({ type: "set-notice", text, until: Date.now() + 3000 });
}

function isDesktop(): boolean {
  return window.matchMedia?.("(min-width: 768px)").matches ?? true;
}

/** Refuse splits that would push a pane under ~20 cols / 6 rows (§7.3). */
const MIN_PANE_W = 170;
const MIN_PANE_H = 132;

function trySplit(dir: "row" | "col"): void {
  const state = store.getState();
  if (state.activeWindow !== "projects") {
    return notify("splits are available in the projects window");
  }
  if (!isDesktop()) {
    return notify("splits need a wider screen");
  }
  const w = state.windows.projects;
  if (w.panes.length >= MAX_PANES) {
    return notify(`pane limit reached (${MAX_PANES})`);
  }
  const el = getScroller(`projects:${w.activePane}`);
  if (el && el.clientWidth > 0) {
    if (dir === "row" && el.clientWidth / 2 < MIN_PANE_W) return notify("pane too narrow to split");
    if (dir === "col" && el.clientHeight / 2 < MIN_PANE_H) return notify("pane too short to split");
  }
  store.dispatch({ type: "split-pane", window: "projects", dir });
}

const DIRECTION_KEYS: Record<string, Direction> = {
  h: "left",
  j: "down",
  k: "up",
  l: "right",
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowRight: "right",
};

function handlePrefixKey(key: string): void {
  store.dispatch({ type: "set-pending-prefix", pending: false });
  const state = store.getState();
  const win = state.activeWindow;

  if (key === "n") return cycleWindow(1);
  if (key === "p") return cycleWindow(-1);
  if (key === "[") {
    store.dispatch({ type: "set-mode", windowKey: activeWindowKey(state), mode: "COPY" });
    return;
  }
  if (key === "w") {
    const index = win ? WINDOW_IDS.indexOf(win) : 0;
    store.dispatch({ type: "set-picker", picker: { index: Math.max(0, index) } });
    return;
  }
  if (key === "?") return printBindingCheatsheet();
  if (key === "%") return trySplit("row");
  if (key === '"') return trySplit("col");
  if (key === "t") {
    store.dispatch({ type: "set-overlay", overlay: "clock" });
    return;
  }

  if (win) {
    const w = state.windows[win];
    if (key === "o") {
      store.dispatch({ type: "cycle-pane", window: win });
      return;
    }
    if (key in DIRECTION_KEYS) {
      store.dispatch({ type: "focus-direction", window: win, dir: DIRECTION_KEYS[key] });
      return;
    }
    if (key === "z") {
      store.dispatch({ type: "zoom-pane", window: win });
      return;
    }
    if (key === "x") {
      if (w.panes.length <= 1) return notify("can't close the only pane");
      store.dispatch({
        type: "set-confirm",
        confirm: { kind: "closePane", payload: w.activePane },
      });
      return;
    }
  }

  const digit = Number(key);
  if (digit >= 1 && digit <= WINDOW_IDS.length) {
    return switchWindow(WINDOW_IDS[digit - 1]);
  }
  // Any unbound key cancels the prefix silently (§6.4).
}

/** Keys while the Ctrl+b w picker is open. */
function handlePickerKey(e: KeyboardEvent): void {
  const picker = store.getState().picker!;
  e.preventDefault();
  if (e.key === "j" || e.key === "ArrowDown") {
    store.dispatch({
      type: "set-picker",
      picker: { index: Math.min(WINDOW_IDS.length - 1, picker.index + 1) },
    });
    return;
  }
  if (e.key === "k" || e.key === "ArrowUp") {
    store.dispatch({ type: "set-picker", picker: { index: Math.max(0, picker.index - 1) } });
    return;
  }
  if (e.key === "Enter") {
    store.dispatch({ type: "set-picker", picker: null });
    switchWindow(WINDOW_IDS[picker.index]);
    return;
  }
  const digit = Number(e.key);
  if (digit >= 1 && digit <= WINDOW_IDS.length) {
    store.dispatch({ type: "set-picker", picker: null });
    switchWindow(WINDOW_IDS[digit - 1]);
    return;
  }
  if (e.key === "Escape" || e.key === "q" || e.key === "w") {
    store.dispatch({ type: "set-picker", picker: null });
  }
}

// ---- COPY mode (FLOW §6.3): keyboard scrollback navigation. ---------------

let copyCount = ""; // {count}G
let copyPendingG = false; // gg

function activeScroller(windowKey: WindowKey): HTMLElement | undefined {
  return getScroller(`${windowKey}:${activePane(store.getState()).id}`);
}

function exitCopy(windowKey: WindowKey): void {
  copyCount = "";
  copyPendingG = false;
  store.dispatch({ type: "set-mode", windowKey, mode: "INSERT" });
  const el = activeScroller(windowKey);
  if (el) el.scrollTop = el.scrollHeight; // re-pin to bottom (§6.3)
}

function handleCopyKey(e: KeyboardEvent, windowKey: WindowKey): void {
  const el = activeScroller(windowKey);
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

// Konami code (EASTER_EGGS §3): passive observation, desktop only.
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
export const CRT_UNLOCK_KEY = "portfolio:crt-unlocked";
let konamiProgress = 0;

function watchKonami(key: string): void {
  konamiProgress = key === KONAMI[konamiProgress] ? konamiProgress + 1 : key === KONAMI[0] ? 1 : 0;
  if (konamiProgress < KONAMI.length) return;
  konamiProgress = 0;
  store.dispatch({ type: "unlock-crt" });
  try {
    localStorage.setItem(CRT_UNLOCK_KEY, "1");
  } catch {
    /* private mode — the unlock still applies this session */
  }
  notify("theme unlocked: crt");
  getThemeEnv().setTheme("crt");
}

export function initKeyboard(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    // Hands off the browser's keys (§6.4).
    if (e.metaKey) return;
    if (e.ctrlKey && ["t", "w", "n"].includes(e.key.toLowerCase())) return;
    if (/^F\d+$/.test(e.key)) return;

    // Plain view showing: the terminal is hidden, keys belong to the page.
    if (document.documentElement.getAttribute("data-view") === "plain") return;

    if (!e.ctrlKey && !e.altKey) watchKonami(e.key);

    const state = store.getState();

    // Any input dismisses a full-pane overlay (clock, sl, …).
    if (state.overlay) {
      e.preventDefault();
      e.stopPropagation();
      store.dispatch({ type: "set-overlay", overlay: null });
      return;
    }

    // A keypress during a click animation completes it instantly (§5).
    if (state.animating) {
      e.preventDefault();
      finishAnimation();
      return;
    }

    // Window picker swallows navigation keys while open.
    if (state.picker) {
      handlePickerKey(e);
      return;
    }

    // Pending status-bar confirm consumes y/n (FLOW §10.2).
    if (state.pendingConfirm && !e.ctrlKey && !e.altKey) {
      if (e.key === "y" || e.key === "Y") {
        if (state.pendingConfirm.kind === "openUrl") {
          window.open(state.pendingConfirm.payload, "_blank", "noopener,noreferrer");
        } else if (state.pendingConfirm.kind === "closePane" && state.activeWindow) {
          store.dispatch({
            type: "close-pane",
            window: state.activeWindow,
            paneId: state.pendingConfirm.payload,
          });
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

    // Ctrl+b: the tmux prefix, consumed in all modes and views — including
    // inside the editor; stopPropagation keeps it from CodeMirror (§6.4).
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      e.stopPropagation();
      store.dispatch({ type: "set-pending-prefix", pending: true });
      return;
    }

    if (state.pendingPrefix) {
      e.preventDefault();
      e.stopPropagation();
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
    if (pane.view === "editor") {
      // CodeMirror's vim owns everything else while a file is open.
      return;
    }
    if (pane.mode === "COPY") {
      handleCopyKey(e, windowKey);
      return;
    }
    if (pane.mode === "NORMAL") {
      handleNormalKey(e, windowKey);
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
