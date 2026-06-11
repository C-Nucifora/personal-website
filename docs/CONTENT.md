# CONTENT.md — Content model

All site content lives in typed files under `data/`. Components render whatever these export. Edit content here; never inline it into components. Replace every `TODO` / placeholder with real values.

## `data/profile.ts`

```ts
export const profile = {
  name: "TODO Your Name",
  username: "todo",            // used in the prompt: visitor@todo:~$
  role: "TODO e.g. Full-stack developer",
  location: "TODO City, Country",
  tagline: "TODO one line that sounds like you",
  about: [
    "TODO a couple of sentences about who you are and what you build.",
    "TODO what you're into right now / what you're looking for.",
  ],
  resumePdf: "/resume.pdf",    // place the file in /public
  email: "todo@example.com",
} as const;
```

`formEndpoint` (added later): a Formspree/Web3Forms/Basin-style URL. While
empty, the contact form renders nowhere and `mail` falls back to the email
address.

## `data/resume.ts`

```ts
export interface ResumeEntry {
  org: string;
  title: string;
  start: string;     // "2023"
  end: string;       // "Present"
  location?: string;
  bullets: string[]; // what you did / shipped, results first
}

export const experience: ResumeEntry[] = [
  // TODO add roles, most recent first
];

export const education: ResumeEntry[] = [
  // TODO
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TODO"] },
  { group: "Frameworks", items: ["TODO"] },
  { group: "Tools", items: ["TODO"] },
];
```

The `resume` command renders these in order: experience, education, skills, then a download button linking to `profile.resumePdf`.

## `data/projects.ts` — fed from GitHub

Projects are **synced from GitHub at build time**, not written by hand:

- `data/projects-config.mjs` — the curation knobs: `username`, `exclude`,
  `featured` (order preserved), per-repo `overrides`, and how many commits to
  bundle for the `git log` egg.
- `scripts/fetch-projects.mjs` (runs on `predev`/`prebuild`, or manually via
  `npm run fetch-projects`) pulls each public, non-fork repo's metadata, real
  README markdown, recent commits, and a curated source slice (one tarball
  request per repo, filtered and capped by the `source` knobs in
  projects-config) into `data/generated/github-projects.ts` and
  `data/generated/github-sources.ts`. The snapshots are committed so offline
  builds and tests work; a failed fetch keeps the last good snapshot.
- Source slices ship as a **lazy chunk** grafted into the virtual filesystem
  just after boot (each repo keeps its real layout — Cargo.toml at the root,
  its own src/), so browsing code never weighs down first paint.
- `data/projects.ts` maps that onto the `Project` interface and appends
  `terminal-portfolio` (this site — its curated source is bundled locally via
  `data/source-manifest.mjs` and browsable under `src/`).

```ts
export interface Project {
  slug: string;
  title: string;
  pitch: string;        // one line: repo description (or an override)
  description?: string; // optional longer blurb shown on expand
  stack: string[];      // language + topics, colored via --ansi-* tokens
  liveUrl?: string;     // repo homepage → "Live" badge + link
  sourceUrl?: string;   // repo URL → "Source" link
  thumbnail?: string;   // /public path, optional
  featured?: boolean;   // pinned cards, set in projects-config.mjs
  readme?: string;      // the repo's real README (rendered by `cat`)
  commits?: ProjectCommit[]; // shown by `git log` inside the project dir
}
```

Each project is a directory under `~/projects` and a focusable card in the
fallback. `liveUrl` and `sourceUrl` open in a new tab with
`rel="noopener noreferrer"`. Missing links simply hide their badge.

## `data/socials.ts`

```ts
export interface Social {
  label: string;        // "GitHub"
  handle: string;       // "@you"
  url: string;
  icon: string;         // icon name or inline svg id
}

export const socials: Social[] = [
  // TODO GitHub, LinkedIn, X/Twitter, email, blog, etc.
];
```

`socials` and `contact` render these as clickable rows. Keep `url` absolute (`https://…`).

## Command metadata (drives `help`)

Each command in `lib/commands/` carries the text shown in help. Write descriptions for a non-technical reader:

```ts
export const meta = {
  name: "projects",
  aliases: ["work", "ls projects"],
  description: "See the things I've built (with live + source links).",
  usage: "projects [--featured]",
  group: "My work",   // Get to know me | My work | Reach me | Customize
};
```

`help` reads `meta` from every registered command, so help text can never drift from what the commands actually do.

## Copy guidelines

- Write in your own voice for `about`; keep it human, not a job-application summary.
- Describe projects by what they do for a user, then the stack. Specific beats clever.
- Help and error text: active voice, sentence case, names the visitor recognizes. "See my work," not "Execute work module."
- SEO/meta: set `<title>` and description from `profile`. The about + projects text rendering server-side is what search engines and previews read, so keep it real and complete.
