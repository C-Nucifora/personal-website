# Rack content

`collections.js` reads the published portfolio, with the source catalog as the unconfigured site's default. Each rack has a 24U capacity. `software-content.js`, `m1-content.js` and `experience-content.js` supply authored descriptions, facts and page sections for the default records.

## Imported records

The existing portfolio checkout at `/home/christian/.t3/worktrees/personal-website/t3code-077021d5` contains explicit publication records. These are reviewed content records, rather than facts inferred from old source files.

- `docs/content/linkedin-timeline-snapshot.md` records a user-supplied LinkedIn screenshot approved on 30 August 2026. Its approval ID is `chat-2026-08-30-linkedin-timeline`, snapshot version `1.0.0`. `src/data/public/timeline.ts` contains the normalized five experience and education records.
- The snapshot source is <https://www.linkedin.com/in/christian-nucifora-501432387/>. The live profile was unavailable during this work. These entries reflect the dated snapshot and do not claim a fresh LinkedIn scrape.
- `src/data/public/catalog/uqr-engineering.ts` and `uqr-programs.ts` record the broad UQ Racing engineering summaries, approved on 30 August 2026 under `chat-2026-08-30-catalog-extension`.
- The approved `m1-language-toolchain.ts` and `islet.ts` publication records explicitly credit co-development with Ned Lane. Current repository documentation supplies technical details; it does not establish individual feature ownership.
- The October 23 request authorizes fleshing out the existing pages from public sources. The owner chose to keep UQ Racing contributions broad and use DataAnnotation's public software-engineering description for general role context.

The three files in `sources/` record repository revisions, inspected file hashes, approved publication records and claim boundaries. Technical references on the reading pages point to the inspected revisions. The M1 cabinet's fifteen tools are a curated selection from a larger collaborative ecosystem. `m1-can` is credited to its canonical `nedlane/m1-can` upstream; the existing fork link remains available from the rack.

The UQ Racing records describe substantial perception and broader electrical contribution across both cars as team work. They do not establish ownership of a particular board, harness or ECU design, and contain no approved project photographs or measured results. The rack models are interface objects, not documentation of hardware Christian built.

The engineering and computer science degree is in progress. July 2029 is an expected completion date. No qualification or additional description is supplied for St Augustine's College.

`data/profile.ts` and `data/resume.ts` in this checkout still contain old TODO templates. Their sample companies, job titles, dates and degree are not sources for the rack.

DataAnnotation's [public software-engineering role](https://www.dataannotation.tech/job-board/software-engineer) supplies company-level context about coding tasks, generated-code review and AI evaluation. This does not identify Christian's assignments, clients or results. Employment dates still come from the dated LinkedIn snapshot.

## Editable pages

Default content is seeded through `createDefaultPortfolio()`. Existing database drafts and published documents are not overwritten. Project sections remain editable in the admin. Each M1 module also has its own facts, stack and page sections, with an optional theme override and a dedicated draft preview. Legacy modules without these fields remain valid and inherit the parent page appearance.

The fifteen tool routes retain `project.html?project=m1-toolchain&module=<id>`. Their own descriptions and sections are rendered instead of repeating the parent toolchain page. The ordinary project routes, module IDs and rack placements remain stable.

## Editing missing content

One entry remains deliberately marked with `placeholder: true`:

- `hardware-project-placeholder` reserves 1U for a hardware build. Replace its title, summary and description with the project's name, Christian's contribution and a factual build account. Add photographs or links only when supplied for this portfolio. Remove `placeholder` when the entry is complete.
- `experience-story-placeholder` keeps its existing ID but is now a factual introduction titled Engineering + software. It is no longer a placeholder.

Software work dates, individual feature ownership and specific hardware build evidence remain absent where the sources do not supply them. St Augustine's attendance is kept concise. The pages do not manufacture qualifications or case studies to fill those gaps.

Keep IDs stable after sharing links. `faceTitle` is optional short text for the 3D front panel; `title` is the full reading title. `sourceUrl` is optional, so an entry without a public source must not render a source link. `sourceLabel` names the destination, such as `LinkedIn profile`. Do not fabricate a GitHub link for an engineering or experience entry.

When changing rack proportions, preserve a 24U total for each collection. A larger front panel reflects the amount of content in this interface, not a measured ranking of professional impact.
