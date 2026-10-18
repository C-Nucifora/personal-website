# The project cabinet

Local 3D portfolio prototype for Christian Nucifora. A dark 24U cabinet holds twelve project units. Selecting a unit slides it out, then moves the camera above its metal cover and opens its project summary. Its engraved title and the ordinary Open project page link lead to a full local project page. Back, Escape and Reset return the unit to the cabinet.

Run from the repository root:

```sh
python3 -m http.server 4314 --bind 0.0.0.0 --directory concept/rack
```

Open port 4314 through T3's environment preview. A localhost URL in a different machine's browser does not reach this environment. This static prototype needs no package install or build. Geometry, fonts and modules are served locally; it has no runtime CDN, API or font-service dependency. The existing Next application remains separate.

## Design

The 17 October 2026 brief calls for a larger rack, varied real equipment, sizes related to project scope, one M1 bundle and dark mode by default. These choices supersede the initial four-server prototype and older terminal/PCB directions for this surface.

The cabinet follows a shared rack-unit grid. Satin aluminium network faces sit above graphite compute hardware, a modular M1 enclosure, audio-style controls, a large display, a console and compact storage appliances. Beveled edges, recessed apertures, cross-head screws, washers, tray latches, etched labels and quiet displays provide detail at close range. Original procedural textures add brushed metal and fine polymer grain; large studio light cards give the metal visible reflections. The UI uses charcoal, warm white and a muted amber accent.

IBM Plex Sans carries navigation, headings and descriptions, with normal tracking, distinct medium-weight headings and readable secondary text. IBM Plex Mono is reserved for equipment labels, repository identifiers and bay numbers. Full project pages use a 44px maximum title, 18px reading text and a narrow specification column. Plain navigation and a numbered project list leave the cabinet as the main visual. Project details put the source link immediately below the summary. M1's fifteen repositories are grouped into language tools, editor integration and project tools.

The [checklist review](CHECKLIST.md) records how all thirty points in the user's AIToolPick reference apply here. M1 groups use native disclosures to keep the longer list manageable; the language tools start open. The opening title states the subject, and mobile links and controls have at least 44px targets in both dimensions.

The HTML index and actual model share the same project order, unit sizes and selection. A row hover or keyboard focus marks the matching physical unit with a small amber tab. Rack screens describe the software: playlists for Wavelength, notch utilities for Islet and development tools for M1. They do not show simulated operational telemetry. Extraction takes 600ms, followed by a 700ms camera move; reduced motion reaches the same final state immediately.

The [rendering spike](RENDERING.md) records the 18 October research and matched tone-mapping comparison. Closed metal covers replace the repeated illustrative electronics. Bare aluminium and painted panels use separate finishes. The covers have real vent apertures, recessed fasteners and lit bump-map engraving. The renderer uses Neutral tone mapping, filtered studio reflections and one shadow-casting key light.

The [aliasing follow-up](QUALITY.md) removes duplicate lid surfaces and fine material bump, adds bounded low-density supersampling and keeps the changed module graph versioned. The [interface language research](INTERFACE.md) records the implemented computing-manual typography and two further font and layout studies. The [hardware reference mapping](HARDWARE.md) links each rebuilt unit to the inspected equipment. A dim equipment room adds two neighboring cabinets, broad floor joints, a rear wall and an overhead cable tray. These add five merged room meshes while keeping the foreground rack as the only interactive equipment.

## Project allocation

The rack heights are an editorial representation of relative project scope and bundle breadth, not a measurement of effort, repository disk usage, performance or real deployment. Larger native apps occupy 3U; embedded/control tools 2U; focused infrastructure tools and small collections 1U. The M1 ecosystem has the largest enclosure.

| Project | Height | Physical reference |
| --- | ---: | --- |
| CI Runner Console | 1U | Silver network switch |
| Artifact Platform | 1U | Gateway and port appliance |
| nvim-stm32 | 2U | Firmware instrument |
| mozaproxy | 2U | Control surface |
| M1 Toolchain | 6U | Modular compute chassis |
| Wavelength | 3U | Audio rack processor |
| Islet | 3U | Display and control unit |
| Personal Website | 2U | Rack console |
| Reconcile | 1U | Compact appliance |
| mountd | 1U | Storage caddies |
| Photos Downloader | 1U | Archive appliance |
| Small Utilities | 1U | Utility panel |

M1 is one selectable assembly containing fifteen separately linked public repositories: m1-tools, tree-sitter-m1, m1-core, m1-lsp, m1-fmt, m1-lint, m1-typecheck, nvim-m1, telescope-m1.nvim, m1-ci, m1-doc, m1-visualiser, m1-eval, m1-can and m1-dbc. Small Utilities groups iOS Shortcuts, Instagram Unliker and LeetCode.

All summaries were checked against current public GitHub READMEs. The catalog contains only public projects. Existing static source data was not refreshed or overwritten. Experimental capabilities and hardware-validation limits are retained where relevant. Hardware is an illustrative interface, not a claim that the software controls or runs on this physical equipment.

`catalog.js` owns selection order, dimensions and project data. `index.html` also retains a static snapshot of every summary and source link so it works without JavaScript or if a module fails to load. Keep that snapshot in sync when editing catalog content.

## Hardware research

The models and textures are original. [HARDWARE.md](HARDWARE.md) records the current manufacturer references, inspected photos and component anatomy. Networking tools use switches and gateways; embedded development uses bench-instrument controls; Wavelength uses an audio processor; mountd uses storage trays. M1's fifteen tools share one modular enclosure. Project labels replace manufacturer branding, and the hardware does not imply a real deployment.

The neighboring cabinets use the 600 × 1199 × 1070 mm proportions in the [APC NetShelter SX 24U manual](https://iportal.se.com/Contents/docs/UPS-AR3104.PDF). Broad recessed door strips avoid another field of tiny perforations that could shimmer at a distance. Manufacturer photos are research references only and are not shipped as site assets.

## Interaction and access

The extraction finishes before the camera starts its close-up. Switching units reverses the current view before extracting the next. Geometry and camera endpoints adapt to each unit's height and the viewport. Wheel, pinch and explicit zoom buttons inspect both steady views, with bounded panning and camera distance. Rendering runs on demand, pauses when the document is hidden and supports reduced motion without losing the final state.

The ordinary HTML index, project summaries and source links remain available without WebGL or JavaScript. Native links preserve modified clicks and hash history. Old individual M1 project hashes open the grouped M1 unit. Keyboard focus, Escape, touch scrolling and a normal mobile project list provide access alongside the spatial scene. Failed WebGL contexts expose the HTML fallback.

`project.html?project=<catalog-id>` provides a full page for each of the twelve units. It reads the same catalog and retains source links, facts and grouped repositories. Invalid IDs show the project list; a failed module load or disabled JavaScript leaves a visible route back to the rack's static descriptions.

## Context and dependencies

Resolved profile: `personal`; product: `personal-website`; no resolver warnings. Loaded shared principles, personal PROFILE/preferences and personal-website FACTS from the central design-language repository. The current explicit user brief has priority over the historical product snapshot and terminal design documents. This README owns the prototype's design decisions.

Three.js r180 / 0.180.0 by the three.js authors, MIT, remains vendored unchanged. Its notice is `vendor/THREE-LICENSE.txt`. Entry modules are `three.module.js`, `three.core.js`, `OrbitControls.js` and `BufferGeometryUtils.js`. Original sources are under [the pinned Three.js release](https://github.com/mrdoob/three.js/tree/r180).

IBM Plex Sans by IBM is pinned to upstream commit `71f558992315a12ca1f06a2215d57962a1992162`, unchanged and self-hosted under SIL OFL 1.1. The earlier Space Grotesk and current IBM Plex Mono files remain unchanged Google Fonts distributions under SIL OFL 1.1. Their full notices and exact download URLs are retained in `fonts/`. The files are self-hosted; using them does not make a runtime Google request.

## Verification

The reference-hardware and room update preserves all twelve engraved targets and the 24U allocation. Independent geometry checks confirm finite attributes and bounds, attached raycast targets, and disposal of 134 geometries, 83 materials and 45 textures. Final desktop overview reports 68 draw calls and 165,884 triangles with the room and inactive audio meter segments. It retains four MSAA samples, a 2× drawing buffer and the 6.5-million-pixel allocation cap in the preview.

The new typography loads local Plex regular and medium WOFF2 files. Browser checks cover a 1280px project page, 320px reading layout and rack overview controls, with no overflow or failed asset requests. Final entry, scene and model imports use the same `20261018-hardware-v3` version. Manufacturer references and further type studies remain local research artifacts rather than runtime dependencies.

- JavaScript syntax checks pass for app, catalog, model and scene. HTML checks confirm twelve index/detail pairs, eighteen module source links, unique IDs and valid local assets. Authored files pass Git whitespace checks.
- T3's local browser rendered the polished model at 1280 × 800, 980 × 800 and 390 × 844 with no horizontal overflow. A 320px layout check also passed. All runtime asset requests stayed on the local origin and succeeded, including self-hosted fonts. The canvas preserves vertical touch scrolling. CSS and navigation use the same 900px stacking breakpoint.
- Real model clicks selected the large M1 assembly and the top 1U network appliance. The normal-motion phase trace confirms extraction completes before camera focus begins. Selected M1 content exposes all fifteen source links.
- Project navigation through 1U, 2U, 3U and 6U examples, browser Back, front view, reset, reduced motion and mobile project views were checked live. Independent app self-checks also cover early selection during module loading, scene-import failure, all eighteen old module hash aliases and mobile scroll behavior.
- The original framing checks covered all 120 combinations of unit, overview view and viewport proportion. The cover update rechecks finite vertices, all twelve lid bounds, all twelve engraved-link raycasts and resource disposal. Covers and link targets stay attached to each moving assembly.
- Interface text tokens meet 4.5:1 against the base, panel and hover backgrounds. Keyboard alternatives and unenhanced HTML keep the project content accessible alongside the model. The M1 source action is visible without scrolling at 1280 × 800; all fifteen grouped repository links remain available on mobile.
- Idle rendering scheduled zero animation frames over a 1.2 second live observation. Removing enhancement leaves all twelve descriptions visible. Simulated WebGL context loss displays the fallback and still allows opening a bundle and its source links.
- The design-language repository validation and its five existing tests pass.
- The rendering update passes independent checks for all twelve full project pages, invalid links, M1's fifteen repositories, gesture click suppression and bounded zoom. Live inspection covers the painted 6U and aluminium 1U lids, a real engraved-link click, 320px controls and the idle render loop. See the rendering spike for comparison conditions and limits.

The previous prototype and its screenshots remain preserved in Git history and the earlier output folder. Physical-device Safari performance and touch gestures still require device testing.
