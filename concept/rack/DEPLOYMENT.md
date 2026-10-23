# Vercel delivery

The production site is the rack portfolio in `concept/rack`. Vercel runs `npm run build:rack` and serves `dist` at the domain root, alongside the four Node.js functions in `api`. The older Next.js application stays in the repository and is excluded from this build.

## Project settings

Keep Root Directory at the repository root. `vercel.json` selects the Other framework, supplies the build command and sets `dist` as the output directory. The root `package.json` pins `engines.node` to **24.x**, matching CI and selecting Vercel's build and function runtime. Keep Node.js **24.x** in Build and Deployment settings too. See [project configuration](https://vercel.com/docs/project-configuration/vercel-json) and [supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

No connection, provisioning, push or deployment is part of the local build. When deployment is approved, import this repository using those settings. Deploying the public site does not require database or OAuth credentials. Without configured storage it uses the bundled portfolio; a configured storage outage displays an error rather than silently replacing published edits with bundled content.

## Hobby hosting and administration

This personal portfolio uses four functions, below Hobby's limit of twelve for a non-framework project. Each function has a 30-second execution limit. Hobby is for personal, non-commercial use and has usage limits. See [Hobby](https://vercel.com/docs/plans/hobby) and [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).

Persistent administration needs a PostgreSQL database and GitHub OAuth credentials. Neon can be provisioned separately or through Vercel Marketplace; its plan and limits are separate from Vercel's. Blob uploads are optional, and existing HTTPS image URLs work without Blob. Follow [ADMIN.md](../../ADMIN.md) for owner authentication, environment variables and `npm run db:setup`. Vercel's [storage documentation](https://vercel.com/docs/storage) covers the available services.

Set production credentials only in the Production environment. An administrative preview deployment needs its own matching `SITE_URL`, OAuth callback and isolated database. Do not point preview administration at the production database. GitHub's callback URL is `https://YOUR-DOMAIN/api/auth/callback/github`; the rewrite maps nested authentication paths to the single `api/auth.mjs` function.

The functions import shared portfolio validation and bundled content from `concept/rack`. Their `includeFiles` list includes the three authored content maps as well as the seed's other dependencies. These explicit entries matter because Vercel's file tracer does not resolve the browser-version query strings in shared imports. It also includes `concept/rack/package.json`, whose `type: module` declares these shared `.js` files as ES modules without changing the earlier application's root module type. The static build excludes this package metadata.

## Local checks

```sh
npm ci
npm run build:rack
npm run dev:rack
```

Open `http://localhost:3000/`. The development server binds to loopback and runs the same API request handlers. With no credentials, public bundled content and the admin's local draft preview work; sign-in and persistent writes remain unavailable. It serves source files with `no-store`, so edit `concept/rack` rather than `dist`.

For an artifact-only preview, run:

```sh
python3 -m http.server 4318 --bind 127.0.0.1 --directory dist
```

That server has no API and does not apply Vercel's security headers. Use `dev:rack` to check authentication configuration errors and header-sensitive draft previews. A local check cannot verify Vercel's actual deployment routing, OAuth callbacks or storage credentials.

Project links use `project.html?project=…`; rack and tool selection use queries and hashes. Reading pages and `/admin.html` load directly without a catch-all rewrite. Browser modules, fonts, Three.js and both finishes' texture maps ship locally with their source and license notices. The build copies runtime assets into a fresh ignored `dist`, excludes research Markdown and provenance directories, and makes no network requests or legacy Next.js prebuild calls. Dependency installation still needs the npm registry or a populated cache.

## Headers and release checks

Common responses keep `nosniff`, strict-origin referrer policy and disabled camera, microphone and location access. The homepage and API paths reject framing. `/admin.html` and `/project.html` permit same-origin frames so the admin can render an actual draft page inside its preview iframe; other origins remain blocked. The local server uses the same framing rules.

Static delivery uses Vercel's default revalidation policy. Public portfolio reads have a short shared-cache lifetime; private administration and error responses use `no-store`. Do not add immutable caching to unversioned HTML or administration responses. See [cache-control headers](https://vercel.com/docs/caching/cache-control-headers).

Before switching the production domain, check the actual deployment's direct reading URL, Text view, 3D entry and return, owner sign-in, draft preview, save, publish and restore. Check the framing headers on `/`, `/admin.html` and `/project.html`, and confirm API errors are not cached. Live OAuth and database checks require the configured deployment; passing local checks does not establish those integrations.
