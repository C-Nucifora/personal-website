import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { highlightLines } from "./highlight";

describe("highlightLines", () => {
  test("typescript keywords get token classes", () => {
    const lines = highlightLines('const x = "hi";', "typescript");
    expect(lines).toHaveLength(1);
    const { container } = render(<>{lines[0]}</>);
    expect(container.querySelector(".tok-keyword")?.textContent).toBe("const");
    expect(container.querySelector(".tok-string")?.textContent).toBe('"hi"');
  });

  test("splits multi-line code by line", () => {
    const lines = highlightLines("const a = 1;\nconst b = 2;", "typescript");
    expect(lines).toHaveLength(2);
  });

  test("unknown languages fall back to plain text lines", () => {
    const lines = highlightLines("plain\ntext", "text");
    expect(lines).toHaveLength(2);
    const { container } = render(<>{lines[0]}</>);
    expect(container.textContent).toBe("plain");
  });
});
