import { describe, expect, test } from "vitest";
import { getPane, initialState, reduce } from "./reducer";
import { leafIds } from "./layout";
import type { AppState } from "./types";

function projectsReady(): AppState {
  let s = initialState("projects");
  s = reduce(s, { type: "mark-visited", window: "projects" });
  return s;
}

describe("split-pane (FLOW §7.3)", () => {
  test("splitting adds a pane and focuses it", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    const w = s.windows.projects;
    expect(w.panes).toHaveLength(2);
    expect(leafIds(w.layout)).toHaveLength(2);
    expect(w.activePane).toBe(w.panes[1].id);
  });

  test("the new pane inherits cwd, gets fresh scrollback with a header", () => {
    let s = projectsReady();
    s = reduce(s, { type: "set-cwd", windowKey: "projects", path: "~/projects/foo" });
    s = reduce(s, { type: "append-line", windowKey: "projects", command: "x", node: null });
    s = reduce(s, { type: "split-pane", window: "projects", dir: "col" });
    const fresh = getPane(s, "projects");
    expect(fresh.cwd).toBe("~/projects/foo");
    expect(fresh.scrollback).toHaveLength(1); // just the header line
    expect(String(fresh.scrollback[0].node)).toContain("~/projects/foo");
  });

  test("splits cap at 4 panes", () => {
    let s = projectsReady();
    for (let i = 0; i < 5; i++) {
      s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    }
    expect(s.windows.projects.panes).toHaveLength(4);
  });
});

describe("close-pane", () => {
  test("closing returns to the sibling and prunes the tree", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    const closed = s.windows.projects.activePane;
    s = reduce(s, { type: "close-pane", window: "projects", paneId: closed });
    const w = s.windows.projects;
    expect(w.panes).toHaveLength(1);
    expect(leafIds(w.layout)).toEqual([w.panes[0].id]);
    expect(w.activePane).toBe(w.panes[0].id);
  });

  test("the last pane cannot be closed", () => {
    let s = projectsReady();
    const only = s.windows.projects.activePane;
    s = reduce(s, { type: "close-pane", window: "projects", paneId: only });
    expect(s.windows.projects.panes).toHaveLength(1);
  });
});

describe("pane focus", () => {
  test("cycle-pane rotates focus", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    const [a, b] = s.windows.projects.panes.map((p) => p.id);
    expect(s.windows.projects.activePane).toBe(b);
    s = reduce(s, { type: "cycle-pane", window: "projects" });
    expect(s.windows.projects.activePane).toBe(a);
    s = reduce(s, { type: "cycle-pane", window: "projects" });
    expect(s.windows.projects.activePane).toBe(b);
  });

  test("directional focus follows geometry", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" }); // left | right(active)
    s = reduce(s, { type: "focus-direction", window: "projects", dir: "left" });
    expect(s.windows.projects.activePane).toBe(s.windows.projects.panes[0].id);
    s = reduce(s, { type: "focus-direction", window: "projects", dir: "right" });
    expect(s.windows.projects.activePane).toBe(s.windows.projects.panes[1].id);
  });

  test("focus-pane sets focus directly", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    const first = s.windows.projects.panes[0].id;
    s = reduce(s, { type: "focus-pane", window: "projects", paneId: first });
    expect(s.windows.projects.activePane).toBe(first);
  });
});

describe("zoom", () => {
  test("zoom toggles on the active pane and clears on close", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    s = reduce(s, { type: "zoom-pane", window: "projects" });
    expect(s.windows.projects.zoomed).toBe(s.windows.projects.activePane);
    s = reduce(s, { type: "zoom-pane", window: "projects" });
    expect(s.windows.projects.zoomed).toBe(null);
  });
});

describe("set-ratio", () => {
  test("updates the split ratio within bounds", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    const layout = s.windows.projects.layout;
    if (layout.type !== "split") throw new Error("expected split");
    s = reduce(s, { type: "set-ratio", window: "projects", splitId: layout.id, ratio: 0.3 });
    const after = s.windows.projects.layout;
    expect(after.type === "split" && after.ratio).toBeCloseTo(0.3);
  });
});

describe("commands route to the focused pane", () => {
  test("append-line lands in the active pane only", () => {
    let s = projectsReady();
    s = reduce(s, { type: "split-pane", window: "projects", dir: "row" });
    s = reduce(s, { type: "append-line", windowKey: "projects", command: "pwd", node: null });
    const [a, b] = s.windows.projects.panes;
    expect(b.scrollback.some((l) => l.command === "pwd")).toBe(true);
    expect(a.scrollback.some((l) => l.command === "pwd")).toBe(false);
  });
});
