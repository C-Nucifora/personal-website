"use client";

import { useSyncExternalStore } from "react";
import { store } from "./store";
import type { AppState } from "./types";

/**
 * Read a slice of the terminal store. Selectors must return stable values
 * (primitives or references the reducer leaves untouched) or the component
 * re-renders on every dispatch.
 */
export function useTerminalStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
