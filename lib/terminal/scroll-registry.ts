/**
 * COPY mode scrolls real DOM containers; this maps each window's scrollable
 * element so the keyboard module (non-React) can reach them.
 */
import type { WindowKey } from "./types";

const scrollers = new Map<WindowKey, HTMLElement>();

export function registerScroller(key: WindowKey, el: HTMLElement | null): void {
  if (el) scrollers.set(key, el);
  else scrollers.delete(key);
}

export function getScroller(key: WindowKey): HTMLElement | undefined {
  return scrollers.get(key);
}

/** One scroll line ≈ the terminal's line height. */
export const LINE_PX = 22;
