# Bear Encounter Implementation Plan

**Implementation status (2026-11-23):** Feature code is implemented locally. The detailed checklist below is the original planning record; actual file consolidation, executed checks, deviations and remaining human/multiplayer acceptance are recorded in the [master completion record](2026-11-12-team-feedback.md) and [QA report](../../qa/team-feedback.md). Unchecked original steps must not be interpreted as a claim that their exact procedure or broader acceptance was completed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the roaming bear into one authored encounter with item-specific hunts, player assignment/refusal, and coherent outcomes.

**Architecture:** Insert a campaign node after the cave and before shelter reinforcement. Reuse normal voting and assignments, adding an item-owner eligibility restriction. Persist bear defeat and use the same facts for dialogue, incident presentation, and scene visibility.

**Tech Stack:** Existing TypeScript game rules, Zod schemas, React UI, React Three Fiber, Vitest/Worker tests.

**Spec:** `docs/design/2026-11-12-team-feedback-features.md`, sections 1 and 2.

## Global Constraints

Follow all spec constraints and the exact proposed bear table. No borrowed or fabricated tool; the nominated hunter must own the selected item. The boar remains a separate encounter. Dialogue work depends on the voices/items package.

### Task 1: Authored bear node and resolution

**Files:** Create `src/shared/content/bearEncounter.ts`; modify `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/content/campaignRoute.ts`, `src/shared/rules/stateMachine.ts`, `src/shared/rules/outcomes.ts`, `src/shared/rules/assignments.ts`; create `tests/shared/bearEncounter.test.ts`; extend `tests/shared/campaignCoherence.test.ts` and `tests/shared/assignmentRules.test.ts`.

**Interfaces:** Export `createBearEncounterCard(state: PrivateRoomState): DecisionCard` from the new content file. Add `bear-encounter` to `CampaignNodeId`, `bear-defeated` to `CampaignStoryFlag`, and `requiredStartingItemId?: string` to `AssignmentSpec`. Reuse the existing `effectTarget: "assigned-actor"` plus `eliminateRandomLiving: true` behavior: `applyOutcome` already maps this combination to elimination of the named actor, without a random victim draw. Extend `eligibleLivingAssignments(state, requiredStartingItemId?)` with an optional filter; existing callers remain valid.

- [ ] Add table-driven card tests verifying retreat is always present; distract is absent if any living member has food below 5; hunt-bow and hunt-knife require a living owner. Assert the selected approach weights are exactly `[35,45,20]` and `[15,55,30]`, not percentages accidentally normalized twice.
- [ ] Add a concrete pure reduction regression using the existing room fixtures:

```ts
// In an existing fixture with Tony and Jim alive, Tony is the assigned hunter.
const result = applyOutcome(state, { id: "hunter-killed", text: "Tony is killed.", weight: 20,
  effectTarget: "assigned-actor", eliminateRandomLiving: true }, sequenceRandom([]), "cast-tony");
expect(result.characters["cast-tony"].status).toBe("ghost");
expect(result.characters["cast-jim-young"].status).toBe("alive");
```

- [ ] Implement the node and outcomes from the spec. Successful hunt grants food to the living group and adds `bear-defeated`; failed hunt injuries target only the assigned actor. Successful refusal takes retreat with its cost; absent/invalid actor cancels the hunt with an explicit report and proceeds to shelter, never assigning someone without the tool.
- [ ] Change every cave exit to the bear node, and every bear exit to shelter reinforcement. Keep ordinary decision time progression for this encounter. Existing persisted rooms already at shelter continue normally without replaying a bear node.
- [ ] Run `npm run test -- tests/shared/bearEncounter.test.ts tests/shared/assignmentRules.test.ts tests/shared/campaignCoherence.test.ts`. Checkpoint content/rules/types together.

### Task 2: Enforce ownership at voting and response boundaries

**Files:** Modify `worker/game/GameRoom.ts`, `src/shared/protocol.ts`, `src/ui/organisms/CharacterNominationModal.tsx`, `src/ui/organisms/DecisionConsole.tsx`, and `src/game/screens/GameSessionScreen.tsx`; extend `tests/worker/assignment.test.ts` and `tests/client/assignmentResponsePanel.test.tsx`.

**Interfaces:** Add `eligibleActorCharacterIds?: string[]` to each public decision option and its Zod schema. Compute it server-side using `eligibleLivingAssignments(state, option.assignment?.requiredStartingItemId)`. The modal consumes this allowlist, while the server revalidates rather than trusting it.

- [ ] Add Worker cases rejecting a dead owner, non-owner, forged ID, stale decision and duplicate response. Verify refusal success, refusal failure and timeout produce one outcome, and reconnect preserves the selected actor and deadline.
- [ ] Apply the item filter in both nomination validation and random fallback actor selection. Revalidate before resolution; a stale tool cannot turn a bow action into an unannounced knife attack.
- [ ] Filter the nomination modal to living owners for that option and explain unavailable approaches in ordinary player language. Do not expose internal weights in player UI.
- [ ] Run `npm run test:worker -- tests/worker/assignment.test.ts` and `npm run test -- tests/client/assignmentResponsePanel.test.tsx`. Checkpoint server/client ownership enforcement.

### Task 3: Public presentation and scene continuity

**Files:** Modify `src/game/story/incidentPresentation.ts`, `src/game/storyMap/storyMapData.ts`, `src/game/screens/DecisionTestScreen.tsx`, `src/scene/phases/IslandScene.tsx`, `src/scene/fauna/RoamingBear.tsx`, and `src/shared/content/crewDialogue.ts`; create `e2e/team-feedback.spec.ts`.

**Interfaces:** Presentation reads `bear-defeated` and persisted assignment/resolution facts. The voices/items package's `DialoguePublicContext.encounter` is `bear` only for this authored node.

- [ ] Add bear decision and outcome mappings using current environment art, without displaying the boar illustration as a bear. Use existing bear model and character reaction clips; no combat animation production is required.
- [ ] Hide/disable the roaming bear after `bear-defeated`. Keep it alive after retreat or failed hunts. Ensure preview fixtures can express both states.
- [ ] Add story-map edges and deterministic decision previews for refusal, injury, death, and successful hunt. Bind exact Jim/Tony banter only when its real tool/actor requirements pass.
- [ ] Add browser checks for nomination, the actor-only response, named injury/death report, and ghost voting after a fatal hunt. Run `npm run test:e2e -- e2e/team-feedback.spec.ts` against the configured local server. Record evidence and checkpoint presentation.
