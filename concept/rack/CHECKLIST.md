# Design checklist review

Reviewed against [AIToolPick's website checklist](https://aitoolpick.org/blog/ai-generated-website-checklist/) on 17 October 2026. All thirty checks were considered. The six groups below record the evidence and changes, rather than treating a numerical score as proof of design quality.

| Group | Application to this prototype |
| --- | --- |
| Colour, five checks | Neutral charcoal UI, off-white text and a restrained copper action accent. Room materials, reflected light, display textures and hardware labels use the same neutral ground. Wavelength retains its distinct navy audio faceplate. No CSS gradients or decorative element shadows. |
| Typography, five checks | Self-hosted IBM Plex Sans and IBM Plex Mono. Headings use normal tracking and medium weight; reading text uses a controlled measure and relaxed leading. Project titles, summaries and technical labels have separate sizes and roles. The title stays modest so the rack remains the main object. |
| Layout, five checks | A spatial cabinet beside a compact contents column, followed by project reading on selection. Project pages open with title and summary in unequal columns, then separate narrative from facts. Spacing follows the content and the M1 bundle has its own useful repository count. |
| Copy, five checks | The opening title names software projects. Summaries state what each project does in one sentence. Source links name GitHub; controls name their action. No promotional slogans, generic feature headings or filler calls to action. |
| Imagery, five checks | Original code-built hardware illustrates the rack concept. Displays refer to the matching projects. No stock images, generated bitmaps, decorative emoji or placeholder artwork. |
| Interaction, five checks | Twelve projects stay directly accessible. M1's longer repository list uses native disclosure groups. Content does not depend on scroll effects. Mobile controls have targets of at least 44px in both dimensions, including the checkbox's label. Repository lists are navigation, not competing promotional calls to action. |

The physical rack, dark default and proportional unit heights follow the user's explicit brief. The work remains the main composition, with all twelve project links available. Native links, keyboard focus, reduced motion and the HTML fallback remain required.

Verification covers the actual local page at phone and desktop widths, disclosure keyboard operation, source-link retention and JavaScript syntax. Independent review checks the implementation against this record. Physical Safari device testing remains outstanding.

The `personal` / `personal-website` context resolved without warnings. This prototype's README and the current user brief own its visual decisions. No reliable last-push record exists for this branch; local commits use the real work session time within the past-day fallback window.

## Follow-up using the supplied DEV article

On 18 October the user supplied Alan West's article, "How to fix the AI-generated look in your frontend", and explicitly rejected green. That instruction overrides the earlier olive-gray choices.

The article was applied as a critique of defaults, rather than a replacement theme. Custom neutral tokens now cover the HTML, room and procedural display artwork. The equipment remains specific to each project. Page composition uses a compact contents list and an asymmetric project opening. Flat rules, clear focus and underlined actions provide a consistent component vocabulary. The existing precise descriptions and experimental qualifications remain intact; real counts such as M1's fifteen repositories come from the catalog.

The relevant checks are visible composition, readable type, factual copy, responsive layout and normal navigation. A palette audit also checks for remaining green and olive literals in the live authored assets.

## Datacenter expansion

The three racks now separate software, engineering and experience without adding a marketing section stack. All twenty-one records remain in the static HTML. Two entries are visibly marked as placeholders. Native rack links, full project routes and M1 tool pages work independently of the scene. Mobile skip links target the visible content, and utility labels use neutral backing over lighter surfaces. The aisle's exposed equipment, overhead services and cabinet joins follow the physical references recorded in DATACENTER.md.
