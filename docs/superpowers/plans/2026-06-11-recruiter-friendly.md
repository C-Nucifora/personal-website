# Recruiter / HR Friendliness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the terminal portfolio legible to non-technical visitors via a welcome strip, a first-class plain view (`plain` command + `?plain=1`), recruiter signposting, and TODO-placeholder hygiene — per `docs/superpowers/specs/2026-06-11-recruiter-friendly-design.md`.

**Architecture:** A tiny `lib/view-mode.ts` module drives a `data-view="plain"` attribute on `<html>`, reusing the existing `.interactive` / `.static-fallback` CSS show/hide pair. The `plain` command and all chrome buttons route through `runClick` (one-state rule). A build-time script records whether `public/resume.pdf` exists. A shared `stripTodo` helper replaces the four scattered `strip` copies and plugs the unstripped `lib/vfs/builders.ts` leak.

**Tech Stack:** Next.js App Router (static export), TypeScript, Tailwind v4 on CSS variables, vitest + Testing Library (jsdom), Playwright e2e (`e2e/verify.mjs`).

**Conventions:** Commit messages are plain imperative sentences (repo style, no `feat:` prefixes, no co-author trailers). Run `npm run typecheck && npm run lint && npm run test` before every commit.

---

### Task 1: View-mode module

**Files:**
- Create: `lib/view-mode.ts`
- Test: `lib/view-mode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/view-mode.test.ts
import { afterEach, describe, expect, test } from "vitest";
import { applyViewMode, initialViewMode, setViewMode, VIEW_STORAGE_KEY } from "./view-mode";

afterEach(() => {
  document.documentElement.removeAttribute("data-view");
  localStorage.removeItem(VIEW_STORAGE_KEY);
});

describe("initialViewMode precedence (URL > saved > default)", () => {
  test("?plain=1 wins", () => {
    expect(initialViewMode("?plain=1")).toBe("plain");
  });

  test("?plain=0 overrides a saved plain choice", () => {
    localStorage.setItem(VIEW_STORAGE_KEY, "plain");
    expect(initialViewMode("?plain=0")).toBe("terminal");
  });

  test("saved choice applies without a param", () => {
    localStorage.setItem(VIEW_STORAGE_KEY, "plain");
    expect(initialViewMode("")).toBe("plain");
  });

  test("default is terminal", () => {
    expect(initialViewMode("")).toBe("terminal");
  });
});

describe("setViewMode / applyViewMode", () => {
  test("plain sets the attribute and persists", () => {
    setViewMode("plain");
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBe("plain");
  });

  test("terminal removes the attribute", () => {
    setViewMode("plain");
    setViewMode("terminal");
    expect(document.documentElement.hasAttribute("data-view")).toBe(false);
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBe("terminal");
  });

  test("applyViewMode does not persist", () => {
    applyViewMode("plain");
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run lib/view-mode.test.ts`
Expected: FAIL — cannot resolve `./view-mode`.

- [ ] **Step 3: Implement**

```ts
// lib/view-mode.ts
/**
 * Plain view (recruiter mode). The `plain` command, the title-bar button,
 * and `?plain=1` all funnel here; the attribute drives the same CSS pair
 * that already handles the no-JS and print fallbacks (app/globals.css).
 */
export type ViewMode = "terminal" | "plain";

export const VIEW_STORAGE_KEY = "portfolio:view";

/** Reflect a mode into the DOM without recording a choice. */
export function applyViewMode(mode: ViewMode): void {
  if (mode === "plain") document.documentElement.setAttribute("data-view", "plain");
  else document.documentElement.removeAttribute("data-view");
}

/** An explicit visitor choice: reflect it and persist it. */
export function setViewMode(mode: ViewMode): void {
  applyViewMode(mode);
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
}

/** Boot-time resolution: explicit URL param > saved choice > terminal. */
export function initialViewMode(search: string): ViewMode {
  const plain = new URLSearchParams(search).get("plain");
  if (plain === "1" || plain === "true") return "plain";
  if (plain === "0" || plain === "false") return "terminal";
  try {
    if (localStorage.getItem(VIEW_STORAGE_KEY) === "plain") return "plain";
  } catch {
    /* storage unavailable */
  }
  return "terminal";
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `npx vitest run lib/view-mode.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/view-mode.ts lib/view-mode.test.ts
git commit -m "Add the plain-view mode module (attribute + persistence + URL precedence)"
```

---

### Task 2: CSS wiring, keyboard guard, boot integration

**Files:**
- Modify: `app/globals.css` (after the progressive-enhancement block, ~line 123)
- Modify: `lib/terminal/keyboard.ts:309-313`
- Modify: `components/terminal/Terminal.tsx:43-44`
- Test: `lib/terminal/keyboard.test.ts` (append)

- [ ] **Step 1: Write the failing keyboard test**

Append to `lib/terminal/keyboard.test.ts`:

```ts
describe("plain view (recruiter mode)", () => {
  test("keys are ignored while data-view=plain", () => {
    document.documentElement.setAttribute("data-view", "plain");
    press("b", { ctrlKey: true });
    expect(store.getState().pendingPrefix).toBe(false);
    document.documentElement.removeAttribute("data-view");
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run lib/terminal/keyboard.test.ts`
Expected: the new test FAILS (`pendingPrefix` becomes `true`); existing tests pass.

- [ ] **Step 3: Add the guard in `lib/terminal/keyboard.ts`**

In `initKeyboard`'s `onKeyDown`, directly after the F-key bailout (`if (/^F\d+$/.test(e.key)) return;`):

```ts
    // Plain view showing: the terminal is hidden, keys belong to the page.
    if (document.documentElement.getAttribute("data-view") === "plain") return;
```

- [ ] **Step 4: Run the test — expect pass**

Run: `npx vitest run lib/terminal/keyboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the CSS rules**

In `app/globals.css`, immediately after the `[data-js-ready="true"] .interactive { display: block; }` rule:

```css
/*
 * Plain view (recruiter mode). The `plain` command — or ?plain=1 — sets
 * data-view="plain" on <html>; the server-rendered static content becomes
 * the visible site and the terminal hides until the visitor returns.
 */
[data-js-ready="true"][data-view="plain"] .static-fallback {
  display: block;
}
[data-js-ready="true"][data-view="plain"] .interactive {
  display: none;
}
/* The back-to-terminal button only means something once JS has booted. */
html:not([data-js-ready="true"]) .back-to-terminal {
  display: none;
}
```

- [ ] **Step 6: Apply the initial mode at boot**

In `components/terminal/Terminal.tsx`, add the import:

```ts
import { applyViewMode, initialViewMode } from "@/lib/view-mode";
```

and change the start of the boot effect from:

```ts
    document.documentElement.setAttribute("data-js-ready", "true");
```

to:

```ts
    // Resolve plain view before revealing the terminal, so a ?plain=1
    // visitor never sees a flash of terminal chrome.
    applyViewMode(initialViewMode(window.location.search));
    document.documentElement.setAttribute("data-js-ready", "true");
```

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add app/globals.css lib/terminal/keyboard.ts lib/terminal/keyboard.test.ts components/terminal/Terminal.tsx
git commit -m "Wire plain view into CSS, keyboard handling, and terminal boot"
```

---

### Task 3: The `plain` command

**Files:**
- Create: `lib/commands/core/plain.tsx`
- Modify: `lib/commands/registry.ts` (import + `commandModules` list)
- Test: `lib/commands/core/plain.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// lib/commands/core/plain.test.tsx
import { afterEach, describe, expect, test } from "vitest";
import { resolveCommand } from "../registry";
import { plain } from "./plain";

afterEach(() => {
  document.documentElement.removeAttribute("data-view");
  localStorage.removeItem("portfolio:view");
});

describe("plain command", () => {
  test("is registered and visible in help", () => {
    expect(resolveCommand("plain")).toBe(plain);
    expect(plain.meta.hidden).toBeUndefined();
  });

  test("switches the document to plain view and persists", () => {
    const out = plain.run({} as never);
    expect(out).not.toBeNull();
    expect(document.documentElement.getAttribute("data-view")).toBe("plain");
    expect(localStorage.getItem("portfolio:view")).toBe("plain");
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run lib/commands/core/plain.test.tsx`
Expected: FAIL — cannot resolve `./plain`.

- [ ] **Step 3: Implement the command**

```tsx
// lib/commands/core/plain.tsx
import type { CommandModule } from "../registry";
import { OkLine } from "@/components/content/messages";
import { setViewMode } from "@/lib/view-mode";

export const plain: CommandModule = {
  meta: {
    name: "plain",
    aliases: ["plain-view"],
    description: "Switch to the plain website view — no terminal required.",
    usage: "plain",
  },
  run: () => {
    setViewMode("plain");
    // Prints into the (now hidden) scrollback; greets them if they return.
    return <OkLine>Switched to plain view — the terminal keeps your place.</OkLine>;
  },
};
```

- [ ] **Step 4: Register it**

In `lib/commands/registry.ts`, add the import after `import { date } from "./core/date";`:

```ts
import { plain } from "./core/plain";
```

and add `plain,` to `commandModules` after `date,` (before the eggs comment).

- [ ] **Step 5: Run the test — expect pass**

Run: `npx vitest run lib/commands/core/plain.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full unit suite (completion/help snapshots may reference the registry)**

Run: `npm run test`
Expected: all pass. If a completion or help test asserts the exact command list, add `plain` to its expectation.

- [ ] **Step 7: Commit**

```bash
git add lib/commands/core/plain.tsx lib/commands/core/plain.test.tsx lib/commands/registry.ts
git commit -m "Add the plain command for switching to the plain website view"
```

---

### Task 4: Back-to-terminal button in the static content

**Files:**
- Create: `components/ui/BackToTerminal.tsx`
- Modify: `components/content/StaticContent.tsx` (header block)

- [ ] **Step 1: Create the button**

```tsx
// components/ui/BackToTerminal.tsx
"use client";

import { setViewMode } from "@/lib/view-mode";

/**
 * Returns from plain view to the terminal. It lives inside the static
 * fallback, so CSS hides it until JS has booted (`.back-to-terminal` rule
 * in globals.css) — without JS there is no terminal to go back to.
 */
export function BackToTerminal() {
  return (
    <button
      type="button"
      onClick={() => setViewMode("terminal")}
      className="back-to-terminal inline-flex cursor-pointer items-center gap-2 rounded-md border border-accent/40 px-3 py-2 font-mono text-sm text-accent transition-colors hover:bg-accent/10"
    >
      Back to the terminal
    </button>
  );
}
```

- [ ] **Step 2: Render it in the static header**

In `components/content/StaticContent.tsx`, add the import:

```tsx
import { BackToTerminal } from "@/components/ui/BackToTerminal";
```

and inside the `<header>` replace the closing paragraph:

```tsx
          <p className="pt-2 font-sans text-sm text-muted">
            This is the plain version. With JavaScript enabled, the same content becomes an
            interactive terminal you can type into or click through.
          </p>
```

with:

```tsx
          <p className="pt-2 font-sans text-sm text-muted">
            This is the plain version. The same content is also available as an
            interactive terminal you can type into or click through.
          </p>
          <div className="pt-2">
            <BackToTerminal />
          </div>
```

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add components/ui/BackToTerminal.tsx components/content/StaticContent.tsx
git commit -m "Add a back-to-terminal button to the plain view"
```

---

### Task 5: Welcome strip

**Files:**
- Create: `components/terminal/WelcomeStrip.tsx`
- Modify: `components/terminal/Terminal.tsx` (render between `TabBar` and `WindowArea`)
- Test: `components/terminal/WelcomeStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/terminal/WelcomeStrip.test.tsx
import { afterEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WELCOME_DISMISSED_KEY, WelcomeStrip } from "./WelcomeStrip";

afterEach(() => localStorage.removeItem(WELCOME_DISMISSED_KEY));

describe("WelcomeStrip", () => {
  test("shows on first visit", async () => {
    render(<WelcomeStrip />);
    expect(await screen.findByRole("note", { name: "Welcome" })).toBeInTheDocument();
  });

  test("dismiss hides it and persists", async () => {
    render(<WelcomeStrip />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss welcome message" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(localStorage.getItem(WELCOME_DISMISSED_KEY)).toBe("1");
  });

  test("stays hidden once dismissed", () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    render(<WelcomeStrip />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run components/terminal/WelcomeStrip.test.tsx`
Expected: FAIL — cannot resolve `./WelcomeStrip`.

- [ ] **Step 3: Implement**

```tsx
// components/terminal/WelcomeStrip.tsx
"use client";

import { useEffect, useState } from "react";
import { runClick } from "@/lib/terminal/run-click";

export const WELCOME_DISMISSED_KEY = "portfolio:welcome-dismissed";

/**
 * One-time plain-language orientation for visitors who have never used a
 * terminal. Renders nothing on the server (avoids a hydration mismatch)
 * and nothing after dismissal — the choice persists so it never nags.
 */
export function WelcomeStrip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(WELCOME_DISMISSED_KEY) !== "1");
    } catch {
      /* storage unavailable — keep it hidden */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div
      role="note"
      aria-label="Welcome"
      className="flex items-center justify-between gap-3 border-b border-border bg-accent/10 px-3 py-1.5"
    >
      <p className="font-sans text-sm text-fg">
        New to terminals? Click the tabs above to browse — or{" "}
        <button
          type="button"
          onClick={() => runClick("plain")}
          className="cursor-pointer text-accent underline underline-offset-2 transition-colors hover:text-fg focus-visible:outline-2"
        >
          switch to plain view
        </button>
        .
      </p>
      <button
        type="button"
        aria-label="Dismiss welcome message"
        onClick={dismiss}
        className="cursor-pointer px-1 font-mono text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `npx vitest run components/terminal/WelcomeStrip.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Mount it in the terminal**

In `components/terminal/Terminal.tsx`, add the import:

```tsx
import { WelcomeStrip } from "./WelcomeStrip";
```

and in the JSX render it between the tab bar and the window area:

```tsx
      <TabBar />
      <WelcomeStrip />
      <WindowArea />
```

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add components/terminal/WelcomeStrip.tsx components/terminal/WelcomeStrip.test.tsx components/terminal/Terminal.tsx
git commit -m "Add a dismissible welcome strip for first-time visitors"
```

---

### Task 6: Humanize the MOTD hint

**Files:**
- Modify: `components/terminal/Motd.tsx:47-55` (the `MotdHint` component)

- [ ] **Step 1: Edit `MotdHint`**

Replace the existing `MotdHint` with (keeps the `try:` line — e2e asserts on it; FLOW §4 "hints are real shell, always"):

```tsx
function MotdHint() {
  return (
    <div className="space-y-1">
      <p className="font-sans text-sm text-fg/80">
        No command line needed — click the tabs above, or click any command below.
      </p>
      <p className="text-sm text-fg/80">
        try: <CmdLink cmd="cd about" /> · <CmdLink cmd="cd projects" /> ·{" "}
        <CmdLink cmd="cd resume" /> · <CmdLink cmd="help" />
        <span className="sm:hidden"> — or tap a tab above</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add components/terminal/Motd.tsx
git commit -m "Add a plain-language navigation sentence to the MOTD hint"
```

---

### Task 7: Tab bar affordances

**Files:**
- Modify: `components/terminal/TabBar.tsx:33-39` (button class list only)

- [ ] **Step 1: Restyle the tab buttons**

Replace the `className` array in the tab `<button>` with:

```tsx
                className={[
                  "min-h-[44px] cursor-pointer whitespace-nowrap border-r border-border/60 px-3.5 py-2 font-mono text-sm transition-colors",
                  "focus-visible:outline-2",
                  isActive
                    ? "border-b-2 border-b-accent bg-window text-accent"
                    : "text-fg/75 hover:bg-window/70 hover:text-fg",
                ].join(" ")}
```

(Adds a visible separator between tabs and a hover background so the tabs read as buttons; `border-b-accent` keeps the active underline from recoloring the separator. Labels are untouched — FLOW §3.3.)

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add components/terminal/TabBar.tsx
git commit -m "Make tabs read as clickable buttons with separators and hover fill"
```

---

### Task 8: Title-bar resume and plain-view buttons

**Files:**
- Modify: `components/terminal/TitleBar.tsx` (right-side button group)

- [ ] **Step 1: Add the buttons**

In `components/terminal/TitleBar.tsx`, inside `<div className="flex items-center gap-2">`, add before the `?` button (both run real commands via `runClick`, FLOW §10.1 pattern; hidden on the smallest screens where the tab bar and welcome strip carry the same destinations):

```tsx
        <button
          type="button"
          onClick={() => runClick("cd ~/resume")}
          title="cd ~/resume"
          className="hidden cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 sm:block"
        >
          resume
        </button>
        <button
          type="button"
          onClick={() => runClick("plain")}
          title="plain"
          aria-label="Switch to plain view"
          className="hidden cursor-pointer rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 sm:block"
        >
          plain view
        </button>
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add components/terminal/TitleBar.tsx
git commit -m "Add resume and plain-view shortcuts to the title bar"
```

---

### Task 9: Build-time resume.pdf presence check

**Files:**
- Create: `scripts/check-assets.mjs`
- Create (generated): `data/generated/assets.ts`
- Modify: `package.json:8-9` (`predev` / `prebuild`)
- Modify: `components/content/Resume.tsx:60-68` (gate the download anchor)

- [ ] **Step 1: Create the script**

```js
// scripts/check-assets.mjs
/**
 * Records whether optional static assets exist, so components can hide
 * dead links at build time (e.g. the resume PDF download button — see
 * public/README.md). Runs on predev/prebuild; the output is committed.
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const hasResumePdf = existsSync(`${root}public/resume.pdf`);

writeFileSync(
  `${root}data/generated/assets.ts`,
  `// Generated by scripts/check-assets.mjs — do not edit by hand.\nexport const hasResumePdf = ${hasResumePdf};\n`,
);
console.log(`check-assets: hasResumePdf=${hasResumePdf}`);
```

- [ ] **Step 2: Wire it into the build**

In `package.json`, append `&& node scripts/check-assets.mjs` to both `predev` and `prebuild`:

```json
    "predev": "node scripts/fetch-projects.mjs && node scripts/bundle-source.mjs && node scripts/check-assets.mjs",
    "prebuild": "node scripts/fetch-projects.mjs && node scripts/bundle-source.mjs && node scripts/check-assets.mjs",
```

- [ ] **Step 3: Generate the file once**

Run: `node scripts/check-assets.mjs`
Expected: `check-assets: hasResumePdf=false` and `data/generated/assets.ts` created.

- [ ] **Step 4: Gate the download button**

In `components/content/Resume.tsx`, add the import:

```tsx
import { hasResumePdf } from "@/data/generated/assets";
```

and wrap the download anchor (the `<a href={profile.resumePdf} download …>` block) so it only renders when the file exists:

```tsx
      <div className="flex flex-wrap gap-2 print:hidden">
        {hasResumePdf && (
          <a
            href={profile.resumePdf}
            download
            className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10 hover:no-underline"
          >
            <Icon name="download" size={16} />
            Download PDF
          </a>
        )}
        <PrintButton />
      </div>
```

(The vfs `~/resume/resume.pdf` entry stays — `lib/vfs/tree.test.ts` pins it and its `cat` summary is part of the terminal world. Only the prominent GUI button is gated.)

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add scripts/check-assets.mjs data/generated/assets.ts package.json components/content/Resume.tsx
git commit -m "Hide the resume download button when no PDF is bundled"
```

---

### Task 10: TODO-placeholder hygiene (`stripTodo`)

**Files:**
- Create: `lib/strip-todo.ts`
- Modify: `lib/vfs/builders.ts` (the unstripped leak — terminal `cat about.md` etc. show raw "TODO" today)
- Modify (dedupe the four `strip` copies): `components/SitePage.tsx`, `components/content/StaticContent.tsx`, `components/content/Resume.tsx`, `components/content/Fetch.tsx`, `app/opengraph-image.tsx`, `app/layout.tsx`, `lib/commands/core/whoami.tsx`
- Test: `lib/vfs/builders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/vfs/builders.test.ts
import { describe, expect, test } from "vitest";
import { experience } from "@/data/resume";
import {
  aboutMd,
  contactMd,
  experiencePageMd,
  planText,
  resumeMd,
  resumePdfSummary,
  usesMd,
} from "./builders";

describe("builders never leak placeholder TODOs (recruiter hygiene)", () => {
  test("no generated file contains the literal word TODO", () => {
    const texts = [
      aboutMd(),
      usesMd(),
      resumeMd(),
      resumePdfSummary(),
      contactMd(),
      planText(),
      ...experience.map(experiencePageMd),
    ];
    for (const t of texts) expect(t).not.toMatch(/\bTODO\b/);
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run lib/vfs/builders.test.ts`
Expected: FAIL — `aboutMd()` (and others) contain "TODO".

- [ ] **Step 3: Create the shared helper**

```ts
// lib/strip-todo.ts
/**
 * Placeholder hygiene: data files may carry "TODO " prefixes until real
 * content lands, but nothing a visitor sees may render the literal word.
 * Single source for the strip rule — components and builders share it.
 */
export const stripTodo = (s: string): string => s.replace(/^TODO\s*/, "").trim();

/** Strip a list and drop items that were nothing but the placeholder. */
export const stripTodoList = (items: readonly string[]): string[] =>
  items.map(stripTodo).filter(Boolean);
```

- [ ] **Step 4: Use it in `lib/vfs/builders.ts`**

Add the import:

```ts
import { stripTodo, stripTodoList } from "@/lib/strip-todo";
```

Then apply it to every profile/resume field interpolation:

In `aboutMd()`:

```ts
export function aboutMd(): string {
  return [
    `# ${profile.name}`,
    "",
    `> ${stripTodo(profile.tagline)}`,
    "",
    `**${stripTodo(profile.role)}** · ${stripTodo(profile.location)}`,
    "",
    ...stripTodoList(profile.about).flatMap((p) => [p, ""]),
    `More: [uses.md](uses.md) — the tools this gets built with.`,
  ].join("\n");
}
```

In `usesMd()`, change the items line to:

```ts
    ...stripTodoList(g.items).map((i) => `- ${i}`),
```

In `resumeEntryMd()`:

```ts
function resumeEntryMd(e: ResumeEntry): string[] {
  const where = e.location ? ` · ${stripTodo(e.location)}` : "";
  return [
    `### ${stripTodo(e.title)} — ${stripTodo(e.org)}`,
    "",
    `${e.start}–${e.end}${where}`,
    "",
    ...stripTodoList(e.bullets).map((b) => `- ${b}`),
    "",
  ];
}
```

In `resumeMd()`, change the header line and skills line to:

```ts
    `${stripTodo(profile.role)} · ${stripTodo(profile.location)} · ${profile.email}`,
```

```ts
    ...skills.map((s) => `- **${s.group}:** ${stripTodoList(s.items).join(", ")}`),
```

In `resumePdfSummary()`:

```ts
    `${profile.name} — ${stripTodo(profile.role)}`,
```

In `experiencePageMd()`:

```ts
export function experiencePageMd(e: ResumeEntry): string {
  const where = e.location ? ` · ${stripTodo(e.location)}` : "";
  return [
    `# ${stripTodo(e.org)}`,
    "",
    `**${stripTodo(e.title)}** · ${e.start}–${e.end}${where}`,
    "",
    ...stripTodoList(e.bullets).map((b) => `- ${b}`),
    "",
    "Back to the overview: [../resume.md](../resume.md)",
  ].join("\n");
}
```

In `planText()`, change the items line to:

```ts
    ...stripTodoList(now.items).map((i) => `* ${i}`),
```

- [ ] **Step 5: Run the test — expect pass**

Run: `npx vitest run lib/vfs/builders.test.ts && npx vitest run lib/vfs`
Expected: PASS, including the existing tree tests.

- [ ] **Step 6: Dedupe the scattered copies**

Replace each local `strip`/`clean` with the shared helper (behavioral gates like `startsWith("TODO")` stay as they are):

- `components/SitePage.tsx`: delete `const strip = …`; import `{ stripTodo }` from `@/lib/strip-todo`; use `stripTodo(profile.role)`.
- `components/content/StaticContent.tsx`: same replacement (`strip(profile.role)` → `stripTodo(profile.role)`); keep the `!profile.tagline.startsWith("TODO")` gate.
- `components/content/Resume.tsx`: delete local `strip`; import `{ stripTodo }`; replace the five `strip(...)` call sites and `s.items.map(strip)` → `stripTodoList(s.items)` (import it too).
- `components/content/Fetch.tsx`: delete local `clean`/`real`; import `{ stripTodo, stripTodoList }`; `clean(x)` → `stripTodo(x)`, `real(xs)` → `stripTodoList(xs)`.
- `app/opengraph-image.tsx`: delete local `strip`; import `{ stripTodo }` from `@/lib/strip-todo`; `strip(profile.role)` → `stripTodo(profile.role)`.
- `app/layout.tsx`: `const role = profile.role.replace(/^TODO\s*/, "");` → `const role = stripTodo(profile.role);` with the import.
- `lib/commands/core/whoami.tsx`: `profile.role.replace(/^TODO\s*/, "")` → `stripTodo(profile.role)` with the import.

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass (Fetch.test.tsx exercises the refactored Fetch).

```bash
git add lib/strip-todo.ts lib/vfs/builders.ts lib/vfs/builders.test.ts components/SitePage.tsx components/content/StaticContent.tsx components/content/Resume.tsx components/content/Fetch.tsx app/opengraph-image.tsx app/layout.tsx lib/commands/core/whoami.tsx
git commit -m "Share one stripTodo helper and stop TODO placeholders leaking into the vfs"
```

---

### Task 11: Documentation amendments

**Files:**
- Modify: `FLOW.md` (§3 new subsection, §9 table, §10.1)
- Modify: `docs/DESIGN.md` (one paragraph under the help-first philosophy section — locate with `grep -n "help-first" docs/DESIGN.md`)

- [ ] **Step 1: FLOW.md — add §3.4 after §3.3**

```markdown
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
```

- [ ] **Step 2: FLOW.md — §9 command table**

Add a row after `theme [name]`:

```markdown
| `plain` | switch to the plain website view; the title-bar button and welcome strip run it (§3.4) |
```

- [ ] **Step 3: FLOW.md — §10.1 title bar**

In the right-side bullet, change

```markdown
- Right side: a `?` button (runs `help` via the §5 animation — it is a command in disguise, not a separate help system) and a **theme dropdown**.
```

to

```markdown
- Right side: `resume` and `plain view` buttons (each runs its real command — `cd ~/resume`, `plain` — via the §5 animation; hidden on the smallest screens), a `?` button (runs `help` via the §5 animation — it is a command in disguise, not a separate help system) and a **theme dropdown**.
```

- [ ] **Step 4: docs/DESIGN.md — plain-view note**

Append to the help-first philosophy section:

```markdown
Plain view is the final safety net: the `plain` command (or `?plain=1`)
swaps the terminal for the same server-rendered content the no-JS fallback
ships, so a visitor who never warms to the terminal still gets the whole
site as a normal page — and a way back when curiosity wins.
```

- [ ] **Step 5: Commit**

```bash
git add FLOW.md docs/DESIGN.md
git commit -m "Document plain view, the welcome strip, and the new title-bar shortcuts"
```

---

### Task 12: E2E coverage and full verification

**Files:**
- Modify: `e2e/verify.mjs`

- [ ] **Step 1: Assert the new MOTD sentence**

After the existing line `ok("MOTD: clickable try hints", …)` (~line 48), add:

```js
  ok("MOTD: human nav sentence", lobby.includes("No command line needed"));
```

- [ ] **Step 2: Add the recruiter-mode blocks**

Insert before the `// ---- reduced motion` section (~line 232):

```js
  // ---- welcome strip + plain view (recruiter mode)
  const wsCtx = await browser.newContext();
  const wsPage = await wsCtx.newPage();
  await wsPage.goto(BASE, { waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(900);
  ok("welcome strip shows on first visit", await wsPage.isVisible('[role="note"][aria-label="Welcome"]'));
  await wsPage.click('[aria-label="Dismiss welcome message"]');
  await wsPage.waitForTimeout(120);
  ok("dismiss hides the strip", !(await wsPage.isVisible('[role="note"][aria-label="Welcome"]')));
  await wsPage.reload({ waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(900);
  ok("dismissal persists across reloads", !(await wsPage.isVisible('[role="note"][aria-label="Welcome"]')));

  ok("terminal visible before plain view", await wsPage.isVisible("[data-terminal-root]"));
  await wsPage.click('button[title="plain"]'); // title-bar "plain view" button
  await wsPage.waitForTimeout(ANIM);
  ok("plain view reveals the static content", await wsPage.isVisible(".static-fallback"));
  ok("plain view hides the terminal", !(await wsPage.isVisible("[data-terminal-root]")));
  await wsPage.reload({ waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(300);
  ok("plain view persists across reloads", await wsPage.isVisible(".static-fallback"));
  await wsPage.click('button:has-text("Back to the terminal")');
  await wsPage.waitForTimeout(300);
  ok("back button returns to the terminal", await wsPage.isVisible("[data-terminal-root]"));
  await wsCtx.close();

  // ---- ?plain=1 deep link (the recruiter URL)
  const plCtx = await browser.newContext();
  const plPage = await plCtx.newPage();
  await plPage.goto(BASE + "/?plain=1", { waitUntil: "networkidle" });
  await plPage.waitForSelector('html[data-js-ready="true"]');
  await plPage.waitForTimeout(300);
  ok("?plain=1 lands in plain view", await plPage.isVisible(".static-fallback"));
  ok("?plain=1 hides the terminal", !(await plPage.isVisible("[data-terminal-root]")));
  await plCtx.close();

  // ---- title-bar resume shortcut
  await page.click('button[title="cd ~/resume"]');
  await page.waitForTimeout(ANIM);
  ok("title-bar resume button navigates", page.url().endsWith("/resume/"));
```

- [ ] **Step 3: Full verification gate**

```bash
npm run typecheck && npm run lint && npm run test
npm run build
(cd out && python3 -m http.server 3000 &) && sleep 1
BASE=http://127.0.0.1:3000 node e2e/verify.mjs
```

Expected: every line `PASS`, exit 0. Kill the server afterwards (`pkill -f "http.server 3000"`).

Also spot-check the export: `grep -c "Download PDF" out/resume/index.html` should print `0` (no PDF bundled yet) and `grep -c "TODO" out/about/index.html` should print `0`.

- [ ] **Step 4: Commit**

```bash
git add e2e/verify.mjs
git commit -m "Cover the welcome strip, plain view, and resume shortcut in e2e"
```

---

## Self-review notes

- **Spec coverage:** welcome strip (T5), MOTD humanizing (T6), tab affordances (T7) = workstream 1; view-mode module/CSS/boot/command/back button (T1–T4) + `?plain=1` (T1, T12) = workstream 2; PDF gating (T9) + title-bar resume button (T8) + OG audit (already strips TODO — verified during planning; no change needed) = workstream 3; `stripTodo` + builders leak fix (T10) = workstream 4; docs (T11); tests woven throughout + e2e gate (T12).
- **Known intentional exclusions:** vfs `resume.pdf` node stays (pinned by `lib/vfs/tree.test.ts`; terminal-world flavor); dead social links stay (user's explicit call); no guided tour.
- **Type consistency:** `ViewMode`/`applyViewMode`/`setViewMode`/`initialViewMode`/`VIEW_STORAGE_KEY` (T1) are the only cross-task API, used in T2, T3, T4; `stripTodo`/`stripTodoList` (T10) self-contained.
