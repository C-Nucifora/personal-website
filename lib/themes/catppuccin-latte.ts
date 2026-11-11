import type { Theme } from "./types";

/** Catppuccin Latte — the light variant. */
export const catppuccinLatte: Theme = {
  "--bg": "#dce0e8", // crust
  "--bg-window": "#eff1f5", // base
  "--bg-elevated": "#e6e9ef", // mantle
  "--bg-selection": "#bcc0cc", // surface1

  "--fg": "#4c4f69", // text
  "--fg-muted": "#5f6275", // subtext0
  "--fg-subtle": "#9ca0b0", // overlay0

  "--border": "#ccd0da", // surface0

  "--accent": "#1c5ad5", // blue
  "--accent-hover": "#1452d4",
  "--success": "#28721f", // green (darkened for >=3:1 on the light surface)
  "--warning": "#885a18", // yellow
  "--error": "#c60f37", // red
  "--info": "#156e73", // teal (darkened for >=3:1 on the light surface)

  "--ansi-red": "#c60f37",
  "--ansi-green": "#307122",
  "--ansi-yellow": "#885a18",
  "--ansi-blue": "#1c5ad5",
  "--ansi-magenta": "#8036df", // mauve
  "--ansi-cyan": "#156e73", // teal

  "--focus-ring": "#1e66f5",
  "--shadow": "rgba(0,0,0,0.12)",
};
