# The project rack

Local 3D portfolio prototype for Christian Nucifora. Each of four rack bays represents an existing software project. Select a bay on the model or in the HTML index. The server slides out, then the camera moves in to its open chassis and the project summary appears. Back to rack, Escape and Reset reverse the view. Ordinary hash navigation preserves direct project links and browser history.

Run from the repository root:

```sh
python3 -m http.server 4314 --bind 0.0.0.0 --directory concept/rack
```

Use T3's environment-port preview for port 4314. A localhost link in another machine's browser does not reach this development environment. This is a static prototype alongside the existing Next application. It needs no install, build, external images, font service or runtime network dependency.

## Scope and design

The explicit brief on 17 October 2026 replaces the earlier terminal and PCB directions for this prototype. A compact rack constrains the composition. Dark metal, printed bay labels, exposed fastening and orange pull tabs give selection a physical cause. A warm light background keeps the rack silhouette readable. System sans type carries identity and copy; system mono labels the equipment and index. A single sequential extraction and camera move explains the transition. Reduced motion moves directly to the final state.

The geometry is illustrative hardware, not a claim that these software projects run on a particular server. No Oxide source code, models or images are used. Project summaries come from the four public READMEs already recorded in `data/generated/github-projects.ts`. They are a short content scaffold for evaluating this interaction, not newly written full case studies. No biography, employment or performance claims are added.

The HTML project index and descriptions remain usable without WebGL or JavaScript. All functional controls have equivalent keyboard access. Each mobile project row is a touch target. Front and perspective views, pointer rotation, Escape, direct links and browser Back are supported. The desktop sidebar becomes an ordinary section below the model on narrow screens.

Resolved design context: profile `personal`, product `personal-website`. Sources were the shared principles, personal profile/preferences and personal-website FACTS overlay in the central design-language repository. The current explicit rack brief takes priority over the snapshot's PCB/Astro implementation and this checkout's terminal design. `.design-context.json` records the existing registry mapping. This file owns prototype decisions and does not rewrite the existing application design.

## Dependencies and provenance

Three.js r180 / 0.180.0 by the three.js authors, MIT. Vendored unchanged from the already pinned local prototype dependency, with notice in `vendor/THREE-LICENSE.txt`:

- https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js
- https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.core.js
- https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js
- https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/environments/RoomEnvironment.js
- https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js
- https://github.com/mrdoob/three.js/blob/r180/LICENSE

All rack geometry, procedural textures, interface styling and favicon are authored for this prototype. No other package is added to the existing application.

## Verification

- `node --check` passes for `app.js` and `scene.js`; local HTML assets and vendored module paths resolve.
- T3's local browser rendered the real WebGL scene at 1280 × 800 and 390 × 844. All runtime requests were local and successful; neither layout had horizontal overflow.
- Clicking the model selected the correct second bay. Normal motion reached extraction, then focus, then the project view. The slide completed before the camera moved in.
- Project index navigation, next bay, rapid selection changes, direct project hashes, browser Back, front view and reset were checked. The model and visible project remained in sync.
- Reduced motion reaches the same final selected or overview state. Idle rendering scheduled zero animation frames during a 1.2 second observation.
- Simulated WebGL context loss displayed the fallback and retained a working HTML project index and descriptions.
- An independent reviewer checked the actual source and the four project summaries. Review found and resolved touch-scroll capture and project selection during module loading. A delayed-module self-check confirmed the latter fix.
- The central design-language validation and its five existing tests pass.

This remains an interaction prototype with short project summaries. Physical-device Safari performance and touch gestures have not been tested on actual hardware. No production deployment, push or change to the existing Next application is included.
