import { beforeEach, describe, expect, test, vi } from "vitest";
import { serveWorker, type WorkerLike } from "./rpc";

vi.mock("./loaders", () => ({
  workerLoaders: { ts: () => makeWorker() },
}));

/** In-process loopback worker speaking the real service protocol shape. */
let makeWorker: () => WorkerLike;

import { clearProviderCache, providerFor } from "./registry";

function loopbackWorker(handlers: Record<string, (...args: never[]) => unknown>): WorkerLike {
  type Listener = (e: MessageEvent) => void;
  const clientL: Listener[] = [];
  const workerL: Listener[] = [];
  serveWorker(handlers, {
    postMessage: (data) => queueMicrotask(() => clientL.forEach((l) => l({ data } as MessageEvent))),
    addEventListener: (_t, l) => workerL.push(l as Listener),
    terminate: () => {},
  });
  return {
    postMessage: (data) => queueMicrotask(() => workerL.forEach((l) => l({ data } as MessageEvent))),
    addEventListener: (_t, l) => clientL.push(l as Listener),
    terminate: vi.fn(),
  };
}

beforeEach(() => clearProviderCache());

describe("provider registry", () => {
  test("unknown language resolves to null", async () => {
    makeWorker = () => loopbackWorker({});
    await expect(providerFor("markdown", "~/projects/x", {})).resolves.toBeNull();
  });

  test("a working loader yields a provider that answers", async () => {
    makeWorker = () =>
      loopbackWorker({
        init: () => true,
        hover: () => ({ text: "const x: number" }),
      });
    const p = await providerFor("typescript", "~/projects/x", { "a.ts": "const x = 1;" });
    expect(p).not.toBeNull();
    await expect(p!.hover("a.ts", 6)).resolves.toEqual({ text: "const x: number" });
  });

  test("a crashing loader degrades to null silently", async () => {
    makeWorker = () => {
      throw new Error("no Worker here");
    };
    await expect(providerFor("typescript", "~/projects/y", {})).resolves.toBeNull();
  });

  test("providers are cached per project", async () => {
    const spy = vi.fn(() => loopbackWorker({ init: () => true }));
    makeWorker = spy;
    await providerFor("typescript", "~/projects/z", {});
    await providerFor("tsx", "~/projects/z", {});
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
