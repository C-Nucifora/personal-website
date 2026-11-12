import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initKeyboard } from "@/lib/terminal/keyboard";
import { store } from "@/lib/terminal/store";
import type { PaneLayout } from "@/lib/terminal/types";

// Private preparation only. No execution or rendered-layout evidence.
let stop: () => void;

function press(key: string, ctrlKey = false) {
  window.dispatchEvent(new KeyboardEvent("keydown", {
    key, ctrlKey, bubbles: true, cancelable: true,
  }));
}

function prefix(key: string) {
  press("b", true);
  press(key);
}

function leaves(layout: PaneLayout): string[] {
  return layout.type === "leaf" ? [layout.paneId] : [...leaves(layout.a), ...leaves(layout.b)];
}

beforeEach(() => {
  store.reset("projects");
  store.dispatch({ type: "mark-visited", window: "projects" });
  document.documentElement.removeAttribute("data-view");
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)" }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in pruning fixture"); }));
  stop = initKeyboard();
});

afterEach(() => {
  stop?.();
  store.reset(null);
  vi.unstubAllGlobals();
});

test.each([
  { root: "%", nested: '"', nestedDir: "col" },
  { root: '"', nested: "%", nestedDir: "row" },
])("closing the right child beside a split sibling prunes the parent, root $root", ({ root, nested, nestedDir }) => {
  const win = () => store.getState().windows.projects;
  const a = win().activePane;
  prefix(root);
  const b = win().activePane;
  prefix("o");
  expect(win().activePane).toBe(a);
  prefix(nested);
  const c = win().activePane;
  expect(new Set([a, b, c]).size).toBe(3);
  expect(leaves(win().layout)).toEqual([a, c, b]);
  prefix("o");
  expect(win().activePane).toBe(b);
  const before = store.getState();
  const beforeBytes = JSON.stringify(before);
  prefix("x");
  expect(store.getState().pendingConfirm).toEqual({ kind: "closePane", payload: b });
  press("y");
  expect(store.getState().pendingConfirm).toBeNull();
  expect(win().panes).toEqual(before.windows.projects.panes.filter((pane) => pane.id !== b));
  expect(win().panes).toHaveLength(2);
  expect(leaves(win().layout)).toEqual([a, c]);
  expect(win().layout).toMatchObject({
    type: "split", dir: nestedDir, ratio: 0.5,
    a: { type: "leaf", paneId: a }, b: { type: "leaf", paneId: c },
  });
  expect(win().activePane).toBe(a);
  expect(win().zoomed).toBeNull();
  prefix("o");
  expect(win().activePane).toBe(c);
  prefix("o");
  expect(win().activePane).toBe(a);
  expect(JSON.stringify(before)).toBe(beforeBytes);
});
