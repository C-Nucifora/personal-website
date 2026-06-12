# FLOW.md — Interaction Model & User Flow Specification

This document defines the site's navigation architecture, input modes, and keybinding behavior. It is the authority for how users move through the site. Where it conflicts with DESIGN.md on interaction behavior, this document wins. Visual styling, layout dimensions, and theming remain governed by DESIGN.md and THEMES.md.

---

## 1. Core principle: one state, three interfaces

The site has exactly three input methods:

1. **Clicking** — tabs, clickable command output, buttons
2. **Shell commands** — `cd`, `ls`, `cat`, etc.
3. **Keybindings** — vim editing grammar + tmux prefix bindings

All three are interfaces to a single shared state. They never operate on parallel systems. `cd ~/projects`, pressing `Ctrl+b 2`, and clicking the "projects" tab all produce the identical state transition. Implementation must route all three through the same state mutation functions; do not implement click handlers that bypass the command layer (see §5).

### 1.1 Global state shape

```ts
interface AppState {
  activeWindow: WindowId;            // "about" | "projects" | "resume" | "contact" | "help"
  windows: Record<WindowId, WindowState>;
  mode: "INSERT" | "NORMAL" | "COPY";
  pendingPrefix: boolean;            // true after Ctrl+b, awaiting next key
  animating: boolean;                // a click-triggered command is being typed
}

interface WindowState {
  panes: PaneState[];                // length 1 except in projects window
  activePane: number;
  layout: PaneLayout;                // binary split tree, see §7.3
}

interface PaneState {
  cwd: string;                       // virtual filesystem path
  inputBuffer: string;
  cursorPos: number;
  commandHistory: string[];
  historyIndex: number | null;
  scrollback: OutputLine[];
  scrollOffset: number;              // 0 = pinned to bottom
  vimState: VimLineState;            // see §6.4
  view: "shell" | "editor";          // editor = a file is open via vim (§8.1)
  editor?: EditorState;              // open file path, cursor, scroll, search state
}
```

Each pane is an independent shell session: its own cwd, history, and scrollback. All panes share the one virtual filesystem.

---

## 2. Virtual filesystem ↔ window mapping

Top-level directories ARE tmux windows. This identity is the load-bearing design decision.

```
~/
├── about/
│   ├── about.md
│   └── uses.md             ← tools/setup, /uses convention
├── projects/
│   ├── <project-slug>/
│   │   ├── README.md
│   │   └── src/            ← real source files of the project (see §8)
│   └── ...
├── resume/
│   ├── resume.md
│   ├── resume.pdf          ← cat prints a summary + download link; clicking downloads
│   └── experience/
│       ├── <company-slug>.md   ← one per role: depth the resume doc can't hold
│       └── ...
├── contact/
│   └── contact.md
├── help/
│   ├── guide.md            ← full novice-friendly site guide
│   ├── commands.md         ← shell command reference
│   └── keybindings.md      ← vim + tmux reference, tiered
└── blog/                   ← appears once data/blog/ has posts (6:blog, dormant otherwise)
    └── <slug>.md           ← one per post
```

The `help` command (§9) prints the quick inline cheatsheet and ends with a clickable `full guide → cd ~/help`. Window and command serve the same content at two depths.

### 2.1 Synchronization rules

| Action | Effect on `cwd` | Effect on `activeWindow` |
|---|---|---|
| `cd ~/projects` (or any path under it) | updates | switches to `projects` |
| `cd` between subdirs of same window | updates | unchanged |
| `Ctrl+b 2` / `Ctrl+b n` / `Ctrl+b p` | restores that window's last cwd | switches |
| Click tab | restores that window's last cwd | switches (via animated command, §5) |
| `cd ~` or `cd /` | sets cwd to `~` | stays on current window; status bar shows `~` |

Window switching never resets a window's cwd. If the user was deep in `~/projects/foo/src` and switches to resume and back, they return to `~/projects/foo/src`. The animated command for a tab click into a previously-visited window is therefore `cd <that window's saved cwd>`, not the window root.

**First-entry auto-display.** On a window's first activation in a session (by any method — tab, `cd`, `Ctrl+b`), its shell auto-runs one echoed real command so no one ever arrives at an empty prompt: `cat about.md` (about), `ls` (projects), `cat resume.md` (resume), `cat contact.md` (contact), `cat guide.md` (help), `ls` (blog, when active). The command appears in scrollback exactly as if typed — consistent with the real-commands-only vocabulary, and another passive teaching beat. Subsequent visits restore existing scrollback untouched.

The home directory `~` is a valid location belonging to no window. The user can `ls` from `~` to see the five directories. This is the "lobby" state and is also the initial state on page load (see §4).

---

## 3. The two audiences and their flows

### 3.1 Novice flow (no terminal experience)

1. **Land.** MOTD prints (fast type-on, ~400ms total): one-line identity ("Christian — developer"), one-line instruction: `click a tab above, or type 'help'`. Prompt appears.
2. **Click a tab.** The command animates into the prompt and executes (§5). Window switches, content renders.
3. **Read content.** All content is normal scrollable rendered markdown inside the terminal frame. Mouse wheel / trackpad / touch scrolling always works in every mode.
4. **Clickable output.** Every path the terminal prints is interactive: directory names run `cd <name>`, file names run `cat <name>` (also animated). `ls` output is effectively a menu. Links in content (GitHub, email, PDF download) are real anchors.
5. **Optional learning.** By watching tab clicks type real commands, the novice can graduate to typing `cd contact` themselves. Nothing requires it.

The novice can complete every site goal (read about, browse projects, view/download resume, read role-by-role experience, find contact info, get help) using clicks alone.

### 3.2 Power user flow

1. **Land.** Same MOTD. Power users recognize the prompt and start typing.
2. `ls` → see the five directories → `cd projects && ls` → `cat <project>/README.md`.
3. `Esc` enters NORMAL mode for vim-grammar line editing (§6). `j`/`k` walk command history.
4. `Ctrl+b [` enters COPY mode to scroll long output with vim motions (§6.3).
5. `Ctrl+b n/p/1-4/w` for window movement; in projects, `Ctrl+b %` and `"` to split panes and browse source side-by-side (§7, §8).
6. `help` at any point prints the full cheatsheet, commands first, bindings second.

### 3.3 Cohesion guarantees

- Tab bar and tmux status-bar window list show identical labels, order, and numbering (1–5). The tab bar IS the window list, rendered large and clickable at the top; the bottom status bar repeats it tmux-style.
- Clicking and typing produce identical scrollback. A session driven entirely by mouse looks, in scrollback, like a session typed by hand.
- No GUI-only or CLI-only destinations. Every piece of content is reachable both ways.

### 3.4 Plain view & the welcome strip (recruiter mode)

- A dismissible welcome strip under the tab bar greets first-time visitors in
  plain language: click the tabs to browse, or switch to plain view. Dismissal
  persists (`portfolio:welcome-dismissed`); it never returns once closed.
- The `plain` command (title-bar button: "plain view") swaps the terminal for
  the server-rendered plain content — the same DOM the no-JS fallback ships.
  A "Back to the terminal" button returns. The choice persists in
  `localStorage` (`portfolio:view`), and `?plain=1` on any route forces plain
  view (URL param > saved choice > terminal default). While plain view is
  active, the global key listener stands down.

---

## 4. Page load sequence

The landing is a neofetch-style MOTD printed in the lobby (`~`). This resolves the lobby-vs-content tradeoff: the visitor lands at `~`, but the lobby has substance.

1. Window chrome renders immediately (no spinner): title bar, tab bar, status bar, empty terminal.
2. A last-login line prints: `last login: <real current date/time> on ttys001`.
3. The **neofetch block** types on (~600ms total, any input skips):
   - Left: ASCII logo (Christian's mark / initials block art, theme accent colors).
   - Right column, `label: value` pairs with labels in accent color: `Host` (full name) · `Role` · `Location` · `Shell: zsh` · `Editor: Neovim, tmux` · `Theme` (live — reflects and updates with active theme) · `Stack` · `Uptime` (seconds since page load at print time) · `Contact` (clickable mailto).
   - Below: the classic neofetch terminal-palette swatch row, rendered from the active theme's ANSI tokens (doubles as a theme preview).
4. Hint line: `try: cd about · cd projects · cd resume · help` — each clickable, running that exact command via the §5 animation. Hints are real shell, always: the site never invents vocabulary.
5. Prompt appears: `visitor@christian:~$`. Prompt format everywhere is `visitor@christian:<cwd>$` with cwd abbreviated (`~/projects/foo`).
6. State: `cwd = ~`, no active window, INSERT mode, focused prompt.

`neofetch` is a first-class command (§9) that reprints this block on demand with current uptime and theme. The MOTD and the command share one renderer.

Deep links: `/<window>` routes (e.g. `/projects`) load with that window active and the equivalent `cd` already in scrollback, as if the user had typed it; the neofetch MOTD still prints above it. Update the URL on window switch (history.pushState) so back/forward buttons work and map to window switches.

---

## 5. Click-to-command animation (decided: always animate)

Every click that has a command equivalent animates that command into the active pane's prompt, then executes it. This is the teaching mechanism and it always runs.

Spec:

- **What animates:** tab clicks (`cd <path>`), clickable directory names (`cd <name>`), clickable file names (`cat <name>`).
- **Speed:** type-on at ~15ms/char, capped at 250ms total regardless of command length (scale per-char speed down for long paths). Then a 60ms beat, then execute. Total perceived latency target: under 350ms.
- **Skippability:** any keypress or second click during animation completes it instantly (full command appears, executes immediately). Never queue animations; the skip rule prevents pile-ups during rapid tab clicking.
- **Buffer preservation:** if the user has a partially typed command in the prompt when they click, stash it, run the animated command, then restore the stashed text to the new prompt. Do not destroy user input.
- **Mode interaction:** clicking while in NORMAL or COPY mode returns to INSERT, then animates.
- **Reduced motion:** if `prefers-reduced-motion`, print the command instantly (still echoed to scrollback) and execute. The echo is the teaching tool; the animation is garnish.

---

## 6. Vim input modes (decided: full operator + motion + count grammar)

Three modes. The status bar always displays the current one.

### 6.1 INSERT (default)

Plain terminal typing. `Enter` executes, `↑`/`↓` walk history (arrow keys work in INSERT as a familiarity affordance), `Ctrl+c` cancels the current line, `Ctrl+l` clears, `Tab` autocompletes paths and command names. `Esc` → NORMAL.

### 6.2 NORMAL (command-line editing)

Operates on the single-line input buffer, modeled on zsh/readline vi-mode. `j`/`k` walk command history (the line is the unit; there is no vertical text motion). Full grammar:

**Structure:** `[count] [operator] [count] [motion | text-object]` — counts multiply (`2d3w` deletes 6 words).

**Motions:** `h l` `w b e` `W B E` `0 ^ $` `f{c} F{c} t{c} T{c}` `; ,` `|`
**Operators:** `d` `c` `y` (doubled forms `dd cc yy` act on the whole line)
**Text objects:** `iw aw iW aW` `i" a" i' a'` `i( a( i[ a[ i{ a{` `i< a<`
**Direct commands:** `x X` `r{c}` `~` `s S` `D C Y` `p P` `i a I A` `u` / `Ctrl+r` (line-local undo stack) `.` (repeat last change)
**History:** `j k` (and `↑ ↓`)
**Mode exits:** `i a I A s S c{motion}` → INSERT; `Enter` executes from NORMAL; `Esc` clears pending count/operator.

Yank/paste use an internal register only (no clipboard integration; native browser copy still works via selection).

Unrecognized keys in NORMAL: flash the status bar mode indicator briefly. Never beep, never print errors into scrollback for keybinding misses.

### 6.3 COPY (scrollback navigation)

Entered with `Ctrl+b [`, exactly like tmux. A position indicator appears top-right of the pane (`[123/456]` lines, tmux-style).

`j k` line scroll · `Ctrl+d Ctrl+u` half page · `Ctrl+f Ctrl+b` full page · `gg G` top/bottom · `{count}G` go to line · `q` or `Esc` or `Enter` exits and re-pins to bottom.

Mouse/touch scrolling works in every mode without entering COPY; COPY exists for keyboard users. New output while scrolled up does not yank the view to the bottom; show a `↓ new output` pill that jumps to bottom on click or on COPY-exit.

### 6.4 Mode-conflict rules (implementation-critical)

- The mode indicator reflects the **active pane**. Shell panes report INSERT/NORMAL/COPY; a pane with an open file (§8.1) reports `EDITOR [RO]`. Switching panes switches the indicator; each pane keeps its own state.
- `Esc` priority order: cancel pending tmux prefix → exit COPY → NORMAL-mode pending count/operator clear → INSERT→NORMAL transition. Inside the editor, `Esc` only clears pending counts/searches (it never closes the file — that's `:q`, matching real vim).
- `Ctrl+b` is consumed as tmux prefix in ALL modes and views, including inside the editor, and never reaches vim handling. Tmux window/pane navigation must keep working while a file is open; the open file persists in its pane.
- While `pendingPrefix` is true, the next keypress is interpreted per §7.2 and the status bar shows a `^B` indicator. Any unbound key cancels the prefix silently.
- Browser shortcut collisions: preventDefault on `Ctrl+b` and `Ctrl+u/d/f` only when terminal is focused. Never intercept `Ctrl+t`, `Ctrl+w`, `Ctrl+n`, `Cmd+anything`, or F-keys — losing a browser tab to a portfolio site is unforgivable.

---

## 7. Tmux layer

### 7.1 Windows

Five fixed windows: `1:about 2:projects 3:resume 4:contact 5:help`. Users cannot create or kill windows. Numbering is stable and matches the tab bar. The appended `6:blog` window exists but stays dormant — no tab, no route, no `Ctrl+b 6` — until `data/blog/` contains at least one post; existing windows are never renumbered.

### 7.2 Prefix bindings (`Ctrl+b`, then:)

| Key | Action | Scope |
|---|---|---|
| `n` / `p` | next / previous window | all |
| `1`–`5` | jump to window | all |
| `w` | window picker overlay (j/k + Enter, or click) | all |
| `[` | enter COPY mode | all |
| `%` | split active pane vertically (side-by-side) | projects only |
| `"` | split active pane horizontally (stacked) | projects only |
| `o` | cycle pane focus | projects |
| `←↑→↓` or `h j k l` | directional pane focus | projects |
| `x` | close active pane (confirm in status bar: `y/n`) | projects |
| `z` | zoom/unzoom active pane | projects |
| `?` | print binding cheatsheet to scrollback | all |

### 7.3 Panes (decided: windows-only everywhere, full user splits in projects)

- about / resume / contact: exactly one pane, always. `%` or `"` there shows a status-bar notice: `splits are available in the projects window`. This notice doubles as a feature advertisement.
- projects: full user-created splits. Binary split tree layout (each split divides the focused pane 50/50; minimum pane size ~20 cols / 6 rows — refuse the split with a status-bar notice below minimum). Cap at 4 panes to protect layout sanity. Draggable pane borders are in-scope; persisting layouts across reloads is not (session-only).
- Each new pane spawns a fresh shell session with cwd inherited from the pane it split from, empty scrollback, and a short header line stating its cwd.
- Closing the last extra pane returns to single-pane layout. Window switch preserves the projects pane layout for the session.
- Active pane: bright border (theme accent); inactive: dim border. Clicking a pane focuses it.

---

## 8. Source code browsing (projects window)

Each project directory contains its real source under `src/`, bundled at build time (curated subset per project — entry points and representative files, defined in `data/projects.ts`; do not ship entire node_modules-scale trees).

- `ls` in a source tree behaves normally; output stays clickable.
- `cat <file>` renders the file inline in scrollback with syntax highlighting (theme-aware, Tokyo Night / Day token colors per THEMES.md) and line numbers. Quick-glance tool; for real reading, use `vim`.
- Clicking a source file name runs `vim <file>` (animated, per §5); clicking content files like `about.md` still runs `cat`. Heuristic: code extensions open the editor, prose renders inline.
- `tree` command available: depth-capped (3) clickable tree of the cwd.
- Intended power flow: split panes, README or `tree` in one, `vim` a source file in the other.
- Each project README includes its GitHub link; `open <url>` opens a new browser tab (with a status-bar confirm to avoid popup abuse).

### 8.1 Read-only vim viewer

`vim <file>` (alias `view <file>`) opens the file full-pane, taking over the active pane exactly like vim in a real terminal. Behavior models `vim -M` (modifiable off):

- **Navigation (full multi-line vim):** `h j k l`, `w b e W B E`, `0 ^ $`, `gg G {count}G`, `f F t T ; ,`, `{ }`, `%` (bracket match), `Ctrl+d/u/f/b`, `zz zt zb`, counts on everything.
- **Search:** `/` and `?` with incremental highlight, `n N`, `*` `#` (word under cursor).
- **Yank:** `y{motion}`, `yy`, visual mode `v`/`V` for selection + `y` (yank also writes the system clipboard — the one place clipboard integration exists, because copying code snippets from a portfolio is a legitimate want).
- **Edit attempts:** `i a o x d c p` etc. trigger vim's authentic error in the editor's message line: `E21: Cannot make changes, 'modifiable' is off`. This is the joke and the boundary in one move. `:w` → `E45: 'readonly' option is set`.
- **Ex commands:** `:q` `:q!` close the file and return the pane to its shell (scrollback intact). `:{n}` jumps to line n. `:help` prints the viewer cheatsheet. Anything else → `E492: Not an editor command`.
- **Chrome:** vim-style statusline inside the pane: `src/index.ts [RO] · 42:7 · 38%`. Relative line numbers with absolute on cursor line (`set rnu nu` style). Status bar mode segment shows `EDITOR [RO]`.
- **Tmux interop:** `Ctrl+b` bindings all work while a file is open. A pane keeps its open file when unfocused; window switches preserve it for the session.
- **Novice affordances:** a dismissible one-line hint on first open (`:q to close · / to search · scroll works too`), mouse/touch scrolling and click-to-place-cursor always active, and a small `✕` close affordance in the pane corner that runs `:q`.

**Implementation directive:** build this on CodeMirror 6 with the vim extension (`@replit/codemirror-vim`) in read-only configuration, not a hand-rolled editor. CM6 supplies vim emulation, syntax trees, search, and theming hooks; restyle it to be visually indistinguishable from the terminal (same font, Tokyo Night tokens, transparent background). Hand-rolling multi-line vim is out of the question given the line-editor grammar (§6.2) is already the defect-risk budget. The shell-line vim grammar and the editor's vim emulation are separate implementations by design; do not attempt to share a state machine between them.

### 8.2 Language intelligence (last step, tiered)

LSP-grade features ship after everything else works (see §12.7 phasing). Tiered by feasibility in a static browser context:

| Tier | Languages | Features | Mechanism |
|---|---|---|---|
| 1 (baseline, ships with 8.1) | all bundled files | syntax highlighting, document symbols | CM6 Lezer parsers |
| 2 | TS / JS / TSX / JSON / CSS / HTML | hover types (`K`), diagnostics, go-to-definition (`gd`) **within the project's bundled files**, document outline | TypeScript language service + vscode CSS/JSON/HTML services in a Web Worker over a virtual FS of the bundled `src/` |
| 3 (best-effort) | other languages a showcased project uses | hover/diagnostics where a maintained WASM language server exists | `codemirror-languageserver` against a WASM LSP, lazy-loaded per language |

> **Status:** tier 2 for the TS family (ts/tsx/js — hover `K`, `gd` + jumplist `Ctrl+o`/`Ctrl+i`, diagnostics, `:symbols`) shipped via `lib/intel/`; remaining tier-2 services and tier-3 adapters follow per the 2026-06-12 spec.

Rules: all intelligence runs client-side in workers (no backend, no latency cliffs on nav); workers and grammars lazy-load on first `vim` open of a relevant file, never on page load; `gd` across files opens the target in the same pane's editor with a jumplist (`Ctrl+o` / `Ctrl+i` to go back/forward); if a tier-3 server is unavailable for a language, the editor degrades silently to tier 1 — no error states for missing intelligence. Tier 2 alone covers a TS/Next.js portfolio's own source, which is the highest-value target: visitors reading this site's code, in this site, with working go-to-definition.

---

## 9. Command set

All commands echo into scrollback whether typed or click-animated.

| Command | Behavior |
|---|---|
| `ls [path]` | clickable listing; dirs suffixed `/`, theme-colored |
| `cd [path]` | per §2.1; no arg → `~`; `cd -` → previous cwd |
| `cat <file>` | render file inline (markdown rendered, code highlighted) |
| `vim <file>` / `view <file>` | open read-only vim viewer in active pane (§8.1) |
| `pwd` | print cwd |
| `tree [path]` | clickable tree, depth 3 |
| `clear` | clear active pane scrollback |
| `help` | quick tiered cheatsheet (commands → vim → tmux), ends with clickable `full guide → cd ~/help` |
| `neofetch` | reprints the landing block (§4) with live uptime and current theme |
| `whoami` | one-line bio, link to about |
| `open <url>` | new tab after status-bar confirm |
| `history` | numbered history; `!{n}` re-runs |
| `theme [name]` | per THEMES.md; no arg lists themes |
| `plain` | switch to the plain website view; the title-bar button and welcome strip run it (§3.4) |
| `mail` | jump to the contact form (configured) or print the email (not) |
| `echo`, `date` | flavor; trivial |

Unknown command: `command not found: <x> — try 'help'`. Typo tolerance: if Levenshtein distance 1 from a known command, append `(did you mean '<y>'?)` as clickable text. **Section-name safety net:** a bare section word (`about`, `projects`, `resume`, `contact`) is not a command; it returns `command not found: about — did you mean 'cd about'?` with the suggestion clickable. This is the designed landing spot for the most predictable novice keystroke, and it teaches the real command in the same breath.

`cd`/`cat`/`ls` against nonexistent paths return authentic errors (`no such file or directory: <path>`).

---

## 10. Status bar & window chrome

### 10.1 Title bar (top, per the landing mockup)

- macOS-style traffic lights, left. Decorative by default; close (red) may trigger the `exit` easter-egg response, minimize/maximize are inert. Never actually navigate away.
- Centered dynamic title: `visitor@christian: <cwd>` (abbreviated), updating on every cwd change — same source of truth as the prompt.
- Right side: `resume` and `plain view` buttons (each runs its real command — `cd ~/resume`, `plain` — via the §5 animation; hidden on the smallest screens), a `?` button (runs `help` via the §5 animation — it is a command in disguise, not a separate help system) and a **theme dropdown**. Selecting a theme from the dropdown echoes and executes `theme <name>` in the active pane, keeping the GUI control inside the one-state rule. The dropdown and the `theme` command list identical options (including `crt (unlocked)` post-Konami).
- The tab bar sits directly below the title bar: `1:about 2:projects 3:resume 4:contact 5:help`.

### 10.2 Status bar (bottom, tmux-style)

Left → right: session name (`visitor@christian`) · window list with active highlight (clickable, mirrors tab bar) · mode indicator (`-- INSERT --` / `-- NORMAL --` / `-- COPY --` / `EDITOR [RO]` / `^B` when prefix pending) · cwd · clock (flavor) · `? help` hint.

The status bar is also the channel for transient notices (pane-split refusals, close confirms, `open` confirms). Notices replace the cwd segment for 3s, then revert. Never use browser `alert()`.

---

## 11. Mobile / touch

Keybindings do not exist on touch. The clickable layer carries mobile entirely:

- Tab bar remains the primary nav; all output stays clickable.
- A focused tap on the prompt area raises the soft keyboard for users who want to type commands; otherwise typing is never required.
- Panes: disable split creation below the `md` breakpoint (status-bar notice if somehow triggered); single-pane only on mobile.
- MOTD on mobile drops the `type 'help'` half of the instruction in favor of `tap a tab above`.
- COPY mode is irrelevant on touch; native scrolling covers it.

---

## 12. Implementation directives for Claude Code

1. Route ALL navigation through the command executor. Tab click → animate → execute string `cd <path>` through the same parser a typed command uses. One code path.
2. Vim grammar as a small state machine: accumulate `{count}{operator}{count}{motion}`, resolve on motion/text-object/timeout(Esc). Unit-test the grammar exhaustively (`d2w`, `2dw`, `c i (`, `3fx;`, `.` repeat, `u` stacks). This is the highest-defect-risk component.
3. Keep the filesystem as a plain typed tree in `data/` (extend CONTENT.md structures); commands resolve paths against it. No async, no fetching for navigation.
4. Pane layout as a binary tree; render with CSS grid/flex from the tree. Do not hand-roll absolute positioning.
5. Keyboard handling in one global listener with explicit mode dispatch, honoring §6.4 priority order. No per-component key handlers fighting each other.
6. Respect `prefers-reduced-motion` everywhere there is animation (MOTD, click-echo, cursor blink optional).
7. Phase fit (ROADMAP.md): core windows + commands + INSERT mode land before the vim grammar; the rest layers on in dependency order. Suggested insertion: **4a** line-editor vim grammar + COPY mode · **4b** panes + source browsing + `cat` highlighting · **4c** read-only vim viewer (§8.1, tier-1 intelligence) · **5x (final, after Phase 6 themes if desired)** tier-2/3 language intelligence (§8.2). LSP work is explicitly last: it is the only component with heavy lazy-loaded dependencies and zero impact on core navigation.

---

## 13. Out of scope (v1)

- User-created windows, detachable sessions, `tmux` command emulation beyond bindings
- **Saving edits, anywhere.** The viewer is permanently read-only (`vim -M` semantics, §8.1); there is no write path to the virtual filesystem
- Pipes, redirection, globbing, environment variables
- Persisting pane layouts, open files, or history across reloads
- In the shell line editor (§6.2): clipboard registers, macros (`q`), marks, visual mode (the §8.1 viewer has visual-mode yank; the command line does not)

Each exclusion is a candidate for a later phase; none blocks the core experience.
