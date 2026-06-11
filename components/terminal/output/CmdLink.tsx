"use client";

import { runClick } from "@/lib/terminal/run-click";

interface CmdLinkProps {
  /** The command this link runs (and, by default, shows). */
  cmd: string;
  /** Visible label; defaults to the command itself. */
  label?: string;
  className?: string;
}

/**
 * An inline clickable command. Every path/suggestion the terminal prints is
 * one of these — clicking echoes and runs the real command (FLOW.md §3.1).
 */
export function CmdLink({ cmd, label, className = "" }: CmdLinkProps) {
  return (
    <button
      type="button"
      onClick={() => runClick(cmd)}
      className={[
        "inline cursor-pointer font-mono text-accent underline-offset-2 hover:underline",
        "focus-visible:outline-2",
        className,
      ].join(" ")}
    >
      {label ?? cmd}
    </button>
  );
}
