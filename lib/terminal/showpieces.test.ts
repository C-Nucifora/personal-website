import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { activePane } from "./reducer";
import { store } from "./store";
import { executeCommand } from "./executor";
import { initIdle, IDLE_MS } from "./idle";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("rm -rf / --no-preserve-root (EASTER_EGGS §4.2)", () => {
  beforeEach(() => store.reset(null));

  test("destroys nothing: state deep-equals before, minus the echo + history append", () => {
    executeCommand("pwd", { source: "typed" });
    const before = store.getState();

    executeCommand("rm -rf / --no-preserve-root", { source: "typed" });
    const after = store.getState();

    // The egg runs as a pure overlay; the command itself behaves like any
    // other: one echo line, one history entry, nothing else.
    expect(after.history).toEqual([...before.history, "rm -rf / --no-preserve-root"]);
    const afterLines = activePane(after).scrollback;
    const beforeLines = activePane(before).scrollback;
    expect(afterLines.slice(0, beforeLines.length)).toEqual(beforeLines);
    expect(afterLines[afterLines.length - 1].command).toBe("rm -rf / --no-preserve-root");

    const scrub = (s: typeof after) => ({
      ...s,
      overlay: null,
      history: [],
      nextLineId: 0,
      lobby: {
        ...s.lobby,
        panes: s.lobby.panes.map((p) => ({ ...p, scrollback: [] })),
      },
    });
    expect(scrub({ ...after })).toEqual(scrub({ ...before }));
  });

  test("triggers the disintegration overlay on capable machines", () => {
    executeCommand("rm -rf / --no-preserve-root", { source: "typed" });
    expect(store.getState().overlay).toBe("disintegration");
  });

  test("reduced motion gets the static punchline instead", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    executeCommand("rm -rf / --no-preserve-root", { source: "typed" });
    expect(store.getState().overlay).toBe(null);
    const last = activePane(store.getState()).scrollback.at(-1);
    expect(String(last?.node ? "set" : "")).toBe("set");
  });
});

describe("idle screensaver (EASTER_EGGS §4.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.reset(null);
  });

  test("three idle minutes start the matrix", () => {
    const dispose = initIdle();
    vi.advanceTimersByTime(IDLE_MS + 1000);
    expect(store.getState().overlay).toBe("matrix");
    dispose();
  });

  test("input resets the timer", () => {
    const dispose = initIdle();
    vi.advanceTimersByTime(IDLE_MS - 5000);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    vi.advanceTimersByTime(10_000);
    expect(store.getState().overlay).toBe(null);
    dispose();
  });

  test("suspends while another overlay is active", () => {
    const dispose = initIdle();
    store.dispatch({ type: "set-overlay", overlay: "clock" });
    vi.advanceTimersByTime(IDLE_MS + 1000);
    expect(store.getState().overlay).toBe("clock");
    dispose();
  });
});
