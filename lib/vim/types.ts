/**
 * The shell-line vim grammar (FLOW.md §6.2). Pure data + pure functions;
 * deliberately independent of the CM6 editor's vim emulation (§8.1).
 */

export interface VimBuffer {
  text: string;
  pos: number;
}

export type Operator = "d" | "c" | "y";

export type PendingInput =
  | { kind: "find"; cmd: "f" | "F" | "t" | "T" }
  | { kind: "replace" }
  | { kind: "textobj"; mode: "i" | "a" };

export interface LineVimState {
  count1: string; // count before the operator
  operator: Operator | null;
  count2: string; // count after the operator
  pending: PendingInput | null;
  register: string; // single unnamed register, characterwise
  lastFind: { cmd: "f" | "F" | "t" | "T"; char: string } | null;
  lastChange: string[] | null; // key sequence replayed by `.`
  undo: VimBuffer[];
  redo: VimBuffer[];
  /** Keys of the command currently being assembled (for `.` recording). */
  curKeys: string[];
}

export interface KeyInput {
  key: string;
  ctrl?: boolean;
}

export interface VimResult {
  buf: VimBuffer;
  vim: LineVimState;
  /** Set when the command transitions to INSERT (i a I A s S c…). */
  mode?: "INSERT";
  /** Signals the integration must act on (the machine knows no history). */
  effect?: "history-up" | "history-down" | "execute";
  /** Unrecognized key — flash the status-bar mode indicator (§6.2). */
  flash?: boolean;
  handled: boolean;
}
