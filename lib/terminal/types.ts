/**
 * Global terminal state (FLOW.md §1.1): one state, three interfaces.
 * Clicks, shell commands, and keybindings all mutate this shape through the
 * reducer — never each other.
 */
import type { ReactNode } from "react";
import type { WindowId } from "@/lib/vfs/types";
import type { LineVimState } from "@/lib/vim/types";
import type { Direction, PaneLayout } from "./layout";

export type { Direction, PaneLayout };

export type { WindowId };
export { WINDOW_IDS } from "@/lib/vfs/types";

export type Mode = "INSERT" | "NORMAL" | "COPY";

/** The lobby (~) is a shell that belongs to no window. */
export type WindowKey = WindowId | "lobby";

export interface OutputLine {
  id: number;
  /** The echoed command, or null for system output (MOTD, extra writes). */
  command: string | null;
  /** The cwd at echo time — the echo line's prompt renders it. */
  cwd?: string;
  node: ReactNode;
}

export interface PaneState {
  id: string;
  cwd: string;
  prevCwd: string; // for `cd -`
  inputBuffer: string;
  cursorPos: number;
  historyIndex: number | null; // null = live line
  draft: string; // stashed live line while walking history
  scrollback: OutputLine[];
  scrollOffset: number; // 0 = pinned to bottom
  mode: Mode;
  vim: LineVimState; // NORMAL-mode line-editing state (§6.2)
  view: "shell" | "editor";
  editorPath: string | null;
  /** One-shot message-line text shown when the editor opens (vi joke). */
  editorNote: string | null;
}

export interface WindowState {
  visited: boolean;
  panes: PaneState[];
  activePane: string; // pane id
  layout: PaneLayout;
  zoomed: string | null; // zoomed pane id (Ctrl+b z)
}

export interface AppState {
  activeWindow: WindowId | null; // null = lobby
  windows: Record<WindowId, WindowState>;
  lobby: WindowState;
  pendingPrefix: boolean;
  animating: { command: string; stash: string } | null;
  notice: { text: string; until: number } | null;
  pendingConfirm: { kind: "openUrl" | "closePane"; payload: string } | null;
  /** Ctrl+b w window picker overlay; index = highlighted row. */
  picker: { index: number } | null;
  /** Effect overlay — any input dismisses. */
  overlay: "clock" | "sl" | "top" | "htop" | "disintegration" | "matrix" | null;
  history: string[];
  nextLineId: number;
  nextPaneId: number;
  /** Bumped on unrecognized NORMAL-mode keys — the status bar flashes. */
  flashNonce: number;
}

export type Action =
  | { type: "switch-window"; window: WindowId | null }
  | { type: "mark-visited"; window: WindowId }
  | { type: "set-cwd"; windowKey: WindowKey; path: string }
  | {
      type: "append-line";
      windowKey: WindowKey;
      command: string | null;
      cwd?: string;
      node: ReactNode;
    }
  | { type: "clear-scrollback"; windowKey: WindowKey }
  | { type: "set-input"; windowKey: WindowKey; text: string; cursorPos: number }
  | { type: "history-append"; line: string }
  | { type: "history-walk"; windowKey: WindowKey; direction: -1 | 1 }
  | { type: "set-mode"; windowKey: WindowKey; mode: Mode }
  | { type: "set-cursor"; windowKey: WindowKey; pos: number }
  | {
      type: "apply-vim";
      windowKey: WindowKey;
      text: string;
      pos: number;
      vim: LineVimState;
      toInsert: boolean;
    }
  | { type: "flash-mode" }
  | { type: "split-pane"; window: WindowId; dir: "row" | "col" }
  | { type: "close-pane"; window: WindowId; paneId: string }
  | { type: "focus-pane"; window: WindowId; paneId: string }
  | { type: "cycle-pane"; window: WindowId }
  | { type: "focus-direction"; window: WindowId; dir: Direction }
  | { type: "zoom-pane"; window: WindowId }
  | { type: "set-ratio"; window: WindowId; splitId: string; ratio: number }
  | { type: "set-picker"; picker: { index: number } | null }
  | { type: "set-overlay"; overlay: AppState["overlay"] }
  | { type: "open-editor"; windowKey: WindowKey; path: string; note?: string }
  | { type: "close-editor"; windowKey: WindowKey }
  | { type: "set-notice"; text: string; until: number }
  | { type: "clear-notice" }
  | { type: "set-confirm"; confirm: AppState["pendingConfirm"] }
  | { type: "set-animating"; animating: AppState["animating"] }
  | { type: "set-pending-prefix"; pending: boolean };
