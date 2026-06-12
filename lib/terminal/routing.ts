/**
 * URL ↔ window sync (FLOW.md §4). Window switches push /<window>/ and
 * back/forward map to window switches — with the Next.js client router kept
 * out of it entirely:
 *
 * - Next patches `window.history.pushState`, and a pathname change through
 *   the patched version makes its router fetch the new route's RSC payload
 *   (falling back to a full browser navigation when that fails). We call the
 *   native `History.prototype.pushState` instead, so Next never notices.
 * - Next also owns a `popstate` listener that re-renders the route. The
 *   pre-hydration init script (lib/themes/init-script.ts) registers the
 *   first popstate listener on the page; while `window.__terminalHistory`
 *   is set it stops propagation and re-emits "terminal:popstate", which we
 *   handle here as a pure window switch. No fetch, no remount.
 */
import { ACTIVE_WINDOW_IDS, type WindowId } from "@/lib/vfs/types";
import { ensureWindowDisplayed } from "./executor";
import { store } from "./store";

declare global {
  interface Window {
    __terminalHistory?: boolean;
  }
}

export function windowFromPath(pathname: string): WindowId | null {
  const seg = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return (ACTIVE_WINDOW_IDS as readonly string[]).includes(seg) ? (seg as WindowId) : null;
}

export function pathForWindow(window: WindowId | null): string {
  return window ? `/${window}/` : "/";
}

export function initRouting(): () => void {
  let applying = false;
  let lastWindow = store.getState().activeWindow;
  window.__terminalHistory = true;

  const unsubscribe = store.subscribe(() => {
    const w = store.getState().activeWindow;
    if (w === lastWindow) return;
    lastWindow = w;
    if (!applying && window.location.pathname !== pathForWindow(w)) {
      // Native pushState — bypasses Next's history patch (see header).
      History.prototype.pushState.call(window.history, {}, "", pathForWindow(w));
    }
  });

  const onPopState = () => {
    const w = windowFromPath(window.location.pathname);
    applying = true;
    store.dispatch({ type: "switch-window", window: w });
    ensureWindowDisplayed();
    applying = false;
  };
  // Real page loads route through the init-script interceptor; the plain
  // popstate listener is the fallback for environments without it (tests).
  window.addEventListener("terminal:popstate", onPopState);
  window.addEventListener("popstate", onPopState);

  return () => {
    window.__terminalHistory = false;
    unsubscribe();
    window.removeEventListener("terminal:popstate", onPopState);
    window.removeEventListener("popstate", onPopState);
  };
}
