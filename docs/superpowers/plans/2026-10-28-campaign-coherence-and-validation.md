# Campaign Coherence and Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the expanded campaign's choices, remembered facts, endings, map, and pacing agree with what actually happens.

**Implementation status:** Core ending, campaign fact, truthful-copy, map, and deadline changes are implemented. App/Worker typechecks, 14 focused client tests, and 22 focused Worker tests pass. Two-client and human timing acceptance remain open; the 40-second vote window is a development trial based on the deterministic schedule, not a measured human-duration result.

**Architecture:** Retain the current authored node sequence and authoritative shared state machine. Repair specific state and presentation contracts, then validate complete routes before tuning timers. Keep review probes separate from regression tests: the probes intentionally reproduce defects.

**Tech Stack:** TypeScript, React, Zod public snapshots, Cloudflare Worker/Durable Objects, Vitest, Playwright.

**Spec:** `docs/design/2026-10-28-campaign-review.md`, with confirmed constraints from `docs/GAME_DESIGN.md` and `docs/design/first-campaign-story-map-v1.md`.

## Global Constraints

- “Do not add a fixed turn limit or end a run based only on elapsed real time.”
- “Do not alter existing endings or motorboat third-miss semantics.”
- “No 3D sandbox work or minigames in this slice.”
- “All-player votes should still resolve immediately.”
- “A successful escape is terminal and takes precedence over later clocks or callbacks.”
- “Private facts such as hidden fuel stay private until the current rules reveal them.”
- “Reconnecting or replaying a resolved phase cannot apply resource/item/death effects twice.”
- Work is currently uncommitted across many systems. Stage only files/hunks for each task; do not reset unrelated changes. Optional commits below are local checkpoints, not publishing instructions.
- This is a follow-up proposal, not an implementation claim. Keep the 15-minute duration described as a target until human measurements exist.

---

## File responsibilities

| Files | Responsibility |
| --- | --- |
| `src/shared/rules/stateMachine.ts` | Resolution ordering and terminal precedence |
| `src/shared/domain.ts`, `src/shared/protocol.ts`, `worker/game/roomStorage.ts` | Typed state, wire validation, legacy normalization |
| `src/shared/content/campaignRoute.ts`, `src/shared/content/motorboatRoute.ts` | Truthful options, outcomes, and next-node consequences |
| `src/game/story/incidentPresentation.ts` | Scene copy derived from the same facts |
| `src/game/storyMap/storyMapData.ts`, `src/game/screens/DecisionTestScreen.tsx` | Accurate state examples and map transitions |
| `tests/shared/campaignProgression.test.ts`, `tests/shared/campaignContent.test.ts`, `tests/shared/storyMap.test.ts` | New semantic regression coverage |
| `tests/fixtures/campaignRoom.ts` | Shared typed test fixture; no runtime dependency |
| `tests/worker/gameplay.test.ts`, `tests/worker/scheduler.test.ts`, `tests/worker/motorboat.test.ts` | Worker integration invariants |
| `e2e/full-session.spec.ts` | Route-aware two-client acceptance |
| Campaign design documents and `docs/qa/campaign-acceptance.md` | Synchronized design claims and observed results |

### Task 1: Protect a successful escape from the survival tick

**Files:** Modify `src/shared/rules/stateMachine.ts`; create `tests/fixtures/campaignRoom.ts` and `tests/shared/campaignProgression.test.ts`.

**Interfaces:** Preserve `resolveCurrentDecision(state, now, random): PrivateRoomState` and existing outcome/ending types. Export the review probe's typed `room()` fixture as `campaignRoom(): PrivateRoomState` from the new fixture file; retain its two living players, resources, initial campaign, and initial motorboat.

- [ ] Copy the fixture from `output/campaign-review/audit.test.ts` into the dedicated test fixture, then add a failing test with the corrected expectation:

```ts
const random = { next: () => 0 };
let state = campaignRoom();
state.campaign = { ...state.campaign!, node: "signal-attempt", decisionsSinceFoodTick: 2 };
for (const character of Object.values(state.characters)) {
  character.resources = { ...character.resources, food: 0, health: 10 };
}
state = beginNextCampaignStep(state, 0, random);
state.votesByPlayer = { p_0: "smoke-beacon", p_1: "smoke-beacon" };
const result = resolveCurrentDecision(state, 1, random);
expect(result.endingId).toBe("signal-rescue");
expect(result.escapeResult?.escapedCharacterIds).toEqual(["cast-daniel", "cast-samantha"]);
expect(result.escapeResult?.deadCharacterIds).toEqual([]);
expect(resolveCurrentDecision(result, 2, random)).toBe(result);
expect(advancePhase(result, 100_000, random)).toBe(result);
```

- [ ] Run `npm run test -- tests/shared/campaignProgression.test.ts`; confirm failure is the ending mismatch.
- [ ] In `finalizeDecisionOutcome`, determine valid success after direct outcome effects and before survival. Use this predicate to skip the ordinary food tick for that completed escape:

```ts
const successfulEscape = livingCharacterIds(afterOutcome).length > 0 && (
  (outcome.campaignEffect?.type === "signal-attempt" && outcome.campaignEffect.result === "success") ||
  (outcome.motorboatEffect?.type === "launch" && outcome.motorboatEffect.result === "success")
);
const foodTickDue = !successfulEscape &&
  (!campaign || campaign.decisionsSinceFoodTick >= CAMPAIGN_DECISIONS_PER_DAY - 1);
```

  Preserve a legal `decisionsSinceFoodTick` value on success instead of incrementing 2 to 3. Build the resolution report from the same final resources/passengers. Failed attempts and ordinary outcomes still consume food when due.
- [ ] Add the group-launch equivalent, a partially starving crew, a failed signal with lethal starvation, and an ordinary third-decision food tick. The first two retain living passengers; the latter two retain normal starvation effects. Reuse the existing motorboat launch fixture pattern in `tests/worker/motorboat.test.ts`.
- [ ] Run the new shared tests and the three focused Worker suites. Checkpoint only these changes with message `fix: preserve successful escape before survival tick`.

### Task 2: Separate signal position from route knowledge

**Files:** Modify domain/protocol, initial state, room normalization, campaign content, incident presentation, preview/map fixtures; add `tests/shared/campaignContent.test.ts` and extend progression tests.

**Interfaces:** Add `signalPosition: "unselected" | "ridge" | "low"` to `CampaignState`. Add optional `signalPosition?: "ridge" | "low"` to the `story-beat` effect. Keep `coast-route-marked` as knowledge of the coastal route only. Existing card factory return types stay `DecisionCard`.

- [ ] Add the route-history regression (using `createCampaignDecision` and `nextCampaignNode`, as the review probe does): daybreak `map-coast` → signal approach `use-low-path` must produce a canopy prompt and no ridge bonus. Add the inverse ridge case and a ridge → low overwrite case for normalization/testing.
- [ ] Initialize the new field to `unselected`, add its enum to the public Zod schema, and apply approach results explicitly:

```ts
// Inside the story-beat transition, alongside existing flag handling:
return {
  ...state,
  node: effect.nextNode,
  storyFlags,
  signalPosition: effect.signalPosition ?? state.signalPosition,
};
```

  Set ridge on `take-ridge-trail`, `anchor-rope`, and `survey-horizon`; make the latter's narration explicitly include reaching the identified overlook. Set low on `use-low-path`. Position bonus and window prompt read `signalPosition === "ridge"`; coastal map and first-night lookout no longer assert the crew's current position. Do not add a speculative replacement lookout bonus in this correctness task: its existing cove benefit remains.
- [ ] Normalize old rooms by reading the latest resolved approach outcome ID if present (`ridge-position`, `rope-ridge-position`, `surveyed-horizon`, `low-path-position`); otherwise use `unselected` and generic/obstructed copy. Never infer ridge position from coastal map flags. Add migration tests for both recorded outcomes and missing history; retain already stored active cards rather than rerolling them during normalization.
- [ ] Change signal preparation to preparing equipment or organizing the journey at the foot of the ridge. Change `signal-now` to “Use this opening” with outcome “The crew commits to the current opening and readies its signal.” Only the attempt card narrates transmission. Replace the gust's destroyed-tinder claim with an obscured-horizon setback so retained preparation remains true.
- [ ] Update incident copy and both development fixtures to use the new field. Keep preparation, equipment possession, and position independently selectable in fixtures. Run content/progression/protocol tests and both TypeScript checks. Checkpoint: `fix: distinguish signal position from coastal knowledge`.

### Task 3: Make camp history and arrival narration truthful

**Files:** Modify campaign and motorboat content, incident presentation, shared state/schema/normalization, tests, preview fixtures.

**Interfaces:** Add `coveReached: boolean` to campaign state, default false for new rooms; add `coveReached?: true` to story-beat effects. Keep `coveLocated` as the existing early-scout advantage for now. For legacy rooms, infer arrival only from a recorded coastal-hazard resolution or an already discovered boat. No new spring fact is required: use neutral cave-entry copy after either source of water.

- [ ] Add content cases: rain catch must not claim a spring trail; skipped/failed shelter must not claim a braced roof; healthy crew must not be described as injured; cove arrival must not narrate another journey/search. Test both scouted and unscouted arrivals so the discovery bonus is not granted retroactively.
- [ ] Replace the cave's water-dependent spring claim with “With water gathered, the crew investigates a low cave near camp.” Keep generic nearby-cave copy without the water flag. Describe the successful cave find as food, kindling, and usable dry boards; describe the wreck cache as bottles, crackers, and salvageable panels so the existing roof-material unlock has an established source.
- [ ] In `createStormWarningCard`, use the reinforcement flag for both label and result:

```ts
const reinforced = campaign.storyFlags.includes("shelter-reinforced");
const campLabel = reinforced
  ? "Keep everyone under the reinforced shelter"
  : "Huddle in the driest part of camp";
const campText = reinforced
  ? "The braced roof holds while the crew rides out the gusts."
  : "The crew stays together in the driest corner, shifting away from the leaks.";
```

  Keep the existing resource deltas in this task. Council copy must check shelter independently of the boar, or simply omit its roof claim. Remove unreachable return-visit variants.
- [ ] Give medical triage a neutral prompt: “Before the next expedition, how should the crew handle medical care and rest?” This avoids introducing a new injury subsystem or inventing a limp. Retain the real kit-dependent option.
- [ ] Mark `coveReached: true` on every coastal-hazard completion; propagate it through `nextCampaignNode`. Use reached/scouted/failed-signal facts independently in motorboat discovery and incident description. An unscouted arrival gets the base discovery options and an arrival prompt; an early scout still gets its authored bonus option.
- [ ] Update fixtures and migration/schema tests. Run the focused content, progression, and protocol tests; checkpoint as `fix: align campaign narration with recorded history`.

### Task 4: Remove false stakes before expanding character mechanics

**Files:** Modify `campaignRoute.ts`, content tests, and the campaign story map's consequence descriptions.

**Interfaces:** Retain current outcome weights and all-living resource scope for this correction pass. Use accurate group narration. Actor-specific wildlife/cave gameplay is a subsequent design enhancement, not an undocumented change to who can die.

- [ ] Add a boar-charge test that checks the affected-character IDs/resources match plural crew narration. Use “The boar charges through camp, bruising the crew and scattering food.” Change cave “small team” to an explicit crew expedition so its current all-living injury model is visible before choosing.
- [ ] Replace the strictly harmful coastal shortcut's false time saving with a concrete resource tradeoff. Proposed initial content (tuning value, not validated balance):

```ts
{
  id: "take-shortcut",
  label: "Recover a supply crate across the exposed reef",
  outcomes: [storyOutcome(
    "reef-shortcut",
    "The crew recovers food from a stranded crate, but sharp rocks bruise everyone on the crossing.",
    1, next, "recovered-reef-crate", { health: -5, food: 8 }
  )]
}
```

  Preserve the old stable outcome ID for historical compatibility. Remove the duplicate ungated `use-binoculars` choice from new coastal cards; keep historical events readable. The actual binoculars-gated signal action remains.
- [ ] Change shelter `leave-shelter` to “Rest instead of reinforcing the shelter,” with “The crew rests and lifts its spirits, leaving the roof as it was.” Keep morale +3. Remove the fictional reserve-material promise from incident copy as well.
- [ ] Stop emitting unused story flags unless a later authored scene reads them. For this pass, remove emissions of `crew-unified`, `storm-shelter`, `cave-disturbed`, `coast-injured`, and `boar-distracted`; keep their schema values accepted for persisted history. Preserve `boar-driven-off`, supplies, reinforcement, preparation, coastal knowledge, and weather facts with real readers. Do not remove resource consequences.
- [ ] Test the safe route versus the reef recovery: one preserves health, the other gains food at a known health cost; neither promises elapsed-time savings. Run content/progression tests and preview the revised choices. Checkpoint: `fix: give campaign choices truthful costs and rewards`.

### Task 5: Repair map topology and reconcile documentation

**Files:** Modify `src/game/storyMap/storyMapData.ts`, `src/game/screens/DecisionTestScreen.tsx`, the original story map, design brief, and expansion plan; create `tests/shared/storyMap.test.ts`.

**Interfaces:** Keep `getStoryMapGraph(mode): StoryMapGraph`. Treat fixture contexts as illustrative unless edges explicitly encode retained state. Do not invent an exhaustive graph claim from a collection of sample cards.

- [ ] Start with the failing graph invariant:

```ts
for (const mode of ["route", "encounters", "mechanics"] as const) {
  const graph = getStoryMapGraph(mode);
  const ids = new Set(graph.nodes.map(({ id }) => id));
  expect(ids.size).toBe(graph.nodes.length);
  expect(graph.edges.filter(({ source, target }) => !ids.has(source) || !ids.has(target))).toEqual([]);
}
```

- [ ] Add a real `decision:escape-project` summary node to receive storm outcomes, with explicitly labeled conditional links to the existing escape cases: repaired radio; no repaired radio with known cove; no repaired radio without known cove. This is a map state dispatch, not an extra playable decision. Do the same at boat discovery for scouted versus unscouted contexts rather than always choosing the scouted fixture.
- [ ] Carry explicit campaign state and item IDs on signal fixture cases. Evaluate next state with `nextCampaignNode(caseState, effect)` before choosing a case edge. Separate item availability from preparation; never give a sample rope/binoculars because it has `signal-kit-prepared`. Label omitted combinations as representative coverage. Test old coastal mapping plus low approach and pre-staged kit plus later non-kit preparation.
- [ ] Give Mermaid nodes unique descriptive IDs (`CRASH`, `WRECK_SALVAGE`, `WILDLIFE`, `CAVE`). Replace the nonexistent boat recovery → project selection link with recovery → repair/launch. State that failed signal goes to coastal expedition. Preserve no-survivor termination as a global rule.
- [ ] Revise example histories: the scout sees the boat early, but actual discovery/repair follows the survival arc. Add approach and weather-window stages to the expansion plan's summary. Make the plan/status distinguish implementation from acceptance.
- [ ] Run graph/content tests, inspect `/story-map` and `/decision-test`, and verify the new transitions visually. Checkpoint: `fix: align campaign maps with authoritative routes`.

### Task 6: Validate complete routes and reconnect behavior

**Files:** Extend shared progression tests, focused Worker suites, `e2e/full-session.spec.ts`; create `docs/qa/campaign-acceptance.md`.

**Interfaces:** Exercise existing phase transitions and public snapshots. Use deterministic `RandomSource` in rule tests; do not ship a production endpoint for forcing RNG or skipping phases.

- [ ] Convert the review's complete-route walker into passing regression coverage with explicit option IDs instead of “first option.” Assert terminal type, passenger/dead/stranded partition, expected node sequence, and public schema validity. Cover signal success, failed signal → boat, direct group boat, private solo, third distinct miss, early all-dead, missing tools, successful refusal, and actor unavailable. Assert a completed ending cannot be advanced or resolved again.
- [ ] Replace the E2E loop's ten-decision limit with a terminal-state loop and a 40-transition diagnostic guard. This guard fails the test with the last card/phase; it is not a game rule. Use stable card/option identifiers in selectors, adding `data-decision-id` and `data-option-id` to the existing decision UI if necessary. Handle assignment/private phases on whichever client owns them, and assert both clients agree after each public transition.
- [ ] Make two explicit browser scenarios: pursue signal and accept its actual success/fallback; pursue boat and complete its actual group/solo/storm terminal outcome. Deterministic rule tests cover each exact ending; do not make browser tests flaky by demanding a random success. Validate both actual ending rosters and snapshot agreement.
- [ ] Reconnect one client after a survival decision and after signal failure. Verify unchanged resources/flags, no replayed application, and the same next node. During hidden fuel ownership, inspect both viewers' snapshots and assert only the authorized viewer receives owner-only information.
- [ ] Run `npm run test -- tests/shared/campaignProgression.test.ts tests/shared/campaignContent.test.ts tests/shared/storyMap.test.ts tests/shared/protocol.test.ts`, the focused Worker suites, and `npm run test:e2e -- e2e/full-session.spec.ts`. Record actual results in the acceptance report. Repair existing selector assumptions in that test as part of adapting it to the current UI.
- [ ] Track the five unrelated failing files from the review separately; do not mask them or describe the whole repository as green. Before release, require the full existing check pipeline to pass. Checkpoint: `test: validate complete campaign routes and reconnects`.

### Task 7: Tune time for discussion, then evaluate narrative depth

**Files:** Modify `VOTING_DURATION_MS` in `src/shared/rules/stateMachine.ts`, exact deadline expectations in `tests/worker/gameplay.test.ts` and `tests/worker/scheduler.test.ts`, and acceptance/design documents.

**Interfaces:** No new session timer or protocol command. Assignment/private deadlines stay 15 seconds; group votes use a 40-second timeout and still resolve immediately when all eligible players have voted.

- [ ] Record the baseline schedule table from the review and measure human time from Start the crash to terminal transition, with lobby/ending-reading separately recorded. For each scene, note reading/discussion duration, timed-out ballots, reveal waiting, and whether players can explain the consequence. Do not put hidden fuel ownership in public telemetry.
- [x] Trial a 40-second voting deadline in development:

```ts
export const VOTING_DURATION_MS = 40_000;
```

  At full deadlines, the reviewed signal path becomes 16:17 and the direct boat sample 18:02; actual all-voted runs should be faster. This is a starting experiment, not a guarantee. Retain 20-second reveals for the first comparison so only one pacing variable changes.
- [x] Update the vote deadline expectation and retain the scheduler assertion that all-submitted ballots resolve before the deadline. App and Worker typechecks and 22 focused Worker tests pass. Human runs remain outstanding.
- [ ] Use a provisional 12–18-minute range for a typical first-attempt human run, with failures/retries reported separately. The 40-second deadline yields schedule upper bounds of 16:17 (signal) and 18:02 (direct boat) for the review's routes; actual all-voted runs may be shorter. Human participants still need to assess discussion time.
- [ ] Evaluate whether the council and cave create memorable choices. The next small narrative improvement should be one named actor encounter with existing nomination/refusal controls and a later factual callback. Write its mini-spec only after the coherence fixes: exact eligible actor, personal cost, refusal consequence, and later reader. Leave skill formulas, full item consumption, water economy, new ending types, and optional branch expansion out of this patch.
- [ ] Publish measured status in the design brief and acceptance report, then checkpoint the chosen timing change as `tune: allow campaign decision discussion time`.

## Completion gate

- Successful signal/group departure cannot be replaced by a same-resolution survival tick.
- No tested prompt invents a ridge position, spring, shelter, injury, supply source, or repeated arrival.
- Current choices advertise their actual resource/actor effects; legacy flags remain readable without generating new unsupported facts.
- Every map edge has endpoints, state-dependent branches are explicit, and the documents match live route commitment.
- Exact endings and replay invariants pass deterministic tests; two-client runs validate synchronization and private-state boundaries.
- Duration is reported as measured human evidence alongside the timer model, with immediate all-voted resolution preserved.

Self-review: R1 → Task 1; R2 → Task 5; R3 → Task 2; R4 → Task 3; R5 → Task 4 plus the bounded follow-up in Task 7; R6 → Task 7; R7 → Task 6. Wider skill/item/economy work is explicitly deferred, not claimed as complete.
