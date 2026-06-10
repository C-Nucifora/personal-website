/**
 * The ~/help window contents (FLOW.md §2). Three depths of the same help
 * system: a novice guide, the shell command reference, and the keybinding
 * reference. The `help` command prints the quick inline cheatsheet and links
 * here for the full story.
 */

export const guideMd = `# Guide

Welcome. This site is a terminal — but you never have to type anything.

## The short version

- **Click a tab** at the top (\`1:about\` … \`5:help\`) to switch sections.
- **Click anything the terminal prints.** Directory names open them, file
  names show their contents, links are real links.
- Watch the prompt when you click: the site types the real command it runs.
  That's all a terminal is — text in, text out.

## The slightly longer version

This site is laid out like a filesystem. Each tab is a directory in a home
folder:

\`\`\`
~/
├── about/      who I am, what I use
├── projects/   things I've built — including their source code
├── resume/     the resume, plus per-role detail
├── contact/    how to reach me
└── help/       you are here
\`\`\`

Moving around is one command: \`cd\` (change directory). Reading a file is
another: \`cat\`. Listing what's here: \`ls\`. Every click you make runs one of
those for you.

## If you want to type

Click the prompt (the line ending in \`$\`) and try:

- \`ls\` — list what's in the current directory
- \`cd projects\` — go to the projects directory
- \`cat about.md\` — print a file
- \`help\` — the quick cheatsheet, any time

Typos are fine. The terminal will suggest what you probably meant.

## For terminal people

The whole site is one tmux session: \`Ctrl+b\` is the prefix (\`Ctrl+b 2\`
jumps to projects, \`Ctrl+b [\` scrolls, \`Ctrl+b %\` splits panes in
projects). The command line speaks vi — press \`Esc\` and edit the line with
operators, motions and text objects. Source files open in a read-only vim.
See \`cat keybindings.md\` for the full reference.
`;

export const commandsMd = `# Commands

Everything the shell understands. Every one of these also has a clickable
equivalent somewhere in the interface.

## Moving around

| Command | What it does |
|---|---|
| \`ls [path]\` | list a directory (\`-a\` shows hidden files) |
| \`cd [path]\` | change directory; no argument returns home, \`cd -\` goes back |
| \`pwd\` | print the current directory |
| \`tree [path]\` | directory tree, three levels deep |

## Reading things

| Command | What it does |
|---|---|
| \`cat <file>\` | print a file (markdown is rendered, code is highlighted) |
| \`vim <file>\` | open a file in a read-only vim (alias: \`view\`) |

## The session

| Command | What it does |
|---|---|
| \`clear\` | clear the screen |
| \`history\` | numbered command history; \`!{n}\` re-runs entry n |
| \`help\` | quick cheatsheet |
| \`neofetch\` | reprint the landing banner |
| \`whoami\` | one line about me |
| \`theme [name]\` | switch color theme; no argument lists them |
| \`open <url>\` | open a link in a new tab (asks first) |
| \`echo <text>\` | print text |
| \`date\` | print the date |

Unknown commands fail politely and suggest what you probably meant.
`;

export const keybindingsMd = `# Keybindings

Tiered: you need none of these, the first tier is plenty, and the rest is
there because it's home.

## Tier 1 — everyday

| Keys | Action |
|---|---|
| \`Enter\` | run the command |
| \`↑\` / \`↓\` | walk command history |
| \`Tab\` | autocomplete commands and paths |
| \`Ctrl+c\` | cancel the current line |
| \`Ctrl+l\` | clear the screen |

## Tier 2 — vi line editing

\`Esc\` puts the command line in NORMAL mode (the status bar shows which
mode you're in). The full vi grammar works on the line:
\`[count][operator][count][motion]\`.

| Keys | Action |
|---|---|
| \`h l w b e 0 ^ $ f F t T\` | motions |
| \`d c y\` (+ \`dd cc yy\`) | delete / change / yank |
| \`iw aw i" i( i{\` … | text objects |
| \`x r ~ s D C p P u .\` | the usual suspects |
| \`i a I A\` | back to INSERT |
| \`j k\` | walk history |

## Tier 3 — tmux

\`Ctrl+b\`, then:

| Keys | Action |
|---|---|
| \`1\`–\`5\` | jump to window |
| \`n\` / \`p\` | next / previous window |
| \`w\` | window picker |
| \`[\` | COPY mode — scroll with \`j k Ctrl+d Ctrl+u gg G\`, leave with \`q\` |
| \`%\` / \`"\` | split pane (projects window) |
| \`o\`, \`h j k l\` | move between panes |
| \`z\` | zoom pane |
| \`x\` | close pane |
| \`?\` | print this cheatsheet |

## Tier 4 — the editor

\`vim <file>\` opens a real (read-only) vim: motions, counts, \`/\` search,
\`v\`/\`V\` + \`y\` yanks to your clipboard, \`:q\` closes. Editing? \`E21:
Cannot make changes, 'modifiable' is off\`.
`;
