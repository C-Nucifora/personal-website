/**
 * Curated source files bundled into each project's src/ directory in the
 * virtual filesystem (FLOW.md §8) — entry points and representative files,
 * never whole trees. Paths are repo-relative; they appear under
 * ~/projects/<slug>/src/ at the same relative path.
 *
 * Plain .mjs so scripts/bundle-source.mjs (Node, prebuild) can import it.
 * Run `npm run bundle-source` after editing.
 */
export const sourceManifest = {
  // This site, reading itself: the flagship browsable project.
  "terminal-portfolio": [
    "FLOW.md",
    "lib/vim/machine.ts",
    "lib/vim/motions.ts",
    "lib/vim/textObjects.ts",
    "lib/vim/types.ts",
    "lib/terminal/reducer.ts",
    "lib/terminal/executor.tsx",
    "lib/terminal/layout.ts",
    "lib/terminal/animate.ts",
    "lib/terminal/keyboard.ts",
    "lib/vfs/tree.ts",
    "lib/vfs/path.ts",
    "lib/vfs/builders.ts",
    "components/terminal/Terminal.tsx",
    "components/terminal/PaneTree.tsx",
    "components/terminal/Prompt.tsx",
    "components/terminal/PaneScrollback.tsx",
    "data/projects.ts",
  ],
};
