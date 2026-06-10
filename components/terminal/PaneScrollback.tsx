"use client";

import { useEffect, useRef } from "react";
import { PromptLabel } from "./PromptLabel";
import { getPane } from "@/lib/terminal/reducer";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

/**
 * A pane's scrollback. Command lines echo with the prompt as it looked when
 * they ran; output lines render their node. role="log" + polite live region
 * per the accessibility non-negotiables.
 */
export function PaneScrollback({ windowKey }: { windowKey: WindowKey }) {
  const lines = useTerminalStore((s) => getPane(s, windowKey).scrollback);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCommandId = useRef<number | null>(null);

  // Scroll each new command's echo to the top so its output reads from the
  // start. System-only appends (MOTD) stay put.
  useEffect(() => {
    const lastCmd = [...lines].reverse().find((l) => l.command !== null);
    if (!lastCmd || lastCmd.id === lastCommandId.current) return;
    lastCommandId.current = lastCmd.id;
    containerRef.current
      ?.querySelector(`[data-entry-id="${lastCmd.id}"]`)
      ?.scrollIntoView({ block: "start" });
  }, [lines]);

  return (
    <div ref={containerRef} role="log" aria-live="polite" className="space-y-4">
      {lines.map((line) =>
        line.command !== null ? (
          <div key={line.id} data-entry-id={line.id} className="scroll-mt-2">
            <PromptLabel path={line.cwd ?? "~"} />{" "}
            <span className="font-mono text-sm text-fg">{line.command}</span>
          </div>
        ) : (
          <div key={line.id} data-entry-id={line.id} className="output-fade">
            {line.node}
          </div>
        ),
      )}
    </div>
  );
}
