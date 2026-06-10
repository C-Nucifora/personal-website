"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import { WINDOW_IDS } from "@/lib/vfs/types";
import { activePane } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import { runClick } from "@/lib/terminal/run-click";

function modeLabel(mode: string, pendingPrefix: boolean, view: string): string {
  if (pendingPrefix) return "^B";
  if (view === "editor") return "EDITOR [RO]";
  return `-- ${mode} --`;
}

/**
 * tmux-style status bar (FLOW §10.2): session · window list · mode · cwd (or
 * a transient notice) · clock · help hint. Also the channel for confirms.
 */
export function StatusBar() {
  const active = useTerminalStore((s) => s.activeWindow);
  const mode = useTerminalStore((s) => activePane(s).mode);
  const view = useTerminalStore((s) => activePane(s).view);
  const cwd = useTerminalStore((s) => activePane(s).cwd);
  const pendingPrefix = useTerminalStore((s) => s.pendingPrefix);
  const notice = useTerminalStore((s) => s.notice);
  const confirm = useTerminalStore((s) => s.pendingConfirm);
  const flashNonce = useTerminalStore((s) => s.flashNonce);

  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // Notices replace the cwd segment for 3s, then revert (§10.2).
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(
      () => store.dispatch({ type: "clear-notice" }),
      Math.max(0, notice.until - Date.now()),
    );
    return () => clearTimeout(id);
  }, [notice]);

  const middle = confirm
    ? confirm.kind === "openUrl"
      ? `open ${confirm.payload}? y/n`
      : `close pane? y/n`
    : notice
      ? notice.text
      : cwd;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted">
      <span className="hidden shrink-0 sm:inline">
        visitor@{profile.username}
      </span>

      <ul className="flex shrink-0 items-center gap-1" aria-hidden="true">
        {WINDOW_IDS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => runClick(`cd ~/${id}`)}
              className={[
                "cursor-pointer px-1",
                id === active ? "bg-selection text-fg" : "hover:text-fg",
              ].join(" ")}
            >
              {i + 1}:{id.slice(0, 3)}
            </button>
          </li>
        ))}
      </ul>

      {/* key remount replays the flash animation on unrecognized keys (§6.2) */}
      <span
        key={flashNonce}
        className={[
          "shrink-0",
          pendingPrefix ? "bg-selection px-1 text-accent" : "text-accent",
          flashNonce > 0 ? "mode-flash" : "",
        ].join(" ")}
        aria-live="polite"
      >
        {modeLabel(mode, pendingPrefix, view)}
      </span>

      <span
        className={["min-w-0 flex-1 truncate text-center", confirm || notice ? "text-warning" : ""].join(" ")}
        aria-live="polite"
      >
        {middle}
      </span>

      <span className="hidden shrink-0 sm:inline">{time}</span>
      <button
        type="button"
        onClick={() => runClick("help")}
        className="shrink-0 cursor-pointer hover:text-accent"
      >
        ? help
      </button>
    </div>
  );
}
