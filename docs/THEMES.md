# THEMES.md — Theming system

Goal: adding a theme is adding **one token object** to a registry. No component ever edits to support a new theme. Tokyo Night is the default; Tokyo Night Day is the light option for v1. The rest come later (see `docs/ROADMAP.md`).

## How it works

1. Every visual value a component needs is a **semantic CSS custom property** (e.g. `--bg`, `--fg`, `--accent`), not a raw color. Components read `var(--accent)`; they never know which theme is active.
2. Each theme is a TypeScript object in `lib/themes/` mapping the semantic names to hex values.
3. A `ThemeProvider` writes the active theme's values to CSS variables on `:root` (or a `data-theme` attribute) and persists the choice to `localStorage` (`portfolio:theme`). Default to Tokyo Night; respect `prefers-color-scheme` for the *first* visit only (dark → Tokyo Night, light → Tokyo Night Day), then honor the saved choice.
4. The `theme <name>` command and the title-bar switcher both call the same `setTheme()`. `themes` lists the available ones as clickable chips.

## Semantic token contract

Every theme **must** define all of these. Component code only uses these names.

| Token | Used for |
|---|---|
| `--bg` | page background behind the window |
| `--bg-window` | terminal window surface |
| `--bg-elevated` | nav bar, title bar, panels, chips |
| `--bg-selection` | text selection / active line highlight |
| `--fg` | primary text |
| `--fg-muted` | secondary text, comments, placeholder |
| `--fg-subtle` | borders made of text, dividers |
| `--border` | window/title-bar/panel borders |
| `--accent` | prompt symbol, links, focused chip, primary action |
| `--accent-hover` | hover/active state of accent |
| `--success` | success messages, "Live" badges |
| `--warning` | warnings |
| `--error` | command-not-found, form errors |
| `--info` | hints, help emphasis |
| `--ansi-red` `--ansi-green` `--ansi-yellow` `--ansi-blue` `--ansi-magenta` `--ansi-cyan` | syntax-style coloring in output, tags, dots |
| `--focus-ring` | keyboard focus outline (must meet 3:1 against adjacent colors) |
| `--shadow` | window drop shadow (rgba string) |

Keep a TypeScript `Theme` type with exactly these keys so a missing token fails at compile time.

## Tokyo Night (default — dark)

Based on the standard Tokyo Night "Night" palette.

| Token | Hex |
|---|---|
| `--bg` | `#16161e` |
| `--bg-window` | `#1a1b26` |
| `--bg-elevated` | `#1f2335` |
| `--bg-selection` | `#283457` |
| `--fg` | `#c0caf5` |
| `--fg-muted` | `#565f89` |
| `--fg-subtle` | `#3b4261` |
| `--border` | `#292e42` |
| `--accent` | `#7aa2f7` |
| `--accent-hover` | `#89b4ff` |
| `--success` | `#9ece6a` |
| `--warning` | `#e0af68` |
| `--error` | `#f7768e` |
| `--info` | `#7dcfff` |
| `--ansi-red` | `#f7768e` |
| `--ansi-green` | `#9ece6a` |
| `--ansi-yellow` | `#e0af68` |
| `--ansi-blue` | `#7aa2f7` |
| `--ansi-magenta` | `#bb9af7` |
| `--ansi-cyan` | `#7dcfff` |
| `--focus-ring` | `#7dcfff` |
| `--shadow` | `rgba(0,0,0,0.45)` |

## Tokyo Night Day (light)

The official light variant. Prompt and links use the deep blue `--fg`/`--accent` for contrast on the light surface.

| Token | Hex |
|---|---|
| `--bg` | `#d5d6db` |
| `--bg-window` | `#e1e2e7` |
| `--bg-elevated` | `#e9e9ec` |
| `--bg-selection` | `#b7c1e3` |
| `--fg` | `#3760bf` |
| `--fg-muted` | `#848cb5` |
| `--fg-subtle` | `#a8aecb` |
| `--border` | `#c4c8da` |
| `--accent` | `#2e7de9` |
| `--accent-hover` | `#1a64d4` |
| `--success` | `#587539` |
| `--warning` | `#8c6c3e` |
| `--error` | `#f52a65` |
| `--info` | `#007197` |
| `--ansi-red` | `#f52a65` |
| `--ansi-green` | `#587539` |
| `--ansi-yellow` | `#8c6c3e` |
| `--ansi-blue` | `#2e7de9` |
| `--ansi-magenta` | `#9854f1` |
| `--ansi-cyan` | `#007197` |
| `--focus-ring` | `#2e7de9` |
| `--shadow` | `rgba(0,0,0,0.12)` |

## Adding a theme later

1. Create `lib/themes/<name>.ts` exporting a `Theme` object with every token above.
2. Register it in `lib/themes/index.ts` (`{ id, label, theme }`).
3. Done. It appears in `themes`, in the switcher, and works with `theme <name>` automatically.

Verify each new theme passes contrast: `--fg` on `--bg-window` ≥ 4.5:1, `--accent`/`--success`/`--error` on their background ≥ 3:1, and `--focus-ring` ≥ 3:1 against adjacent surfaces. A theme that fails contrast doesn't ship.

Palettes to add in the post-launch pass: Catppuccin (Mocha + Latte), Gruvbox, Dracula, Nord, One Dark, Solarized (Dark + Light), Rosé Pine. Pull each from its canonical source rather than guessing hex values.

> Note: hex values above are transcribed from the published Tokyo Night palettes and are close to canonical, but confirm against the current upstream theme before locking them, since palettes get minor revisions.
