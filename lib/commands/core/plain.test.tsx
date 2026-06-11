import { afterEach, describe, expect, test } from "vitest";
import { resolveCommand } from "../registry";
import { plain } from "./plain";

afterEach(() => {
  document.documentElement.removeAttribute("data-view");
  localStorage.removeItem("portfolio:view");
});

describe("plain command", () => {
  test("is registered and visible in help", () => {
    expect(resolveCommand("plain")).toBe(plain);
    expect(plain.meta.hidden).toBeUndefined();
  });

  test("switches the document to plain view and persists", () => {
    const out = plain.run({} as never);
    expect(out).not.toBeNull();
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem("portfolio:view")).toBe("plain");
  });
});
