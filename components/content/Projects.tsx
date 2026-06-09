import { projects as allProjects, type Project } from "@/data/projects";
import { Icon } from "@/components/ui/Icon";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

const TAG_COLORS = [
  "text-ansi-blue",
  "text-ansi-green",
  "text-ansi-magenta",
  "text-ansi-yellow",
  "text-ansi-cyan",
  "text-ansi-red",
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="rounded-lg border border-border bg-elevated/40 p-4 transition-colors hover:border-accent/50">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-fg">{strip(project.title)}</h3>
        <div className="flex items-center gap-3 text-sm">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-success hover:text-success"
            >
              <Icon name="live" size={9} />
              Live
            </a>
          )}
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              Source
              <Icon name="external" size={13} />
            </a>
          )}
        </div>
      </div>

      <p className="mt-1.5 font-sans text-[15px] leading-relaxed text-fg">{strip(project.pitch)}</p>
      {project.description && (
        <p className="mt-1.5 font-sans text-sm leading-relaxed text-muted">
          {strip(project.description)}
        </p>
      )}

      {project.stack.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
          {project.stack.map((tag, i) => (
            <li key={tag} className={TAG_COLORS[i % TAG_COLORS.length]}>
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function Projects({ featuredOnly = false }: { featuredOnly?: boolean }) {
  const list = featuredOnly ? allProjects.filter((p) => p.featured) : allProjects;

  if (list.length === 0) {
    return (
      <p className="text-muted">
        {featuredOnly ? "No featured projects yet." : "No projects to show yet."}
      </p>
    );
  }

  return (
    <section aria-label="Projects" className="grid gap-3">
      {list.map((p) => (
        <ProjectCard key={p.slug} project={p} />
      ))}
    </section>
  );
}
