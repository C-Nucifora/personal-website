"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";
import { windowForPath } from "@/lib/vfs/path";
import { activePane, getPane } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import { runClick } from "@/lib/terminal/run-click";
import { focusActivePrompt } from "@/lib/terminal/focus";

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
  const savedCwds = useTerminalStore((s) => ACTIVE_WINDOW_IDS.map((id) => getPane(s, id).cwd).join("\n")).split("\n");
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
    <div
      data-status-bar
      className="relative flex items-center gap-3 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted"
    >
      <span className="hidden shrink-0 sm:inline">
        visitor@{profile.username}
      </span>

      <ul className="hidden shrink-0 items-center gap-1 lg:flex" aria-hidden="true">
        {ACTIVE_WINDOW_IDS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => runClick(`cd ${windowForPath(savedCwds[i]) === id ? savedCwds[i] : `~/${id}`}`)}
              className={[
                "cursor-pointer px-1",
                id === active ? "bg-selection text-fg" : "text-muted hover:text-fg",
              ].join(" ")}
            >
              {i + 1}:{id}
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

      {confirm && <div className="absolute bottom-full right-2 flex gap-2 rounded border border-border bg-elevated px-2 shadow-lg">
        <button type="button" className="min-h-11 px-2 text-accent" onClick={() => {
          if (confirm.kind === "openUrl") window.open(confirm.payload, "_blank", "noopener,noreferrer");
          else if (active) store.dispatch({ type: "close-pane", window: active, paneId: confirm.payload });
          store.dispatch({ type: "set-confirm", confirm: null });
          focusActivePrompt();
        }}>Confirm</button>
        <button type="button" className="min-h-11 px-2" onClick={() => store.dispatch({ type: "set-confirm", confirm: null })}>Cancel</button>
      </div>}
      <span className="hidden shrink-0 sm:inline">{time}</span>
      <button
        type="button"
        onClick={() => runClick("help")}
        className="shrink-0 cursor-pointer text-muted hover:text-accent"
      >
        ? help
      </button>
    </div>
  );
}
