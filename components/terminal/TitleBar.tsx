"use client";

import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { profile } from "@/data/profile";
import { activePane } from "@/lib/terminal/reducer";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import { runClick } from "@/lib/terminal/run-click";

/**
 * Faux window title bar (FLOW §10.1): traffic lights (red runs the exit
 * egg, never navigates), a live `visitor@christian: <cwd>` title, the `?`
 * button (a command in disguise), and the theme dropdown.
 */
export function TitleBar() {
  const cwd = useTerminalStore((s) => activePane(s).cwd);

  return (
    <div
      data-title-bar
      className="flex items-center gap-3 border-b border-border bg-elevated px-3 py-1.5"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Close (it won't)"
          title="exit"
          onClick={() => runClick("exit")}
          className="h-2.5 w-2.5 cursor-pointer rounded-full bg-ansi-red focus-visible:outline-2"
        />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-yellow" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-green" aria-hidden="true" />
      </div>

      <p className="flex-1 truncate text-center font-mono text-xs text-muted" suppressHydrationWarning>
        visitor@{profile.username}: {cwd}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => runClick("help")}
          aria-label="Help"
          title="help"
          className="cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2"
        >
          ?
        </button>
        <ThemeSwitcher />
      </div>
    </div>
  );
}
