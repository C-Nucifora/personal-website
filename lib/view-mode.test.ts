import { afterEach, describe, expect, test } from "vitest";
import { applyViewMode, initialViewMode, setViewMode, VIEW_STORAGE_KEY } from "./view-mode";

afterEach(() => {
  document.documentElement.removeAttribute("data-view");
  localStorage.removeItem(VIEW_STORAGE_KEY);
});

describe("initialViewMode precedence (URL > saved > default)", () => {
  test("?plain=1 wins", () => {
    expect(initialViewMode("?plain=1")).toBe("plain");
  });

  test("?plain=0 overrides a saved plain choice", () => {
    localStorage.setItem(VIEW_STORAGE_KEY, "plain");
    expect(initialViewMode("?plain=0")).toBe("terminal");
  });

  test("saved choice applies without a param", () => {
    localStorage.setItem(VIEW_STORAGE_KEY, "plain");
    expect(initialViewMode("")).toBe("plain");
  });

  test("default is terminal", () => {
    expect(initialViewMode("")).toBe("terminal");
  });
});

describe("setViewMode / applyViewMode", () => {
  test("plain sets the attribute and persists", () => {
    setViewMode("plain");
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBe("plain");
  });

  test("terminal removes the attribute", () => {
    setViewMode("plain");
    setViewMode("terminal");
    expect(document.documentElement.hasAttribute("data-view")).toBe(false);
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBe("terminal");
  });

  test("applyViewMode does not persist", () => {
    applyViewMode("plain");
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
  });
});
