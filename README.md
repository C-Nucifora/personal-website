# personal-website

A developer portfolio that looks and behaves like a terminal — one tmux
session, windows mapped onto a virtual filesystem — but stays fully usable for
visitors who have never touched a command line. Every action can be **typed**
(`ls`, `cd projects`, `vim resume.md`, …), **clicked** (tabs, links, chips), or
driven by **keybindings** (vim editing grammar + tmux prefix bindings). All
three route through one shared state, and every click echoes the command it
ran, so the interface teaches itself.

Prefer plain pages? A **plain view** (`?plain=1`, the title-bar button, or the
`plain` command) swaps the terminal for ordinary scrollable content.

## Highlights

- **Browsable source** — `~/projects/<name>/` contains each project's real
  source, bundled from GitHub at build time and explorable with `ls`/`cat`/`vim`.
- **Read-only vim viewer** (CodeMirror 6 + codemirror-vim) with **language
  intelligence** in web workers: hover (`K`), go-to-definition (`gd`),
  diagnostics, and `:symbols` for TypeScript/JS, JSON/CSS/HTML, YAML/TOML.
- **Nine themes** (Tokyo Night default, Tokyo Night Day light, Catppuccin,
  Gruvbox, Dracula, Nord, One Dark, Solarized, Rosé Pine) plus a
  Konami-unlocked CRT mode. Token-based: a theme is one object in a registry.
- **Dormant-until-configured features** — contact form, blog window (+ RSS at
  `/feed.xml`), Umami analytics, and resume PDF all ship built but invisible
  until their config or content exists.

## Stack

- **Next.js (App Router) + TypeScript**, statically exported (`output: "export"`).
- **Tailwind CSS v4**, mapped onto semantic CSS custom properties — the single
  source of truth for theme tokens. No component hardcodes a colour.
- **No backend.** Content lives in typed files under `data/`; generators in
  `scripts/` bundle blog posts, GitHub source, and TS libs on pre-dev/build.
- Fonts via `next/font`: JetBrains Mono (terminal) + Inter (long-form prose).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run typecheck && npm run lint && npm run test
npm run build      # static export to ./out
npm run e2e        # Playwright suite against a server of ./out
```

## Deploy

Set `profile.siteUrl` in `data/profile.ts` first — SEO metadata, the sitemap,
`robots.txt`, the RSS feed, and the generated Open Graph image all read from it.

The exported `./out` directory is a plain static site. **Vercel** imports the
repo and builds it with no extra config (`vercel.json` adds security headers);
any other static host works too. CI (`.github/workflows/ci.yml`) runs
typecheck, lint, unit tests, the production build, and the e2e suite on every
push — deploys are the host's job.

SEO is wired up: per-route titles, `/sitemap.xml`, `/robots.txt`, a generated
`/opengraph-image`, JSON-LD `Person` data, a web manifest, and
canonical/Open Graph/Twitter metadata.

## Editing content

All content is data, not markup. Edit these files and the UI updates:

- `data/profile.ts` — name, role, bio, email, site URL, resume PDF path, plus
  the dormant switches: `formEndpoint` (contact form) and `umami` (analytics).
- `data/resume.ts` — experience, education, skills.
- `data/projects.ts` — project cards (pitch, stack, live/source links).
- `data/socials.ts` — social and contact links.
- `data/blog/*.md` — blog posts (frontmatter: `title`, `date`). The `6:blog`
  window, `~/blog/`, and the RSS feed link appear with the first post.

Replace every `TODO` placeholder with real values. Drop a `resume.pdf` into
`public/` to wire up the resume download.

## Adding a theme

1. Create `lib/themes/<name>.ts` exporting a `Theme` object with every token.
2. Register it in `lib/themes/index.ts`.

It then appears in the `themes` command, the title-bar switcher, and
`theme <name>` automatically — no component changes.

## Project layout

```
app/                  routes (one per window), layout, metadata, feed, styles
components/
  terminal/           chrome and panes: tabs, status bar, prompt, output
  editor/             read-only vim viewer (CodeMirror 6) + intel bindings
  content/            server-rendered about/resume/projects/contact/blog
  effects/            overlays: clock, sl, top, matrix, CRT
data/                 typed content + generated bundles (blog, source, ts-libs)
lib/
  terminal/           store, reducer, executor, keyboard, routing
  commands/           one file per command + a registry (eggs/ for hidden ones)
  vfs/                virtual filesystem: types, paths, tree, builders
  vim/                NORMAL-mode line-editing state machine
  intel/              language-intelligence facade, workers, providers
  themes/             theme token objects + registry
docs/                 design, theming, content, and roadmap notes
e2e/                  Playwright verification of the interaction model
```

## Accessibility

Full keyboard operation, a skip-to-content link, visible focus rings,
`role="log"` / `aria-live="polite"` on the output, and
`prefers-reduced-motion` honoured (no typing animation). Core content renders
server-side, so the page is readable and indexable even if the interactive
layer never loads — and the plain view is always one click away.

## License

Code is [MIT](LICENSE). Personal content (resume, blog posts, images) is not —
it stays © Christian Nucifora.
