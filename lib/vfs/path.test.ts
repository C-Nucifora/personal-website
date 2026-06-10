import { describe, expect, test } from "vitest";
import { normalizePath, resolvePath, windowForPath } from "./path";

describe("normalizePath", () => {
  test("keeps home as ~", () => {
    expect(normalizePath("~")).toBe("~");
  });

  test("strips trailing slashes", () => {
    expect(normalizePath("~/about/")).toBe("~/about");
  });

  test("collapses . and ..", () => {
    expect(normalizePath("~/about/../projects")).toBe("~/projects");
    expect(normalizePath("~/a/./b")).toBe("~/a/b");
  });

  test("abbreviates /home/christian to ~", () => {
    expect(normalizePath("/home/christian")).toBe("~");
    expect(normalizePath("/home/christian/about")).toBe("~/about");
  });

  test("parent of ~ is /home", () => {
    expect(normalizePath("~/..")).toBe("/home");
  });

  test("root cannot be escaped", () => {
    expect(normalizePath("/..")).toBe("/");
    expect(normalizePath("/../..")).toBe("/");
  });

  test("keeps non-home absolute paths absolute", () => {
    expect(normalizePath("/etc/passwd")).toBe("/etc/passwd");
    expect(normalizePath("/etc//passwd")).toBe("/etc/passwd");
  });
});

describe("resolvePath", () => {
  test("resolves relative paths against cwd", () => {
    expect(resolvePath("~/projects", "foo/src")).toBe("~/projects/foo/src");
  });

  test("resolves .. against cwd", () => {
    expect(resolvePath("~/projects/foo", "..")).toBe("~/projects");
  });

  test("absolute input ignores cwd", () => {
    expect(resolvePath("~/projects", "/etc")).toBe("/etc");
  });

  test("~-rooted input ignores cwd", () => {
    expect(resolvePath("~/projects", "~/resume")).toBe("~/resume");
    expect(resolvePath("~/projects", "~")).toBe("~");
  });

  test("empty input resolves to cwd", () => {
    expect(resolvePath("~/projects", "")).toBe("~/projects");
  });

  test(". resolves to cwd", () => {
    expect(resolvePath("~/about", ".")).toBe("~/about");
  });
});

describe("windowForPath", () => {
  test("maps top-level dirs to windows", () => {
    expect(windowForPath("~/about")).toBe("about");
    expect(windowForPath("~/projects")).toBe("projects");
    expect(windowForPath("~/resume")).toBe("resume");
    expect(windowForPath("~/contact")).toBe("contact");
    expect(windowForPath("~/help")).toBe("help");
  });

  test("maps nested paths to their window", () => {
    expect(windowForPath("~/projects/foo/src")).toBe("projects");
    expect(windowForPath("~/resume/experience")).toBe("resume");
  });

  test("home and non-window paths map to no window", () => {
    expect(windowForPath("~")).toBe(null);
    expect(windowForPath("/etc")).toBe(null);
    expect(windowForPath("/home")).toBe(null);
    expect(windowForPath("~/.secrets")).toBe(null);
  });
});
