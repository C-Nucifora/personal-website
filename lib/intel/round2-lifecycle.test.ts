import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { VfsDir, VfsLanguage } from "@/lib/vfs/types";
import type { IntelProvider } from "./types";
import { createWorkerClient, serveWorker, type WorkerLike } from "./rpc";
import { createWorkerProvider } from "./client";
import { createDataService } from "./data/service";
import { createWebService } from "./web/service";
import { createTsService } from "./ts/service";

// Bounded local worker fixtures; real network access is forbidden.
const fixture = vi.hoisted(() => ({
  load: vi.fn(),
  resolveNode: vi.fn(),
  actions: new Map<string, (cm: { cm6: EditorView }) => void>(),
  ex: new Map<string, (cm: { cm6: EditorView }) => void>(),
}));
vi.mock("./loaders", () => ({
  workerLoaders: {
    ts: () => fixture.load("ts"),
    web: () => fixture.load("web"),
    data: () => fixture.load("data"),
  },
}));
vi.mock("@/lib/vfs/tree", () => ({ resolveNode: fixture.resolveNode }));
vi.mock("@replit/codemirror-vim", () => ({
  Vim: {
    defineAction: (name: string, action: (cm: { cm6: EditorView }) => void) => fixture.actions.set(name, action),
    defineEx: (name: string, _prefix: string, action: (cm: { cm6: EditorView }) => void) => fixture.ex.set(name, action),
    mapCommand: () => {},
  },
}));

import { clearProviderCache, providerFor } from "./registry";
import { projectFilesFor } from "./project-files";
import { clearJumplists, defineIntelVimCommands, intelCtx } from "@/components/editor/intel";

interface Request { id: number; method: string; params: unknown[] }
type Handler = (...args: never[]) => unknown;

function fakeWorker(handlers?: Record<string, Handler>) {
  const listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  const incoming: ((event: MessageEvent) => void)[] = [];
  const requests: Request[] = [];
  let stopped = false;
  let postError: Error | undefined;
  const emit = (data: unknown, type = "message") => {
    for (const listener of listeners.get(type) ?? []) listener({ data } as MessageEvent);
  };
  const worker: WorkerLike = {
    addEventListener: (type, listener) => listeners.set(type, [...listeners.get(type) ?? [], listener]),
    postMessage: (data) => {
      if (postError) throw postError;
      if (stopped) return;
      requests.push(data as Request);
      if (handlers) void Promise.resolve().then(() => {
        if (!stopped) incoming.forEach((listener) => listener({ data } as MessageEvent));
      });
    },
    terminate: vi.fn(() => { stopped = true; }),
  };
  if (handlers) serveWorker(handlers, {
    addEventListener: (_type, listener) => { incoming.push(listener); },
    postMessage: (data) => { if (!stopped) emit(data); },
    terminate: () => {},
  });
  return {
    worker, requests, emit,
    failPosts: (error: Error) => { postError = error; },
    crash: () => { stopped = true; emit(undefined, "error"); },
    reply: (request: Request, result: unknown) => emit({ id: request.id, result }),
  };
}

const FILES = { "src/a.ts": "export const answer = 42;" };
const ROOT = "~/projects/round2-fixture";
const disposers: (() => void)[] = [];
const forbiddenFetch = vi.fn(() => { throw new Error("round2 fixtures forbid fetch"); });
async function flush() {
  for (let turn = 0; turn < 12; turn++) await Promise.resolve();
}
async function readyWorker() {
  const fake = fakeWorker();
  const pending = createWorkerProvider(fake.worker, FILES);
  fake.reply(fake.requests[0], true);
  const provider = await pending;
  disposers.push(() => provider.dispose());
  return { ...fake, provider };
}
function clientFor(fake: ReturnType<typeof fakeWorker>) {
  const client = createWorkerClient(fake.worker, 50);
  disposers.push(() => client.terminate());
  return client;
}

beforeEach(() => {
  vi.useFakeTimers();
  clearProviderCache();
  clearJumplists();
  intelCtx.clear();
  fixture.load.mockReset();
  fixture.resolveNode.mockReset();
  forbiddenFetch.mockClear();
  vi.stubGlobal("fetch", forbiddenFetch);
  defineIntelVimCommands();
});
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  clearProviderCache();
  intelCtx.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  expect(forbiddenFetch).not.toHaveBeenCalled();
});

describe("round2 transport controls", () => {
  test("correlates concurrent replies in reverse order and ignores duplicates", async () => {
    const fake = fakeWorker();
    const client = clientFor(fake);
    const first = client.request("hover", ["a.ts", 0]);
    const second = client.request("symbols", ["a.ts"]);
    fake.reply(fake.requests[1], ["second"]);
    fake.reply(fake.requests[0], "first");
    fake.reply(fake.requests[0], "duplicate");
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toEqual(["second"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("late timed-out reply cannot settle a newer request", async () => {
    const fake = fakeWorker();
    const client = clientFor(fake);
    const old = client.request("hover", []).catch((error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(50);
    await expect(old).resolves.toMatch(/timed out/);
    let settled = false;
    const current = client.request("hover", []).then((value) => { settled = true; return value; });
    fake.reply(fake.requests[0], "stale");
    await flush();
    expect(settled).toBe(false);
    fake.reply(fake.requests[1], "current");
    await expect(current).resolves.toBe("current");
  });

  test("disposal rejects all pending RPC calls and ignores queued replies", async () => {
    const fake = fakeWorker();
    const client = clientFor(fake);
    const calls = ["hover", "symbols"].map((method) => client.request(method, []).catch((error: Error) => error.message));
    client.terminate();
    fake.requests.forEach((request) => fake.reply(request, "late"));
    expect(await Promise.all(calls)).toEqual(["intel: worker terminated", "intel: worker terminated"]);
    expect(vi.getTimerCount()).toBe(0);
    expect(fake.worker.terminate).toHaveBeenCalledOnce();
  });


});

describe("round2 provider failure and registry controls", () => {
  test("synchronous init post failure terminates and permits a healthy retry", async () => {
    const failed = fakeWorker();
    failed.failPosts(new Error("fixture post failure"));
    fixture.load.mockReturnValueOnce(failed.worker).mockImplementation(() => fakeWorker({ init: () => true }).worker);
    await expect(providerFor("typescript", ROOT, FILES)).resolves.toBeNull();
    expect(failed.worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const recovered = await providerFor("typescript", ROOT, FILES);
    expect(recovered).not.toBeNull();
    recovered?.dispose();
    expect(fixture.load).toHaveBeenCalledTimes(2);
  });

  test("worker startup error settles by the init deadline and allows retry", async () => {
    const fake = fakeWorker();
    fixture.load.mockReturnValueOnce(fake.worker).mockImplementation(() => fakeWorker({ init: () => true }).worker);
    const pending = providerFor("typescript", ROOT, FILES);
    fake.crash();
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).resolves.toBeNull();
    expect(fake.worker.terminate).toHaveBeenCalledOnce();
    fake.reply(fake.requests[0], true);
    const recovered = await providerFor("typescript", ROOT, FILES);
    expect(recovered).not.toBeNull();
    recovered?.dispose();
    expect(fixture.load).toHaveBeenCalledTimes(2);
  });

  test("runtime worker error silently settles every method within documented deadlines", async () => {
    const fake = await readyWorker();
    const calls = [fake.provider.hover("src/a.ts", 0), fake.provider.definition("src/a.ts", 0),
      fake.provider.symbols("src/a.ts"), fake.provider.diagnostics("src/a.ts")];
    fake.crash();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await Promise.all(calls)).toEqual([null, null, [], []]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("provider disposal silently settles pending editor operations", async () => {
    const fake = await readyWorker();
    const calls = [fake.provider.hover("src/a.ts", 0), fake.provider.definition("src/a.ts", 0),
      fake.provider.symbols("src/a.ts"), fake.provider.diagnostics("src/a.ts")];
    fake.provider.dispose();
    expect(await Promise.all(calls)).toEqual([null, null, [], []]);
    fake.requests.slice(1).forEach((request) => fake.reply(request, "late"));
    expect(vi.getTimerCount()).toBe(0);
  });

  test("explicit worker handler failures degrade all methods without waiting", async () => {
    const fake = await readyWorker();
    const calls = [fake.provider.hover("src/a.ts", 0), fake.provider.definition("src/a.ts", 0),
      fake.provider.symbols("src/a.ts"), fake.provider.diagnostics("src/a.ts")];
    fake.requests.slice(1).forEach((request) => fake.emit({ id: request.id, error: "fixture service failure" }));
    expect(await Promise.all(calls)).toEqual([null, null, [], []]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("shares pending init only for the same project and provider group", async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    fixture.load.mockImplementation(() => { const fake = fakeWorker(); workers.push(fake); return fake.worker; });
    const ts = providerFor("typescript", ROOT, FILES);
    expect(providerFor("tsx", ROOT, { ...FILES })).toBe(ts);
    const web = providerFor("json", ROOT, { "a.json": "{}" });
    const other = providerFor("typescript", `${ROOT}-other`, FILES);
    expect(fixture.load.mock.calls).toEqual([["ts"], ["web"], ["ts"]]);
    workers.forEach((fake) => fake.reply(fake.requests[0], true));
    const providers = await Promise.all([ts, web, other]);
    expect(new Set(providers).size).toBe(3);
    providers.forEach((provider) => provider?.dispose());
  });

  test("a pre-source README does not poison first supported initialization after graft", async () => {
    const dir: VfsDir = { kind: "dir", name: "round2-fixture", children: [
      { kind: "file", name: "README.md", language: "markdown", raw: "# Fixture" },
    ] };
    fixture.resolveNode.mockImplementation((path: string) => path === ROOT ? dir : null);
    const before = projectFilesFor(`${ROOT}/README.md`)!;
    await expect(providerFor("markdown", ROOT, before.files)).resolves.toBeNull();
    expect(fixture.load).not.toHaveBeenCalled();
    // Models the tree after graft; the real importer belongs to Round 1.
    dir.children.push({ kind: "dir", name: "src", children: [
      { kind: "file", name: "a.ts", language: "typescript", raw: FILES["src/a.ts"] },
    ] });
    const after = projectFilesFor(`${ROOT}/src/a.ts`)!;
    const fake = fakeWorker({ init: () => true });
    fixture.load.mockReturnValue(fake.worker);
    const provider = await providerFor("typescript", after.root, after.files);
    expect(fake.requests[0]).toMatchObject({ method: "init", params: [{ "README.md": "# Fixture", ...FILES }] });
    expect(before.files).not.toHaveProperty("src/a.ts");
    expect(provider).not.toBeNull();
    provider?.dispose();
  });
});

describe("round2 reply correlation", () => {
  test("unrelated malformed envelopes cannot settle a valid request", async () => {
    const fake = await readyWorker();
    const pending = fake.provider.hover("src/a.ts", 0);
    for (const data of [null, undefined, 4, "noise", {}, { id: "2", result: "wrong" }, { id: 999, result: "wrong" }]) fake.emit(data);
    fake.reply(fake.requests[1], { text: "fixture type" });
    await expect(pending).resolves.toEqual({ text: "fixture type" });
    expect(vi.getTimerCount()).toBe(0);
  });
});

function editor(provider: IntelProvider, message = vi.fn()) {
  const view = { state: EditorState.create({ doc: FILES["src/a.ts"] }), dispatch: vi.fn() } as unknown as EditorView;
  const openFile = vi.fn();
  intelCtx.set(view, { provider, relPath: "src/a.ts", vfsPath: `${ROOT}/src/a.ts`, root: ROOT,
    windowKey: "projects", message, openFile });
  return { view, message, openFile };
}

describe("round2 editor reply lifetime", () => {
  test("live symbols reply reaches the registered message callback", async () => {
    const fake = await readyWorker();
    const current = editor(fake.provider);
    fixture.ex.get("symbols")!({ cm6: current.view });
    fake.reply(fake.requests[1], [{ name: "answer", kind: "const", line: 1 }]);
    await flush();
    expect(current.message).toHaveBeenCalledOnce();
    expect(current.message.mock.calls[0][0]).toContain("answer");
  });

  test.each(["hover", "definition"] as const)("late %s ignores a removed editor context", async (method) => {
    const fake = await readyWorker();
    const old = editor(fake.provider);
    fixture.actions.get(method === "hover" ? "intelHover" : "intelGd")!({ cm6: old.view });
    intelCtx.delete(old.view);
    fake.reply(fake.requests[1], method === "hover" ? { text: "old" } : { path: "src/b.ts", offset: 0 });
    await flush();
    expect(old.view.dispatch).not.toHaveBeenCalled();
    expect(old.openFile).not.toHaveBeenCalled();
  });


});

describe("round2 local service output bounds", () => {
  test.each(["typescript", "css", "yaml"] as const)("%s output stays within a bounded synthetic document", async (language: VfsLanguage) => {
    const count = 24;
    const path = language === "typescript" ? "a.ts" : language === "css" ? "a.css" : "a.yaml";
    const text = Array.from({ length: count }, (_, n) => language === "typescript"
      ? `export const item${n}: number = "wrong";`
      : language === "css" ? `.item${n} { displai: block; }` : `item${n}: ${n}`).join("\n");
    const files = { [path]: text };
    const service = language === "typescript" ? createTsService({ files, libs: {} })
      : language === "css" ? createWebService(files) : createDataService(files);
    const fake = fakeWorker({ init: () => true,
      diagnostics: (file: string) => service.diagnostics(file), symbols: (file: string) => service.symbols(file) });
    const provider = await createWorkerProvider(fake.worker, files);
    disposers.push(() => provider.dispose());
    const diags = await provider.diagnostics(path);
    const symbols = await provider.symbols(path);
    if (language !== "yaml") expect(diags.length).toBeGreaterThan(0);
    expect(diags.length).toBeLessThanOrEqual(count * 2);
    for (const diagnostic of diags) {
      expect(diagnostic.from).toBeGreaterThanOrEqual(0);
      expect(diagnostic.to).toBeGreaterThanOrEqual(diagnostic.from);
      expect(diagnostic.to).toBeLessThanOrEqual(text.length);
      expect(typeof diagnostic.message).toBe("string");
    }
    expect(symbols.length).toBe(count);
    for (const symbol of symbols) {
      expect(symbol.line).toBeGreaterThanOrEqual(1);
      expect(symbol.line).toBeLessThanOrEqual(count);
      expect(typeof symbol.kind).toBe("string");
    }
  });

  test("malformed local data still returns bounded diagnostics or silent fallback through RPC", async () => {
    const files = { "empty-item.yaml": "-\n", "bad.toml": "[broken\n", "eof.yaml": "value: [" };
    const service = createDataService(files);
    const fake = fakeWorker({ init: () => true,
      diagnostics: (path: string) => service.diagnostics(path), symbols: (path: string) => service.symbols(path) });
    const provider = await createWorkerProvider(fake.worker, files);
    disposers.push(() => provider.dispose());
    await expect(provider.symbols("empty-item.yaml")).resolves.toEqual([]);
    for (const [path, text] of Object.entries(files)) {
      const diags = await provider.diagnostics(path);
      expect(diags.length).toBeLessThanOrEqual(4);
      for (const diagnostic of diags) {
        expect(diagnostic.from).toBeGreaterThanOrEqual(0);
        // The viewer clamps parser EOF spans to the document length.
        const from = Math.min(diagnostic.from, text.length);
        const to = Math.min(Math.max(diagnostic.to, diagnostic.from), text.length);
        expect(to).toBeGreaterThanOrEqual(from);
        expect(to).toBeLessThanOrEqual(text.length);
      }
    }
  });
});
