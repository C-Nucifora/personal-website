"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

/** Title-bar theme picker. A native <select> for robust keyboard + a11y. */
export function ThemeSwitcher() {
  const { themeId, themes, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="sr-only">Theme</span>
      <select
        value={themeId}
        onChange={(e) => setTheme(e.target.value)}
        className="cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-fg transition-colors hover:border-accent/60 focus-visible:outline-2"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
