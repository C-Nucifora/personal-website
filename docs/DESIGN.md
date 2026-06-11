# DESIGN.md — Layout, feel, and UX

The brief: a developer portfolio that *is* a terminal but never strands a non-technical visitor. Treat the terminal as the signature, and the discoverability as the discipline that keeps it kind.

> **Precedence note:** `FLOW.md` is the authority on interaction behavior —
> navigation architecture, input modes, keybindings, and the command set.
> Where this document describes interaction (section commands, suggestion
> chips, the help panel) and FLOW.md disagrees, FLOW.md wins. Visual styling,
> layout feel, and the help-first philosophy here remain binding.

## Signature element

A single terminal window, centered, with a faux title bar. The prompt is the thing people remember:

```
visitor@<yourname>:~$ _
```

The caret blinks. On first load it types a one-line greeting and the help hint by itself, then hands control to the visitor. Everything else on the page stays quiet so the window carries the personality.

## The hybrid model (the core idea)

Two ways in, one engine behind them.

- **Type it.** A real command input with history (up/down arrows), tab-completion, and aliases.
- **Click it.** A top nav bar (`about` · `resume` · `projects` · `contact` · `theme`) and inline **suggestion chips** under the prompt for the most common next moves.

Both paths call the same command registry. Clicking `projects` types `projects` into the prompt, runs it, and scrolls the output into view — so the click *teaches the command*. This is how a terminal-shy visitor learns the interface without being asked to.

Rule: **no action is reachable only by typing.** If a command exists, a button or chip runs it too.

## Layout

```
┌────────────────────────────────────────────────────────┐
│  ● ● ●   visitor@yourname: ~                  [theme ▾]  │  ← title bar + theme switcher
├────────────────────────────────────────────────────────┤
│  about   resume   projects   contact   help             │  ← nav (runs commands)
├────────────────────────────────────────────────────────┤
│  Welcome. I'm <Name>, a <role>.                          │
│  Type a command or tap one below. New here? Try `help`.  │  ← boot output
│                                                          │
│  [ about ] [ projects ] [ resume ] [ contact ]           │  ← suggestion chips
│                                                          │
│  visitor@yourname:~$ _                                   │  ← live prompt
│                                                          │
│  (output log scrolls here as commands run)               │
└────────────────────────────────────────────────────────┘
```

- **Desktop:** single column, max width ~860px, generous margins, window casts a soft shadow against a flat themed background.
- **Mobile:** the window fills the viewport; nav collapses into the title bar or a sticky bottom command bar; chips wrap. Tap targets ≥ 44px. The keyboard-summoning input sits where thumbs reach.
- The title-bar dots are decorative but recolor with the theme (not literal macOS red/yellow/green unless the theme defines those).

## Help interface (the priority)

A first-time visitor must, **without typing**, understand: this is interactive, and here is what to press.

Three layers, in order of how soon a visitor meets them:

1. **Ambient hint (always there).** The boot line ends with `New here? Type help or tap a button below.` Suggestion chips sit right under the prompt. The placeholder text in the input reads `type a command, or tap a suggestion`.
2. **`help` output.** Typing or clicking `help` prints a plain-language list: each command name, a one-line description of what it *does for you* (not how it's built), and a clickable chip. Lead with "You don't need to know terminal commands — click anything below." Group by purpose: *Get to know me*, *My work*, *Reach me*, *Customize*.
3. **Help panel (`?` button / `help --full`).** A slide-over with a short "what is this?" paragraph, the full command table with usage and aliases, the keyboard shortcuts (Tab to complete, ↑/↓ for history, `clear` to reset), and a one-tap "just show me everything" that runs `about`, `resume`, `projects`, `contact` in sequence for visitors who don't want to drive.

Writing rules for all help text: active voice, sentence case, name things by what the visitor controls. "See my projects," not "Invoke projects module." Errors guide, never scold: unknown input returns `I don't know "foo" yet. Type help to see what I can do.`

Plain view is the final safety net: the `plain` command (or `?plain=1`)
swaps the terminal for the same server-rendered content the no-JS fallback
ships, so a visitor who never warms to the terminal still gets the whole
site as a normal page — and a way back when curiosity wins (FLOW §3.4).

## Command behavior

- **Tab** completes the longest unique prefix; a second Tab lists matches as chips.
- **↑ / ↓** walk command history.
- **Enter** runs; the input echoes into the log as `visitor@yourname:~$ <command>` above its output.
- **`clear`** empties the log but keeps the greeting hint.
- Output is real DOM (links are links, the resume is selectable text, project cards are focusable), not an image of a terminal. Screen readers read the log via `role="log"` / `aria-live="polite"`.

## Content surfaces

- **about** — short bio, current role, what you're into. A few sentences, your voice.
- **resume** — rendered from `data/resume.ts`: experience, education, skills. Include a `resume --download` / button that links to a PDF in `/public`. Long-form text uses the body face for readability, set inside the terminal frame.
- **projects** — cards from `data/projects.ts`: title, one-line pitch, stack tags, **Live** and **Source** links, optional thumbnail. `projects --featured` shows only pinned ones.
- **contact / socials** — links from `data/socials.ts` as clickable rows with icons. Optional contact form posts to a third-party endpoint (Formspree/Resend), with inline validation and a plain success/error line in the log.

## Motion

One orchestrated moment: the boot typing sequence on first load (greeting + hint), ~30–50ms per character, skippable by any keypress or click, and **fully disabled** under `prefers-reduced-motion`. After boot, keep it calm: caret blink, a subtle fade as new output appears, hover states on chips and links. No scattered effects.

## Type and spacing

- **Display / terminal:** JetBrains Mono or IBM Plex Mono. This is the brand voice — use it for the prompt, commands, log, and labels.
- **Body (resume prose, about):** Inter or similar, set a notch larger and looser than the mono so long text stays readable inside the frame.
- One clear type scale; weight and spacing do the hierarchy work, not color alone. Don't rely on color contrast that some themes can't honor.

## Quality floor

Responsive to 320px wide. Visible keyboard focus on every interactive element. Reduced motion respected. Color is never the only signal (icons/labels back it up). Core content renders server-side and survives a hydration failure.
