import { describe, expect, test } from "vitest";
import { completeLine } from "./completion";

describe("command completion (first token)", () => {
  test("unique prefix completes with a trailing space", () => {
    expect(completeLine("pw", "~").text).toBe("pwd ");
  });

  test("ambiguous prefix lists candidates", () => {
    const r = completeLine("c", "~");
    expect(r.text).toBeUndefined();
    expect(r.candidates).toContain("cd");
    expect(r.candidates).toContain("cat");
  });

  test("extends to the longest common prefix when possible", () => {
    // th → theme, themes share "theme"
    expect(completeLine("th", "~").text).toBe("theme");
  });
});

describe("path completion (later tokens)", () => {
  test("unique directory completes with a trailing slash", () => {
    expect(completeLine("cd ab", "~").text).toBe("cd about/");
  });

  test("unique file completes with a trailing space", () => {
    expect(completeLine("cat ~/about/ab", "~").text).toBe("cat ~/about/about.md ");
  });

  test("completes relative to the cwd", () => {
    expect(completeLine("cat res", "~/resume").text).toBe("cat resume.");
  });

  test("dot prefix reveals hidden files", () => {
    const r = completeLine("cat .p", "~");
    expect(r.text).toBe("cat .plan ");
  });

  test("no match is a no-op", () => {
    const r = completeLine("cd zzz", "~");
    expect(r.text).toBeUndefined();
    expect(r.candidates).toBeUndefined();
  });
});
