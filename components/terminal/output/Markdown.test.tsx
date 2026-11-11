import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Markdown } from "./Markdown";

describe("public project README rendering", () => {
  test("relative links resolve to the public repository and images never load trackers", () => {
    const html = renderToStaticMarkup(<Markdown repositoryUrl="https://github.com/C-Nucifora/m1-core" revision="abc123" source={'[Guide](docs/guide.md)\n\n![Badge](https://example.com/track.svg)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />);
    expect(html).toContain('https://github.com/C-Nucifora/m1-core/blob/abc123/docs/guide.md');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('href="javascript:');
  });
});
