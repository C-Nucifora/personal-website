/**
 * Virtual filesystem types. Top-level directories under ~ ARE the tmux
 * windows (FLOW.md §2) — WINDOW_IDS doubles as the canonical window list.
 */

import { blogPosts } from "@/data/generated/blog";

export const WINDOW_IDS = ["about", "projects", "resume", "contact", "help", "blog"] as const;

export type WindowId = (typeof WINDOW_IDS)[number];

/**
 * The windows that actually exist this build. `blog` is dormant until the
 * first post (spec 2026-06-12): no tab, no route, no Ctrl+b slot. State
 * containers stay keyed by the full WINDOW_IDS tuple.
 */
export const ACTIVE_WINDOW_IDS: readonly WindowId[] = blogPosts.length
  ? WINDOW_IDS
  : WINDOW_IDS.filter((id) => id !== "blog");

/** Languages the viewer/highlighter understands; "text" is the fallback. */
export type VfsLanguage =
  | "markdown"
  | "typescript"
  | "tsx"
  | "javascript"
  | "json"
  | "css"
  | "html"
  | "text";

/**
 * Rich `cat` renderers, keyed by id so the vfs stays free of React imports.
 * The cat command maps these ids to content components.
 */
export type RendererId = "about" | "uses" | "resume" | "contact" | "project-readme";

export interface VfsFile {
  kind: "file";
  name: string;
  /** Hidden from `ls`; shown by `ls -a` (dotfiles). */
  hidden?: boolean;
  /** Raw text — feeds the vim viewer and plain rendering. Always present. */
  raw: string;
  language: VfsLanguage;
  /** Optional rich renderer for `cat` output; falls back to markdown/plain. */
  render?: RendererId;
  /** Renderer-specific context (e.g. the project slug for README files). */
  meta?: string;
  /** Public URL: `cat` prints a summary + link, clicking downloads. */
  download?: string;
}

export interface VfsDir {
  kind: "dir";
  name: string;
  hidden?: boolean;
  children: VfsNode[];
}

export type VfsNode = VfsDir | VfsFile;
