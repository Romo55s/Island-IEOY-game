# Crash Rescue and Character System Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private shared-pool item choice for each character and a simultaneous rescue sequence before the existing ten group decisions.

**Architecture:** The Worker/Durable Object remains authoritative for phase deadlines, private submissions, random outcome rolls, death, persistence, and public resolution. Shared pure rules and validated content define profiles, items, offers, and order-independent rescue batches; React DOM and R3F only present choices and outcomes.

**Tech Stack:** TypeScript, Zod, React, React Three Fiber, PartyServer/Durable Objects, Vitest, Cloudflare Vitest, Playwright.

**Spec:** `docs/specs/crash-rescue-character-design.md` and `docs/specs/island-decision-game.md`

## Global Constraints

- Keep all gameplay-authoritative state outside the renderer and on the server.
- Preserve 2–8 player sessions, six-character room codes, session recovery, and ghost voting.
- Keep player submissions private until server resolution; never send pending choices of other players.
- Use injected random sources for pure rules and cryptographic randomness in the Worker.
- Persist absolute phase deadlines and make resolution idempotent across reconnects and alarm retries.
- Preserve the existing ten group decision cards; the crash sequence is an opening feature, not an extra group vote.
- Avoid editing unrelated files; the workspace currently contains extensive uncommitted user work.

---

## File and Ownership Map

- `src/shared/domain.ts`: new phases, profile/item IDs, private submissions, resolution records, inventory.
- `src/shared/protocol.ts`: strict schemas for new client commands, private viewer state, and public crash report.
- `src/shared/content/characterProfiles.ts`: authored character traits, joke/reaction tags, and item-offer affinities.
- `src/shared/content/items.ts`: item catalog, offer weights, icon/model keys, and explicit effects.
- `src/shared/rules/crashRescue.ts`: pure offer generation, validation, probability computation, and batch resolution.
- `worker/game/GameRoom.ts`: authorization and submission command handling.
- `worker/game/roomScheduler.ts` and `roomStorage.ts`: deadlines, persisted resolution, and reconnect-safe progression.
- `src/game/screens` and `src/ui`: DOM choice and report UI.
- `src/scene/phases` and `src/scene/characters`: staged crash/rescue presentation and temporary held-item proxy meshes, driven from snapshots.
- `tests/shared`, `tests/worker`, `tests/client`, `tests/scene`, and `e2e`: rules, protocol, lifecycle, privacy, and full-flow coverage.

## Task 1: Confirm Mechanics and Freeze Shared Contracts

**Files:**
- Modify: `docs/specs/crash-rescue-character-design.md`
- Modify: `docs/specs/open-decisions.md`
- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Test: `tests/shared/protocol.test.ts`

**Interfaces:**
- Produces: typed phases `crashIntro`, `crashItemChoice`, `crashRescueChoice`, `crashResolution`.
- Produces: private `crash.submit-item` and `crash.submit-rescue` commands.
- Produces: viewer-specific private offer and own-submission status; shared resolved crash report only after lock-in.

- [x] Record confirmed choices for inventory lifetime, profile/item effects, risk disclosure, duplicate-success complication policy, self-rescue, and decision count. Numeric rescue values are provisional playtest tuning.
- [x] Define strict schemas for item choice, rescue target, viewer-private offer, and resolved crash report.
- [x] Test valid payloads and reject unknown fields, invalid payloads, duplicate offer entries, and impossible stage fields.
- [x] Run targeted shared protocol tests and app/Worker TypeScript checks.

## Task 2: Author and Validate Character Profiles and Items

**Files:**
- Create: `src/shared/content/characterProfiles.ts`
- Create: `src/shared/content/items.ts`
- Test: `tests/shared/characterProfiles.test.ts`
- Test: `tests/shared/items.test.ts`

**Interfaces:**
- Produces: profile catalog keyed by existing `characterId` values, used for personality/reaction presentation only at first.
- Produces: shared item catalog and uniform per-player three-item draw; duplicate items are allowed across different players' offers.

- [x] Add a schema-validated profile structure for every current character catalog entry, with presentation personality, strengths/flaws, and authored joke/reaction pools. Do not use profiles to weight item offers.
- [x] Add an initial item set covering survival, tools, food, keepsakes, and primitive crafting items such as knife, lighter, rope, binoculars, flare, apple, guitar, improvised spear, and improvised bow.
- [x] Give each entry stable IDs, concise flavor text, category, asset key, and no unapproved gameplay modifiers.
- [x] Test unique IDs, valid character references, required item categories, and catalog shape.
- [x] Run content tests and TypeScript checks.

## Task 3: Implement Pure Item Offer and Rescue Batch Rules

**Files:**
- Create: `src/shared/rules/crashRescue.ts`
- Test: `tests/shared/crashRescue.test.ts`

**Interfaces:**
- `createItemOffer(characterId, catalog, profiles, random): ItemOffer`
- `validateCrashChoice(state, playerId, choice): Result`
- `resolveCrashBatch(state, submissions, random): CrashResolution`

- [x] Write seeded tests for three distinct uniform items from the shared pool, duplicates across players' offers being permitted, self-rescue, duplicate target, missing submission default, ghost target rejection, and invalid inventory choice.
- [x] Write tests for independently sampled attempts, attempt-order permutation invariance, all rolls before death application, duplicate successful rescues saving a target once, and authored complications.
- [x] Implement pure functions with injected `RandomSource`, uniform sampling without replacement within each offer, independent draws between players, stable sorted participant IDs before random draws, and no wall-clock reads.
- [x] Test exact probability/failure boundaries and assert a seeded batch yields the same resolution under reordered submissions.
- [x] Run targeted shared rule tests and TypeScript checks.

## Task 4: Add Persisted Crash Choice Lifecycle to the Room

**Files:**
- Modify: `worker/game/GameRoom.ts`
- Modify: `worker/game/roomScheduler.ts`
- Modify: `worker/game/roomStorage.ts`
- Test: `tests/worker/crashRescue.test.ts`

**Interfaces:**
- Consumes: shared schemas and pure crash rules from Tasks 1–3.
- Produces: authoritative snapshots during the crash stages and one persisted resolution.

- [x] Add authenticated command handling; permit only the connected player to change their own item and rescue selection while the matching stage remains open.
- [x] Generate and persist each player's private offer at game start; do not regenerate on reconnect.
- [x] Advance item to rescue to resolution based on player submissions or stored absolute deadlines; disconnected players never block progression.
- [x] Resolve exactly once with cryptographic random input, persist result before broadcast, and make duplicate command/alarm handling idempotent.
- [x] Test disconnect/reconnect through a real browser reload and resume-token socket replacement during item choice; assert the offer and current selection persist.
- [x] Test unauthorized players, duplicate command IDs, replacement before lock-in, and rejection at the exact deadline through `GameRoom` command handling/mutator.
- [x] Test private offers, private pending rescue targets, duplicate targets, disconnected item timeout/default, deadline recovery, and idempotent report replay at the persisted room/scheduler boundary.
- [x] Run Worker tests and typecheck.

## Task 5: Build Choice and Resolution Presentation

**Files:**
- Create: `src/game/screens/CrashChoiceScreen.tsx`
- Create: `src/game/screens/GameSessionScreen.tsx`
- Create: `src/ui/organisms/CrashChoicePanel.tsx`
- Modify: `src/scene/phases/IslandScene.tsx`
- Test: `tests/client/crashChoice.test.tsx`
- Test: `tests/scene/crashRescueScene.test.tsx`

**Interfaces:**
- Consumes: authoritative snapshot and viewer-private offer/submission status.
- Produces: accessible item and target selection controls; scene animation cues keyed only by phase/report.

- [x] Render item and target selection in DOM with native keyboard-accessible buttons, selection status, a server-offset-aware timer, and reduced-motion-safe micro-interactions.
- [x] Keep other players' private offers/selections hidden until resolution; show the shared report only when authoritative state contains it.
- [x] Stage rescue attempts and reactions in the scene using compatible existing semantic clips (`fall`, `hug`, `cheer`, `afraid`).
- [x] Verify scene animation selection is presentation-only and never calls rule functions or changes phase.
- [x] Run client/scene tests and typecheck; inspect desktop and mobile preview screenshots.
- [x] Add simple low-poly hand-held proxy meshes for all current catalog item IDs in the island sandbox; they are visual placeholders pending generated GLB assets and hand-fit tuning.

## Task 6: Full Multiplayer Acceptance

**Files:**
- Create: `e2e/crash-choice.spec.ts`
- Modify: `docs/local-acceptance.md`

- [x] Drive three independent browser clients through lobby, crash item choice, duplicate rescue target, resolution, and the first group vote. Ghost voting and the ten-decision-to-ending progression are covered in deterministic Worker tests.
- [x] Assert viewer-private offers/submissions through protocol and room tests, and identical finalized crash reports across the three live clients.
- [x] Assert order-independent batch outcomes under submission permutations and idempotent alarm/report replay in shared-rule and Worker tests.
- [x] Add browser checks for the isolated item/rescue/report preview plus mobile overflow; separately validate the connected three-client gameplay flow below.
- [x] Run the Playwright suite against the running local server, including three independent live clients; capture and inspect the desktop first-decision screenshot and mobile preview.
- [x] Record remaining known limitations and local acceptance evidence.

## Current Verification / Limitations

- Verified: `npm run typecheck`, `npm run test:worker` (6 files / 27 tests), focused client tests (9 tests), targeted Playwright flow (3 clients through first group vote), and `npm run build` pass.
- The runtime manifest now matches the eight clips shipped in the optimized Daniel GLB; the original source model remains untouched with its 33 clips. A temporary 33-clip optimization measured 2,575,120 bytes, exceeding the established 2 MiB asset budget, so the larger clip set is deferred until it can meet that budget.
- Build reports a large client JS chunk (~1.52 MB minified), a bundle optimization concern.
- The connected lobby/game shell now mounts the crash flow at `/`; the visual island sandbox remains at `/sandbox`. The live scene is not yet driven by multiplayer snapshots, and the browser run stops after the first group vote; deterministic Worker tests cover all ten decisions, ending, and ghost ballots.
- Held-item meshes are intentionally primitive proxies. Final generated props need hand attachment alignment and proper GLB assets later.

