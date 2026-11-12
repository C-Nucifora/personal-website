/**
 * The one terminal store. A module-level external store (consumed in React
 * via useSyncExternalStore) so non-React modules — executor, keyboard
 * dispatch, idle timer, routing — can read and dispatch synchronously.
 */
import { initialState, reduce } from "./reducer";
import type { Action, AppState, WindowId } from "./types";

let state: AppState = initialState(null);
let session = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export const store = {
  getSession(): number {
    return session;
  },
  /** Discard callbacks from a terminal that has been cleaned up. */
  invalidateSession(): void {
    session += 1;
  },
  getState(): AppState {
    return state;
  },
  dispatch(action: Action): void {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Reinitialize (page mount with a deep-linked window, and tests). */
  reset(initialWindow: WindowId | null): void {
    session += 1;
    state = initialState(initialWindow);
    notify();
  },
};
