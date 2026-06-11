"use client";

import { WINDOW_IDS } from "@/lib/vfs/types";
import { windowForPath } from "@/lib/vfs/path";
import { getPane } from "@/lib/terminal/reducer";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import { runClick } from "@/lib/terminal/run-click";

/**
 * The tab bar IS the tmux window list, rendered large and clickable
 * (FLOW §3.3). A click animates `cd <that window's saved cwd>` (§2.1).
 */
export function TabBar() {
  const active = useTerminalStore((s) => s.activeWindow);
  const savedCwds = useTerminalStore((s) =>
    WINDOW_IDS.map((id) => getPane(s, id).cwd).join("\n"),
  ).split("\n");

  return (
    <nav aria-label="Sections" className="border-b border-border bg-elevated">
      <ul className="flex overflow-x-auto">
        {WINDOW_IDS.map((id, i) => {
          const isActive = id === active;
          // Tab click restores the window's last cwd — never resets it (§2.1).
          const saved = savedCwds[i];
          const target = windowForPath(saved) === id ? saved : `~/${id}`;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => runClick(`cd ${target}`)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "min-h-[44px] cursor-pointer whitespace-nowrap px-3 py-2 font-mono text-sm transition-colors",
                  "focus-visible:outline-2",
                  isActive
                    ? "border-b-2 border-accent bg-window text-accent"
                    : "text-fg/75 hover:text-fg",
                ].join(" ")}
              >
                <span className={isActive ? "text-muted" : ""}>{i + 1}:</span>
                {id}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
