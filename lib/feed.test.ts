import { describe, expect, it } from "vitest";
import type { BlogPost } from "@/data/generated/blog";
import { buildFeed } from "./feed";

const opts = {
  siteUrl: "https://example.com",
  title: "Example — blog",
  description: "Notes from example.",
};

const post: BlogPost = {
  slug: "hello-world",
  title: "Hello <World> & friends",
  date: "2026-06-12",
  body: "First paragraph with *markdown*.\n\nSecond paragraph.",
};

describe("buildFeed", () => {
  it("emits a valid empty channel when there are no posts", () => {
    const xml = buildFeed([], opts);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<title>Example — blog</title>");
    expect(xml).toContain("<link>https://example.com/blog/</link>");
    expect(xml).not.toContain("<item>");
  });

  it("renders one item per post with escaped text and an anchor permalink", () => {
    const xml = buildFeed([post], opts);
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>Hello &lt;World&gt; &amp; friends</title>");
    expect(xml).toContain("<link>https://example.com/blog/#hello-world</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://example.com/blog/#hello-world</guid>');
    expect(xml).toContain("<pubDate>Fri, 12 Jun 2026 00:00:00 GMT</pubDate>");
  });

  it("uses the first paragraph as the item description", () => {
    const xml = buildFeed([post], opts);
    expect(xml).toContain("<description>First paragraph with *markdown*.</description>");
    expect(xml).not.toContain("Second paragraph");
  });

  it("advertises itself via an atom self link", () => {
    const xml = buildFeed([], opts);
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain(
      '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>',
    );
  });
});
