/**
 * URL ↔ window sync (FLOW.md §4). Window switches push /<window>/ with
 * native pushState (no Next navigation, no remount); back/forward map to
 * window switches via popstate.
 */
import { WINDOW_IDS, type WindowId } from "@/lib/vfs/types";
import { ensureWindowDisplayed } from "./executor";
import { store } from "./store";

export function windowFromPath(pathname: string): WindowId | null {
  const seg = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return (WINDOW_IDS as readonly string[]).includes(seg) ? (seg as WindowId) : null;
}

export function pathForWindow(window: WindowId | null): string {
  return window ? `/${window}/` : "/";
}

export function initRouting(): () => void {
  let applying = false;
  let lastWindow = store.getState().activeWindow;

  const unsubscribe = store.subscribe(() => {
    const w = store.getState().activeWindow;
    if (w === lastWindow) return;
    lastWindow = w;
    if (!applying && window.location.pathname !== pathForWindow(w)) {
      window.history.pushState({}, "", pathForWindow(w));
    }
  });

  const onPopState = () => {
    const w = windowFromPath(window.location.pathname);
    applying = true;
    store.dispatch({ type: "switch-window", window: w });
    ensureWindowDisplayed();
    applying = false;
  };
  window.addEventListener("popstate", onPopState);

  return () => {
    unsubscribe();
    window.removeEventListener("popstate", onPopState);
  };
}
