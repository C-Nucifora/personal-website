# The project cabinet

Local 3D portfolio prototype for Christian Nucifora. A dark 24U cabinet holds twelve project units. Selecting a unit slides it out, then moves the camera into its chassis and opens its project details. Back, Escape and Reset return it to the cabinet.

Run from the repository root:

```sh
python3 -m http.server 4314 --bind 0.0.0.0 --directory concept/rack
```

Open port 4314 through T3's environment preview. A localhost URL in a different machine's browser does not reach this environment. This static prototype needs no package install or build. Geometry, fonts and modules are served locally; it has no runtime CDN, API or font-service dependency. The existing Next application remains separate.

## Design

The 17 October 2026 brief calls for a larger rack, varied real equipment, sizes related to project scope, one M1 bundle and dark mode by default. These choices supersede the initial four-server prototype and older terminal/PCB directions for this surface.

The cabinet follows a shared rack-unit grid. Satin aluminium network faces sit above graphite compute hardware, a modular M1 enclosure, audio-style controls, a large display, a console and compact storage appliances. Beveled edges, recessed apertures, cross-head screws, washers, tray latches, etched labels and quiet displays provide detail at close range. Original procedural textures add brushed metal and fine polymer grain; large studio light cards give the metal visible reflections. The UI uses charcoal, warm white and a muted amber accent.

Space Grotesk carries navigation, headings and descriptions. IBM Plex Mono is reserved for equipment labels, dimensions and small technical details. Plain navigation and a numbered project list leave the cabinet as the main visual. Project details put the source link immediately below the summary. M1's fifteen repositories are grouped into language tools, editor integration and project tools.

The HTML index and actual model share the same project order, unit sizes and selection. A row hover or keyboard focus marks the matching physical unit with a small amber tab. Rack screens describe the software: playlists for Wavelength, notch utilities for Islet and development tools for M1. They do not show simulated operational telemetry. Extraction takes 600ms, followed by a 700ms camera move; reduced motion reaches the same final state immediately.

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

The models and textures are original. These primary references supplied proportions and component anatomy; none of their photos, CAD models, logos or code is included.

- [Ubiquiti Pro Max 24](https://techspecs.ui.com/unifi/switching/usw-pro-max-24): 1U satin-silver fascia, left LCD, one row of Ethernet ports and small SFP sockets.
- [Supermicro SSG-540P](https://www.supermicro.com/en/products/system/up_storage/4u/ssg-540p-e1ctr36h): perforated caddies, release tabs, mounting ears and vertical grab handles.
- [Synology RS1221+](https://www.synology.com/en-us/products/RS1221%2B): shallow removable drive trays and narrow status indicators.
- [Blackmagic Videohub](https://www.blackmagicdesign.com/products/blackmagicvideohub): matte black panels, LCD, square buttons and recessed encoders.
- [Eaton rack guide](https://www.eaton.com/us/en-us/products/server-racks-enclosures-airflow-management/Enclosures/server-racks--everything-you-need-to-know.html): shared rack-unit sizing.
- [Ubiquiti rack panels](https://store.ui.com/us/en/category/accessories-rack-mount/products/uacc-rack-panel-ocd?variant=uacc-rack-panel-brush-1u): panel spacing and ventilation vocabulary.

## Interaction and access

The extraction finishes before the camera starts its close-up. Switching units reverses the current view before extracting the next. Geometry and camera endpoints adapt to each unit's height and the viewport. Rendering runs on demand, pauses when the document is hidden and supports reduced motion without losing the final state.

The ordinary HTML index, project summaries and source links remain available without WebGL or JavaScript. Native links preserve modified clicks and hash history. Old individual M1 project hashes open the grouped M1 unit. Keyboard focus, Escape, touch scrolling and a normal mobile project list provide access alongside the spatial scene. Failed WebGL contexts expose the HTML fallback.

## Context and dependencies

Resolved profile: `personal`; product: `personal-website`; no resolver warnings. Loaded shared principles, personal PROFILE/preferences and personal-website FACTS from the central design-language repository. The current explicit user brief has priority over the historical product snapshot and terminal design documents. This README owns the prototype's design decisions.

Three.js r180 / 0.180.0 by the three.js authors, MIT, remains vendored unchanged. Its notice is `vendor/THREE-LICENSE.txt`. Entry modules are `three.module.js`, `three.core.js`, `OrbitControls.js` and `BufferGeometryUtils.js`. Original sources are under [the pinned Three.js release](https://github.com/mrdoob/three.js/tree/r180).

Space Grotesk by the Space Grotesk Project Authors and IBM Plex Mono by IBM are unchanged Google Fonts distributions, under SIL OFL 1.1. Their full notices and exact download URLs are retained in `fonts/`. The files are self-hosted; using them does not make a runtime Google request.

## Verification

- JavaScript syntax checks pass for app, catalog, model and scene. HTML checks confirm twelve index/detail pairs, eighteen module source links, unique IDs and valid local assets. Authored files pass Git whitespace checks.
- T3's local browser rendered the polished model at 1280 × 800, 980 × 800 and 390 × 844 with no horizontal overflow. A 320px layout check also passed. All runtime asset requests stayed on the local origin and succeeded, including self-hosted fonts. The canvas preserves vertical touch scrolling. CSS and navigation use the same 900px stacking breakpoint.
- Real model clicks selected the large M1 assembly and the top 1U network appliance. The normal-motion phase trace confirms extraction completes before camera focus begins. Selected M1 content exposes all fifteen source links.
- Project navigation through 1U, 2U, 3U and 6U examples, browser Back, front view, reset, reduced motion and mobile project views were checked live. Independent app self-checks also cover early selection during module loading, scene-import failure, all eighteen old module hash aliases and mobile scroll behavior.
- Independent model checks rebuild the actual geometry, check finite vertices and verify every unit selection across two overview views and five viewport proportions. All 120 selection checks and every extracted-unit camera bound pass. The M1 internals remain inside the chassis and attached to its moving assembly.
- Interface text tokens meet 4.5:1 against the base, panel and hover backgrounds. Keyboard alternatives and unenhanced HTML keep the project content accessible alongside the model. The M1 source action is visible without scrolling at 1280 × 800; all fifteen grouped repository links remain available on mobile.
- Idle rendering scheduled zero animation frames over a 1.2 second live observation. Removing enhancement leaves all twelve descriptions visible. Simulated WebGL context loss displays the fallback and still allows opening a bundle and its source links.
- The design-language repository validation and its five existing tests pass.

The previous prototype and its screenshots remain preserved in Git history and the earlier output folder. Physical-device Safari performance and touch gestures still require device testing.
