import { profile } from "@/data/profile";
import { stripTodo } from "@/lib/strip-todo";
import { BackToTerminal } from "@/components/ui/BackToTerminal";
import { blogPosts } from "@/data/generated/blog";
import type { WindowId } from "@/lib/vfs/types";
import { Uses } from "./Uses";
import { About } from "./About";
import { BlogPosts } from "./BlogPosts";
import { ContactForm } from "./ContactForm";
import { Resume } from "./Resume";
import { Projects } from "./Projects";
import { Socials } from "./Socials";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="space-y-4">
      <h2 id={`${id}-heading`} className="font-mono text-lg font-semibold text-accent">
        <span className="text-muted">$ </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The server-rendered, no-JS baseline. Always in the DOM (SEO + accessibility);
 * hidden by CSS only once the interactive Terminal has mounted. Renders the
 * same content components the terminal uses, so nothing drifts.
 */
export function StaticContent({ initialWindow = null }: { initialWindow?: WindowId | null }) {
  const sections = [
    { id: "about", content: <><About /><h3 className="font-mono text-base text-accent">Tools</h3><Uses /></> },
    { id: "projects", content: <Projects /> },
    { id: "resume", content: <Resume /> },
    { id: "contact", content: <><Socials /><ContactForm /></> },
    { id: "help", content: <div className="space-y-3 font-sans text-fg"><p>Use the section links to browse this page. You can read projects and contact me without typing commands.</p><p>In the terminal, click a tab to switch windows. Click a printed directory or file to explore it. Type help for the command reference.</p><p>Tab completes a partially typed command. With an empty prompt, Tab and Shift+Tab move keyboard focus. Escape enters normal mode. In a source viewer, use the close button or type :q to return to the shell.</p></div> },
    ...(blogPosts.length ? [{ id: "blog", content: <BlogPosts /> }] : []),
  ];
  if (initialWindow) sections.sort((a, b) => Number(b.id === initialWindow) - Number(a.id === initialWindow));
  return (
    <div className="static-fallback overflow-hidden rounded-xl border border-border bg-window shadow-[0_24px_60px_-12px_var(--shadow)]">
      <div className="space-y-10 px-5 py-8 sm:px-8 sm:py-10">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="font-mono text-2xl font-bold text-fg">{profile.name}</h1>
          <p className="text-accent">{stripTodo(profile.role)}</p>
          {!profile.tagline.startsWith("TODO") && (
            <p className="font-sans text-muted">{profile.tagline}</p>
          )}
          <p className="pt-2 font-sans text-sm text-muted">
            This is the plain version. The same content is also available as an
            interactive terminal you can type into or click through.
          </p>
          <div className="pt-2">
            <BackToTerminal />
          </div>
        </header>

        <nav aria-label="Plain view sections" className="flex flex-wrap gap-3 font-mono text-sm">
          {sections.map(({ id }) => <a key={id} href={`#${id}`}>{id}</a>)}
        </nav>
        {sections.map(({ id, content }) => <Section key={id} id={id} title={id}>{content}</Section>)}
      </div>
    </div>
  );
}
