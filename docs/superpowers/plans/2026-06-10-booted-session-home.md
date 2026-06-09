# Booted-Session Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing-page-style home (welcome banner + chip band, `0:shell` tab) with a "booted session": a `last login` line, an auto-run fastfetch identity card, and an inline hint — with home as the session itself (controlled by the left status-bar label), not a tab.

**Architecture:** The shell's persistent scrollback is *seeded* on mount with boot entries (last-login + `<Fetch/>` card + `<BootHint/>`). The identity card is extracted from the `neofetch` command into a shared `components/content/Fetch.tsx`. The bottom strip drops `0:shell` and renders only sections; the `christian@portfolio` label becomes the home control (click / `Esc` in a section / `cd ~` / `Ctrl-b 0`). `clear` wipes the seeded scrollback; reload re-seeds.

**Tech Stack:** Next.js (App Router, static export) + TypeScript + Tailwind v4. Verification: `npm run typecheck`, `npm run lint`, `npm run build`, and a committed Playwright e2e script (`e2e/verify.mjs`).

---

## File structure

- **Create** `components/content/Fetch.tsx` — the identity card (logo + info rows + ANSI blocks), pure, takes `themeId`.
- **Modify** `lib/commands/neofetch.tsx` — delegate to `<Fetch/>`.
- **Create** `components/terminal/lastLogin.ts` — read previous visit + record now, returns the `last login:` line text.
- **Create** `components/terminal/boot.tsx` — `BootHint` component + `bootEntries(themeId, onRun)` returning the seed entries.
- **Modify** `components/terminal/windows.ts` — add `SECTIONS` (ids ≥ 1) for the tab strip.
- **Modify** `components/terminal/StatusBar.tsx` — host label becomes the home button; tabs render only `SECTIONS`.
- **Modify** `components/terminal/useTerminalKeys.ts` — contextual `Escape` (home when in a section).
- **Modify** `components/terminal/Terminal.tsx` — seed boot on mount, drop `Greeting`/hero chips, add `goHome`, wire the new key options.
- **Delete** `components/terminal/Greeting.tsx`.
- **Create** `e2e/verify.mjs` — committed Playwright acceptance + regression suite.

---

## Task 1: Commit the e2e acceptance suite (red)

**Files:**
- Create: `e2e/verify.mjs`

- [ ] **Step 1: Write the acceptance + regression e2e**

Create `e2e/verify.mjs`:

```js
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const results = [];
const ok = (n, c, extra = "") => results.push({ n, pass: !!c, extra });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  const count = () => page.$$eval('[role="log"] > div', (e) => e.length).catch(() => -1);
  const logText = () => page.$eval('[role="log"]', (e) => e.innerText).catch(() => "");
  const bodyText = () => page.innerText("body").catch(() => "");
  const activeWin = () =>
    page.$eval('nav[aria-label="Windows"] [aria-current="true"]', (e) => e.innerText).catch(() => "(none)");
  const homeActive = () =>
    page.$eval('[data-home="true"]', (e) => e.getAttribute("aria-current")).catch(() => null);
  const run = async (cmd) => {
    await page.click("#command-input");
    await page.fill("#command-input", cmd);
    await page.press("#command-input", "Enter");
    await page.waitForTimeout(140);
  };
  const tab = (label) => page.click(`nav[aria-label="Windows"] >> text=${label}`);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]', { timeout: 5000 });
  await page.waitForTimeout(400);

  // Booted-session home
  ok("boot shows last login line", (await logText()).toLowerCase().includes("last login:"));
  ok("boot shows fastfetch card", /Host/.test(await logText()) && /Shell/.test(await logText()));
  ok("boot shows inline hint", (await logText()).toLowerCase().includes("try:"));
  ok("no marketing welcome banner", !(await bodyText()).includes("Welcome. I'm Christian Nucifora"));
  ok("no 0:shell tab in strip", !(await bodyText()).includes("0:shell"));
  ok("home control present + active", (await homeActive()) === "true");
  await page.screenshot({ path: "/tmp/home-boot.png" });

  // Esc backs out of a section to home
  await tab("1:about");
  await page.waitForTimeout(150);
  ok("about is ephemeral (1 entry)", (await count()) === 1, `got ${await count()}`);
  await page.click("#command-input");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok("Esc in a section returns home", (await homeActive()) === "true");
  ok("home still shows the boot card", /Host/.test(await logText()));

  // Clicking the host label returns home
  await tab("2:resume");
  await page.waitForTimeout(120);
  await page.click('[data-home="true"]');
  await page.waitForTimeout(120);
  ok("host label click returns home", (await homeActive()) === "true");

  // clear wipes the card
  await run("clear");
  ok("clear wipes the boot scrollback", (await count()) === 0, `got ${await count()}`);

  // Regression: persistent shell, sections, neofetch, deep-link, tmux, ghost, mobile
  await run("echo one");
  await run("neofetch");
  const shellN = await count();
  ok("shell accumulates after clear", shellN === 2, `got ${shellN}`);
  await tab("1:about");
  await page.waitForTimeout(120);
  await page.click('[data-home="true"]');
  await page.waitForTimeout(120);
  ok("shell scrollback preserved across a section", (await count()) === 2, `got ${await count()}`);

  await run("cd projects");
  ok("cd projects active = projects", (await activeWin()).includes("projects"));
  await run("cd ~");
  ok("cd ~ returns home", (await homeActive()) === "true");

  await page.click("#command-input");
  await page.keyboard.press("Control+b");
  await page.keyboard.press("0");
  await page.waitForTimeout(140);
  ok("Ctrl-b 0 goes home", (await homeActive()) === "true");

  await page.goto(BASE + "/#contact", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(300);
  ok("deep-link /#contact opens contact", (await activeWin()).includes("contact"));

  await browser.close();

  const mob = await chromium.launch();
  const ctx = await mob.newContext({ ...devices["Pixel 5"] });
  const mp = await ctx.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForSelector('html[data-js-ready="true"]');
  await mp.waitForTimeout(300);
  ok("mobile tap-bar visible", await mp.isVisible(".mobile-bar"));
  await mob.close();

  ok("no console/page errors", errors.length === 0, errors.slice(0, 4).join(" | "));

  let fails = 0;
  console.log("\n=== RESULTS ===");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}${r.extra ? "  [" + r.extra + "]" : ""}`);
    if (!r.pass) fails++;
  }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error("SCRIPT ERROR", e); process.exit(2); });
```

- [ ] **Step 2: Confirm it fails against the current build**

Run (dev server must be running on :3000 — `npm run dev` in another shell):
```bash
node e2e/verify.mjs
```
Expected: FAIL — current home shows the welcome banner and `0:shell` tab, no `last login:`/`try:`/`data-home`. Several assertions fail.

- [ ] **Step 3: Commit**

```bash
git add e2e/verify.mjs
git commit -m "Add Playwright e2e suite for the booted-session home"
```

---

## Task 2: Extract the fastfetch card into `Fetch`

**Files:**
- Create: `components/content/Fetch.tsx`
- Modify: `lib/commands/neofetch.tsx`

- [ ] **Step 1: Create `components/content/Fetch.tsx`**

```tsx
import { profile } from "@/data/profile";
import { uses } from "@/data/uses";

const clean = (s: string) => s.replace(/^TODO\s*/, "").trim();
const real = (items: string[]) => items.map(clean).filter((s) => s && s !== "TODO");

const LOGO = String.raw`
   _____ _   _
  / ____| \ | |
 | |    |  \| |
 | |___ | |\  |
  \_____|_| \_|
`;

const ANSI = [
  "bg-ansi-red",
  "bg-ansi-yellow",
  "bg-ansi-green",
  "bg-ansi-cyan",
  "bg-ansi-blue",
  "bg-ansi-magenta",
] as const;

function uptime(): string {
  const secs = typeof performance !== "undefined" ? Math.round(performance.now() / 1000) : 0;
  if (secs < 60) return `${Math.max(1, secs)} sec`;
  return `${Math.round(secs / 60)} min`;
}

/** The neofetch-style identity card, built from the site data. Pure. */
export function Fetch({ themeId }: { themeId: string }) {
  const editor = real(uses.find((u) => u.group === "Editor & terminal")?.items ?? []).slice(0, 2);
  const stack = real(uses.find((u) => u.group === "Languages")?.items ?? []).slice(0, 3);

  const rows: [string, string][] = [
    ["Host", profile.name],
    ["Role", clean(profile.role)],
    ["Location", clean(profile.location)],
    ["Shell", "zsh"],
    ...(editor.length ? ([["Editor", editor.join(", ")]] as [string, string][]) : []),
    ["Theme", themeId],
    ...(stack.length ? ([["Stack", stack.join(", ")]] as [string, string][]) : []),
    ["Uptime", uptime()],
    ["Contact", profile.email],
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      <pre className="font-mono text-xs leading-tight text-accent" aria-hidden="true">
        {LOGO}
      </pre>
      <div className="space-y-1.5 font-mono text-sm">
        <p>
          <span className="text-ansi-green">visitor</span>
          <span className="text-muted">@</span>
          <span className="text-ansi-magenta">{profile.username}</span>
        </p>
        <p className="text-muted">-----------------</p>
        {rows.map(([label, val]) => (
          <p key={label}>
            <span className="text-accent">{label}</span>
            <span className="text-muted">: </span>
            <span className="text-fg">
              {label === "Contact" ? <a href={`mailto:${val}`}>{val}</a> : val}
            </span>
          </p>
        ))}
        <div className="flex gap-1 pt-2" aria-hidden="true">
          {ANSI.map((c) => (
            <span key={c} className={`h-3.5 w-3.5 rounded-sm border border-border ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the body of `lib/commands/neofetch.tsx`**

The whole file becomes:

```tsx
import type { CommandModule } from "./types";
import { Fetch } from "@/components/content/Fetch";

/** neofetch-style identity card — who I am, at a glance. */
export const neofetch: CommandModule = {
  meta: {
    name: "neofetch",
    aliases: ["fetch"],
    description: "A system-info card — who I am, at a glance.",
    usage: "neofetch",
    group: "Get to know me",
  },
  run: (ctx) => <Fetch themeId={ctx.getThemeId()} />,
};
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass (no output errors).

- [ ] **Step 4: Commit**

```bash
git add components/content/Fetch.tsx lib/commands/neofetch.tsx
git commit -m "Extract fastfetch card into a shared Fetch component"
```

---

## Task 3: Add `SECTIONS` to the window registry

**Files:**
- Modify: `components/terminal/windows.ts`

- [ ] **Step 1: Append a `SECTIONS` export** after the `WINDOWS` array in `components/terminal/windows.ts`:

```ts
/** Just the section windows (ids ≥ 1) — the bottom strip's tabs. Home (0) is
 *  not a tab; it is the status-bar host label. */
export const SECTIONS: readonly TerminalWindow[] = WINDOWS.filter((w) => w.id !== 0);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/terminal/windows.ts
git commit -m "Add SECTIONS view (non-shell windows) to the registry"
```

---

## Task 4: Make the host label the home control in `StatusBar`

**Files:**
- Modify: `components/terminal/StatusBar.tsx`

- [ ] **Step 1: Replace the file** `components/terminal/StatusBar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { VimMode } from "./useTerminalKeys";
import type { TerminalWindow } from "./windows";
import { SECTIONS } from "./windows";
import { profile } from "@/data/profile";

interface StatusBarProps {
  mode: VimMode;
  prefix: boolean;
  active: number;
  onSelect: (id: number) => void;
}

/**
 * tmux-style status line. The left host label is the home control (window 0);
 * the section tabs sit to its right; mode + clock on the far right.
 */
export function StatusBar({ mode, prefix, active, onSelect }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const home = active === 0;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          data-home="true"
          onClick={() => onSelect(0)}
          aria-current={home ? "true" : undefined}
          aria-label="Home (shell session)"
          className={[
            "shrink-0 rounded-sm px-1.5 py-0.5 font-semibold transition-colors focus-visible:outline-2",
            home ? "bg-accent text-bg" : "bg-selection text-accent hover:text-fg",
          ].join(" ")}
        >
          {profile.username}@portfolio
        </button>
        <nav
          aria-label="Windows"
          className="flex items-center gap-1 overflow-x-auto whitespace-nowrap"
        >
          {SECTIONS.map((w: TerminalWindow) => {
            const on = w.id === active;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelect(w.id)}
                aria-current={on ? "true" : undefined}
                className={[
                  "shrink-0 rounded-sm px-1.5 py-0.5 transition-colors focus-visible:outline-2",
                  on ? "bg-selection font-semibold text-accent" : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {w.id}:{w.label}
                {on ? "*" : ""}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
        {prefix && (
          <span className="rounded-sm bg-warning px-1.5 py-0.5 font-semibold text-bg">^b</span>
        )}
        <span className={mode === "normal" ? "text-warning" : "text-success"}>
          -- {mode.toUpperCase()} --
        </span>
        <span className="text-muted">{time}</span>
      </div>
    </div>
  );
}
```

Note: the `windows` prop is removed (StatusBar now imports `SECTIONS` directly). Task 7 updates the `<StatusBar/>` call site to drop the `windows` prop.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: FAIL — `Terminal.tsx` still passes a `windows` prop. That is fixed in Task 7; continue.

- [ ] **Step 3: Commit**

```bash
git add components/terminal/StatusBar.tsx
git commit -m "Make the host label the home control; tabs show only sections"
```

---

## Task 5: `last login` localStorage helper

**Files:**
- Create: `components/terminal/lastLogin.ts`

- [ ] **Step 1: Create `components/terminal/lastLogin.ts`**

```ts
/**
 * A real "last login" line: read the previous visit from localStorage, record
 * the current visit, and return the formatted line. Call once per page load.
 */
const KEY = "portfolio:lastLogin";

function fmt(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function readAndRecordLastLogin(): string {
  let prev: string | null = null;
  try {
    prev = localStorage.getItem(KEY);
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    /* storage unavailable (private mode) — fall back to now */
  }
  const when = prev ? new Date(prev) : new Date();
  return `last login: ${fmt(when)} on ttys001`;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/terminal/lastLogin.ts
git commit -m "Add localStorage-backed last-login line helper"
```

---

## Task 6: Boot entries + inline hint

**Files:**
- Create: `components/terminal/boot.tsx`

- [ ] **Step 1: Create `components/terminal/boot.tsx`**

```tsx
import type { ReactNode } from "react";
import { Fetch } from "@/components/content/Fetch";
import { readAndRecordLastLogin } from "./lastLogin";

export interface BootEntry {
  command: string | null;
  output: ReactNode;
}

const HINT_ITEMS = ["about", "projects", "resume", "help"];

/** The inline "try: a · b · c" hint; each word runs its command. */
export function BootHint({ onRun }: { onRun: (cmd: string) => void }) {
  return (
    <p className="font-mono text-sm text-muted">
      try:{" "}
      {HINT_ITEMS.map((c, i) => (
        <span key={c}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <button
            type="button"
            onClick={() => onRun(c)}
            className="text-accent transition-colors hover:underline focus-visible:outline-2"
          >
            {c}
          </button>
        </span>
      ))}
    </p>
  );
}

/** The boot sequence seeded into the shell scrollback on page load. */
export function bootEntries(themeId: string, onRun: (cmd: string) => void): BootEntry[] {
  return [
    {
      command: null,
      output: <p className="font-mono text-sm text-muted">{readAndRecordLastLogin()}</p>,
    },
    { command: null, output: <Fetch themeId={themeId} /> },
    { command: null, output: <BootHint onRun={onRun} /> },
  ];
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add components/terminal/boot.tsx
git commit -m "Add boot sequence (last login + fastfetch card + inline hint)"
```

---

## Task 7: Seed boot in `Terminal`, drop the hero, add `goHome`

**Files:**
- Modify: `components/terminal/Terminal.tsx`

- [ ] **Step 1: Update imports** — replace the `Greeting`/`SuggestionChips` imports and add the boot import. In `components/terminal/Terminal.tsx`, change:

```tsx
import { Greeting } from "./Greeting";
import { SuggestionChips } from "./SuggestionChips";
```
to:
```tsx
import { bootEntries } from "./boot";
```

- [ ] **Step 2: Add `goHome`** right after the `stepWindow` definition (after the `selectWindowRef.current = selectWindow` effect):

```tsx
const goHome = useCallback(() => selectWindowRef.current(0), []);
```

- [ ] **Step 3: Seed the boot in the mount effect.** Replace the existing mount effect:

```tsx
  // Signal a successful mount: CSS then hides the static fallback and reveals
  // the interactive terminal. If hydration fails this never runs, so the
  // readable server-rendered content stays on screen. Also honour a deep link.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");

    const w = windowForLabel(window.location.hash);
    if (w && w.command) {
      runLineRef.current(w.command);
    }

    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);
```
with:
```tsx
  // Seed the shell with the boot sequence (once per page load), reveal the
  // interactive terminal, and honour a deep link. If hydration fails this never
  // runs, so the readable server-rendered content stays on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");

    const seed = bootEntries(themeIdRef.current, (cmd) => runLineRef.current(cmd)).map((e) => ({
      id: idRef.current++,
      command: e.command,
      output: e.output,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time
    // client-only seed; cannot run on the server (localStorage) without a
    // hydration mismatch, and is not a cascading update.
    setShellEntries(seed);

    const w = windowForLabel(window.location.hash);
    if (w && w.command) {
      runLineRef.current(w.command);
    }

    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);
```

- [ ] **Step 4: Remove the hero from the body.** Change the body block:

```tsx
      <div
        ref={bodyRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <Greeting />
        <SuggestionChips onRun={runLine} />
        <OutputLog entries={displayed} />
```
to:
```tsx
      <div
        ref={bodyRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <OutputLog entries={displayed} />
```

- [ ] **Step 5: Update the `<StatusBar/>` call** (drop the now-removed `windows` prop):

```tsx
      <StatusBar
        mode={mode}
        prefix={prefix}
        active={activeWindow}
        onSelect={selectWindow}
      />
```

- [ ] **Step 6: Pass `goHome` + active getter to `useTerminalKeys`.** In the `useTerminalKeys({ … })` call, add two options:

```tsx
    onHome: () => goHome(),
    getActiveWindow: () => activeWindowRef.current,
```
(These are consumed in Task 8. `goHome` is defined later in the component, so it is referenced through the stable callback; if the linter flags use-before-define, move the `goHome` definition above the `useTerminalKeys` call — it only depends on `selectWindowRef`.)

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: FAIL — `useTerminalKeys` does not yet accept `onHome`/`getActiveWindow`. Fixed in Task 8; continue.

- [ ] **Step 8: Commit**

```bash
git add components/terminal/Terminal.tsx
git commit -m "Seed the boot session and drop the welcome/chip hero from home"
```

---

## Task 8: Contextual Escape in `useTerminalKeys`

**Files:**
- Modify: `components/terminal/useTerminalKeys.ts`

- [ ] **Step 1: Extend the `Options` interface** — add after `onWindowSwitcher`:

```ts
  /** Return to the shell/home (used by Escape when a section is open). */
  onHome: () => void;
  /** Read the currently active window id (0 = shell/home). */
  getActiveWindow: () => number;
```

- [ ] **Step 2: Destructure the new options** in `useTerminalKeys({ … })`:

```ts
  onWindowSwitcher,
  onHome,
  getActiveWindow,
}: Options) {
```

- [ ] **Step 3: Make Escape contextual.** Replace:

```ts
      // 3) Escape always drops to NORMAL mode.
      if (e.key === "Escape") {
        blurInput();
        return;
      }
```
with:
```ts
      // 3) Escape: back out of a section to home; in the shell, drop to NORMAL.
      if (e.key === "Escape") {
        if (getActiveWindow() !== 0) {
          onHome();
        } else {
          blurInput();
        }
        return;
      }
```

- [ ] **Step 4: Add the new deps** to the keydown effect's dependency array (append to the existing list):

```ts
    onWindowSwitcher,
    onHome,
    getActiveWindow,
  ]);
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all pass (static export completes).

- [ ] **Step 6: Commit**

```bash
git add components/terminal/useTerminalKeys.ts
git commit -m "Esc backs out of a section to home; keeps vim NORMAL in the shell"
```

---

## Task 9: Delete the retired `Greeting`

**Files:**
- Delete: `components/terminal/Greeting.tsx`

- [ ] **Step 1: Confirm nothing imports it**

Run: `grep -rn "Greeting" components app lib || echo "no refs"`
Expected: `no refs` (Task 7 removed the import).

- [ ] **Step 2: Delete + verify the build**

```bash
git rm components/terminal/Greeting.tsx
npm run typecheck && npm run lint && npm run build
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove the retired Greeting (replaced by the boot)"
```

---

## Task 10: Run the e2e suite green

**Files:** none (verification)

- [ ] **Step 1: Start the dev server** (background shell):

```bash
npm run dev
```
Wait for `Ready`.

- [ ] **Step 2: Run the committed e2e**

Run: `node e2e/verify.mjs`
Expected: PASS — every assertion green, including:
- boot shows `last login:`, the fastfetch card, and the `try:` hint
- no welcome banner, no `0:shell` tab; `data-home` present and active
- Esc in a section and host-label click both return home
- `clear` wipes the card; shell scrollback persists across a section visit
- `cd ~` / `Ctrl-b 0` go home; deep-link `/#contact` works; mobile bar visible
- no console/page errors

- [ ] **Step 3: Capture a screenshot for review**

`/tmp/home-boot.png` is written by the suite; open it to eyeball the boot layout.

- [ ] **Step 4: Stop the dev server and commit any test tweaks**

```bash
git add e2e/verify.mjs
git commit -m "Tidy e2e assertions for the booted-session home" --allow-empty
```

---

## Self-review notes

- **Spec coverage:** last-login (Task 5), fastfetch card extraction (Task 2), inline hint (Task 6), seed-on-mount + drop hero (Task 7), home-not-a-tab + host-label control (Tasks 3–4), contextual Esc (Task 8), `clear` wipes / reload re-seeds (seed in mount effect, Task 7), retire Greeting (Task 9), tests (Tasks 1 & 10). All spec sections map to a task.
- **Naming consistency:** `Fetch({themeId})`, `bootEntries(themeId, onRun)`, `BootEntry`, `BootHint`, `readAndRecordLastLogin()`, `SECTIONS`, `goHome`, `onHome`, `getActiveWindow`, `data-home` — used identically across tasks.
- **Known transient failures are intentional and called out:** Task 4 step 2 and Task 7 step 7 fail typecheck because the matching change lands in a later task; the final build (Task 8) and e2e (Task 10) are the gates.
- **Lint:** the one `set-state-in-effect` disable (Task 7) is justified inline (client-only one-time seed that cannot run during SSR without a hydration mismatch).
