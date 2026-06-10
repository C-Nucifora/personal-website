import { WINDOW_IDS, type WindowId } from "./types";

/** The real location ~ abbreviates. */
export const HOME = "/home/christian";

/**
 * Canonical form: paths inside the home directory are ~-rooted
 * ("~", "~/projects/foo"); everything else is absolute ("/", "/etc/passwd").
 */
export function normalizePath(path: string): string {
  const expanded =
    path === "~" ? HOME : path.startsWith("~/") ? HOME + path.slice(1) : path;

  const out: string[] = [];
  for (const seg of expanded.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }

  const abs = "/" + out.join("/");
  if (abs === HOME) return "~";
  if (abs.startsWith(HOME + "/")) return "~" + abs.slice(HOME.length);
  return abs;
}

/** Resolve user input against a cwd; empty input stays put. */
export function resolvePath(cwd: string, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return normalizePath(cwd);
  if (trimmed.startsWith("~") || trimmed.startsWith("/")) return normalizePath(trimmed);
  return normalizePath(cwd + "/" + trimmed);
}

/** The window a path belongs to — top-level dirs under ~ are windows (§2.1). */
export function windowForPath(path: string): WindowId | null {
  const normalized = normalizePath(path);
  if (!normalized.startsWith("~/")) return null;
  const top = normalized.slice(2).split("/")[0];
  return (WINDOW_IDS as readonly string[]).includes(top) ? (top as WindowId) : null;
}
