import { runInNewContext } from "node:vm";
import { describe, expect, test, vi } from "vitest";
import { initialViewMode, VIEW_STORAGE_KEY } from "@/lib/view-mode";
import { pathForWindow, windowFromPath } from "@/lib/terminal/routing";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";
import { themeInitScript } from "@/lib/themes/init-script";
import { themes, THEME_STORAGE_KEY } from "@/lib/themes";

// No app-module mocks: these call the production utilities. No network or files.
const unavailable: symbol = Symbol("storage unavailable");
type SavedValue = string | null | typeof unavailable;

function withViewStorage(saved: SavedValue, exercise: () => void) {
  const getItem = vi.fn((key: string) => {
    expect(key).toBe(VIEW_STORAGE_KEY);
    if (saved === unavailable) throw new DOMException("Synthetic denial", "SecurityError");
    return saved;
  });
  vi.stubGlobal("localStorage", { getItem });
  try {
    exercise();
  } finally {
    // Restore before the repository setup hook calls localStorage.clear().
    vi.unstubAllGlobals();
  }
}

describe("round 3: initial view at the storage boundary", () => {
  test.each([
    { label: "missing", saved: null },
    { label: "empty", saved: "" },
    { label: "wrong case", saved: "PLAIN" },
    { label: "JSON string", saved: '"plain"' },
    { label: "saved plain", saved: "plain" },
    { label: "read denied", saved: unavailable },
  ])("$label storage across valid and malformed URL choices", ({ saved }) => {
    withViewStorage(saved, () => {
      const fallback = saved === "plain" ? "plain" : "terminal";
      for (const search of ["", "?plain=garbage", "?plain=%"]) {
        expect(initialViewMode(search), search).toBe(fallback);
      }
      // URLSearchParams decoding is already production behavior, not a new parser.
      expect(initialViewMode("?plain=%31")).toBe("plain");
      expect(initialViewMode("?plain=false")).toBe("terminal");
    });
  });
});

describe("round 3: route and view initialization remain independent", () => {
  test("every active canonical route round-trips with storage denied", () => {
    withViewStorage(unavailable, () => {
      for (const id of [null, ...ACTIVE_WINDOW_IDS]) {
        const url = new URL(`${pathForWindow(id)}?plain=1`, "https://fixture.invalid");
        expect(windowFromPath(url.pathname)).toBe(id);
        expect(initialViewMode(url.search)).toBe("plain");
      }
    });
  });

  // These characterize literal pathname resolution, not HTTP status/host decoding.
  test.each(["/missing/", "/%61bout/", "/about%2F/", "/%/", "/%E0%A4%A/", "/about/missing/"])(
    "%s stays unselected without defeating a saved plain choice",
    (pathname) => {
      withViewStorage("plain", () => {
        const url = new URL(`${pathname}?plain=garbage`, "https://fixture.invalid");
        expect(windowFromPath(url.pathname)).toBeNull();
        expect(initialViewMode(url.search)).toBe("plain");
        expect(pathForWindow(windowFromPath(url.pathname))).toBe("/");
      });
    },
  );
});

function generatedThemeBoot(saved: SavedValue, light: boolean) {
  const attributes = new Map<string, string>();
  const root = {
    setAttribute: (key: string, value: string) => attributes.set(key, String(value)),
    style: { cssText: "" },
  };
  const addEventListener = vi.fn();
  const getItem = vi.fn((key: string) => {
    expect(key).toBe(THEME_STORAGE_KEY);
    if (saved === unavailable) throw new Error("Synthetic storage denial");
    return saved;
  });
  runInNewContext(themeInitScript(), {
    document: { documentElement: root },
    localStorage: { getItem },
    window: { matchMedia: () => ({ matches: light }), addEventListener },
  }, { timeout: 1000 });
  expect(getItem).toHaveBeenCalledOnce();
  expect(addEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
  return { id: attributes.get("data-theme"), css: root.style.cssText };
}

describe("round 3: generated pre-paint script with malformed storage", () => {
  test.each([
    { label: "missing", saved: null },
    { label: "empty", saved: "" },
    { label: "unknown", saved: "missing-theme" },
    { label: "JSON string", saved: '"nord"' },
    { label: "read denied", saved: unavailable },
  ])("$label preserves scheme fallback and history listener registration", ({ saved }) => {
    for (const light of [false, true]) {
      const expected = themes.find((theme) => theme.appearance === (light ? "light" : "dark"))!;
      const result = generatedThemeBoot(saved, light);
      expect(result.id).toBe(expected.id);
      expect(result.css).toContain(`--bg: ${expected.theme["--bg"]};`);
    }
  });
});
