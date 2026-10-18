# Rack content

`collections.js` holds the three rack collections. Software imports the existing public project catalog. Hardware and experience use the sources below. Every rack totals 24U.

## Imported records

The existing portfolio checkout at `/home/christian/.t3/worktrees/personal-website/t3code-077021d5` contains explicit publication records. These are reviewed content records, rather than facts inferred from old source files.

- `docs/content/linkedin-timeline-snapshot.md` records a user-supplied LinkedIn screenshot approved on 30 August 2026. Its approval ID is `chat-2026-08-30-linkedin-timeline`, snapshot version `1.0.0`. `src/data/public/timeline.ts` contains the normalized five experience and education records.
- The snapshot source is <https://www.linkedin.com/in/christian-nucifora-501432387/>. The live profile was unavailable during this work. These entries reflect the dated snapshot and do not claim a fresh LinkedIn scrape.
- `src/data/public/catalog/uqr-engineering.ts` and `uqr-programs.ts` record the broad UQ Racing engineering summaries, approved on 30 August 2026 under `chat-2026-08-30-catalog-extension`.
- The current request authorizes bringing hardware work and experience into the rack portfolio, using LinkedIn material and placeholders for missing content.

The UQ Racing records describe substantial perception and broader electrical contribution across both cars as team work. They do not establish ownership of a particular board, harness or ECU design, and contain no approved project photographs or measured results. The rack models are interface objects, not documentation of hardware Christian built.

The engineering and computer science degree is in progress. July 2029 is an expected completion date. No qualification or additional description is supplied for St Augustine's College.

`data/profile.ts` and `data/resume.ts` in this checkout still contain old TODO templates. Their sample companies, job titles, dates and degree are not sources for the rack.

## Editing missing content

Two entries are deliberately marked with `placeholder: true` and say so in their visible text:

- `hardware-project-placeholder` reserves 8U for an actual hardware project. Replace the title, summary and description with the project's name, Christian's contribution and a factual build account. Add photographs or links only when supplied for this portfolio. Remove `placeholder` when the entry is complete.
- `experience-story-placeholder` reserves 2U for a personal introduction. Replace it with Christian's own story and remove `placeholder` when ready.

Keep IDs stable after sharing links. `faceTitle` is optional short text for the 3D front panel; `title` is the full reading title. `sourceUrl` is optional, so an entry without a public source must not render a source link. `sourceLabel` names the destination, such as `LinkedIn profile`. Do not fabricate a GitHub link for an engineering or experience entry.

When changing rack proportions, preserve a 24U total for each collection. A larger front panel reflects the amount of content in this interface, not a measured ranking of professional impact.
