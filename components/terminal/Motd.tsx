"use client";

import { useEffect, useState } from "react";
import { Fetch } from "@/components/content/Fetch";
import { CmdLink } from "@/components/terminal/output/CmdLink";
import { useTheme } from "@/components/theme/ThemeProvider";
import { store } from "@/lib/terminal/store";
import type { WindowKey } from "@/lib/terminal/types";

/** `last login: Wed Jun 10 21:48:03 on ttys001` — real current date/time (§4). */
export function lastLoginLine(now: Date = new Date()): string {
  const day = now.toLocaleDateString("en-US", { weekday: "short" });
  const month = now.toLocaleDateString("en-US", { month: "short" });
  const time = now.toLocaleTimeString("en-US", { hour12: false });
  return `last login: ${day} ${month} ${now.getDate()} ${time} on ttys001`;
}

/** The neofetch block with the live theme — updates when the theme changes. */
function LiveFetch() {
  const { themeId } = useTheme();
  return <Fetch themeId={themeId} />;
}

/**
 * Type-on reveal (~600ms, FLOW §4): CSS-driven so reduced-motion handling is
 * free; any keypress or click completes it instantly.
 */
function TypeOn({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const finish = () => setDone(true);
    const timer = setTimeout(finish, 700);
    window.addEventListener("keydown", finish, { capture: true, once: true });
    window.addEventListener("pointerdown", finish, { capture: true, once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", finish, { capture: true });
      window.removeEventListener("pointerdown", finish, { capture: true });
    };
  }, [done]);

  return <div className={done ? undefined : "motd-typeon"}>{children}</div>;
}

function MotdHint() {
  return (
    <div className="space-y-1">
      <p className="font-sans text-sm text-fg/80">
        No command line needed — click the tabs above, or click any command below.
      </p>
      <p className="text-sm text-fg/80">
        try: <CmdLink cmd="cd about" /> · <CmdLink cmd="cd projects" /> ·{" "}
        <CmdLink cmd="cd resume" /> · <CmdLink cmd="help" />
        <span className="sm:hidden"> — or tap a tab above</span>
      </p>
    </div>
  );
}

/** Seed the MOTD into a shell's scrollback. Shared with deep-linked loads. */
export function seedMotd(windowKey: WindowKey): void {
  store.dispatch({
    type: "append-line",
    windowKey,
    command: null,
    node: <p className="font-mono text-sm text-fg/80">{lastLoginLine()}</p>,
  });
  store.dispatch({
    type: "append-line",
    windowKey,
    command: null,
    node: (
      <TypeOn>
        <LiveFetch />
      </TypeOn>
    ),
  });
  store.dispatch({
    type: "append-line",
    windowKey,
    command: null,
    node: <MotdHint />,
  });
}
