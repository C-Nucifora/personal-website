"use client";

import { useEffect, useRef, useState } from "react";
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
  const [unseen, setUnseen] = useState(false);

  const scrollContainer = () =>
    containerRef.current?.closest<HTMLElement>("[data-window]") ?? null;

  const atBottom = () => {
    const el = scrollContainer();
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
  };

  // Scroll each new command's echo to the top so its output reads from the
  // start — but never yank the view while the reader is scrolled up (§6.3);
  // show the new-output pill instead. System-only appends (MOTD) stay put.
  useEffect(() => {
    const lastCmd = [...lines].reverse().find((l) => l.command !== null);
    if (!lastCmd || lastCmd.id === lastCommandId.current) return;
    lastCommandId.current = lastCmd.id;
    if (atBottom()) {
      containerRef.current
        ?.querySelector(`[data-entry-id="${lastCmd.id}"]`)
        ?.scrollIntoView({ block: "start" });
      return;
    }
    const id = requestAnimationFrame(() => setUnseen(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  // Reaching the bottom (by any means) clears the pill.
  useEffect(() => {
    if (!unseen) return;
    const el = scrollContainer();
    if (!el) return;
    const onScroll = () => {
      if (atBottom()) setUnseen(false);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen]);

  const jumpToBottom = () => {
    const el = scrollContainer();
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(false);
  };

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
      {unseen && (
        <div className="sticky bottom-2 z-10 flex justify-center">
          <button
            type="button"
            onClick={jumpToBottom}
            className="cursor-pointer rounded-full border border-accent/50 bg-elevated px-3 py-1 font-mono text-xs text-accent shadow hover:bg-accent/10"
          >
            ↓ new output
          </button>
        </div>
      )}
    </div>
  );
}
