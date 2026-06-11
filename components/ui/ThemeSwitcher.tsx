"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { visibleThemes } from "@/lib/themes";
import { runClick } from "@/lib/terminal/run-click";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";

/**
 * Title-bar theme picker. Selecting an option echoes and executes
 * `theme <name>` in the active pane — the GUI control stays inside the
 * one-state rule (FLOW §10.1). Native <select> for keyboard + a11y.
 */
export function ThemeSwitcher() {
  const { themeId } = useTheme();
  const themes = visibleThemes(useTerminalStore((s) => s.crtUnlocked));

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="sr-only">Theme</span>
      <select
        value={themeId}
        onChange={(e) => runClick(`theme ${e.target.value}`)}
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
