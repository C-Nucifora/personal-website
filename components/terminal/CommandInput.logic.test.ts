import { describe, expect, it } from "vitest";
import { topCompletion } from "./CommandInput";

describe("topCompletion", () => {
  it("returns the top command completing the token", () => {
    expect(topCompletion("ab")).toBe("about");
  });
  it("returns empty when nothing matches or there is a space", () => {
    expect(topCompletion("zzzz")).toBe("");
    expect(topCompletion("about ")).toBe("");
    expect(topCompletion("")).toBe("");
  });
  it("does not suggest when the token is already a full command", () => {
    expect(topCompletion("about")).toBe("");
  });
});
