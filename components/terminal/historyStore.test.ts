import { describe, expect, it, beforeEach } from "vitest";
import { loadHistory, saveHistory, HISTORY_MAX } from "./historyStore";

describe("historyStore", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips saved history", () => {
    saveHistory(["about", "ls", "help"]);
    expect(loadHistory()).toEqual(["about", "ls", "help"]);
  });
  it("returns [] when nothing is stored or it is malformed", () => {
    expect(loadHistory()).toEqual([]);
    localStorage.setItem("portfolio:history", "{not json");
    expect(loadHistory()).toEqual([]);
  });
  it("caps stored history at HISTORY_MAX", () => {
    const many = Array.from({ length: HISTORY_MAX + 25 }, (_, i) => `cmd${i}`);
    saveHistory(many);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(HISTORY_MAX);
    expect(loaded[loaded.length - 1]).toBe(`cmd${HISTORY_MAX + 24}`);
  });
});
