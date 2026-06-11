import { profile } from "@/data/profile";
import { stripTodo } from "@/lib/strip-todo";
import { BackToTerminal } from "@/components/ui/BackToTerminal";
import { About } from "./About";
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
export function StaticContent() {
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

        <Section id="about" title="about">
          <About />
        </Section>

        <Section id="resume" title="resume">
          <Resume />
        </Section>

        <Section id="projects" title="projects">
          <Projects />
        </Section>

        <Section id="contact" title="contact">
          <Socials />
        </Section>
      </div>
    </div>
  );
}
