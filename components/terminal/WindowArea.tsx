"use client";

import { useCallback, type MouseEvent } from "react";
import { PaneScrollback } from "./PaneScrollback";
import { Prompt } from "./Prompt";
import { WINDOW_IDS } from "@/lib/vfs/types";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

const ALL_KEYS: WindowKey[] = ["lobby", ...WINDOW_IDS];

/**
 * All six shells (lobby + five windows) stay mounted; inactive ones are
 * hidden with visibility (not display) so scroll positions — and later,
 * editor instances — survive window switches for free.
 */
export function WindowArea() {
  const activeKey = useTerminalStore((s) => s.activeWindow ?? "lobby");

  // Clicking blank space focuses the prompt — never while selecting text or
  // when a real control was the target.
  const focusOnBlankClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label")) return;
    e.currentTarget
      .querySelector<HTMLInputElement>("input[aria-label='Terminal command input']")
      ?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      {ALL_KEYS.map((key) => {
        const active = key === activeKey;
        return (
          <div
            key={key}
            data-window={key}
            aria-hidden={active ? undefined : "true"}
            onClick={active ? focusOnBlankClick : undefined}
            className={[
              "absolute inset-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5",
              active ? "visible" : "invisible pointer-events-none",
            ].join(" ")}
          >
            <PaneScrollback windowKey={key} />
            <Prompt windowKey={key} />
          </div>
        );
      })}
      <p id="input-hint" className="sr-only">
        Press Enter to run a command. Tab completes it. Up and Down arrows recall previous
        commands. Click any printed file or directory name to open it.
      </p>
    </div>
  );
}
