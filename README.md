# Christian Nucifora

Sources for Christian Nucifora’s portfolio. The homepage includes the LiDAR
hero, timeline and selected work. UQ Racing’s recordings are available from
`/uq-racing.html#recordings`.

## Build locally

```sh
npm run build
python3 -m http.server 4318 --bind 127.0.0.1 --directory dist
```

The build writes the site to `dist/`. For recorded playback, set
`SWEEP_RECORDING_DIR` to the verified replay export and use a server that sends
the encoding headers described in the [recording notes](concept/identity/README.md#build-the-hero-with-the-recorded-scan).

## Deployment

Vercel runs `npm run build:vercel` and serves the portfolio at the domain root.
The build can load a versioned replay bundle from private Blob storage.
See the [Vercel setup](concept/identity/README.md#vercel) for the build variables.
Git-triggered deployments are disabled until launch.

CI checks lint, types, tests and the Vercel artifact with Node.js 24.
