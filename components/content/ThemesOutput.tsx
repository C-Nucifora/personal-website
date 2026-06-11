"use client";

import { visibleThemes } from "@/lib/themes";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";

interface ThemesOutputProps {
  currentId: string;
  onSet: (id: string) => void;
}

/** `theme` output: each available theme as a clickable swatch + name. */
export function ThemesOutput({ currentId, onSet }: ThemesOutputProps) {
  const themes = visibleThemes(useTerminalStore((s) => s.crtUnlocked));
  return (
    <div className="space-y-3">
      <p className="text-fg">Pick a theme — it applies instantly and is remembered:</p>
      <ul className="flex flex-wrap gap-2">
        {themes.map((t) => {
          const active = t.id === currentId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSet(t.id)}
                aria-pressed={active}
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer",
                  active
                    ? "border-accent text-accent"
                    : "border-border bg-elevated text-fg hover:border-accent/60",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 overflow-hidden rounded-full border border-border"
                >
                  <span className="w-1/2" style={{ background: t.theme["--bg-window"] }} />
                  <span className="w-1/2" style={{ background: t.theme["--accent"] }} />
                </span>
                {t.label}
                {active && <span className="text-xs text-muted">(current)</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        Or type <span className="font-mono text-fg">theme {themes[0].id}</span>.
      </p>
    </div>
  );
}
