# Booted-session home — design

## Context

The terminal portfolio is full-page with a bottom kitty/tmux window strip and a
persistent shell scrollback. The **initial / shell page** doesn't feel right.
The owner's complaints, confirmed:

1. **Too "landing page."** The permanent welcome blurb (*"Welcome. I'm Christian
   Nucifora…"*) plus the suggestion-chip band read like a marketing hero, not a
   terminal you've dropped into.
2. **"shell" as a tab is odd.** Home being a peer tab (`0:shell`) next to the
   section tabs is confusing — home shouldn't be a sibling of the sections.
3. **Feels empty / lifeless.** There's nothing alive to land on.

The fix is a new home paradigm: **you land like you just opened a live session.**
A short boot seeds the shell, an auto-run fastfetch identity card provides the
life, home becomes *where you are* (not a tab), and the marketing framing is gone.

### Decisions (from brainstorming)

- **Home paradigm:** booted session + fastfetch card.
- **Boot intensity:** minimal — a real `last login:` line, the fastfetch card, an
  inline hint, then the prompt. Effectively instant; reduced-motion safe. No
  typing animation.
- **Home control:** the far-left `christian@portfolio` session label IS the home
  button (click it, press **Esc** while in a section, `cd ~`, or `Ctrl-b 0`). The
  `0:shell` tab is removed; the bottom strip shows only sections.
- **`clear`:** wipes the whole scrollback (card included) for a bare prompt. The
  boot re-seeds on the next page load, not after `clear`.

## What the home looks like

On page load the shell scrollback is seeded with these entries (normal output,
subject to `clear`):

```
last login: Mon Jun 10 09:14 on ttys001

   _____ _   _     christian@portfolio
  / ____| \ | |    ─────────────────
 | |    |  \| |    Role   Full-stack developer
 | |___ | |\  |    Stack  TypeScript · React · …
  \____|_| \_|     Theme  tokyo-night
                   ███ ███ ███ ███ ███ ███

try: about · projects · resume · help
visitor@christian:~$ █
```

- **`last login:`** — persist the previous visit timestamp in `localStorage`
  (`portfolio:lastLogin`); show the real previous visit, then write the current
  time. First-ever visit shows a sensible default (e.g. "just now"). Format:
  `last login: <Ddd Mon DD HH:MM> on ttys001`.
- **fastfetch card** — the existing `neofetch` output, extracted into a shared
  `Fetch` component so both the `neofetch` command and the boot render it.
- **inline hint** — `try: about · projects · resume · help`, each word a real
  clickable button that runs the command; muted inline styling, not chips.

## Architecture & components

- **`components/content/Fetch.tsx` (new)** — the identity card, extracted from
  `lib/commands/neofetch.tsx`. Takes the data it needs (theme id) as a prop so it
  is pure. `neofetch.tsx` becomes a thin wrapper rendering `<Fetch themeId={…}/>`.
- **`components/terminal/boot.tsx` (new)** — `bootEntries(themeId): LogEntry[]`
  builds the seed entries: the `last login` line (reads/writes
  `localStorage`), the `<Fetch/>` card, and the inline hint (a small component
  whose words call `onRun`). Because entries hold `ReactNode`, the hint needs the
  `onRun` handler — pass it in, or emit a `<BootHint onRun=…/>`.
- **`components/terminal/Terminal.tsx`** —
  - On mount, seed `shellEntries` with `bootEntries(themeId)` (once per load).
  - Remove the `<Greeting/>` and the hero `<SuggestionChips/>` band from the body.
  - Add `goHome()` = select window 0 (shows the shell scrollback, never clears).
  - Pass `goHome`, and an `isSection` signal, into `useTerminalKeys` for Esc.
- **`components/terminal/Greeting.tsx`** — retired (deleted); its typing animation
  and welcome copy are replaced by the boot.
- **`components/terminal/StatusBar.tsx`** — the left `christian@portfolio` label
  becomes a real button: highlighted when `active === 0`, click → `onSelect(0)`
  (home). The window list filters out id 0 so only sections render as tabs.
- **`components/terminal/windows.ts`** — `WINDOWS` keeps id 0 (shell) for path,
  hash, and `windowForCommand` logic; add a `SECTIONS` view (ids ≥ 1) for the tab
  strip. `pathForWindow(0)` stays `~`.
- **`components/terminal/useTerminalKeys.ts`** — contextual Escape: when a section
  is active, Esc calls `onHome()`; in the shell, Esc keeps the current vim
  NORMAL-mode blur. Thread an `onHome` callback and a way to read the active
  window (a ref/getter).
- **`lib/commands/neofetch.tsx`** — delegates to `<Fetch/>` (no behavior change for
  the command itself).

`SuggestionChips.tsx` stays in the repo (still used by `help` output); it is just
no longer rendered as the home hero.

## Data flow

1. Mount → `bootEntries(themeId)` seeds `shellEntries`; `data-js-ready` set.
2. A deep-link hash still wins: if `#section` is present, open that section after
   seeding (returning home then shows the seeded shell).
3. Navigation unchanged: sections are ephemeral; shell scrollback persists.
4. `goHome()` (label click / Esc-in-section / `cd ~` / `Ctrl-b 0`) → window 0,
   shows `shellEntries` (boot card still there unless `clear` ran).
5. `clear` → `shellEntries = []` (bare prompt). Reload re-seeds.

## Edge cases & error handling

- **localStorage unavailable** (private mode): `last login` falls back to a
  default line; no throw (try/catch, mirroring the history store).
- **Reduced motion:** boot entries render with no animation (the existing
  `output-fade` is already disabled under `prefers-reduced-motion`).
- **No-JS fallback:** unchanged — `StaticContent` still server-renders; the boot
  is client-only and never blocks indexable content.
- **Theme change after boot:** the card shows the theme at boot time; it does not
  live-update (acceptable — it's scrollback). Re-running `neofetch` shows current.
- **SSR/hydration:** boot is seeded in a mount effect (client only), so no
  hydration mismatch; `shellEntries` starts empty on first render.

## Testing (extend the Playwright e2e)

1. Load → scrollback shows `last login:`, the fastfetch card (Host/Role/Stack),
   and the `try: …` hint; no "Welcome. I'm Christian" banner, no chip band.
2. The bottom strip has **no** `0:shell` tab; the `christian@portfolio` label is
   present and highlighted at home.
3. Open `about` (ephemeral) → press **Esc** → back at the seeded shell.
4. Click the `christian@portfolio` label from a section → home.
5. `clear` → bare prompt (no card); reload → card re-seeded.
6. Second visit shows a `last login` time from the first visit (localStorage).
7. Inline hint words run their commands; `neofetch` still renders the same card.
8. Re-run the full existing suite (persistent shell, deep-link, tmux keys, ghost
   text, mobile bar) — all still green.

## Out of scope

Dashboard panes and the BBS/figlet menu (considered, not chosen). No change to
the command engine, theming tokens, or the section/window navigation model beyond
removing the shell tab and adding the home control.
