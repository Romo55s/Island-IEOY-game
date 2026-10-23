# Assignment and Refusal Foundation Implementation Record

**Status:** completed and verified 2026-10-19. This record preserves the implemented scope; the motorboat route is the next separate milestone.

> **For agentic workers:** REQUIRED SUB-SKILL: use the repository's game, Durable Object, Worker, and UI skills relevant to the assigned task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** let a group decision nominate one living character, persist a public 15-second assignment, and resolve accept, refusal success/failure, or timeout exactly once before reveal.

**Architecture:** group ballots keep their existing option vote and add a private nomination stored separately. If the winning option requires an actor, the server commits the winning option, anonymous totals, and selected actor into a new `assignmentResponse` phase without applying the consequence. Only the assigned player can respond; the server then finalizes one outcome and one structured event, with timeout treated as acceptance.

**Tech Stack:** TypeScript, Zod 4, React, Zustand/PartySocket, Cloudflare Worker + PartyServer Durable Object, Vitest, Cloudflare Vitest runtime.

**Spec:** `docs/design/assignment-refusal-v1.md`

## Global Constraints

- The assigned character and deadline are public; only that player's snapshot exposes the response controls and qualitative refusal risk.
- The numerical refusal chance, random roll, per-player ballots, nomination ownership, and pending response never enter public snapshots.
- Response duration is exactly `15_000` ms.
- Timeout accepts; failed refusal forces the selected task; successful refusal follows one authored alternative and never starts a reassignment loop.
- Ghosts keep equal group votes and nomination rights but cannot be assigned a physical task.
- Resolve all random choices once on the server. Reconnect and duplicate commands must not reroll or duplicate effects.
- Preserve old rooms and cards: new stored fields are optional or normalized, the storage key remains `room:v1`, and options without assignment use the current decision path.
- No deployment or commit from the shared dirty working tree.

---

### Task 1: Shared assignment contract

**Files:**

- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Modify: `tests/shared/protocol.test.ts`

**Interfaces:**

- Produces: `AssignmentSpec`, `PendingAssignment`, `ResolvedAssignment`, assignment-aware `DecisionOption`, snapshot fields, and `assignment.respond`.

- [x] **Step 1: Add protocol tests**

Cover protocol version 3, an assigned vote with `assignedCharacterId`, `assignment.respond`, public assignment visibility, actor-only `viewerAssignment`, and rejection of numeric chance/pending response in a public snapshot.

- [x] **Step 2: Add domain types**

```ts
export type QualitativeRisk = "favorable" | "uncertain" | "risky";

export interface AssignmentSpec {
  roleLabel: string;
  actorSelection: "group-nominated-living";
  refusal: {
    successChanceBps: number;
    qualitativeRisk: QualitativeRisk;
    successOutcomes: Outcome[];
  };
}

export interface PendingAssignment {
  id: string;
  decisionId: string;
  optionId: string;
  actorCharacterId: string;
  actorPlayerId: string;
  roleLabel: string;
  selectionMethod: "group-nomination" | "random-fallback";
  createdAt: number;
  deadlineAt: number;
  response: "accept" | "try-refuse" | null;
}

export interface ResolvedAssignment {
  id: string;
  actorCharacterId: string;
  roleLabel: string;
  selectionMethod: "group-nomination" | "random-fallback";
  result: "accepted" | "timeout-accepted" | "refusal-succeeded" | "refusal-failed" | "actor-unavailable";
}
```

Add `assignment?: AssignmentSpec` to `DecisionOption`, `effectTarget?: "all-living" | "assigned-actor"` to `Outcome`, `assignment?: ResolvedAssignment` to `ResolvedDecision`, and `assignmentResponse` to `GamePhase`.

Private room additions:

```ts
assignmentNominationsByPlayer?: Record<string, string>;
pendingAssignment?: PendingAssignment;
resolutionSequence?: number;
```

Public decision options expose only `assignment?: { roleLabel: string; eligibleCharacterIds: string[] }`. Public snapshots expose:

```ts
activeAssignment?: Pick<PendingAssignment, "id" | "decisionId" | "optionId" | "actorCharacterId" | "roleLabel" | "deadlineAt">;
viewerAssignment?: { canRespond: true; qualitativeRisk: QualitativeRisk };
```

- [x] **Step 3: Add strict Zod validation**

Require `activeAssignment`, winner, and anonymous totals during `assignmentResponse`. Permit `viewerAssignment` only when the active assignment exists. Validate basis points only in private content types, never in the public schema. Bump `PROTOCOL_VERSION` to `3`.

- [x] **Step 4: Run focused tests**

Run: `npx vitest run --config vitest.config.ts tests/shared/protocol.test.ts`

Expected: PASS.

---

### Task 2: Pure nomination and refusal rules

**Files:**

- Create: `src/shared/rules/assignments.ts`
- Create: `tests/shared/assignmentRules.test.ts`
- Modify: `src/shared/rules/outcomes.ts`
- Modify: `src/shared/rules/resolvedEvents.ts`
- Modify: `tests/shared/resolvedEvents.test.ts`

**Interfaces:**

- Produces: `eligibleLivingAssignments`, `resolveAssignedActor`, `didRefusalSucceed`, actor-targeted outcome application, and assignment facts in resolved events.

- [x] **Step 1: Write deterministic rule tests**

Cover nomination majority, tied leaders, zero valid nominations, ghost nomination of a living actor, exclusion of ghost actors, refusal boundaries (`roll * 10_000 < successChanceBps`), and actor-targeted resource/death effects.

- [x] **Step 2: Implement pure selection**

```ts
export function resolveAssignedActor(
  state: PrivateRoomState,
  winningOptionId: string,
  random: RandomSource,
): { actorCharacterId: string; actorPlayerId: string; selectionMethod: "group-nomination" | "random-fallback" } | null;
```

Count nominations only from ballots for the winning option and only when the nominated character is currently living. Use the existing highest-count/tied-leader random rule. If no valid nomination exists, select once from sorted living candidates with `randomIndex`.

- [x] **Step 3: Implement refusal boundary**

```ts
export function didRefusalSucceed(successChanceBps: number, random: RandomSource): boolean {
  return random.next() * 10_000 < successChanceBps;
}
```

Reject non-integer chances outside `0..10_000`.

- [x] **Step 4: Target only the assigned actor**

When an outcome has `effectTarget: "assigned-actor"`, require an assigned actor and pass an effective `affectedCharacterId`/`eliminateCharacterId` into the existing outcome application. Options without this flag retain current all-living behavior.

- [x] **Step 5: Record assignment facts**

Extend `createResolvedDecision` input with optional `assignment`. Add its actor to `affectedCharacterIds` even if no measured resource changed.

- [x] **Step 6: Run focused tests**

Run: `npx vitest run --config vitest.config.ts tests/shared/assignmentRules.test.ts tests/shared/resolvedEvents.test.ts`

Expected: PASS.

---

### Task 3: Authoritative assignment phase

**Files:**

- Modify: `src/shared/rules/stateMachine.ts`
- Modify: `tests/worker/gameplay.test.ts`
- Modify: `tests/worker/scheduler.test.ts`

**Interfaces:**

- Consumes: Task 1 contract and Task 2 pure helpers.
- Produces: `resolveDecisionVote` and `resolvePendingAssignment`.

- [x] **Step 1: Split vote lock from consequence resolution**

Add `ASSIGNMENT_RESPONSE_DURATION_MS = 15_000`. `resolveDecisionVote` computes totals and winner. Normal options call the current finalization path. Assigned options select the actor and return:

```ts
{
  ...state,
  phase: "assignmentResponse",
  resolvedOptionCounts: counts,
  winningOptionId,
  assignmentNominationsByPlayer: {},
  pendingAssignment,
  phaseDeadlineAt: now + ASSIGNMENT_RESPONSE_DURATION_MS,
  resolutionSequence: sequence,
}
```

No outcome, daily survival tick, or reveal event happens yet.

- [x] **Step 2: Finalize once**

`resolvePendingAssignment(state, now, random)` must:

- return the same object outside `assignmentResponse` or after pending state is gone;
- treat `response === null && now >= deadlineAt` as `timeout-accepted`;
- return unchanged before deadline with no response;
- resolve accept against main outcomes;
- roll refusal once, using refusal-success outcomes on success and main outcomes on failure;
- apply exactly one daily survival tick;
- create exactly one structured event including assignment result;
- clear `pendingAssignment` and enter reveal.

- [x] **Step 3: Use stable sequence IDs**

Initialize `resolutionSequence` to zero for new rooms and derive assignment/event IDs from room code + incremented sequence, not wall-clock timestamps. Existing optional states use `state.resolutionSequence ?? 0`.

- [x] **Step 4: Update phase advancement**

`advancePhase` uses `resolveDecisionVote` for decision deadlines and `resolvePendingAssignment` for assignment deadlines. Reveal progression remains unchanged for now.

- [x] **Step 5: Test state behavior**

Cover accept, timeout, refusal success, refusal failure, actor becoming invalid (`actor-unavailable` using the authored safe fallback outcomes), one survival tick, and repeated resolution returning the same object without duplicate events/effects.

- [x] **Step 6: Run rule and scheduler tests**

Run: `npx vitest run --config vitest.worker.config.ts tests/worker/gameplay.test.ts tests/worker/scheduler.test.ts --max-workers=1 --no-isolate`

Expected: PASS.

---

### Task 4: Worker commands, persistence, and reconnect

**Files:**

- Modify: `worker/game/GameRoom.ts`
- Modify: `worker/game/roomScheduler.ts`
- Modify: `worker/game/roomStorage.ts`
- Create: `tests/worker/assignment.test.ts`

**Interfaces:**

- Consumes: `assignment.respond`, `resolveDecisionVote`, and `resolvePendingAssignment`.
- Produces: persisted, viewer-specific assignment behavior.

- [x] **Step 1: Validate assignment nominations**

For an assigned option, `vote.submit` requires a living `assignedCharacterId`. Replacing the ballot replaces or clears the stored nomination. A normal option rejects or ignores no nomination; it must not retain an old nomination.

- [x] **Step 2: Validate actor response**

Accept `assignment.respond` only when assignment ID matches, the player is the assigned living actor, the deadline is open, and no response is already set. Return `INVALID_ASSIGNMENT` for stale/unauthorized responses.

- [x] **Step 3: Resolve and save before broadcast**

After a valid response, run `processDueEvents`, save the final reveal, then broadcast. The existing processed-command ledger provides command idempotence in the same persisted write.

- [x] **Step 4: Extend scheduler**

Resolve a pending response immediately. At exact deadline, resolve null response as timeout acceptance. Disconnect alone does not resolve it.

- [x] **Step 5: Normalize old rooms**

Add a small `normalizeLoadedRoom` that supplies `assignmentNominationsByPlayer: {}` and `resolutionSequence: 0` when absent, without changing `ROOM_STORAGE_KEY`.

- [x] **Step 6: Test runtime persistence and privacy**

Cover unauthorized/stale/dead actor, first response locking, duplicate command, exact deadline behavior, actor reconnect seeing the same assignment, nonactor never seeing response controls/risk, and alarm replay not duplicating the event.

- [x] **Step 7: Run Worker tests**

Run: `npm run test:worker`

Expected: PASS.

---

### Task 5: Live assignment UI

**Files:**

- Create: `src/ui/organisms/AssignmentResponsePanel.tsx`
- Modify: `src/ui/organisms/DecisionConsole.tsx`
- Modify: `src/ui/organisms/organisms.module.css`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`
- Modify: `src/ui/organisms/ConsequencePanel.tsx`
- Create: `tests/client/assignmentResponsePanel.test.tsx`
- Modify: `tests/client/consequencePanel.test.tsx`

**Interfaces:**

- Consumes: assignment-aware public decision options, `activeAssignment`, `viewerAssignment`, `assignment.respond`, and resolved assignment facts.

- [x] **Step 1: Add actor nomination to assigned ballots**

When an option requires assignment, require a living character selection before sending `vote.submit`. Show character names; do not expose numeric refusal chance.

- [x] **Step 2: Add the actor response panel**

Assigned viewer sees role, descriptive risk, countdown, `Take the job`, and `Try to refuse`. The copy states that timeout accepts. Nonactors see `Waiting for [Character]` without controls or risk.

- [x] **Step 3: Render the public result**

The consequence report names actor and one of: accepted, timed out and accepted, refused successfully, or tried to refuse and was forced to continue.

- [x] **Step 4: Keep the playfield readable**

Use one contextual surface in the current page flow. Do not add another persistent HUD cluster. Preserve keyboard focus and disabled/received states.

- [x] **Step 5: Run client tests**

Run: `npx vitest run --config vitest.config.ts tests/client/assignmentResponsePanel.test.tsx tests/client/consequencePanel.test.tsx`

Expected: PASS.

---

### Task 6: One live authored assignment and full verification

**Files:**

- Modify: `src/shared/content/decisionCards.ts`
- Modify: `docs/ROADMAP.md`
- Update: this implementation record

**Interfaces:**

- Consumes: all foundation tasks.
- Produces: one playable assigned option in the current deck, before the motorboat route replaces that deck.

- [x] **Step 1: Mark “Send one volunteer” as assigned**

Use role label `enter the humming cave`, a provisional server-only refusal chance of `3500` basis points with qualitative risk `risky`, actor-targeted main outcomes, and an authored refusal-success alternative where the crew seals the entrance at a shelter/morale cost. This is a temporary proving encounter, not the motorboat route.

- [x] **Step 2: Run all checks**

Run:

```text
npm run test
npm run test:worker
npm run typecheck
npm run build
npm run check:bundle
```

Expected: all pass; retain any pre-existing large bundle warning as a documented limitation.

- [x] **Step 3: Update status accurately**

Mark only the reusable assignment/refusal foundation complete. Keep the motorboat route, persistent world state, items, escape endings, and 14-player work open.

## Self-review

- Spec coverage: public assignment, actor-only controls, timeout, refusal branches, ghost voting, actor validity, reconnect, idempotence, and live proof encounter are covered.
- Deliberate gap: this plan does not implement motorboat state, fuel secrecy, launch, missed opportunities, or epilogue; those form the next separately testable plan.
- Type consistency: `PendingAssignment`, `ResolvedAssignment`, `activeAssignment`, and `viewerAssignment` names are used consistently across tasks.
- Placeholder scan: no implementation step depends on an unspecified fallback; invalid actors record `actor-unavailable` and use the authored safe fallback outcomes.

## Verification result

- `npm run typecheck`: passed for application and Worker TypeScript.
- `npm run test`: 33 files / 146 tests passed.
- `npm run test:worker`: 7 files / 40 tests passed, including a real Durable Object alarm/storage timeout test.
- `npm run build`: passed; the existing large-client-chunk warning remains.
- `npm run check:bundle`: passed.
- No deployment or commit was performed.
