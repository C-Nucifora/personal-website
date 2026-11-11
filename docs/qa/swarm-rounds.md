# Portfolio audit rounds

This extends the original portfolio goal. The earlier audit is a baseline, not a new clean round. Personal biography, résumé, tools and current-activity content remain deferred by the owner and block publication. FLOW.md remains the interaction authority. Shared history and the public Source link are approved. No merges, releases, deployments or public test servers are authorized.

## Completion rule

Run at least three new rounds. Continue until two consecutive independent rounds find no substantive unresolved defect across the coverage matrix. A round requires new source analysis and bounded, reproducible tests on owned local fixtures. Existing passing tests alone do not count. Record confirmed findings, disagreements, regression failures, separate fixes, serial integration, focused/full verification, independent challenge and pushed commits. A lack of findings does not justify speculative changes.

## Coverage matrix

| Area | Round 1 hypotheses and sequences | Later challenges |
| --- | --- | --- |
| Shared terminal state | Delayed source loads, concurrent commands, pane close/recreate, cwd changes, history expansion, animation cancellation | Model-based mixed command/window/pane sequences and stale callbacks |
| Keyboard and focus | Editor/shell transitions, picker and confirmation interactions, IME/modifiers, browser shortcuts | Fine/coarse pointer focus, plain switching, history navigation, long output |
| Public snapshots and rendering | Faulted/partial responses, visibility changes, malformed paths, poisoned metadata, bounded rendering | Offline and retry boundaries, generation failures, atomicity and deterministic snapshots |
| Workers and optional assets | Initialization failure, retry, disposal, missing chunks, invalid optional downloads | Late replies, cache identity, bounded worker payloads and dormant configuration |
| Static delivery and accessibility | Existing export/route contracts and no-JS fallback preserved | Fresh production/development browser state sequences, responsive/zoom/theme and metadata checks |

Round 1 starts with two independent source/fixture breakers split between terminal state and ingestion/rendering. A separate fixer wave owns disjoint files or prepared worktrees. Fresh reviewers challenge fixes and nearby behavior. Rounds 2 and 3 rotate the primary emphasis while revisiting prior findings. Results will refine the matrix without dropping unresolved coverage.

## Resource and publication controls

All build, test, property, fuzz and browser jobs acquire the shared heavy.lock. Use the disk-backed TMPDIR and one test/build worker. Start with two lightweight agents and coordinate host capacity through the shared swarm notes. Never touch another owner's processes, temporary files or Docker daemon. No live adversarial requests or personal data fixtures.

The authorized remote is C-Nucifora/personal-website. Topic branch portfolio-audit-rounds starts at e758b91, retaining the four signed baseline commits. Fetch before pushing. GitHub CI currently triggers on main pushes, pull requests and manual dispatch. Existing deployment/webhook records returned no entries; Vercel is documented as the hosting integration. Vercel's live schema confirms git.deploymentEnabled can disable automatic deployment per branch. This topic branch therefore explicitly disables its own auto-deployment before any push. Never push main or open a deployment URL.

No branch-specific push record exists for this new topic branch. New signed granular commits use a short span after retained local history, following realistic-commits. Publishing is authorized; personal-content approval remains deferred.

## Round ledger

| Round | Status | Confirmed findings | Fix and challenge evidence | Published commits | Clean streak |
| --- | --- | --- | --- | --- | --- |
| 1 | Breakers starting | Pending reproduction | Pending | None | 0 |
| 2 | Pending | Pending | Pending | None | 0 |
| 3 | Pending | Pending | Pending | None | 0 |
