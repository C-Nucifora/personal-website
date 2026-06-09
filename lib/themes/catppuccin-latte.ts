import type { Theme } from "./types";

/** Catppuccin Latte — the light variant. */
export const catppuccinLatte: Theme = {
  "--bg": "#dce0e8", // crust
  "--bg-window": "#eff1f5", // base
  "--bg-elevated": "#e6e9ef", // mantle
  "--bg-selection": "#bcc0cc", // surface1

  "--fg": "#4c4f69", // text
  "--fg-muted": "#6c6f85", // subtext0
  "--fg-subtle": "#9ca0b0", // overlay0

  "--border": "#ccd0da", // surface0

  "--accent": "#1e66f5", // blue
  "--accent-hover": "#1452d4",
  "--success": "#2f8f23", // green (darkened for >=3:1 on the light surface)
  "--warning": "#df8e1d", // yellow
  "--error": "#d20f39", // red
  "--info": "#179299", // teal (darkened for >=3:1 on the light surface)

  "--ansi-red": "#d20f39",
  "--ansi-green": "#40a02b",
  "--ansi-yellow": "#df8e1d",
  "--ansi-blue": "#1e66f5",
  "--ansi-magenta": "#8839ef", // mauve
  "--ansi-cyan": "#179299", // teal

  "--focus-ring": "#1e66f5",
  "--shadow": "rgba(0,0,0,0.12)",
};
