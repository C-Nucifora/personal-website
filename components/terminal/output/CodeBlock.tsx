"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { VfsLanguage } from "@/lib/vfs/types";

interface CodeBlockProps {
  raw: string;
  language: VfsLanguage;
}

/**
 * `cat` output for code: line numbers + syntax highlighting (FLOW §8).
 * The Lezer parsers load lazily on first use; until then the code shows
 * plain — a quick-glance tool, never a spinner.
 */
export function CodeBlock({ raw, language }: CodeBlockProps) {
  const [lines, setLines] = useState<ReactNode[][] | null>(null);

  useEffect(() => {
    let live = true;
    import("@/lib/highlight/highlight").then((m) => {
      if (live) setLines(m.highlightLines(raw, language));
    });
    return () => {
      live = false;
    };
  }, [raw, language]);

  const rows = lines ?? raw.split("\n").map((l) => [l] as ReactNode[]);

  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-elevated p-3 font-mono text-sm leading-relaxed">
      <code>
        {rows.map((row, i) => (
          <div key={i}>
            <span className="mr-4 inline-block w-8 select-none text-right text-subtle">
              {i + 1}
            </span>
            {row.length === 1 && row[0] === "" ? " " : row}
          </div>
        ))}
      </code>
    </pre>
  );
}
