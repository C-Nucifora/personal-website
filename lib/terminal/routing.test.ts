import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { store } from "./store";
import { initRouting, windowFromPath } from "./routing";

let cleanup: (() => void) | null = null;

beforeEach(() => {
  store.reset(null);
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe("windowFromPath", () => {
  test("maps window routes and the root", () => {
    expect(windowFromPath("/about/")).toBe("about");
    expect(windowFromPath("/projects")).toBe("projects");
    expect(windowFromPath("/")).toBe(null);
    expect(windowFromPath("/nonsense/")).toBe(null);
  });
});

describe("initRouting", () => {
  test("window switches push their route", () => {
    cleanup = initRouting();
    store.dispatch({ type: "switch-window", window: "resume" });
    expect(window.location.pathname).toBe("/resume/");
    store.dispatch({ type: "switch-window", window: null });
    expect(window.location.pathname).toBe("/");
  });

  test("popstate switches the window without pushing again", () => {
    cleanup = initRouting();
    store.dispatch({ type: "switch-window", window: "about" });
    window.history.replaceState({}, "", "/contact/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(store.getState().activeWindow).toBe("contact");
    expect(window.location.pathname).toBe("/contact/");
  });

  test("the init-script interceptor's re-emitted event also switches", () => {
    cleanup = initRouting();
    window.history.replaceState({}, "", "/resume/");
    window.dispatchEvent(new Event("terminal:popstate"));
    expect(store.getState().activeWindow).toBe("resume");
  });

  test("claims and releases terminal history ownership", () => {
    cleanup = initRouting();
    expect(window.__terminalHistory).toBe(true);
    cleanup();
    cleanup = null;
    expect(window.__terminalHistory).toBe(false);
  });
});
