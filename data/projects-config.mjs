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

  /**
   * Source bundling: a curated slice of each repo lands under
   * ~/projects/<slug>/src/ for browsing with ls/cat/vim. Everything ships
   * in the client bundle, so the caps are the budget.
   */
  source: {
    /** File extensions worth reading. */
    extensions: [
      ".rs", ".lua", ".ts", ".tsx", ".js", ".jsx", ".mjs",
      ".py", ".c", ".h", ".sh", ".toml", ".yml", ".yaml",
      ".json", ".scm", ".vim", ".m1scr",
    ],
    /** Directories never worth shipping. */
    excludeDirs: ["node_modules", "target", "dist", "build", "vendor", ".git", "out"],
    /** Generated/lock files never worth shipping. */
    excludeFiles: ["package-lock.json", "Cargo.lock", "parser.c", "grammar.json"],
    maxFileBytes: 50_000,
    maxFilesPerRepo: 25,
    maxBytesPerRepo: 120_000,
  },
};
