import { describe, expect, test } from "vitest";
import { handleKey, initialVimState } from "./machine";
import type { VimBuffer, LineVimState, VimResult } from "./types";

/** Feed a key sequence; "<Esc>" "<CR>" "<C-r>" notation for special keys. */
function feed(
  text: string,
  pos: number,
  keys: string,
): { buf: VimBuffer; vim: LineVimState; mode: string; effects: string[]; flashes: number } {
  let buf: VimBuffer = { text, pos };
  let vim = initialVimState();
  let mode = "NORMAL";
  const effects: string[] = [];
  let flashes = 0;

  const tokens = keys.match(/<[^>]+>|./g) ?? [];
  for (const tok of tokens) {
    let input: { key: string; ctrl?: boolean };
    if (tok === "<Esc>") input = { key: "Escape" };
    else if (tok === "<CR>") input = { key: "Enter" };
    else if (tok.startsWith("<C-")) input = { key: tok.slice(3, -1), ctrl: true };
    else input = { key: tok };

    const r: VimResult = handleKey(buf, vim, input);
    buf = r.buf;
    vim = r.vim;
    if (r.mode === "INSERT") mode = "INSERT";
    if (r.effect) effects.push(r.effect);
    if (r.flash) flashes++;
  }
  return { buf, vim, mode, effects, flashes };
}

/** table row: [name, text, pos, keys, expectedText, expectedPos, expectedMode?] */
type Row = [string, string, number, string, string, number, ("NORMAL" | "INSERT")?];

function check(rows: Row[]) {
  for (const [name, text, pos, keys, expText, expPos, expMode] of rows) {
    test(name, () => {
      const r = feed(text, pos, keys);
      expect(r.buf.text, "text").toBe(expText);
      expect(r.buf.pos, "pos").toBe(expPos);
      if (expMode) expect(r.mode, "mode").toBe(expMode);
    });
  }
}

describe("motions", () => {
  check([
    ["h moves left", "abc", 2, "h", "abc", 1],
    ["h clamps at 0", "abc", 0, "h", "abc", 0],
    ["3h with count", "abcde", 4, "3h", "abcde", 1],
    ["l moves right", "abc", 0, "l", "abc", 1],
    ["l clamps at end", "abc", 2, "l", "abc", 2],
    ["0 to line start", "  foo", 4, "0", "  foo", 0],
    ["^ to first non-blank", "  foo", 4, "^", "  foo", 2],
    ["$ to line end", "abc", 0, "$", "abc", 2],
    ["w to next word", "foo bar baz", 0, "w", "foo bar baz", 4],
    ["2w with count", "foo bar baz", 0, "2w", "foo bar baz", 8],
    ["w stops at punctuation", "foo.bar", 0, "w", "foo.bar", 3],
    ["W skips punctuation", "foo.bar baz", 0, "W", "foo.bar baz", 8],
    ["b back a word", "foo bar baz", 8, "b", "foo bar baz", 4],
    ["B back a WORD", "foo.bar baz", 8, "B", "foo.bar baz", 0],
    ["e to word end", "foo bar", 0, "e", "foo bar", 2],
    ["e jumps to next word end when already at one", "foo bar", 2, "e", "foo bar", 6],
    ["E to WORD end", "foo.bar baz", 0, "E", "foo.bar baz", 6],
    ["f finds forward", "hello world", 0, "fo", "hello world", 4],
    ["2f finds second", "hello world", 0, "2fo", "hello world", 7],
    ["F finds backward", "hello world", 10, "Fo", "hello world", 7],
    ["t stops before", "hello world", 0, "to", "hello world", 3],
    ["T stops after, backward", "hello world", 10, "To", "hello world", 8],
    ["; repeats find", "a.b.c", 0, "f.;", "a.b.c", 3],
    [", reverses find", "a.b.c", 0, "f.;,", "a.b.c", 1],
    ["| to column", "abcdef", 0, "4|", "abcdef", 3],
    ["| without count to column 1", "abcdef", 4, "|", "abcdef", 0],
  ]);
});

describe("delete operator", () => {
  check([
    ["dw deletes word + space", "foo bar baz", 0, "dw", "bar baz", 0],
    ["d2w deletes two words", "foo bar baz", 0, "d2w", "baz", 0],
    ["2dw equals d2w", "foo bar baz", 0, "2dw", "baz", 0],
    ["2d2w deletes four words", "a b c d e", 0, "2d2w", "e", 0],
    ["de keeps the space", "foo bar", 0, "de", " bar", 0],
    ["db deletes back", "foo bar", 4, "db", "bar", 0],
    ["d$ to end", "foo bar", 3, "d$", "foo", 2],
    ["D is d$", "foo bar", 3, "D", "foo", 2],
    ["d0 to start", "foo bar", 4, "d0", "bar", 0],
    ["dd clears the line", "foo bar", 3, "dd", "", 0],
    ["dh deletes left", "abc", 2, "dh", "ac", 1],
    ["dl deletes under cursor", "abc", 0, "dl", "bc", 0],
    ["df) inclusive find delete", "fn(a) end", 0, "df)", " end", 0],
    ["dt) exclusive find delete", "fn(a) end", 0, "dt)", ") end", 0],
    ["Esc cancels a pending operator", "foo bar", 0, "d<Esc>w", "foo bar", 4],
  ]);
});

describe("change operator", () => {
  check([
    ["cw changes word only (vim quirk)", "foo bar", 0, "cw", " bar", 0, "INSERT"],
    ["c2w spans two words", "foo bar baz", 0, "c2w", " baz", 0, "INSERT"],
    ["cc clears the line", "foo bar", 3, "cc", "", 0, "INSERT"],
    ["S clears the line", "foo bar", 3, "S", "", 0, "INSERT"],
    ["C changes to end", "foo bar", 4, "C", "foo ", 4, "INSERT"],
    ["s substitutes a char", "abc", 0, "s", "bc", 0, "INSERT"],
    ["3s substitutes three", "abcd", 0, "3s", "d", 0, "INSERT"],
    ["ce acts like cw on a word", "foo bar", 0, "ce", " bar", 0, "INSERT"],
  ]);
});

describe("yank and paste", () => {
  check([
    ["yw p pastes after cursor", "ab", 0, "ywp", "aabb", 2],
    ["yy p duplicates the line", "ab", 0, "yyp", "aabb", 2],
    ["Y is yy", "ab", 0, "Yp", "aabb", 2],
    ["P pastes before cursor", "ab", 0, "yyP", "abab", 1],
    ["x then p moves a char", "abc", 0, "xp", "bac", 1],
    ["2p pastes twice", "ab", 0, "yy2p", "aababb", 4],
  ]);
});

describe("direct commands", () => {
  check([
    ["x deletes under cursor", "abc", 0, "x", "bc", 0],
    ["3x deletes three", "abcd", 0, "3x", "d", 0],
    ["x clamps pos at new end", "ab", 1, "x", "a", 0],
    ["X deletes before cursor", "abc", 1, "X", "bc", 0],
    ["r replaces a char", "abc", 0, "rz", "zbc", 0],
    ["2r replaces two", "abcd", 0, "2rx", "xxcd", 1],
    ["~ toggles case and advances", "abc", 0, "~", "Abc", 1],
    ["3~ toggles three", "abc", 0, "3~", "ABC", 2],
    ["i stays put", "abc", 1, "i", "abc", 1, "INSERT"],
    ["a moves right", "abc", 1, "a", "abc", 2, "INSERT"],
    ["a at end allows append", "abc", 2, "a", "abc", 3, "INSERT"],
    ["I to first non-blank", "  foo", 4, "I", "  foo", 2, "INSERT"],
    ["A to end of line", "abc", 0, "A", "abc", 3, "INSERT"],
  ]);
});

describe("text objects", () => {
  check([
    ["diw deletes inner word", "foo bar baz", 5, "diw", "foo  baz", 4],
    ["daw deletes word + space", "foo bar baz", 5, "daw", "foo baz", 4],
    ["diW inner WORD", "a foo.bar b", 4, "diW", "a  b", 2],
    ['di" empties quotes', 'say "hi" now', 6, 'di"', 'say "" now', 5],
    ['da" eats quotes + space', 'say "hi" now', 6, 'da"', "say now", 4],
    ["di' single quotes", "a 'b c' d", 3, "di'", "a '' d", 3],
    ["di( empties parens", "fn(a, b) x", 4, "di(", "fn() x", 3],
    ["ci( changes inside", "fn(a, b) x", 4, "ci(", "fn() x", 3, "INSERT"],
    ["da( deletes parens too", "fn(a, b) x", 4, "da(", "fn x", 2],
    ["di[ brackets", "a [b] c", 3, "di[", "a [] c", 3],
    ["di{ braces", "a {b} c", 3, "di{", "a {} c", 3],
    ["di< angles", "a <b> c", 3, "di<", "a <> c", 3],
    // vim quirk: quote objects search forward on the line, bracket objects don't
    ['di" searches forward from outside', 'x "ab" y', 0, 'di"', 'x "" y', 3],
    ["di( from outside the parens is a no-op", "fn(a) x", 0, "di(", "fn(a) x", 0],
    ["yiw p duplicates word", "ab cd", 3, "yiwp", "ab ccdd", 5],
  ]);
});

describe("undo and redo", () => {
  test("u undoes changes step by step, Ctrl+r redoes", () => {
    let r = feed("abc", 0, "xx");
    expect(r.buf.text).toBe("c");
    r = feed("abc", 0, "xxu");
    expect(r.buf.text).toBe("bc");
    r = feed("abc", 0, "xxuu");
    expect(r.buf.text).toBe("abc");
    r = feed("abc", 0, "xxuu<C-r>");
    expect(r.buf.text).toBe("bc");
    r = feed("abc", 0, "xxuu<C-r><C-r>");
    expect(r.buf.text).toBe("c");
  });

  test("a new change clears the redo stack", () => {
    const r = feed("abcd", 0, "xxu~<C-r>");
    expect(r.buf.text).toBe("Bcd");
  });

  test("u with nothing to undo flashes", () => {
    const r = feed("abc", 0, "u");
    expect(r.buf.text).toBe("abc");
    expect(r.flashes).toBe(1);
  });
});

describe(". repeat", () => {
  check([
    [". repeats x", "aaaa", 0, "x.", "aa", 0],
    [". repeats 2x as a unit", "abcdef", 0, "2x.", "ef", 0],
    [". repeats dw", "foo bar baz", 0, "dw.", "baz", 0],
    [". repeats r", "aaaa", 0, "rbl.", "bbaa", 1],
    [". repeats ~", "abc", 0, "~.", "ABc", 2],
    [". repeats diw", "foo bar", 0, "diww.", " ", 0],
  ]);

  test(". with no prior change flashes", () => {
    const r = feed("abc", 0, ".");
    expect(r.flashes).toBe(1);
  });
});

describe("counts and pending state", () => {
  check([
    ["count digits accumulate", "abcdefghijklm", 0, "12l", "abcdefghijklm", 12],
    ["0 after digits is part of the count", "a".repeat(15), 0, "10l", "a".repeat(15), 10],
    ["Esc clears a pending count", "abcde", 0, "3<Esc>x", "bcde", 0],
  ]);

  test("unknown keys flash and change nothing", () => {
    const r = feed("abc", 1, "Q");
    expect(r.buf).toEqual({ text: "abc", pos: 1 });
    expect(r.flashes).toBe(1);
  });
});

describe("history and execute signals", () => {
  test("j and k emit history effects", () => {
    expect(feed("x", 0, "k").effects).toEqual(["history-up"]);
    expect(feed("x", 0, "j").effects).toEqual(["history-down"]);
  });

  test("Enter emits execute", () => {
    expect(feed("ls", 0, "<CR>").effects).toEqual(["execute"]);
  });
});
