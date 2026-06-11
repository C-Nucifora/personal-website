/**
 * Tab completion (FLOW.md §6.1): command names for the first token, virtual
 * filesystem paths after that.
 */
import { completionCandidates } from "@/lib/commands/registry";
import { resolvePath } from "@/lib/vfs/path";
import { resolveNode } from "@/lib/vfs/tree";

export interface Completion {
  /** Full replacement line, when completion made progress. */
  text?: string;
  /** Ambiguous candidates to show, when no progress was possible. */
  candidates?: string[];
}

function longestCommonPrefix(items: string[]): string {
  if (items.length === 0) return "";
  let prefix = items[0];
  for (const item of items.slice(1)) {
    while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

export function completeLine(line: string, cwd: string): Completion {
  const beforeCursor = line;
  const tokens = beforeCursor.split(/\s+/);
  const isFirstToken = tokens.length <= 1 && !/\s$/.test(beforeCursor);

  if (isFirstToken) {
    const prefix = tokens[0] ?? "";
    if (!prefix) return {};
    const matches = completionCandidates().filter((c) => c.startsWith(prefix.toLowerCase()));
    if (matches.length === 0) return {};
    if (matches.length === 1) return { text: matches[0] + " " };
    const lcp = longestCommonPrefix(matches);
    if (lcp.length > prefix.length) return { text: lcp };
    return { candidates: matches };
  }

  // Path completion for the last token.
  const lastToken = /\s$/.test(beforeCursor) ? "" : tokens[tokens.length - 1];
  const head = beforeCursor.slice(0, beforeCursor.length - lastToken.length);
  const slash = lastToken.lastIndexOf("/");
  const dirPart = slash >= 0 ? lastToken.slice(0, slash + 1) : "";
  const base = slash >= 0 ? lastToken.slice(slash + 1) : lastToken;

  const dirPath = resolvePath(cwd, dirPart || ".");
  const dirNode = resolveNode(dirPath);
  if (!dirNode || dirNode.kind !== "dir") return {};

  const visible = dirNode.children.filter(
    (n) => (base.startsWith(".") || !n.hidden) && n.name.startsWith(base),
  );
  if (visible.length === 0) return {};
  if (visible.length === 1) {
    const n = visible[0];
    const suffix = n.kind === "dir" ? "/" : " ";
    return { text: head + dirPart + n.name + suffix };
  }
  const names = visible.map((n) => n.name);
  const lcp = longestCommonPrefix(names);
  if (lcp.length > base.length) return { text: head + dirPart + lcp };
  return { candidates: visible.map((n) => (n.kind === "dir" ? n.name + "/" : n.name)) };
}
