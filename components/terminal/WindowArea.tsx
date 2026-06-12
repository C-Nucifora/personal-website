"use client";

import { PaneTree } from "./PaneTree";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

const ALL_KEYS: WindowKey[] = ["lobby", ...ACTIVE_WINDOW_IDS];

/**
 * All six shells (lobby + five windows) stay mounted; inactive ones are
 * hidden with visibility (not display) so scroll positions — and later,
 * editor instances — survive window switches for free.
 */
export function WindowArea() {
  const activeKey = useTerminalStore((s) => s.activeWindow ?? "lobby");

  return (
    <div className="relative min-h-0 flex-1">
      {ALL_KEYS.map((key) => {
        const active = key === activeKey;
        return (
          <div
            key={key}
            data-window={key}
            aria-hidden={active ? undefined : "true"}
            className={[
              "absolute inset-0 flex",
              active ? "visible" : "invisible pointer-events-none",
            ].join(" ")}
          >
            <PaneTree windowKey={key} />
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
