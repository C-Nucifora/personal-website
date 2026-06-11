/**
 * Idle screensaver (EASTER_EGGS §4.3): three minutes without a key, click,
 * or scroll fades to matrix rain. Desktop only; suspended while another
 * overlay or a click animation is running; skipped under reduced motion.
 */
import { store } from "./store";

export const IDLE_MS = 3 * 60 * 1000;

export function initIdle(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const eligible = () => {
    const s = store.getState();
    if (s.overlay || s.animating) return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    const desktop = window.matchMedia?.("(min-width: 768px)").matches ?? true;
    return desktop;
  };

  const fire = () => {
    if (eligible()) {
      store.dispatch({ type: "set-overlay", overlay: "matrix" });
    }
    schedule(); // keep ticking — a dismissed saver can return
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, IDLE_MS);
  };

  const reset = () => schedule();

  const EVENTS = ["keydown", "pointerdown", "pointermove", "wheel", "scroll", "touchstart"];
  for (const ev of EVENTS) window.addEventListener(ev, reset, { passive: true });
  schedule();

  return () => {
    if (timer) clearTimeout(timer);
    for (const ev of EVENTS) window.removeEventListener(ev, reset);
  };
}
