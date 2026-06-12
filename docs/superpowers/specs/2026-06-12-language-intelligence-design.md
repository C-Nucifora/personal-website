# Language intelligence (FLOW §8.2, tiers 2+3) — design spec

**Date:** 2026-06-12
**Status:** approved by Christian (tier 2 + tier 3; four phases; minimal further input)

## Goal

Hover types (`K`), go-to-definition (`gd`), diagnostics, and document
symbols (`:symbols`) inside the read-only vim viewer — all client-side in
lazy-loaded Web Workers, per FLOW §8.2. Tier 2 covers TS/TSX/JS/JSON/CSS/
HTML; tier 3 adds languages the bundled repos actually use, where a
maintained browser-capable server exists.

## Bundled-language survey (2026-06-12)

TS 14 · TSX 5 · JSON 6 · JS 1 (plus this site's own source, the primary
showcase) — tier 2. Rust 67 · Lua 39 · YAML 25 · TOML 15 · Python 8 —
tier 3 candidates.

## Architecture

1. **`lib/intel/` facade.** One async provider interface:
   `init(files)`, `hover(path, pos)`, `definition(path, pos)`,
   `diagnostics(path)`, `symbols(path)`. A registry maps `VfsLanguage` →
   lazy provider loader. No provider = tier 1 (today's Lezer highlighting).
   Nothing loads before the first `vim` open of a relevant file. A small
   worker-RPC helper (postMessage request/response with ids) is shared by
   all providers.
2. **Workers, one lazy chunk per provider group.**
   - TS worker: the real TypeScript language service over an in-memory FS
     of the active project's bundled files plus the standard `lib.d.ts`
     set, bundled at build time (no CDN, no backend). External imports
     (`node_modules`) are absent by design: "cannot find module"-class
     diagnostics (2307, 2792, 7016) are suppressed; hover/gd work across
     the project's own files.
   - JSON/CSS/HTML: `vscode-json-languageservice`,
     `vscode-css-languageservice`, `vscode-html-languageservice` (pure JS).
   - Tier 3 adapters (each optional, silently absent if its artifact is
     impractical): YAML via `yaml-language-server` (pure JS), TOML via
     taplo's WASM build, Python via a Pyright browser build, Rust via a
     rust-analyzer WASM build. **Acceptance rule:** only maintained,
     npm-published, browser-capable artifacts qualify; a language without
     one stays tier 1 and the decision is recorded in the phase plan. Lua
     is pre-decided tier 1 (no practical browser server).
3. **Editor integration (components/editor/).**
   - `K` → hover tooltip; `gd` → definition (same pane; cross-file targets
     open in the same pane's editor); jumplist with `Ctrl+o`/`Ctrl+i`;
     diagnostics via `@codemirror/lint`; `:symbols` prints the document
     outline. All mapped through `@replit/codemirror-vim`; read-only
     semantics, tmux interop, and reduced-motion behavior unchanged.
   - Failures degrade silently: no provider, provider load error, or
     request timeout (2s) all behave as "no information" — never an error
     state in the UI (FLOW §8.2).

## File access

The worker receives the active project's file map (path → text) extracted
by walking the vfs subtree (`~/projects/<slug>/`), which already holds the
grafted GitHub source slices and this site's bundled source.

## Phases (each independently shippable, own plan/commits)

- **A:** facade + RPC + TS/TSX/JS provider + all editor integration
  (`K`, `gd`, jumplist, lint, `:symbols`). The showcase.
- **B:** JSON/CSS/HTML providers over the same facade.
- **C:** YAML + TOML adapters (tier 3, the practical ones).
- **D:** Python + Rust adapters — explicitly droppable per the acceptance
  rule; bundle-size budget: any single provider chunk over ~15 MB
  compressed is rejected.

## Testing

- Unit: registry resolution and silent degradation; RPC round-trip with a
  stub worker; per-provider request/response mapping against fixture
  files (providers exercised in jsdom via direct module import where the
  worker boundary allows; the worker shell itself stays thin).
- e2e: open a TS file from this site's source, assert hover output and a
  `gd` jump (pane path changes), `:symbols` prints an outline,
  and a tier-1-only language (e.g. Lua file) still opens cleanly with no
  intelligence UI.

## Out of scope

- Completion/IntelliSense, rename, find-references, formatting, signature
  help; cross-project gd; semantic highlighting; Lua intelligence;
  language servers requiring a backend.
