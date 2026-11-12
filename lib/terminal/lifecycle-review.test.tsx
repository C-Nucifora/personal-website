import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/data/projects", () => ({
  projects: [{ slug: "review-fixture", title: "Fixture", pitch: "Synthetic", stack: [] }],
}));
vi.mock("@/data/generated/site-source", () => ({ siteSource: {} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const ROOT = "~/projects/review-fixture";
const FILE = `${ROOT}/src/first.txt`;
const SECOND = `${ROOT}/src/second.txt`;
const fixture = { githubSources: { "review-fixture": {
  "src/first.txt": "first synthetic file",
  "src/second.txt": "second synthetic file",
} } };
let source: ReturnType<typeof deferred<typeof fixture>>;
let entered: ReturnType<typeof deferred<void>>;
let store: typeof import("./store").store;
let executeCommand: typeof import("./executor").executeCommand;
let getPane: typeof import("./reducer").getPane;

function resetSession() {
  store.reset(null);
  for (const window of ["about", "projects", "resume", "contact", "help"] as const) {
    store.dispatch({ type: "mark-visited", window });
  }
}

beforeEach(async () => {
  vi.resetModules();
  source = deferred<typeof fixture>();
  entered = deferred<void>();
  vi.doMock("@/data/generated/github-sources", async () => {
    entered.resolve();
    return source.promise;
  });
  ({ store } = await import("./store"));
  ({ executeCommand } = await import("./executor"));
  ({ getPane } = await import("./reducer"));
  resetSession();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("live network forbidden"); }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Source-reviewed controls only. The owner runs these with the shared test job.
describe("independent lifecycle review controls", () => {
  test("editing a sibling preserves an origin request after refocus and a window switch", async () => {
    store.dispatch({ type: "switch-window", window: "projects" });
    const origin = getPane(store.getState(), "projects").id;
    const job = executeCommand(`vi ${FILE}`, { source: "typed" });
    await entered.promise;
    store.dispatch({ type: "split-pane", window: "projects", dir: "row" });
    executeCommand(`vim ${ROOT}/README.md`, { source: "typed" });
    const sibling = getPane(store.getState(), "projects");
    store.dispatch({ type: "focus-pane", window: "projects", paneId: origin });
    store.dispatch({ type: "switch-window", window: "resume" });
    const resume = getPane(store.getState(), "resume");
    source.resolve(fixture);
    await job;
    const opened = getPane(store.getState(), "projects");
    expect(opened.editorPath).toBe(FILE);
    expect(opened.editorNote).toBe("vi improved. you're welcome.");
    expect(opened.scrollback.flatMap((line) => line.command ? [line.command] : [])).toEqual([`vi ${FILE}`]);
    expect(store.getState().windows.projects.panes.find((pane) => pane.id === sibling.id)).toBe(sibling);
    expect(getPane(store.getState(), "resume")).toBe(resume);
    expect(store.getState().activeWindow).toBe("resume");
  });

  test.each([false, true])("a history-expanded alias supersedes two requests, rejection=%s", async (fail) => {
    store.dispatch({ type: "history-append", line: `view ${SECOND}` });
    const index = store.getState().history.length;
    const first = executeCommand(`vi ${FILE}`, { source: "typed" });
    await entered.promise;
    const second = executeCommand(`VIM ${FILE}`, { source: "typed" });
    const latest = executeCommand(`!${index}`, { source: "typed" });
    if (fail) source.reject(new Error("synthetic import failure"));
    else source.resolve(fixture);
    await Promise.all([first, second, latest]);
    const pane = getPane(store.getState(), "lobby");
    expect(pane.editorPath).toBe(fail ? null : SECOND);
    expect(pane.scrollback.flatMap((line) => line.command ? [line.command] : [])).toEqual([`view ${SECOND}`]);
    expect(store.getState().history).not.toContain(`vi ${FILE}`);
    expect(store.getState().history).not.toContain(`VIM ${FILE}`);
  });

  test.each([false, true])("a new session can consume the old session's shared load, rejection=%s", async (fail) => {
    const old = executeCommand(`vim ${FILE}`, { source: "typed" });
    await entered.promise;
    resetSession();
    const current = executeCommand(`view ${SECOND}`, { source: "typed" });
    if (fail) source.reject(new Error("synthetic import failure"));
    else source.resolve(fixture);
    await Promise.all([old, current]);
    const pane = getPane(store.getState(), "lobby");
    expect(pane.editorPath).toBe(fail ? null : SECOND);
    expect(pane.scrollback.flatMap((line) => line.command ? [line.command] : [])).toEqual([`view ${SECOND}`]);
    expect(store.getState().history).toEqual(["vim resume.md", `view ${SECOND}`]);
    expect(store.getState().notice?.text).toBe("Loading project sources…");
  });
});
