import { afterEach, expect, test, vi } from "vitest";
import { focusActivePrompt } from "./focus";
import { store } from "./store";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("command focus returns to the editor content when a file is open", () => {
  store.reset(null);
  const paneId = store.getState().lobby.panes[0].id;
  document.body.innerHTML = `<div data-window="lobby"><div data-pane-id="${paneId}" tabindex="0"><div class="cm-content" tabindex="0"></div></div></div>`;
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  focusActivePrompt();
  expect(document.activeElement).toBe(document.querySelector(".cm-content"));
});

test("a theme selection keeps keyboard focus on the native select", () => {
  document.body.innerHTML = "<select><option>Theme</option></select>";
  const select = document.querySelector("select")!;
  select.focus();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  focusActivePrompt();
  expect(document.activeElement).toBe(select);
});
