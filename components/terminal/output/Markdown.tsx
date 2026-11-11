"use client";

import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runClick } from "@/lib/terminal/run-click";
import { commandForFile } from "@/lib/terminal/file-click";

/**
 * Markdown links: real anchors for the outside world (http, mailto),
 * commands for the filesystem (FLOW.md §3.1) — a relative link to a
 * directory cds there, a relative link to a file cats/vims it.
 */
function MdLink({ href = "", children }: ComponentProps<"a">) {
  if (/^(https?:|mailto:)/.test(href)) {
    const external = !href.startsWith("mailto:");
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/") && !href.endsWith("/")) {
    // public asset (e.g. the resume PDF) — a real download link
    return (
      <a href={href} download>
        {children}
      </a>
    );
  }
  const cmd = href.endsWith("/") ? `cd ${href.replace(/\/$/, "")}` : commandForFile(href);
  return (
    <button
      type="button"
      onClick={() => runClick(cmd)}
      className="inline cursor-pointer text-accent underline-offset-2 hover:underline focus-visible:outline-2"
    >
      {children}
    </button>
  );
}

const components: ComponentProps<typeof ReactMarkdown>["components"] = {
  a: MdLink,
  h1: ({ children }) => <h2 className="text-lg font-bold text-fg">{children}</h2>,
  h2: ({ children }) => (
    <h3 className="pt-2 text-base font-semibold text-accent">{children}</h3>
  ),
  h3: ({ children }) => <h4 className="pt-1 font-semibold text-fg">{children}</h4>,
  p: ({ children }) => <p className="leading-relaxed text-fg">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-fg">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-fg">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-3 text-muted">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-elevated px-1 py-0.5 font-mono text-[0.92em] text-fg">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md border border-border bg-elevated p-3 font-mono text-sm leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1 text-left font-semibold text-accent">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/40 px-2 py-1 align-top text-fg">{children}</td>
  ),
  hr: () => <hr className="border-border" />,
};

/** Rendered markdown for vfs files without a dedicated renderer. */
export function Markdown({ source, repositoryUrl, revision = "HEAD" }: { source: string; repositoryUrl?: string; revision?: string }) {
  const publicUrl = (href = "") => {
    if (/^https?:\/\//i.test(href)) return href;
    if (!repositoryUrl || !href || href.startsWith("#") || /^[a-z]+:/i.test(href)) return undefined;
    return `${repositoryUrl}/blob/${revision}/${href.replace(/^\//, "")}`;
  };
  const renderedComponents = {
    ...components,
    ...(repositoryUrl ? {
      a: ({ href, children }: ComponentProps<"a">) => {
        const url = publicUrl(href);
        return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
      },
    } : {}),
    // README badges and screenshots remain opt-in links, with no third-party
    // image requests or broken repository-relative image URLs.
    img: ({ src, alt }: ComponentProps<"img">) => {
      const url = typeof src === "string" ? publicUrl(src) : undefined;
      return url ? <a href={url} target="_blank" rel="noopener noreferrer">{alt || "View image"}</a> : <span>{alt}</span>;
    },
  };
  return (
    <div className="min-w-0 max-w-prose space-y-3 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderedComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
