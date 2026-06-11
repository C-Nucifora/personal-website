# Contact Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dormant, provider-agnostic contact form in the contact window and plain view, plus a `mail` command — per `docs/superpowers/specs/2026-06-12-contact-form-design.md`.

**Architecture:** One client component (`ContactForm`) that renders nothing while `profile.formEndpoint` is empty. Terminal mounting is free: `~/contact/contact.md` already has a rich renderer (`ContactCard`), so the form slots in there; the plain view gets it in `StaticContent`. The `mail` command mirrors `cd`'s `setCwd` pattern and focuses the form via a scoped DOM query.

**Tech Stack:** React 19 client component, vitest + Testing Library, Playwright e2e script.

**Conventions:** Imperative commit messages, no prefixes/trailers. `npm run typecheck && npm run lint && npm run test` before every commit. Work on branch `feat/contact-form`.

---

### Task 1: ContactForm component + config

**Files:**
- Modify: `data/profile.ts` (add `formEndpoint`)
- Create: `components/content/ContactForm.tsx`
- Test: `components/content/ContactForm.test.tsx`

- [ ] **Step 1: Add the dormant config**

In `data/profile.ts`, after the `umami` block, add (the `as string` keeps TS from narrowing the literal `""` into always-falsy checks):

```ts
  // Third-party form endpoint (Formspree / Web3Forms / Basin style URL).
  // Empty = no form renders anywhere; mailto stays primary regardless.
  formEndpoint: "" as string,
```

- [ ] **Step 2: Write the failing test**

```tsx
// components/content/ContactForm.test.tsx
import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactForm } from "./ContactForm";

const ENDPOINT = "https://forms.example.test/abc";

afterEach(() => vi.unstubAllGlobals());

describe("ContactForm", () => {
  test("renders nothing without an endpoint", () => {
    const { container } = render(<ContactForm endpoint="" />);
    expect(container.querySelector("form")).toBeNull();
  });

  test("renders name, email, message with an endpoint", () => {
    render(<ContactForm endpoint={ENDPOINT} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  test("a filled honeypot blocks the fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bot" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "b@b.bot" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "spam" } });
    fireEvent.change(container.querySelector('input[name="_gotcha"]')!, {
      target: { value: "i am a bot" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("successful submit shows the sent message and resets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.submit(screen.getByRole("form", { name: "Send me a message" }));
    await waitFor(() => expect(screen.getByText(/sent — I'll reply by email/i)).toBeInTheDocument());
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  });

  test("failed submit shows the mailto fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.submit(screen.getByRole("form", { name: "Send me a message" }));
    await waitFor(() => expect(screen.getByText(/couldn't send/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run it — expect failure**

Run: `npx vitest run components/content/ContactForm.test.tsx`
Expected: FAIL — cannot resolve `./ContactForm`.

- [ ] **Step 4: Implement**

```tsx
// components/content/ContactForm.tsx
"use client";

import { useId, useState } from "react";
import { profile } from "@/data/profile";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Provider-agnostic contact form (spec 2026-06-12). Dormant until
 * profile.formEndpoint is set. Posts urlencoded with Accept: json — the
 * convention Formspree, Web3Forms, and Basin all share. The native
 * action/method keep it working in the no-JS static fallback.
 */
export function ContactForm({ endpoint = profile.formEndpoint }: { endpoint?: string }) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");

  if (!endpoint) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_gotcha") ?? "").length > 0) return; // honeypot
    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams([...data] as [string, string][]),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const field =
    "w-full rounded-md border border-border bg-elevated px-3 py-2 font-sans text-sm text-fg focus-visible:outline-2";

  return (
    <form
      data-contact-form
      aria-label="Send me a message"
      action={endpoint}
      method="POST"
      onSubmit={onSubmit}
      className="max-w-md space-y-3"
    >
      <div className="space-y-1">
        <label htmlFor={`${id}-name`} className="font-sans text-sm text-muted">
          Name
        </label>
        <input id={`${id}-name`} name="name" required autoComplete="name" className={field} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-email`} className="font-sans text-sm text-muted">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-message`} className="font-sans text-sm text-muted">
          Message
        </label>
        <textarea id={`${id}-message`} name="message" required rows={4} className={field} />
      </div>
      {/* Honeypot — humans never see it, naive bots fill it. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="cursor-pointer rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-default disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send"}
        </button>
        <p aria-live="polite" className="font-sans text-sm text-muted">
          {status === "sent" && "Sent — I'll reply by email."}
          {status === "error" && (
            <>
              Couldn&apos;t send — email me instead:{" "}
              <a href={`mailto:${profile.email}`} className="text-accent">
                {profile.email}
              </a>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Run the test — expect pass**

Run: `npx vitest run components/content/ContactForm.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`

```bash
git add data/profile.ts components/content/ContactForm.tsx components/content/ContactForm.test.tsx
git commit -m "Add a dormant provider-agnostic contact form component"
```

---

### Task 2: Mount in the contact window and plain view

**Files:**
- Modify: `components/terminal/output/ContactCard.tsx` (after `<Socials />`)
- Modify: `components/content/StaticContent.tsx` (contact section, after `<Socials />`)

- [ ] **Step 1: ContactCard**

Add the import and render `<ContactForm />` between `<Socials />` and the homelab paragraph:

```tsx
import { ContactForm } from "@/components/content/ContactForm";
```

```tsx
      <Socials />
      <ContactForm />
```

- [ ] **Step 2: StaticContent**

Add the same import, and change the contact section to:

```tsx
        <Section id="contact" title="contact">
          <Socials />
          <ContactForm />
        </Section>
```

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
(Both surfaces render `null` today — unchanged output while unconfigured.)

```bash
git add components/terminal/output/ContactCard.tsx components/content/StaticContent.tsx
git commit -m "Mount the contact form in the contact window and plain view"
```

---

### Task 3: The `mail` command

**Files:**
- Create: `lib/commands/core/mail.tsx`
- Modify: `lib/commands/registry.ts` (import + list, after `plain`)
- Test: `lib/commands/core/mail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// lib/commands/core/mail.test.tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveCommand } from "../registry";
import { mail } from "./mail";
import { profile } from "@/data/profile";

describe("mail command", () => {
  test("is registered and visible in help", () => {
    expect(resolveCommand("mail")).toBe(mail);
    expect(mail.meta.hidden).toBeUndefined();
  });

  test("without an endpoint it prints the mailto fallback", () => {
    // profile.formEndpoint is "" until configured — the default path.
    render(<>{mail.run({} as never)}</>);
    expect(screen.getByRole("link", { name: profile.email })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run lib/commands/core/mail.test.tsx`
Expected: FAIL — cannot resolve `./mail`.

- [ ] **Step 3: Implement**

```tsx
// lib/commands/core/mail.tsx
import type { CommandModule } from "../registry";
import { Hint } from "@/components/content/messages";
import { profile } from "@/data/profile";

export const mail: CommandModule = {
  meta: {
    name: "mail",
    aliases: ["message"],
    description: "Send me a message without leaving the site.",
    usage: "mail",
  },
  run: (ctx) => {
    if (!profile.formEndpoint) {
      return (
        <p className="text-fg">
          No form here yet — the fastest way is email:{" "}
          <a href={`mailto:${profile.email}`} className="text-accent">
            {profile.email}
          </a>
        </p>
      );
    }
    ctx.setCwd("~/contact");
    // Focus the terminal instance of the form once the window has rendered.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>('.interactive [data-contact-form] input[name="name"]')
          ?.focus(),
      ),
    );
    return <Hint>opening the contact form…</Hint>;
  },
};
```

- [ ] **Step 4: Register it**

In `lib/commands/registry.ts`: `import { mail } from "./core/mail";` after the `plain` import, and `mail,` after `plain,` in `commandModules`.

- [ ] **Step 5: Run tests — expect pass, then full suite**

Run: `npx vitest run lib/commands/core/mail.test.tsx && npm run test`
Expected: all pass.

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm run lint`

```bash
git add lib/commands/core/mail.tsx lib/commands/core/mail.test.tsx lib/commands/registry.ts
git commit -m "Add the mail command pointing at the contact form"
```

---

### Task 4: E2E, docs, full gate

**Files:**
- Modify: `e2e/verify.mjs`
- Modify: `FLOW.md` (§9 table), `docs/CONTENT.md` (profile section)

- [ ] **Step 1: E2E assertions**

In `e2e/verify.mjs`, after the existing `ok("contact.md carries the homelab link", …)` line, add:

```js
  ok(
    "no contact form while unconfigured (dormant default)",
    (await page.locator('[data-window="about"] form, .static-fallback form').count()) === 0,
  );
  await run("about", "mail");
  ok("mail without an endpoint answers with the email", (await paneText("about")).includes(EMAIL));
```

- [ ] **Step 2: FLOW.md §9 row**

After the `plain` row:

```markdown
| `mail` | jump to the contact form (configured) or print the email (not) |
```

- [ ] **Step 3: CONTENT.md profile note**

In `docs/CONTENT.md`, after the `data/profile.ts` code block, add:

```markdown
`formEndpoint` (added later): a Formspree/Web3Forms/Basin-style URL. While
empty, the contact form renders nowhere and `mail` falls back to the email
address.
```

- [ ] **Step 4: Full gate**

```bash
npm run typecheck && npm run lint && npm run test
npm run build
(cd out && python3 -m http.server 3111 &) ; sleep 1.5
BASE=http://127.0.0.1:3111 node e2e/verify.mjs
pkill -f "http.server 3111"
```

Expected: all PASS.

- [ ] **Step 5: Commit, merge, push**

```bash
git add e2e/verify.mjs FLOW.md docs/CONTENT.md
git commit -m "Cover the dormant contact form in e2e and document mail"
git checkout main && git merge feat/contact-form --no-edit && git branch -d feat/contact-form
git push
```

---

## Self-review notes

- Spec coverage: component+config (T1), both mounts (T2), `mail` (T3), e2e/docs (T4). Configured-path focus behavior is not unit-tested (needs profile mocking for marginal value) — pinned instead by the dormant e2e default; noted in spec testing section as acceptable.
- The e2e contact assertions run while `page` is in the about window (post `cat ~/contact/contact.md`); the form-count check spans the static fallback too, covering both mounts.
