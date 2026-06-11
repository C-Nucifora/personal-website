"use client";

import type { CommandMeta } from "@/lib/commands/registry";
import { CmdLink } from "./CmdLink";

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-44 shrink-0 font-mono text-accent">{left}</span>
      <span className="text-fg">{right}</span>
    </div>
  );
}

const VIM_ROWS: [string, string][] = [
  ["Esc", "NORMAL mode — vi editing on the command line"],
  ["j / k", "walk command history (NORMAL)"],
  ["i a I A", "back to typing"],
];

const TMUX_ROWS: [string, string][] = [
  ["Ctrl+b 1–5", "jump to a window"],
  ["Ctrl+b n / p", "next / previous window"],
  ["Ctrl+b [", "scroll mode (q to leave)"],
  ["Ctrl+b ?", "all keybindings"],
];

/**
 * `help` output (FLOW.md §9): quick tiered cheatsheet — commands first,
 * vim, tmux — ending with the clickable full guide.
 */
export function HelpSheet({ commands }: { commands: CommandMeta[] }) {
  const visible = commands.filter((c) => !c.hidden);
  return (
    <div className="max-w-2xl space-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-semibold uppercase tracking-wider text-muted">Commands</p>
        {visible.map((c) => (
          <Row key={c.name} left={c.usage} right={c.description} />
        ))}
      </div>
      <div className="space-y-1">
        <p className="font-semibold uppercase tracking-wider text-muted">Vim</p>
        {VIM_ROWS.map(([l, r]) => (
          <Row key={l} left={l} right={r} />
        ))}
      </div>
      <div className="space-y-1">
        <p className="font-semibold uppercase tracking-wider text-muted">Tmux</p>
        {TMUX_ROWS.map(([l, r]) => (
          <Row key={l} left={l} right={r} />
        ))}
      </div>
      <p className="text-fg">
        full guide → <CmdLink cmd="cd ~/help" />
      </p>
    </div>
  );
}
