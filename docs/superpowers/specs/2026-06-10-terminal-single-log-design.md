# Terminal flow redesign — one continuous log

**Date:** 2026-06-10
**Status:** Approved, ready for planning

## Problem

The terminal runs two interaction models bolted together, and the seam is what
feels "off."

- **The shell (window 0)** is a real terminal: type a command, it echoes, and
  output appends to a persistent scrollback you can scroll back through.
  `ls`, `echo`, `cowsay`, `neofetch`, `whoami` all work this way.
- **The sections (windows 1–5: about, resume, projects, contact, homelab)** do
  not. They take over the screen as an ephemeral single page — the shell
  scrollback disappears, you see only that one section, it is a tab in the
  bottom strip, deep-linked via URL hash, and Esc backs out.

So the same gesture — type a word, press Enter — does two opposite things
depending on the word. `cowsay hi` adds to the conversation; `about` wipes it and
shows a page. The terminal illusion breaks at exactly the commands a visitor
cares about.

The window/section state machine is also the root of a second complaint: too many
overlapping navigation systems. Because sections are "windows," the site needs a
tab strip, a tmux-style switcher, a status-bar home label, hash-as-window-state,
and Esc-as-back to manage them. These are not independent problems — removing the
split-brain model collapses most of the navigation with it.

## Goal

One honest interaction model and one navigation system. The terminal should
behave like a terminal everywhere, so the metaphor earns its keep instead of
fighting it. This also serves the project's accessibility non-negotiables better:
clicking and typing become literally identical actions.

## Decisions (locked)

1. **Direction:** one continuous terminal log (terminal-first). Not pages-first;
   not a patched hybrid.
2. **Power-user layer:** stripped to the prompt. Remove the tmux/window-switcher,
   vim NORMAL mode, and the command palette.
3. **Run behavior:** append a fresh copy on every run, then scroll the echoed
   command line to the top of the viewport. Re-running stacks another copy;
   `clear` resets.
4. **Deep links:** read the URL hash on load only (run that command, scroll to
   it). Do not write hash state on navigation. Shareable per-section URLs after
   navigation are dropped on purpose, to kill the history-as-window behavior.
5. **StatusBar:** kept as a non-interactive decorative status line (path + theme
   name) for terminal flavor. It is no longer a navigation surface.

## Design

### The model

Exactly one interaction model: a single persistent scrollback. Every command —
`about`, `resume`, `projects`, `contact`, `homelab` included — echoes its command
line and appends its output below, identical to how `echo` and `cowsay` already
behave. There are no windows, no sections, no ephemeral takeover view, no current
tab. The shell scrollback is the whole UI.

### Navigation

Two ways to act, and they are the same action:

1. **The prompt** — type a command.
2. **One nav/chip row** — buttons for `about · projects · resume · contact`,
   plus the boot suggestion chips. Clicking a button types the command into the
   prompt and runs it, appending to the log in full view. Clicking and typing are
   now visibly identical, which finally makes good on the "every click echoes its
   command" promise.

This nav row is a single persistent surface shown on all viewports — it replaces
both the desktop bottom tab strip and the separate mobile bar, so there is one
nav implementation, not a desktop one and a mobile one.

Deleted navigation: the bottom tab strip's tab semantics, the tmux
window-switcher, the status-bar home/host label as a control, Esc-as-back, and
hash-as-window-state.

### Run and scroll behavior

On every run:

1. Append the echoed command line plus its output to the one log.
2. Scroll so the echoed command line sits at the top of the viewport, so each
   output is read from its start regardless of length.

Re-running a command stacks a fresh copy (honest terminal behavior). `clear`
empties the log. Boot still seeds the log once per page load; if hydration fails,
the server-rendered content stays on screen.

`prefers-reduced-motion` is honored: no typing animation, scroll is instant.

### Deep links and no-JS

`/#projects` still works: on load, the hash maps a label to its command and runs
it. The hash is read on load only — it is never written on navigation, so there
is no back/forward-as-window behavior. Server-rendered section content remains for
SEO and the no-JS fallback.

## Code impact

- **`components/terminal/Terminal.tsx`** — significant simplification. Delete
  `activeWindow`, `sectionEntry`, the section-vs-shell branch, hash writing, and
  the switcher wiring. `runLine` becomes "append always; scroll new command line
  to top." Expect roughly a 40% reduction.
- **Delete `components/terminal/WindowSwitcher.tsx`.**
- **Delete `components/ui/CommandPalette.tsx`.**
- **`components/terminal/useTerminalKeys.ts`** — remove vim modes, the tmux
  prefix, and all window keys. Keep only history ↑/↓, Tab-completion, and
  Ctrl-L = clear.
- **`components/terminal/StatusBar.tsx`** — drop mode/prefix/tabs. Keep a
  non-interactive status line showing the path (`~`) and theme name.
- **`components/terminal/MobileBar.tsx`** — repurpose into the single nav/chip
  row; drop the palette button.
- **`components/terminal/windows.ts`** — reduce to a plain `SECTIONS` list
  (label + command) feeding the nav row. Delete `pathForWindow`,
  `windowForCommand`, the window-id machinery, and `windowForLabel`'s
  window-state role (keep only a label→command lookup for deep links).
- **Tests/e2e** — remove the window/switcher/section tests. Add tests for the new
  model (below).

The command registry (`lib/commands/`), data files, themes, and content
components are unaffected — this is a shell-layer change, not a content change.

## Testing

Unit (Vitest):

- `runLine` appends to the one log for every command type; there is no section
  branch.
- `clear` empties the log.
- Clicking a nav button runs the command and appends, identical to typing it.
- `useTerminalKeys` retains history ↑/↓, Tab-completion, and Ctrl-L; vim/tmux
  keys are gone.

e2e (Playwright):

- Type `about` → its output appends below the boot seed (the seed is not
  replaced).
- Click the `projects` nav button → same result as typing `projects`.
- Re-running a command stacks a second copy.
- Deep-link load (`/#projects`) runs the command and scrolls to it.
- `prefers-reduced-motion` is respected (no typing animation).

## Out of scope

- Content (the `TODO` placeholders in `data/`).
- Analytics / telemetry (separate spec).
- Project case-study deep-dives (separate spec).
- New themes or theme-system changes.
