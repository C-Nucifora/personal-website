import { describe, expect, test } from "vitest";
import { store } from "./store";

describe("store", () => {
  test("dispatch reduces into new state", () => {
    store.reset(null);
    store.dispatch({ type: "switch-window", window: "about" });
    expect(store.getState().activeWindow).toBe("about");
  });

  test("subscribers are notified on change and can unsubscribe", () => {
    store.reset(null);
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.dispatch({ type: "switch-window", window: "help" });
    expect(calls).toBe(1);
    unsub();
    store.dispatch({ type: "switch-window", window: null });
    expect(calls).toBe(1);
  });

  test("reset restores a fresh state with the given window", () => {
    store.dispatch({ type: "history-append", line: "ls" });
    store.reset("projects");
    expect(store.getState().activeWindow).toBe("projects");
    expect(store.getState().history).toEqual(["vim resume.md"]);
  });
});
