# Language Intelligence Phase D — decision record

**Date:** 2026-06-12
**Outcome: dropped, per the spec's acceptance rule** (only maintained,
npm-published, browser-capable artifacts qualify — spec
`2026-06-12-language-intelligence-design.md`).

## Evidence (npm registry, checked 2026-06-12)

| Language | Artifact | Verdict |
|---|---|---|
| Rust | `rust-analyzer-wasm`, `@rust-analyzer/wasm` | 404 — no published WASM build exists |
| Rust | `rust-analyzer` | 0.0.1-security placeholder |
| Python | `pyright` 1.1.410, `basedpyright` 1.39.7 | maintained but node-only distributions |
| Python | `@typefox/pyright-browser` 1.1.299 | browser-capable but unmaintained since 2023-03 |

Self-building rust-analyzer to WASM would add a Rust toolchain to the
build pipeline — out of scope by design.

## Result

Python and Rust files stay tier 1 (Lezer-less plain text / existing
highlighting; the viewer, yank, and search all work — there is simply no
hover/gd/diagnostics UI, which is FLOW §8.2's silent degradation working
as specified).

## Identified follow-up (not committed work)

`web-tree-sitter` + grammar WASMs is maintained and browser-first; it
could power a tier-3-lite outline (`:symbols`) and syntax-error
diagnostics for Python *and* Rust within the data-worker pattern that
yaml/toml use. Revisit if bundled Rust/Python content grows.
