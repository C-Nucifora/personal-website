import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { store } from "./store";
import { animateClick, finishAnimation } from "./animate";

function lobbyPane() {
  return store.getState().lobby.panes[0];
}

beforeEach(() => {
  vi.useFakeTimers();
  store.reset(null);
});

afterEach(() => {
  finishAnimation();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("animateClick (FLOW §5)", () => {
  test("types the command into the prompt, then executes after a beat", () => {
    animateClick("pwd");
    expect(store.getState().animating?.command).toBe("pwd");

    vi.advanceTimersByTime(15);
    expect(lobbyPane().inputBuffer).toBe("p");

    vi.advanceTimersByTime(60); // finish typing + part of the beat
    expect(lobbyPane().inputBuffer).toBe("pwd");
    expect(lobbyPane().scrollback).toHaveLength(0); // not yet executed

    vi.advanceTimersByTime(80); // past the 60ms beat
    expect(lobbyPane().scrollback.some((l) => l.command === "pwd")).toBe(true);
    expect(store.getState().animating).toBe(null);
  });

  test("caps total typing time at 250ms for long commands", () => {
    const long = "cd ~/projects/terminal-portfolio/src"; // 36 chars
    animateClick(long);
    vi.advanceTimersByTime(260);
    expect(lobbyPane().inputBuffer).toBe(long);
  });

  test("stashes and restores a partially typed command", () => {
    store.dispatch({ type: "set-input", windowKey: "lobby", text: "echo dra", cursorPos: 8 });
    animateClick("pwd");
    vi.advanceTimersByTime(400);
    expect(lobbyPane().scrollback.some((l) => l.command === "pwd")).toBe(true);
    expect(lobbyPane().inputBuffer).toBe("echo dra");
  });

  test("a second click completes the first instantly — never queues", () => {
    animateClick("pwd");
    vi.advanceTimersByTime(20);
    animateClick("echo two");
    // first command executed immediately at that point
    expect(lobbyPane().scrollback.some((l) => l.command === "pwd")).toBe(true);
    vi.advanceTimersByTime(400);
    expect(lobbyPane().scrollback.some((l) => l.command === "echo two")).toBe(true);
  });

  test("clicking in NORMAL mode returns to INSERT first", () => {
    store.dispatch({ type: "set-mode", windowKey: "lobby", mode: "NORMAL" });
    animateClick("pwd");
    expect(lobbyPane().mode).toBe("INSERT");
  });

  test("reduced motion executes instantly, still echoed", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    animateClick("pwd");
    expect(lobbyPane().scrollback.some((l) => l.command === "pwd")).toBe(true);
    expect(store.getState().animating).toBe(null);
  });
});
