# Contact form — design spec

**Date:** 2026-06-12
**Status:** approved by Christian (option B: shared form in contact window + plain view)

## Goal

A contact form that works for non-technical visitors without weakening the
mailto-first philosophy, served from the static export with no backend of our
own — POSTs go to a third-party endpoint the user configures later.

## Decisions

- **Interaction model B:** one shared form component rendered in two places —
  the contact window's content and the plain-view contact section. No
  terminal input wizard (rejected as too much new reducer machinery), no
  plain-view-only variant (terminal visitors would never see it).
- **Dormant config:** `profile.formEndpoint: ""` in `data/profile.ts`
  (same pattern as `homelabUrl` and `umami`). Empty → the form renders
  nowhere and the site behaves exactly as today. Mailto stays primary
  regardless of configuration.
- **Provider-agnostic:** POST `application/x-www-form-urlencoded` with
  `Accept: application/json` — the convention Formspree, Web3Forms, and
  Basin all accept. Switching providers is a config edit, not a code change.

## Component: `components/content/ContactForm.tsx`

- Client component. Fields: name, email, message — nothing else.
- Accessible plain HTML: real `<label>`s, `required`, `type="email"`,
  visible focus rings, theme tokens only (no hardcoded colors).
- Spam defense: a CSS-hidden honeypot text input named `_gotcha`
  (aria-hidden, tabIndex -1). If filled, submission is silently dropped
  client-side (and Formspree-compatible servers drop it too).
- Submit via `fetch`; inline status line cycles idle → sending →
  "sent — I'll reply by email" or error → "couldn't send — email me
  instead: <mailto link>".
- No-JS fallback: the `<form>` has real `action={formEndpoint}` and
  `method="POST"`, so in the static fallback without JavaScript it still
  submits natively (provider shows its own thank-you page). The fetch
  path preventDefaults only when JS is running.
- Renders `null` when `profile.formEndpoint` is empty.

## Mounting points

1. **Contact window (terminal):** rendered as part of the contact window's
   auto-displayed content, after the contact.md markdown.
2. **Plain view / static fallback:** in the contact section of
   `StaticContent`, after `Socials`.

Same component in both — no drift.

## Command: `mail`

- Registered, visible in `help`. Usage: `mail`.
- If `formEndpoint` is configured: runs the equivalent of `cd ~/contact`
  (through the executor — one-state rule) and focuses the form's first
  field once the window is active.
- If not configured: prints the mailto line, so the command is never a
  dead end.

## Testing

- Unit (ContactForm): renders nothing without an endpoint; renders fields
  with one; filled honeypot blocks the fetch; success and error states
  with a mocked fetch.
- Unit (mail command): registered and visible; unconfigured output
  contains the email address.
- e2e: contact window and plain view show no form while unconfigured
  (pins the dormant default in CI).

## Docs

- FLOW.md §9: add `mail` row.
- docs/CONTENT.md: document `formEndpoint` in the profile section.

## Out of scope

- Terminal input wizard, CAPTCHA, file attachments, subject field,
  rate limiting (the provider's job), storing submissions.
