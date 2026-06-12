/**
 * Language → provider resolution (spec 2026-06-12). One provider instance
 * per group+project, cached for the session. Anything that goes wrong —
 * no mapping, worker failure, init timeout — resolves to null and the
 * editor stays tier 1. Never throws, never surfaces an error state.
 */
import type { VfsLanguage } from "@/lib/vfs/types";
import { createWorkerProvider } from "./client";
import { workerLoaders, type ProviderGroup } from "./loaders";
import type { IntelProvider } from "./types";

const GROUP: Partial<Record<VfsLanguage, ProviderGroup>> = {
  typescript: "ts",
  tsx: "ts",
  javascript: "ts",
};

const cache = new Map<string, Promise<IntelProvider | null>>();

export function providerFor(
  language: VfsLanguage,
  projectRoot: string,
  files: Record<string, string>,
): Promise<IntelProvider | null> {
  const group = GROUP[language];
  if (!group) return Promise.resolve(null);
  const key = `${group}:${projectRoot}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = (async () => {
      try {
        return await createWorkerProvider(workerLoaders[group](), files);
      } catch {
        return null;
      }
    })();
    cache.set(key, entry);
  }
  return entry;
}

/** Test hook: forget cached providers. */
export function clearProviderCache(): void {
  cache.clear();
}
