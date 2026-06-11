/**
 * Motions return a raw target index plus inclusivity. Plain movement clamps
 * the target to the line; operators build their span from it. A null result
 * means the motion failed (e.g. `f` found nothing) and the command aborts.
 */

export interface MotionResult {
  target: number;
  /** Inclusive motions extend an operator span one char right. */
  inclusive: boolean;
}

/** 0 = whitespace, 1 = word chars, 2 = other (punctuation). */
function charClass(c: string): 0 | 1 | 2 {
  if (/\s/.test(c)) return 0;
  if (/\w/.test(c)) return 1;
  return 2;
}

/** WORD class: whitespace vs not. */
function bigClass(c: string): 0 | 1 {
  return /\s/.test(c) ? 0 : 1;
}

type Classifier = (c: string) => number;

function nextWordStart(text: string, pos: number, cls: Classifier): number {
  let i = pos;
  if (i >= text.length) return text.length;
  const start = cls(text[i]);
  if (start !== 0) {
    while (i < text.length && cls(text[i]) === start) i++;
  }
  while (i < text.length && cls(text[i]) === 0) i++;
  return i;
}

function prevWordStart(text: string, pos: number, cls: Classifier): number {
  let i = pos - 1;
  while (i >= 0 && cls(text[i]) === 0) i--;
  if (i < 0) return 0;
  const c = cls(text[i]);
  while (i > 0 && cls(text[i - 1]) === c) i--;
  return i;
}

function wordEnd(text: string, pos: number, cls: Classifier): number {
  let i = pos + 1;
  while (i < text.length && cls(text[i]) === 0) i++;
  if (i >= text.length) return Math.max(0, text.length - 1);
  const c = cls(text[i]);
  while (i + 1 < text.length && cls(text[i + 1]) === c) i++;
  return i;
}

function repeat(n: number, pos: number, step: (p: number) => number): number {
  let p = pos;
  for (let i = 0; i < n; i++) p = step(p);
  return p;
}

export function findChar(
  text: string,
  pos: number,
  cmd: "f" | "F" | "t" | "T",
  char: string,
  count: number,
): MotionResult | null {
  if (cmd === "f" || cmd === "t") {
    let i = pos;
    for (let n = 0; n < count; n++) {
      i = text.indexOf(char, i + 1);
      if (i < 0) return null;
    }
    return { target: cmd === "t" ? i - 1 : i, inclusive: true };
  }
  let i = pos;
  for (let n = 0; n < count; n++) {
    i = text.lastIndexOf(char, i - 1);
    if (i < 0) return null;
  }
  return { target: cmd === "T" ? i + 1 : i, inclusive: false };
}

/** Simple (single-key) motions. Returns null if the key isn't a motion. */
export function motion(
  key: string,
  text: string,
  pos: number,
  count: number,
): MotionResult | null | undefined {
  switch (key) {
    case "h":
      return { target: Math.max(0, pos - count), inclusive: false };
    case "l":
      return { target: Math.min(text.length, pos + count), inclusive: false };
    case "0":
      return { target: 0, inclusive: false };
    case "^": {
      const m = text.match(/\S/);
      return { target: m ? m.index! : 0, inclusive: false };
    }
    case "$":
      return { target: text.length, inclusive: false };
    case "w":
      return { target: repeat(count, pos, (p) => nextWordStart(text, p, charClass)), inclusive: false };
    case "W":
      return { target: repeat(count, pos, (p) => nextWordStart(text, p, bigClass)), inclusive: false };
    case "b":
      return { target: repeat(count, pos, (p) => prevWordStart(text, p, charClass)), inclusive: false };
    case "B":
      return { target: repeat(count, pos, (p) => prevWordStart(text, p, bigClass)), inclusive: false };
    case "e":
      return { target: repeat(count, pos, (p) => wordEnd(text, p, charClass)), inclusive: true };
    case "E":
      return { target: repeat(count, pos, (p) => wordEnd(text, p, bigClass)), inclusive: true };
    case "|":
      return { target: Math.min(Math.max(0, count - 1), Math.max(0, text.length - 1)), inclusive: false };
    default:
      return undefined;
  }
}

export const MOTION_KEYS = new Set(["h", "l", "0", "^", "$", "w", "W", "b", "B", "e", "E", "|"]);
export const FIND_KEYS = new Set(["f", "F", "t", "T"]);

export { charClass, bigClass, nextWordStart, prevWordStart, wordEnd };
