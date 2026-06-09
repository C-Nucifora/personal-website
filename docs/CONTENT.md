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

## `data/projects.ts`

```ts
export interface Project {
  slug: string;
  title: string;
  pitch: string;        // one line: what it is and why it matters
  description?: string; // optional longer blurb shown on expand
  stack: string[];      // tags, colored via --ansi-* tokens
  liveUrl?: string;     // shows a "Live" badge + link
  sourceUrl?: string;   // shows a "Source" link
  thumbnail?: string;   // /public path, optional
  featured?: boolean;   // surfaced by `projects --featured`
}

export const projects: Project[] = [
  // TODO add your live projects. Featured ones get pinned.
];
```

Each project is a focusable card. `liveUrl` and `sourceUrl` open in a new tab with `rel="noopener noreferrer"`. Missing links simply hide their badge.

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
