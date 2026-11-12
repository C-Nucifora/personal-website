import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Prompt } from "@/components/terminal/Prompt";
import { initKeyboard } from "./keyboard";
import { activeWindowKey, getPane } from "./reducer";
import { store } from "./store";
import { useTerminalStore } from "./useTerminalStore";
import type { WindowKey } from "./types";

// Preparation only. Intended destination: lib/terminal/round4-line-editing.test.tsx.
const pathText = "~/notes/cafe\u0301 😀 plan.md";
let disposeKeyboard: () => void;

function pane(key: WindowKey = activeWindowKey(store.getState())) {
  return getPane(store.getState(), key);
}

function Shells() {
  const state = useTerminalStore((s) => s);
  return <div data-terminal-root>{(["lobby", "about"] as const).map((key) => {
    const p = getPane(state, key);
    return <div data-window={key} key={key}>
      <div data-pane-scroll data-pane-id={p.id} tabIndex={0}>
        <Prompt windowKey={key} paneId={p.id} />
        <div data-output>{p.scrollback.filter((line) => line.command === null).map((line) =>
          <div key={line.id}>{line.node}</div>)}</div>
      </div>
    </div>;
  })}</div>;
}

function region(key: WindowKey = activeWindowKey(store.getState())) {
  return document.querySelector<HTMLElement>(`[data-window="${key}"] [data-pane-scroll]`)!;
}

function input() {
  return region().querySelector<HTMLInputElement>("input")!;
}

function press(key: string, init: KeyboardEventInit = {}) {
  const target = region().querySelector<HTMLInputElement>("input") ?? region();
  target.focus();
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function enterText(text: string) {
  // Models the native input result; jsdom does not perform clipboard insertion.
  fireEvent.change(input(), { target: { value: text, selectionStart: text.length } });
  expect(input().value).toBe(text);
  expect(pane().inputBuffer).toBe(text);
}

function output() {
  return region().querySelector("[data-output]")!.lastElementChild?.textContent;
}

function submit(text: string) {
  enterText(text);
  press("Enter");
}

function about() {
  press("b", { ctrlKey: true });
  press("1");
  expect(store.getState().activeWindow).toBe("about");
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in line fixtures"); }));
  document.documentElement.setAttribute("data-view", "terminal");
  store.reset(null);
  // Isolate history from the independently covered first-entry auto-display.
  store.dispatch({ type: "mark-visited", window: "about" });
  disposeKeyboard = initKeyboard();
  render(<Shells />);
});

afterEach(() => {
  disposeKeyboard();
  cleanup();
  store.reset(null);
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-view");
});

describe("Round 4 literal input and completion", () => {
  test.each(["'", '"'])("completion preserves a preceding %s-quoted Unicode path literally", (quote) => {
    const literal = `${quote}${pathText}${quote}`;
    enterText("echo replace-me");
    input().setSelectionRange(5, input().value.length);
    expect(press("c", { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press("v", { ctrlKey: true }).defaultPrevented).toBe(false);
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    act(() => { input().dispatchEvent(paste); });
    expect(paste.defaultPrevented).toBe(false);
    enterText(`echo ${literal}  ~/about/ab`);
    expect(press("Tab").defaultPrevented).toBe(true);
    expect(input().value).toBe(`echo ${literal}  ~/about/about.md `);
    press("Enter");
    expect(output()).toBe(`${literal}  ~/about/about.md`);
    expect(pane().scrollback.filter((line) => line.command !== null).map((line) => line.command))
      .toEqual([`echo ${literal}  ~/about/about.md`]);
    expect(store.getState().history.at(-1)).toBe(`echo ${literal}  ~/about/about.md`);
  });
});

describe("Round 4 quote objects preserve complete Unicode payloads", () => {
  test.each(["'", '"'])("delete, undo, redo and internal paste round-trip a %s-quoted path", (quote) => {
    const original = `echo ${quote}${pathText}${quote} tail`;
    const empty = `echo ${quote}${quote} tail`;
    enterText(original);
    press("Escape");
    expect(pane().mode).toBe("NORMAL");
    for (const key of ["0", "f", quote, "d", "i", quote]) press(key);
    expect(pane().inputBuffer).toBe(empty);
    expect(pane().vim.register).toBe(pathText);
    press("u");
    expect(pane().inputBuffer).toBe(original);
    press("r", { ctrlKey: true });
    expect(pane().inputBuffer).toBe(empty);
    press("P");
    expect(pane().inputBuffer).toBe(original);
    // A returns to native input at the end, outside any Unicode sequence.
    press("A");
    expect(input().value).toBe(original);
    press("Enter");
    expect(output()).toBe(`${quote}${pathText}${quote} tail`);
    expect(store.getState().history.at(-1)).toBe(original);
  });
});

describe("Round 4 shared history through the real Prompt and dispatcher", () => {
  test("arrows, k/j and numbered replay preserve literal text and another shell's draft", () => {
    const command = `echo "${pathText}"  keep`;
    submit(command);
    const number = store.getState().history.length;
    enterText("echo lobby draft 😀");
    about();
    const draft = "echo about draft e\u0301";
    enterText(draft);
    press("ArrowUp");
    expect(input().value).toBe(command);
    press("ArrowDown");
    expect(input().value).toBe(draft);
    press("Escape");
    press("k");
    expect(pane().inputBuffer).toBe(command);
    press("j");
    expect(pane().inputBuffer).toBe(draft);
    press("A");
    submit(`!${number}`);
    expect(output()).toBe(`"${pathText}"  keep`);
    expect(pane().scrollback.filter((line) => line.command !== null).map((line) => line.command))
      .toEqual([command]);
    expect(pane("lobby").inputBuffer).toBe("echo lobby draft 😀");
  });

  test.each(["INSERT", "NORMAL"] as const)("after %s submits a recalled command, Up starts at the latest entry", (mode) => {
    submit('echo "earlier 😀"');
    const latest = `echo '${pathText}'  latest`;
    submit(latest);
    enterText("echo origin draft");
    about();
    enterText("echo destination draft");
    if (mode === "NORMAL") press("Escape");
    press(mode === "NORMAL" ? "k" : "ArrowUp");
    expect(pane().inputBuffer).toBe(latest);
    press("Enter");
    expect(pane().mode).toBe("INSERT");
    expect(input().value).toBe("");
    expect(output()).toBe(`'${pathText}'  latest`);
    press("ArrowUp");
    expect(input().value).toBe(latest);
    press("ArrowDown");
    expect(input().value).toBe("");
    expect(pane("lobby").inputBuffer).toBe("echo origin draft");
  });
});
