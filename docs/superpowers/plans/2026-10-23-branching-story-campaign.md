# Branching Story Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace arbitrary encounter sequencing with an authoritative connected story graph, then add a signal-rescue route alongside the existing motorboat route.

**Architecture:** Keep campaign facts and transitions in the shared server-owned state machine, with serializable state persisted by current room storage. Authored node builders live in `src/shared/content/campaignRoute.ts`; `CampaignState.node` gates the next decision, and resolved outcomes update state once. Keep the normal story room as the presentation layer and preserve `/sandbox` as a separate development view.

**Tech Stack:** React, TypeScript, PartyServer/Cloudflare Worker, Zod protocol schemas, existing room persistence and decision-card/outcome rules.

**Spec:** `docs/design/first-campaign-story-map-v1.md`, `docs/GAME_DESIGN.md`, and `docs/design/motorboat-route-v1.md`.

## Global Constraints

- Server state is authoritative for decisions, route eligibility, randomness, outcomes, and endings.
- Preserve privacy of private discoveries and player votes.
- Do not select ineligible scenes or endings at random.
- Existing motorboat rule behavior remains unchanged while it is migrated to graph nodes.
- Every branch has an eligible successor, recovery path, or explicit terminal outcome.
- Keep item, injury, death, resource, and rescue facts truthful in later narration and endings.
- Do not add AI-generated narrative resolution or client-side mechanics.

---

### Task 1: Specify and validate the story graph contract

**Files:**
- Create: `src/shared/content/storyGraph.ts`
- Create: `src/shared/rules/storyGraph.ts`
- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Test: `tests/shared/storyGraph.test.ts`

**Interfaces:**
- `CampaignState` stores the current node and the persistent radio, shelter, cove, lookout, flare, and signal facts.
- `createCampaignDecision({ campaign, startingItemIds })` builds the authored decision for the current campaign node.
- `nextCampaignNode(campaign, effect)` returns the updated campaign state from the resolved outcome; it never selects an unrelated random encounter.

- [x] Define campaign node/state and outcome-effect types in `src/shared/domain.ts`.
- [x] Build authored cards from campaign state; only signal methods with available gear are offered, with smoke as a supported fallback.
- [x] Keep private fuel ownership outside the public campaign projection.
- [ ] Define migration behavior for unknown campaign node IDs before the campaign map grows beyond this fixed first arc.
- [ ] Add deterministic tests for node eligibility, private projection, reconvergence preserving facts, and dead-end detection.

### Task 2: Persist and advance authoritative story state

**Files:**
- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Modify: `src/shared/rules/stateMachine.ts`
- Modify: `worker/game/roomStorage.ts`
- Modify: `worker/game/GameRoom.ts`
- Test: `tests/shared/stateMachine.test.ts`
- Test: `tests/worker/GameRoom.test.ts`

**Interfaces:**
- `PrivateRoomState.story` stores the active node and persistent campaign facts.
- A successful resolution updates the node facts once and transitions through `selectNextStoryNode`.
- `PublicGameSnapshot.story` exposes current public node context without revealing private item owners or votes.

- [x] Initialize campaign state when a new game starts; rooms from older sessions without campaign state continue through their legacy progression.
- [x] Route crash resolution through shoreline and camp nodes, then hand motorboat choices to the existing motorboat state machine without changing its rules.
- [x] Record resolved campaign choices in campaign state and the public resolved-event facts.
- [x] Derive the current card and incident presentation from campaign state while preserving existing vote callbacks and deadlines.
- [ ] Cover restart/reconnect, timeout resolution, and duplicate resolution idempotence.

### Task 3: Add the shoreline priorities and first-night preparation

**Files:**
- Modify: `src/shared/content/campaignRoute.ts`
- Modify: `src/game/story/incidentPresentation.ts`
- Test: `tests/shared/storyGraph.test.ts`
- Test: `tests/shared/stateMachine.test.ts`

**Interfaces:**
- Campaign node IDs and choice IDs match `docs/design/first-campaign-story-map-v1.md`.
- Shoreline options set radio-recovery, shelter-condition, or cove-location facts from the authoritative resolution.
- First-night preparation preserves those facts and records radio repair/lookout/rest/foraging choices.
- Signal and motorboat choices remain available through supported fallback actions; earlier preparation changes cost/risk, not whether the campaign can continue.

- [x] Author the shoreline priority decision: recover wreck equipment, move crew to cover, or scout the coast.
- [x] Author first-night preparation options: repair recovered radio, rest/ration, send a lookout, or forage for food; show only options whose prerequisites are met plus a valid fallback.
- [x] Preserve radio, shelter, cove, resource, item, and character-condition facts when routes reconverge at camp.
- [x] Add truthful branch-aware scene copy and an incident art mapping with fallback.
- [x] Make the signal unavailable after its one attempt; route signal failure directly into the coast/boat path.

### Task 4: Add a signal-rescue route and distinct ending

**Files:**
- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Modify: `src/shared/content/campaignRoute.ts`
- Modify: `src/shared/rules/stateMachine.ts`
- Modify: `src/game/screens/EndingSummary.tsx`
- Modify: ending styles and story presentation
- Test: `tests/shared/stateMachine.test.ts`
- Test: `tests/worker/GameRoom.test.ts`

**Interfaces:**
- Signal-route state records eligibility, gear, attempt ID, outcome, and the final rescue participant list.
- Add a distinct ending ID for a successfully completed signal rescue; keep group/solo boat and storm endings compatible.
- The client renders the authoritative escape result and cast disposition supplied by the server.

- [x] Define signal-route options for repaired radio, flare, or costly improvised smoke; use authored chance weights that scouting can improve.
- [x] Implement resolution and persist the exact rescued, stranded, and dead character IDs.
- [x] Add the signal-rescue ending and factual epilogue copy.
- [x] Ensure failed signals consume the attempt and continue to the motorboat route.

### Task 5: Integrate story room, scene reactions, and replay evidence

**Files:**
- Modify: `src/game/story/incidentPresentation.ts`
- Modify: `src/game/screens/StoryIncidentRoom.tsx`
- Modify: `src/game/screens/EndingSummary.tsx`
- Modify: `docs/GAME_DESIGN.md`
- Modify: `docs/ROADMAP.md`
- Test: focused browser/manual session acceptance; existing server and shared test suites

**Interfaces:**
- Every active node has a title, image, prompt, relevant cast, and truthful consequence presentation.
- Ending summaries use the authoritative cast disposition and selected ending ID.

- [ ] Show earlier route facts in later scene copy and the final epilogue without leaking private data.
- [ ] Review the entire graph for unreachable nodes, dead ends, contradictory facts, and unearned endings.
- [ ] Play full runs that reach boat group escape, boat solo escape, signal rescue, storm failure, and no-survivor ending.
- [ ] Update roadmap checkboxes only after each path is implemented and verified.

## Current acceptance gaps

- The story-first layout has been reviewed in a two-client browser session through the signal-rescue ending; a full submitted-choice playthrough and alternate ending acceptance remain open.
- New sessions now follow authored shoreline, camp, signal, and motorboat nodes; the old generic decision cards remain only for compatibility with older session state.
- Current ending IDs now include signal rescue alongside group escape, solo escape, and no survivors. The raft is explicitly deferred from this first arc.
- The signal-success graph path has been played successfully. Signal failure and the new cove-specific boat discovery have type coverage only from compilation and still need browser acceptance; retain the prior checkpoint commit.
