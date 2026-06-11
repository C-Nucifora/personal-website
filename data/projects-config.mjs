/**
 * Curation for the GitHub project sync (scripts/fetch-projects.mjs).
 * The projects window is fed from the public repos of `username` at build
 * time; tune what shows and how here, then run `npm run fetch-projects`.
 */
export const projectsConfig = {
  username: "C-Nucifora",

  /** Repo names to leave off the site entirely. */
  exclude: [],

  /** Repo names surfaced as featured cards (order preserved). */
  featured: ["m1-core", "m1-lsp", "nvim-m1", "tree-sitter-m1"],

  /**
   * Per-repo overrides for anything the GitHub metadata gets wrong:
   * { "repo-name": { pitch: "...", stack: ["..."] } }
   */
  overrides: {},

  /** How many recent commits to bundle for the `git log` easter egg. */
  commitCount: 8,
};
