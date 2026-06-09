import type { Theme } from "./types";

/** Rosé Pine — soft, low-contrast "all natural pine, faux fur" dark theme. */
export const rosePine: Theme = {
  "--bg": "#191724", // base
  "--bg-window": "#1f1d2e", // surface
  "--bg-elevated": "#26233a", // overlay
  "--bg-selection": "#403d52", // highlight med

  "--fg": "#e0def4", // text
  "--fg-muted": "#908caa", // subtle
  "--fg-subtle": "#524f67", // highlight high

  "--border": "#312f44",

  "--accent": "#c4a7e7", // iris
  "--accent-hover": "#d2bdf0",
  "--success": "#9ccfd8", // foam (palette's green slot)
  "--warning": "#f6c177", // gold
  "--error": "#eb6f92", // love
  "--info": "#3e8fb0", // brightened pine

  "--ansi-red": "#eb6f92",
  "--ansi-green": "#9ccfd8",
  "--ansi-yellow": "#f6c177",
  "--ansi-blue": "#3e8fb0",
  "--ansi-magenta": "#c4a7e7", // iris
  "--ansi-cyan": "#ebbcba", // rose

  "--focus-ring": "#9ccfd8",
  "--shadow": "rgba(0,0,0,0.5)",
};
