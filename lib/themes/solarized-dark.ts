import type { Theme } from "./types";

/** Solarized Dark — Ethan Schoonover's precision palette. */
export const solarizedDark: Theme = {
  "--bg": "#00212b",
  "--bg-window": "#002b36", // base03
  "--bg-elevated": "#073642", // base02
  "--bg-selection": "#094f5f",

  "--fg": "#93a1a1", // base1
  "--fg-muted": "#7c9092",
  "--fg-subtle": "#33545d",

  "--border": "#0e4b5a",

  "--accent": "#268bd2", // blue
  "--accent-hover": "#3a9bdf",
  "--success": "#859900", // green
  "--warning": "#b58900", // yellow
  "--error": "#dc322f", // red
  "--info": "#2aa198", // cyan

  "--ansi-red": "#dc322f",
  "--ansi-green": "#859900",
  "--ansi-yellow": "#b58900",
  "--ansi-blue": "#268bd2",
  "--ansi-magenta": "#d33682",
  "--ansi-cyan": "#2aa198",

  "--focus-ring": "#2aa198",
  "--shadow": "rgba(0,0,0,0.45)",
};
