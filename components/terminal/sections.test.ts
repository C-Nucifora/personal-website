import { describe, expect, it } from "vitest";
import { SECTIONS, NAV_SECTIONS, commandForHash } from "./sections";

describe("sections registry", () => {
  it("NAV_SECTIONS are the four primary nav buttons in order", () => {
    expect(NAV_SECTIONS.map((s) => s.command)).toEqual([
      "about",
      "projects",
      "resume",
      "contact",
    ]);
  });

  it("SECTIONS also includes homelab (deep-linkable, not a nav button)", () => {
    expect(SECTIONS.some((s) => s.command === "homelab")).toBe(true);
    expect(NAV_SECTIONS.some((s) => s.command === "homelab")).toBe(false);
  });

  it("commandForHash maps a hash label to its command", () => {
    expect(commandForHash("#projects")).toBe("projects");
    expect(commandForHash("contact")).toBe("contact");
    expect(commandForHash("#homelab")).toBe("homelab");
    expect(commandForHash("")).toBeUndefined();
    expect(commandForHash("#nope")).toBeUndefined();
  });
});
