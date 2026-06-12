/**
 * Minimal request/response RPC over postMessage. Each provider worker
 * registers plain async handlers via serveWorker; the client wraps a
 * Worker into promise calls with a timeout, so a wedged worker degrades
 * to "no information" instead of a hung UI (FLOW §8.2).
 */

/** The subset of Worker both sides need — lets tests run a loopback. */
export interface WorkerLike {
  postMessage(data: unknown): void;
  addEventListener(type: "message", listener: (e: MessageEvent) => void): void;
  terminate(): void;
}

interface RpcRequest {
  id: number;
  method: string;
  params: unknown[];
}

interface RpcResponse {
  id: number;
  result?: unknown;
  error?: string;
}

export interface WorkerClient {
  request<T>(method: string, params: unknown[]): Promise<T>;
  terminate(): void;
}

export const DEFAULT_TIMEOUT_MS = 2000;

export function createWorkerClient(
  worker: WorkerLike,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): WorkerClient {
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  worker.addEventListener("message", (e: MessageEvent) => {
    const { id, result, error } = (e.data ?? {}) as RpcResponse;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    if (error !== undefined) entry.reject(new Error(error));
    else entry.resolve(result);
  });

  return {
    request<T>(method: string, params: unknown[]): Promise<T> {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`intel: ${method} timed out`));
        }, timeoutMs);
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
        worker.postMessage({ id, method, params } satisfies RpcRequest);
      });
    },
    terminate() {
      for (const { reject, timer } of pending.values()) {
        clearTimeout(timer);
        reject(new Error("intel: worker terminated"));
      }
      pending.clear();
      worker.terminate();
    },
  };
}

/** Worker side: route incoming requests to handlers. */
export function serveWorker(
  handlers: Record<string, (...args: never[]) => unknown>,
  scope: WorkerLike = self as unknown as WorkerLike,
): void {
  scope.addEventListener("message", (e: MessageEvent) => {
    const { id, method, params } = (e.data ?? {}) as RpcRequest;
    if (typeof id !== "number") return;
    void (async () => {
      try {
        const handler = handlers[method];
        if (!handler) throw new Error(`intel: unknown method ${method}`);
        const result = await handler(...(params as never[]));
        scope.postMessage({ id, result } satisfies RpcResponse);
      } catch (err) {
        scope.postMessage({
          id,
          error: err instanceof Error ? err.message : String(err),
        } satisfies RpcResponse);
      }
    })();
  });
}
