# Design checklist review

## Current release facts

The source default contains 22 project and experience records plus 15 individual M1 tool pages, for 37 reading routes. The three cabinets each have a 24U capacity. Software places six units across 20U, Hardware places three across 9U, and Experience places six across 10U. Seven software records are published without their own rack placement and open from the Personal Projects bundle. Existing database documents can differ from this source default and are not reset by it.

Only `hardware-project-placeholder` remains a placeholder. The introduction titled Engineering + software keeps its historical `experience-story-placeholder` ID but now contains authored factual content. [Content notes](CONTENT.md) record the sources and remaining gaps in dates and individual ownership.

The CI workflow uses Node 24 to typecheck the earlier application, lint authored source, run the existing unit suite and build the rack production artifact with `npm run build:rack`. Those checks do not automate the rack's browser interactions or prove visual quality. Browser reviews are separate release evidence. Physical Safari, real touch, screen-reader testing and the configured live admin backend remain outside the completed review coverage.

## Original October 17 prototype review

The prototype was reviewed against [AIToolPick's website checklist](https://aitoolpick.org/blog/ai-generated-website-checklist/) on 17 October 2026. All thirty checks were considered. The six groups below record that prototype's evidence and changes, rather than treating a numerical score as proof of design quality. Counts and verification in this section describe that revision.

| Group | Application to this prototype |
| --- | --- |
| Colour, five checks | Neutral charcoal UI, off-white text and a restrained copper action accent. Room materials, reflected light, display textures and hardware labels use the same neutral ground. Wavelength retains its distinct navy audio faceplate. No CSS gradients or decorative element shadows. |
| Typography, five checks | Self-hosted IBM Plex Sans and IBM Plex Mono. Headings use normal tracking and medium weight; reading text uses a controlled measure and relaxed leading. Project titles, summaries and technical labels have separate sizes and roles. The title stays modest so the rack remains the main object. |
| Layout, five checks | A spatial cabinet beside a compact contents column, followed by project reading on selection. Project pages open with title and summary in unequal columns, then separate narrative from facts. Spacing follows the content and the M1 bundle has its own useful repository count. |
| Copy, five checks | The opening title names software projects. Summaries state what each project does in one sentence. Source links name GitHub; controls name their action. No promotional slogans, generic feature headings or filler calls to action. |
| Imagery, five checks | Original code-built hardware illustrates the rack concept. Displays refer to the matching projects. No stock images, generated bitmaps, decorative emoji or placeholder artwork. |
| Interaction, five checks | Twelve projects stay directly accessible. M1's longer repository list uses native disclosure groups. Content does not depend on scroll effects. Mobile controls have targets of at least 44px in both dimensions, including the checkbox's label. Repository lists are navigation, not competing promotional calls to action. |

The physical rack, dark default and proportional unit heights follow the user's explicit brief. At that stage, six software units led to all twelve original software project pages through the standalone units and Personal Projects bundle. Native links, keyboard focus, reduced motion and the HTML fallback remained required.

Verification covers the actual local page at phone and desktop widths, disclosure keyboard operation, source-link retention and JavaScript syntax. Independent review checks the implementation against this record. Physical Safari device testing remains outstanding.

The `personal` / `personal-website` context resolved without warnings. This prototype's README and the current user brief own its visual decisions. No reliable last-push record exists for this branch; local commits use the real work session time within the past-day fallback window.

## Follow-up using the supplied DEV article

On 18 October the user supplied Alan West's article, "How to fix the AI-generated look in your frontend", and explicitly rejected green. That instruction overrides the earlier olive-gray choices.

The article was applied as a critique of defaults, rather than a replacement theme. Custom neutral tokens now cover the HTML, room and procedural display artwork. The equipment remains specific to each project. Page composition uses a compact contents list and an asymmetric project opening. Flat rules, clear focus and underlined actions provide a consistent component vocabulary. The existing precise descriptions and experimental qualifications remain intact; real counts such as M1's fifteen repositories come from the catalog.

The relevant checks are visible composition, readable type, factual copy, responsive layout and normal navigation. A palette audit also checks for remaining green and olive literals in the live authored assets.

## Earlier datacenter expansion

The datacenter expansion separated software, engineering and experience without adding a marketing section stack. That revision kept twenty-one records in static HTML and marked two entries as placeholders. These counts and static-HTML behavior are historical. The current published inventory loads through JavaScript and provides a 2D index without WebGL.

Native rack links, full project routes and M1 tool pages work independently of the scene. Mobile skip links target the visible content, and utility labels use neutral backing over lighter surfaces. The foreground row has cabinets on both sides of every content rack; deeper rows supply background depth. Equipment, overhead services and cabinet joins follow the physical references recorded in DATACENTER.md.
