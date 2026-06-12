/**
 * Extracts the active project's bundled files for a provider worker.
 * Intelligence exists only inside ~/projects/<slug>/ — content windows
 * have no code to analyze (FLOW §8.2).
 */
import { resolveNode } from "@/lib/vfs/tree";
import type { VfsDir } from "@/lib/vfs/types";

export interface ProjectFiles {
  /** "~/projects/<slug>" */
  root: string;
  /** Project-relative path → raw text. */
  files: Record<string, string>;
}

export function projectFilesFor(path: string): ProjectFiles | null {
  const m = /^(~\/projects\/[^/]+)\//.exec(path);
  if (!m) return null;
  const root = m[1];
  const dir = resolveNode(root);
  if (!dir || dir.kind !== "dir") return null;

  const files: Record<string, string> = {};
  const walk = (d: VfsDir, prefix: string) => {
    for (const c of d.children) {
      if (c.kind === "file") files[prefix + c.name] = c.raw;
      else walk(c, `${prefix}${c.name}/`);
    }
  };
  walk(dir, "");
  return { root, files };
}

/** The open vfs path expressed relative to the project root, or null. */
export function relativeTo(root: string, path: string): string | null {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : null;
}
