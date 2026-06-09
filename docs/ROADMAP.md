# ROADMAP.md — Build order

Build in phases. Each phase ends in something that works and looks intentional. Extra themes are deliberately last — core functionality first, per the brief.

## Phase 0 — Scaffold
- Next.js (App Router) + TypeScript, `next/font` for JetBrains Mono + Inter.
- `styles/globals.css` with the semantic CSS variables (placeholder values fine for now).
- Stub `data/` files from `docs/CONTENT.md` so layout has real shapes to render.
- Decide Tailwind v4 or plain CSS; either way, tokens stay CSS variables.

## Phase 1 — Shell and content (no terminal logic yet)
- Build the window frame: title bar with dots + theme switcher slot, nav bar, output area, prompt line (static for now).
- Render `about`, `resume`, `projects`, `socials` as **server-rendered sections** straight from `data/`. This is the no-JS-fallback baseline and the SEO content.
- Mobile layout to 320px. Focus styles on every link/button.
- *Done when:* the site is a readable portfolio even with JS disabled.

## Phase 2 — Command engine
- `lib/commands/` registry: `name`, `aliases`, `description`, `usage`, `group`, handler.
- Implement `help` `about` `resume` `projects` `contact` `socials` `clear` `whoami` `ls` `echo` `history` `theme` `themes`.
- Wire the live input: Enter runs, echoes the command, appends output to a `role="log"` / `aria-live="polite"` region. History via ↑/↓. Tab-completion.
- Nav buttons and chips call the same registry (clicking types + runs the command).
- Unknown command → friendly guide message.
- *Done when:* every command works by typing and by clicking, and clicking visibly runs the equivalent command.

## Phase 3 — Help interface
- Ambient hint in boot output + placeholder text + suggestion chips.
- `help` grouped output with clickable chips and the "you don't need to know commands" lead.
- Help slide-over panel (`?` button / `help --full`): what-is-this paragraph, full command table, shortcuts, and a "show me everything" runner.
- *Done when:* a first-time, terminal-unfamiliar user can navigate the whole site without typing.

## Phase 4 — Theming
- `ThemeProvider`, `setTheme()`, `localStorage` persistence, first-visit `prefers-color-scheme` default.
- Ship **Tokyo Night** (default) and **Tokyo Night Day** from `docs/THEMES.md`.
- `theme <name>` command + title-bar switcher + `themes` list, all calling `setTheme()`.
- *Done when:* toggling switches both themes instantly and the choice survives reload.

## Phase 5 — Motion and polish
- Boot typing sequence (skippable, disabled under `prefers-reduced-motion`).
- Caret blink, output fade-in, chip/link hover states. Nothing more.
- Resume PDF download, contact form (third-party endpoint) with inline validation.
- *Done when:* Lighthouse accessibility ≥ 95, no keyboard traps, reduced motion respected.

## Phase 6 — More themes (post-launch backlog)
Add one token object per theme, register, verify contrast. No component changes.
- [ ] Catppuccin Mocha
- [ ] Catppuccin Latte
- [ ] Gruvbox
- [ ] Dracula
- [ ] Nord
- [ ] One Dark
- [ ] Solarized Dark
- [ ] Solarized Light
- [ ] Rosé Pine

## Later ideas (optional)
- A real-ish filesystem so `ls` / `cd` browse sections.
- `theme random`, an easter-egg command, a `sudo` joke.
- Blog/notes section as another command.
- Deploy on Vercel; static export works since v1 has no backend.
