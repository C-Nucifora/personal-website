# Recruiter / HR friendliness — design spec

**Date:** 2026-06-11
**Status:** approved by Christian (scope: all four workstreams; nav approach A + B; content deferred)

## Goal

Make the terminal portfolio legible and useful to non-technical visitors
(recruiters, HR) without diluting the terminal experience for developers.
Real resume/profile content is explicitly **out of scope** for this work —
Christian will fill the `data/` files later. This work is structural.

## Context (findings that motivated the design)

- `data/profile.ts`, `data/resume.ts`, `data/now.ts`, `data/uses.ts` are
  TODO placeholders, and `data/socials.ts` has placeholder GitHub/LinkedIn
  URLs. **Decision: leave all of it as is** — Christian updates content later.
- `public/` has no `resume.pdf`, but the Resume section renders a
  "Download PDF" button pointing at `/resume.pdf` → 404.
- `StaticContent` (the full plain version of the site) is hidden the moment
  the terminal hydrates; with JS on there is no way to reach it.
- All novice signposting speaks shell (`try: cd about`); nothing says
  "you can just click the tabs."

## Workstream 1 — Navigation clarity (approach A + B)

### A. Welcome strip

- A one-time, dismissible strip in plain human language, e.g.
  *"New to terminals? Click the tabs above to browse — or switch to
  plain view."* with "plain view" as a clickable action.
- Placement: slim bar directly under the tab bar (not inside scrollback, so
  it survives `clear` until dismissed and is visible on deep links).
- Dismissal: an `✕` button; persisted in `localStorage`
  (`portfolio:welcome-dismissed`). Never shown again once dismissed.
- The MOTD hint line gains a human-language sentence around the existing
  clickable `cd …` commands. The commands stay — FLOW §4 "hints are real
  shell, always" — the sentence wraps them, e.g.
  *"click any of these, or just click a tab: …"*.
- Accessible: the strip is a `role="note"` (or similar landmark-free
  element), keyboard-dismissable, focus ring on the dismiss button.

### B. Tab affordances

- Pure CSS restyle of `components/terminal/TabBar.tsx` buttons: stronger
  hover state (background tint, not just text color), visible separation
  between tabs, pointer cursor (exists), and an active-tab treatment that
  reads as "selected tab" at a glance.
- Labels stay exactly `1:about` … `5:help` — FLOW §3.3 (tab bar ≡ status
  bar window list) is preserved.

Explicitly rejected: a first-visit guided tour overlay (heavyweight,
off-brand, adds friction for the impatient visitor).

## Workstream 2 — Plain view as a first-class mode

- New registered command `plain` (in `lib/commands/core/`), with `meta`
  so it appears in `help`. Running it switches the site to the
  server-rendered `StaticContent` view. A counterpart action in the plain
  view returns to the terminal.
- A visible **"Plain view"** button in the title bar runs `plain` via
  `runClick` — same pattern as the theme dropdown, honoring the
  one-state/command-layer rule (CLAUDE.md non-negotiable #2).
- Mechanism: a `data-view="plain"` attribute on a root element drives the
  existing CSS show/hide pair (`.interactive` / `.static-fallback`), which
  already does this for the pre-hydration and print cases. No new content
  components; `StaticContent` is reused untouched (plus a "Back to
  terminal" button, hidden when JS is off).
- Persistence: `localStorage` (`portfolio:view`); returning visitors who
  chose plain view stay in plain view.
- Deep link: `?plain=1` on any route activates plain view immediately —
  the URL to hand to recruiters. Precedence: explicit URL param >
  `localStorage` > default (terminal). Plain-view state must not break the
  existing `/about` … `/help` routes or print styles.
- Reduced-motion / no-JS behavior unchanged: no-JS visitors already get the
  static fallback.

## Workstream 3 — Recruiter signposting

- **Download button 404 fix:** at build time, check whether
  `public/resume.pdf` exists (Node `fs` in a server component or generated
  constant — static export compatible). If absent, hide the "Download PDF"
  button; the Print/Save-as-PDF button remains the always-working path.
  When Christian later drops in the PDF, the button reappears on next build.
- **Title-bar résumé affordance:** a small "resume" button next to `?`
  that runs `cd ~/resume` via `runClick` (one click to the resume from
  anywhere, taught in command vocabulary like everything else).
- **OG/meta review:** audit `app/opengraph-image.tsx` and metadata so the
  link-preview card leads with name + role (and never renders a raw
  "TODO"), reading as a person for hire rather than a terminal demo.

## Workstream 4 — Content scaffolding hygiene (no real content)

- Audit every surface that renders `data/` values (neofetch/`Fetch`,
  `whoami`, OG image, title/meta, status bar, prompt) and ensure the
  `strip("TODO ")` convention is applied consistently so the literal word
  "TODO" never reaches a visitor.
- Leave all placeholder values and dead social links in place per
  Christian's decision; content pass happens later.

## Documentation

- FLOW.md gains short sections for the welcome strip and the `plain`
  command/mode (it amends the §9 command table and §10.1 title bar spec).
- docs/DESIGN.md notes the plain-view mode under the help-first philosophy.

## Testing

- Unit: `plain` command registration/meta; welcome-strip dismissal
  persistence logic; build-time PDF presence flag.
- e2e additions: plain-view toggle round-trip (terminal → plain → back),
  `?plain=1` deep link, welcome strip shows once and stays dismissed,
  resume title-bar button navigates, no "TODO" text visible on any route.
- Existing gates: `npm run typecheck && npm run lint && npm run test`,
  `npm run build`, `npm run e2e` against `out/`.

## Out of scope

- Real resume/profile/socials content and the actual `resume.pdf`.
- Guided tour overlay.
- Any change to tab labels, window numbering, or the command vocabulary
  beyond adding `plain`.
