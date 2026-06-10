import { describe, expect, it } from "vitest";
import { WINDOWS, SECTIONS, windowForCommand, windowForLabel, pathForWindow } from "./windows";

describe("windows registry", () => {
  it("SECTIONS excludes the shell (id 0)", () => {
    expect(SECTIONS.every((w) => w.id !== 0)).toBe(true);
    expect(SECTIONS.length).toBe(WINDOWS.length - 1);
  });
  it("pathForWindow maps shell to ~ and sections to ~/label", () => {
    expect(pathForWindow(0)).toBe("~");
    expect(pathForWindow(3)).toBe("~/projects");
    expect(pathForWindow(999)).toBe("~");
  });
  it("windowForCommand maps a section command to its id, else 0", () => {
    expect(windowForCommand("projects")).toBe(3);
    expect(windowForCommand("echo")).toBe(0);
    expect(windowForCommand(null)).toBe(0);
  });
  it("windowForLabel parses a hash label", () => {
    expect(windowForLabel("#projects")?.id).toBe(3);
    expect(windowForLabel("about")?.id).toBe(1);
    expect(windowForLabel("")).toBeUndefined();
    expect(windowForLabel("#nope")).toBeUndefined();
  });
});
