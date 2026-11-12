import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Prompt } from "@/components/terminal/Prompt";
import { WindowPicker } from "@/components/terminal/WindowPicker";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";
import { animateClick, cancelAnimation } from "./animate";
import { executeCommand } from "./executor";
import { initKeyboard } from "./keyboard";
import { getPane } from "./reducer";
import { store } from "./store";
import type { WindowKey } from "./types";

// Unexecuted source challenges. The owner runs these under the shared lock.
let disposeKeyboard: () => void;
let open: ReturnType<typeof vi.fn>;

function pane(key: WindowKey = "lobby") {
  return getPane(store.getState(), key);
}

function draft(text: string, key: WindowKey = "lobby") {
  act(() => store.dispatch({ type: "set-input", windowKey: key, text, cursorPos: text.length }));
}

function fixture() {
  const view = render(
    <div data-terminal-root>
      {(["lobby", "projects"] as const).map((key) => (
        <div data-window={key} key={key}>
          <div data-pane-scroll data-pane-id={pane(key).id} tabIndex={0}>
            <Prompt windowKey={key} paneId={pane(key).id} />
          </div>
        </div>
      ))}
      <select aria-label="Native theme control"><option>One</option><option>Two</option></select>
      <WindowPicker />
    </div>,
  );
  const input = view.container.querySelector<HTMLInputElement>('[data-window="lobby"] input')!;
  input.focus();
  return input;
}

function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function picker(input: HTMLElement) {
  press(input, "b", { ctrlKey: true });
  press(input, "w");
  expect(screen.getByRole("dialog", { name: "Window picker" })).toBeInTheDocument();
}

type Pending = "prefix" | "picker" | "confirm" | "overlay" | "animation";

function pending(kind: Pending, input: HTMLElement) {
  act(() => {
    if (kind === "confirm") executeCommand("open https://example.invalid/keyboard", { source: "typed" });
    if (kind === "overlay") executeCommand("top", { source: "typed" });
    if (kind === "animation") animateClick("echo animation-fixture");
  });
  if (kind === "prefix") press(input, "b", { ctrlKey: true });
  if (kind === "picker") picker(input);
}

beforeEach(() => {
  vi.useFakeTimers();
  // Focus is explicit; no delayed RAF or reduced-motion animation shortcuts.
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in keyboard fixtures"); }));
  open = vi.fn();
  vi.stubGlobal("open", open);
  document.documentElement.setAttribute("data-view", "terminal");
  store.reset(null);
  for (const window of ACTIVE_WINDOW_IDS) store.dispatch({ type: "mark-visited", window });
  disposeKeyboard = initKeyboard();
});

afterEach(() => {
  disposeKeyboard();
  act(() => cancelAnimation());
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-view");
});

describe("Round 2 picker isolation from the real Prompt", () => {
  test("picker ArrowUp changes its row without replacing the shell draft from history", () => {
    const input = fixture();
    draft("echo unfinished");
    act(() => store.dispatch({ type: "history-append", line: "echo old-history" }));
    picker(input);
    press(input, "j");
    expect(store.getState().picker?.index).toBe(1);
    const event = press(input, "ArrowUp");
    expect(event.defaultPrevented).toBe(true);
    expect(store.getState().picker?.index).toBe(0);
    expect(pane().inputBuffer).toBe("echo unfinished");
    expect(pane().historyIndex).toBeNull();
  });

  test("picker Enter chooses the window without executing the origin draft there", () => {
    const input = fixture();
    const command = "echo must-remain-a-draft";
    draft(command);
    draft("echo destination-draft", "projects");
    const history = [...store.getState().history];
    picker(input);
    press(input, "j");
    press(input, "Enter");
    expect(store.getState().activeWindow).toBe("projects");
    expect(store.getState().picker).toBeNull();
    expect(pane("projects").scrollback.some((line) => line.command === command)).toBe(false);
    expect(pane().inputBuffer).toBe(command);
    expect(pane("projects").inputBuffer).toBe("echo destination-draft");
    expect(store.getState().history).toEqual(history);
  });

  test("picker Escape from the still-focused Prompt dismisses only the picker", () => {
    const input = fixture();
    draft("echo keep-mode");
    picker(input);
    expect(document.activeElement).toBe(input);
    press(input, "Escape");
    expect(store.getState().picker).toBeNull();
    expect(pane().mode).toBe("INSERT");
    expect(pane().inputBuffer).toBe("echo keep-mode");
  });

  test("control: after dismissal, a separate Escape can enter NORMAL and i returns to INSERT", () => {
    const input = fixture();
    draft("echo keep-mode");
    picker(input);
    press(input, "q");
    expect(pane().mode).toBe("INSERT");
    const region = input.parentElement!.parentElement!;
    press(input, "Escape");
    expect(pane().mode).toBe("NORMAL");
    region.focus();
    press(region, "i");
    expect(pane().mode).toBe("INSERT");
    expect(pane().inputBuffer).toBe("echo keep-mode");
  });

  test.each(["Enter", " "])("Tab preserves native picker-button activation with %j", (key) => {
    const input = fixture();
    draft("echo origin-draft");
    draft("echo destination-draft", "projects");
    const history = [...store.getState().history];
    picker(input);
    const before = store.getState().picker;
    expect(press(input, "Tab").defaultPrevented).toBe(false);
    expect(pane().inputBuffer).toBe("echo origin-draft");
    expect(store.getState().picker).toEqual(before);

    // jsdom does not traverse focus or activate buttons from synthetic keys.
    const button = screen.getByRole("button", { name: /projects/ });
    button.focus();
    const delivered = vi.fn();
    button.addEventListener("keydown", delivered);
    expect(press(button, key).defaultPrevented).toBe(false);
    expect(delivered).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
    expect(store.getState().picker).toEqual(before);
    fireEvent.click(button);
    expect(store.getState().picker).toBeNull();
    expect(store.getState().activeWindow).toBe("projects");
    expect(pane().inputBuffer).toBe("echo origin-draft");
    expect(pane("projects").inputBuffer).toBe("echo destination-draft");
    expect(store.getState().history).toEqual(history);
  });

  test("Escape after Tab reaches a picker button dismisses only the picker", () => {
    const input = fixture();
    draft("echo keep-mode");
    picker(input);
    expect(press(input, "Tab").defaultPrevented).toBe(false);
    // Focus traversal is explicit because the key event is synthetic.
    const button = screen.getByRole("button", { name: /projects/ });
    button.focus();
    const delivered = vi.fn();
    button.addEventListener("keydown", delivered);
    expect(press(button, "Escape").defaultPrevented).toBe(true);
    expect(delivered).not.toHaveBeenCalled();
    expect(store.getState().picker).toBeNull();
    expect(store.getState().activeWindow).toBeNull();
    expect(pane().mode).toBe("INSERT");
    expect(pane().inputBuffer).toBe("echo keep-mode");
  });
});

describe("Round 2 composition and native input controls", () => {
  test.each(["prefix", "picker", "confirm"] as const)("composing keys do not act on a pending %s", (kind) => {
    const input = fixture();
    draft("echo composing");
    pending(kind, input);
    const before = store.getState();
    fireEvent.compositionStart(input);
    for (const key of ["y", "n", "Enter", "ArrowUp"]) {
      expect(press(input, key, { isComposing: true }).defaultPrevented).toBe(false);
    }
    fireEvent.compositionEnd(input, { data: "日本語" });
    fireEvent.change(input, { target: { value: "echo 日本語" } });
    expect(pane().inputBuffer).toBe("echo 日本語");
    expect(pane().mode).toBe("INSERT");
    expect(store.getState().history).toEqual(before.history);
    expect(store.getState().pendingPrefix).toBe(before.pendingPrefix);
    expect(store.getState().picker).toEqual(before.picker);
    expect(store.getState().pendingConfirm).toEqual(before.pendingConfirm);
    expect(open).not.toHaveBeenCalled();
  });

  test("composing Escape cancels IME input without dismissing the picker", () => {
    const input = fixture();
    draft("echo composing");
    picker(input);
    const before = store.getState().picker;
    fireEvent.compositionStart(input);
    const event = press(input, "Escape", { isComposing: true });
    expect(event.defaultPrevented).toBe(false);
    expect(store.getState().picker).toEqual(before);
    expect(pane().mode).toBe("INSERT");
    expect(pane().inputBuffer).toBe("echo composing");
  });

  test.each(["prefix", "picker", "confirm"] as const)("dead keys and an AltGraph character keep native defaults with pending %s", (kind) => {
    const input = fixture();
    draft("echo layout");
    pending(kind, input);
    const before = store.getState();
    expect(press(input, "Dead").defaultPrevented).toBe(false);
    expect(press(input, "AltGraph", { ctrlKey: true, altKey: true }).defaultPrevented).toBe(false);
    const character = new KeyboardEvent("keydown", { key: "@", ctrlKey: true, altKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(character, "getModifierState", { value: (key: string) => key === "AltGraph" });
    act(() => { input.dispatchEvent(character); });
    expect(character.defaultPrevented).toBe(false);
    expect(pane().inputBuffer).toBe("echo layout");
    expect(store.getState().activeWindow).toBeNull();
    expect(store.getState().picker).toEqual(before.picker);
    expect(store.getState().pendingConfirm).toEqual(before.pendingConfirm);
    expect(open).not.toHaveBeenCalled();
  });

  test.each(["prefix", "picker", "confirm"] as const)("a focused native select keeps arrow and character keys with pending %s", (kind) => {
    const input = fixture();
    draft("echo untouched");
    pending(kind, input);
    const before = store.getState();
    const select = screen.getByRole("combobox");
    select.focus();
    for (const key of ["ArrowDown", "ArrowUp", "y", "n", "Enter"]) {
      expect(press(select, key).defaultPrevented).toBe(false);
    }
    expect(document.activeElement).toBe(select);
    expect(store.getState()).toBe(before);
    expect(open).not.toHaveBeenCalled();
  });
});

describe("Round 2 native shortcuts across pending terminal states", () => {
  test.each(["prefix", "picker", "confirm", "overlay", "animation"] as const)("copy/paste and browser shortcuts pass through pending %s", (kind) => {
    const input = fixture();
    draft("echo selected-draft");
    pending(kind, input);
    input.setSelectionRange(0, input.value.length);
    const before = store.getState();
    const shortcuts: Array<[string, KeyboardEventInit]> = [
      ["c", { ctrlKey: true }], ["v", { ctrlKey: true }], ["v", { ctrlKey: true, shiftKey: true }],
      ["x", { ctrlKey: true }], ["a", { ctrlKey: true }], ["f", { ctrlKey: true }],
      ["t", { ctrlKey: true }], ["w", { ctrlKey: true }], ["n", { ctrlKey: true }],
      ["ArrowLeft", { altKey: true }], ["F5", {}], ["Enter", { metaKey: true }],
    ];
    for (const [key, init] of shortcuts) {
      if (kind === "prefix" && !store.getState().pendingPrefix) press(input, "b", { ctrlKey: true });
      expect(press(input, key, init).defaultPrevented, `${kind}: ${key} ${JSON.stringify(init)}`).toBe(false);
    }
    // jsdom does not perform native paste; this checks that the event can reach the input.
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    act(() => { input.dispatchEvent(paste); });
    expect(paste.defaultPrevented).toBe(false);
    expect(pane().inputBuffer).toBe("echo selected-draft");
    expect(store.getState().history).toEqual(before.history);
    expect(store.getState().picker).toEqual(before.picker);
    expect(store.getState().pendingConfirm).toEqual(before.pendingConfirm);
    expect(store.getState().overlay).toBe(before.overlay);
    expect(store.getState().animating).toEqual(before.animating);
    expect(open).not.toHaveBeenCalled();
  });

  test("control: an ordinary typing key skips animation once and restores the draft", () => {
    const input = fixture();
    draft("echo saved-draft");
    pending("animation", input);
    expect(press(input, "x").defaultPrevented).toBe(true);
    expect(store.getState().animating).toBeNull();
    expect(pane().inputBuffer).toBe("echo saved-draft");
    expect(pane().scrollback.filter((line) => line.command === "echo animation-fixture")).toHaveLength(1);
  });

  test("an editor content target keeps native paste while tmux prefix still navigates", () => {
    fixture();
    act(() => store.dispatch({ type: "open-editor", windowKey: "lobby", path: "~/fixture.ts" }));
    // Only the dispatcher boundary is modeled; no CodeMirror, worker or clipboard is started.
    const editor = document.createElement("div");
    editor.className = "cm-editor";
    const content = document.createElement("div");
    content.className = "cm-content";
    content.contentEditable = "true";
    content.tabIndex = 0;
    editor.append(content);
    screen.getByRole("combobox").parentElement!.append(editor);
    content.focus();
    expect(press(content, "v", { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press(content, "v", { metaKey: true }).defaultPrevented).toBe(false);
    expect(press(content, "b", { ctrlKey: true }).defaultPrevented).toBe(true);
    press(content, "2");
    expect(store.getState().activeWindow).toBe("projects");
    expect(pane().view).toBe("editor");
    expect(pane().editorPath).toBe("~/fixture.ts");
  });
});
