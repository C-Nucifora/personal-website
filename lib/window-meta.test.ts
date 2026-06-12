import { describe, expect, it } from "vitest";
import { WINDOW_IDS } from "@/lib/vfs/types";
import { profile } from "@/data/profile";
import { WINDOW_META } from "./window-meta";

describe("WINDOW_META", () => {
  it("covers every window id", () => {
    for (const id of WINDOW_IDS) {
      expect(WINDOW_META[id], id).toBeDefined();
    }
  });

  it("gives every window a unique, non-empty title and description", () => {
    const titles = WINDOW_IDS.map((id) => WINDOW_META[id].title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const id of WINDOW_IDS) {
      expect(WINDOW_META[id].title).not.toBe("");
      expect(WINDOW_META[id].description).not.toBe("");
    }
  });

  it("brands titles with the profile name and leaks no TODO copy", () => {
    for (const id of WINDOW_IDS) {
      expect(WINDOW_META[id].title).toContain(profile.name);
      expect(WINDOW_META[id].title).not.toMatch(/TODO/);
      expect(WINDOW_META[id].description).not.toMatch(/TODO/);
    }
  });
});
