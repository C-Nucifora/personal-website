import type { Theme } from "./types";

/** Solarized Dark — Ethan Schoonover's precision palette. */
export const solarizedDark: Theme = {
  "--bg": "#00212b",
  "--bg-window": "#002b36", // base03
  "--bg-elevated": "#073642", // base02
  "--bg-selection": "#094f5f",

  "--fg": "#93a1a1", // base1
  "--fg-muted": "#8b9c9e",
  "--fg-subtle": "#33545d",

  "--border": "#0e4b5a",

  "--accent": "#4d9fd9", // blue
  "--accent-hover": "#43a0e0",
  "--success": "#8fa116", // green
  "--warning": "#bb9316", // yellow
  "--error": "#e57876", // red
  "--info": "#3aa89f", // cyan

  "--ansi-red": "#e57876",
  "--ansi-green": "#8fa116",
  "--ansi-yellow": "#bb9316",
  "--ansi-blue": "#4d9fd9",
  "--ansi-magenta": "#df77a9",
  "--ansi-cyan": "#3aa89f",

  "--focus-ring": "#2aa198",
  "--shadow": "rgba(0,0,0,0.45)",
};
