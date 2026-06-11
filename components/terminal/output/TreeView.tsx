"use client";

import { Fragment } from "react";
import type { VfsDir, VfsNode } from "@/lib/vfs/types";
import { runClick } from "@/lib/terminal/run-click";
import { commandForFile } from "@/lib/terminal/file-click";

const MAX_DEPTH = 3;

function NodeButton({ node, relPath }: { node: VfsNode; relPath: string }) {
  const cmd =
    node.kind === "dir"
      ? `cd ${relPath}`
      : commandForFile(relPath);
  return (
    <button
      type="button"
      onClick={() => runClick(cmd)}
      className={[
        "cursor-pointer font-mono underline-offset-2 hover:underline focus-visible:outline-2",
        node.kind === "dir" ? "font-medium text-accent" : "text-fg",
      ].join(" ")}
    >
      {node.name}
      {node.kind === "dir" ? "/" : ""}
    </button>
  );
}

function Branch({
  nodes,
  prefix,
  parentRel,
  depth,
}: {
  nodes: VfsNode[];
  prefix: string;
  parentRel: string;
  depth: number;
}) {
  const visible = nodes.filter((n) => !n.hidden);
  return (
    <>
      {visible.map((n, i) => {
        const last = i === visible.length - 1;
        const rel = parentRel ? `${parentRel}/${n.name}` : n.name;
        return (
          <Fragment key={n.name}>
            <div>
              <span className="whitespace-pre text-subtle">
                {prefix}
                {last ? "└── " : "├── "}
              </span>
              <NodeButton node={n} relPath={rel} />
            </div>
            {n.kind === "dir" && depth < MAX_DEPTH && (
              <Branch
                nodes={n.children}
                prefix={prefix + (last ? "    " : "│   ")}
                parentRel={rel}
                depth={depth + 1}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** `tree` output: clickable, depth-capped (FLOW.md §8). */
export function TreeView({ root, label }: { root: VfsDir; label: string }) {
  return (
    <div className="font-mono text-sm leading-relaxed">
      <p className="text-accent">{label}</p>
      <Branch nodes={root.children} prefix="" parentRel="" depth={1} />
    </div>
  );
}
