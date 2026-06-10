/**
 * tmux/kitty-style window registry — the single source of truth for the
 * bottom window strip and the prefix navigation keys.
 *
 * Window 0 is the interactive shell (free prompt). Windows 1..N map to a
 * section command; selecting one runs that command into the same log and
 * highlights the window. Typing the command does the reverse (see Terminal).
 */
export interface TerminalWindow {
  id: number;
  label: string;
  /** Command to run when selected; null for the shell (just focus the prompt). */
  command: string | null;
}

export const WINDOWS: readonly TerminalWindow[] = [
  { id: 0, label: "shell", command: null },
  { id: 1, label: "about", command: "about" },
  { id: 2, label: "resume", command: "resume" },
  { id: 3, label: "projects", command: "projects" },
  { id: 4, label: "contact", command: "contact" },
  { id: 5, label: "homelab", command: "homelab" },
];

/** Just the section windows (ids ≥ 1) — the bottom strip's tabs. Home (0) is
 *  not a tab; it is the status-bar host label. */
export const SECTIONS: readonly TerminalWindow[] = WINDOWS.filter((w) => w.id !== 0);

/** Map a resolved command name back to its window id, or 0 (shell) if none. */
export function windowForCommand(command: string | null): number {
  if (!command) return 0;
  return WINDOWS.find((w) => w.command === command)?.id ?? 0;
}

/** The shell prompt path for a window: `~` for the shell, `~/about` etc. */
export function pathForWindow(id: number): string {
  const w = WINDOWS.find((x) => x.id === id);
  return !w || w.id === 0 ? "~" : `~/${w.label}`;
}

/** Map a URL hash label (e.g. `#projects`) to its window, or undefined. */
export function windowForLabel(label: string): TerminalWindow | undefined {
  const clean = label.replace(/^#/, "").toLowerCase();
  if (!clean) return undefined;
  return WINDOWS.find((w) => w.label === clean);
}
