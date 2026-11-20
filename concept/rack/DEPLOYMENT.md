# Archived rack deployment

These instructions describe the earlier rack build. The current Vercel
configuration deploys the [portfolio](../identity/README.md#vercel) at the
domain root. Use `npm run build:rack` to build the rack locally.

For the old Vercel routing and function configuration, see
[the rack's original build settings](https://github.com/C-Nucifora/personal-website/blob/33f818890062e5db68660606df52bc6defa92122/vercel.json).
[ADMIN.md](../../ADMIN.md) covers OAuth, database setup and owner access.

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
