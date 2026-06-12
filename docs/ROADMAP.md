# ROADMAP.md — Build order

Build in phases. Each phase ends in something that works and looks intentional.

> **Status:** all phases below are complete. The interaction model is governed
> by `FLOW.md` (which supersedes earlier section-command behavior) and the
> hidden features by `EASTER_EGGS.md`. This file records what was built and
> in what order.

## Phase 0 — Scaffold ✅
- Next.js (App Router) + TypeScript, `next/font` for JetBrains Mono + Inter.
- Semantic CSS variables (`docs/THEMES.md`), Tailwind v4 mapped onto them.
- Stub `data/` files from `docs/CONTENT.md`.

## Phase 1 — Core flow (FLOW.md) ✅
- Virtual filesystem in `lib/vfs/`: top-level directories ARE the five tmux
  windows (`about` `projects` `resume` `contact` `help`); content generated
  from `data/` (socials → contact.md, uses → about/uses.md, now → ~/.plan).
- External store + pure reducer (`lib/terminal/`); one executor for every
  typed, clicked, or auto-run command.
- FLOW §9 command set (`ls` `cd` `cat` `vim` `pwd` `tree` `clear` `help`
  `neofetch` `whoami` `open` `history` `theme` `echo` `date`), did-you-mean
  typo tolerance, and the section-word safety net.
- Windows + tab bar + tmux status bar + live title bar; real `/about/` …
  `/help/` static routes with pushState/popstate; first-entry auto-display;
  neofetch MOTD with type-on; click-to-command animation (§5).
- e2e suite rewritten as the phase gate.

## Phase 2 — Vim line grammar + COPY mode (FLOW 4a) ✅
- `lib/vim/`: pure state machine for the full
  `[count][operator][count][motion|textobject]` grammar, registers,
  undo/redo, dot-repeat — ~100 table-driven tests.
- Esc → NORMAL with block cursor; `Ctrl+b [` COPY mode with position badge
  and the new-output pill.

## Phase 3 — Panes + source browsing (FLOW 4b) ✅
- Binary split-tree panes in projects (`%` `"` `o` `hjkl` `x` `z`, drag
  dividers, cap 4, min sizes); window picker (`Ctrl+b w`); binding
  cheatsheet (`Ctrl+b ?`).
- This site's curated source bundled into `~/projects/<slug>/src/`
  (`scripts/bundle-source.mjs` + `data/source-manifest.mjs`).
- `cat` code highlighting via Lezer static spans mapped to theme tokens.

## Phase 4 — Read-only vim viewer (FLOW 4c) ✅
- CodeMirror 6 + `@replit/codemirror-vim`, lazy-loaded, modelled on
  `vim -M`: E21/E45 on edit attempts, `:q` `:{n}` `:help`, statusline,
  rnu+nu, visual-yank → clipboard, Ctrl+b interop, per-pane persistence.
- Mandatory eggs: `:help 42` / `holy-grail` / `UserGettingBored`, `:smile`,
  shell-prompt `:q`/`:wq`, the tmux clock (`Ctrl+b t`).

## Phase 5 — Easter eggs (EASTER_EGGS.md) ✅
- One-liners and fake coreutils (sudo, rm, man christian, git, emacs/nano,
  ping, make, fortune, cowsay, figlet, uname, uptime, df, free, which,
  touch/mkdir, top/htop, sl), dotfiles + `/etc/passwd`, seeded history.

## Phase 6 — Showpieces ✅
- `rm -rf / --no-preserve-root` disintegration (overlay-only; deep-equal
  state-restoration test) and the matrix-rain idle screensaver / `cmatrix`.

## Phase 7 — Themes ✅
- Tokyo Night (default) + Tokyo Night Day, plus Catppuccin Mocha/Latte,
  Gruvbox, Dracula, Nord, One Dark, Solarized Dark/Light, Rosé Pine.
- CRT (Konami unlock): full token theme + scanline/flicker/curvature
  effects, palette-only under reduced motion.

## Phase 8 — Later ideas ✅ (all shipped 2026-06)
- FLOW §8.2 tier 2/3 language intelligence: TS language service + web-stack
  and yaml/toml providers in Web Workers (hover/gd/diagnostics/:symbols).
  Python/Rust evaluated and dropped — no browser-capable servers exist
  (see docs/superpowers/plans/2026-06-12-intel-phase-d-record.md).
- Blog window `6:blog` appended after `5:help`, dormant until the first
  post in `data/blog/`; RSS at /feed.xml.
- Contact form via a third-party endpoint, dormant until
  `profile.formEndpoint` is set.

## Polish (2026-06) ✅
- Recruiter pass: plain view, welcome strip, title-bar shortcuts.
- Per-route metadata + full sitemap, skip link, security headers
  (vercel.json), web manifest + icons + theme-color, Umami (dormant), CI.
