# data/blog/

One markdown file per post. The filename is the slug; this README is
never a post. Frontmatter (both fields required, posts sorted by date,
newest first):

    ---
    title: My post title
    date: 2026-06-12
    ---

    Markdown body starts here.

`npm run bundle-blog` (also on predev/prebuild) regenerates
`data/generated/blog.ts`. Zero posts = the 6:blog window stays hidden.
