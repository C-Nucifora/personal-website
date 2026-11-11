import type { Theme } from "./types";

/** Gruvbox Dark (medium) — retro, warm, high-contrast. */
export const gruvbox: Theme = {
  "--bg": "#1d2021", // bg0_hard
  "--bg-window": "#282828", // bg0
  "--bg-elevated": "#3c3836", // bg1
  "--bg-selection": "#504945", // bg2

  "--fg": "#ebdbb2", // fg1
  "--fg-muted": "#aba094", // gray
  "--fg-subtle": "#665c54", // bg3

  "--border": "#504945",

  "--accent": "#89a99d", // blue
  "--accent-hover": "#9bbcae",
  "--success": "#b8bb26", // green
  "--warning": "#fabd2f", // yellow
  "--error": "#f97d6e", // red
  "--info": "#8ec07c", // aqua

  "--ansi-red": "#f97d6e",
  "--ansi-green": "#b8bb26",
  "--ansi-yellow": "#fabd2f",
  "--ansi-blue": "#89a99d",
  "--ansi-magenta": "#d58ea1", // purple
  "--ansi-cyan": "#8ec07c", // aqua

  "--focus-ring": "#fabd2f",
  "--shadow": "rgba(0,0,0,0.45)",
};
