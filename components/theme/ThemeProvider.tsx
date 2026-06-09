"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  themes,
  getThemeEntry,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  type ThemeEntry,
} from "@/lib/themes";

interface ThemeContextValue {
  themeId: string;
  themes: ThemeEntry[];
  setTheme: (id: string) => boolean; // returns false for an unknown id
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the id the pre-paint script already applied, so we don't flash. */
function readInitialThemeId(): string {
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.getAttribute("data-theme");
    if (fromDom && themes.some((t) => t.id === fromDom)) return fromDom;
  }
  return DEFAULT_THEME_ID;
}

function applyTheme(id: string) {
  const { theme } = getThemeEntry(id);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", id);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(readInitialThemeId);

  // Keep :root in sync whenever the choice changes.
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const setTheme = useCallback((id: string): boolean => {
    if (!themes.some((t) => t.id === id)) return false;
    setThemeId(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* storage may be unavailable (private mode); the choice still applies */
    }
    return true;
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, themes, setTheme }),
    [themeId, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
