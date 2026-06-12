/**
 * RSS 2.0 feed built from the bundled blog posts. Pure string builder so it
 * tests without the route handler. Posts have no standalone pages; items
 * link to the /blog/ static view's per-post anchors.
 */
import type { BlogPost } from "@/data/generated/blog";

export interface FeedOptions {
  /** Canonical origin, no trailing slash (profile.siteUrl). */
  siteUrl: string;
  title: string;
  description: string;
}

const ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ESCAPES[c]);
}

export function buildFeed(posts: readonly BlogPost[], opts: FeedOptions): string {
  const items = posts.map((p) => {
    const url = `${opts.siteUrl}/blog/#${p.slug}`;
    const summary = p.body.trim().split(/\n\s*\n/)[0] ?? "";
    return [
      "    <item>",
      `      <title>${escapeXml(p.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(summary)}</description>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(opts.title)}</title>`,
    `    <link>${opts.siteUrl}/blog/</link>`,
    `    <description>${escapeXml(opts.description)}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${opts.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
