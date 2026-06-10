/**
 * Projects. Each project is a directory under ~/projects in the virtual
 * filesystem (FLOW.md §2): a README.md plus, optionally, real source files
 * under src/. Cards in the server-rendered fallback read the same data.
 */
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
  /** Markdown README; omitted → generated from the fields above. */
  readme?: string;
  /** Abbreviated commit history shown by `git log` inside the project dir. */
  commits?: ProjectCommit[];
}

export const projects: Project[] = [
  {
    slug: "terminal-portfolio",
    title: "TODO Terminal Portfolio",
    pitch: "TODO One line on what it does for a user, then why it matters.",
    description:
      "TODO An optional longer blurb. Describe the problem it solves and one thing you're proud of in the build.",
    stack: ["Next.js", "TypeScript", "Tailwind"],
    liveUrl: "https://example.com",
    sourceUrl: "https://github.com/yourname/project",
    featured: true,
  },
  {
    slug: "second-project",
    title: "TODO Second Project",
    pitch: "TODO What it is and the value it delivers, in one specific line.",
    stack: ["Python", "Postgres"],
    sourceUrl: "https://github.com/yourname/second-project",
    featured: true,
  },
  {
    slug: "third-project",
    title: "TODO Third Project",
    pitch: "TODO Specific beats clever — say what it actually does.",
    stack: ["Go", "Docker"],
    liveUrl: "https://example.com",
  },
];
