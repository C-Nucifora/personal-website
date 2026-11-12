import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { WindowKey } from "./types";

vi.mock("@/data/projects", () => ({
  projects: [{ slug: "challenge-fixture", title: "Fixture", pitch: "Synthetic", stack: [] }],
}));
vi.mock("@/data/generated/site-source", () => ({ siteSource: {} }));
// Keep the real Terminal lifecycle, store, loader, commands, routing and animation.
vi.mock("@/components/theme/ThemeProvider", () => ({ useTheme: () => ({ themeId: "tokyo-night", setTheme: () => false }) }));
vi.mock("@/components/terminal/TitleBar", () => ({ TitleBar: () => null }));
vi.mock("@/components/terminal/TabBar", () => ({ TabBar: () => null }));
vi.mock("@/components/terminal/WelcomeStrip", () => ({ WelcomeStrip: () => null }));
vi.mock("@/components/terminal/WindowArea", () => ({ WindowArea: () => null }));
vi.mock("@/components/terminal/WindowPicker", () => ({ WindowPicker: () => null }));
vi.mock("@/components/terminal/StatusBar", () => ({ StatusBar: () => null }));
vi.mock("@/components/terminal/Motd", () => ({ seedMotd: () => {} }));
vi.mock("@/components/effects/CrtOverlay", () => ({ CrtOverlay: () => null }));
vi.mock("@/components/effects/Disintegration", () => ({ Disintegration: () => null }));
vi.mock("@/components/effects/MatrixRain", () => ({ MatrixRain: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const ROOT = "~/projects/challenge-fixture";
const FILE = `${ROOT}/src/fixture.txt`;
const SECOND_FILE = `${ROOT}/src/second.txt`;
const CAT = `cat ${FILE}`;
const CD = `cd ${ROOT}/src`;
const fixture = { githubSources: { "challenge-fixture": { "src/fixture.txt": "synthetic source", "src/second.txt": "second synthetic source" } } };
let source: ReturnType<typeof deferred<typeof fixture>>;
let entered: ReturnType<typeof deferred<void>>;
let store: typeof import("./store").store;
let executor: typeof import("./executor");
let animate: typeof import("./animate");
let reducer: typeof import("./reducer");
let routing: typeof import("./routing");
let loader: typeof import("@/lib/vfs/project-sources");
let disposers: Array<() => void>;

function visited() {
  for (const window of ["about", "projects", "resume", "contact", "help"] as const) {
    store.dispatch({ type: "mark-visited", window });
  }
}
function pane(key: WindowKey = "lobby") { return reducer.getPane(store.getState(), key); }
function draft(text: string) {
  store.dispatch({ type: "set-input", windowKey: "lobby", text, cursorPos: text.length });
}
function echoes(key: WindowKey = "lobby") {
  return pane(key).scrollback.flatMap((line) => line.command === null ? [] : [line.command]);
}
async function settle(job: void | Promise<void>, fail = false) {
  await entered.promise;
  if (fail) source.reject(new Error("synthetic import failure"));
  else source.resolve(fixture);
  await job;
}

beforeEach(async () => {
  vi.resetModules();
  source = deferred<typeof fixture>();
  entered = deferred<void>();
  disposers = [];
  vi.doMock("@/data/generated/github-sources", async () => {
    entered.resolve();
    return source.promise;
  });
  ({ store } = await import("./store"));
  executor = await import("./executor");
  animate = await import("./animate");
  reducer = await import("./reducer");
  routing = await import("./routing");
  loader = await import("@/lib/vfs/project-sources");
  store.reset(null);
  visited();
  window.history.replaceState({}, "", "/");
  document.documentElement.removeAttribute("data-view");
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("live network forbidden"); }));
});

afterEach(() => {
  animate.cancelAnimation();
  cleanup();
  disposers.forEach((dispose) => dispose());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-view");
  document.documentElement.removeAttribute("data-js-ready");
});

// Unexecuted lifecycle hypotheses. A forced reset is not ordinary tab/plain navigation.
describe("round 1 challenge session boundaries", () => {
  test.each([false, true])("a pending read cannot enter a reset session, rejection=%s", async (fail) => {
    const job = executor.executeCommand(CAT, { source: "typed" });
    await entered.promise;
    const oldId = pane().id;
    store.reset(null);
    visited();
    draft("fresh session draft");
    const before = pane();
    const history = store.getState().history;
    expect(pane().id).toBe(oldId);
    await settle(job, fail);
    expect.soft(pane()).toEqual(before);
    expect.soft(store.getState().history).toEqual(history);
  });

  test("reset navigation counters cannot validate an old pending cd", async () => {
    const job = executor.executeCommand(CD, { source: "typed" });
    await entered.promise;
    store.reset(null);
    visited();
    const before = store.getState();
    await settle(job);
    expect.soft(store.getState().activeWindow).toBe(null);
    expect.soft(pane("projects")).toEqual(before.windows.projects.panes[0]);
    expect.soft(store.getState().history).toEqual(before.history);
  });

  test.each([15, 50])("a reset at %i ms rejects old typing and beat callbacks", (time) => {
    draft("old session draft");
    animate.animateClick("pwd");
    vi.advanceTimersByTime(time);
    store.reset(null);
    visited();
    draft("fresh session draft");
    const before = pane();
    vi.advanceTimersByTime(500);
    expect.soft(pane()).toEqual(before);
    expect.soft(store.getState().history).not.toContain("pwd");
  });

  test("the actual Terminal cleanup and remount isolate an old source read", async () => {
    const { Terminal } = await import("@/components/terminal/Terminal");
    const first = render(<Terminal />);
    let job: void | Promise<void> = undefined;
    act(() => { job = executor.executeCommand(CAT, { source: "typed" }); });
    await entered.promise;
    first.unmount();
    render(<Terminal />);
    const before = pane();
    const history = store.getState().history;
    await act(async () => { await settle(job); });
    expect.soft(pane()).toEqual(before);
    expect.soft(store.getState().history).toEqual(history);
  });

  test("an unmounted Terminal source subscription cannot replace a new session notice", async () => {
    const { Terminal } = await import("@/components/terminal/Terminal");
    const first = render(<Terminal initialWindow="projects" />);
    await entered.promise;
    const job = loader.loadProjectSources().catch(() => {});
    first.unmount();
    render(<Terminal />);
    act(() => {
      store.dispatch({ type: "set-notice", text: "fresh session notice", until: Date.now() + 5000 });
    });
    await act(async () => { await settle(job, true); });
    expect(store.getState().notice?.text).toBe("fresh session notice");
  });
});

describe("round 1 challenge current visitor actions", () => {
  test("a later file opened through Prompt survives an earlier deferred vim", async () => {
    const { Prompt } = await import("@/components/terminal/Prompt");
    const view = render(<Prompt windowKey="lobby" paneId={pane().id} />);
    const input = view.getByRole("textbox", { name: "Terminal command input" });
    fireEvent.change(input, { target: { value: `vim ${FILE}` } });
    fireEvent.keyDown(input, { key: "Enter" });
    await entered.promise;
    fireEvent.change(input, { target: { value: `vim ${ROOT}/README.md` } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pane().editorPath).toBe(`${ROOT}/README.md`);
    await act(async () => { await settle(loader.loadProjectSources()); });
    expect(pane().editorPath).toBe(`${ROOT}/README.md`);
  });

  test("plain view and return keep the session and allow a pending read", async () => {
    const { setViewMode } = await import("@/lib/view-mode");
    const job = executor.executeCommand(CAT, { source: "typed" });
    const origin = pane().id;
    setViewMode("plain");
    await settle(job);
    setViewMode("terminal");
    expect(pane().id).toBe(origin);
    expect(echoes()).toEqual([CAT]);
    expect(store.getState().activeWindow).toBe(null);
  });

  test("returning to the same pane permits a pending read without writing into its sibling", async () => {
    store.dispatch({ type: "switch-window", window: "projects" });
    const origin = pane("projects").id;
    const job = executor.executeCommand(CAT, { source: "typed" });
    store.dispatch({ type: "split-pane", window: "projects", dir: "row" });
    const sibling = pane("projects");
    store.dispatch({ type: "focus-pane", window: "projects", paneId: origin });
    await settle(job);
    expect(echoes("projects")).toEqual([CAT]);
    expect(store.getState().windows.projects.panes.find((p) => p.id === sibling.id)).toEqual(sibling);
  });

  test("an animated deferred cd stays cancelled after a history round trip", async () => {
    disposers.push(routing.initRouting());
    draft("preserved draft");
    animate.animateClick(CD);
    animate.finishAnimation();
    await entered.promise;
    for (const path of ["/resume/", "/"]) {
      window.history.replaceState({}, "", path);
      window.dispatchEvent(new Event("terminal:popstate"));
    }
    await settle(loader.loadProjectSources());
    expect(store.getState().activeWindow).toBe(null);
    expect(window.location.pathname).toBe("/");
    expect(pane().inputBuffer).toBe("preserved draft");
    expect(echoes()).not.toContain(CD);
  });

  test("a cancelled final beat cannot finish a newer animation early", () => {
    draft("preserved draft");
    animate.animateClick("pwd");
    vi.advanceTimersByTime(50);
    animate.cancelAnimation();
    animate.animateClick("echo newer command");
    vi.advanceTimersByTime(60);
    expect(echoes()).toEqual([]);
    expect(store.getState().animating?.command).toBe("echo newer command");
    vi.advanceTimersByTime(500);
    expect(echoes()).toEqual(["echo newer command"]);
    expect(pane().inputBuffer).toBe("preserved draft");
  });
});

describe("round 1 challenge editor ordering regressions", () => {
  test.each(["view", "vi"])("a later Prompt file selection supersedes a deferred %s alias", async (alias) => {
    const { Prompt } = await import("@/components/terminal/Prompt");
    const view = render(<Prompt windowKey="lobby" paneId={pane().id} />);
    const input = view.getByRole("textbox", { name: "Terminal command input" });
    fireEvent.change(input, { target: { value: `${alias} ${FILE}` } });
    fireEvent.keyDown(input, { key: "Enter" });
    await entered.promise;
    fireEvent.change(input, { target: { value: `vim ${ROOT}/README.md` } });
    fireEvent.keyDown(input, { key: "Enter" });
    const before = pane();
    expect(before.editorPath).toBe(`${ROOT}/README.md`);
    await act(async () => { await settle(loader.loadProjectSources()); });
    expect(pane()).toEqual(before);
    expect(echoes()).toEqual([`vim ${ROOT}/README.md`]);
  });

  test.each([["vim", "view"], ["view", "vi"], ["vi", "vim"]])(
    "the newer of two deferred file requests wins, %s then %s",
    async (firstAlias, secondAlias) => {
      const first = executor.executeCommand(`${firstAlias} ${FILE}`, { source: "typed" });
      await entered.promise;
      const secondCommand = `${secondAlias} ${SECOND_FILE}`;
      const second = executor.executeCommand(secondCommand, { source: "typed" });
      await settle(first);
      await second;
      expect(pane().editorPath).toBe(SECOND_FILE);
      expect(echoes()).toEqual([secondCommand]);
      expect(store.getState().history).toEqual(["vim resume.md", secondCommand]);
      expect(pane().editorNote).toBe(secondAlias === "vi" ? "vi improved. you're welcome." : null);
    },
  );

  test("two pending requests for the same file open it only once", async () => {
    const command = `vim ${FILE}`;
    const first = executor.executeCommand(command, { source: "typed" });
    await entered.promise;
    const second = executor.executeCommand(command, { source: "typed" });
    await settle(first);
    await second;
    expect(pane().editorPath).toBe(FILE);
    expect(echoes()).toEqual([command]);
  });

  test.each(["close", "reopen"])("a newer editor selection followed by %s cannot revive an old request", async (transition) => {
    const job = executor.executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    executor.executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    store.dispatch({ type: "close-editor", windowKey: "lobby" });
    if (transition === "reopen") executor.executeCommand(`view ${ROOT}/README.md`, { source: "typed" });
    const before = pane();
    await settle(job);
    expect(pane()).toEqual(before);
    expect(pane().view).toBe(transition === "close" ? "shell" : "editor");
    expect(echoes()).not.toContain(`vim ${FILE}`);
  });

  test("a same-path close and gd reopen preserves the newer cursor offset", async () => {
    executor.executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    const job = executor.executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    // A direct open models the editor's gd dispatch without loading editor workers.
    store.dispatch({ type: "close-editor", windowKey: "lobby" });
    store.dispatch({ type: "open-editor", windowKey: "lobby", path: `${ROOT}/README.md`, offset: 7 });
    const before = pane();
    await settle(job);
    expect(pane()).toEqual(before);
    expect(pane().editorPath).toBe(`${ROOT}/README.md`);
    expect(pane().editorOffset).toBe(7);
    expect(echoes()).toEqual([`vim ${ROOT}/README.md`]);
  });

  test("a direct gd selection supersedes a pending vim request", async () => {
    executor.executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    const job = executor.executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    store.dispatch({ type: "open-editor", windowKey: "lobby", path: `${ROOT}/README.md`, offset: 9 });
    const before = pane();
    await settle(job);
    expect(pane()).toEqual(before);
    expect(pane().editorOffset).toBe(9);
  });

  test("an unchanged background pane still receives its pending vim alias", async () => {
    const job = executor.executeCommand(`vi ${FILE}`, { source: "typed" });
    await entered.promise;
    store.dispatch({ type: "switch-window", window: "resume" });
    const resume = pane("resume");
    await settle(job);
    expect(pane().editorPath).toBe(FILE);
    expect(pane().editorNote).toBe("vi improved. you're welcome.");
    expect(echoes()).toEqual([`vi ${FILE}`]);
    expect(store.getState().activeWindow).toBe("resume");
    expect(pane("resume")).toEqual(resume);
  });

  test("file requests in separate panes complete independently", async () => {
    const first = executor.executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    store.dispatch({ type: "switch-window", window: "projects" });
    const second = executor.executeCommand(`view ${SECOND_FILE}`, { source: "typed" });
    await settle(first);
    await second;
    expect(pane().editorPath).toBe(FILE);
    expect(pane("projects").editorPath).toBe(SECOND_FILE);
    expect(echoes()).toEqual([`vim ${FILE}`]);
    expect(echoes("projects")).toEqual([`view ${SECOND_FILE}`]);
  });

  test.each(["cat", "ls", "tree"])("a newer editor selection does not cancel a deferred %s read", async (command) => {
    const line = `${command} ${command === "cat" ? FILE : `${ROOT}/src`}`;
    const job = executor.executeCommand(line, { source: "typed" });
    await entered.promise;
    executor.executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    await settle(job);
    expect(pane().editorPath).toBe(`${ROOT}/README.md`);
    expect(echoes()).toEqual([`vim ${ROOT}/README.md`, line]);
    expect(store.getState().history.at(-1)).toBe(line);
  });

  test.each([false, true])("a superseded current-session vim keeps its fallback notice, rejection=%s", async (fail) => {
    const job = executor.executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    executor.executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    const before = pane();
    await settle(job, fail);
    expect(pane()).toEqual(before);
    expect(store.getState().notice?.text).toContain(fail ? "Source unavailable offline" : "Run the command again");
  });
});

describe("round 1 challenge lifecycle isolation regressions", () => {
  test.each([[CAT, false], [CAT, true], [`vim ${FILE}`, false], [`vim ${FILE}`, true], [CD, true]] as const)(
    "old %s cannot change any new-session state, rejection=%s",
    async (command, fail) => {
      const job = executor.executeCommand(command, { source: "typed" });
      await entered.promise;
      store.reset(null);
      visited();
      draft("new session draft");
      animate.animateClick("echo fresh command");
      store.dispatch({ type: "set-notice", text: "fresh notice", until: Date.now() + 5000 });
      const before = store.getState();
      await settle(job, fail);
      expect(store.getState()).toBe(before);
    },
  );

  test.each([[15, "cancel"], [50, "cancel"], [15, "finish"], [50, "finish"]] as const)(
    "%s ms old animation cannot restore a draft after reset and %s",
    (time, action) => {
      draft("old draft");
      animate.animateClick("pwd");
      vi.advanceTimersByTime(time);
      store.reset(null);
      visited();
      draft("fresh draft");
      store.dispatch({ type: "set-notice", text: "fresh notice", until: Date.now() + 5000 });
      const before = store.getState();
      if (action === "cancel") animate.cancelAnimation();
      else animate.finishAnimation();
      vi.advanceTimersByTime(500);
      expect(store.getState()).toBe(before);
    },
  );

  test("starting a new-session animation discards the old beat and old stash", () => {
    draft("old draft");
    animate.animateClick("pwd");
    vi.advanceTimersByTime(50);
    store.reset(null);
    visited();
    draft("fresh draft");
    animate.animateClick("echo fresh command");
    vi.advanceTimersByTime(60);
    expect(store.getState().animating?.command).toBe("echo fresh command");
    expect(echoes()).toEqual([]);
    vi.advanceTimersByTime(500);
    expect(echoes()).toEqual(["echo fresh command"]);
    expect(pane().inputBuffer).toBe("fresh draft");
    expect(store.getState().animating).toBe(null);
  });

  test.each([false, true])("Terminal cleanup alone invalidates a pending read, rejection=%s", async (fail) => {
    const { Terminal } = await import("@/components/terminal/Terminal");
    const view = render(<Terminal />);
    let job: void | Promise<void> = undefined;
    act(() => { job = executor.executeCommand(CAT, { source: "typed" }); });
    await entered.promise;
    view.unmount();
    const before = store.getState();
    await settle(job, fail);
    expect(store.getState()).toBe(before);
  });

  test("Terminal cleanup cancels typing and beat timers", async () => {
    const { Terminal } = await import("@/components/terminal/Terminal");
    const view = render(<Terminal />);
    act(() => { draft("old draft"); animate.animateClick("pwd"); vi.advanceTimersByTime(50); });
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    const before = store.getState();
    vi.advanceTimersByTime(500);
    animate.finishAnimation();
    expect(store.getState()).toBe(before);
  });

  test("an active Terminal still reports a failed background source load", async () => {
    const { Terminal } = await import("@/components/terminal/Terminal");
    render(<Terminal initialWindow="projects" />);
    const job = loader.loadProjectSources().catch(() => {});
    await act(async () => { await settle(job, true); });
    expect(store.getState().notice?.text).toBe("Source unavailable offline. Project summaries are still available.");
  });
});
