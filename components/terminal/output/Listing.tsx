"use client";

import type { VfsNode } from "@/lib/vfs/types";
import { runClick } from "@/lib/terminal/run-click";
import { commandForFile } from "@/lib/terminal/file-click";

/**
 * `ls` output: a clickable menu in disguise (FLOW.md §3.1). Directories run
 * `cd <name>`, files run their click command, downloads are real anchors.
 */
export function Listing({ entries }: { entries: VfsNode[] }) {
  if (entries.length === 0) {
    return <p className="text-muted">(empty)</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1">
      {entries.map((n) => (
        <li key={n.name}>
          {n.kind === "dir" ? (
            <button
              type="button"
              onClick={() => runClick(`cd ${n.name}`)}
              className="cursor-pointer font-mono font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2"
            >
              {n.name}/
            </button>
          ) : n.download ? (
            <a href={n.download} download className="font-mono text-fg hover:text-accent">
              {n.name}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => runClick(commandForFile(n.name))}
              className="cursor-pointer font-mono text-fg underline-offset-2 hover:text-accent hover:underline focus-visible:outline-2"
            >
              {n.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
