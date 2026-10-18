# Interface language

18 October 2026. The rack remains the main visual. The HTML should read like documentation for the projects it contains, without duplicating its equipment decoration.

## Implemented direction

IBM Plex Sans replaces Space Grotesk for the interface and project pages. Its relationship to computing equipment makes it a useful companion to this cabinet. IBM's [Plex concept](https://www.ibm.com/plex/concept/) connects the family to System/360, research buildings and data centres. Its [typography guidance](https://www.ibm.com/design/language/typography/type-basics/) supports readable spacing rather than compressed tracking. These are references for an original layout, not a Carbon component clone.

Headings use medium weight and normal tracking. The full project title is capped at 52px and paired with its summary, replacing the earlier 78px heading. Narrative uses 18px text with 1.62 leading and a 62-character maximum measure. Aligned columns separate project facts from explanation. The index has medium-weight project names and clearer secondary descriptions. Source links remain underlined. View, zoom and reset retain ordinary controls with 44px targets. Mono is limited to repository identifiers, bay numbers and equipment labels.

Two unchanged WOFF2 weights are self-hosted from [IBM's repository](https://github.com/IBM/plex/tree/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-sans). Exact URLs are in `fonts/sources.json`; the complete SIL OFL 1.1 notice is `fonts/IBM-PLEX-SANS-OFL.txt`. No font service is contacted at runtime.

## Palette and composition follow-up

The user's supplied DEV Community article and explicit rejection of green guide the next pass. Neutral charcoal replaces olive in the interface and equipment room, including display artwork and reflected light. Copper identifies links, focus and physical selection. Navy, red and cream still describe the audio hardware. Dark mode remains the default.

The index becomes a compact contents column instead of a contrasting application panel. Its spacing puts more projects in view and gives the actual M1 bundle useful hierarchy. Full project pages use an asymmetric title/summary opening before the narrative and specification columns. Existing catalog descriptions remain factual, including experimental qualifications. The article's recommendations are applied to this static HTML and Three.js implementation without importing its example theme or component system.

## Further studies

The research output compares three real, licensed font systems using the same existing M1 content:

| Direction | Type | Layout |
| --- | --- | --- |
| Computing manual, live baseline | IBM Plex Sans, Plex Mono for identifiers | Continuous reading column, narrow specifications, modest title |
| Industrial signage | Barlow Condensed titles with Barlow body | Narrow title column, stronger horizontal alignment and repository rows |
| Engineering journal | Source Serif 4 narrative with Source Sans 3 controls | Central article, marginal specifications and distinct narrative voice |

[Barlow's author](https://github.com/jpt/barlow) cites California public signage and transport as influences. It is not a DIN reproduction. [Source Sans 3](https://github.com/adobe-fonts/source-sans) and [Source Serif 4](https://github.com/adobe-fonts/source-serif) provide a deliberately different reading treatment. The [NASA graphics manual](https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf) informed the distinction between functional labels and publication text, without copying its branding. All study assets carry pinned source URLs and full OFL notices in the local output folder.

Earlier studies considered teenage engineering's [OP-1 guide](https://teenage.engineering/guides/op-1), Carbon's [type strategies](https://www.carbondesignsystem.com/building-blocks/foundations/typography/style-strategies), and Vitsœ's [606 system](https://www.vitsoe.com/us/606). Their object-led presentation and control discipline remain useful. The new studies change type families and page structure, rather than repeating the same layout with different colors.

The active design context is `personal` / `personal-website`, with no resolver warnings. The explicit rack brief and README own this surface's decisions. Existing public project claims and experimental qualifications remain intact.

## Datacenter and nested tools

Software, hardware and experience occupy three physical cabinets in the main foreground row, with equipment on either side. Home opens close to the software rack, retaining the short factual introduction alongside it. There is no separate distant entrance view. Each rack has ordinary navigation, its own index and full record pages; missing material is explicitly marked as a placeholder. The other rows provide background depth.

M1 has a second level of selection. The nested inspector shows the selected tool's real group, description, source and page while its carrier is extracted. Pull out and Return buttons provide a keyboard equivalent to the physical faces. Escape and the back action return one level before closing the parent enclosure. Utility text has opaque neutral backing where it would otherwise sit on a bright floor or wall. Mobile headings and captions occupy normal grid rows, so wrapped headings cannot collide with instructions.
