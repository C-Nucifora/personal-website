/**
 * All state transitions, pure (FLOW.md §12). The store calls reduce(); tests
 * call it directly.
 */
import { normalizePath, windowForPath } from "@/lib/vfs/path";
import { WINDOW_IDS } from "@/lib/vfs/types";
import { initialVimState } from "@/lib/vim/machine";
import type { Action, AppState, PaneState, WindowId, WindowKey, WindowState } from "./types";

export const HISTORY_SEED = ["vim resume.md"];

function freshPane(cwd: string): PaneState {
  return {
    cwd,
    prevCwd: cwd,
    inputBuffer: "",
    cursorPos: 0,
    historyIndex: null,
    draft: "",
    scrollback: [],
    scrollOffset: 0,
    mode: "INSERT",
    vim: initialVimState(),
    view: "shell",
    editorPath: null,
  };
}

function freshWindow(cwd: string): WindowState {
  return { visited: false, panes: [freshPane(cwd)], activePane: 0 };
}

export function initialState(initialWindow: WindowId | null): AppState {
  const windows = Object.fromEntries(
    WINDOW_IDS.map((id) => [id, freshWindow(`~/${id}`)]),
  ) as Record<WindowId, WindowState>;
  return {
    activeWindow: initialWindow,
    windows,
    lobby: freshWindow("~"),
    pendingPrefix: false,
    animating: null,
    notice: null,
    pendingConfirm: null,
    history: [...HISTORY_SEED],
    nextLineId: 1,
    flashNonce: 0,
  };
}

export function getWindow(state: AppState, key: WindowKey): WindowState {
  return key === "lobby" ? state.lobby : state.windows[key];
}

export function getPane(state: AppState, key: WindowKey): PaneState {
  const w = getWindow(state, key);
  return w.panes[w.activePane];
}

export function activeWindowKey(state: AppState): WindowKey {
  return state.activeWindow ?? "lobby";
}

export function activePane(state: AppState): PaneState {
  return getPane(state, activeWindowKey(state));
}

/** Immutably replace the active pane of one window. */
function withPane(
  state: AppState,
  key: WindowKey,
  update: (pane: PaneState) => PaneState,
): AppState {
  const w = getWindow(state, key);
  const panes = w.panes.map((p, i) => (i === w.activePane ? update(p) : p));
  const next: WindowState = { ...w, panes };
  return key === "lobby"
    ? { ...state, lobby: next }
    : { ...state, windows: { ...state.windows, [key]: next } };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "switch-window":
      return { ...state, activeWindow: action.window };

    case "mark-visited": {
      const w = state.windows[action.window];
      return {
        ...state,
        windows: { ...state.windows, [action.window]: { ...w, visited: true } },
      };
    }

    case "set-cwd": {
      const path = normalizePath(action.path);
      const target = windowForPath(path);
      const current = action.windowKey === "lobby" ? null : action.windowKey;
      // FLOW §2.1: paths under another window move you there; ~ and other
      // window-less paths update the shell you're in and stay.
      const destKey: WindowKey =
        target !== null && target !== current ? target : action.windowKey;
      const moved = withPane(state, destKey, (p) => ({
        ...p,
        prevCwd: p.cwd,
        cwd: path,
      }));
      return destKey !== action.windowKey
        ? { ...moved, activeWindow: target }
        : moved;
    }

    case "append-line":
      return {
        ...withPane(state, action.windowKey, (p) => ({
          ...p,
          scrollback: [
            ...p.scrollback,
            {
              id: state.nextLineId,
              command: action.command,
              cwd: action.cwd,
              node: action.node,
            },
          ],
        })),
        nextLineId: state.nextLineId + 1,
      };

    case "clear-scrollback":
      return withPane(state, action.windowKey, (p) => ({ ...p, scrollback: [] }));

    case "set-input":
      return withPane(state, action.windowKey, (p) => ({
        ...p,
        inputBuffer: action.text,
        cursorPos: action.cursorPos,
        historyIndex: null,
      }));

    case "history-append": {
      if (state.history[state.history.length - 1] === action.line) return state;
      return { ...state, history: [...state.history, action.line] };
    }

    case "history-walk":
      return withPane(state, action.windowKey, (p) => {
        const last = state.history.length - 1;
        if (action.direction === -1) {
          const idx = p.historyIndex === null ? last : Math.max(0, p.historyIndex - 1);
          if (state.history.length === 0) return p;
          return {
            ...p,
            draft: p.historyIndex === null ? p.inputBuffer : p.draft,
            historyIndex: idx,
            inputBuffer: state.history[idx],
            cursorPos: state.history[idx].length,
          };
        }
        if (p.historyIndex === null) return p;
        if (p.historyIndex >= last) {
          return { ...p, historyIndex: null, inputBuffer: p.draft, cursorPos: p.draft.length };
        }
        const idx = p.historyIndex + 1;
        return {
          ...p,
          historyIndex: idx,
          inputBuffer: state.history[idx],
          cursorPos: state.history[idx].length,
        };
      });

    case "set-mode":
      return withPane(state, action.windowKey, (p) => ({ ...p, mode: action.mode }));

    case "set-cursor":
      return withPane(state, action.windowKey, (p) => ({ ...p, cursorPos: action.pos }));

    case "apply-vim":
      return withPane(state, action.windowKey, (p) => ({
        ...p,
        inputBuffer: action.text,
        cursorPos: action.pos,
        vim: action.vim,
        mode: action.toInsert ? "INSERT" : p.mode,
      }));

    case "flash-mode":
      return { ...state, flashNonce: state.flashNonce + 1 };

    case "set-notice":
      return { ...state, notice: { text: action.text, until: action.until } };

    case "clear-notice":
      return { ...state, notice: null };

    case "set-confirm":
      return { ...state, pendingConfirm: action.confirm };

    case "set-animating":
      return { ...state, animating: action.animating };

    case "set-pending-prefix":
      return { ...state, pendingPrefix: action.pending };
  }
}
