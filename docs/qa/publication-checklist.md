# Publication acceptance

FLOW.md governs interaction. docs/DESIGN.md and docs/THEMES.md govern visuals. Historical plans do not replace those contracts. The owner approved using these product documents because the shared design profile is unavailable on this machine.

## Content approval

- [x] Owner confirmed cgnucifora@proton.me and https://christiannucifora.com.
- [ ] Owner-approved biography, role, location, availability, tools, experience and education. Deferred by the owner. Do not invent or silently publish placeholder claims.
- [x] GitHub identity and email destinations verified; placeholder LinkedIn removed. No résumé PDF exists, so download links and the virtual PDF are absent. Supplied PDFs must pass a header check.
- [x] Final export excludes the dashboard link. The project snapshot uses an explicit public allowlist; the independent audit verified all 83 bundled README/source files against unauthenticated public URLs at their pinned revisions.

## Interaction and presentation

- [x] Click-only journeys through about, projects, résumé, contact and help.
- [x] Tabs, status navigation, commands and tmux shortcuts preserve cwd and pane state.
- [x] Completion, history, errors, focus, scrolling, editor exits and browser copy/paste.
- [x] Refresh, direct routes, back/forward and plain view switching.
- [x] Plain/no-JS navigation, useful content and contact links.
- [x] 320px phone, landscape, tablet, desktop, zoom and long content.
- [x] All themes, contrast, semantics, keyboard focus, reduced motion and restrained announcements. Text uses tested tokens without opacity reductions. Real assistive technology remains untested.
- [x] Existing Easter eggs remain functional without new features.

## Delivery and privacy

- [x] GitHub ingestion restricted to four deliberately curated public repositories, immutable revisions, bounded responses/files, safe links/rendering and committed offline snapshots. Sync is manual and unauthenticated.
- [x] Loading measured; editor, TypeScript worker and remote sources are absent from the initial request set. Sources load on Projects navigation or source-path access from another shell.
- [x] Static routes, 404, metadata, social images and hosting configuration verified. Hosting was inspected locally; no deployment occurred.
- [x] Unconfigured forms, analytics, blog and downloads remain dormant.
- [x] Typecheck, lint, unit tests, build and browser e2e pass.
- [x] Actual development and production output checked in a local browser.
- [x] Private evidence recorded; temporary servers stopped; listener comparison shows no new public exposure.
- [x] Changes reviewed and committed locally with signing. No push or publication without approval. Signatures were checked using a temporary allowed-signers file; Git's global trust configuration was left unchanged.

## Owner decisions

- The owner accepted the historical dashboard hostname exposure in the already-public Git repository and approved keeping the public Source link. No history rewrite is authorized.
- Personal biography, résumé, tools and current-activity content remain deferred. Keep those files unchanged and require owner approval before publication.
- Shared command history remains shared across windows and panes. FLOW.md now records that choice.
- Use the existing product design documents while the shared profile is unavailable.

## Runtime baseline

Initial checkout was clean on main at 0084c1b, matching origin/main. Only remote product branch is main; other branches are dependency updates. No reliable branch-specific last push record was available in the clone or current GitHub user events. Use the realistic-commits past-day fallback, without rewriting published history.

Pre-existing services and routes were left untouched. Rootless Docker became available during the audit but was not needed. All portfolio servers bind explicitly to 127.0.0.1, with no tunnel, route or publishing changes. Tests and builds use a disk-backed TMPDIR and low parallelism under host contention.

A duplicate top-level task edited this checkout during initial inspection. Its patch was saved privately at /home/christian/.local/share/portfolio-audit/concurrent-edits.patch. The duplicate writer stopped and handed over its patch. Conflicting personal content edits were reverted; technical fixes were reconciled and their two introduced type errors corrected. This thread is the sole owner.

## Verification and review

Sol performed the browser audit. Astra reviewed security and shared-state behavior; Fable 5.2 independently reviewed presentation and interaction. Findings were resolved with focused regressions for editor focus, picker dismissal, source paths before Projects, long-output scrolling, desktop landing focus, native theme selection and pending confirmations. Plain view keeps the current section visible, exposes the full email and hides printing without JavaScript. Short viewports retain reading space without the welcome strip.

The final full unit run passed 396 tests across 36 files. Typecheck and lint passed. The production build exported 16 pages with one worker. The expanded publication browser suite passed 140 checks at 320px through 2560px, including a 320×256 viewport and 200% plain-view zoom. The interaction suite passed 93 checks against production and 93 against development, with no browser console or page errors. A development run initially failed three dependent assertions around a fixed 650 ms theme-animation delay under host contention. Replacing that delay with a wait for the selected theme made the final run pass; the failed log is retained privately.

A cold loopback sample before the final fixes measured FCP at 624 ms and interactive readiness at 2.762 s. Initial JavaScript transferred about 907 kB without compression. Remote sources, editor dependencies and the TypeScript worker loaded only after interaction. These timings reflect host contention and are not deployment performance guarantees.

Private logs, screenshots and resource measurements are stored outside the repository in the portfolio-audit evidence directory. No Safari, Firefox, real mobile keyboard or real screen-reader run was performed. Production dependencies have no reported advisories; eight moderate advisories remain in development lint tooling, whose proposed automatic fix requires breaking dependency changes.
