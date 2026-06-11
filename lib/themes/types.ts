/**
 * The semantic token contract. Every theme must define exactly these keys.
 * Component code only ever reads these names (as CSS custom properties);
 * it never knows which theme is active. See docs/THEMES.md.
 *
 * Keeping this as a closed key set means a missing token fails at compile time.
 */
export interface Theme {
  // Surfaces
  "--bg": string; // page background behind the window
  "--bg-window": string; // terminal window surface
  "--bg-elevated": string; // nav bar, title bar, panels, chips
  "--bg-selection": string; // text selection / active line highlight

  // Text
  "--fg": string; // primary text
  "--fg-muted": string; // secondary text, comments, placeholder
  "--fg-subtle": string; // borders made of text, dividers

  // Lines
  "--border": string; // window / title-bar / panel borders

  // Accent + state
  "--accent": string; // prompt symbol, links, focused chip, primary action
  "--accent-hover": string; // hover / active state of accent
  "--success": string; // success messages, "Live" badges
  "--warning": string; // warnings
  "--error": string; // command-not-found, form errors
  "--info": string; // hints, help emphasis

  // ANSI-style palette for output, tags, dots
  "--ansi-red": string;
  "--ansi-green": string;
  "--ansi-yellow": string;
  "--ansi-blue": string;
  "--ansi-magenta": string;
  "--ansi-cyan": string;

  // Accessibility + depth
  "--focus-ring": string; // keyboard focus outline (>= 3:1 against neighbours)
  "--shadow": string; // window drop shadow (rgba string)
}

/** A theme as registered: a stable id, a human label, and its tokens. */
export interface ThemeEntry {
  id: string;
  label: string;
  /** "dark" | "light" — used for the first-visit prefers-color-scheme default. */
  appearance: "dark" | "light";
  theme: Theme;
  /** Visual overlays the theme brings along (CRT scanlines etc.). */
  effects?: {
    scanlines?: boolean;
    flicker?: boolean; // disabled under prefers-reduced-motion
    curvature?: boolean;
  };
  /** Hidden from listings until the unlock fires (Konami → CRT). */
  unlock?: "konami";
}
