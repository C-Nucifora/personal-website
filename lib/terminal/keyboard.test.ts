import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { store } from "./store";
import { initKeyboard } from "./keyboard";

let cleanup: (() => void) | null = null;

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

beforeEach(() => {
  store.reset(null);
  cleanup = initKeyboard();
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
  vi.unstubAllGlobals();
});

describe("tmux prefix (FLOW §7.2)", () => {
  test("Ctrl+b arms the prefix, a digit jumps to that window", () => {
    press("b", { ctrlKey: true });
    expect(store.getState().pendingPrefix).toBe(true);
    press("2");
    expect(store.getState().pendingPrefix).toBe(false);
    expect(store.getState().activeWindow).toBe("projects");
    // first activation auto-displays
    expect(
      store.getState().windows.projects.panes[0].scrollback.some((l) => l.command === "ls"),
    ).toBe(true);
  });

  test("n and p cycle windows", () => {
    press("b", { ctrlKey: true });
    press("n");
    expect(store.getState().activeWindow).toBe("about");
    press("b", { ctrlKey: true });
    press("n");
    expect(store.getState().activeWindow).toBe("projects");
    press("b", { ctrlKey: true });
    press("p");
    expect(store.getState().activeWindow).toBe("about");
  });

  test("an unbound key cancels the prefix silently", () => {
    press("b", { ctrlKey: true });
    press("q");
    expect(store.getState().pendingPrefix).toBe(false);
    expect(store.getState().activeWindow).toBe(null);
  });

  test("Escape cancels the prefix", () => {
    press("b", { ctrlKey: true });
    press("Escape");
    expect(store.getState().pendingPrefix).toBe(false);
  });
});

describe("pending confirms", () => {
  test("y opens the confirmed url in a new tab", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    store.dispatch({
      type: "set-confirm",
      confirm: { kind: "openUrl", payload: "https://example.com" },
    });
    press("y");
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    expect(store.getState().pendingConfirm).toBe(null);
  });

  test("n cancels the confirm", () => {
    store.dispatch({
      type: "set-confirm",
      confirm: { kind: "openUrl", payload: "https://example.com" },
    });
    press("n");
    expect(store.getState().pendingConfirm).toBe(null);
  });
});

describe("NORMAL mode (FLOW §6.2)", () => {
  function normal(input: string, pos = 0) {
    store.dispatch({ type: "set-input", windowKey: "lobby", text: input, cursorPos: pos });
    store.dispatch({ type: "set-mode", windowKey: "lobby", mode: "NORMAL" });
  }
  const pane = () => store.getState().lobby.panes[0];

  test("dw deletes a word in the input buffer", () => {
    normal("foo bar");
    press("d");
    press("w");
    expect(pane().inputBuffer).toBe("bar");
    expect(pane().mode).toBe("NORMAL");
  });

  test("i returns to INSERT", () => {
    normal("abc");
    press("i");
    expect(pane().mode).toBe("INSERT");
  });

  test("Enter executes the line from NORMAL", () => {
    normal("pwd");
    press("Enter");
    expect(pane().scrollback.some((l) => l.command === "pwd")).toBe(true);
    expect(pane().inputBuffer).toBe("");
    expect(pane().mode).toBe("INSERT");
  });

  test("k walks history up", () => {
    store.dispatch({ type: "history-append", line: "ls" });
    normal("");
    press("k");
    expect(pane().inputBuffer).toBe("ls");
  });

  test("unknown key flashes the mode indicator", () => {
    normal("abc");
    const before = store.getState().flashNonce;
    press("Q");
    expect(store.getState().flashNonce).toBe(before + 1);
  });

  test("printable keys never leak to the browser default", () => {
    normal("abc");
    const e = new KeyboardEvent("keydown", { key: "x", bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});

describe("COPY mode (FLOW §6.3)", () => {
  function fakeScroller() {
    return { scrollTop: 500, scrollHeight: 1000, clientHeight: 200 } as HTMLElement;
  }

  test("Ctrl+b [ enters COPY, q exits and re-pins to bottom", async () => {
    const { registerScroller } = await import("./scroll-registry");
    const el = fakeScroller();
    registerScroller("lobby:lobby-p1", el);
    press("b", { ctrlKey: true });
    press("[");
    expect(store.getState().lobby.panes[0].mode).toBe("COPY");
    press("q");
    expect(store.getState().lobby.panes[0].mode).toBe("INSERT");
    expect(el.scrollTop).toBe(1000);
  });

  test("j and k scroll by lines, Ctrl+d by half a page", async () => {
    const { registerScroller } = await import("./scroll-registry");
    const el = fakeScroller();
    registerScroller("lobby:lobby-p1", el);
    press("b", { ctrlKey: true });
    press("[");
    const start = el.scrollTop;
    press("j");
    expect(el.scrollTop).toBeGreaterThan(start);
    press("k");
    expect(el.scrollTop).toBe(start);
    press("d", { ctrlKey: true });
    expect(el.scrollTop).toBe(start + 100);
    press("Escape");
    expect(store.getState().lobby.panes[0].mode).toBe("INSERT");
  });

  test("gg goes to the top, G to the bottom", async () => {
    const { registerScroller } = await import("./scroll-registry");
    const el = fakeScroller();
    registerScroller("lobby:lobby-p1", el);
    press("b", { ctrlKey: true });
    press("[");
    press("g");
    press("g");
    expect(el.scrollTop).toBe(0);
    press("G");
    expect(el.scrollTop).toBe(1000);
    press("q");
  });
});

describe("pane prefix bindings (FLOW §7.2/§7.3)", () => {
  function inProjects() {
    store.dispatch({ type: "switch-window", window: "projects" });
    store.dispatch({ type: "mark-visited", window: "projects" });
  }
  const projects = () => store.getState().windows.projects;

  test("Ctrl+b % splits in the projects window", () => {
    inProjects();
    press("b", { ctrlKey: true });
    press("%");
    expect(projects().panes).toHaveLength(2);
  });

  test("splits elsewhere advertise the projects window", () => {
    store.dispatch({ type: "switch-window", window: "about" });
    press("b", { ctrlKey: true });
    press("%");
    expect(store.getState().windows.about.panes).toHaveLength(1);
    expect(store.getState().notice?.text).toContain("projects window");
  });

  test("Ctrl+b x asks for confirmation, y closes the pane", () => {
    inProjects();
    press("b", { ctrlKey: true });
    press('"');
    expect(projects().panes).toHaveLength(2);
    press("b", { ctrlKey: true });
    press("x");
    expect(store.getState().pendingConfirm?.kind).toBe("closePane");
    press("y");
    expect(projects().panes).toHaveLength(1);
  });

  test("closing the only pane is refused with a notice", () => {
    inProjects();
    press("b", { ctrlKey: true });
    press("x");
    expect(store.getState().pendingConfirm).toBe(null);
    expect(store.getState().notice?.text).toBeTruthy();
  });

  test("Ctrl+b o cycles pane focus", () => {
    inProjects();
    press("b", { ctrlKey: true });
    press("%");
    const second = projects().activePane;
    press("b", { ctrlKey: true });
    press("o");
    expect(projects().activePane).not.toBe(second);
  });

  test("Ctrl+b z toggles zoom", () => {
    inProjects();
    press("b", { ctrlKey: true });
    press("%");
    press("b", { ctrlKey: true });
    press("z");
    expect(projects().zoomed).toBe(projects().activePane);
    press("b", { ctrlKey: true });
    press("z");
    expect(projects().zoomed).toBe(null);
  });

  test("Ctrl+b ? prints the binding cheatsheet without an echo", () => {
    press("b", { ctrlKey: true });
    press("?");
    const sb = store.getState().lobby.panes[0].scrollback;
    expect(sb.length).toBeGreaterThan(0);
    expect(sb[sb.length - 1].command).toBe(null);
  });
});

describe("window picker (Ctrl+b w)", () => {
  test("opens, navigates with j, selects with Enter", () => {
    press("b", { ctrlKey: true });
    press("w");
    expect(store.getState().picker).not.toBe(null);
    press("j");
    press("j");
    press("Enter");
    expect(store.getState().picker).toBe(null);
    expect(store.getState().activeWindow).toBe("resume");
  });

  test("Escape closes without switching", () => {
    press("b", { ctrlKey: true });
    press("w");
    press("Escape");
    expect(store.getState().picker).toBe(null);
    expect(store.getState().activeWindow).toBe(null);
  });
});

describe("Konami code (EASTER_EGGS §3)", () => {
  const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];

  test("entering the code unlocks the CRT theme", () => {
    expect(store.getState().crtUnlocked).toBe(false);
    for (const key of KONAMI) press(key);
    expect(store.getState().crtUnlocked).toBe(true);
    expect(store.getState().notice?.text).toContain("theme unlocked: crt");
    expect(localStorage.getItem("portfolio:crt-unlocked")).toBe("1");
    localStorage.removeItem("portfolio:crt-unlocked");
  });

  test("a wrong key resets the sequence", () => {
    for (const key of KONAMI.slice(0, 5)) press(key);
    press("x");
    for (const key of KONAMI.slice(5)) press(key);
    expect(store.getState().crtUnlocked).toBe(false);
  });
});

describe("animation skip", () => {
  test("any keypress completes a running click animation", async () => {
    vi.useFakeTimers();
    const { animateClick } = await import("./animate");
    animateClick("pwd");
    vi.advanceTimersByTime(20);
    press("x");
    expect(
      store.getState().lobby.panes[0].scrollback.some((l) => l.command === "pwd"),
    ).toBe(true);
    expect(store.getState().animating).toBe(null);
    vi.useRealTimers();
  });
});

describe("Ctrl+l", () => {
  test("clears the active pane", () => {
    store.dispatch({ type: "append-line", windowKey: "lobby", command: "x", node: null });
    press("l", { ctrlKey: true });
    expect(store.getState().lobby.panes[0].scrollback).toHaveLength(0);
  });
});

describe("plain view (recruiter mode)", () => {
  test("keys are ignored while data-view=plain", () => {
    document.documentElement.setAttribute("data-view", "plain");
    press("b", { ctrlKey: true });
    expect(store.getState().pendingPrefix).toBe(false);
    document.documentElement.removeAttribute("data-view");
  });
});
