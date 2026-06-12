# Blog window — design spec

**Date:** 2026-06-12
**Status:** approved by Christian (markdown files · `6:blog` · dormant until the first post)

## Goal

A `6:blog` tmux window fed by markdown files, shipping fully built but
invisible until the first post exists — the site's established dormant
pattern (resume PDF, contact form, umami). Writing a post = drop a `.md`
file in `data/blog/`, push; the window, tab, route, and plain-view section
all materialize on the next build.

## Decisions

- **Authoring:** one file per post at `data/blog/<slug>.md` with minimal
  frontmatter between `---` fences: `title:` and `date:` (ISO `YYYY-MM-DD`).
  Everything after the closing fence is the markdown body. The filename is
  the slug.
- **Window:** `6:blog`, appended after `5:help` (FLOW §7.1 — never
  renumber). Single pane, like every window except projects.
- **Dormant:** zero posts → no tab, no `Ctrl+b 6`, no `/blog` route, no
  `~/blog` vfs dir, no plain-view section. The site behaves identically to
  today (e2e pins this while the repo has no posts).

## Build pipeline

`scripts/bundle-blog.mjs`, appended to the `predev`/`prebuild` chains
(after `check-assets`). It reads `data/blog/*.md`, parses frontmatter with
a small hand-rolled parser (no new dependencies), sorts newest-first, and
writes `data/generated/blog.ts`:

```ts
export interface BlogPost {
  slug: string;   // filename without .md
  title: string;
  date: string;   // ISO YYYY-MM-DD
  body: string;   // markdown after the frontmatter fence
}
export const blogPosts: BlogPost[] = [];
```

Files with malformed/missing frontmatter are skipped with a console
warning, never a build failure. The generated module is committed (repo
convention). `data/blog/` ships with a `README.md` documenting the post
format; the bundler explicitly skips `README.md` so it never becomes a
post.

## Window-system integration

- `WINDOW_IDS` (the static tuple in `lib/vfs/types.ts`, source of the
  `WindowId` type) gains `"blog"`.
- New export `ACTIVE_WINDOW_IDS: WindowId[]` — `WINDOW_IDS` filtered to
  drop `"blog"` when `blogPosts.length === 0`. UI and navigation consumers
  switch to it: TabBar, StatusBar, WindowPicker, WindowArea, routing,
  keyboard window-jump digits, `app/[window]` `generateStaticParams`.
- Type-level consumers (reducer state record, path resolution) stay on the
  full tuple — a dormant `blog` window state simply sits unreachable.
- vfs: `~/blog/` is added to the tree only when posts exist, one
  `<slug>.md` file per post (raw markdown body; `cat` renders it rich,
  `vim` shows the source). First-entry auto-display: `ls` (like projects).
- Pane splits remain projects-only (FLOW §7.3 unchanged).

## Plain view

`StaticContent` gains a `blog` section after `contact`, rendering every
post in full (title, date, `react-markdown` body — existing dependency).
Hidden entirely when there are no posts. Per-post HTML routes
(`/blog/<slug>`) are explicitly deferred until real writing volume exists.

## Testing

- Unit: frontmatter parser (well-formed, missing fence, missing title,
  README exclusion, date sort); `ACTIVE_WINDOW_IDS` with and without posts
  (the generated module is mockable via a fixture); vfs tree gains `~/blog`
  only when posts exist.
- e2e (runs against the committed zero-post state): no `6:blog` tab, no
  `/blog` route content, lobby `ls` shows five dirs — pins the dormant
  default. The populated path is covered by unit tests with fixture posts.

## Docs

- FLOW.md: §2 tree (blog/ marked "when posts exist"), §2.1 auto-display
  table, §7.1 window list note.
- docs/CONTENT.md: authoring section for `data/blog/`.

## Out of scope

- Per-post routes, RSS, tags/categories, drafts, MDX/components in posts,
  reading-time estimates, comments.
