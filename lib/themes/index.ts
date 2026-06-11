import type { Theme, ThemeEntry } from "./types";
import { tokyoNight } from "./tokyo-night";
import { tokyoNightDay } from "./tokyo-night-day";
import { catppuccinMocha } from "./catppuccin-mocha";
import { catppuccinLatte } from "./catppuccin-latte";
import { gruvbox } from "./gruvbox";
import { dracula } from "./dracula";
import { nord } from "./nord";
import { oneDark } from "./one-dark";
import { solarizedDark } from "./solarized-dark";
import { solarizedLight } from "./solarized-light";
import { rosePine } from "./rose-pine";
import { crt } from "./crt";

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
  { id: "catppuccin-mocha", label: "Catppuccin Mocha", appearance: "dark", theme: catppuccinMocha },
  { id: "catppuccin-latte", label: "Catppuccin Latte", appearance: "light", theme: catppuccinLatte },
  { id: "gruvbox", label: "Gruvbox", appearance: "dark", theme: gruvbox },
  { id: "dracula", label: "Dracula", appearance: "dark", theme: dracula },
  { id: "nord", label: "Nord", appearance: "dark", theme: nord },
  { id: "one-dark", label: "One Dark", appearance: "dark", theme: oneDark },
  { id: "solarized-dark", label: "Solarized Dark", appearance: "dark", theme: solarizedDark },
  { id: "solarized-light", label: "Solarized Light", appearance: "light", theme: solarizedLight },
  { id: "rose-pine", label: "Rosé Pine", appearance: "dark", theme: rosePine },
  {
    id: "crt",
    label: "CRT (unlocked)",
    appearance: "dark",
    theme: crt,
    effects: { scanlines: true, flicker: true, curvature: true },
    unlock: "konami",
  },
];

/** Themes visible in listings — locked entries appear once unlocked. */
export function visibleThemes(crtUnlocked: boolean): ThemeEntry[] {
  return themes.filter((t) => !t.unlock || crtUnlocked);
}

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
