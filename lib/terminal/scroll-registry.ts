/**
 * COPY mode and pane-size checks reach real DOM containers; this maps each
 * pane's scrollable element (keyed "window:paneId") so the keyboard module
 * (non-React) can reach them.
 */
const scrollers = new Map<string, HTMLElement>();

export function registerScroller(key: string, el: HTMLElement | null): void {
  if (el) scrollers.set(key, el);
  else scrollers.delete(key);
}

export function getScroller(key: string): HTMLElement | undefined {
  return scrollers.get(key);
}

/** One scroll line ≈ the terminal's line height. */
export const LINE_PX = 22;
