# Contextual Crew Behavior Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** Inline execution is authorized by the user. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make survivors visibly choose deterministic, context-aware actions during reveals without allowing client presentation to alter authoritative survival state.

**Architecture:** Extend the existing pure `deriveCrewHistoryBeat(snapshot)` director to output per-character behavior labels alongside animation clips and interaction pairs. Prioritize recorded deaths, crew-wide hunger banter, food-search intent, aid for an injured survivor, then event reactions or a quiet camp routine. Surface labels in the session roster and keep all resource changes in the Worker.

**Tech Stack:** TypeScript, React, React Three Fiber, Vitest.

**Spec:** `docs/specs/crew-history-director.md`

## Global Constraints

- The Worker remains authoritative for resources, character status, voting, and phase progression.
- Same public snapshot produces the same beat, labels, clips, and pair on every client.
- Individual votes remain private; no beat may assign responsibility for a majority result.
- No new animation assets or gameplay effects are introduced.
- Numeric health/resource boundaries used only to select presentation are provisional, not balance gates.

---

### Task 1: Add deterministic behavior outputs

**Files:** Modify `src/scene/crewHistoryDirector.ts`; test `tests/scene/crewHistoryDirector.test.ts`.

**Interfaces:** `CrewHistoryBeat` gains `behaviorByCharacterId: Record<string, string>`. `deriveCrewHistoryBeat(snapshot: PublicGameSnapshot): CrewHistoryBeat` remains pure and deterministic.

- [x] Add tests for food-search priority when only some living characters have zero food, aid when a danger event leaves a wounded survivor, and a neutral-reveal camp routine.
- [x] Verify the new tests fail against the existing director because it returns neither context actions nor labels.
- [x] Add behavior labels in each existing beat and the three new contexts. Use existing clips only; use stable event-and-character ordering for selections. Keep death and all-empty hunger beats ahead of other actions.
- [x] Verify the focused director suite passes, including snapshot non-mutation and deterministic replay.

### Task 2: Surface actions in session presentation

**Files:** Modify `src/scene/sessionPresentation.ts`, `src/game/screens/SessionIslandView.tsx`; test `tests/scene/sessionPresentation.test.ts`.

**Interfaces:** `SessionSceneMember` gains optional `behaviorLabel?: string`, populated from the director for active reveal beats.

- [x] Add a presentation test asserting a zero-food survivor receives the food-search label and another survivor’s label/action are stable across identical snapshots.
- [x] Map each character’s director label to its scene member. Keep labels absent outside reveal beats and for ghosts unless that character is explicitly in a recorded death beat.
- [x] Show non-empty action labels beside the character in the existing crew roster with accessible text; do not add a new panel or obscure the playfield.
- [x] Run focused scene tests and confirm existing radio chatter and animation selection remain intact.

### Task 3: Document scope and verify

**Files:** Update `docs/specs/crew-history-director.md` and this plan.

- [x] Document the action priority, labels, deterministic behavior, and the explicit exclusion of actual gathering/healing/resource changes.
- [x] Run focused scene tests, `npm run typecheck`, and `npm run check`.
- [x] Report any visual/animation behavior not measurable by unit tests as a follow-up playtest item.
