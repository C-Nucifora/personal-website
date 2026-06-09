# public/

Static assets served from the site root.

## resume.pdf (optional)

`data/profile.ts` sets `resumePdf: "/resume.pdf"`. Drop a polished PDF here as
`resume.pdf` and the **Download PDF** button (and `resume --download` is also
covered by the always-available **Print / Save as PDF** path) will serve it.

If you don't add a file, use the **Print / Save as PDF** button instead — the
`@media print` styles in `app/globals.css` render the clean, server-rendered
resume content, which always matches `data/resume.ts`.
