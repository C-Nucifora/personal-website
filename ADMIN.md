# Portfolio administration

Open `/admin.html` to manage the project inventory, rack positions, visibility, project pages and site appearance. Saving updates a draft. Publishing makes the saved draft visible to visitors. Restore copies a previous snapshot into a new draft revision, so restoring never changes the live site until you publish.

This repository includes the backend and setup instructions. No Vercel connection, database, OAuth application or Blob store has been created, and nothing has been deployed. Authentication and persistent saving require the credentials below. The public site uses its bundled portfolio until database storage is configured. A configured storage outage shows an unavailable state, so older bundled content cannot replace a published portfolio.

## Set up GitHub sign-in

1. Create a GitHub OAuth App under your GitHub developer settings. Use the deployed site origin as its homepage and `https://YOUR-DOMAIN/api/auth/callback/github` as its callback URL.
2. Set `SITE_URL` to that exact HTTPS origin. Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from the OAuth App.
3. Generate a secret with `openssl rand -base64 32` and set `AUTH_SECRET`. Keep this value private. Rotating it invalidates existing sessions.

Only GitHub user ID `143251500`, Christian's `C-Nucifora` account, can sign in. The check uses GitHub's numeric identity rather than a changeable username or email. The application requests `read:user`, with no repository or private email scope. Create a separate OAuth App for local development with callback `http://localhost:3000/api/auth/callback/github`.

Auth.js issues encrypted sessions in HttpOnly, SameSite=Lax cookies. HTTPS deployments use Secure cookies. Sessions expire after eight hours. Sign-in and sign-out use Auth.js CSRF protection. Saving, publishing, restoring and uploading also require a token bound to the authenticated session and an exact `Origin` match against `SITE_URL`. There is no production authentication bypass.

## Set up storage

1. Create a Neon PostgreSQL database using its free plan, either directly or through the Vercel Marketplace. Use its PostgreSQL connection string as `DATABASE_URL`, including `sslmode=require`.
2. Set these environment variables in the existing Vercel project's settings. Use the production origin and credentials for production. A preview deployment needs its own matching origin, OAuth App callback and isolated database before administration can work there.
3. For local setup, copy `.env.example` to `.env.local`, fill in the values, then run `npm install` and `npm run db:setup`.

`db:setup` creates the two tables in `db/001-portfolio.sql` and initializes 22 portfolio records across three 24U racks. Software has six placed units occupying 20U, with Personal Projects linking seven other published, unplaced records. The fifteen M1 tools and three Small Utilities repositories remain nested within their original records. Re-running setup preserves existing content. Use a database account limited to this application's database. The application stores a draft, a public snapshot and the latest 100 complete revision snapshots. Export a JSON backup in the admin before substantial edits.

The database driver uses parameterized queries over HTTPS. Saving compares the revision supplied by the editor against the current database revision. A conflict returns HTTP 409 so an older tab cannot overwrite a newer save. History recording and the configuration update share one SQL statement. Public reads return only the last published snapshot and omit every unpublished project, including projects that still have a rack placement.

## Images

Image URLs work without another storage service. Use an existing HTTPS URL, or an absolute site asset path such as `/images/project.png`. The server never fetches submitted URLs.

For browser uploads, create a public Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`. Uploads accept PNG, JPEG, WebP and GIF files up to 3 MiB. The server checks both the media type and the file signature, generates a unique filename and stores a public URL. SVG, HTML and executable content are rejected. Blob files are public immediately after upload, even when referenced by an unpublished draft, so upload only public portfolio media. Removing an image from a page does not delete it from Blob; existing and older revision links remain usable. Manage unused files in the Blob dashboard.

## Local development and Vercel

Run `npm run dev:rack` for the static portfolio and the four API handlers at `http://localhost:3000`. The server binds to the local machine. Without credentials, administration reports the missing setup; local previews cannot publish to the server. `npm run build:rack` still produces the static site in `dist/`.

Vercel uses the existing static build and four Node.js Functions, under the Hobby limit of twelve. The auth route uses an explicit rewrite for its nested Auth.js endpoints. No background process or writable function filesystem is required. Configuration JSON is limited to 1 MiB, and uploads stay below Vercel's 4.5 MB function request limit. Public JSON may be cached for 30 seconds and served stale while refreshing for another 60 seconds, so publishing and unpublishing can take up to 90 seconds to reach every visitor.

Free plans have usage and storage quotas. This implementation does not enable paid plans or create resources. Review the selected providers' current allowances in their dashboards before enabling integrations. Use Vercel's existing abuse controls if public read traffic becomes substantial.

## Data format and API

`concept/rack/schema.js` validates every imported and saved configuration. `default-portfolio.js` creates the bundled seed. Configuration includes `schemaVersion: 1`, `settings`, `racks` and `projects`. Up to seven project racks fit in the main row, leaving ambient cabinets at both ends. Project identity and publication are independent of rack placement. A project owns one `rackUnit`, whose `placement` is either `null` or `{ rackId, startU }`. Rack positions count from U01 at the bottom. A unit of height 3 at U05 occupies U05 through U07. Overlap and rack overflow are rejected.

A nested module may set `projectId` to link to another complete project record. The editor offers a Linked project page selector. Linked records retain their own page theme, sections, sources and optional equipment placement. Renaming a project updates its incoming bundle references; deleting it removes those bundle entries. Unpublishing a child hides its entry in public bundles without removing it from the private draft. References to missing projects and self-references are rejected. The source defaults do not migrate or reset an existing database.

Pages contain a theme and typed `text`, `image`, `gallery`, `code` or `links` sections. The format accepts plain text, safe links, hex colors and predefined fonts/layouts; it has no arbitrary HTML, CSS or JavaScript field.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/portfolio` | Last published configuration and its revision |
| `GET /api/admin` | Owner's draft, revision, published revision, history, capabilities and write CSRF token |
| `PUT /api/admin` | Save `{ config, expectedRevision, message? }` |
| `POST /api/admin` | Publish `{ action: "publish", expectedRevision }` or restore `{ action: "restore", revision, expectedRevision }` |
| `POST /api/media` | Raw image bytes with the matching `Content-Type` |
| `/api/auth/*` | Auth.js GitHub sign-in, callback, session, CSRF and sign-out |

All admin mutations require the `x-csrf-token` from `GET /api/admin`, a valid owner session and the configured site origin. Successful saves return the refreshed admin payload. Configuration validation returns 422, conflicts return 409, unauthorized requests return 401, invalid origins or write tokens return 403, and missing services return 503. Secrets and OAuth tokens never enter public configuration or JSON exports.

## Reference documentation

- [Auth.js core configuration and encrypted sessions](https://authjs.dev/reference/core)
- [GitHub OAuth App creation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Neon serverless driver and parameterized queries](https://neon.com/blog/serverless-driver-ga)
- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
