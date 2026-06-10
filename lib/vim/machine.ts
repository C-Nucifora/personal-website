/**
 * The NORMAL-mode state machine (FLOW §6.2, §12.2). One entry point,
 * handleKey, accumulating `[count][operator][count][motion|textobject]` and
 * resolving on completion. Pure: (buffer, state, key) → result.
 */
import { FIND_KEYS, findChar, motion } from "./motions";
import { textObjectSpan, type Span } from "./textObjects";
import type { KeyInput, LineVimState, Operator, VimBuffer, VimResult } from "./types";

export function initialVimState(): LineVimState {
  return {
    count1: "",
    operator: null,
    count2: "",
    pending: null,
    register: "",
    lastFind: null,
    lastChange: null,
    undo: [],
    redo: [],
    curKeys: [],
  };
}

const clampNormal = (text: string, pos: number) =>
  Math.max(0, Math.min(pos, Math.max(0, text.length - 1)));

interface Ctx {
  buf: VimBuffer;
  vim: LineVimState;
  recording: boolean;
}

function counts(vim: LineVimState): number {
  const c1 = vim.count1 ? parseInt(vim.count1, 10) : 1;
  const c2 = vim.count2 ? parseInt(vim.count2, 10) : 1;
  return c1 * c2;
}

function clearPending(vim: LineVimState): LineVimState {
  return { ...vim, count1: "", count2: "", operator: null, pending: null, curKeys: [] };
}

function flash(ctx: Ctx): VimResult {
  return { buf: ctx.buf, vim: clearPending(ctx.vim), flash: true, handled: true };
}

function moveTo(ctx: Ctx, pos: number): VimResult {
  return {
    buf: { text: ctx.buf.text, pos: clampNormal(ctx.buf.text, pos) },
    vim: clearPending(ctx.vim),
    handled: true,
  };
}

/** Commit a text change: push undo, clear redo, record for `.`. */
function commit(
  ctx: Ctx,
  next: VimBuffer,
  opts: { register?: string; toInsert?: boolean } = {},
): VimResult {
  const vim: LineVimState = {
    ...clearPending(ctx.vim),
    undo: [...ctx.vim.undo, { ...ctx.buf }],
    redo: [],
    register: opts.register !== undefined ? opts.register : ctx.vim.register,
    lastChange: ctx.recording ? [...ctx.vim.curKeys] : ctx.vim.lastChange,
  };
  const pos = opts.toInsert ? next.pos : clampNormal(next.text, next.pos);
  return {
    buf: { text: next.text, pos },
    vim,
    mode: opts.toInsert ? "INSERT" : undefined,
    handled: true,
  };
}

function applySpan(ctx: Ctx, op: Operator, span: Span): VimResult {
  const { text } = ctx.buf;
  const start = Math.max(0, Math.min(span.start, span.end));
  const end = Math.min(text.length, Math.max(span.start, span.end));
  const cut = text.slice(start, end);
  if (op === "y") {
    return {
      buf: { text, pos: clampNormal(text, start) },
      vim: { ...clearPending(ctx.vim), register: cut },
      handled: true,
    };
  }
  const nextText = text.slice(0, start) + text.slice(end);
  return commit(ctx, { text: nextText, pos: start }, { register: cut, toInsert: op === "c" });
}

function operatorMotionSpan(
  pos: number,
  target: number,
  inclusive: boolean,
): Span {
  if (target >= pos) return { start: pos, end: target + (inclusive ? 1 : 0) };
  return { start: target, end: pos };
}

/** Replay the recorded keys of the last change (the `.` command). */
function repeatLastChange(ctx: Ctx): VimResult {
  const keys = ctx.vim.lastChange;
  if (!keys || keys.length === 0) return flash(ctx);
  let buf = ctx.buf;
  let vim: LineVimState = { ...clearPending(ctx.vim) };
  let mode: "INSERT" | undefined;
  for (const key of keys) {
    const r = handleKeyInternal(buf, vim, { key }, false);
    buf = r.buf;
    vim = r.vim;
    if (r.mode === "INSERT") mode = "INSERT";
  }
  // The replay must not overwrite the recorded change.
  vim = { ...vim, lastChange: keys };
  return { buf, vim, mode, handled: true };
}

function resolvePendingInput(ctx: Ctx, input: KeyInput): VimResult {
  const { buf, vim } = ctx;
  const pending = vim.pending!;
  const key = input.key;
  if (key === "Escape") {
    return { buf, vim: clearPending(vim), handled: true };
  }
  if (key.length !== 1) return flash(ctx);

  if (pending.kind === "find") {
    const n = counts(vim);
    const found = findChar(buf.text, buf.pos, pending.cmd, key, n);
    const vimWithFind = { ...vim, lastFind: { cmd: pending.cmd, char: key } };
    if (!found) return { buf, vim: clearPending(vimWithFind), handled: true, flash: true };
    if (vim.operator) {
      return applySpan(
        { ...ctx, vim: vimWithFind },
        vim.operator,
        operatorMotionSpan(buf.pos, found.target, found.inclusive),
      );
    }
    return moveTo({ ...ctx, vim: vimWithFind }, found.target);
  }

  if (pending.kind === "replace") {
    const n = counts(vim);
    if (buf.pos + n > buf.text.length) return flash(ctx);
    const next =
      buf.text.slice(0, buf.pos) + key.repeat(n) + buf.text.slice(buf.pos + n);
    return commit(ctx, { text: next, pos: buf.pos + n - 1 });
  }

  // text object
  const span = textObjectSpan(buf.text, buf.pos, pending.mode, key, counts(vim));
  if (!span) return flash(ctx);
  return applySpan(ctx, vim.operator!, span);
}

function handleKeyInternal(
  bufIn: VimBuffer,
  vimIn: LineVimState,
  input: KeyInput,
  recording: boolean,
): VimResult {
  // Record every key of the command being assembled (counts, ops, args).
  const vim: LineVimState = { ...vimIn, curKeys: [...vimIn.curKeys, input.key] };
  const buf = bufIn;
  const ctx: Ctx = { buf, vim, recording };
  const key = input.key;

  if (vim.pending) return resolvePendingInput(ctx, input);

  // Ctrl combos first.
  if (input.ctrl) {
    if (key === "r") {
      const redo = vim.redo[vim.redo.length - 1];
      if (!redo) return flash(ctx);
      return {
        buf: { ...redo },
        vim: {
          ...clearPending(vim),
          undo: [...vim.undo, { ...buf }],
          redo: vim.redo.slice(0, -1),
        },
        handled: true,
      };
    }
    return { buf, vim: vimIn, handled: false };
  }

  // Counts. A bare 0 is a motion; 0 after digits extends the count.
  if (/^[0-9]$/.test(key)) {
    const slot = vim.operator ? "count2" : "count1";
    if (key !== "0" || vim[slot] !== "") {
      return { buf, vim: { ...vim, [slot]: vim[slot] + key }, handled: true };
    }
  }

  switch (key) {
    case "Escape":
      return { buf, vim: clearPending(vim), handled: true };

    case "Enter":
      return { buf, vim: clearPending(vim), effect: "execute", handled: true };

    case "j":
    case "ArrowDown":
      if (vim.operator) return flash(ctx);
      return { buf, vim: clearPending(vim), effect: "history-down", handled: true };
    case "k":
    case "ArrowUp":
      if (vim.operator) return flash(ctx);
      return { buf, vim: clearPending(vim), effect: "history-up", handled: true };

    case "d":
    case "c":
    case "y": {
      const op = key as Operator;
      if (vim.operator === op) {
        // dd / cc / yy — the whole line.
        return applySpan(ctx, op, { start: 0, end: buf.text.length });
      }
      if (vim.operator) return flash(ctx);
      return { buf, vim: { ...vim, operator: op }, handled: true };
    }

    case "i":
    case "a":
      if (vim.operator) {
        return { buf, vim: { ...vim, pending: { kind: "textobj", mode: key } }, handled: true };
      }
      if (key === "i") {
        return { buf, vim: clearPending(vim), mode: "INSERT", handled: true };
      }
      return {
        buf: { text: buf.text, pos: Math.min(buf.text.length, buf.pos + 1) },
        vim: clearPending(vim),
        mode: "INSERT",
        handled: true,
      };

    case "I": {
      if (vim.operator) return flash(ctx);
      const m = buf.text.match(/\S/);
      return {
        buf: { text: buf.text, pos: m ? m.index! : 0 },
        vim: clearPending(vim),
        mode: "INSERT",
        handled: true,
      };
    }
    case "A":
      if (vim.operator) return flash(ctx);
      return {
        buf: { text: buf.text, pos: buf.text.length },
        vim: clearPending(vim),
        mode: "INSERT",
        handled: true,
      };

    case "x": {
      if (vim.operator) return flash(ctx);
      const n = counts(vim);
      if (buf.text.length === 0) return flash(ctx);
      return applySpan(ctx, "d", { start: buf.pos, end: buf.pos + n });
    }
    case "X": {
      if (vim.operator) return flash(ctx);
      if (buf.pos === 0) return flash(ctx);
      const n = counts(vim);
      return applySpan(ctx, "d", { start: Math.max(0, buf.pos - n), end: buf.pos });
    }

    case "s": {
      if (vim.operator) return flash(ctx);
      const n = counts(vim);
      const cut = buf.text.slice(buf.pos, buf.pos + n);
      const next = buf.text.slice(0, buf.pos) + buf.text.slice(buf.pos + n);
      return commit(ctx, { text: next, pos: buf.pos }, { register: cut, toInsert: true });
    }
    case "S":
      return applySpan(ctx, "c", { start: 0, end: buf.text.length });

    case "D":
      if (vim.operator) return flash(ctx);
      return applySpan(ctx, "d", { start: buf.pos, end: buf.text.length });
    case "C":
      if (vim.operator) return flash(ctx);
      return applySpan(ctx, "c", { start: buf.pos, end: buf.text.length });
    case "Y":
      if (vim.operator) return flash(ctx);
      return applySpan(ctx, "y", { start: 0, end: buf.text.length });

    case "r":
      if (vim.operator) return flash(ctx);
      return { buf, vim: { ...vim, pending: { kind: "replace" } }, handled: true };

    case "~": {
      if (vim.operator) return flash(ctx);
      const n = Math.min(counts(vim), buf.text.length - buf.pos);
      if (n <= 0) return flash(ctx);
      const seg = buf.text.slice(buf.pos, buf.pos + n);
      const toggled = [...seg]
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join("");
      const next = buf.text.slice(0, buf.pos) + toggled + buf.text.slice(buf.pos + n);
      return commit(ctx, { text: next, pos: buf.pos + n });
    }

    case "p":
    case "P": {
      if (vim.operator) return flash(ctx);
      if (!vim.register) return flash(ctx);
      const n = counts(vim);
      const paste = vim.register.repeat(n);
      const at = key === "p" ? Math.min(buf.pos + 1, buf.text.length) : buf.pos;
      const next = buf.text.slice(0, at) + paste + buf.text.slice(at);
      return commit(ctx, { text: next, pos: at + paste.length - 1 });
    }

    case "u": {
      if (vim.operator) return flash(ctx);
      const last = vim.undo[vim.undo.length - 1];
      if (!last) return flash(ctx);
      return {
        buf: { ...last },
        vim: {
          ...clearPending(vim),
          undo: vim.undo.slice(0, -1),
          redo: [...vim.redo, { ...buf }],
        },
        handled: true,
      };
    }

    case ".":
      if (vim.operator) return flash(ctx);
      return repeatLastChange(ctx);
  }

  if (FIND_KEYS.has(key)) {
    return {
      buf,
      vim: { ...vim, pending: { kind: "find", cmd: key as "f" | "F" | "t" | "T" } },
      handled: true,
    };
  }

  if (key === ";" || key === ",") {
    const lf = vim.lastFind;
    if (!lf) return flash(ctx);
    let cmd = lf.cmd;
    if (key === ",") {
      cmd = ({ f: "F", F: "f", t: "T", T: "t" } as const)[cmd];
    }
    const found = findChar(buf.text, buf.pos, cmd, lf.char, counts(vim));
    if (!found) return flash(ctx);
    if (vim.operator) {
      return applySpan(ctx, vim.operator, operatorMotionSpan(buf.pos, found.target, found.inclusive));
    }
    return moveTo(ctx, found.target);
  }

  const m = motion(key, buf.text, buf.pos, counts(vim));
  if (m === null) return flash(ctx);
  if (m !== undefined) {
    if (vim.operator) {
      // vim quirk: cw/cW on a non-blank acts like ce/cE.
      if (vim.operator === "c" && (key === "w" || key === "W") && /\S/.test(buf.text[buf.pos] ?? "")) {
        const e = motion(key === "w" ? "e" : "E", buf.text, buf.pos, counts(vim))!;
        return applySpan(ctx, "c", operatorMotionSpan(buf.pos, e.target, e.inclusive));
      }
      return applySpan(ctx, vim.operator, operatorMotionSpan(buf.pos, m.target, m.inclusive));
    }
    return moveTo(ctx, m.target);
  }

  return flash(ctx);
}

export function handleKey(buf: VimBuffer, vim: LineVimState, input: KeyInput): VimResult {
  return handleKeyInternal(buf, vim, input, true);
}
