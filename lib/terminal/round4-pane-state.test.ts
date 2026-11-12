import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { store } from "./store";
import { executeCommand } from "./executor";
import { initKeyboard } from "./keyboard";
import { getPane, getWindow } from "./reducer";
import type { Action, AppState, PaneLayout, PaneState, WindowKey } from "./types";

vi.mock("@/data/projects", () => ({ projects: [
  { slug: "pane-fixture", title: "Fixture", pitch: "Synthetic", stack: [] },
] }));
vi.mock("@/data/generated/site-source", () => ({ siteSource: { "pane-fixture": {
  "left/a.ts": "export const alpha = 1;\n", "right/b.ts": "export const beta = 2;\n",
} } }));
const ROOT = "~/projects/pane-fixture";
const FILES = [`${ROOT}/src/left/a.ts`, `${ROOT}/src/right/b.ts`];
let stop: () => void;
beforeEach(() => {
  store.reset("projects");
  for (const window of ["about", "projects", "resume", "contact", "help"] as const)
    store.dispatch({ type: "mark-visited", window });
  document.documentElement.removeAttribute("data-view");
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(min-width: 768px)" }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden"); }));
  stop = initKeyboard();
});
afterEach(() => { stop?.(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Line = { command: string | null; cwd?: string; text: unknown };
type Content = Pick<PaneState, "cwd" | "inputBuffer" | "cursorPos" | "historyIndex" |
  "view" | "editorPath" | "editorOffset"> & { lines: Line[] };
const fresh = (cwd: string): Content => ({ cwd, inputBuffer: "", cursorPos: 0,
  historyIndex: null, view: "shell", editorPath: null, editorOffset: null, lines: [] });
const project = (p: PaneState): Content => ({ cwd: p.cwd, inputBuffer: p.inputBuffer,
  cursorPos: p.cursorPos, historyIndex: p.historyIndex, view: p.view,
  editorPath: p.editorPath, editorOffset: p.editorOffset,
  lines: p.scrollback.map((l) => ({ command: l.command, cwd: l.cwd,
    text: renderToStaticMarkup(createElement(Fragment, null, l.node)).replace(/<[^>]*>/g, "") })) });
function leaves(l: PaneLayout): string[] {
  return l.type === "leaf" ? [l.paneId] : [...leaves(l.a), ...leaves(l.b)];
}
function shape(l: PaneLayout): unknown {
  return l.type === "leaf" ? l.paneId : [l.dir, shape(l.a), shape(l.b)];
}

// Content is a caller-owned ledger; no production layout helpers or reducer-derived expectations.
function session() {
  const state = () => store.getState();
  const win = () => state().windows.projects;
  const key = (): WindowKey => state().activeWindow ?? "lobby";
  const pane = () => getPane(state(), key());
  const ledger = new Map<string, Content>();
  for (const [k, w] of Object.entries(state().windows)) ledger.set(`${k}:${w.panes[0].id}`, fresh(`~/${k}`));
  ledger.set(`lobby:${state().lobby.panes[0].id}`, fresh("~"));
  const content = (id = pane().id, k: WindowKey = key()) => ledger.get(`${k}:${id}`)!;
  const history = [...state().history];
  const retained: Array<[AppState, string]> = [];
  let operations = 0;
  const immutable = () => { for (const [old, bytes] of retained) expect(JSON.stringify(old)).toBe(bytes); };
  function perform<T>(fn: () => T, cost = 1): T {
    operations += cost;
    expect(operations).toBeLessThanOrEqual(100);
    retained.push([state(), JSON.stringify(state())]);
    const result = fn(); immutable(); return result;
  }
  const dispatch = (a: Action) => perform(() => store.dispatch(a));
  const keypress = (k: string, ctrlKey = false) => window.dispatchEvent(
    new KeyboardEvent("keydown", { key: k, ctrlKey, bubbles: true, cancelable: true }));
  const prefix = (k: string) => perform(() => { keypress("b", true); keypress(k); }, 2);
  function check() {
    const live = new Set<string>();
    for (const [k, w] of Object.entries({ lobby: state().lobby, ...state().windows })) {
      const ids = w.panes.map((p) => p.id), layout = leaves(w.layout);
      expect(layout.length).toBe(ids.length);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(layout)).toEqual(new Set(ids));
      expect(ids).toContain(w.activePane);
      if (w.zoomed !== null) expect(ids).toContain(w.zoomed);
      expect(ids.length).toBeGreaterThanOrEqual(1);
      expect(ids.length).toBeLessThanOrEqual(4);
      for (const p of w.panes) { const id = `${k}:${p.id}`; live.add(id);
        expect(ledger.has(id)).toBe(true); expect(project(p)).toEqual(ledger.get(id)); }
    }
    expect(live).toEqual(new Set(ledger.keys()));
    expect(state().history).toEqual(history);
  }
  function input(text: string, cursorPos = text.length) {
    const m = content();
    dispatch({ type: "set-input", windowKey: key(), text, cursorPos });
    Object.assign(m, { inputBuffer: text, cursorPos, historyIndex: null }); check();
  }
  function shell() {
    const m = content();
    if (m.view === "editor") {
      dispatch({ type: "close-editor", windowKey: key() });
      Object.assign(m, { view: "shell", editorPath: null, editorOffset: null }); check();
    }
  }
  async function command(line: string, effect?: (origin: Content) => void, output?: string, destination: WindowKey = key()) {
    shell(); input("");
    const m = content(), cwd = m.cwd, target = getWindow(state(), destination).activePane;
    await perform(() => executeCommand(line, { source: "typed" })); immutable();
    expect(key()).toBe(destination); expect(pane().id).toBe(target);
    m.lines.push({ command: line, cwd, text: "" });
    if (output !== undefined) m.lines.push({ command: null, text: output });
    history.push(line); effect?.(m); check();
  }
  function focus(id: string) {
    if (win().zoomed !== null) prefix("z");
    dispatch({ type: "focus-pane", window: "projects", paneId: id });
    expect(win().activePane).toBe(id); check();
  }
  function split(k: "%" | '"') {
    const cwd = content().cwd, before = new Set(win().panes.map((p) => p.id));
    expect(win().panes.length).toBeLessThan(4); prefix(k);
    const added = win().panes.filter((p) => !before.has(p.id)); expect(added).toHaveLength(1);
    const m = fresh(cwd); m.lines.push({ command: null, text: expect.stringContaining(cwd) });
    ledger.set(`projects:${added[0].id}`, m); expect(win().activePane).toBe(added[0].id); check(); return added[0].id;
  }
  function close() {
    const id = pane().id; expect(win().panes.length).toBeGreaterThan(1);
    prefix("x"); expect(state().pendingConfirm).toEqual({ kind: "closePane", payload: id });
    perform(() => keypress("y")); ledger.delete(`projects:${id}`); expect(state().pendingConfirm).toBeNull(); check();
  }
  return { state, win, pane, content, history, dispatch, prefix, check, input, shell, command, focus, split, close };
}

test.each([0x153, 0x2a7, 0x4d1])("mixed pane content ledger, seed %i", async (seed) => {
  const h = session();
  h.prefix("1"); await h.command(`echo window-${seed}`, undefined, `window-${seed}`);
  h.input(`about-draft-${seed}`, 2); h.prefix("2"); h.check();
  let random = seed;
  const choose = (n: number) => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random % n; };
  for (let i = 0; i < 30; i++) {
    switch (i % 10) {
      case 0: h.split(choose(2) ? "%" : '"'); break;
      case 1: h.shell(); h.input(`draft-${seed}-${i}`, 3); break;
      case 2: {
        const path = [ROOT, `${ROOT}/src/left`, `${ROOT}/src/right`, "~"][choose(4)];
        await h.command(`cd ${path}`, (m) => { m.cwd = path; }); break;
      }
      case 3: await h.command(`echo token-${seed}-${i}`, undefined, `token-${seed}-${i}`); break;
      case 4: {
        const path = FILES[choose(2)];
        await h.command(`vim ${path}`, (m) => Object.assign(m, { view: "editor", editorPath: path })); break;
      }
      case 5: h.prefix("z"); expect(h.win().zoomed).toBe(h.pane().id); break;
      case 6: h.prefix("1"); expect(h.state().activeWindow).toBe("about"); h.check();
        h.prefix("2"); expect(h.state().activeWindow).toBe("projects"); break;
      case 7: h.focus(h.win().panes[choose(h.win().panes.length)].id); break;
      case 8: h.close(); break;
      case 9: h.split(choose(2) ? "%" : '"'); break;
    }
    h.check();
  }
});

test("nested geometry, zoom round trip and pruning preserve pane contents", async () => {
  const h = session(), a = h.pane().id;
  h.input("left-draft", 2); const b = h.split("%"); h.input("right-draft", 4);
  h.focus(a); const c = h.split('"'); await h.command(`vim ${FILES[0]}`, () =>
    Object.assign(h.content(c), { view: "editor", editorPath: FILES[0] }));
  expect(shape(h.win().layout)).toEqual(["row", ["col", a, c], b]);
  for (const [key, target] of [["k", a], ["j", c], ["l", b]] as const) {
    h.prefix(key); expect(h.win().activePane).toBe(target); h.check();
  }
  const start = h.pane().id, seen = new Set<string>();
  for (let i = 0; i < 3; i++) { h.prefix("o"); seen.add(h.pane().id); h.check(); }
  expect(seen).toEqual(new Set([a, b, c])); expect(h.pane().id).toBe(start);
  h.focus(c); const layout = JSON.stringify(h.win().layout);
  h.prefix("z"); expect(h.win().zoomed).toBe(c); h.prefix("z"); expect(h.win().zoomed).toBeNull();
  expect(JSON.stringify(h.win().layout)).toBe(layout); h.close();
  expect(shape(h.win().layout)).toEqual(["row", a, b]); h.focus(b); h.close();
  expect(shape(h.win().layout)).toBe(a); h.check();
});

test("shared history growth leaves another pane's recalled command and draft independent", async () => {
  const h = session(), a = h.pane().id;
  h.prefix("1"); await h.command("cd ~", (m) => { m.cwd = "~"; });
  h.input("about-draft", 2); h.prefix("2"); h.check();
  await h.command("echo first", undefined, "first"); h.input("saved-a", 2);
  h.dispatch({ type: "history-walk", windowKey: "projects", direction: -1 });
  Object.assign(h.content(a), { inputBuffer: "echo first", cursorPos: 10, historyIndex: h.history.length - 1 }); h.check();
  const b = h.split("%"); await h.command("echo second", undefined, "second"); h.input("saved-b", 3);
  h.focus(a); h.dispatch({ type: "history-walk", windowKey: "projects", direction: 1 });
  Object.assign(h.content(a), { inputBuffer: "echo second", cursorPos: 11, historyIndex: h.history.length - 1 }); h.check();
  h.dispatch({ type: "history-walk", windowKey: "projects", direction: 1 });
  Object.assign(h.content(a), { inputBuffer: "saved-a", cursorPos: 7, historyIndex: null }); h.check();
  await h.command(`cd ${ROOT}/src/left`, (m) => { m.cwd = `${ROOT}/src/left`; });
  await h.command("cd ~/about", () => { h.content(h.state().windows.about.activePane, "about").cwd = "~/about"; }, undefined, "about");
  expect(h.state().activeWindow).toBe("about"); h.prefix("2"); h.check();
  await h.command("cd -", (m) => { m.cwd = "~/projects"; });
  await h.command(`vim ${FILES[0]}`, (m) => Object.assign(m, { view: "editor", editorPath: FILES[0] }));
  h.dispatch({ type: "open-editor", windowKey: "projects", path: FILES[1], offset: 6 });
  Object.assign(h.content(a), { editorPath: FILES[1], editorOffset: 6 }); h.check();
  h.focus(b); h.close(); h.prefix("1"); h.prefix("2"); h.check();
  expect(h.pane().id).toBe(a); expect(h.pane().editorOffset).toBe(6); h.shell(); h.check();
});
