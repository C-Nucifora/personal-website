import { describe, expect, test } from "vitest";
import { parsePost } from "./bundle-blog.mjs";

const GOOD = `---\ntitle: Hello terminal\ndate: 2026-06-12\n---\n\nFirst paragraph.\n`;

describe("parsePost", () => {
  test("parses frontmatter and body", () => {
    expect(parsePost("hello-terminal.md", GOOD)).toEqual({
      slug: "hello-terminal",
      title: "Hello terminal",
      date: "2026-06-12",
      body: "First paragraph.",
    });
  });

  test("returns null without a frontmatter fence", () => {
    expect(parsePost("x.md", "just text")).toBeNull();
  });

  test("returns null when title or date is missing", () => {
    expect(parsePost("x.md", "---\ntitle: Only title\n---\nbody")).toBeNull();
    expect(parsePost("x.md", "---\ndate: 2026-01-01\n---\nbody")).toBeNull();
  });
});
