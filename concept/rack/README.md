# Portfolio datacenter

A local, static 3D portfolio for Christian Nucifora. Software, Hardware and Experience occupy the middle of a foreground cabinet row, with neighboring equipment on both sides. The page opens close to the software rack. Deeper rows provide the datacenter background. Ordinary navigation and text views provide the same content alongside the spatial interface.

## Run and deploy

```sh
npm run build:rack
python3 -m http.server 4318 --bind 0.0.0.0 --directory dist
```

The build copies runtime assets and required licenses to `dist/`. Vercel is configured to build and serve that directory at the root URL, including query-based rack selection and full record pages. The previous Next.js terminal application remains in the repository but is not the Vercel entry point. See [deployment notes](DEPLOYMENT.md). No runtime CDN, API, font service or server process is required.

During development, `concept/rack` can also be served directly on port 4314. A localhost link only reaches the machine running the server; this workspace's private network address is used for cross-device previews.

## Content and story

Each cabinet occupies 24U. Unit heights express the breadth of the material, not measured professional impact or a real hardware deployment.

- Software contains six visible units: M1 Toolchain, Wavelength, Islet, nvim-stm32, mozaproxy and Personal Projects. They occupy 20U, with four blank U below. Personal Projects groups CI Runner Console, Artifact Platform, Personal Website, Reconcile, mountd, Photos Downloader and Small Utilities behind a four-unit, eight-bay storage front. Seven drives are labelled and one is spare. The seven records remain individually editable, published and unplaced; their own pages and sources are preserved. M1 keeps its fifteen carriers and Small Utilities keeps its three repository links.
- Hardware contains two team-attributed UQ Racing engineering summaries and a clearly marked project placeholder.
- Experience contains three roles, two education records and a personal-story placeholder.

The introductory copy connects engineering and computer science study, UQ Racing contribution and software projects. Dates and role details come from the previously approved LinkedIn snapshot of 30 August 2026. Live LinkedIn returned HTTP 429 during this work. No missing accomplishment, subsystem ownership, degree completion or result was inferred. The July 2029 university date is expected completion.

`catalog.js` retains all original software records and defines the curated software row. `bundled-collections.js` adds the hardware, experience and placeholder records; `default-portfolio.js` seeds 22 project records with 15 physical units across three racks. `collections.js` reads the published portfolio. [Content notes](CONTENT.md) record exact source authority and how to replace the placeholders. The current index is generated from that published document. Missing external sources stay absent.

## Spatial interaction

The home page opens at the software rack with the introduction alongside it. Select a unit directly, select a neighboring content cabinet, or use Software, Hardware or Experience in the header. Rack changes reuse the current document, renderer and models; their URLs still work directly and with browser history. Each collection's record list matches its actual units. Selecting a unit first extracts the enclosure, then focuses the camera. A recessed display in the front-right corner of the lid shows the actual prepared project page. Opening it zooms into that display, then expands the same document into the reading view without a navigation reload. Escape or the rack return action reverses selection. Zoom and Front view remain available in the relevant steady views. Datacenter returns to the close home view; Reset stays at the current rack.

After opening M1 Toolchain, select one of its fifteen carrier faces or use its Pull out button in the repository list. One carrier slides forward another 1.35 units. Selecting another returns the previous carrier first. The sidebar then shows that tool's actual description, group, local page and GitHub link. Clicking its extracted face opens the module page. Return module, the M1 back action or Escape closes the carrier before returning the outer enclosure.

The header Help button opens the visible native Controls and keyboard shortcuts disclosure. Left and right choose racks; up and down choose projects in the index. Enter opens the chosen unit, then enters its full page from the preview. Escape closes open help, returns a module, then returns the parent unit. Home and End choose the first and last project. These shortcuts apply to the rack and index context; normal links, buttons and form controls keep their own behavior. Tab reaches every native action, including all M1 pull-out buttons. The question-mark shortcut opens help only while a navigation component has focus.

Text view hides the spatial view and uses the same index and record content, with immediate state changes. It does not require canvas interaction. Reduced motion skips camera travel. Project entry can be cancelled before navigation; returning from a completed entry leaves the scene interactive. The prepared reader updates the real project URL through browser history. Back, Escape and the rack return link restore the selected enclosure and carrier. Direct visits, text-view entry, failed preparation and modified clicks retain ordinary project URLs. The rack display and direct route use the same scoped content renderer; project.html and its stylesheet are prepared when a bay is first selected.

`project.html?project=<id>` shows a full record. `project.html?project=m1-toolchain&module=<module-id>` shows an individual tool. Invalid module IDs show the parent bundle; invalid project IDs offer all records. Modified clicks and ordinary source links retain normal browser behavior. Legacy individual M1 hashes still resolve to the bundle.

Project reading pages have subject-specific authored SVG illustrations in `project-art.js`. Wavelength uses audio hardware, M1 its fifteen carriers, nvim-stm32 embedded circuitry, and the other software projects their own interface or system subject. Their content shares a readable layout. The illustrations are decorative and do not replace descriptions, facts or actions. Hardware diagrams are explicitly illustrative; experience remains a record and missing content stays reserved. This adds no per-project 3D renderer or external art request. M1's reading list links to the local module pages and retains separate GitHub sources.

## Environment and construction

The main row contains the three detailed cabinets and flanking ambient cabinets. Repeated rows behind it, covered cabinet joins, raised-floor grilles, ceiling fixtures, ladder trays and cable bundles establish the datacenter space. Background equipment has no project navigation. [Datacenter references](DATACENTER.md) record the inspected primary photographs and layout guidance. All geometry is authored; reference photos are not shipped.

The original hardware anatomy remains tied to each software project. Wavelength retains a navy audio processor; mountd uses storage trays; M1 uses fifteen independent plug-in carriers. Hardware and experience records use illustrative instrument enclosures and document drawers. They are interface objects, not photographs or claimed reproductions of Christian's actual designs. [Hardware references](HARDWARE.md) document the procedural references.

These are procedural Three.js models, not GLB imports. `model.js` builds enclosures, extruded lids, screws, controls and carriers from geometry and generated canvas textures. Moving units and M1 carriers have their own groups and hit targets. `datacenter.js` builds the ambient equipment and room, merging repeated parts by material. Dimensions, materials and construction details remain editable in those modules.

`RACK_SLOTS` in `datacenter.js` names the three stable content positions. The room reservations and scene model placement read the same anchors, so changing a cabinet model does not require inventing a second coordinate layout.

A geometry audit aligned the lid, floor, sidewalls and fascia with overlapping seams. All case lids stay closed, including inactive cabinets. M1's labels, screws and ejectors move with their own carriers. Deliberate vent apertures, module clearances and service seams remain, with closed backing rather than accidental holes.

Each chassis now has rack-fixed outer rails, half-travel intermediate carriages and chassis-mounted inner runners. Bearing strips, stops, mounting ears, captive screws, cage clips and locating pins provide visible support. The rail members retain overlap at full service extension. M1 ejectors pivot around hinge pins while their carriers stay rigid. `updateMechanisms()` keeps these parts aligned on every draw and after a rack change. The room's front cabinets have leveling feet and rubber pads, deeper supply grilles and service-panel hardware. Painted steel, bare metal and rubber have separate material responses.

`motion.js` advances critically damped springs for chassis travel, carrier travel and the camera. Velocities carry across interruptions; rail stops bound translation and absorb outward momentum. Camera approach overlaps the pull-out. Springs settle to exact endpoints, stop requesting frames at rest and snap under reduced motion. The animation follows constrained mechanical travel.

## Rendering and interface

The interface keeps the user's neutral charcoal, off-white and copper palette. Green and olive casts are removed from lighting, materials, displays and labels. The rack environment provides the imagery; the HTML uses restrained reading columns, native links and direct labels. [Interface notes](INTERFACE.md) and the [checklist](CHECKLIST.md) record the design decisions.

Primary project names use bold Plex Sans on solid nameplate fields. The 1U controls leave clear title areas; the NVIM instrument and M1 upper rail sit below their headers. M1 carrier IDs use larger bold Plex Mono. Long engraved titles fit into at most two complete lines beside the inset lid screen. Large Software, Hardware and Experience wayfinding markers lie flat on the floor in front of their named racks, clear of cabinet fronts and supply grilles. These fixed, depth-tested planes retain their floor orientation when the camera moves, with matching native navigation outside the 3D scene. Small technical markings remain secondary to those signs and the readable project index.

Three.js r180 is vendored locally under MIT. IBM Plex Sans and Plex Mono are self-hosted under SIL OFL 1.1. Exact font URLs and notices remain in `fonts/`; Three's notice remains in `vendor/`. No new dependency was added.

Native MSAA, Neutral tone mapping, filtered reflections, broad roughness grain and a bounded 2x/6.5-million-pixel drawing buffer remain. All three racks are built at full texture resolution once. Their textures are uploaded and materials compiled during initial preparation, so changing racks does not recreate geometry, fetch assets or compile newly selected materials. Initial page preparation still takes time. Rendering runs on demand, pauses while hidden and follows reduced-motion preferences. The camera fits the selected foreground rack and bounds zoom and rotation within its inspection space. There is no distant entrance camera. [Rendering research](RENDERING.md) and the [aliasing follow-up](QUALITY.md) preserve the earlier investigations.

## Surface finish comparison

The main preview defaults to the sourced `realistic` finish. Use `?finish=simple` for the quieter roughness-only finish, or `?finish=realistic` explicitly. Both current preview ports, 4318 and 4320, serve this curated revision with realistic as the default. The original texture comparison is preserved in its isolated worktree. Both presets keep the same geometry, nameplates, published content, navigation and drawing-buffer limit.

`finishes.js` owns the shared surface maps and material settings. `createRackScene({ finish: 'simple', ... })` selects the simple preset explicitly; omitting it selects realistic. Scene creation is now asynchronous; callers await `createRackScene`. Maps load once, before model construction, texture upload, shader preparation and `onReady`. Every published resident rack and the room reuse the same texture instances. Models dispose their own generated lettering, materials and geometry; the scene disposes shared finish maps once. Upload or shader-preparation failure releases the initialized scene and shared maps. Admin roughness scales the bare-metal map bounds before upload, so both darker and rougher settings work across the full control range. Metalness scales the bare-metal preset. Their defaults of 0.5 and 1 preserve preset values; painted steel, floor and plastic retain their physical settings.

The six unmodified 1024px JPEG files in `textures/` come from ambientCG under CC0 1.0. `textures/manifest.json` retains exact source URLs, upstream archive hashes, runtime hashes, dimensions and byte counts; `NOTICE.txt` and `CC0-1.0.txt` retain provenance and license. Research archives, previews and unused color maps are excluded. Realistic loads six maps, 5,093,602 bytes and about 32 MiB of RGBA8 texture memory with mipmaps. Simple loads three roughness maps, 1,869,532 bytes and about 16 MiB. These estimates cover only the new surface maps, not the existing labels, environment, shadow map or render buffers.

Roughness and OpenGL normal maps use `NoColorSpace`. Before upload, JPEG roughness samples are remapped into bounded physical ranges. This avoids accidentally glossy paint caused by multiplying the source's dark roughness values. Each map uses metric `uv1`; authored color and lettering stay on their original UV channel. Metal tiles span two scene units, powdercoat one and floor six. Repeat wrapping, mipmaps and at most 8x anisotropy filter distant detail. No displacement, extra geometry or larger canvas textures were added.

| Surface | Metalness | Realistic roughness range | Simple roughness range | Realistic normal scale | Environment intensity |
| --- | --- | --- | --- | --- | --- |
| Satin bare metal, Metal032 | 0.85 | 0.38 to 0.55 | 0.50 to 0.58 | 0.16 | 0.9 |
| Painted steel, Metal029 | 0.04 | 0.56 to 0.73 | 0.66 to 0.74 | 0.12 | 0.65 |
| Neutral raised floor, Concrete048 | 0 | 0.80 to 0.94 | 0.86 to 0.94 | 0.075 | 0.22 |
| Rubber and molded controls | 0 | 0.92 | 0.92 | None | 0.25 |

The ranges are bounds, not measured material values; each source's actual sample distribution occupies part of its range. Realistic paint uses a restrained 0.12 clearcoat with 0.6 clearcoat roughness. Simple has no clearcoat or normal maps. Etched lid tops retain their authored bump relief and use the shared roughness map; their rims and chassis retain NormalGL. Rubber stays smooth and matte. Existing neutral base colors are preserved. No beige concrete color, green lighting, emission effect or grunge is introduced.

The local PMREM strip-card reflection environment and shadow lights are retained. Realistic lowers hemisphere intensity from 0.8 to 0.65 and front fill from 0.75 to 0.55 for more separation between paint, metal and recesses. The key shadow light and bounded 2048px shadow map remain. No HDRI, loader, CDN or dependency was added.

The isolated finish implementation received independent checks of asset hashes, packaged copies, finite UVs on every mapped mesh, exact shared texture counts and one-time disposal. Its lid-relief finding was fixed and rechecked. That isolated T3 preview inspected both overviews, confirmed six realistic maps and three simple roughness maps, and observed the same canvas and WebGL context with zero additional resource requests across realistic rack changes. Realistic extraction reached its settled 4.42-unit position with the real page display prepared. Extraction screenshots timed out twice at 15 seconds in the native preview. The preview reports no parallel shader compilation extension; initialization still compiles all resident materials before readiness. Physical Safari and hardware GPU timing remain unverified.

## Verification

Earlier temporary checks covered the original twenty-one records, three 24U totals, unique IDs, local assets, matching versioned imports, source retention and placeholders. Geometry checks at active and inactive texture scales cover finite vertices and bounds, fifteen module targets, 756 enclosure seam rays, 180 carrier closure rays, 168 rail poses, 276 primary text bounds and resource disposal. The environment uses eleven merged meshes and three floor-label planes. Twenty independent review scopes cover mechanics, motion, navigation, content, accessibility and delivery. Their findings include interrupted module returns, skip-link routing, focus recovery, visible cage clips, pad contact and label disposal; each fix receives a focused recheck. Spring checks cover 30, 60, 120 and irregular frame rates, reversals, hidden tabs, stale frame timestamps, cancellation and reduced motion.

Browser review confirms the close front row, unchanged document/canvas/WebGL context and zero resource requests across rack changes. The final 320px pass checks Help, arrows, Enter, Escape, hidden text-view stages, skip-link selection, module focus return and recovery after real WebGL context loss. The extracted M1 enclosure and a further-extracted carrier were visually inspected with reduced motion. Earlier browser checks cover normal deep entry and Back; current-source state checks cover entry cancellation and interrupted module returns. Hosted preview tools stalled during animated extraction in the final physical pass, so real-time smoothness remains unmeasured. The earlier mechanics pass inspected a static no-JavaScript content snapshot and its 29-file production artifact. The current API-backed published inventory requires JavaScript, with a 2D index available without WebGL; that earlier artifact count does not describe the current build. Physical Safari, assistive technology, real touch gestures and device GPU frame times remain unverified.

Resolved design context: `personal` / `personal-website`, no warnings. The current explicit datacenter, nested-module and neutral-color briefs take precedence over historical PCB and terminal records. This README owns the prototype decisions. No reliable last-push record exists for this branch; signed local commits use this session within the past-day fallback window. No push or public deployment is part of this local work.

Published racks use the fixed front row on six-unit centres, with ambient cabinets on both flanks. Even rack counts use the nearest centre on that grid rather than shifting between cabinet positions. Up to seven project racks fit in this row; rear rows remain ambient equipment.

The public runtime loads only the published API document. While it loads, bundled records are hidden. A configured storage failure shows an unavailable state without restoring the bundled catalog. With JavaScript disabled, the page explains that JavaScript is needed for the current published inventory; the accessible 2D index remains available without WebGL.

The combined admin and material build produces 50 static files. Source parity, JavaScript syntax, 99 local references, all six CC0 map hashes and one runtime cache identifier are checked. The final native preview confirms the simple maps load and rack switching keeps its canvas/context with zero requests. Prepared M1 entry retains its document, canvas and reader article, adds zero requests, and focuses the project content. Browser animation timing and physical Safari remain unmeasured.

The curated catalog preserves every existing canonical project URL and source. Bundle modules may set an optional `projectId` to open a full project record. Unpublished linked projects are removed from public bundle lists, while their draft records remain editable. Linked children are omitted from the directory's More work list unless separately placed in a rack. Existing configured database documents are not reset by this source default change.
