import { activePane, activeWindowKey } from "./reducer";
import { store } from "./store";

/** Restore shell focus after command clicks without opening a mobile keyboard. */
export function focusActivePrompt(): void {
  if (typeof document === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
  requestAnimationFrame(() => {
    if (document.documentElement.getAttribute("data-view") === "plain") return;
    if (document.activeElement?.tagName === "SELECT") return;
    const state = store.getState();
    const pane = document.querySelector<HTMLElement>(`[data-window="${activeWindowKey(state)}"] [data-pane-id="${activePane(state).id}"]`);
    (pane?.querySelector<HTMLElement>(".cm-content, input") ?? pane)?.focus({ preventScroll: true });
  });
}
