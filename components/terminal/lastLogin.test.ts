import { describe, expect, it, beforeEach } from "vitest";
import { readAndRecordLastLogin } from "./lastLogin";

describe("readAndRecordLastLogin", () => {
  beforeEach(() => localStorage.clear());

  it("returns a formatted last-login line and records the visit", () => {
    const line = readAndRecordLastLogin();
    expect(line).toMatch(/^last login: /);
    expect(line).toContain("on ttys001");
    expect(localStorage.getItem("portfolio:lastLogin")).toBeTruthy();
  });

  it("uses the previously recorded time on a second visit", () => {
    const past = new Date("2020-01-02T03:04:00").toISOString();
    localStorage.setItem("portfolio:lastLogin", past);
    const line = readAndRecordLastLogin();
    expect(line).toContain("Jan 02");
    // and it advances the stored value to ~now
    expect(localStorage.getItem("portfolio:lastLogin")).not.toBe(past);
  });
});
