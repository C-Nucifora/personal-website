# Portfolio sources

The portfolio starts with a LiDAR hero and continues into a grouped timeline,
selected work, About and Contact. The timeline and Selected work share the
`featured` list in `content.js`. The UQ Racing page includes the recording
carousel and the project pages retain notes, code, credits and sources.

## Build

```sh
npm run build:site
```

The build writes the portfolio and project pages to `dist/`. Its static pages
and links work without JavaScript. The timeline and recording controls use
JavaScript. Serve recorded playback over HTTP with the headers below.

`site.html` and `site.css` hold the homepage and portfolio styles.
`content.js` supplies the portfolio copy and data. `views.js` renders the
pages. The hero styles and timeline renderer are shared with the earlier
Sweep and Channels studies. Run `npm run build:identity` for local copies of
those studies under `dist/identity/`.

## Links

- Sweep: `#work-<id>` opens that project row. Each project page links back there.
- Portfolio: `#<id>` jumps to a project entry. Each project page links back to its entry in Selected work or Other projects.
- Channels: `#<id>` selects that project tab, and `#YYYY-MM` (for example `#2025-06`) sets the timeline month. Moving the cursor or choosing a project updates the shared link without adding a history entry. The range input takes arrow keys, Page Up and Down, Home and End. Pressing or dragging on the chart also moves it. The Zoom slider changes the visible span. Drag the highlighted window in Timeline overview, or scroll sideways over the plot, to pan. Shift-scroll also pans and Alt-scroll zooms around the pointer. Fit restores the full span. Compact reduces track heights and Channels sets which tracks and readout groups are visible.

## Edit the timeline and featured projects

In `content.js`, `groups` sets the timeline's group order, names, colours
and experience categories. To add an event, give it an ID, group, title,
summary and `start: [year, month]`. A missing end marks a milestone,
`end: [year, month]` sets an inclusive end and `end: null` keeps it open.
Events that overlap use separate tracks inside their group.

Edit `featured` to choose which projects appear in the portfolio timeline
and Selected work. The rest automatically go in Other projects. Project milestones
use GitHub repository creation dates.

## Build the hero with the recorded scan

Point the build at the verified Foxglove export:

```sh
SWEEP_RECORDING_DIR=/home/christian/Downloads/personal-site-lidar npm run build:identity -- sweep
SWEEP_RECORDING_DIR=/home/christian/Downloads/personal-site-lidar npm run build:site
```

The build copies `manifest.json`, `lidar.bin.br`, `paths.json.gz` and
`decode.mjs` to `recording/` in each site that has the hero
(`dist/` for the portfolio). If `cones.json.gz`
is present, the build checks its timestamps against the cloud manifest and
copies it alongside the other assets. The source export stays outside Git.

The portfolio starts the roughly 80 MB download on the first scroll through the
hero. The hero stays in view while scrolling scrubs through complete frames
as they arrive. With reduced motion enabled, the hero uses a Play button.
The portfolio replays start on Play. The UQ Racing page
(`uq-racing.html#recordings`) features an inline carousel that draws a
recorded scan for the selected run in the active theme. The build
prefers a scan with visible blue and yellow cones and a recorded planner path
and exports its still and matching overlays. Full playback data loads
on Play. The player has a frame seek control and fullscreen where supported.
Without `SWEEP_RECORDING_DIR`, the hero builds the simulation and omits the recordings.

Serve the recorded build over HTTP. Set these headers on the compressed
assets, relative to the site root, so the browser handles decompression:

| Asset | Content-Type | Content-Encoding |
| --- | --- | --- |
| `recording/**/*.bin.br` | `application/octet-stream` | `br` |
| `recording/**/*.json.gz` | `application/json` | `gzip` |

The cone overlay also works when served as a plain gzip file.
For browsers that omit Brotli from `Accept-Encoding`, the preview server can
transcode a cloud response to gzip, or mark a decoded response with
`Content-Encoding: identity`. Vary the response on `Accept-Encoding`.

Serve `.mjs` as `text/javascript`. Opening the build directly from disk shows
the static content and recorded still.

The homepage clip retains all 210 frames and 9,526,675 XYZ samples from the
September 30, 2026 clip. Timed playback uses the original timestamp
intervals, pauses off screen and draws every frame in order. The camera displays
points in the visible part of the sensor frame. Each cloud's inverse
`mapFromLaserRowMajor` transform brings both recorded planner paths into
that frame. The source mapped clouds and corrected poses differ by up to
0.73 m per coordinate, and the point clouds have no per-point deskew. The
path overlay is approximate. Cone overlays are indexed by scan timestamp
and projected into its sensor frame. Recorded map markers can supply the
blue and yellow classes where a verified pose is available.

Include `cones-observed.json.gz` with the same frame and timestamp schema
to use the exact LiDAR-frame detector marker positions. A recorded map
colour transfers only for a unique one-to-one match within 0.25 m in XY on
the same scan. Other measured markers render grey. Map-only positions are
omitted from runs with measured markers.

### Add a recording

Put each verified export in `$SWEEP_RECORDING_DIR/runs/<id>/`. Add an entry
to `$SWEEP_RECORDING_DIR/runs.json`, an array of objects with an `id`,
`title` and `description`. The build adds a slide to the UQ Racing carousel
and a standalone page at `lidar-<id>.html`. The older `lidar.html` URL also
opens the UQ Racing carousel.

Each run uses the same `manifest.json` format and shared decoder. For
segmented exports, replace the manifest's `data` field with `chunks`, an
ordered list of `.bin.br` filenames. Each frame has a zero-based `chunk`
index and a byte offset within that chunk. The player fetches the segment
needed for the current position and preloads its successor. Include
`paths.json.gz` and `cones.json.gz` when the recording supports them.
All data stays outside Git.

### Vercel

`npm run build:vercel` writes the portfolio to `dist/` at the domain root.
Previous `/combined/` links redirect to their root-level equivalents.
`vercel.json` sets Brotli and gzip response headers for recordings and
disables automatic Git deployments until launch. Browsers fetch compressed
chunks on demand.

For a Vercel deployment with recordings, upload the derived replay files to
a private Blob store under a versioned prefix, keeping their directory
structure. Include the homepage `manifest.json`, `lidar.bin.br` and
`decode.mjs`, the `runs.json` catalog, and each listed run's manifest, chunks
and available path and cone overlays. An optional `recording-poster.webp`
at the bundle root provides the hero's still. Exclude original MCAP bags
and logs.

Set `SWEEP_RECORDING_BLOB_PREFIX` to the release prefix and
`SWEEP_RECORDING_BLOB_TOKEN` to the private store's token in the
deployment environment. The build streams the assets into a temporary
directory, validates them and includes the replays in the static output.
Recording URLs use the same access settings as the site. Without a
recording source the build displays the simulation.

Use `SWEEP_RECORDING_DIR` with the same build for a local check of the assets
and routes before uploading.

## Type scales

The portfolio uses [Barlow by Jeremy Tribby](https://tribby.com/fonts/barlow/) across
the navigation, caption, timeline, Work and project pages. Regular and semibold
use the standard width. The hero name uses Barlow Condensed ExtraBold. Code uses
the system monospace. The three Latin WOFF2 files come from Google Fonts and
are served locally with the SIL Open Font License.

The standalone prototypes use the scales below.

| Token       | Sweep (Bricolage Grotesque)         | Channels (Archivo)                                |
| ----------- | ----------------------------------- | ------------------------------------------------- |
| `--small`   | 0.875rem: captions, dates, facts    | 0.875rem: notes, facts, stages                    |
| `--body`    | 1.0625rem: text, nav, headings      | 1.0625rem: text, nav, headings                    |
| `--heading` | 1.375 to 1.75rem: lede, rows, email | 1.5 to 2.25rem: project name, month, email |
| `--display` | 3.1 to 9.5rem: the name             | 2.375 to 5.25rem: the name                        |

Channels also has `--label` (14 SVG units) for every chart label.

Weights: Sweep uses 400 and 650, plus 720 for the name. Channels uses 400, 650 and 800. Widths: Sweep sets the name at `wdth` 76 and project names and email at 80. Channels uses 125% for the name, project names and email, and 72% for labels, nav and readouts.

## Content and claims

`content.js` adapts `../rack/software-content.js`, `../rack/experience-content.js` and `../rack/sources/software-sources.json`. Dates come from the August 2026 LinkedIn snapshot. Roles listed as current then are shown as current as of that snapshot, and Channels dashes them after August 2026.

- M1 Toolchain and Islet credit co-development with Ned Lane. M1 is described as independent community work with no MoTeC affiliation.
- UQ Racing is described as a team contribution to perception and electrical work. The experience text describes team contributions.
- Project flows (`path`) and notes paraphrase each README at the linked commit.
- The hero caption (`scan` in `content.js`) identifies the recorded and simulated builds.
- Project pages reuse the same content. They add no copy beyond navigation labels.
- `personal-website` (the rack itself) and the reserved hardware placeholder are left out on purpose.

## Palettes

**Sweep.** Petrol `#0b1f2a` scan field, mist `#edf1ee` reading ground, ink `#0f2430`, slate `#536873`, and Formula Student cone colours: blue `#3d8bff` for the left edge, yellow `#ffd43b` for the right. The scan is the only ambient motion. Project rows deep-link as `#work-<id>`.

**Channels.** Cool paper `#eef3f6`, grid `#cbd8e1`, ink `#132033`, plus one colour per channel: school `#7a5cc2`, study `#1f5fd6`, work `#0e9f75` and team `#e5452f`. Projects use an ARIA tab list and deep-link as `#<id>`. Choosing a project runs a signal once along its chain.

## Behaviour and checks

- Responsive from 320 px upward with no horizontal overflow, checked at 320, 390 and 1440 px in headless Chromium.
- Visible focus styles and a skip link on every page.
- `prefers-reduced-motion`: The simulated Sweep draws a still and hides its pause control. Recorded Sweep starts on Play. Channels skips the signal animation, and smooth scrolling is off.
- Sweep pauses playback while its hero is off screen or paused.
- The portfolio uses Sweep's type and colours inside the hero and Channels' below it.
