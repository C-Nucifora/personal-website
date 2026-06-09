import type { Theme } from "./types";

/** Dracula — the classic high-contrast dark theme. */
export const dracula: Theme = {
  "--bg": "#21222c",
  "--bg-window": "#282a36", // background
  "--bg-elevated": "#343746",
  "--bg-selection": "#44475a", // current line

  "--fg": "#f8f8f2", // foreground
  "--fg-muted": "#6272a4", // comment
  "--fg-subtle": "#424450",

  "--border": "#343746",

  "--accent": "#bd93f9", // purple
  "--accent-hover": "#caa9fa",
  "--success": "#50fa7b", // green
  "--warning": "#ffb86c", // orange
  "--error": "#ff5555", // red
  "--info": "#8be9fd", // cyan

  "--ansi-red": "#ff5555",
  "--ansi-green": "#50fa7b",
  "--ansi-yellow": "#f1fa8c",
  "--ansi-blue": "#bd93f9", // Dracula has no distinct blue; uses purple
  "--ansi-magenta": "#ff79c6", // pink
  "--ansi-cyan": "#8be9fd",

  "--focus-ring": "#8be9fd",
  "--shadow": "rgba(0,0,0,0.5)",
};
