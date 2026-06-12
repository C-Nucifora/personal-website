/**
 * Worker constructors per provider group, isolated here so the registry
 * is testable (tests mock this module; jsdom has no Worker). The
 * new Worker(new URL(...)) form is what the bundler statically analyzes
 * into a lazy chunk.
 */
export type ProviderGroup = "ts";

export const workerLoaders: Record<ProviderGroup, () => Worker> = {
  ts: () => new Worker(new URL("./ts/worker.ts", import.meta.url)),
};
