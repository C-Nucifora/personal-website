import { describe, expect, test } from "vitest";
import { activePane, getPane, initialState, reduce } from "./reducer";
import type { AppState } from "./types";

function freshState(): AppState {
  return initialState(null);
}

describe("initialState", () => {
  test("starts in the lobby", () => {
    const s = freshState();
    expect(s.activeWindow).toBe(null);
    expect(activePane(s).cwd).toBe("~");
  });

  test("each window starts unvisited with cwd at its root", () => {
    const s = freshState();
    expect(s.windows.about.visited).toBe(false);
    expect(getPane(s, "about").cwd).toBe("~/about");
    expect(getPane(s, "projects").cwd).toBe("~/projects");
  });

  test("deep-link initial window is honored", () => {
    const s = initialState("projects");
    expect(s.activeWindow).toBe("projects");
  });

  test("history is seeded with the vim resume.md entry", () => {
    expect(freshState().history).toEqual(["vim resume.md"]);
  });
});

describe("switch-window", () => {
  test("activates the window without touching its cwd", () => {
    let s = freshState();
    s = reduce(s, { type: "set-cwd", windowKey: "projects", path: "~/projects/foo" });
    s = reduce(s, { type: "switch-window", window: "resume" });
    s = reduce(s, { type: "switch-window", window: "projects" });
    expect(s.activeWindow).toBe("projects");
    expect(getPane(s, "projects").cwd).toBe("~/projects/foo");
  });

  test("null returns to the lobby", () => {
    let s = reduce(freshState(), { type: "switch-window", window: "about" });
    s = reduce(s, { type: "switch-window", window: null });
    expect(s.activeWindow).toBe(null);
  });
});

describe("set-cwd window sync (FLOW §2.1)", () => {
  test("cd within the current window stays put", () => {
    let s = reduce(freshState(), { type: "switch-window", window: "projects" });
    s = reduce(s, { type: "set-cwd", windowKey: "projects", path: "~/projects/foo" });
    expect(s.activeWindow).toBe("projects");
    expect(getPane(s, "projects").cwd).toBe("~/projects/foo");
  });

  test("cd into another window's path switches windows", () => {
    let s = reduce(freshState(), { type: "switch-window", window: "about" });
    s = reduce(s, { type: "set-cwd", windowKey: "about", path: "~/resume/experience" });
    expect(s.activeWindow).toBe("resume");
    expect(getPane(s, "resume").cwd).toBe("~/resume/experience");
    // the originating pane keeps its own cwd
    expect(getPane(s, "about").cwd).toBe("~/about");
  });

  test("cd ~ stays on the current window and sets its pane cwd to ~", () => {
    let s = reduce(freshState(), { type: "switch-window", window: "contact" });
    s = reduce(s, { type: "set-cwd", windowKey: "contact", path: "~" });
    expect(s.activeWindow).toBe("contact");
    expect(getPane(s, "contact").cwd).toBe("~");
  });

  test("prevCwd tracks the previous location for cd -", () => {
    let s = reduce(freshState(), { type: "switch-window", window: "projects" });
    s = reduce(s, { type: "set-cwd", windowKey: "projects", path: "~/projects/foo" });
    expect(getPane(s, "projects").prevCwd).toBe("~/projects");
  });
});

describe("scrollback", () => {
  test("append-line appends with monotonically increasing ids", () => {
    let s = freshState();
    s = reduce(s, { type: "append-line", windowKey: "lobby", command: "ls", node: null });
    s = reduce(s, { type: "append-line", windowKey: "lobby", command: null, node: "x" });
    const lines = activePane(s).scrollback;
    expect(lines).toHaveLength(2);
    expect(lines[0].command).toBe("ls");
    expect(lines[1].id).toBeGreaterThan(lines[0].id);
  });

  test("clear-scrollback empties only the targeted pane", () => {
    let s = freshState();
    s = reduce(s, { type: "append-line", windowKey: "lobby", command: "a", node: null });
    s = reduce(s, { type: "append-line", windowKey: "about", command: "b", node: null });
    s = reduce(s, { type: "clear-scrollback", windowKey: "lobby" });
    expect(activePane(s).scrollback).toHaveLength(0);
    expect(getPane(s, "about").scrollback).toHaveLength(1);
  });
});

describe("history", () => {
  test("appends and skips consecutive duplicates", () => {
    let s = freshState();
    s = reduce(s, { type: "history-append", line: "ls" });
    s = reduce(s, { type: "history-append", line: "ls" });
    s = reduce(s, { type: "history-append", line: "pwd" });
    expect(s.history).toEqual(["vim resume.md", "ls", "pwd"]);
  });

  test("walking up recalls the latest entry and saves the draft", () => {
    let s = freshState();
    s = reduce(s, { type: "history-append", line: "ls" });
    s = reduce(s, { type: "set-input", windowKey: "lobby", text: "dra", cursorPos: 3 });
    s = reduce(s, { type: "history-walk", windowKey: "lobby", direction: -1 });
    expect(activePane(s).inputBuffer).toBe("ls");
    s = reduce(s, { type: "history-walk", windowKey: "lobby", direction: 1 });
    expect(activePane(s).inputBuffer).toBe("dra");
    expect(activePane(s).historyIndex).toBe(null);
  });

  test("walking past the oldest entry stays on the oldest", () => {
    let s = freshState();
    s = reduce(s, { type: "history-walk", windowKey: "lobby", direction: -1 });
    s = reduce(s, { type: "history-walk", windowKey: "lobby", direction: -1 });
    expect(activePane(s).inputBuffer).toBe("vim resume.md");
  });
});

describe("notices and confirms", () => {
  test("set-notice and clear-notice round-trip", () => {
    let s = reduce(freshState(), { type: "set-notice", text: "nope", until: 123 });
    expect(s.notice?.text).toBe("nope");
    s = reduce(s, { type: "clear-notice" });
    expect(s.notice).toBe(null);
  });

  test("set-confirm stores a pending confirm", () => {
    const s = reduce(freshState(), {
      type: "set-confirm",
      confirm: { kind: "openUrl", payload: "https://example.com" },
    });
    expect(s.pendingConfirm?.payload).toBe("https://example.com");
  });
});

describe("vim integration", () => {
  test("apply-vim updates buffer, cursor and vim state", () => {
    let s = freshState();
    s = reduce(s, { type: "set-input", windowKey: "lobby", text: "foo bar", cursorPos: 0 });
    const vim = activePane(s).vim;
    s = reduce(s, {
      type: "apply-vim",
      windowKey: "lobby",
      text: "bar",
      pos: 0,
      vim: { ...vim, register: "foo " },
      toInsert: false,
    });
    expect(activePane(s).inputBuffer).toBe("bar");
    expect(activePane(s).cursorPos).toBe(0);
    expect(activePane(s).vim.register).toBe("foo ");
  });

  test("apply-vim with toInsert switches the pane to INSERT", () => {
    let s = freshState();
    s = reduce(s, { type: "set-mode", windowKey: "lobby", mode: "NORMAL" });
    s = reduce(s, {
      type: "apply-vim",
      windowKey: "lobby",
      text: "x",
      pos: 1,
      vim: activePane(s).vim,
      toInsert: true,
    });
    expect(activePane(s).mode).toBe("INSERT");
  });

  test("set-cursor moves the cursor without resetting a history walk", () => {
    let s = freshState();
    s = reduce(s, { type: "history-walk", windowKey: "lobby", direction: -1 });
    const idx = activePane(s).historyIndex;
    s = reduce(s, { type: "set-cursor", windowKey: "lobby", pos: 2 });
    expect(activePane(s).cursorPos).toBe(2);
    expect(activePane(s).historyIndex).toBe(idx);
  });

  test("flash-mode bumps the nonce", () => {
    let s = freshState();
    const before = s.flashNonce;
    s = reduce(s, { type: "flash-mode" });
    expect(s.flashNonce).toBe(before + 1);
  });
});

describe("visited flag", () => {
  test("mark-visited flips once", () => {
    const s = reduce(freshState(), { type: "mark-visited", window: "help" });
    expect(s.windows.help.visited).toBe(true);
  });
});
