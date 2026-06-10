/**
 * Text objects (FLOW §6.2): iw aw iW aW, quote pairs, bracket pairs.
 * Spans are [start, end). Null = object not found (command aborts).
 * Vim quirks preserved: quote objects search forward on the line; bracket
 * objects require the cursor to be on or inside the pair.
 */
import { bigClass, charClass } from "./motions";

export interface Span {
  start: number;
  end: number;
}

const BRACKETS: Record<string, [string, string]> = {
  "(": ["(", ")"],
  ")": ["(", ")"],
  b: ["(", ")"],
  "[": ["[", "]"],
  "]": ["[", "]"],
  "{": ["{", "}"],
  "}": ["{", "}"],
  B: ["{", "}"],
  "<": ["<", ">"],
  ">": ["<", ">"],
};

const QUOTES = new Set(['"', "'", "`"]);

function wordObject(
  text: string,
  pos: number,
  around: boolean,
  big: boolean,
  count: number,
): Span | null {
  if (text.length === 0) return null;
  const cls = big ? bigClass : charClass;
  const p = Math.min(pos, text.length - 1);
  const c = cls(text[p]);
  let start = p;
  while (start > 0 && cls(text[start - 1]) === c) start--;
  let end = p + 1;
  while (end < text.length && cls(text[end]) === c) end++;

  // Additional counts extend over following runs.
  for (let n = 1; n < count; n++) {
    if (end >= text.length) break;
    const nc = cls(text[end]);
    while (end < text.length && cls(text[end]) === nc) end++;
  }

  if (around) {
    let trail = end;
    while (trail < text.length && cls(text[trail]) === 0) trail++;
    if (trail > end) {
      end = trail;
    } else {
      while (start > 0 && cls(text[start - 1]) === 0) start--;
    }
  }
  return { start, end };
}

function quoteObject(text: string, pos: number, quote: string, around: boolean): Span | null {
  // Pair quote occurrences left to right, vim-style.
  const idx: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === quote) idx.push(i);
  for (let i = 0; i + 1 < idx.length; i += 2) {
    const [open, close] = [idx[i], idx[i + 1]];
    if (pos <= close) {
      if (!around) return { start: open + 1, end: close };
      let end = close + 1;
      let start = open;
      let trail = end;
      while (trail < text.length && /\s/.test(text[trail])) trail++;
      if (trail > end) end = trail;
      else while (start > 0 && /\s/.test(text[start - 1])) start--;
      return { start, end };
    }
  }
  return null;
}

function bracketObject(text: string, pos: number, key: string, around: boolean): Span | null {
  const [open, close] = BRACKETS[key];
  // Find the innermost open bracket at or before the cursor…
  let depth = 0;
  let openIdx = -1;
  for (let i = pos; i >= 0; i--) {
    const c = text[i];
    if (c === close && i !== pos) depth++;
    else if (c === open) {
      if (depth === 0) {
        openIdx = i;
        break;
      }
      depth--;
    }
  }
  if (openIdx < 0) return null;
  // …then its match going forward.
  depth = 0;
  for (let i = openIdx + 1; i < text.length; i++) {
    const c = text[i];
    if (c === open) depth++;
    else if (c === close) {
      if (depth === 0) {
        return around ? { start: openIdx, end: i + 1 } : { start: openIdx + 1, end: i };
      }
      depth--;
    }
  }
  return null;
}

export function textObjectSpan(
  text: string,
  pos: number,
  mode: "i" | "a",
  obj: string,
  count: number,
): Span | null {
  const around = mode === "a";
  if (obj === "w") return wordObject(text, pos, around, false, count);
  if (obj === "W") return wordObject(text, pos, around, true, count);
  if (QUOTES.has(obj)) return quoteObject(text, pos, obj, around);
  if (obj in BRACKETS) return bracketObject(text, pos, obj, around);
  return null;
}
