# Portfolio datacenter

A local, static 3D portfolio for Christian Nucifora. The entrance looks down a datacenter aisle. Three selectable cabinets hold Software, Hardware and Experience. Ordinary navigation and text views provide the same content alongside the spatial interface.

## Run and deploy

```sh
npm run build:rack
python3 -m http.server 4318 --bind 0.0.0.0 --directory dist
```

The build copies runtime assets and required licenses to `dist/`. Vercel is configured to build and serve that directory at the root URL, including query-based rack selection and full record pages. The previous Next.js terminal application remains in the repository but is not the Vercel entry point. See [deployment notes](DEPLOYMENT.md). No runtime CDN, API, font service or server process is required.

During development, `concept/rack` can also be served directly on port 4314. A localhost link only reaches the machine running the server; this workspace's private network address is used for cross-device previews.

## Content and story

Each cabinet occupies 24U. Unit heights express the breadth of the material, not measured professional impact or a real hardware deployment.

- Software contains twelve projects, including the fifteen-repository M1 bundle.
- Hardware contains two team-attributed UQ Racing engineering summaries and a clearly marked project placeholder.
- Experience contains three roles, two education records and a personal-story placeholder.

The introductory copy connects engineering and computer science study, UQ Racing contribution and software projects. Dates and role details come from the previously approved LinkedIn snapshot of 30 August 2026. Live LinkedIn returned HTTP 429 during this work. No missing accomplishment, subsystem ownership, degree completion or result was inferred. The July 2029 university date is expected completion.

`collections.js` owns the hardware, experience and placeholder records; it imports software from `catalog.js`. [Content notes](CONTENT.md) record exact source authority and how to replace the placeholders. `index.html` includes a static snapshot of all twenty-one records, so update that snapshot when changing content. Missing external sources stay absent.

## Spatial interaction

Select a cabinet in the aisle or use Software, Hardware or Experience in the header. Its record list matches its actual units. Selecting a unit first extracts the enclosure, then focuses the camera. The engraved lid links to its full local page. Escape or the rack return action reverses selection. Zoom and Front view remain available in the relevant steady views. Datacenter returns to the aisle.

After opening M1 Toolchain, select one of its fifteen carrier faces or use its Pull out button in the repository list. One carrier slides forward another 1.35 units. Selecting another returns the previous carrier first. The sidebar then shows that tool's actual description, group, local page and GitHub link. Clicking its extracted face opens the module page. Return module, the M1 back action or Escape closes the carrier before returning the outer enclosure.

`project.html?project=<id>` shows a full record. `project.html?project=m1-toolchain&module=<module-id>` shows an individual tool. Invalid module IDs show the parent bundle; invalid project IDs offer all records. Modified clicks and ordinary source links retain normal browser behavior. Legacy individual M1 hashes still resolve to the bundle.

## Environment and construction

The aisle contains three detailed cabinets and fifteen ambient cabinets. Opposing equipment fronts, sixteen covered cable-management joins, raised-floor grilles, repeated ceiling fixtures, ladder trays, cable bundles and an end portal establish the datacenter space. [Datacenter references](DATACENTER.md) record the inspected primary photographs and layout guidance. All geometry is authored; reference photos are not shipped.

The original hardware anatomy remains tied to each software project. Wavelength retains a navy audio processor; mountd uses storage trays; M1 uses fifteen independent plug-in carriers. Hardware and experience records use illustrative instrument enclosures and document drawers. They are interface objects, not photographs or claimed reproductions of Christian's actual designs. [Hardware references](HARDWARE.md) document the procedural references.

A geometry audit aligned the lid, floor, sidewalls and fascia with overlapping seams. All case lids stay closed, including inactive cabinets. M1's labels, screws and ejectors move with their own carriers. Deliberate vent apertures, module clearances and service seams remain, with closed backing rather than accidental holes.

## Rendering and interface

The interface keeps the user's neutral charcoal, off-white and copper palette. Green and olive casts are removed from lighting, materials, displays and labels. The rack environment provides the imagery; the HTML uses restrained reading columns, native links and direct labels. [Interface notes](INTERFACE.md) and the [checklist](CHECKLIST.md) record the design decisions.

Three.js r180 is vendored locally under MIT. IBM Plex Sans and Plex Mono are self-hosted under SIL OFL 1.1. Exact font URLs and notices remain in `fonts/`; Three's notice remains in `vendor/`. No new dependency was added.

Native MSAA, Neutral tone mapping, filtered reflections, broad roughness grain and a bounded 2x/6.5-million-pixel drawing buffer remain. Inactive racks use smaller text/engraving bitmaps; the inspected rack retains full texture resolution. Rendering runs on demand, pauses while hidden and follows reduced-motion preferences. The camera fits transformed rack geometry and bounds zoom within the aisle. [Rendering research](RENDERING.md) and the [aliasing follow-up](QUALITY.md) preserve the earlier investigations.

## Verification

Temporary checks cover all twenty-one records, three 24U totals, unique IDs, local assets, matching versioned imports, source retention and placeholders. Geometry checks at active and inactive texture scales cover finite vertices and bounds, fifteen module targets, 756 enclosure seam rays, 180 carrier closure rays and resource disposal. The ambient hall remains ten merged meshes.

Browser review covers the aisle, three rack routes, physical collection/unit/engraved clicks, ordinary project pages, mobile navigation, no-JavaScript records and keyboard access. Individual module review covers extraction, switching, return, module pages, reduced motion and the idle frame loop. The production artifact is checked independently of the source server. Physical Safari, real touch gestures and device GPU frame times remain unmeasured.

Resolved design context: `personal` / `personal-website`, no warnings. The current explicit datacenter, nested-module and neutral-color briefs take precedence over historical PCB and terminal records. This README owns the prototype decisions. No reliable last-push record exists for this branch; signed local commits use this session within the past-day fallback window. No push or public deployment is part of this local work.
