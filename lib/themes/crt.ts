import type { Theme } from "./types";

/**
 * CRT — the Konami unlock (EASTER_EGGS §5). Phosphor green on near-black,
 * a full token set like any other theme; the scanline/flicker/curvature
 * overlay rides on the entry's `effects`, not on component hacks.
 * Contrast: #33ff66 on #041204 ≈ 13:1.
 */
export const crt: Theme = {
  "--bg": "#010401",
  "--bg-window": "#041204",
  "--bg-elevated": "#072007",
  "--bg-selection": "#0e3a0e",

  "--fg": "#33ff66",
  "--fg-muted": "#22aa44",
  "--fg-subtle": "#156828",

  "--border": "#156828",

  "--accent": "#66ff99",
  "--accent-hover": "#99ffbb",
  "--success": "#33ff66",
  "--warning": "#ccff33",
  "--error": "#ff5533",
  "--info": "#66ffcc",

  "--ansi-red": "#ff5533",
  "--ansi-green": "#33ff66",
  "--ansi-yellow": "#ccff33",
  "--ansi-blue": "#33ccff",
  "--ansi-magenta": "#ff66cc",
  "--ansi-cyan": "#66ffcc",

  "--focus-ring": "#99ffbb",
  "--shadow": "rgba(51, 255, 102, 0.15)",
};
