import type { Theme } from "./types";

/** One Dark — Atom's signature dark theme. */
export const oneDark: Theme = {
  "--bg": "#21252b",
  "--bg-window": "#282c34", // background
  "--bg-elevated": "#2c313a",
  "--bg-selection": "#3e4451", // selection

  "--fg": "#abb2bf", // foreground
  "--fg-muted": "#6b7385", // brightened comment grey for readability
  "--fg-subtle": "#4b5263", // gutter grey

  "--border": "#353b45",

  "--accent": "#61afef", // blue
  "--accent-hover": "#7cc0f5",
  "--success": "#98c379", // green
  "--warning": "#e5c07b", // yellow
  "--error": "#e06c75", // red
  "--info": "#56b6c2", // cyan

  "--ansi-red": "#e06c75",
  "--ansi-green": "#98c379",
  "--ansi-yellow": "#e5c07b",
  "--ansi-blue": "#61afef",
  "--ansi-magenta": "#c678dd", // purple
  "--ansi-cyan": "#56b6c2",

  "--focus-ring": "#61afef",
  "--shadow": "rgba(0,0,0,0.45)",
};
