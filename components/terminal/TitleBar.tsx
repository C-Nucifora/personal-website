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
      className="flex items-center gap-1.5 border-b border-border bg-elevated px-3 py-1.5"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Close (it won't)"
          title="exit"
          onClick={() => runClick("exit")}
          className="relative h-11 w-5 shrink-0 cursor-pointer before:absolute before:left-1 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-ansi-red focus-visible:outline-2"
        />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-yellow" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-green" aria-hidden="true" />
      </div>

      <p className="min-w-0 flex-1 truncate text-center font-mono text-xs text-muted" suppressHydrationWarning>
        visitor@{profile.username}: {cwd}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => runClick("cd ~/resume")}
          title="cd ~/resume"
          className="hidden min-h-11 cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 sm:block"
        >
          resume
        </button>
        <button
          type="button"
          onClick={() => runClick("plain")}
          title="plain"
          aria-label="Switch to plain view"
          className="min-h-11 cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2"
        >
          plain view
        </button>
        <button
          type="button"
          onClick={() => runClick("help")}
          aria-label="Help"
          title="help"
          className="min-h-11 min-w-9 cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2"
        >
          ?
        </button>
        <ThemeSwitcher />
      </div>
    </div>
  );
}
