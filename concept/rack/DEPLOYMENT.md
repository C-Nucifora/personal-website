# Vercel delivery

The production site is the rack portfolio in `concept/rack`. Vercel builds it with `npm run build:rack` and serves `dist` at the domain root. The former Next.js terminal site remains in the repository but is not the Vercel output.

`vercel.json` selects the **Other** framework (`framework: null`) and supplies the build command and output directory. Keep the Vercel project's Root Directory set to the repository root so this configuration is read. Existing security headers are retained. See Vercel's [configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

## Local production preview

```sh
npm run build:rack
python3 -m http.server 4318 --bind 0.0.0.0 --directory dist
```

Open `http://localhost:4318/` on the same machine. Project links use `project.html?project=…`; rack selection uses URL queries. Both load directly on a static host, without a catch-all rewrite. Fonts and Three.js modules ship locally with their license notices; the build does not fetch assets or run the old Next.js prebuild steps.

The build copies runtime HTML, CSS, JavaScript and SVG files, plus the `fonts` and `vendor` directories. It excludes research Markdown and recreates only the repository's ignored `dist` directory. Run it again after editing the rack source. Do not edit generated files.

No Vercel deployment is performed by the build command. Deployment remains a separate action.
