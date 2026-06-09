import type { Theme } from "./types";

/** Tokyo Night — the standard "Night" palette. Default dark theme. */
export const tokyoNight: Theme = {
  "--bg": "#16161e",
  "--bg-window": "#1a1b26",
  "--bg-elevated": "#1f2335",
  "--bg-selection": "#283457",

  "--fg": "#c0caf5",
  "--fg-muted": "#565f89",
  "--fg-subtle": "#3b4261",

  "--border": "#292e42",

  "--accent": "#7aa2f7",
  "--accent-hover": "#89b4ff",
  "--success": "#9ece6a",
  "--warning": "#e0af68",
  "--error": "#f7768e",
  "--info": "#7dcfff",

  "--ansi-red": "#f7768e",
  "--ansi-green": "#9ece6a",
  "--ansi-yellow": "#e0af68",
  "--ansi-blue": "#7aa2f7",
  "--ansi-magenta": "#bb9af7",
  "--ansi-cyan": "#7dcfff",

  "--focus-ring": "#7dcfff",
  "--shadow": "rgba(0,0,0,0.45)",
};
