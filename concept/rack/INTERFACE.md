# Interface language research

18 October 2026. These are proposals for the HTML interface around the rack and its full project pages. The current dark rack identity remains the implemented design. The comparison studies use the same M1 content, existing project facts and two representative repository rows.

## Recommendation

Use an operator-manual direction as the main language. Borrow Carbon's spacing and control-state discipline, and the product catalogue's text/specification structure for longer documents. Combine these into one hierarchy and one set of tokens rather than three visual themes.

The strongest changes would be a coherent group for view, zoom and reset; clearer secondary labels; a more modest full-page title; and repository lists that read as parts of a project. No simulated hardware buttons, decorative measurement marks, fake revision codes or status lights are needed.

## Three reference families

| Direction | Useful principles | Site application | Tradeoff |
| --- | --- | --- | --- |
| Operator manual | Functional labels, clear sections, explanations beside the controls they describe | Group rack controls. Keep the project summary and action together. Use real document sections and aligned tool names | Closest connection to the rack; excessive numbering or diagrams would become decoration |
| Productive technical system | Compact type, consistent spacing, explicit selection and focus | A clear project index, predictable 44px controls and readable repository disclosures | Strong interaction baseline; a complete enterprise shell would overpower the portfolio |
| Modular product catalogue | Object-led presentation, quiet rules, short text columns and labelled parts | Asymmetric project explanation/specification layout; repositories presented as one system's components | Best for reading; less distinctive around interactive controls |

The [OP-1 guide](https://teenage.engineering/guides/op-1) and [TX-6 guide](https://teenage.engineering/guides/tx-6) inform the operator-manual proposal. They provide references for control explanations and document navigation. The proposal does not copy teenage engineering's branding, illustrations, symbols or lowercase voice.

Carbon distinguishes productive and expressive typography, and uses a deliberate spacing scale. Its interaction guidance is useful for controls and compact navigation, while project reading can remain more spacious. [Typography strategies](https://www.carbondesignsystem.com/building-blocks/foundations/typography/style-strategies), [spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview), [tab specifications](https://www.carbondesignsystem.com/building-blocks/core/components/tabs/specifications).

Vitsœ's [606 system](https://www.vitsoe.com/us/606), [planning guide](https://www.vitsoe.com/site/download/3025/606_Universal_Shelving_System_planning_guide_US.pdf) and [published design principles](https://www.vitsoe.com/gb/about/good-design) inform the catalogue proposal. Its modular hierarchy translates to the rack's project bundles. Its light print treatment need not replace the user's dark default.

## Draft implementation choices

These values are original proposals, not the reference brands' specifications. The implemented site can keep its local Space Grotesk and IBM Plex Mono files. The standalone studies use system fallbacks so they remain self-contained.

| | Operator manual | Technical system | Product catalogue |
| --- | --- | --- | --- |
| Base / panel | `#151716` / `#202320` | `#161616` / `#262626` | `#171716` / `#20201e` |
| Text / secondary | `#eeeae1` / `#b7bab1` | `#f4f4f4` / `#c6c6c6` | `#eeeade` / `#b9b7ae` |
| Action | Muted amber `#efb370` | Blue `#78a9ff` | Warm white with underline |
| Title / leading | 40 / 44px | 32 / 40px | 48 / 52px |
| Body / leading | 17 / 28px | 16 / 26px | 18 / 30px |
| Spacing | 8, 16, 24, 40, 64px | 4, 8, 16, 24, 32, 48px | 12, 24, 48, 72px |

All directions retain ordinary source links, keyboard focus, 44px controls, native disclosures, sentence case and the existing public content. Mono stays limited to repository names, bay numbers and compact facts. The only immediate HTML correction is the internal Back to rack arrow, now pointing left instead of suggesting an external destination.

No external assets, fonts or component code were copied. The active design context is `personal` / `personal-website`, with no warnings. The current rack brief and README remain authoritative; these proposals do not update the central profile.
