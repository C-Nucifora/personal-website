"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeEntry } from "@/lib/themes";

/**
 * CRT effects (EASTER_EGGS §5): scanlines, faint flicker, subtle curvature
 * vignette. Driven by the active theme's `effects` — palette-only under
 * prefers-reduced-motion (the flicker animation is disabled in CSS).
 */
export function CrtOverlay() {
  const { themeId } = useTheme();
  const effects = getThemeEntry(themeId).effects;
  if (!effects) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
      {effects.scanlines && <div className="crt-scanlines absolute inset-0" />}
      {effects.flicker && <div className="crt-flicker absolute inset-0" />}
      {effects.curvature && <div className="crt-curvature absolute inset-0" />}
    </div>
  );
}
