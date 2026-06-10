# Terminal Single-Log Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the terminal's split-brain window/section model with one continuous scrollback where every command appends, and collapse navigation to the prompt plus a single persistent nav row.

**Architecture:** The shell becomes a single `entries` log. `runLine` always appends a command + output and scrolls the new command line to the top of the viewport; there is no window/section state. Navigation is the prompt and one `SectionNav` row whose buttons run commands. The status bar becomes decorative. The tmux/vim/palette layer is deleted.

**Tech Stack:** Next.js (App Router) + TypeScript, React 19, Tailwind v4, Vitest (jsdom + Testing Library), Playwright e2e (`e2e/verify.mjs`).

---

## Background for the implementer

Read `docs/superpowers/specs/2026-06-10-terminal-single-log-design.md` first — it holds the approved decisions. Key facts about the current code you are changing:

- **`components/terminal/Terminal.tsx`** is the only integration point. It holds two logs (`shellEntries` persistent + `sectionEntry` ephemeral), an `activeWindow`, hash-as-window routing, and wiring for a tmux/vim key layer, a window switcher, and a command palette. All of that goes.
- **All window/section symbols are referenced only by `Terminal.tsx`** (plus the modules' own tests). Nothing in `lib/` or `app/` imports them. Verified by grep.
- **Command files do not change.** `cd <section>` already calls `ctx.run(section)` (which appends in the new model); `cd ~`/`cd ..` return `null` (a harmless no-op echo); `pwd` reads `ctx.cwd`, which we pin to `"~"`. The registry, data, themes, and content components are untouched.
- **`LogEntry`** (`components/terminal/types.ts`) is `{ id: number; command: string | null; output: ReactNode }` — reused as-is.
- **`bootEntries(themeId, onRun)`** returns 3 entries (last-login line, fastfetch card, "try:" hint), all with `command: null`. The "try:" hint already provides clickable suggestion chips. `boot.tsx` and `boot.test.tsx` are unchanged.
- **Reduced motion** is handled globally in `app/globals.css` (`@media (prefers-reduced-motion: reduce)` forces `scroll-behavior: auto` and kills animations). Use plain `scrollIntoView`/instant scrolls — do not add `behavior: "smooth"`.

### Files created/modified/deleted

- **Create:** `components/terminal/sections.ts`, `components/terminal/sections.test.ts`, `components/terminal/SectionNav.tsx`, `components/terminal/SectionNav.test.tsx`
- **Rewrite:** `components/terminal/Terminal.tsx`, `components/terminal/useTerminalKeys.ts`, `components/terminal/StatusBar.tsx`, `components/terminal/useTerminalKeys.test.tsx`, `components/terminal/StatusBar.test.tsx`, `e2e/verify.mjs`
- **Modify:** `components/terminal/OutputLog.tsx` (add `data-entry-id`), `app/globals.css` (remove `.mobile-bar` rules)
- **Delete:** `components/terminal/windows.ts`, `components/terminal/windows.test.ts`, `components/terminal/WindowSwitcher.tsx`, `components/terminal/MobileBar.tsx`, `components/ui/CommandPalette.tsx`

---

## Task 1: Section registry (`sections.ts`)

Replaces `windows.ts`. A flat list of sections (label + command), the four primary nav buttons, and a hash→command lookup for deep links. No window ids, no paths.

**Files:**
- Create: `components/terminal/sections.ts`
- Create: `components/terminal/sections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/terminal/sections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SECTIONS, NAV_SECTIONS, commandForHash } from "./sections";

describe("sections registry", () => {
  it("NAV_SECTIONS are the four primary nav buttons in order", () => {
    expect(NAV_SECTIONS.map((s) => s.command)).toEqual([
      "about",
      "projects",
      "resume",
      "contact",
    ]);
  });

  it("SECTIONS also includes homelab (deep-linkable, not a nav button)", () => {
    expect(SECTIONS.some((s) => s.command === "homelab")).toBe(true);
    expect(NAV_SECTIONS.some((s) => s.command === "homelab")).toBe(false);
  });

  it("commandForHash maps a hash label to its command", () => {
    expect(commandForHash("#projects")).toBe("projects");
    expect(commandForHash("contact")).toBe("contact");
    expect(commandForHash("#homelab")).toBe("homelab");
    expect(commandForHash("")).toBeUndefined();
    expect(commandForHash("#nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/terminal/sections.test.ts`
Expected: FAIL — `Cannot find module './sections'`.

- [ ] **Step 3: Write the implementation**

Create `components/terminal/sections.ts`:

```ts
/**
 * The site's sections — the single source of truth for the nav row and for
 * deep links. There are no "windows": selecting a section just runs its command
 * into the one continuous log.
 */
export interface Section {
  /** URL-hash label and button text, e.g. `about`. */
  label: string;
  /** Command run when the section is selected or deep-linked. */
  command: string;
  /** Shown as a button in the nav row. */
  nav?: boolean;
}

export const SECTIONS: readonly Section[] = [
  { label: "about", command: "about", nav: true },
  { label: "projects", command: "projects", nav: true },
  { label: "resume", command: "resume", nav: true },
  { label: "contact", command: "contact", nav: true },
  { label: "homelab", command: "homelab" },
];

/** The primary nav-row sections. */
export const NAV_SECTIONS: readonly Section[] = SECTIONS.filter((s) => s.nav);

/** Map a URL hash (e.g. `#projects`) to the command to run on load, or undefined. */
export function commandForHash(hash: string): string | undefined {
  const label = hash.replace(/^#/, "").toLowerCase();
  if (!label) return undefined;
  return SECTIONS.find((s) => s.label === label)?.command;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/terminal/sections.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/terminal/sections.ts components/terminal/sections.test.ts
git commit -m "Add section registry to replace the window model"
```

---

## Task 2: Tag log entries for scroll targeting (`OutputLog.tsx`)

The new scroll behavior needs to find the newest entry's DOM node and scroll its top into view. Add a stable `data-entry-id` attribute. This is additive and safe to land before the rewrite.

**Files:**
- Modify: `components/terminal/OutputLog.tsx:13`

- [ ] **Step 1: Add the attribute**

In `components/terminal/OutputLog.tsx`, change the entry wrapper div to carry its id. Replace:

```tsx
        <div key={entry.id} className="output-fade space-y-2">
```

with:

```tsx
        <div key={entry.id} data-entry-id={entry.id} className="output-fade space-y-2">
```

- [ ] **Step 2: Verify it still type-checks**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run components/terminal`
Expected: PASS — no behavior change (the window/StatusBar/useTerminalKeys suites still pass here; they are rewritten in Task 3).

- [ ] **Step 4: Commit**

```bash
git add components/terminal/OutputLog.tsx
git commit -m "Tag log entries with data-entry-id for scroll targeting"
```

---

## Task 3: The single-log shell rewrite

One atomic change: every file that referenced the window model is rewritten or deleted together, so the tree type-checks as a unit. Write each file, then run the full verification at the end of the task before committing.

**Files:**
- Rewrite: `components/terminal/useTerminalKeys.ts`
- Rewrite: `components/terminal/useTerminalKeys.test.tsx`
- Rewrite: `components/terminal/StatusBar.tsx`
- Rewrite: `components/terminal/StatusBar.test.tsx`
- Create: `components/terminal/SectionNav.tsx`
- Create: `components/terminal/SectionNav.test.tsx`
- Rewrite: `components/terminal/Terminal.tsx`
- Modify: `app/globals.css` (remove `.mobile-bar` block)
- Delete: `components/terminal/windows.ts`, `components/terminal/windows.test.ts`, `components/terminal/WindowSwitcher.tsx`, `components/terminal/MobileBar.tsx`, `components/ui/CommandPalette.tsx`

- [ ] **Step 1: Reduce `useTerminalKeys.ts` to Ctrl-L = clear**

Replace the entire contents of `components/terminal/useTerminalKeys.ts` with:

```ts
"use client";

import { useEffect } from "react";

interface Options {
  /** Clear the log (Ctrl-L / Cmd-L). */
  onClear: () => void;
}

/**
 * The terminal's one global key binding: Ctrl-L (or Cmd-L) clears the log, like
 * a real shell. History recall (↑/↓) and Tab-completion live in CommandInput.
 */
export function useTerminalKeys({ onClear }: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClear]);
}
```

- [ ] **Step 2: Rewrite `useTerminalKeys.test.tsx`**

Replace the entire contents of `components/terminal/useTerminalKeys.test.tsx` with:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTerminalKeys } from "./useTerminalKeys";

describe("useTerminalKeys", () => {
  it("Ctrl-L clears the log", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", ctrlKey: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("Cmd-L clears the log", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", metaKey: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("ignores a plain 'l' keypress", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    expect(onClear).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rewrite `StatusBar.tsx` as a decorative line**

Replace the entire contents of `components/terminal/StatusBar.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { themes } from "@/lib/themes";
import { profile } from "@/data/profile";

interface StatusBarProps {
  /** The active theme id, resolved to its human label for display. */
  themeId: string;
}

/**
 * Decorative status line — terminal flavor, not navigation. Shows the working
 * directory, the current theme, and a clock. Marked aria-hidden because every
 * value here is available through a real control elsewhere (the theme switcher,
 * the prompt path).
 */
export function StatusBar({ themeId }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const themeLabel = themes.find((t) => t.id === themeId)?.label ?? themeId;

  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between gap-2 border-t border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted"
    >
      <span className="truncate">
        {profile.username}@portfolio:<span className="text-accent">~</span>
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <span>{themeLabel}</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `StatusBar.test.tsx`**

Replace the entire contents of `components/terminal/StatusBar.test.tsx` with:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("renders the resolved theme label and is non-interactive", () => {
    const { container } = render(<StatusBar themeId="dracula" />);
    expect(screen.getByText("Dracula")).toBeInTheDocument();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("falls back to the raw id for an unknown theme", () => {
    render(<StatusBar themeId="not-a-theme" />);
    expect(screen.getByText("not-a-theme")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Create `SectionNav.tsx`**

Create `components/terminal/SectionNav.tsx`:

```tsx
"use client";

import { NAV_SECTIONS } from "./sections";

/**
 * The single persistent nav row, shown on every viewport. Each button runs its
 * section's command into the log — identical to typing it — so clicking and
 * typing teach each other. Replaces the old desktop tab strip and mobile bar.
 */
export function SectionNav({ onRun }: { onRun: (command: string) => void }) {
  const btn =
    "min-h-[40px] flex-1 rounded-md border border-border bg-elevated px-2 font-mono text-xs text-fg transition-colors hover:border-accent/60 hover:text-accent active:text-accent focus-visible:outline-2";

  return (
    <nav
      aria-label="Sections"
      className="flex items-center gap-2 border-t border-border bg-window px-2 py-1.5"
    >
      {NAV_SECTIONS.map((s) => (
        <button key={s.command} type="button" onClick={() => onRun(s.command)} className={btn}>
          {s.label}
        </button>
      ))}
      <button type="button" onClick={() => onRun("help")} className={btn}>
        help
      </button>
    </nav>
  );
}
```

- [ ] **Step 6: Create `SectionNav.test.tsx`**

Create `components/terminal/SectionNav.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionNav } from "./SectionNav";

describe("SectionNav", () => {
  it("runs a section command when its button is clicked", () => {
    const onRun = vi.fn();
    render(<SectionNav onRun={onRun} />);
    fireEvent.click(screen.getByRole("button", { name: "projects" }));
    expect(onRun).toHaveBeenCalledWith("projects");
  });

  it("includes a help button that runs help", () => {
    const onRun = vi.fn();
    render(<SectionNav onRun={onRun} />);
    fireEvent.click(screen.getByRole("button", { name: "help" }));
    expect(onRun).toHaveBeenCalledWith("help");
  });

  it("renders exactly the four nav sections plus help", () => {
    render(<SectionNav onRun={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});
```

- [ ] **Step 7: Rewrite `Terminal.tsx`**

Replace the entire contents of `components/terminal/Terminal.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { TitleBar } from "./TitleBar";
import { bootEntries } from "./boot";
import { OutputLog } from "./OutputLog";
import { CommandInput } from "./CommandInput";
import { StatusBar } from "./StatusBar";
import { SectionNav } from "./SectionNav";
import { commandForHash } from "./sections";
import { loadHistory, saveHistory, HISTORY_MAX } from "./historyStore";
import { useTerminalKeys } from "./useTerminalKeys";
import type { LogEntry } from "./types";
import { HelpPanel } from "@/components/ui/HelpPanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { runCommandLine, type SessionActions } from "@/lib/commands";

export function Terminal() {
  // One continuous scrollback. Every command — content or toy — appends here;
  // `clear` empties it. There are no windows or sections.
  const [entries, setEntries] = useState<LogEntry[]>([]);
  // Lazy-load persisted history (recall only; not rendered, so no SSR mismatch).
  const [history, setHistory] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [helpOpen, setHelpOpen] = useState(false);

  const { themeId, setTheme } = useTheme();

  const idRef = useRef(0);
  const historyRef = useRef<string[]>(history);
  const themeIdRef = useRef(themeId);
  const runLineRef = useRef<(line: string) => void>(() => {});
  const runDepth = useRef(0);
  // The entry whose top should scroll into view after the next render.
  const pendingScrollId = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);

  useTerminalKeys({ onClear: () => runLineRef.current("clear") });

  const runLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      runDepth.current += 1;
      const isTop = runDepth.current === 1;
      let cleared = false;
      let childRan = false;

      const actions: SessionActions = {
        clear: () => {
          cleared = true;
        },
        run: (input) => {
          childRan = true;
          runLineRef.current(input);
        },
        history: historyRef.current,
        getThemeId: () => themeIdRef.current,
        setTheme,
        openHelpPanel: () => setHelpOpen(true),
        cwd: "~",
      };

      const { node } = runCommandLine(trimmed, actions);

      // Record top-level typed lines (skip a consecutive duplicate) and persist.
      if (isTop && historyRef.current[historyRef.current.length - 1] !== trimmed) {
        historyRef.current = [...historyRef.current, trimmed].slice(-HISTORY_MAX);
        setHistory(historyRef.current);
        saveHistory(historyRef.current);
      }

      // If the command navigated via ctx.run (e.g. `cd projects`), the nested
      // call already appended its result — don't also append this wrapper line.
      if (!childRan) {
        if (cleared) {
          setEntries([]);
          pendingScrollId.current = null;
        } else {
          const entry: LogEntry = { id: idRef.current++, command: trimmed, output: node };
          pendingScrollId.current = entry.id;
          setEntries((es) => [...es, entry]);
        }
      }

      runDepth.current -= 1;
    },
    [setTheme],
  );

  useEffect(() => {
    runLineRef.current = runLine;
  }, [runLine]);

  // After each change: scroll the newest command line to the top of the
  // viewport so its output reads from the start, then refocus the prompt.
  useEffect(() => {
    const id = pendingScrollId.current;
    if (id != null && bodyRef.current) {
      const el = bodyRef.current.querySelector<HTMLElement>(`[data-entry-id="${id}"]`);
      el?.scrollIntoView({ block: "start" });
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [entries]);

  // Seed the boot sequence once per page load, reveal the interactive terminal,
  // and honour a deep link. If hydration fails this never runs, so the readable
  // server-rendered content stays on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-js-ready", "true");

    const seed = bootEntries(themeIdRef.current, (cmd) => runLineRef.current(cmd)).map((e) => ({
      id: idRef.current++,
      command: e.command,
      output: e.output,
    }));
    setEntries(seed);
    pendingScrollId.current = seed[0]?.id ?? null; // boot reads from the top

    const cmd = commandForHash(window.location.hash);
    if (cmd) runLineRef.current(cmd);

    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Clicking empty space focuses the prompt — but never while selecting text or
  // when a real control/link was clicked.
  const focusOnBlankClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label")) return;
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-window">
      <TitleBar onHelp={() => setHelpOpen(true)} />

      <div
        ref={bodyRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        onClick={focusOnBlankClick}
      >
        <OutputLog entries={entries} />
        <CommandInput ref={inputRef} onSubmit={runLine} history={history} />
        <p id="input-hint" className="sr-only">
          Press Enter to run a command. Tab completes it. Up and Down arrows recall previous
          commands.
        </p>
      </div>

      <SectionNav onRun={runLine} />
      <StatusBar themeId={themeId} />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} onRun={runLine} />
    </div>
  );
}
```

- [ ] **Step 8: Remove the `.mobile-bar` CSS (the nav is now always visible)**

In `app/globals.css`, delete this block (currently around lines 199–210):

```css
/*
 * Touch-only quick-action bar. The tmux prefix keys are keyboard-only, so this
 * appears just for coarse pointers (phones/tablets) and stays hidden otherwise.
 */
.mobile-bar {
  display: none;
}
@media (pointer: coarse) {
  .mobile-bar {
    display: flex;
  }
}
```

- [ ] **Step 9: Delete the obsolete files**

```bash
git rm components/terminal/windows.ts \
       components/terminal/windows.test.ts \
       components/terminal/WindowSwitcher.tsx \
       components/terminal/MobileBar.tsx \
       components/ui/CommandPalette.tsx
```

- [ ] **Step 10: Type-check the whole tree**

Run: `npm run typecheck`
Expected: PASS. If it fails with a missing `./windows`, `./MobileBar`, `WindowSwitcher`, or `CommandPalette` import, you missed a reference — grep `grep -rn "windows\|MobileBar\|WindowSwitcher\|CommandPalette" components app lib` and fix it. (Per the pre-flight sweep, all references were in `Terminal.tsx`, which Step 7 fully replaced.)

- [ ] **Step 11: Run the full unit suite**

Run: `npm run test`
Expected: PASS. The `sections`, `useTerminalKeys`, `StatusBar`, and `SectionNav` suites are green; `boot`, `historyStore`, `lastLogin`, `CommandInput.logic`, and `registry` suites are unaffected.

- [ ] **Step 12: Lint**

Run: `npm run lint`
Expected: PASS (no unused-import or other errors from the rewrite).

- [ ] **Step 13: Commit**

```bash
git add components/terminal/useTerminalKeys.ts components/terminal/useTerminalKeys.test.tsx \
        components/terminal/StatusBar.tsx components/terminal/StatusBar.test.tsx \
        components/terminal/SectionNav.tsx components/terminal/SectionNav.test.tsx \
        components/terminal/Terminal.tsx app/globals.css
git commit -m "Collapse terminal to one continuous log with a single nav row"
```

---

## Task 4: Update the Playwright e2e suite

`e2e/verify.mjs` asserts the old window/section/tmux behaviors. Rewrite it for the single-log model: boot seeds the log, commands append, nav clicks run commands, `clear` empties, deep links open on load, and the nav is visible on desktop and mobile.

**Files:**
- Rewrite: `e2e/verify.mjs`

- [ ] **Step 1: Rewrite the suite**

Replace the entire contents of `e2e/verify.mjs` with:

```js
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = "cgnucifora@proton.me";
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
  const run = async (cmd) => {
    await page.click("#command-input");
    await page.fill("#command-input", cmd);
    await page.press("#command-input", "Enter");
    await page.waitForTimeout(140);
  };
  const navClick = async (label) => {
    await page.click(`nav[aria-label="Sections"] >> text="${label}"`);
    await page.waitForTimeout(140);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]', { timeout: 5000 });
  await page.waitForTimeout(400);

  // Boot
  ok("boot shows last login line", (await logText()).toLowerCase().includes("last login:"));
  ok("boot shows fastfetch card", /Host/.test(await logText()) && /Shell/.test(await logText()));
  ok("boot shows inline hint", (await logText()).toLowerCase().includes("try:"));
  ok("no marketing welcome banner", !(await bodyText()).includes("Welcome. I'm Christian Nucifora"));
  const bootCount = await count();
  ok("boot seeds three entries", bootCount === 3, `got ${bootCount}`);
  await page.screenshot({ path: "/tmp/home-boot.png" });

  // Content commands append to the one log; boot is preserved.
  await run("about");
  ok("about appends below boot", (await count()) === bootCount + 1, `got ${await count()}`);
  ok("boot still present after about", (await logText()).toLowerCase().includes("last login:"));

  // Nav click runs the command, same as typing.
  await navClick("resume");
  ok("nav click appends an entry", (await count()) === bootCount + 2, `got ${await count()}`);
  ok("resume nav opens the resume", (await logText()).includes("Print / Save as PDF"));

  // clear empties, then the log accumulates again.
  await run("clear");
  ok("clear wipes the log", (await count()) === 0, `got ${await count()}`);
  await run("echo one");
  await run("neofetch");
  ok("log accumulates after clear", (await count()) === 2, `got ${await count()}`);

  // Re-running stacks a fresh copy (honest terminal behavior).
  await run("about");
  await run("about");
  ok("re-running stacks a copy", (await count()) === 4, `got ${await count()}`);

  // cd delegates to the section command and appends.
  await run("cd projects");
  ok("cd projects appends projects", (await count()) === 5, `got ${await count()}`);

  // Deep link opens the section on load.
  await page.goto(BASE + "/#contact", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(300);
  ok("deep-link /#contact opens contact", (await logText()).includes(EMAIL));

  // Reload re-seeds the boot card.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(400);
  ok(
    "reload re-seeds the boot card",
    /Host/.test(await logText()) && (await logText()).toLowerCase().includes("last login:"),
  );

  // Nav row is visible on desktop.
  ok("section nav visible on desktop", await page.isVisible('nav[aria-label="Sections"]'));

  await browser.close();

  // Nav row is also visible on mobile (one persistent surface, all viewports).
  const mob = await chromium.launch();
  const ctx = await mob.newContext({ ...devices["Pixel 5"] });
  const mp = await ctx.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForSelector('html[data-js-ready="true"]');
  await mp.waitForTimeout(300);
  ok("section nav visible on mobile", await mp.isVisible('nav[aria-label="Sections"]'));
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
main().catch((e) => {
  console.error("SCRIPT ERROR", e);
  process.exit(2);
});
```

- [ ] **Step 2: Start a dev server in the background**

Run: `npm run dev` (leave it running; it serves on `http://localhost:3000`).
Wait for "Ready" in the output before continuing.

- [ ] **Step 3: Run the e2e suite**

Run: `node e2e/verify.mjs`
Expected: every line `PASS` and a final `18/18 passed` (exit 0). If a content assertion fails (e.g. "resume nav opens the resume"), confirm the `resume` command still renders the `Print / Save as PDF` button text and adjust the marker only if the copy legitimately changed.

- [ ] **Step 4: Stop the dev server**

Stop the `npm run dev` process.

- [ ] **Step 5: Commit**

```bash
git add e2e/verify.mjs
git commit -m "Update e2e suite for the single-log terminal flow"
```

---

## Final verification

- [ ] `npm run typecheck` — PASS
- [ ] `npm run lint` — PASS
- [ ] `npm run test` — PASS (all unit suites)
- [ ] `npm run build` — PASS (static export succeeds)
- [ ] `node e2e/verify.mjs` against `npm run dev` — all PASS
- [ ] Manual smoke (optional): load the site, confirm typing `about` appends below boot and scrolls the `about` line to the top; clicking the `resume` nav button does the same; `clear` empties; Ctrl-L empties; `/#contact` opens contact on load.

## Spec coverage check

- One continuous log, every command appends → Task 3 (`runLine`, `entries`).
- Append + scroll new command line to top → Task 2 (`data-entry-id`) + Task 3 (scroll effect); boot reads from top.
- Nav collapses to prompt + one persistent nav row on all viewports → Task 3 (`SectionNav`, CSS removal).
- Power-user layer stripped (tmux/window-switcher, vim modes, command palette) → Task 3 (rewrite `useTerminalKeys`, delete `WindowSwitcher`/`CommandPalette`).
- Deep links read on load only, no hash writing, no back/forward-as-window → Task 1 (`commandForHash`) + Task 3 (mount effect; no `hashchange` listener, no `updateHash`).
- StatusBar kept as non-interactive decoration → Task 3 (`StatusBar` rewrite).
- `windows.ts` reduced to a label→command list → Task 1 (`sections.ts`) + Task 3 (delete `windows.ts`).
- Command registry/data/themes unaffected → no command files touched; `cwd` pinned to `~`.
- Tests + e2e updated → Tasks 1, 3, 4.
```
