import { describe, expect, test } from "vitest";
import { projectFilesFor, relativeTo } from "./project-files";

const OPEN = "~/projects/terminal-portfolio/src/lib/vim/motions.ts";

describe("projectFilesFor", () => {
  test("flattens the project subtree to relative paths", () => {
    const pf = projectFilesFor(OPEN);
    expect(pf).not.toBeNull();
    expect(pf!.root).toBe("~/projects/terminal-portfolio");
    expect(Object.keys(pf!.files)).toContain("src/lib/vim/motions.ts");
    expect(pf!.files["src/lib/vim/motions.ts"]).toContain("export");
  });

  test("relativeTo maps the open path into the file map", () => {
    const pf = projectFilesFor(OPEN)!;
    expect(relativeTo(pf.root, OPEN)).toBe("src/lib/vim/motions.ts");
    expect(pf.files[relativeTo(pf.root, OPEN)!]).toBeDefined();
  });

  test("returns null outside ~/projects", () => {
    expect(projectFilesFor("~/about/about.md")).toBeNull();
    expect(projectFilesFor("~/projects")).toBeNull();
  });
});
