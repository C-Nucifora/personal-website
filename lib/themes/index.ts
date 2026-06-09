import type { Theme, ThemeEntry } from "./types";
import { tokyoNight } from "./tokyo-night";
import { tokyoNightDay } from "./tokyo-night-day";

export type { Theme, ThemeEntry } from "./types";

/**
 * The theme registry. Adding a theme = adding one entry here (and its token
 * file). It then appears in `themes`, the switcher, and `theme <name>` with no
 * component changes. See docs/THEMES.md.
 */
export const themes: ThemeEntry[] = [
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    appearance: "dark",
    theme: tokyoNight,
  },
  {
    id: "tokyo-night-day",
    label: "Tokyo Night Day",
    appearance: "light",
    theme: tokyoNightDay,
  },
];

/** The theme used on a visitor's very first load (before any saved choice). */
export const DEFAULT_THEME_ID = "tokyo-night";

/** localStorage key the chosen theme persists under. */
export const THEME_STORAGE_KEY = "portfolio:theme";

export function getThemeEntry(id: string | null | undefined): ThemeEntry {
  return themes.find((t) => t.id === id) ?? themes[0];
}

/** Serialise a theme's tokens into a CSS declaration string for `:root`. */
export function themeToCssVariables(theme: Theme): string {
  return Object.entries(theme)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}
