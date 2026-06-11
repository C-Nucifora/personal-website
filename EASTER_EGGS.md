# EASTER_EGGS.md — Hidden Features Specification

Strictly post-core work. Nothing in this document blocks, gates, or substitutes for real content or navigation. Build order lives at the bottom (§6); do not start any of this before FLOW.md §12.7 phases 4a–4c are complete.

## Global rules

1. **One-state principle holds.** Every egg triggered by a command echoes into scrollback exactly like a normal command. Eggs triggered by keybindings (Konami, `Ctrl+b t`) follow keybinding conventions (no scrollback echo).
2. **Eggs are seasoning, never navigation.** All real content remains reachable without discovering any egg.
3. **Never break authenticity.** Where a real tool has a real behavior (vim's `:help 42`, tmux's clock, `rm`'s `--no-preserve-root` guard), match it before joking on top of it.
4. **Theme-aware.** All ASCII art, animations, and the CRT theme use semantic tokens per THEMES.md.
5. **Interruptible.** Any animation (sl, disintegration, screensaver, cmatrix) exits on any keypress. Honor `prefers-reduced-motion`: skip animations, print a static punchline instead.
6. **Mobile-safe.** Command eggs work via typing on mobile; keybinding eggs simply don't exist there. The screensaver is desktop-only.

## 1. Shell one-liners

Cheap responses wired into the command parser's "unknown/special command" path.

| Trigger | Response |
|---|---|
| `sudo <anything>` (default) | `christian is not in the sudoers file. This incident will be reported.` |
| `sudo make me a sandwich` | `Okay.` |
| `sudo hire christian` | Succeeds — prints contact block (same renderer as `cat ~/contact/contact.md`). The only sudo that works. |
| `rm resume.pdf` (or any content file) | `rm: cannot remove '<file>': Protected by recruiters union` |
| `rm -rf /` | `rm: it is dangerous to operate recursively on '/'` ⏎ `rm: use --no-preserve-root to override this failsafe` (authentic; sets up §4.2) |
| `sl` | Steam locomotive animates right-to-left across the active pane. ~3s, any key skips. |
| `emacs` | `command not found (this is a vim household)` |
| `nano` | `bold of you to ask` |
| `ping` | `pong` (with fake `time=0.042ms` flavor) |
| `make coffee` | `make: *** No rule to make target 'coffee'. Stop.` |
| `whoami` (already specced FLOW §9) | unchanged |
| `man christian` | Formatted man page: NAME, SYNOPSIS, DESCRIPTION, OPTIONS (skills as flags), KNOWN BUGS (`occasionally refactors things that were fine`), SEE ALSO → clickable `contact(1)` |
| `man <other>` | `No manual entry for <x> (try: man christian)` |
| `exit` / `logout` | `there is no escape. (close the tab if you must — we both know you won't)` |
| `cmatrix` | Triggers the §4.3 screensaver immediately |
| `git log` (inside a project dir) | Real-ish abbreviated commit history for that project (data-driven from `data/projects.ts`, optional field) |
| `git blame <file>` | `it was me. it's always me.` |
| `git push --force` | `denied: not on main. not ever.` |

### 1.1 Fake coreutils

Generic terminal commands visitors will reflexively try. Same parser path, same global rules. (`neofetch` is NOT here — it graduated to a core command, FLOW.md §4/§9, since it powers the landing.)

| Trigger | Response |
|---|---|
| `top` / `htop` | Static fake process table, theme-colored: `vim (38 years uptime)`, `side_project_47 (sleeping)`, `impostor_syndrome (zombie)`, `coffee.service (running)`. `q` dismisses, htop gets the bar-chart header. |
| `fortune` | Random line from a curated list: programming aphorisms + a few originals. Data-driven (`data/fortunes.ts`). |
| `cowsay [text]` | The cow says the text; no args → cow says a random fortune. |
| `figlet <text>` | Block-letter ASCII of the text (cap ~20 chars). |
| `uname -a` | `PortfolioOS christian 1.0.0-custom #1 SMP <build date> ts/x86_64 GNU/TypeScript` |
| `uptime` | Real time since page load + `load average: 0.00, 0.00, 0.00 (it's a static site)` |
| `df -h` | Fake mount table: `/dev/coffee 100G 98G 2G 98% /home/christian` etc. |
| `free -h` | Fake memory table; swap row reads `0B (we don't do that here)` |
| `which <cmd>` | Known commands → `/usr/bin/<cmd>`; unknown → `<cmd> not found`; `which christian` → `/usr/bin/hired (hopefully)` |
| `touch <f>` / `mkdir <d>` | `read-only file system` (authentic errno phrasing) |
| `sudo touch` / `sudo mkdir` | standard sudoers refusal (§1) |

## 2. Vim-authentic (read-only viewer, §8.1 of FLOW.md)

These are real vim easter eggs; vim users will probe for them. Match the originals.

| Trigger | Response |
|---|---|
| `:help 42` | Vim's actual answer-to-everything help text (paraphrase faithfully, cite `usr_42.txt` style header) |
| `:help holy-grail` | `:exusers` reference, per real vim |
| `:help UserGettingBored` | Real vim help joke; reproduce the spirit |
| `:smile` | ASCII smiley, as in vim 8+ |
| `:q` at the **shell** prompt (not viewer) | `you're not in vim. yet.` |
| `:wq` / `:x` at shell prompt | `nothing to write. nothing to quit. take a breath.` |
| `vi <file>` | Opens the viewer normally; statusline reads `vi improved. you're welcome.` |

## 3. Tmux-authentic & keybindings

| Trigger | Response |
|---|---|
| `Ctrl+b t` | Faithful tmux clock: huge block digits, theme accent color, fills active pane, any key exits. Played straight — no joke copy. |
| Konami code (`↑↑↓↓←→←→ b a`), any mode, desktop only | Status-bar flash `theme unlocked: crt`, switch to CRT theme (§5). Persist unlock in localStorage; afterwards `theme` lists `crt (unlocked)`. |

## 4. Hidden filesystem & state

### 4.1 Dotfiles (revealed by `ls -a`)

```
~/
├── .bashrc          ← joke aliases: alias work='echo no'; alias vim=vim  # leave it alone
├── .plan            ← finger-protocol homage: short, sincere note on what Christian is building right now (real content, updated occasionally)
├── .vimrc           ← a plausible minimal vimrc; one comment: " yes, relative numbers. obviously.
└── .secrets/
    └── nothing_to_see_here.txt   ← cat: "told you."
```

`cat /etc/passwd` → fake user table including `impostor_syndrome:x:1001:1001:visits occasionally:/home/christian:/bin/zsh`. Any other absolute path outside `~` → authentic `no such file or directory`.

`history` is pre-seeded with entry `1  vim resume.md`, timestamped years back. User commands append from entry 2.

### 4.2 `rm -rf / --no-preserve-root` — the disintegration

The showpiece. Sequence:

1. One beat of silence (~400ms). No output.
2. UI disintegrates: tabs detach and fall, scrollback text crumbles character-by-character (CSS transforms + stagger; total ≤ 2.5s).
3. Black screen, ~800ms.
4. BIOS-style boot sequence types on: fake POST lines, `Loading portfolio kernel… ok`, memory check using real bundle size, ending with the normal MOTD.
5. State fully restored — same window, cwd, history, scrollback (minus nothing; the rm is appended to history like any command). The egg destroys nothing.

`prefers-reduced-motion`: skip steps 1–4, print `Nice try. Filesystem restored from backup.` Mobile: same reduced path.

### 4.3 Screensaver

After 3 minutes idle (no key, click, or scroll; desktop only), fade to ASCII pipes or matrix rain (pick one implementation; `cmatrix` command triggers it on demand). Any input dismisses and returns exactly to prior state. Suspend entirely while an editor pane has unfinished search input or animation is running.

## 5. CRT theme (Konami unlock)

A full theme per THEMES.md token architecture, not a CSS hack on top of others: scanline overlay, slight barrel distortion (CSS only, subtle), phosphor green-on-black palette, faint flicker (disabled under `prefers-reduced-motion`, which reduces CRT to palette-only). Listed in `theme` output only after unlock. Ships in Phase 6 with the other extra themes; the Konami listener can ship earlier with a `coming soon` status-bar response until the theme lands.

## 6. Build order & priorities

| Tier | Items | When |
|---|---|---|
| Mandatory (audience will actively probe) | §2 vim `:help` eggs, `:smile`, shell-prompt `:q`; §3 tmux clock | with phase 4c |
| High value, cheap | §1 one-liners, §4.1 dotfiles, history seed | any time post-core |
| Showpieces | §4.2 disintegration, §4.3 screensaver | post-core, before launch |
| Theme-coupled | §5 CRT + Konami | Phase 6 |

Testing note for Claude Code: every §1 trigger gets a snapshot test of its scrollback output; §4.2 gets an explicit state-restoration test (run, verify deep-equal of pre/post AppState minus history append).
