# Survival and Encounter Director Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** Execute inline in the current user-authorized task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make each survival decision advance hunger, let depleted health create real ghosts, stage the crew at the island location that matches the event, and make character reactions/movement reflect shared history.

**Architecture:** The Worker applies one deterministic survival-day tick after each resolved decision. Health reaching zero permanently changes the character/player to ghost and records the death in the public event so the renderer can play the one-shot death clip. A client-only encounter director maps authored card IDs to island zones, finds a trail route between zones, plays the existing walk animation, and follows the crew with the camera. Resolved events retain structured decision/choice/outcome IDs; a deterministic presentation-only crew director derives a small social beat from that public history and character profiles. It must never attribute blame to an individual vote or alter authoritative game state.

**Tech Stack:** TypeScript, React Three Fiber, Three.js, Vitest, Playwright.

**Spec:** `docs/specs/island-decision-game.md`

## Global Constraints

- The Worker remains authoritative for survival resources, death, voting, and phase progression.
- A resolved decision is one in-game survival day; food consumption is 10 per day and starvation damage is 20 health per day after food was already exhausted.
- Dead characters have health 0, become ghosts, and keep their vote.
- Scene movement is presentation-only, follows authored island routes, and cannot alter game state.
- The existing 33-clip Daniel animation library supplies `walk`; preserve the optimized runtime character GLB and its asset budget.
- Crew reactions are deterministic across clients and derived from public event history, character profile traits, and current survival context.
- Reactions cannot imply an individual caused a group result unless structured history explicitly identifies that character (for example, a crash rescue attempt).

---

### Task 1: Authoritative hunger and death

**Files:** Create `src/shared/rules/survival.ts`; modify `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/rules/outcomes.ts`, `src/shared/rules/stateMachine.ts`; test in `tests/shared/survival.test.ts`, `tests/shared/rules.test.ts`, and `tests/worker/gameplay.test.ts`.

- [x] Test food consumption, starvation damage, zero-health death, ghost vote eligibility, and death-event serialization.
- [x] Implement `applyDailySurvival(state)` returning the updated state, starved character IDs, and newly dead character IDs.
- [x] Make every death path set health to zero and record `deathCharacterIds` in the event history.
- [x] Apply the daily tick after the selected outcome and before reveal; include a short hunger/death message in the public event.

### Task 2: Contextual encounter director and death playback

**Files:** Modify `src/scene/sessionPresentation.ts`, `src/scene/world/islandLevel.ts`, `src/scene/phases/IslandScene.tsx`, `src/scene/GameCanvas.tsx`, and `src/game/screens/SessionIslandView.tsx`; test in `tests/scene/sessionPresentation.test.ts` and `tests/client/islandLevel.test.ts`.

- [x] Map all ten decision IDs to authored island zones and derive the current encounter from the public snapshot.
- [x] Find stable routes over the island route graph; animate crew along those routes with the `walk` clip and place them in each zone's staging formation.
- [x] Pan the isometric camera to the current encounter and show the encounter name in the HUD.
- [x] Drive the one-shot `fall` clip from authoritative death event IDs; display health and food values, including zero health for ghosts.

### Task 3: Ending and live verification

**Files:** Modify `src/ui/organisms/EndingSummary.tsx`, `src/game/screens/GameSessionScreen.tsx`, `e2e/full-session.spec.ts`, and `docs/local-acceptance.md`.

- [x] Render the correct title/copy for each server ending ID.
- [x] Test all ending labels and run the connected-session tests plus full type, Worker, build, and bundle checks.
- [x] Keep the ten-decision browser test asserting shared ending and survival state without assuming a specific random ending.

### Task 4: History-aware crew behavior (added after director request)

**Files:** Modify `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/rules/stateMachine.ts`, `src/scene/sessionPresentation.ts`, `src/scene/phases/IslandScene.tsx`; add `docs/specs/crew-history-director.md` and focused tests in `tests/scene/` and `tests/shared/`.

- [x] Preserve the resolved decision ID, winning option ID, outcome ID, and explicit death/rescue participants in public event history.
- [x] Derive the current crew beat from recent history: rescue reunion, shared success, setback/comfort, starvation danger, or calm camp behavior.
- [x] Give at most one deterministic pair a close interaction formation; choose clips from the verified Daniel library (`greet_03`, `hug`, `agree`, `cheer`, `complain_01`, `depressed`, `look_around`, `walk`, `idle`). Others use profile- and resource-aware reactions.
- [x] Rotate/reduce repeated beats from recent event history; never blame an individual for the majority's option when per-player choices are not public.
- [x] Add deterministic tests for event metadata, pair selection, history variation, and no-gameplay-state-mutation. Keep numeric tuning provisional and do not add invented balance gates.
