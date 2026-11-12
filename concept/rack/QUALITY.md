# Aliasing investigation

18 October 2026, follow-up to the rendering spike. The user still saw aliasing and visual artifacts while inspecting the rack.

## Findings and changes

The baseline already used native multisample antialiasing. The actual preview reported four samples at device pixel ratio 2, with an 1800 × 1448 drawing buffer for a 900 × 724 CSS canvas. Simply turning on `antialias` again would change nothing.

The model had several avoidable sources of unstable detail. Fine procedural bump textures affected tiny bevels and reflective surfaces. The roughness map also multiplied the nominal metal roughness downward. The lid had an extruded top at +0.024 and a second engraved sheet at +0.025. These are confirmed source facts. Their contribution to moving shimmer is a rendering diagnosis, not a measured temporal-error result.

The implementation now uses one extruded lid with separate cap and rim materials. General finishes use broader, low-contrast roughness grain and no micro-bump. Only the lettering retains a shallow bump mask, reduced from 0.008 to 0.0015. Darker nickel inside network sockets reduces tiny bright reflections while retaining real recessed geometry. Camera clipping changes from 0.1/120 to 0.5/80 to improve depth precision over this scene's actual range.

The renderer retains native MSAA and adds a 1.5× CSS sampling floor on low-density displays. The upper bounds are 2×, 6.5 million drawing pixels and the GPU's texture/renderbuffer limits. The pixel budget preserves native 2× resolution at ordinary desktop sizes, including a 1920 × 1080 window, while bounding oversized allocations. A device-pixel-ratio change updates the buffer without moving the camera. A CSS size change still refits the scene.

The entry, scene and model URLs carry one matching version so an older cached module cannot silently retain the previous geometry or quality policy. `window.__rackPrototype.getState().scene.quality` reports actual MSAA samples, ratio, buffer dimensions and pixel budget.

## Research decisions

| Technique | What it addresses | Choice here |
| --- | --- | --- |
| Native MSAA | Geometric edge coverage | Already present; retained |
| Higher spatial sampling | Geometry, texture and shader samples | Bounded sampling floor added |
| SMAA | Screen-space edges | Researched, not added. Three image passes, render targets and lookup textures would not remove duplicate surfaces or high-frequency material detail |
| Multi-pass SSAA | More subpixel samples | Researched, not added. Repeated full-scene rendering costs more during extraction and orbit |
| Temporal accumulation | Stable samples across frames | Researched, not added. History resets, moving objects and camera motion complicate an on-demand scene |

Primary sources: [Three.js r180 renderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/WebGLRenderer.js), [responsive drawing-buffer guidance](https://raw.githubusercontent.com/mrdoob/three.js/r180/manual/en/responsive.html), [roughness-map shader](https://raw.githubusercontent.com/mrdoob/three.js/r180/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js), [SMAA](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/postprocessing/SMAAPass.js), [SSAA](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/postprocessing/SSAARenderPass.js), [temporal AA](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/postprocessing/TAARenderPass.js).

## Verification and limits

Matched 1U and M1 captures use the same 1280 × 800 viewport, native DPR2 and fitted project camera before and after. The broad streaks on the aluminium lid are gone; recesses, engraving and project links remain. This is a visual comparison, not a claim of artifact-free rendering on every display.

Geometry checks cover all twelve lids, material groups, finite vertices, raycast targets and disposal. Sampling assertions cover low-density, native-density, desktop and large-framebuffer cases. A simulated DPR1 browser check produced a 1.5× buffer. It is not physical DPR1 hardware testing. Idle rendering remains demand-driven.

Physical Safari, display-specific motion shimmer and GPU frame times remain unmeasured. No new renderer, shader dependency or blanket blur was added. The branch has no reliable last-push record; signed local commits use the real session time within the past-day fallback window.
