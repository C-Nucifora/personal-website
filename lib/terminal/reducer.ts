/**
 * All state transitions, pure (FLOW.md §12). The store calls reduce(); tests
 * call it directly.
 */
import { normalizePath, windowForPath } from "@/lib/vfs/path";
import { WINDOW_IDS } from "@/lib/vfs/types";
import { initialVimState } from "@/lib/vim/machine";
import { leaf, leafIds, neighbor, removeLeaf, splitLeaf, withRatio } from "./layout";
import type { Action, AppState, PaneState, WindowId, WindowKey, WindowState } from "./types";

export const MAX_PANES = 4;

export const HISTORY_SEED = ["vim resume.md"];

function freshPane(id: string, cwd: string): PaneState {
  return {
    id,
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

function freshWindow(id: string, cwd: string): WindowState {
  const paneId = `${id}-p1`;
  return {
    visited: false,
    panes: [freshPane(paneId, cwd)],
    activePane: paneId,
    layout: leaf(paneId),
    zoomed: null,
  };
}

export function initialState(initialWindow: WindowId | null): AppState {
  const windows = Object.fromEntries(
    WINDOW_IDS.map((id) => [id, freshWindow(id, `~/${id}`)]),
  ) as Record<WindowId, WindowState>;
  return {
    activeWindow: initialWindow,
    windows,
    lobby: freshWindow("lobby", "~"),
    pendingPrefix: false,
    animating: null,
    notice: null,
    pendingConfirm: null,
    picker: null,
    history: [...HISTORY_SEED],
    nextLineId: 1,
    nextPaneId: 1,
    flashNonce: 0,
  };
}

export function getWindow(state: AppState, key: WindowKey): WindowState {
  return key === "lobby" ? state.lobby : state.windows[key];
}

export function getPane(state: AppState, key: WindowKey): PaneState {
  const w = getWindow(state, key);
  return w.panes.find((p) => p.id === w.activePane) ?? w.panes[0];
}

export function getPaneById(state: AppState, key: WindowKey, paneId: string): PaneState | null {
  return getWindow(state, key).panes.find((p) => p.id === paneId) ?? null;
}

export function activeWindowKey(state: AppState): WindowKey {
  return state.activeWindow ?? "lobby";
}

export function activePane(state: AppState): PaneState {
  return getPane(state, activeWindowKey(state));
}

function setWindow(state: AppState, key: WindowKey, next: WindowState): AppState {
  return key === "lobby"
    ? { ...state, lobby: next }
    : { ...state, windows: { ...state.windows, [key]: next } };
}

/** Immutably replace the active pane of one window. */
function withPane(
  state: AppState,
  key: WindowKey,
  update: (pane: PaneState) => PaneState,
): AppState {
  const w = getWindow(state, key);
  const panes = w.panes.map((p) => (p.id === w.activePane ? update(p) : p));
  return setWindow(state, key, { ...w, panes });
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

    case "set-picker":
      return { ...state, picker: action.picker };

    case "split-pane": {
      const w = state.windows[action.window];
      if (w.panes.length >= MAX_PANES) return state;
      const from = w.panes.find((p) => p.id === w.activePane) ?? w.panes[0];
      const paneId = `pane-${state.nextPaneId}`;
      const splitId = `split-${state.nextPaneId}`;
      const pane = freshPane(paneId, from.cwd);
      // A short header so the fresh shell states where it is (§7.3).
      pane.scrollback = [
        { id: state.nextLineId, command: null, node: `[new pane] ${from.cwd}` },
      ];
      const next: WindowState = {
        ...w,
        panes: [...w.panes, pane],
        activePane: paneId,
        layout: splitLeaf(w.layout, from.id, paneId, action.dir, splitId),
        zoomed: null,
      };
      return {
        ...setWindow(state, action.window, next),
        nextPaneId: state.nextPaneId + 1,
        nextLineId: state.nextLineId + 1,
      };
    }

    case "close-pane": {
      const w = state.windows[action.window];
      if (w.panes.length <= 1) return state;
      const layout = removeLeaf(w.layout, action.paneId);
      if (!layout) return state;
      const remaining = w.panes.filter((p) => p.id !== action.paneId);
      const active =
        w.activePane === action.paneId ? leafIds(layout)[0] : w.activePane;
      return setWindow(state, action.window, {
        ...w,
        panes: remaining,
        activePane: active,
        layout,
        zoomed: null,
      });
    }

    case "focus-pane": {
      const w = state.windows[action.window];
      if (!w.panes.some((p) => p.id === action.paneId)) return state;
      return setWindow(state, action.window, { ...w, activePane: action.paneId });
    }

    case "cycle-pane": {
      const w = state.windows[action.window];
      const order = leafIds(w.layout);
      const idx = order.indexOf(w.activePane);
      const next = order[(idx + 1) % order.length];
      return setWindow(state, action.window, { ...w, activePane: next });
    }

    case "focus-direction": {
      const w = state.windows[action.window];
      const target = neighbor(w.layout, w.activePane, action.dir);
      if (!target) return state;
      return setWindow(state, action.window, { ...w, activePane: target });
    }

    case "zoom-pane": {
      const w = state.windows[action.window];
      if (w.panes.length <= 1) return state;
      return setWindow(state, action.window, {
        ...w,
        zoomed: w.zoomed === w.activePane ? null : w.activePane,
      });
    }

    case "set-ratio": {
      const w = state.windows[action.window];
      const ratio = Math.max(0.1, Math.min(0.9, action.ratio));
      return setWindow(state, action.window, {
        ...w,
        layout: withRatio(w.layout, action.splitId, ratio),
      });
    }
  }
}
