# personal-website

A developer portfolio that looks and behaves like a terminal, but stays fully
usable for visitors who have never touched a command line. Every action can be
**typed** (`help`, `about`, `resume`, `projects`, `contact`, …) **or clicked**
in the nav bar and suggestion chips — and each click echoes the command it ran,
so the two halves teach each other.

Ships with **Tokyo Night** (dark, default) and **Tokyo Night Day** (light). The
theme system is token-based: adding a theme is adding one object to a registry.

## Stack

- **Next.js (App Router) + TypeScript**, statically exported (`output: "export"`).
- **Tailwind CSS v4**, mapped onto semantic CSS custom properties — the single
  source of truth for theme tokens. No component hardcodes a colour.
- **No backend.** Content lives in typed files under `data/`.
- Fonts via `next/font`: JetBrains Mono (terminal) + Inter (long-form prose).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # static export to ./out
npm run lint
npm run typecheck
```

The exported `./out` directory is a plain static site — deploy it to any static
host (Vercel, Netlify, GitHub Pages, S3, …).

## Deploy

Set `profile.siteUrl` in `data/profile.ts` first — SEO metadata, the sitemap,
`robots.txt`, and the generated Open Graph image all read from it.

- **Vercel / Netlify** — import the repo; they detect Next.js and build it. No
  config needed. (Delete `.github/workflows/deploy.yml` if you go this route.)
- **GitHub Pages** — the included workflow (`.github/workflows/deploy.yml`)
  builds and publishes `./out` on every push to `main`. Enable Pages →
  "GitHub Actions" in repo settings. For a custom domain, add a `public/CNAME`
  file containing the domain (e.g. `christiannucifora.com`).

SEO is wired up: `/sitemap.xml`, `/robots.txt`, a generated `/opengraph-image`,
JSON-LD `Person` data, and canonical/Open Graph/Twitter metadata.

## Editing content

All content is data, not markup. Edit these files and the UI updates:

- `data/profile.ts` — name, role, bio, email, resume PDF path.
- `data/resume.ts` — experience, education, skills.
- `data/projects.ts` — project cards (pitch, stack, live/source links).
- `data/socials.ts` — social and contact links.

Replace every `TODO` placeholder with real values. Drop a `resume.pdf` into
`public/` to wire up the resume download.

## Adding a theme

1. Create `lib/themes/<name>.ts` exporting a `Theme` object with every token.
2. Register it in `lib/themes/index.ts`.

It then appears in the `themes` command, the title-bar switcher, and
`theme <name>` automatically — no component changes.

## Project layout

```
app/                  routes, layout, global styles
components/
  terminal/           window shell, prompt, input, output log, chips
  content/            about, resume, projects, socials, help output
  ui/                 theme switcher, help panel, icons, chips
  theme/              ThemeProvider (applies + persists the chosen theme)
data/                 typed content files
lib/
  commands/           one file per command + a registry
  themes/             theme token objects + registry
docs/                 design, theming, content, and roadmap notes
```

## Accessibility

Full keyboard operation, visible focus rings, `role="log"` /
`aria-live="polite"` on the output, and `prefers-reduced-motion` honoured (no
typing animation). Core content renders server-side, so the page is readable and
indexable even if the interactive layer never loads.
