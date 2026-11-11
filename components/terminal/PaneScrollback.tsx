"use client";

import { useEffect, useRef, useState } from "react";
import { PromptLabel } from "./PromptLabel";
import { getPaneById } from "@/lib/terminal/reducer";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

interface PaneScrollbackProps {
  windowKey: WindowKey;
  paneId: string;
}

/**
 * A pane's scrollback. Command lines echo with the prompt as it looked when
 * they ran; output lines render their node. Only the short completion status is live;
 * reading a whole document stays under the visitor's control.
 */
export function PaneScrollback({ windowKey, paneId }: PaneScrollbackProps) {
  const lines = useTerminalStore(
    (s) => getPaneById(s, windowKey, paneId)?.scrollback ?? [],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCommandId = useRef<number | null>(null);
  const wasAtBottom = useRef(true);
  const autoTop = useRef<number | null>(null);
  const [unseen, setUnseen] = useState(false);

  const scrollContainer = () =>
    containerRef.current?.closest<HTMLElement>("[data-pane-scroll]") ?? null;

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
    if (wasAtBottom.current) {
      containerRef.current
        ?.querySelector(`[data-entry-id="${lastCmd.id}"]`)
        ?.scrollIntoView({ block: "start" });
      autoTop.current = scrollContainer()?.scrollTop ?? null;
      return;
    }
    const id = requestAnimationFrame(() => setUnseen(true));
    return () => cancelAnimationFrame(id);
  }, [lines]);

  // Remember the position before output grows. Measuring after append would
  // mistake a long response for a visitor who deliberately scrolled upward.
  useEffect(() => {
    const el = scrollContainer();
    if (!el) return;
    const onScroll = () => {
      wasAtBottom.current = atBottom() || el.scrollTop === autoTop.current;
      if (wasAtBottom.current) setUnseen(false);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jumpToBottom = () => {
    const el = scrollContainer();
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(false);
  };

  return (
    <div ref={containerRef} role="log" aria-live="off" className="space-y-4">
      <span className="sr-only" role="status" aria-live="polite">{lines.findLast((line) => line.command !== null)?.command?.slice(0, 80)}{lines.length ? ". Output is available in the terminal content." : ""}</span>
      {lines.map((line) =>
        line.command !== null ? (
          <div key={line.id} data-entry-id={line.id} className="scroll-mt-2">
            <PromptLabel path={line.cwd ?? "~"} />{" "}
            <span className="font-mono text-sm text-fg">{line.command}</span>
          </div>
        ) : typeof line.node === "string" ? (
          <p key={line.id} data-entry-id={line.id} className="font-mono text-xs text-muted">
            {line.node}
          </p>
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
