# Design checklist review

Reviewed against [AIToolPick's website checklist](https://aitoolpick.org/blog/ai-generated-website-checklist/) on 17 October 2026. All thirty checks were considered. The six groups below record the evidence and changes, rather than treating a numerical score as proof of design quality.

| Group | Application to this prototype |
| --- | --- |
| Colour, five checks | Solid charcoal UI, neutral text and one amber accent. No CSS gradients or element shadows. The project panel changes background because it contains navigation and reading content. Metal, circuit-board and component colours belong to the physical model. |
| Typography, five checks | Self-hosted Space Grotesk and IBM Plex Mono. Headings use tighter tracking and leading; descriptions use 1.75 leading. Project titles, summaries and technical labels have separate sizes and roles. The title stays modest so the rack remains the main object. |
| Layout, five checks | A spatial cabinet and a left-aligned index, followed by a reading panel on selection. No repeated card sections or marketing hero. Spacing separates summaries, metadata and repository groups. |
| Copy, five checks | The opening title names software projects. Summaries state what each project does in one sentence. Source links name GitHub; controls name their action. No promotional slogans, generic feature headings or filler calls to action. |
| Imagery, five checks | Original code-built hardware illustrates the rack concept. Displays refer to the matching projects. No stock images, generated bitmaps, decorative emoji or placeholder artwork. |
| Interaction, five checks | Twelve projects stay directly accessible. M1's longer repository list uses native disclosure groups. Content does not depend on scroll effects. Mobile controls have targets of at least 44px in both dimensions, including the checkbox's label. Repository lists are navigation, not competing promotional calls to action. |

The physical rack, dark default and proportional unit heights follow the user's explicit brief. A white marketing page, oversized hero, replacement font or arbitrary hiding of twelve project links would weaken that brief. Native links, keyboard focus, reduced motion and the HTML fallback remain required.

Verification covers the actual local page at phone and desktop widths, disclosure keyboard operation, source-link retention and JavaScript syntax. Independent review checks the implementation against this record. Physical Safari device testing remains outstanding.

The `personal` / `personal-website` context resolved without warnings. This prototype's README and the current user brief own its visual decisions. No reliable last-push record exists for this branch; local commits use the real work session time within the past-day fallback window.
