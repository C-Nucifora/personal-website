/**
 * Plain view (recruiter mode). The `plain` command, the title-bar button,
 * and `?plain=1` all funnel here; the attribute drives the same CSS pair
 * that already handles the no-JS and print fallbacks (app/globals.css).
 */
export type ViewMode = "terminal" | "plain";

export const VIEW_STORAGE_KEY = "portfolio:view";

/** Reflect a mode into the DOM without recording a choice. */
export function applyViewMode(mode: ViewMode): void {
  if (mode === "plain") document.documentElement.setAttribute("data-view", "plain");
  else document.documentElement.removeAttribute("data-view");
}

/** An explicit visitor choice: reflect it and persist it. */
export function setViewMode(mode: ViewMode): void {
  applyViewMode(mode);
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
}

/** Boot-time resolution: explicit URL param > saved choice > terminal. */
export function initialViewMode(search: string): ViewMode {
  const plain = new URLSearchParams(search).get("plain");
  if (plain === "1" || plain === "true") return "plain";
  if (plain === "0" || plain === "false") return "terminal";
  try {
    if (localStorage.getItem(VIEW_STORAGE_KEY) === "plain") return "plain";
  } catch {
    /* storage unavailable */
  }
  return "terminal";
}
