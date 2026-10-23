# Session Coherence and UX Fixes Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** Use subagent-driven execution for independent visual/movement tasks; main agent owns narrative and survival correctness. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make each vote, outcome report, crew reaction, survival change, and scene presentation agree with one another while improving decision readability and island presence.

**Architecture:** Keep Worker rules authoritative. Include the selected group option in the resolved incident report, derive reactions/dialogue from that same event and public resources, and make starvation consequences explicit. Treat centered choice layout, colored accessible vote controls, larger 3D playfield, and smoother route travel as presentation changes with screenshot-based browser QA.

**Tech Stack:** TypeScript, React, React Three Fiber, CSS Modules, Cloudflare Worker, Vitest, Playwright.

**Spec:** `docs/specs/island-decision-game.md`, `docs/specs/crew-history-director.md`, `docs/design/visual-direction.md`.

## Global Constraints

- The Worker remains authoritative for votes, outcomes, resources, death, and phase progression.
- Individual votes remain private; public reveal may show only anonymous totals and the winning option.
- Event narration must identify the winning option and distinguish it from the randomized consequence.
- Starvation copy must match actual health loss and death state; existing 20 health per full starving day remains unchanged pending playtest approval.
- Character interactions and behavior remain deterministic across clients and must not invent resource changes.
- Keep UI text in DOM, preserve keyboard/touch operation, and avoid covering the 3D playfield with persistent panels.

---

### Task 1: Align event reports and crew dialogue with the resolved context

**Files:** Modify `src/shared/rules/stateMachine.ts`, `src/shared/rules/survival.ts`, `src/scene/crewHistoryDirector.ts`, `src/scene/sessionPresentation.ts`, `src/game/screens/SessionIslandView.tsx`; tests in `tests/worker/gameplay.test.ts`, `tests/shared/survival.test.ts`, `tests/scene/crewHistoryDirector.test.ts`, `tests/scene/sessionPresentation.test.ts`.

**Interfaces:** Resolved `EventEntry.text` begins with the winning option label and then its selected weighted outcome text; add `speakerCharacterId` and optional paired `conversation` data to the pure scene presentation result, not the network protocol.

- [x] Test that the exact winning option and its selected consequence are both present in reveal copy, starvation damage reports the actual applied amount, and death is reported with health zero.
- [x] Test that generated speaker/dialogue matches the selected crew action and that a pair interaction yields two authored contextual lines instead of unrelated random radio chatter.
- [x] Implement contextual crew presentation; preserve vote privacy and Worker authority.
- [x] Run focused rules and scene tests.

### Task 2: Improve survival feedback without silently retuning it

**Files:** Modify `src/shared/rules/stateMachine.ts`, `src/game/screens/SessionIslandView.tsx` and targeted tests listed above.

- [x] Add a deterministic starvation timeline test: 50 starting food, 10 consumed per decision, damage only on days that begin at zero, and ghost conversion at zero health.
- [x] Ensure reveals state starvation/damage/death accurately and show a clear starving status in the HUD while food is zero.
- [x] Keep constants unchanged; report survival pacing for human playtest rather than introducing unapproved balance gates.
- [x] Verify health, food, and status agree between Worker snapshots and reveal/HUD.

### Task 3: Improve the vote and 3D presentation

**Files:** Modify `src/ui/organisms/DecisionConsole.tsx`, `src/ui/organisms/organisms.module.css`, `src/ui/molecules/VoteOption.tsx`, `src/ui/molecules/molecules.module.css`, `src/game/screens/GameSessionScreen.module.css`, `src/game/screens/SessionIslandView.module.css`; tests in `tests/client/` and relevant E2E visual specs.

- [x] Center the decision console in the available gameplay column and center its options with a readable responsive layout.
- [x] Give options distinct accent colors with text, number/key, selected marker, and non-color cues; retain keyboard focus and touch-sized controls.
- [x] Increase the island viewport and reposition compact HUD overlays.
- [x] Capture desktop/mobile screenshots and inspect actual layout.

### Task 4: Smooth crew route travel

**Files:** Modify `src/scene/phases/IslandScene.tsx`; tests in `tests/client/islandLevel.test.ts` or a focused pure route-motion helper test.

- [x] Add deterministic path interpolation through authored route waypoints; smooth turns and accelerate/decelerate without changing destination or game state.
- [x] Keep locomotion synchronized and crossfade destination idle/reaction clips.
- [x] Test path endpoints, route changes, and finite/non-overshooting motion; route helper tests and live scene review completed.

### Task 5: Verify and document

**Files:** Update `docs/local-acceptance.md` and this plan with verified behavior.

- [x] Run `npm run check` and relevant visual/session checks.
- [x] Review desktop/mobile layout and a live two-client decision/reveal flow; record browser console findings.
- [x] Record unresolved issues and survival pacing questions for playtest.
