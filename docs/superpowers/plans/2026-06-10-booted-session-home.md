# Booted-Session Home + Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing-page-style home (welcome banner + chip band, `0:shell` tab) with a "booted session" (last-login line + auto-run fastfetch card + inline hint, home = the session itself, not a tab) **and** stand up a thorough test suite (Vitest unit/component/hook tests + a committed Playwright e2e).

**Architecture:** The shell scrollback is *seeded* on mount with boot entries; the identity card is extracted from the `neofetch` command into a shared `components/content/Fetch.tsx`; the bottom strip drops `0:shell` and the `christian@portfolio` status label becomes the home control. Testing has three layers: Vitest + React Testing Library (jsdom) for pure logic and component rendering, a renderHook test for the keyboard hook, and Playwright for full-flow integration.

**Tech Stack:** Next.js (App Router, static export) + TypeScript + Tailwind v4. Tests: Vitest + @testing-library/react + jsdom (unit/component), Playwright (e2e). Verification: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.

---

## File structure

Implementation:
- **Create** `components/content/Fetch.tsx` — identity card (pure, takes `themeId`).
- **Modify** `lib/commands/neofetch.tsx` — delegate to `<Fetch/>`.
- **Create** `components/terminal/lastLogin.ts` — read previous visit + record now.
- **Create** `components/terminal/boot.tsx` — `BootHint` + `bootEntries(themeId, onRun)`.
- **Modify** `components/terminal/windows.ts` — add `SECTIONS`.
- **Modify** `components/terminal/StatusBar.tsx` — host label = home control; tabs = `SECTIONS`.
- **Modify** `components/terminal/useTerminalKeys.ts` — contextual `Escape`.
- **Modify** `components/terminal/Terminal.tsx` — seed boot, drop hero, `goHome`.
- **Modify** `components/terminal/CommandInput.tsx` — export `topCompletion` for testing.
- **Delete** `components/terminal/Greeting.tsx`.

Tests:
- **Create** `vitest.config.ts`, `vitest.setup.ts` — Vitest + RTL + jsdom config.
- **Create** co-located `*.test.ts(x)` files (see tasks).
- **Create** `e2e/verify.mjs` — Playwright acceptance + regression suite.

---

## Task 1: Test infrastructure (Vitest + RTL + jsdom)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/commands/windows-sanity.test.ts` (temporary sanity test, deleted in Task 3)

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "out"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

- [ ] **Step 4: Add scripts to `package.json`** (in the `"scripts"` block):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add a sanity test** at `lib/commands/windows-sanity.test.ts`:

```ts
import { expect, test } from "vitest";

test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 6: Run it**

Run: `npm run test`
Expected: 1 passing test.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/commands/windows-sanity.test.ts
git commit -m "Set up Vitest + React Testing Library test harness"
```

---

## Task 2: `e2e/verify.mjs` Playwright acceptance suite (red)

**Files:**
- Create: `e2e/verify.mjs`

- [ ] **Step 1: Create `e2e/verify.mjs`**

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

  ok("boot shows last login line", (await logText()).toLowerCase().includes("last login:"));
  ok("boot shows fastfetch card", /Host/.test(await logText()) && /Shell/.test(await logText()));
  ok("boot shows inline hint", (await logText()).toLowerCase().includes("try:"));
  ok("no marketing welcome banner", !(await bodyText()).includes("Welcome. I'm Christian Nucifora"));
  ok("no 0:shell tab in strip", !(await bodyText()).includes("0:shell"));
  ok("home control present + active", (await homeActive()) === "true");
  await page.screenshot({ path: "/tmp/home-boot.png" });

  await tab("1:about");
  await page.waitForTimeout(150);
  ok("about is ephemeral (1 entry)", (await count()) === 1, `got ${await count()}`);
  await page.click("#command-input");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok("Esc in a section returns home", (await homeActive()) === "true");
  ok("home still shows the boot card", /Host/.test(await logText()));

  await tab("2:resume");
  await page.waitForTimeout(120);
  await page.click('[data-home="true"]');
  await page.waitForTimeout(120);
  ok("host label click returns home", (await homeActive()) === "true");

  await run("clear");
  ok("clear wipes the boot scrollback", (await count()) === 0, `got ${await count()}`);

  await run("echo one");
  await run("neofetch");
  ok("shell accumulates after clear", (await count()) === 2, `got ${await count()}`);
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

- [ ] **Step 2: Confirm red** (dev server running on :3000 in another shell via `npm run dev`):

Run: `node e2e/verify.mjs`
Expected: FAIL — current home still has the welcome banner / `0:shell` tab, no `last login:` / `data-home`.

- [ ] **Step 3: Commit**

```bash
git add e2e/verify.mjs
git commit -m "Add Playwright e2e suite for the booted-session home (red)"
```

---

## Task 3: `windows.ts` — `SECTIONS` (test-first)

**Files:**
- Create: `components/terminal/windows.test.ts`
- Modify: `components/terminal/windows.ts`
- Delete: `lib/commands/windows-sanity.test.ts`

- [ ] **Step 1: Write `components/terminal/windows.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { WINDOWS, SECTIONS, windowForCommand, windowForLabel, pathForWindow } from "./windows";

describe("windows registry", () => {
  it("SECTIONS excludes the shell (id 0)", () => {
    expect(SECTIONS.every((w) => w.id !== 0)).toBe(true);
    expect(SECTIONS.length).toBe(WINDOWS.length - 1);
  });
  it("pathForWindow maps shell to ~ and sections to ~/label", () => {
    expect(pathForWindow(0)).toBe("~");
    expect(pathForWindow(3)).toBe("~/projects");
    expect(pathForWindow(999)).toBe("~");
  });
  it("windowForCommand maps a section command to its id, else 0", () => {
    expect(windowForCommand("projects")).toBe(3);
    expect(windowForCommand("echo")).toBe(0);
    expect(windowForCommand(null)).toBe(0);
  });
  it("windowForLabel parses a hash label", () => {
    expect(windowForLabel("#projects")?.id).toBe(3);
    expect(windowForLabel("about")?.id).toBe(1);
    expect(windowForLabel("")).toBeUndefined();
    expect(windowForLabel("#nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — `SECTIONS` is undefined**

Run: `npm run test`
Expected: FAIL — `SECTIONS` import is undefined.

- [ ] **Step 3: Add `SECTIONS`** to `components/terminal/windows.ts`, after the `WINDOWS` array:

```ts
/** Just the section windows (ids ≥ 1) — the bottom strip's tabs. Home (0) is
 *  not a tab; it is the status-bar host label. */
export const SECTIONS: readonly TerminalWindow[] = WINDOWS.filter((w) => w.id !== 0);
```

- [ ] **Step 4: Remove the sanity test and run**

```bash
git rm lib/commands/windows-sanity.test.ts
npm run test
```
Expected: PASS (windows tests green).

- [ ] **Step 5: Commit**

```bash
git add components/terminal/windows.ts components/terminal/windows.test.ts
git commit -m "Add SECTIONS view to the window registry, with tests"
```

---

## Task 4: `lastLogin.ts` (test-first)

**Files:**
- Create: `components/terminal/lastLogin.test.ts`
- Create: `components/terminal/lastLogin.ts`

- [ ] **Step 1: Write `components/terminal/lastLogin.test.ts`**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { readAndRecordLastLogin } from "./lastLogin";

describe("readAndRecordLastLogin", () => {
  beforeEach(() => localStorage.clear());

  it("returns a formatted last-login line and records the visit", () => {
    const line = readAndRecordLastLogin();
    expect(line).toMatch(/^last login: /);
    expect(line).toContain("on ttys001");
    expect(localStorage.getItem("portfolio:lastLogin")).toBeTruthy();
  });

  it("uses the previously recorded time on a second visit", () => {
    const past = new Date("2020-01-02T03:04:00").toISOString();
    localStorage.setItem("portfolio:lastLogin", past);
    const line = readAndRecordLastLogin();
    expect(line).toContain("Jan 02");
    // and it advances the stored value to ~now
    expect(localStorage.getItem("portfolio:lastLogin")).not.toBe(past);
  });
});
```

- [ ] **Step 2: Run — module missing**

Run: `npm run test`
Expected: FAIL — cannot import `./lastLogin`.

- [ ] **Step 3: Create `components/terminal/lastLogin.ts`**

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

- [ ] **Step 4: Run green**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/terminal/lastLogin.ts components/terminal/lastLogin.test.ts
git commit -m "Add localStorage-backed last-login helper, with tests"
```

---

## Task 5: `Fetch` component (test-first) + `neofetch` delegate

**Files:**
- Create: `components/content/Fetch.test.tsx`
- Create: `components/content/Fetch.tsx`
- Modify: `lib/commands/neofetch.tsx`

- [ ] **Step 1: Write `components/content/Fetch.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Fetch } from "./Fetch";
import { profile } from "@/data/profile";

describe("Fetch", () => {
  it("renders the identity rows and the supplied theme", () => {
    render(<Fetch themeId="tokyo-night" />);
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Shell")).toBeInTheDocument();
    expect(screen.getByText("tokyo-night")).toBeInTheDocument();
    expect(screen.getByText(profile.email)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — module missing**

Run: `npm run test`
Expected: FAIL — cannot import `./Fetch`.

- [ ] **Step 3: Create `components/content/Fetch.tsx`**

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

- [ ] **Step 4: Replace `lib/commands/neofetch.tsx`** with the delegate:

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

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/content/Fetch.tsx components/content/Fetch.test.tsx lib/commands/neofetch.tsx
git commit -m "Extract fastfetch card into a tested Fetch component"
```

---

## Task 6: `boot.tsx` (test-first)

**Files:**
- Create: `components/terminal/boot.test.tsx`
- Create: `components/terminal/boot.tsx`

- [ ] **Step 1: Write `components/terminal/boot.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BootHint, bootEntries } from "./boot";

describe("BootHint", () => {
  it("renders clickable hint words that run their command", () => {
    const onRun = vi.fn();
    render(<BootHint onRun={onRun} />);
    expect(screen.getByText("try:", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "about" }));
    expect(onRun).toHaveBeenCalledWith("about");
  });
});

describe("bootEntries", () => {
  it("returns three non-null seed outputs", () => {
    const entries = bootEntries("tokyo-night", () => {});
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.output != null)).toBe(true);
    expect(entries.every((e) => e.command === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — module missing**

Run: `npm run test`
Expected: FAIL — cannot import `./boot`.

- [ ] **Step 3: Create `components/terminal/boot.tsx`**

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

- [ ] **Step 4: Run green**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/terminal/boot.tsx components/terminal/boot.test.tsx
git commit -m "Add boot sequence (last login + card + hint), with tests"
```

---

## Task 7: `StatusBar` home control (test-first)

**Files:**
- Create: `components/terminal/StatusBar.test.tsx`
- Modify: `components/terminal/StatusBar.tsx`

- [ ] **Step 1: Write `components/terminal/StatusBar.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

const noop = () => {};

describe("StatusBar", () => {
  it("marks the home control active at the shell and shows no 0:shell tab", () => {
    render(<StatusBar mode="insert" prefix={false} active={0} onSelect={noop} />);
    const home = screen.getByRole("button", { name: /home/i });
    expect(home).toHaveAttribute("data-home", "true");
    expect(home).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("0:shell")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /about/i })).toBeInTheDocument();
  });

  it("highlights a section and calls onSelect(0) when home is clicked", () => {
    const onSelect = vi.fn();
    render(<StatusBar mode="insert" prefix={false} active={3} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /home/i })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: /home/i }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run — fails (old StatusBar requires a `windows` prop, no `data-home`)**

Run: `npm run test`
Expected: FAIL.

- [ ] **Step 3: Replace `components/terminal/StatusBar.tsx`**

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

- [ ] **Step 4: Run tests** (typecheck will fail until Task 9 updates the call site — that's expected):

Run: `npm run test`
Expected: StatusBar tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/terminal/StatusBar.tsx components/terminal/StatusBar.test.tsx
git commit -m "Make the host label the home control; tabs show only sections, with tests"
```

---

## Task 8: Contextual Escape in `useTerminalKeys` (test-first)

**Files:**
- Create: `components/terminal/useTerminalKeys.test.tsx`
- Modify: `components/terminal/useTerminalKeys.ts`

- [ ] **Step 1: Write `components/terminal/useTerminalKeys.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { renderHook } from "@testing-library/react";
import { useTerminalKeys } from "./useTerminalKeys";

function setup(activeWindow: number, onHome = vi.fn()) {
  const inputRef = createRef<HTMLInputElement>();
  const bodyRef = createRef<HTMLDivElement>();
  renderHook(() =>
    useTerminalKeys({
      inputRef,
      bodyRef,
      onClear: vi.fn(),
      onHelp: vi.fn(),
      onCycleTheme: vi.fn(),
      onPalette: vi.fn(),
      onSelectWindow: vi.fn(),
      onNextWindow: vi.fn(),
      onPrevWindow: vi.fn(),
      onWindowSwitcher: vi.fn(),
      onHome,
      getActiveWindow: () => activeWindow,
    }),
  );
  return { onHome };
}

describe("useTerminalKeys Escape", () => {
  it("returns home when a section is active", () => {
    const { onHome } = setup(3);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onHome).toHaveBeenCalled();
  });
  it("does not go home when already in the shell", () => {
    const { onHome } = setup(0);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onHome).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — `onHome`/`getActiveWindow` not accepted**

Run: `npm run test`
Expected: FAIL (TypeScript/behavior — Escape never calls `onHome`).

- [ ] **Step 3: Extend the `Options` interface** in `components/terminal/useTerminalKeys.ts`, after `onWindowSwitcher`:

```ts
  /** Return to the shell/home (used by Escape when a section is open). */
  onHome: () => void;
  /** Read the currently active window id (0 = shell/home). */
  getActiveWindow: () => number;
```

- [ ] **Step 4: Destructure them** in the hook signature:

```ts
  onWindowSwitcher,
  onHome,
  getActiveWindow,
}: Options) {
```

- [ ] **Step 5: Make Escape contextual** — replace:

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

- [ ] **Step 6: Append the new deps** to the keydown effect's dependency array:

```ts
    onWindowSwitcher,
    onHome,
    getActiveWindow,
  ]);
```

- [ ] **Step 7: Run green**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/terminal/useTerminalKeys.ts components/terminal/useTerminalKeys.test.tsx
git commit -m "Esc backs out of a section to home; keeps vim NORMAL in shell, with tests"
```

---

## Task 9: Seed boot in `Terminal`, drop the hero, wire home

**Files:**
- Modify: `components/terminal/Terminal.tsx`
- Delete: `components/terminal/Greeting.tsx`

- [ ] **Step 1: Update imports** — replace:

```tsx
import { Greeting } from "./Greeting";
import { SuggestionChips } from "./SuggestionChips";
```
with:
```tsx
import { bootEntries } from "./boot";
```

- [ ] **Step 2: Add `goHome`** after the `selectWindowRef.current = selectWindow` effect:

```tsx
const goHome = useCallback(() => selectWindowRef.current(0), []);
```

- [ ] **Step 3: Replace the mount effect** to seed the boot:

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
    // client-only seed; cannot run during SSR (localStorage) without a
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

- [ ] **Step 4: Remove the hero from the body** — change:

```tsx
        <Greeting />
        <SuggestionChips onRun={runLine} />
        <OutputLog entries={displayed} />
```
to:
```tsx
        <OutputLog entries={displayed} />
```

- [ ] **Step 5: Update the `<StatusBar/>` call** (drop the removed `windows` prop):

```tsx
      <StatusBar
        mode={mode}
        prefix={prefix}
        active={activeWindow}
        onSelect={selectWindow}
      />
```

- [ ] **Step 6: Pass the new key options** — in the `useTerminalKeys({ … })` call, add:

```tsx
    onHome: () => goHome(),
    getActiveWindow: () => activeWindowRef.current,
```

- [ ] **Step 7: Delete the retired Greeting**

```bash
git rm components/terminal/Greeting.tsx
grep -rn "Greeting" components app lib || echo "no refs"
```
Expected: `no refs`.

- [ ] **Step 8: Full verification**

Run: `npm run test && npm run typecheck && npm run lint && npm run build`
Expected: all pass (static export completes).

- [ ] **Step 9: Commit**

```bash
git add components/terminal/Terminal.tsx
git commit -m "Seed the boot session, drop the welcome/chip hero, retire Greeting"
```

---

## Task 10: Thorough tests for existing pure logic

**Files:**
- Modify: `components/terminal/CommandInput.tsx` (export `topCompletion`)
- Create: `components/terminal/CommandInput.logic.test.ts`
- Create: `components/terminal/historyStore.test.ts`
- Create: `lib/commands/registry.test.tsx`

- [ ] **Step 1: Export `topCompletion`** in `components/terminal/CommandInput.tsx` — change `function topCompletion(` to `export function topCompletion(` (single keyword addition; no other change).

- [ ] **Step 2: Write `components/terminal/CommandInput.logic.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { topCompletion } from "./CommandInput";

describe("topCompletion", () => {
  it("returns the top command completing the token", () => {
    expect(topCompletion("ab")).toBe("about");
  });
  it("returns empty when nothing matches or there is a space", () => {
    expect(topCompletion("zzzz")).toBe("");
    expect(topCompletion("about ")).toBe("");
    expect(topCompletion("")).toBe("");
  });
  it("does not suggest when the token is already a full command", () => {
    expect(topCompletion("about")).toBe("");
  });
});
```

- [ ] **Step 3: Write `components/terminal/historyStore.test.ts`**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { loadHistory, saveHistory, HISTORY_MAX } from "./historyStore";

describe("historyStore", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips saved history", () => {
    saveHistory(["about", "ls", "help"]);
    expect(loadHistory()).toEqual(["about", "ls", "help"]);
  });
  it("returns [] when nothing is stored or it is malformed", () => {
    expect(loadHistory()).toEqual([]);
    localStorage.setItem("portfolio:history", "{not json");
    expect(loadHistory()).toEqual([]);
  });
  it("caps stored history at HISTORY_MAX", () => {
    const many = Array.from({ length: HISTORY_MAX + 25 }, (_, i) => `cmd${i}`);
    saveHistory(many);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(HISTORY_MAX);
    expect(loaded[loaded.length - 1]).toBe(`cmd${HISTORY_MAX + 24}`);
  });
});
```

- [ ] **Step 4: Write `lib/commands/registry.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  commandModules,
  commandMetas,
  resolveCommand,
  completionCandidates,
  runCommandLine,
} from "./index";
import type { SessionActions } from "./index";

function makeActions(): SessionActions {
  return {
    clear: vi.fn(),
    run: vi.fn(),
    history: [],
    getThemeId: () => "tokyo-night",
    setTheme: vi.fn(() => true),
    openHelpPanel: vi.fn(),
    cwd: "~",
  };
}

beforeEach(() => {
  // Commands like homelab/copy/resume touch these; keep them harmless.
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("print", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  });
});

describe("command registry", () => {
  it("resolves every command by its name", () => {
    for (const m of commandModules) {
      expect(resolveCommand(m.meta.name)).toBe(m);
    }
  });
  it("resolves every alias", () => {
    for (const m of commandModules) {
      for (const a of m.meta.aliases) expect(resolveCommand(a)).toBe(m);
    }
  });
  it("exposes all names + aliases as completion candidates", () => {
    const cands = completionCandidates();
    for (const m of commandModules) {
      expect(cands).toContain(m.meta.name);
    }
  });
  it("renders every command without throwing", () => {
    for (const m of commandModules) {
      expect(() => m.run({ ...makeActions(), args: [], raw: m.meta.name, commands: commandMetas })).not.toThrow();
    }
  });
  it("returns a friendly result for an unknown command", () => {
    const { resolved } = runCommandLine("definitelynotacommand", makeActions());
    expect(resolved).toBeNull();
  });
  it("resolves a known command line", () => {
    const { resolved } = runCommandLine("projects", makeActions());
    expect(resolved).toBe("projects");
  });
});
```

- [ ] **Step 5: Run the full unit suite**

Run: `npm run test`
Expected: PASS. If the "renders without throwing" test surfaces a command that needs another global stub, add the stub in `beforeEach` (do not change command behavior).

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add components/terminal/CommandInput.tsx components/terminal/CommandInput.logic.test.ts components/terminal/historyStore.test.ts lib/commands/registry.test.tsx
git commit -m "Add thorough unit tests for registry, history, and completion logic"
```

---

## Task 11: Run the e2e suite green

**Files:** none (verification)

- [ ] **Step 1: Start the dev server** (background shell):

```bash
npm run dev
```
Wait for `Ready`.

- [ ] **Step 2: Run the committed e2e**

Run: `node e2e/verify.mjs`
Expected: PASS — every assertion green (boot card, last login, hint; no welcome banner / `0:shell`; `data-home` active; Esc + host-label + `cd ~` + `Ctrl-b 0` home; `clear` wipes; shell scrollback persists; deep-link; mobile bar; no console errors).

- [ ] **Step 3: Eyeball the screenshot**

Open `/tmp/home-boot.png` and confirm the boot layout reads as a session.

- [ ] **Step 4: Stop the dev server. Final full gate**

```bash
npm run test && npm run typecheck && npm run lint && npm run build
```
Expected: all pass.

- [ ] **Step 5: Commit any final tweaks**

```bash
git commit -am "Booted-session home: e2e + unit suites green" --allow-empty
```

---

## Self-review notes

- **Spec coverage:** last-login (Task 4), card extraction (Task 5), inline hint + seed entries (Task 6), seed-on-mount + drop hero (Task 9), home-not-a-tab + host-label control (Tasks 3, 7), contextual Esc (Task 8), `clear` wipes / reload re-seeds (mount seed, Task 9), retire Greeting (Task 9). Tests: harness (Task 1), e2e (Tasks 2, 11), unit/component/hook across Tasks 3–10. Every spec section maps to a task.
- **Thorough-tests request:** covered by Vitest unit tests (windows, lastLogin, historyStore, topCompletion), component tests (Fetch, BootHint, StatusBar), a hook test (useTerminalKeys Escape), a registry test that renders **every** command, and the Playwright e2e for full flows.
- **Naming consistency:** `Fetch({themeId})`, `bootEntries(themeId,onRun)`, `BootEntry`, `BootHint`, `readAndRecordLastLogin()`, `SECTIONS`, `goHome`, `onHome`, `getActiveWindow`, `data-home`, `topCompletion` — used identically across tasks and tests.
- **Intentional transient failures, gated later:** Task 7 leaves `Terminal.tsx` typecheck red (old `windows` prop) until Task 9; both call out the gate. Unit tests for StatusBar still pass in isolation.
- **Lint:** the single `set-state-in-effect` disable (Task 9) is justified inline (one-time client-only seed; SSR can't run it without a hydration mismatch).
- **Reduced motion / no-JS / hydration:** unchanged from the current build; boot is client-only (mount effect), so no SSR mismatch; `StaticContent` still server-renders.
```
