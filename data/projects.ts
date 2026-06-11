/**
 * Projects. Fed from GitHub at build time: scripts/fetch-projects.mjs syncs
 * public repos (metadata, README, recent commits) into
 * data/generated/github-projects.ts, curated by data/projects-config.mjs.
 * Each project is a directory under ~/projects in the virtual filesystem
 * (FLOW.md §2): the repo's real README plus, for projects listed in
 * data/source-manifest.mjs, browsable source under src/.
 */
import { githubProjects } from "./generated/github-projects";

export interface ProjectCommit {
  hash: string; // short hash, e.g. "3f2a91c"
  date: string; // "2026-05-12"
  message: string;
}

export interface Project {
  slug: string;
  title: string;
  pitch: string; // one line: what it is and why it matters
  description?: string; // optional longer blurb shown on expand
  stack: string[]; // tags, colored via --ansi-* tokens
  liveUrl?: string; // shows a "Live" badge + link
  sourceUrl?: string; // shows a "Source" link
  thumbnail?: string; // /public path, optional
  featured?: boolean;
  stars?: number; // GitHub stargazers
  pushedAt?: string; // last push, "2026-06-11"
  /** Markdown README; omitted → generated from the fields above. */
  readme?: string;
  /** Abbreviated commit history shown by `git log` inside the project dir. */
  commits?: ProjectCommit[];
}

/** This site itself — not on GitHub (yet); its source is bundled locally. */
const thisSite: Project = {
  slug: "terminal-portfolio",
  title: "terminal-portfolio (this site)",
  pitch:
    "The site you're using right now: a tmux session over a virtual filesystem, with a vim line editor and a read-only vim viewer.",
  description:
    "Next.js static export. One executor behind clicks, commands, and keybindings; the curated source is browsable under src/ — try `vim src/lib/vim/machine.ts`.",
  stack: ["Next.js", "TypeScript", "Tailwind", "CodeMirror"],
  featured: true,
};

export const projects: Project[] = [
  ...githubProjects.map((p) => ({
    slug: p.slug,
    title: p.title,
    pitch: p.pitch,
    stack: p.stack,
    sourceUrl: p.sourceUrl,
    ...(p.liveUrl ? { liveUrl: p.liveUrl } : {}),
    featured: p.featured,
    stars: p.stars,
    pushedAt: p.pushedAt,
    ...(p.readme ? { readme: p.readme } : {}),
    commits: p.commits,
  })),
  thisSite,
];
