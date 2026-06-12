import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { blogPosts, type BlogPost } from "@/data/generated/blog";

/**
 * Full posts for the plain view / static fallback. Renders nothing while
 * the blog is dormant (spec 2026-06-12). Deliberately plain ReactMarkdown —
 * the terminal's Markdown component routes links through the command
 * layer, which the static view must not depend on.
 */
export function BlogPosts({ posts = blogPosts }: { posts?: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="space-y-10">
      {/* Each id anchors the matching RSS item link (/blog/#slug). */}
      {posts.map((p) => (
        <article key={p.slug} id={p.slug} className="space-y-2">
          <h3 className="font-mono text-base font-semibold text-fg">{p.title}</h3>
          <p className="font-mono text-xs text-muted">{p.date}</p>
          <div className="space-y-3 font-sans text-[15px] leading-relaxed text-fg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.body}</ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  );
}
