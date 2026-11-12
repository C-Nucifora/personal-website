# Rack rendering research

18 October 2026. Scope: the local 24U rack, close inspection, extraction and the route from a physical unit to its project. The implementation remains on vendored Three.js r180.

## Decision

Keep WebGL PBR. Correct the material definitions, lighting and model construction before adding post-processing. Ship closed, engraved metal lids and bounded inspection controls. Use the existing catalog for full project pages.

The desktop comparison used the same M1 model, lighting, exposure of 1, camera position `[3.997, 7.765, 14.593]` and 1280 × 800 viewport. AgX, ACES and Neutral were captured separately. Neutral retained darker graphite and clearer separation between painted surfaces, bare edges and recessed vents in these captures. That is a visual judgement about this scene, not a measured claim of colour accuracy. Neutral is the selected default. [Khronos describes its intended product-visualisation use](https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products).

A subsequent 1U close-up exposed a dark reflection on the aluminium lid. The overhead studio card was on the wrong side for the selected camera's reflection direction. Moving it behind and above the cabinet made the metal and dark engraving readable. The saved tone-mapping comparisons precede that final light adjustment; the final 1U capture shows its effect.

## What was wrong

The source inspection found several concrete causes, beyond the choice of renderer:

- Zoom was explicitly disabled, and project mode disabled the entire orbit controller. Wheel, pinch and button zoom now work in steady overview and project states. Automatic transitions retain camera control.
- Painted frame, graphite chassis and bare aluminium shared one highly metallic material. They now use separate batches and material responses. A roughness texture multiplies the material's roughness; the old grey texture made the nominal value lower than it appeared in code. The updated bare-metal value is 0.5 and the paint value is 0.72 before texture modulation. [Pinned material implementation](https://github.com/mrdoob/three.js/blob/r180/src/materials/MeshStandardMaterial.js).
- Four bright reflection cards, three directional lights and hemisphere fill illuminated broad surfaces quite uniformly. Their intensities are now lower, with a restrained frontal reflection and near-neutral light colours. PMREM environment filtering and the existing sRGB output remain.
- The previous open chassis repeated illustrative boards, with no lid and no interior shadow casting. Closed top panels replace those boards. The lid surface receives scene light and shadows; title lettering uses colour and recessed bump masks rather than an unlit floating label.
- The shadow radius setting had no effect under PCFSoftShadowMap. The directional shadow bounds are now smaller and normal bias is reduced from 0.025 to 0.008. One key light casts shadows. These choices need visual checks at small-unit and large-unit scales. [Pinned shadow implementation](https://github.com/mrdoob/three.js/blob/r180/src/lights/LightShadow.js).

The colour pipeline was already fundamentally sound. There was no evidence for adding another gamma conversion. A future composer must end with OutputPass instead of applying output conversion twice. [r180 colour management](https://github.com/mrdoob/three.js/blob/r180/manual/en/color-management.html), [OutputPass](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/OutputPass.js).

## Alternatives considered

| Approach | Benefit | Cost or limitation | Decision |
| --- | --- | --- | --- |
| Existing WebGL PBR, corrected assets and lighting | Preserves interaction and local assets; addresses the observed causes | Requires material and light tuning | Implemented |
| SSAO | Adds local contact shading | Noise and halos; cannot repair silhouettes or actual reflections | No immediate addition |
| GTAO | More convincing contact shading than basic SSAO | Additional screen passes, render targets and integration work | Best next rendering experiment if contact shading remains weak |
| WebGPU | A newer rendering backend and node-based pipeline | Does not repair material or model choices; migration and device testing | No demonstrated need for this prototype |
| Runtime path tracing | Better indirect light and reflections | Progressive convergence conflicts with frequent extraction, orbit and zoom | Suitable for offline reference renders, not the current interaction |
| Blender to GLB assets | Authored bevels, normal maps and baked occlusion | Asset-authoring work and a separate export workflow | Useful when the hardware needs a further realism pass |

These are source-based engineering assessments. SSAO, GTAO, WebGPU and path tracing were researched, not implemented or benchmarked. [r180 SSAO](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/SSAOPass.js), [r180 GTAO](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/GTAOPass.js), [r180 WebGPU renderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPURenderer.js), [path-tracer upstream](https://github.com/gkjohnson/three-gpu-pathtracer), [glTF material guidance](https://github.com/KhronosGroup/glTF-Tutorials/blob/main/gltfTutorial/gltfTutorial_014_AdvancedMaterial.md).

GTAO is not a safe one-line addition here. Its r180 normal pass overrides materials. The rack's large transparent face-label planes would become opaque in that pass, closing visible recesses. Invisible raycast targets and the contact-shadow plane must also be excluded. Any trial needs a controlled depth/normal pass, final output conversion and antialiasing, with matched images and device frame-time measurements. The current path-tracer upstream also differs from older WebGL implementations, so an unpinned example is not a drop-in dependency.

For future baked occlusion, bake within each moving enclosure. Baking one rack-wide image would leave fixed shadows when a unit slides out.

## Hardware and interaction

The covers use actual slot apertures, screw wells, folded flanges and a rear seam. Solid and vented screw-fastened top panels follow [Hammond RM construction](https://www.hammfg.com/electronics/small-case/rack-mount/rm); painted finishes follow [Hammond RMC](https://www.hammfg.com/electronics/small-case/rack-mount/rmc). [Dell's system-cover procedure](https://www.dell.com/support/manuals/en-us/poweredge-r4715/r4715_ism/removing-the-system-cover?guid=guid-01f2dc05-66d9-4800-bde1-cc0e62ce4323&lang=en-us) also establishes the removable-cover reference. No manufacturer models, imagery or logos were copied. The bump engraving is a shading effect, not cut letter geometry.

The engraved title opens `project.html?project=<id>`. An ordinary HTML link provides the same action. Each page reuses the existing public catalog, with all fifteen M1 repositories retained. No project claims or case-study results were invented.

Wheel and two-finger pinch zoom have distance limits relative to the fitted view. Zoom buttons provide a keyboard and touch alternative. Right-drag pans within a bounded area. Extraction, focus and return disable manual controls; Reset restores the cabinet view. Dragging or using multiple fingers suppresses label activation.

## Evidence and limits

The complete model falls from 272,732 to 229,316 triangles after removing unseen electronics. Mesh count rises from 126 to 136 because painted and bare surfaces now batch separately. These counts are not frame-rate measurements. The selected M1 capture reports 65 draw calls and 180,274 visible triangles.

Geometry self-checks cover finite positions, all twelve cover bounds, all twelve label raycasts and resource disposal. Live checks cover project-page navigation, zoom, mobile layouts and ordinary links. Independent review checks the integrated implementation. On-demand rendering and the HTML fallback remain in place.

Live overview zoom changed distance from 22.334 to 20.490 through the wheel-event handler, then reached the exact configured button limits of 7.817 and 40.201. Reset restored 22.334. At 320px, the selected M1 view had no horizontal overflow, 44px zoom buttons and separate bounds for the canvas, instruction and controls. Idle observation scheduled zero animation frames over 1.2 seconds. These are functional checks, not physical-wheel or touch-device measurements.

Physical Safari pinch behaviour, mobile thermal load and GPU frame times still need device testing. No performance uplift is claimed from desktop screenshots.
