import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Prompt } from "@/components/terminal/Prompt";
import { WindowPicker } from "@/components/terminal/WindowPicker";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";
import { initKeyboard } from "./keyboard";
import { activePane, activeWindowKey, getWindow } from "./reducer";
import { store } from "./store";
import { useTerminalStore } from "./useTerminalStore";

// Prepared for owner execution. Synthetic keys do not test native IME or Tab traversal.
let disposeKeyboard: () => void;

function Fixture() {
  const state = useTerminalStore((s) => s);
  return (
    <div data-terminal-root>
      {(["lobby", ...ACTIVE_WINDOW_IDS] as const).map((key) => (
        <div data-window={key} key={key} hidden={activeWindowKey(state) !== key}>
          {getWindow(state, key).panes.map((pane) => (
            <div data-pane-scroll data-pane-id={pane.id} tabIndex={0} key={pane.id}>
              <Prompt windowKey={key} paneId={pane.id} />
            </div>
          ))}
        </div>
      ))}
      <WindowPicker />
    </div>
  );
}

function input() {
  const state = store.getState();
  const target = document.querySelector<HTMLInputElement>(
    `[data-window="${activeWindowKey(state)}"] [data-pane-id="${activePane(state).id}"] input`,
  );
  if (!target) throw new Error("The active pane has no input");
  target.focus();
  return target;
}

function press(key: string, init: KeyboardEventInit = {}) {
  const target = input();
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function prefix(key: string) {
  press("b", { ctrlKey: true });
  expect(store.getState().pendingPrefix).toBe(true);
  press(key);
  expect(store.getState().pendingPrefix).toBe(false);
}

beforeEach(() => {
  // Splits are enabled; focus is explicit and no animation frames are scheduled.
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)" }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in review fixtures"); }));
  vi.stubGlobal("open", vi.fn());
  document.documentElement.setAttribute("data-view", "terminal");
  store.reset("about");
  store.dispatch({ type: "mark-visited", window: "about" });
  disposeKeyboard = initKeyboard();
});

afterEach(() => {
  disposeKeyboard();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-view");
});

describe("Round 2 independent confirmation ownership", () => {
  test("accepting a URL confirmation consumes y before editor DOM listeners", () => {
    render(<Fixture />);
    const command = "open https://fixture.invalid";
    fireEvent.change(input(), { target: { value: command } });
    press("Enter");
    expect(store.getState().pendingConfirm).toEqual({ kind: "openUrl", payload: "https://fixture.invalid" });
    const editor = document.createElement("div");
    editor.className = "cm-editor";
    const content = document.createElement("div");
    content.className = "cm-content";
    content.tabIndex = 0;
    editor.append(content);
    input().closest("[data-pane-scroll]")!.append(editor);
    const delivered = vi.fn();
    editor.addEventListener("keydown", delivered);
    content.focus();
    const event = new KeyboardEvent("keydown", { key: "y", bubbles: true, cancelable: true });
    act(() => { content.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(delivered).not.toHaveBeenCalled();
    expect(store.getState().pendingConfirm).toBeNull();
    expect(window.open).toHaveBeenCalledExactlyOnceWith("https://fixture.invalid", "_blank", "noopener,noreferrer");
    editor.remove();
  });

  test.each(["Escape", "n"])("cancelling pane close with %s preserves INSERT and the draft cursor", (key) => {
    render(<Fixture />);
    prefix("2");
    prefix("%");
    const target = input();
    fireEvent.change(target, { target: { value: "echo unfinished" } });
    target.setSelectionRange(5, 5);
    fireEvent.select(target);
    const before = activePane(store.getState());
    const history = [...store.getState().history];
    expect(store.getState().windows.projects.panes).toHaveLength(2);
    expect(before.mode).toBe("INSERT");
    expect(before.cursorPos).toBe(5);

    prefix("x");
    expect(store.getState().pendingConfirm).toEqual({ kind: "closePane", payload: before.id });
    expect(press(key).defaultPrevented).toBe(true);
    expect(store.getState().pendingConfirm).toBeNull();
    expect(store.getState().windows.projects.panes).toHaveLength(2);
    expect(activePane(store.getState()).mode).toBe("INSERT");
    expect(activePane(store.getState()).inputBuffer).toBe(before.inputBuffer);
    expect(activePane(store.getState()).cursorPos).toBe(before.cursorPos);
    expect(store.getState().history).toEqual(history);
    expect(window.open).not.toHaveBeenCalled();
  });
});

test("picker visits a fresh window once, restores COPY, and releases the next shell Enter", () => {
  render(<Fixture />);
  fireEvent.change(input(), { target: { value: "echo origin-draft" } });
  act(() => store.dispatch({
    type: "set-input", windowKey: "projects", text: "echo destination-draft", cursorPos: 22,
  }));
  const history = [...store.getState().history];
  expect(store.getState().windows.projects.visited).toBe(false);
  prefix("[");
  expect(activePane(store.getState()).mode).toBe("COPY");
  prefix("w");
  press("ArrowDown");
  press("Enter");
  expect(store.getState().activeWindow).toBe("projects");
  expect(store.getState().picker).toBeNull();
  expect(store.getState().windows.projects.visited).toBe(true);
  expect(store.getState().history).toEqual([...history, "ls"]);
  expect(activePane(store.getState()).inputBuffer).toBe("echo destination-draft");
  expect(store.getState().windows.about.panes[0].inputBuffer).toBe("echo origin-draft");
  expect(store.getState().windows.about.panes[0].mode).toBe("COPY");

  prefix("w");
  press("ArrowUp");
  press("Enter");
  expect(store.getState().activeWindow).toBe("about");
  expect(activePane(store.getState()).mode).toBe("COPY");
  prefix("w");
  press("Escape");
  expect(store.getState().picker).toBeNull();
  expect(activePane(store.getState()).mode).toBe("COPY");
  press("q");
  expect(activePane(store.getState()).mode).toBe("INSERT");

  prefix("w");
  press("2");
  expect(store.getState().activeWindow).toBe("projects");
  expect(activePane(store.getState()).scrollback.filter((line) => line.command === "ls")).toHaveLength(1);
  expect(store.getState().history).toEqual([...history, "ls"]);
  press("Enter");
  expect(activePane(store.getState()).scrollback.filter((line) => line.command === "echo destination-draft")).toHaveLength(1);
  expect(activePane(store.getState()).inputBuffer).toBe("");
  expect(store.getState().windows.about.panes[0].inputBuffer).toBe("echo origin-draft");
  expect(store.getState().history).toEqual([...history, "ls", "echo destination-draft"]);
});
