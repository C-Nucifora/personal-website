"use client";

import { projects } from "@/data/projects";
import { Icon } from "@/components/ui/Icon";
import { CmdLink } from "./CmdLink";
import { Markdown } from "./Markdown";

const TAG_COLORS = [
  "text-ansi-blue",
  "text-ansi-green",
  "text-ansi-magenta",
  "text-ansi-yellow",
  "text-ansi-cyan",
  "text-ansi-red",
];

interface ProjectReadmeProps {
  /** Project slug (vfs file meta). */
  slug?: string;
  /** Raw file text — the fallback when the slug doesn't resolve. */
  raw: string;
}

/**
 * `cat README.md` inside a project: the repo's metadata up top — pitch,
 * stack, stars, links, a `git log` pointer — then the real README below.
 */
export function ProjectReadme({ slug, raw }: ProjectReadmeProps) {
  const project = projects.find((p) => p.slug === slug);
  if (!project) return <Markdown source={raw} />;

  return (
    <div className="max-w-prose space-y-4">
      <header className="space-y-2 rounded-md border border-border bg-elevated/60 p-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-mono font-bold text-fg">{project.title}</h2>
          {(project.stars ?? 0) > 0 && (
            <span className="font-mono text-xs text-warning">★ {project.stars}</span>
          )}
          {project.pushedAt && (
            <span className="font-mono text-xs text-muted">updated {project.pushedAt}</span>
          )}
        </div>

        <p className="font-sans text-[15px] leading-relaxed text-fg">{project.pitch}</p>

        {project.stack.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
            {project.stack.map((tag, i) => (
              <li key={tag} className={TAG_COLORS[i % TAG_COLORS.length]}>
                {tag}
              </li>
            ))}
          </ul>
        )}

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
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
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-success"
            >
              <Icon name="live" size={9} />
              Live
            </a>
          )}
          {project.commits && project.commits.length > 0 && (
            <span className="text-muted">
              history: <CmdLink cmd="git log" />
            </span>
          )}
        </p>
      </header>

      {project.readme ? (
        <Markdown source={project.readme} />
      ) : project.description ? (
        <p className="font-sans text-[15px] leading-relaxed text-fg">{project.description}</p>
      ) : null}
    </div>
  );
}
