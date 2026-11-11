import { graftProjectSources } from "./tree";

let loaded = false;
let pending: Promise<void> | null = null;

export function projectSourcesLoaded(): boolean {
  return loaded;
}

/** One shared request for Projects navigation and source paths in any shell. */
export function loadProjectSources(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!pending) {
    pending = import("@/data/generated/github-sources").then((module) => {
      graftProjectSources(module.githubSources);
      loaded = true;
    }).finally(() => { pending = null; });
  }
  return pending;
}
