import type { Theme } from "./types";

/** Solarized Light — the light counterpart, shared accent hues. */
export const solarizedLight: Theme = {
  "--bg": "#e3dcc6",
  "--bg-window": "#fdf6e3", // base3
  "--bg-elevated": "#eee8d5", // base2
  "--bg-selection": "#d9d2bb",

  "--fg": "#586e75", // base01
  "--fg-muted": "#7c8f8f",
  "--fg-subtle": "#93a1a1", // base1

  "--border": "#d8d2bc",

  "--accent": "#268bd2", // blue
  "--accent-hover": "#1a6fad",
  "--success": "#5b6e00", // darkened green for contrast on light
  "--warning": "#b58900", // yellow
  "--error": "#dc322f", // red
  "--info": "#1c8c82", // cyan (darkened for >=3:1 on the light surface)

  "--ansi-red": "#dc322f",
  "--ansi-green": "#728000",
  "--ansi-yellow": "#b58900",
  "--ansi-blue": "#268bd2",
  "--ansi-magenta": "#d33682",
  "--ansi-cyan": "#2aa198",

  "--focus-ring": "#268bd2",
  "--shadow": "rgba(0,0,0,0.12)",
};
