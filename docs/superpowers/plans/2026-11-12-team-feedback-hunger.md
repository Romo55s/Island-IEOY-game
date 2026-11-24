# Hunger and Nighttime Decisions Implementation Plan

**Implementation status (2026-11-23):** Feature code is implemented locally. The detailed checklist below is the original planning record; actual file consolidation, executed checks, deviations and remaining human/multiplayer acceptance are recorded in the [master completion record](2026-11-12-team-feedback.md) and [QA report](../../qa/team-feedback.md). Unchecked original steps must not be interpreted as a claim that their exact procedure or broader acceptance was completed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hunger-triggered group cannibalism decision and a private nighttime attempt with persistent, named outcomes and correct route resumption.

**Architecture:** Separate eligibility/scheduling, probability tables, and atomic outcome reduction into focused modules. Reuse decision and private-choice UI phases, but represent victim nominations separately from compulsory worker assignments. Leave the normal campaign/motorboat node intact while a persisted interrupt is active.

**Tech Stack:** TypeScript/Zod, server-owned Durable Object room state, React, Vitest, Worker integration tests, Playwright.

**Spec:** `docs/design/2026-11-12-team-feedback-features.md`, sections 4–6.

## Global Constraints

Use every exact threshold, probability, cost, cap and timeout in the spec as initial proposed tuning. Ghosts vote but do not attack or become victims. New interrupt phases do not advance daily food consumption or motorboat missed opportunities. Never reroll on reconnect, stale commands, alarm retries, or storage reload. A completed ending clears all pending work.

### Task 1: Contracts and pure opportunity rules

**Files:** Create `src/shared/desperation/types.ts`, `src/shared/desperation/config.ts`, `src/shared/desperation/opportunities.ts`, and `tests/shared/desperationOpportunities.test.ts`; modify `src/shared/domain.ts`, `worker/game/roomStorage.ts`.

**Interfaces:** Add optional `desperation?: DesperationState` to `PrivateRoomState`. Define the following exported types in the new types module:

```ts
export interface DesperationState {
  day: number;
  groupOfferCount: number;
  nightOfferCount: number;
  lastGroupDay?: number;
  lastAttemptDay?: number;
  lastNightCheckDay?: number;
  lastNightActorId?: string;
  ordinaryDecisionsSinceGroup: number;
  nightCheckDue: boolean;
  active?: { id: string; kind: "group" | "night"; day: number };
}
export type DesperationOutcomeId =
  | "group-succeeded" | "target-fought-free" | "group-backed-down"
  | "night-succeeded" | "night-caught" | "night-regretted"
  | "food-found" | "search-failed" | "slept" | "attempt-cancelled";
export interface DesperationEventFacts {
  opportunityId: string;
  kind: "group" | "night";
  outcomeId: DesperationOutcomeId;
  actorCharacterId?: string;
  targetCharacterId?: string;
}
```

Export `nightOfferChanceBps(starvingCount: number, livingCount: number): number` and `canOfferGroupCrisis(state: PrivateRoomState): boolean` from opportunities.ts. Export `initialDesperationState(): DesperationState` there, returning day/counts zero, `ordinaryDecisionsSinceGroup: 1`, and `nightCheckDue: false`. Reject invalid counts; fewer than two living characters returns zero chance.

- [ ] Add pure tests before implementation:

```ts
expect(nightOfferChanceBps(0, 4)).toBe(0);
expect(nightOfferChanceBps(1, 4)).toBe(3500);
expect(nightOfferChanceBps(2, 4)).toBe(6500);
expect(nightOfferChanceBps(4, 4)).toBe(8500);
expect(nightOfferChanceBps(1, 1)).toBe(0);
```

- [ ] Implement the spec's camp boundary allowlist, session/day limits, active-phase exclusion, half-starving threshold, and at-least-one-normal-decision separation. Terminal state always rejects.
- [ ] Keep all weights and deltas in config.ts. Normalize only missing optional state during room load; do not overwrite persisted progress or replay past nights. No public snapshot includes raw private scheduling state.
- [ ] Run `npm run test -- tests/shared/desperationOpportunities.test.ts`. Checkpoint contracts and pure eligibility.

### Task 2: Atomic, attributable consequence reduction

**Files:** Create `src/shared/desperation/resolve.ts` and `tests/shared/desperationResolution.test.ts`; modify `src/shared/domain.ts`, `src/shared/rules/resolvedEvents.ts`, `src/shared/protocol.ts`, `src/ui/organisms/ConsequencePanel.tsx`.

**Interfaces:** Add optional `desperation?: DesperationEventFacts` to `EventEntry` and `ResolvedDecision`. Keep existing resource/status causes as `outcome`; detailed reason is in the new facts. Export these functions/types from resolve.ts:

```ts
export interface DesperationRequest {
  opportunityId: string;
  kind: "group" | "night";
  action: "search" | "attempt" | "sleep";
  actorCharacterId?: string;
  targetCharacterId?: string;
}
export interface DesperationResolution {
  state: PrivateRoomState;
  facts: DesperationEventFacts;
  resourceChanges: ResolvedResourceChange[];
  statusChanges: ResolvedStatusChange[];
}
export function pickAttemptOutcome(kind: "group" | "night", random: RandomSource): DesperationOutcomeId;
export function resolveDesperation(state: PrivateRoomState, request: DesperationRequest,
  random: RandomSource): DesperationResolution;
```

These types import existing room/change types from domain.ts and `RandomSource` from rules/random.ts. The reducer validates participants, updates both character/player status, and returns actual before/after deltas. It does not write storage, advance time, append events, or schedule another encounter.

- [ ] Add probability boundary tests using the existing `sequenceRandom` helper:

```ts
expect(pickAttemptOutcome("group", sequenceRandom([0.4499]))).toBe("group-succeeded");
expect(pickAttemptOutcome("group", sequenceRandom([0.45]))).toBe("target-fought-free");
expect(pickAttemptOutcome("night", sequenceRandom([0.20]))).toBe("night-caught");
expect(pickAttemptOutcome("night", sequenceRandom([0.70]))).toBe("night-regretted");
```

- [ ] Implement one cumulative outcome draw using the exact spec tables. Search draws its own 65/35 outcome; sleep and invalid participant cancellation draw nothing. Night requests require an actor and target and reject self-targeting. Group attempts require a target. Reject invalid kind/action combinations.
- [ ] Use explicit recipient sets: group success feeds all living survivors except the victim; night success feeds only its actor. Clamp all resources; apply the group resistance HP floor of 1; allow night knockout HP to hit zero and become a ghost. Emit deltas from actual state changes, not configured amounts.
- [ ] Add fixtures for two living characters, ghosts, HP=1 resistance, HP=10 knockout death, food=95 rewards, dead target cancellation, missing actor, and all resource/status recipient sets. Assert no unrelated character loses health.
- [ ] Extend strict event/snapshot schemas and report rendering to show named actor, victim, food result, damage, and actual death. Support the existing report structure for private results without fabricating group votes; use an empty option-results list for private actions.
- [ ] Run `npm run test -- tests/shared/desperationResolution.test.ts tests/shared/resolvedEvents.test.ts tests/client/consequencePanel.test.tsx`. Checkpoint reducer and event contracts.

### Task 3: Group target votes and campaign interruption

**Files:** Create `src/shared/content/desperationCards.ts`, `src/shared/desperation/coordinator.ts`, and `tests/worker/desperation.test.ts`; modify `src/shared/rules/stateMachine.ts`, `src/shared/domain.ts`, `src/shared/protocol.ts`, `worker/game/GameRoom.ts`, `worker/game/roomScheduler.ts`, `src/ui/organisms/DecisionConsole.tsx`, `src/ui/organisms/CharacterNominationModal.tsx`, `src/game/screens/GameSessionScreen.tsx`.

**Interfaces:** Add `targetNominationsByPlayer?: Record<string,string>` to private room state; optional `targetCharacterId` to vote payloads; and `targetSelection?: { eligibleCharacterIds: string[]; label: string }` to public options. Do not overload `assignedCharacterId`. Export `createHungerCrisisCard(): DecisionCard` from the content file and `beginDesperationIfEligible(state, now, random): PrivateRoomState | null` from coordinator.ts, using existing types and the new modules. Return null when no interrupt starts.

- [ ] Add Worker fixtures for an eligible hungry crew at a camp boundary. Verify the crisis replaces the next displayed choice temporarily, while the underlying campaign node remains unchanged. Add targeted vote submission tests rejecting missing/dead/unknown targets and accepting ghost voters selecting living targets.
- [ ] Offer Search and Choose someone to eat. Target votes are counted only among ballots choosing the winning cannibalism option. Resolve highest nomination count with one tie draw. For the existing no-vote random rule, draw from eligible living targets only if the attack option was selected. Reject unexpected target fields on Search. Clear both vote maps between decisions.
- [ ] Add an explicit decision classification (`kind?: "normal" | "hunger-crisis"` on authored cards) and use it in `finalizeDecisionOutcome` to route hunger reduction through Task 2. Do not determine new behavior by searching prose. Hunger results do not update normal route effects or `decisionsSinceFoodTick`.
- [ ] At `beginNextCampaignStep` and `beginNextMotorboatStep`, check terminal and existing pending actions first; then check eligible interrupt scheduling before generating the next ordinary card. Guard against recursive scheduling using active state and consumed day/counter markers. Preserve normal motorboat ownership cleanup.
- [ ] Increment desperation day/night-due bookkeeping only with actual normal food ticks; successful escape never queues a crisis. After interrupt reveal, clear active state and resume normal generation using the unchanged route node. Do not restore an old full room snapshot, which would undo deaths/rewards.
- [ ] Add client target selection with explicit victim wording, distinct from assigning a task. On timeout the original group no-vote rules still apply; show that consequence in the prompt. Backend target validity remains authoritative.
- [ ] Run `npm run test:worker -- tests/worker/desperation.test.ts` and `npm run test -- tests/shared/campaignCoherence.test.ts tests/client/assignmentResponsePanel.test.tsx`. Verify normal day counts, no repeated crisis on reveal advancement, both route continuations, and no nomination state leaking into later decisions. Checkpoint the playable group feature.

### Task 4: Private nighttime lifecycle and privacy

**Files:** Extend `src/shared/desperation/coordinator.ts`, `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/rules/stateMachine.ts`, `worker/game/GameRoom.ts`, `worker/game/roomScheduler.ts`, `src/ui/organisms/PrivateChoicePanel.tsx`, `src/game/screens/GameSessionScreen.tsx`; extend `tests/worker/desperation.test.ts`, `tests/shared/protocol.test.ts`, and `tests/client/privateChoicePanel.test.tsx`.

**Interfaces:** Extend `PendingPrivateChoice.kind` with `night-hunger`; extend `PrivateChoiceOptionId` with `sleep` and `attempt-eat`, and `defaultOptionId` with `sleep`. Add `targetCharacterIds?: string[]` to the viewer-only private-choice projection. Continue using `private-choice.respond` with choiceId, optionId, and optional targetCharacterId; retain fuel transfer target fields for compatibility.

- [ ] Add privacy fixtures before implementation: actor sees options/eligible targets; all other viewers, including the host and ghost players, see only camp-night waiting copy. Assert serialized outsider snapshots contain neither the actor/target IDs in private-choice fields nor actor responses. Public unrelated roster membership is allowed.
- [ ] On a due camp-night check, persist day consumed before presenting any offer. Draw chance once, then draw an eligible starving actor using stable sorted IDs, avoiding the previous actor where possible. Honor all counts and skip a day with a group attempt. Clear the due marker even when the chance fails; no repeated rolls each frame/command.
- [ ] Set the 15-second private deadline, omit `publicActorCharacterId`, and set default Sleep. Permit target IDs only for attempt-eat; reject self, dead, nonexistent, expired, wrong-player, duplicate and stale submissions. Repeat participant validation in the resolver. Default never attacks.
- [ ] Branch private resolution on `choice.kind` before touching motorboat state. Route night choices to Task 2 and produce one persisted report; no fuel deduction or missed tide. Sleep resumes quietly without revealing the actor. All attempted outcomes reveal both names and exact result. Night reports carry fresh injury/death cues for the current dialogue system.
- [ ] Ensure room alarm/restart loads preserve choice ID/deadline/response and resolution sequence. Commit state and result through existing room persistence before emitting snapshots. Old commands and repeated alarms cannot rerun resource effects.
- [ ] Run `npm run test:worker -- tests/worker/desperation.test.ts` and `npm run test -- tests/shared/protocol.test.ts tests/client/privateChoicePanel.test.tsx`. Cover restart before response, after response, and after event persistence, then checkpoint the private feature.

### Task 5: Previews, complete flows, and tuning evidence

**Files:** Modify `src/game/screens/DecisionTestScreen.tsx`, `src/game/story/incidentPresentation.ts`, `src/game/storyMap/storyMapData.ts`, `src/shared/content/crewDialogue.ts`, `src/ui/organisms/ConsequencePanel.tsx`; extend `e2e/team-feedback.spec.ts`; create/update `docs/qa/team-feedback.md`.

**Interfaces:** Read `DesperationEventFacts` and persisted changes. Use existing art and reaction clips; injury/death facts outrank a cheerful food-success cue. In story maps show conditional camp interrupts with return edges, not mandatory branches every playthrough.

- [ ] Add deterministic previews for group search success/failure, all three group attempts, all three night attempts, sleep, invalid target cancellation, and knockout death. Include one living survivor and a full-roster preview to exercise eligibility/layout limits.
- [ ] Author result-specific lines that acknowledge betrayal, escape, or regret. Update hunger profile jokes that currently deny cannibalism as a game possibility, while retaining individual characters who object to it. Do not fabricate forgiveness, a kill, or a reward absent in the persisted result.
- [ ] Add browser flows for group target selection and private actor controls; check keyboard modal focus and narrow/mobile layouts. Use two authenticated clients plus a ghost to verify who can see and submit each action. Continue after resolution through ordinary voting and an escape ending.
- [ ] Run `npm run test:e2e -- e2e/team-feedback.spec.ts` and the integrated checks in the master plan. Capture report/radio agreement and restart evidence.
- [ ] Record initial chance tables as unvalidated tuning. During human playtests record crises/night offers per run, hungry days, deaths by cause, food recovered, choices declined, and added session duration. Compare ordinary successful and deliberately starved routes; adjust config only in a separately recorded tuning change supported by results. Checkpoint completed feature documentation.
