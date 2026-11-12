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

The first topic-branch push is recorded in its remote-tracking reflog on 2026-11-12 at 08:49:46 +1000. Check for a newer push before subsequent work. New signed granular commits use a short span after the latest push and retained local history, following realistic-commits. Publishing is authorized; personal-content approval remains deferred.

## Round ledger

| Round | Status | Confirmed findings | Fix and challenge evidence | Published commits | Clean streak |
| --- | --- | --- | --- | --- | --- |
| 1 | Editor/session fix verified and independently reviewed; current-export browser rerun pending | Seven P2 defects in total, plus conditional reset lifecycle isolation gaps | 85 focused cases and final 578-case suite pass; 16-page build passes; source review found no objection | b7c33c0, 3752ba6, 71514a9, 784fa27; follow-up batch below | 0 |
| 2 | Modal fixes pass unit and build gates; current-export browser challenge pending | Picker propagation P2, confirmation Escape propagation P2, composing Escape priority P3 | 65 focused keyboard checks and full 578-case suite pass; 18 supported worker contracts pass; independent source reviews recorded | Follow-up batch below | 0 |
| 3 | Pending | Pending | Pending | None | 0 |

Round 2 preparation produced 26 worker/provider cases and 21 keyboard cases. Worker execution took 4.64 seconds, with 18 supported contract checks passing and eight explicitly conditional probes failing. The failures concern synthetic post/disposal cleanup expectations, malformed internal reply shapes and a setter on an unmounted editor. No ordinary production route or visible impact was established, so no production defect or fix is claimed. The full 26-case probes and logs remain private; the repository retains the 18 unchanged contract checks. The keyboard candidates use the real capture dispatcher, Prompt and picker to challenge event leakage and composition priority. Their first execution passed 17 of 21 cases in 4.47 seconds with no fixture errors. Three failures confirm one P2 root cause: picker capture handling lets ArrowUp, Enter and Escape reach the real Prompt. The fourth confirms the synthetic composing-Escape priority P3. A separate fixer added propagation stops for consumed picker keys and excluded composing Escape from early dismissal. All original assertions remain unchanged; three native-button controls were added. A fresh independent reviewer found no objection to that patch and prepared three nearby cases, including source-backed confirmation Escape leakage. This neighboring candidate remains unconfirmed until execution. Round 2 is still open and no clean result is claimed.

### Round 1 execution

Two Astra high/priority breakers started with separate regression-file ownership. The terminal breaker owns lib/terminal/round1-temporal.test.tsx and tests delayed source loads, command ordering, pane reuse and animation state. The snapshot breaker owns scripts/round1-boundaries.test.ts and tests faulted responses, malformed metadata, snapshot retention and rendering boundaries. Both use local fixtures, preserve production source and acquire the shared lock for each test job. Findings require a failing reproduction before triage. A separate fixer wave and fresh independent challenge follow confirmed defects.

Both breakers finished source analysis, retaining 19 terminal and 31 snapshot/rendering cases. Their bounded lock acquisitions expired without running tests. The owner consolidated execution with a rejected-editor-chunk case under one lock. The first run collected 51 cases in 9.15 seconds, with 30 passing and 21 failing. Fourteen snapshot failures came from a process-exit mock that incorrectly returned; the editor fixture used an unsupported testing-library option. The owner corrected these fixture errors before confirming findings and retained the initial log.

Confirmed from the first run, all P2:

- A rejected deferred source import appends its echo/error into the newly focused or replacement pane. Successful loads already guard pane identity; rejection lacks that guard.
- Clicking another pane during command animation leaves the origin draft truncated, overwrites the destination draft and executes the command there.
- A deferred cd or click-animation callback can override a later browser-history navigation, changing the selected window and URL back to its earlier destination.
- A partial local bundle output write destroys the previous generated source snapshot. A synthetic ENOSPC write left a 32-byte prefix in place of the old snapshot.

The corrected baseline executed all 51 cases in 8.98 seconds, with 43 passing and eight failing. It confirmed two further P2 defects. A second snapshot rename failure leaves new project metadata paired with old sources while reporting fallback success. A rejected lazy editor import reaches the enclosing route boundary and removes surrounding navigation. A fixture route boundary models the same React error propagation; production-browser fault injection remains required.

Two separate Sol high/priority fixers corrected terminal and snapshot files, including their regressions. The owner added the editor boundary correction with a return-to-shell control. Private command logs distinguish lock timeouts, fixture defects and product assertion failures.

The editor correction passed two focused regressions in 3.09 seconds. A rejected import preserves surrounding navigation, and returning from an inactive pane's failed editor closes that pane while preserving another open file. The terminal fixer passed 162 tests across 11 files and focused lint. The snapshot fixer passed 53 tests and focused lint, including failed restoration, incomplete previous pairs and staging ownership. The combined run passed typecheck, lint and all 476 tests across 39 files. File hashes matched before and after those checks. The one-worker production build exported 16 pages. The final regressions contain 29 terminal, 49 snapshot-boundary and two editor-failure cases.

### Requested checkpoint and pause

The owner subsequently requested a checkpoint and pause before any new swarms or rounds. Both fixers finished and stopped. The owner reviewed their diffs and checked their tested file hashes against the worktree. The production build and all three existing private browser suites passed. Production interaction passed 93 checks in 42.76 seconds; publication passed 140 in 19.02 seconds; development interaction passed 93. Browser suites reported no console or page errors. Publication checks also reported no failed resources.

Each browser suite acquired the shared lock separately, used a server bound to 127.0.0.1, stopped it and released the lock before the next job. Listener comparisons found no new public exposure, both test ports were free afterward and rootless Docker published no ports. An initial wrapper stopped on terminal input before running any e2e check. The owner stopped only its own wrapper and server, released the lock and replaced the wrapper with noninteractive jobs. That orchestration failure is retained in private evidence and is not counted as a product defect.

The checkpoint uses three signed fix commits and a separate ledger commit on portfolio-audit-rounds. Fetch found no incoming topic commits; the branch deployment guard and CI triggers were checked before publication. The previous push was recorded at 08:49:46 +1000 on 2026-11-12. New commits use real timestamps later that morning, with configured signing and no history rewrite. Private logs and browser evidence remain outside the repository under portfolio-audit/swarm-rounds/round1.

No fresh independent challenge was launched after the pause instruction. Round 1 therefore remains incomplete, with a clean streak of zero. Production-browser fault injection, real-browser import retry, session reset with pending imports and independent challenge remain for a later restart, followed by rounds 2 and 3 and the two-consecutive-clean-round gate. Snapshot rollback handles caught errors but does not provide crash-safe two-file atomicity or serialize concurrent publishers. Personal content approval is still a publication blocker. No further work starts until the owner resumes the goal.

### Coverage reserved for later rounds

The owner subsequently resumed the goal and superseded the checkpoint pause. The checkpoint remains evidence, not completion. Two lightweight independent challengers start with pending terminal session lifecycle, snapshot recovery and browser fault isolation. They prepare local fixtures without launching competing heavy jobs; the owner consolidates execution under the shared lock. Confirmed new findings require reproductions before fixes. No further pause is requested.

The independent lifecycle challenge executed 20 cases in 5.94 seconds, with 12 passing and eight failing. All eight snapshot cleanup/recovery cases and four terminal controls passed. A real Prompt sequence confirmed a new P2: an older deferred vim command replaces a file explicitly opened afterward in the same pane. Seven other failures demonstrate stale reads, navigation, animation drafts and notices crossing forced session reset/remount boundaries. No ordinary visitor navigation route for those resets has been demonstrated; they are lifecycle isolation gaps, not seven additional visitor-facing P2s. A separate fixer addresses stale editor intent and bounded lifecycle cleanup while preserving those distinctions.

The fresh production browser fault challenge passed all seven cases against the checkpoint export. It verified editor-chunk failure escape routes and fresh-document recovery, source rejection in a background shell, actual Back/Forward navigation with successful and rejected source responses, plain-view focus/scroll preservation and deferred-output reader scroll preservation. Every response came from local request interception over the built export; no server or port was opened. Expected injected chunk errors were retained separately from unexpected observations. There were no unexpected exercise observations. This verifies the original fixes, but it does not close the newly confirmed editor-ordering finding or establish a clean round.

On restart, round 2 is reserved for worker RPC and provider lifecycle alongside keyboard composition and modal state. Existing RPC tests cover round trips, handler errors, unknown methods and request timeout. They do not establish behavior for synchronous postMessage failure, disposal with pending or later requests, delayed replies, or malformed messages. Those are hypotheses to test against callers and FLOW.md, not confirmed findings.

Round 3 is reserved for delivery and browser fault recovery with a fresh export, including interrupted optional assets, route/plain-view sequences and no-JS behavior. Existing browser suites exercise successful worker startup and ordinary navigation. New fault injection and state sequences must add evidence beyond rerunning those suites. Preserve console/network observations and distinguish deliberately injected failures from application defects. No further round starts until the owner resumes the goal.

### Current verification queue

The six-file Round 1 editor/session correction received a fresh independent Astra source review with no substantive objection. That reviewer preserved the original assertions and added five controls for aliases, sibling panes and a new session consuming the shared source load. Runtime checks remain pending. The first consolidated lock wait expired after 900 seconds before executing any checks. One replacement job queues typecheck, lint, the augmented lifecycle controls, keyboard controls, worker contracts and the full single-worker suite under the shared lock. No duplicate heavy job, server or browser is running. Source review and prepared tests do not establish a clean round.

Round 3 now has independent preparation from two lightweight breakers, retained privately: 21 storage/route/generated-theme cases and eight browser delivery cases. They cover denied or malformed preferences, literal encoded paths, missing optional workers, forced-plain return with history, script denial and real picker/confirmation events. No preparation case has executed and no new round is closed. Three inherited-theme-name probes remain conditional because no supported UI trigger or visitor impact has been demonstrated. The browser runner must be validated against a fresh export before any product finding. All delegated preparation workers have stopped; only the existing consolidated owner gate remains queued.

### Consolidated challenge execution

The replacement owner job acquired the shared lock and completed stable-source checks. Typecheck passed in 9.72 seconds and lint in 12.67. All 85 Round 1 lifecycle, temporal and snapshot cases passed in 12.91 seconds, including the five fresh independent controls. All 18 supported worker contracts passed in 4.50 seconds. Keyboard execution passed 63 of 64 cases in 11.60 seconds: all 24 picker/composition cases passed, while the fresh confirmation-Escape case reproduced INSERT changing to NORMAL after cancellation. This confirms one neighboring P2. The owner added a propagation stop to the shared cancellation branch; its regression remains unchanged and post-fix verification is pending. The full suite reached its 100-second command deadline before completing, so no full-suite pass is claimed. All tracked and untracked source hashes were unchanged during this run.

The fresh cancellation review accepted the Escape correction and identified the same ownership gap in confirmation acceptance: y still reached editor DOM listeners. The owner completed the shared-root fix by stopping propagation for accepted y/Y too and added a boundary regression that observes delivery to an editor target while checking the real URL confirmation. This establishes an event-ownership oracle only; no actual clipboard overwrite or additional P2 is claimed. Existing independent assertions remain intact. The current queued verification includes this completed modal fix and the new control.

### Verified follow-up batch

The final stable-source gate passed typecheck in 5.19 seconds, lint in 11.03, all 65 focused keyboard/focus cases in 12.00 and all 578 tests across 45 files in 102.81. The normal production build passed in 18.05 seconds, using one worker and exporting 16 pages. The earlier 100-second full-suite limit was too short for this expanded suite; its timeout remains evidence, not a test pass. Build changed only the expected generated site-source snapshot, which now includes the reviewed current production code. No personal content changed.

The reviewed follow-up is split into editor/session isolation, modal key ownership, then independent fixture/browser coverage and its synchronized source snapshot. These batches pass local unit, type, lint and build gates. A fresh production/development browser rerun and the new delivery fixtures remain pending, so neither Round 1 nor Round 2 is counted as clean or complete by this checkpoint. Ordinary topic-branch pushes are authorized; the branch deployment guard remains enabled and CI triggers exclude ordinary topic pushes. No PR, merge, release or deployment is requested.
