import { blogPosts } from "@/data/generated/blog";
import { profile } from "@/data/profile";
import { buildFeed } from "@/lib/feed";

export const dynamic = "force-static";

// Always emitted (an empty channel is valid RSS); the layout only advertises
// the feed once the blog has posts, matching the dormant-blog pattern.
export function GET(): Response {
  const xml = buildFeed(blogPosts, {
    siteUrl: profile.siteUrl,
    title: `${profile.name} — blog`,
    description: `Notes and write-ups by ${profile.name}.`,
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
