/**
 * Wraps a provider worker into the IntelProvider interface. Every call
 * swallows failure into "no information" — FLOW §8.2's silent degradation.
 */
import { createWorkerClient, type WorkerLike } from "./rpc";
import type { IntelDefinition, IntelDiagnostic, IntelHover, IntelProvider, IntelSymbol } from "./types";

const INIT_TIMEOUT_MS = 15_000;
const DIAG_TIMEOUT_MS = 5_000;

export async function createWorkerProvider(
  worker: WorkerLike,
  files: Record<string, string>,
): Promise<IntelProvider> {
  const client = createWorkerClient(worker);
  await client.request("init", [files], INIT_TIMEOUT_MS);
  return {
    hover: (path, offset) =>
      client.request<IntelHover | null>("hover", [path, offset]).catch(() => null),
    definition: (path, offset) =>
      client.request<IntelDefinition | null>("definition", [path, offset]).catch(() => null),
    diagnostics: (path) =>
      client.request<IntelDiagnostic[]>("diagnostics", [path], DIAG_TIMEOUT_MS).catch(() => []),
    symbols: (path) => client.request<IntelSymbol[]>("symbols", [path]).catch(() => []),
    dispose: () => client.terminate(),
  };
}
