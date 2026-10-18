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

- Software contains twelve projects, including the fifteen-repository M1 bundle.
- Hardware contains two team-attributed UQ Racing engineering summaries and a clearly marked project placeholder.
- Experience contains three roles, two education records and a personal-story placeholder.

The introductory copy connects engineering and computer science study, UQ Racing contribution and software projects. Dates and role details come from the previously approved LinkedIn snapshot of 30 August 2026. Live LinkedIn returned HTTP 429 during this work. No missing accomplishment, subsystem ownership, degree completion or result was inferred. The July 2029 university date is expected completion.

`collections.js` owns the hardware, experience and placeholder records; it imports software from `catalog.js`. [Content notes](CONTENT.md) record exact source authority and how to replace the placeholders. `index.html` includes a static snapshot of all twenty-one records, so update that snapshot when changing content. Missing external sources stay absent.

## Spatial interaction

The home page opens at the software rack with the introduction alongside it. Select a unit directly, select a neighboring content cabinet, or use Software, Hardware or Experience in the header. Rack changes reuse the current document, renderer and models; their URLs still work directly and with browser history. Each collection's record list matches its actual units. Selecting a unit first extracts the enclosure, then focuses the camera. The engraved lid enters its full local page through a deeper camera move. Escape or the rack return action reverses selection. Zoom and Front view remain available in the relevant steady views. Datacenter returns to the close home view; Reset stays at the current rack.

After opening M1 Toolchain, select one of its fifteen carrier faces or use its Pull out button in the repository list. One carrier slides forward another 1.35 units. Selecting another returns the previous carrier first. The sidebar then shows that tool's actual description, group, local page and GitHub link. Clicking its extracted face opens the module page. Return module, the M1 back action or Escape closes the carrier before returning the outer enclosure.

The header Help button opens the visible native Controls and keyboard shortcuts disclosure. Left and right choose racks; up and down choose projects in the index. Enter opens the chosen unit, then enters its full page from the preview. Escape closes open help, returns a module, then returns the parent unit. Home and End choose the first and last project. These shortcuts apply to the rack and index context; normal links, buttons and form controls keep their own behavior. Tab reaches every native action, including all M1 pull-out buttons. The question-mark shortcut opens help only while a navigation component has focus.

Text view hides the spatial view and uses the same index and record content, with immediate state changes. It does not require canvas interaction. Reduced motion skips camera travel. Project entry can be cancelled before navigation; returning from a completed entry leaves the scene interactive. Same-origin project visits use browser history for Back to rack when their referrer identifies the rack, allowing the browser to retain the scene and camera. Direct visits and modified clicks keep ordinary URLs.

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

Primary rack and project lettering is larger and bolder, and long engraved titles wrap. Large Software, Hardware and Experience wayfinding markers lie flat on the floor in front of their named racks, clear of cabinet fronts and supply grilles. These fixed, depth-tested planes retain their floor orientation when the camera moves, with matching native navigation outside the 3D scene. Small technical markings remain secondary to those signs and the readable project index.

Three.js r180 is vendored locally under MIT. IBM Plex Sans and Plex Mono are self-hosted under SIL OFL 1.1. Exact font URLs and notices remain in `fonts/`; Three's notice remains in `vendor/`. No new dependency was added.

Native MSAA, Neutral tone mapping, filtered reflections, broad roughness grain and a bounded 2x/6.5-million-pixel drawing buffer remain. All three racks are built at full texture resolution once. Their textures are uploaded and materials compiled during initial preparation, so changing racks does not recreate geometry, fetch assets or compile newly selected materials. Initial page preparation still takes time. Rendering runs on demand, pauses while hidden and follows reduced-motion preferences. The camera fits the selected foreground rack and bounds zoom and rotation within its inspection space. There is no distant entrance camera. [Rendering research](RENDERING.md) and the [aliasing follow-up](QUALITY.md) preserve the earlier investigations.

## Verification

Temporary checks cover all twenty-one records, three 24U totals, unique IDs, local assets, matching versioned imports, source retention and placeholders. Geometry checks at active and inactive texture scales cover finite vertices and bounds, fifteen module targets, 756 enclosure seam rays, 180 carrier closure rays, 168 rail poses, 276 primary text bounds and resource disposal. The environment uses eleven merged meshes and three floor-label planes. Twenty independent review scopes cover mechanics, motion, navigation, content, accessibility and delivery. Their findings include interrupted module returns, skip-link routing, focus recovery, visible cage clips, pad contact and label disposal; each fix receives a focused recheck. Spring checks cover 30, 60, 120 and irregular frame rates, reversals, hidden tabs, stale frame timestamps, cancellation and reduced motion.

Browser review confirms the close front row, unchanged document/canvas/WebGL context and zero resource requests across rack changes. The final 320px pass checks Help, arrows, Enter, Escape, hidden text-view stages, skip-link selection, module focus return and recovery after real WebGL context loss. The extracted M1 enclosure and a further-extracted carrier were visually inspected with reduced motion. Earlier browser checks cover normal deep entry and Back; current-source state checks cover entry cancellation and interrupted module returns. Hosted preview tools stalled during animated extraction in the final physical pass, so real-time smoothness remains unmeasured. No-JavaScript content is also inspected statically. The 29-file production artifact is checked independently of the source server. Physical Safari, assistive technology, real touch gestures and device GPU frame times remain unverified.

Resolved design context: `personal` / `personal-website`, no warnings. The current explicit datacenter, nested-module and neutral-color briefs take precedence over historical PCB and terminal records. This README owns the prototype decisions. No reliable last-push record exists for this branch; signed local commits use this session within the past-day fallback window. No push or public deployment is part of this local work.
