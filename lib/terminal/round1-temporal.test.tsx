import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { act, fireEvent, render } from "@testing-library/react";
import type { WindowKey } from "./types";

vi.mock("@/data/projects", () => ({
  projects: [{ slug: "audit-fixture", title: "Fixture", pitch: "Synthetic", stack: [] }],
}));
vi.mock("@/data/generated/site-source", () => ({ siteSource: {} }));
// Only pane focus and prompt state matter here; avoid editor workers and jsdom scrolling.
vi.mock("@/components/editor/VimViewer", () => ({ VimViewer: () => null }));
vi.mock("@/components/terminal/PaneScrollback", () => ({ PaneScrollback: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const ROOT = "~/projects/audit-fixture";
const FILE = `${ROOT}/src/first.txt`;
const CAT = `cat ${FILE}`;
const fixture = {
  githubSources: {
    "audit-fixture": { "src/first.txt": "first synthetic file", "src/second.txt": "second synthetic file" },
  },
};

let source: ReturnType<typeof deferred<typeof fixture>>;
let entered: ReturnType<typeof deferred<void>>;
let importCount: number;
let store: typeof import("./store").store;
let executeCommand: typeof import("./executor").executeCommand;
let animate: typeof import("./animate");
let reducer: typeof import("./reducer");
let loader: typeof import("@/lib/vfs/project-sources");
let routing: typeof import("./routing");
let cleanups: Array<() => void>;

beforeEach(async () => {
  vi.resetModules();
  source = deferred<typeof fixture>();
  entered = deferred<void>();
  importCount = 0;
  cleanups = [];
  vi.doMock("@/data/generated/github-sources", async () => {
    importCount += 1;
    entered.resolve();
    return source.promise;
  });
  ({ store } = await import("./store"));
  ({ executeCommand } = await import("./executor"));
  animate = await import("./animate");
  reducer = await import("./reducer");
  loader = await import("@/lib/vfs/project-sources");
  routing = await import("./routing");
  store.reset(null);
  // Prevent unrelated first-entry content from entering these fixtures.
  for (const window of ["about", "projects", "resume", "contact", "help"] as const) {
    store.dispatch({ type: "mark-visited", window });
  }
  window.history.replaceState({}, "", "/");
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in temporal fixtures"); }));
});

afterEach(() => {
  animate.finishAnimation();
  cleanups.forEach((cleanup) => cleanup());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pane(key: WindowKey = "lobby") {
  return reducer.getPane(store.getState(), key);
}

function echoes(key: WindowKey = "lobby") {
  return pane(key).scrollback.flatMap((line) => line.command === null ? [] : [line.command]);
}

function draft(key: WindowKey, text: string) {
  store.dispatch({ type: "set-input", windowKey: key, text, cursorPos: text.length });
}

function projects() {
  store.dispatch({ type: "switch-window", window: "projects" });
  store.dispatch({ type: "set-cwd", windowKey: "projects", path: ROOT });
}

function split() {
  store.dispatch({ type: "split-pane", window: "projects", dir: "row" });
  return pane("projects").id;
}

function focus(paneId: string) {
  store.dispatch({ type: "focus-pane", window: "projects", paneId });
}

async function settle(jobs: Array<void | Promise<void>>, fail = false) {
  await entered.promise;
  if (fail) source.reject(new Error("synthetic offline import"));
  else source.resolve(fixture);
  await Promise.all(jobs);
}

describe("Round 1 deferred source boundaries", () => {
  test("the actual loader shares one import and grafts synthetic files before completion", async () => {
    const first = loader.loadProjectSources();
    const second = loader.loadProjectSources();
    expect(first).toBe(second);
    expect(loader.projectSourcesLoaded()).toBe(false);
    await settle([first, second]);
    expect(importCount).toBe(1);
    expect(loader.projectSourcesLoaded()).toBe(true);
    const { readFile } = await import("@/lib/vfs/tree");
    expect(readFile(FILE)?.raw).toBe("first synthetic file");
    await loader.loadProjectSources();
    expect(importCount).toBe(1);
  });

  test("two concurrent source commands complete once each with unique scrollback IDs", async () => {
    const second = `cat ${ROOT}/src/second.txt`;
    await settle([
      executeCommand(CAT, { source: "typed" }),
      executeCommand(second, { source: "typed" }),
    ]);
    expect(echoes()).toEqual([CAT, second]);
    expect(pane().scrollback).toHaveLength(4);
    expect(new Set(pane().scrollback.map((line) => line.id)).size).toBe(4);
    expect(store.getState().history.slice(-2)).toEqual([CAT, second]);
    expect(importCount).toBe(1);
  });

  test("history expansion captures the selected command before unrelated history grows", async () => {
    store.dispatch({ type: "history-append", line: CAT });
    const pending = executeCommand("!2", { source: "typed" });
    executeCommand("echo later", { source: "typed" });
    await settle([pending]);
    expect(echoes()).toEqual(["echo later", CAT]);
    expect(store.getState().history).toEqual(["vim resume.md", CAT, "echo later", CAT]);
  });

  test("a successful delayed command is discarded after its cwd changes", async () => {
    projects();
    const pending = executeCommand("cat src/first.txt", { source: "typed" });
    executeCommand("cd ~/projects", { source: "typed" });
    const before = pane("projects");
    await settle([pending]);
    expect(pane("projects")).toEqual(before);
    expect(store.getState().notice?.text).toContain("Run the command again");
  });

  test("a successful delayed command cannot move into a newly focused pane", async () => {
    projects();
    const pending = executeCommand(CAT, { source: "typed" });
    split();
    const before = pane("projects");
    await settle([pending]);
    expect(pane("projects")).toEqual(before);
    expect(echoes("projects")).not.toContain(CAT);
  });

  test("closing and recreating a pane does not reuse its ID or accept its successful result", async () => {
    projects();
    const oldId = split();
    const pending = executeCommand(CAT, { source: "typed" });
    store.dispatch({ type: "close-pane", window: "projects", paneId: oldId });
    const newId = split();
    const before = pane("projects");
    await settle([pending]);
    expect(newId).not.toBe(oldId);
    expect(pane("projects")).toEqual(before);
  });

  test("an unchanged background shell receives its read result without changing the active window", async () => {
    projects();
    const pending = executeCommand(CAT, { source: "typed" });
    store.dispatch({ type: "switch-window", window: "resume" });
    const resume = pane("resume");
    await settle([pending]);
    expect(echoes("projects")).toEqual([CAT]);
    expect(store.getState().activeWindow).toBe("resume");
    expect(pane("resume")).toEqual(resume);
  });

  test("an offline result stays in its original unchanged shell", async () => {
    const pending = executeCommand(CAT, { source: "typed" });
    await settle([pending], true);
    expect(echoes()).toEqual([CAT]);
    expect(renderToStaticMarkup(<>{pane().scrollback.at(-1)?.node}</>)).toContain("Source unavailable offline");
    expect(loader.projectSourcesLoaded()).toBe(false);
  });

  test("a rejected delayed command cannot append after its cwd changes", async () => {
    projects();
    const pending = executeCommand("cat src/first.txt", { source: "typed" });
    executeCommand("cd ~/projects", { source: "typed" });
    const before = pane("projects");
    const history = store.getState().history;
    await settle([pending], true);
    expect(pane("projects")).toEqual(before);
    expect(store.getState().history).toEqual(history);
    expect(store.getState().notice?.text).toContain("Source unavailable offline");
  });

  test("an offline result still reaches an unchanged background shell after history navigation", async () => {
    projects();
    cleanups.push(routing.initRouting());
    const pending = executeCommand(CAT, { source: "typed" });
    window.history.replaceState({}, "", "/resume/");
    window.dispatchEvent(new Event("terminal:popstate"));
    const resume = pane("resume");
    await settle([pending], true);
    expect(echoes("projects")).toEqual([CAT]);
    expect(renderToStaticMarkup(<>{pane("projects").scrollback.at(-1)?.node}</>)).toContain("Source unavailable offline");
    expect(pane("resume")).toEqual(resume);
    expect(store.getState().activeWindow).toBe("resume");
    expect(window.location.pathname).toBe("/resume/");
  });

  test.each(["focus", "close and recreate"] as const)(
    "a rejected source import does not append into another pane after %s",
    async (transition) => {
      projects();
      const oldId = split();
      const pending = executeCommand(CAT, { source: "typed" });
      if (transition === "focus") focus("projects-p1");
      else {
        store.dispatch({ type: "close-pane", window: "projects", paneId: oldId });
        split();
      }
      const before = pane("projects");
      await settle([pending], true);
      expect(pane("projects")).toEqual(before);
    },
  );

  test("a deferred cd cannot override a later browser history navigation", async () => {
    cleanups.push(routing.initRouting());
    const pending = executeCommand(`cd ${ROOT}/src`, { source: "typed" });
    window.history.replaceState({}, "", "/resume/");
    window.dispatchEvent(new Event("terminal:popstate"));
    expect(store.getState().activeWindow).toBe("resume");
    await settle([pending]);
    expect.soft(store.getState().activeWindow).toBe("resume");
    expect.soft(window.location.pathname).toBe("/resume/");
  });

  test.each(["history", "window switch"] as const)(
    "a deferred cd stays cancelled after navigating away and back by %s",
    async (method) => {
      cleanups.push(routing.initRouting());
      const command = `cd ${ROOT}/src`;
      const pending = executeCommand(command, { source: "typed" });
      for (const destination of ["resume", null] as const) {
        if (method === "history") {
          window.history.replaceState({}, "", routing.pathForWindow(destination));
          window.dispatchEvent(new Event("terminal:popstate"));
        } else store.dispatch({ type: "switch-window", window: destination });
      }
      const lobby = pane();
      const project = pane("projects");
      await settle([pending]);
      expect(store.getState().activeWindow).toBe(null);
      expect(window.location.pathname).toBe("/");
      expect(pane()).toEqual(lobby);
      expect(pane("projects")).toEqual(project);
      expect(store.getState().history).not.toContain(command);
    },
  );

  test("a successful read still completes after browser history navigates away and back", async () => {
    projects();
    cleanups.push(routing.initRouting());
    const pending = executeCommand(CAT, { source: "typed" });
    for (const destination of ["resume", "projects"] as const) {
      window.history.replaceState({}, "", routing.pathForWindow(destination));
      window.dispatchEvent(new Event("terminal:popstate"));
    }
    await settle([pending]);
    expect(echoes("projects")).toEqual([CAT]);
    expect(renderToStaticMarkup(<>{pane("projects").scrollback.at(-1)?.node}</>)).toContain("first synthetic file");
    expect(store.getState().activeWindow).toBe("projects");
    expect(window.location.pathname).toBe("/projects/");
  });
});

describe("Round 1 animation and confirmation boundaries", () => {
  test.each([15, 75])("finishing at %i ms executes once and restores the draft", (time) => {
    draft("lobby", "echo unfinished");
    animate.animateClick("pwd");
    vi.advanceTimersByTime(time);
    animate.finishAnimation();
    animate.finishAnimation();
    vi.advanceTimersByTime(500);
    expect(echoes()).toEqual(["pwd"]);
    expect(pane().inputBuffer).toBe("echo unfinished");
    expect(store.getState().animating).toBe(null);
  });

  test("rapid clicks execute each command once and preserve the original draft", () => {
    draft("lobby", "echo unfinished");
    for (const command of ["echo one", "echo two", "echo three"]) {
      animate.animateClick(command);
      vi.advanceTimersByTime(15);
    }
    vi.advanceTimersByTime(500);
    expect(echoes()).toEqual(["echo one", "echo two", "echo three"]);
    expect(pane().inputBuffer).toBe("echo unfinished");
  });

  test("focusing another pane during animation preserves both drafts", async () => {
    const { PaneTree } = await import("@/components/terminal/PaneTree");
    projects();
    const second = split();
    draft("projects", "echo second draft");
    focus("projects-p1");
    draft("projects", "echo first draft");
    const view = render(<PaneTree windowKey="projects" />);
    act(() => {
      animate.animateClick("echo animated");
      vi.advanceTimersByTime(30);
    });
    fireEvent.click(view.container.querySelector(`[data-pane-id="${second}"]`)!);
    expect(store.getState().animating).toBe(null);
    expect(store.getState().windows.projects.panes[0].scrollback.filter((line) => line.command === "echo animated")).toHaveLength(1);
    expect(pane("projects").id).toBe(second);
    act(() => { vi.advanceTimersByTime(500); });
    const [firstPane, secondPane] = store.getState().windows.projects.panes;
    expect.soft(firstPane.inputBuffer).toBe("echo first draft");
    expect.soft(secondPane.inputBuffer).toBe("echo second draft");
    expect.soft(secondPane.scrollback.flatMap((line) => line.command ?? [])).not.toContain("echo animated");
  });

  test.each([30, 220])("pane replacement at %i ms cannot receive the old animation or draft", (time) => {
    projects();
    const oldId = split();
    draft("projects", "echo original draft");
    animate.animateClick("echo animated");
    vi.advanceTimersByTime(time);
    store.dispatch({ type: "close-pane", window: "projects", paneId: oldId });
    split();
    draft("projects", "echo replacement draft");
    const replacement = pane("projects");
    vi.advanceTimersByTime(500);
    animate.finishAnimation();
    expect(pane("projects")).toEqual(replacement);
    expect(store.getState().history).not.toContain("echo animated");
    expect(store.getState().animating).toBe(null);
  });

  test("a command click in another pane finishes the old animation before starting the new one", async () => {
    const { PaneTree } = await import("@/components/terminal/PaneTree");
    const { runClick } = await import("./run-click");
    projects();
    const second = split();
    draft("projects", "echo second draft");
    focus("projects-p1");
    draft("projects", "echo first draft");
    const view = render(<PaneTree windowKey="projects" />);
    // A local command button exercises capture ordering without rendering source output.
    const button = document.createElement("button");
    button.addEventListener("click", () => runClick("echo child"));
    view.container.querySelector(`[data-pane-id="${second}"]`)!.append(button);
    act(() => {
      animate.animateClick("pwd");
      vi.advanceTimersByTime(15);
    });
    fireEvent.click(button);
    expect(store.getState().animating?.command).toBe("echo child");
    expect(pane("projects").id).toBe(second);
    act(() => { vi.advanceTimersByTime(500); });
    const [firstPane, secondPane] = store.getState().windows.projects.panes;
    expect(firstPane.scrollback.filter((line) => line.command === "pwd")).toHaveLength(1);
    expect(firstPane.inputBuffer).toBe("echo first draft");
    expect(secondPane.scrollback.filter((line) => line.command === "echo child")).toHaveLength(1);
    expect(secondPane.scrollback.some((line) => line.command === "pwd")).toBe(false);
    expect(secondPane.inputBuffer).toBe("echo second draft");
  });

  test.each([30, 75])("cross-window navigation at %i ms cancels animation and restores only its origin draft", (time) => {
    draft("resume", "echo resume draft");
    draft("lobby", "echo origin draft");
    animate.animateClick("pwd");
    vi.advanceTimersByTime(time);
    store.dispatch({ type: "switch-window", window: "resume" });
    const resume = pane("resume");
    vi.advanceTimersByTime(500);
    animate.finishAnimation();
    expect(store.getState().activeWindow).toBe("resume");
    expect(pane("resume")).toEqual(resume);
    expect(pane().inputBuffer).toBe("echo origin draft");
    expect(echoes()).toEqual([]);
    expect(store.getState().animating).toBe(null);
  });

  test("browser back during click animation remains the final navigation", () => {
    cleanups.push(routing.initRouting());
    draft("lobby", "echo origin draft");
    draft("resume", "echo resume draft");
    animate.animateClick("cd ~/projects");
    vi.advanceTimersByTime(30);
    window.history.replaceState({}, "", "/resume/");
    window.dispatchEvent(new Event("terminal:popstate"));
    vi.advanceTimersByTime(500);
    expect.soft(store.getState().activeWindow).toBe("resume");
    expect.soft(window.location.pathname).toBe("/resume/");
    expect(store.getState().animating).toBe(null);
    expect(pane().inputBuffer).toBe("echo origin draft");
    expect(pane("resume").inputBuffer).toBe("echo resume draft");
    expect(echoes()).toEqual([]);
    expect(store.getState().history).not.toContain("cd ~/projects");
  });

  test("a keyboard skip finishes the animation without confirming a pending URL", async () => {
    const { initKeyboard } = await import("./keyboard");
    cleanups.push(initKeyboard());
    const open = vi.fn();
    vi.stubGlobal("open", open);
    executeCommand("open https://example.invalid/fixture", { source: "typed" });
    animate.animateClick("pwd");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", bubbles: true }));
    expect(open).not.toHaveBeenCalled();
    expect(echoes()).toEqual(["open https://example.invalid/fixture", "pwd"]);
    expect(store.getState().animating).toBe(null);
  });

  test("a stale close confirmation cannot close a replacement pane", async () => {
    const { initKeyboard } = await import("./keyboard");
    cleanups.push(initKeyboard());
    projects();
    const oldId = split();
    store.dispatch({ type: "set-confirm", confirm: { kind: "closePane", payload: oldId } });
    store.dispatch({ type: "close-pane", window: "projects", paneId: oldId });
    const replacement = split();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", bubbles: true }));
    expect(store.getState().windows.projects.panes.map((p) => p.id)).toEqual(["projects-p1", replacement]);
    expect(store.getState().pendingConfirm).toBe(null);
  });
});

test("bounded pane lifecycle model preserves live layout IDs and never reuses closed IDs", async () => {
  const { leafIds } = await import("./layout");
  projects();
  const seen = new Set(["projects-p1"]);
  for (let round = 0; round < 12; round += 1) {
    for (let count = 0; count < 3; count += 1) {
      const id = split();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    store.dispatch({ type: "cycle-pane", window: "projects" });
    store.dispatch({ type: "zoom-pane", window: "projects" });
    for (const id of store.getState().windows.projects.panes.slice(1).map((p) => p.id)) {
      store.dispatch({ type: "close-pane", window: "projects", paneId: id });
      const win = store.getState().windows.projects;
      expect(new Set(leafIds(win.layout))).toEqual(new Set(win.panes.map((p) => p.id)));
      expect(win.panes.some((p) => p.id === win.activePane)).toBe(true);
      expect(win.zoomed).toBe(null);
    }
  }
  expect(seen.size).toBe(37);
});
