import { describe, expect, test, vi } from "vitest";
import { createWorkerClient, serveWorker, type WorkerLike } from "./rpc";

/** A loopback "worker": serveWorker handles what the client posts. */
function loopback(handlers: Record<string, (...args: never[]) => unknown>): WorkerLike {
  type Listener = (e: MessageEvent) => void;
  const clientListeners: Listener[] = [];
  const workerListeners: Listener[] = [];
  const client: WorkerLike = {
    postMessage: (data) =>
      queueMicrotask(() =>
        workerListeners.forEach((l) => l({ data } as MessageEvent)),
      ),
    addEventListener: (_t, l) => clientListeners.push(l as Listener),
    terminate: vi.fn(),
  };
  const workerSide: WorkerLike = {
    postMessage: (data) =>
      queueMicrotask(() =>
        clientListeners.forEach((l) => l({ data } as MessageEvent)),
      ),
    addEventListener: (_t, l) => workerListeners.push(l as Listener),
    terminate: () => {},
  };
  serveWorker(handlers, workerSide);
  return client;
}

describe("worker RPC", () => {
  test("round-trips a request", async () => {
    const client = createWorkerClient(loopback({ add: (a: number, b: number) => a + b }));
    await expect(client.request("add", [2, 3])).resolves.toBe(5);
  });

  test("handler errors reject", async () => {
    const client = createWorkerClient(
      loopback({
        boom: () => {
          throw new Error("nope");
        },
      }),
    );
    await expect(client.request("boom", [])).rejects.toThrow("nope");
  });

  test("unknown method rejects", async () => {
    const client = createWorkerClient(loopback({}));
    await expect(client.request("missing", [])).rejects.toThrow(/unknown method/);
  });

  test("requests time out", async () => {
    vi.useFakeTimers();
    const never: WorkerLike = {
      postMessage: () => {},
      addEventListener: () => {},
      terminate: () => {},
    };
    const client = createWorkerClient(never, 50);
    const p = client.request("hover", []).catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(60);
    await expect(p).resolves.toMatch(/timed out/);
    vi.useRealTimers();
  });
});
