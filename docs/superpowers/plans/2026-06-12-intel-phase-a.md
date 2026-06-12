# Language Intelligence Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `lib/intel/` facade, worker RPC, TypeScript/TSX/JS provider, and all editor integration (`K` hover, `gd` + jumplist `Ctrl+o`/`Ctrl+i`, diagnostics, `:symbols`) — per `docs/superpowers/specs/2026-06-12-language-intelligence-design.md`.

**Architecture decisions (binding):**
- Positions are **0-based document offsets** end to end (CM6 and the TS service both speak offsets natively).
- The TS language service logic lives in a **pure module** `lib/intel/ts/service.ts` (files in, answers out — unit-testable in vitest without a worker). The worker file is a thin `serveWorker(handlers)` shell.
- TS default libs (`lib.es2022*.d.ts` + dom chain) are copied from `node_modules/typescript/lib` by `scripts/bundle-ts-libs.mjs` into `data/generated/ts-libs.json` (predev/prebuild; committed; imported **only** by the worker chunk, so first paint is untouched).
- Suppressed TS diagnostic codes (missing `node_modules` by design): 2307, 2792, 7016, 2688.
- Hover renders as a CM6 cursor tooltip; `:symbols` and errors-free degradation use the existing message line. Jumplist lives module-side keyed by `windowKey` (survives cross-file editor remounts).
- Cross-file `gd` re-dispatches `open-editor` with a new optional `offset`; `PaneState` gains `editorOffset: number | null`.
- Provider acquisition is lazy on editor mount; any failure → `null` provider → tier-1 behavior, no UI.
- New dependency: `@codemirror/lint` only.

## Tasks

- [ ] **A1 — RPC + types.** `lib/intel/types.ts` (provider interface, wire types), `lib/intel/rpc.ts` (`createWorkerClient` with ids + 2s timeout, `serveWorker`). TDD with a stub `MessagePort`-style object.
- [ ] **A2 — Project file extraction.** `lib/intel/project-files.ts`: from an open vfs path, locate the project root (`~/projects/<slug>`), flatten the subtree to `{ relativePath: raw }`; `null` outside projects. TDD against the real tree (site source is always bundled).
- [ ] **A3 — TS lib bundling.** `scripts/bundle-ts-libs.mjs` + `data/generated/ts-libs.json` + package.json chain entry. Assert the generated map includes `lib.es2022.d.ts` and stays under 5 MB raw.
- [ ] **A4 — TS service.** `lib/intel/ts/service.ts`: LanguageServiceHost over the file map + libs; `hover` (quickInfo → display string), `definition` (first project-file def → path+offset), `diagnostics` (syntactic+semantic, suppression list, severity map), `symbols` (navigation tree → name/kind/line list). TDD with a two-file fixture exercising cross-file gd and a deliberate type error.
- [ ] **A5 — Worker + client provider + registry.** `lib/intel/ts/worker.ts` (thin shell), `lib/intel/client.ts` (worker-backed `IntelProvider`), `lib/intel/registry.ts` (`providerFor(language, files)` → cached provider or `null`; dynamic import; silent catch). Degradation test: unknown language → `null`; loader that throws → `null`.
- [ ] **A6 — Editor integration.** `components/editor/intel.ts` (tooltip state field, vim actions for K/gd/C-o/C-i, jumplist map, `:symbols` ex command) wired into `VimViewerImpl` (provider load on mount for ts/tsx/javascript, one-shot `setDiagnostics`, dispose on unmount); reducer/types change for `editorOffset` (+ reducer test).
- [ ] **A7 — e2e + docs + ship.** e2e: `vim` a real site source file → `K` produces hover text; `gd` on an imported symbol switches the statusline to the target file; `Ctrl+o` returns; `:symbols` prints an outline. FLOW §8.2 gains a "tier 2 (TS family): shipped" status line. Full gate, merge `feat/intel-a`, push.

**Verification per task:** failing test → implement → pass → `npm run typecheck && npm run lint && npm run test` → commit. A7 ends with build + full e2e against `out/`.
