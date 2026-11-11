import type { Theme } from "./types";

/** Solarized Light — the light counterpart, shared accent hues. */
export const solarizedLight: Theme = {
  "--bg": "#e3dcc6",
  "--bg-window": "#fdf6e3", // base3
  "--bg-elevated": "#eee8d5", // base2
  "--bg-selection": "#d9d2bb",

  "--fg": "#50646a", // base01
  "--fg-muted": "#576363",
  "--fg-subtle": "#93a1a1", // base1

  "--border": "#d8d2bc",

  "--accent": "#1f6596", // blue
  "--accent-hover": "#19659c",
  "--success": "#576801", // darkened green for contrast on light
  "--warning": "#785d06", // yellow
  "--error": "#b52c29", // red
  "--info": "#196c65", // cyan (darkened for >=3:1 on the light surface)

  "--ansi-red": "#b52c29",
  "--ansi-green": "#5c6604",
  "--ansi-yellow": "#785d06",
  "--ansi-blue": "#1f6596",
  "--ansi-magenta": "#ac2f6b",
  "--ansi-cyan": "#216c66",

  "--focus-ring": "#268bd2",
  "--shadow": "rgba(0,0,0,0.12)",
};
