import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { store } from "./store";
import { initKeyboard } from "./keyboard";

let cleanup: (() => void) | null = null;

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

beforeEach(() => {
  store.reset(null);
  cleanup = initKeyboard();
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
  vi.unstubAllGlobals();
});

describe("tmux prefix (FLOW §7.2)", () => {
  test("Ctrl+b arms the prefix, a digit jumps to that window", () => {
    press("b", { ctrlKey: true });
    expect(store.getState().pendingPrefix).toBe(true);
    press("2");
    expect(store.getState().pendingPrefix).toBe(false);
    expect(store.getState().activeWindow).toBe("projects");
    // first activation auto-displays
    expect(
      store.getState().windows.projects.panes[0].scrollback.some((l) => l.command === "ls"),
    ).toBe(true);
  });

  test("n and p cycle windows", () => {
    press("b", { ctrlKey: true });
    press("n");
    expect(store.getState().activeWindow).toBe("about");
    press("b", { ctrlKey: true });
    press("n");
    expect(store.getState().activeWindow).toBe("projects");
    press("b", { ctrlKey: true });
    press("p");
    expect(store.getState().activeWindow).toBe("about");
  });

  test("an unbound key cancels the prefix silently", () => {
    press("b", { ctrlKey: true });
    press("q");
    expect(store.getState().pendingPrefix).toBe(false);
    expect(store.getState().activeWindow).toBe(null);
  });

  test("Escape cancels the prefix", () => {
    press("b", { ctrlKey: true });
    press("Escape");
    expect(store.getState().pendingPrefix).toBe(false);
  });
});

describe("pending confirms", () => {
  test("y opens the confirmed url in a new tab", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    store.dispatch({
      type: "set-confirm",
      confirm: { kind: "openUrl", payload: "https://example.com" },
    });
    press("y");
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    expect(store.getState().pendingConfirm).toBe(null);
  });

  test("n cancels the confirm", () => {
    store.dispatch({
      type: "set-confirm",
      confirm: { kind: "openUrl", payload: "https://example.com" },
    });
    press("n");
    expect(store.getState().pendingConfirm).toBe(null);
  });
});

describe("animation skip", () => {
  test("any keypress completes a running click animation", async () => {
    vi.useFakeTimers();
    const { animateClick } = await import("./animate");
    animateClick("pwd");
    vi.advanceTimersByTime(20);
    press("x");
    expect(
      store.getState().lobby.panes[0].scrollback.some((l) => l.command === "pwd"),
    ).toBe(true);
    expect(store.getState().animating).toBe(null);
    vi.useRealTimers();
  });
});

describe("Ctrl+l", () => {
  test("clears the active pane", () => {
    store.dispatch({ type: "append-line", windowKey: "lobby", command: "x", node: null });
    press("l", { ctrlKey: true });
    expect(store.getState().lobby.panes[0].scrollback).toHaveLength(0);
  });
});
