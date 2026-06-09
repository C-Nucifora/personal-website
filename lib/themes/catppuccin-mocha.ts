import type { Theme } from "./types";

/** Catppuccin Mocha — the flagship dark variant. */
export const catppuccinMocha: Theme = {
  "--bg": "#181825", // mantle
  "--bg-window": "#1e1e2e", // base
  "--bg-elevated": "#313244", // surface0
  "--bg-selection": "#45475a", // surface1

  "--fg": "#cdd6f4", // text
  "--fg-muted": "#7f849c", // overlay1
  "--fg-subtle": "#585b70", // surface2

  "--border": "#313244",

  "--accent": "#89b4fa", // blue
  "--accent-hover": "#b4befe", // lavender
  "--success": "#a6e3a1", // green
  "--warning": "#f9e2af", // yellow
  "--error": "#f38ba8", // red
  "--info": "#89dceb", // sky

  "--ansi-red": "#f38ba8",
  "--ansi-green": "#a6e3a1",
  "--ansi-yellow": "#f9e2af",
  "--ansi-blue": "#89b4fa",
  "--ansi-magenta": "#cba6f7", // mauve
  "--ansi-cyan": "#94e2d5", // teal

  "--focus-ring": "#89dceb",
  "--shadow": "rgba(0,0,0,0.45)",
};
