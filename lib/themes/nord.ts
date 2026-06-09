import type { Theme } from "./types";

/** Nord — arctic, muted blue palette. */
export const nord: Theme = {
  "--bg": "#242933",
  "--bg-window": "#2e3440", // nord0
  "--bg-elevated": "#3b4252", // nord1
  "--bg-selection": "#434c5e", // nord2

  "--fg": "#d8dee9", // nord4
  "--fg-muted": "#7b88a1", // brightened comment grey
  "--fg-subtle": "#4c566a", // nord3

  "--border": "#3b4252",

  "--accent": "#88c0d0", // nord8 (frost)
  "--accent-hover": "#9fd0de",
  "--success": "#a3be8c", // nord14
  "--warning": "#ebcb8b", // nord13
  "--error": "#bf616a", // nord11
  "--info": "#88c0d0",

  "--ansi-red": "#bf616a",
  "--ansi-green": "#a3be8c",
  "--ansi-yellow": "#ebcb8b",
  "--ansi-blue": "#81a1c1", // nord9
  "--ansi-magenta": "#b48ead", // nord15
  "--ansi-cyan": "#8fbcbb", // nord7

  "--focus-ring": "#88c0d0",
  "--shadow": "rgba(0,0,0,0.45)",
};
