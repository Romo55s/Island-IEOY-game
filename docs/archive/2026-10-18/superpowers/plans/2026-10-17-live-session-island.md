# Live Session Island Presentation Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** Execute this plan inline in the current task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the connected session show the authoritative crew and game phase in the island scene without moving gameplay authority into rendering.

**Architecture:** A pure adapter maps `PublicGameSnapshot` into scene-ready crew members and an encounter label. React Three Fiber renders those members using the existing island, character, item, and crash-reaction systems. DOM controls remain authoritative for choices and accessible game text.

**Tech Stack:** TypeScript, React, React Three Fiber, Drei, Vitest, Playwright.

**Spec:** `docs/specs/island-decision-game.md`

## Global Constraints

- The Worker owns authoritative phases, choices, timers, outcomes, resources, deaths, and ending.
- The renderer consumes snapshots and never submits gameplay decisions.
- Continue supporting placeholder character models and existing `/sandbox` behavior.
- Keep DOM-based choice controls and avoid introducing new runtime dependencies.

---

### Task 1: Snapshot-to-scene presentation adapter

**Files:** Create `src/scene/sessionPresentation.ts`; create `tests/scene/sessionPresentation.test.ts`.

- [x] Derive stable scene members by joining players to selected character IDs and catalog definitions.
- [x] Derive starting items, ghost state, semantic animation, phase label, and authored profile reaction line from the snapshot.
- [x] Test players without character choices, live players, ghosts, crash reactions, deterministic idle variation, and profile reaction selection.

### Task 2: Snapshot-driven island crew

**Files:** Modify `src/scene/phases/IslandScene.tsx`; modify `src/scene/characters/CharacterModel.tsx` only if the adapter needs a visual hook.

- [x] Add an optional explicit crew-member input while preserving the current sandbox props.
- [x] Render names, held items, distinct roster tints, and clear ghost signaling.
- [x] Keep animation selection presentation-only and use clips known to be in the runtime model.

### Task 3: Connected scene and acceptance

**Files:** Create `src/game/screens/SessionIslandView.tsx` and CSS; modify `src/game/screens/GameSessionScreen.tsx` and CSS; modify `e2e/crash-choice.spec.ts`.

- [x] Show the island and snapshot-driven crew during active sessions, keeping lobby forms and DOM phase controls usable.
- [x] Show current phase/decision and crew survival state without exposing private choices.
- [x] Add a browser assertion that the connected session renders the live island/crew view and profile chatter.
- [x] Run typecheck, unit/Worker tests, build, bundle check, and browser flow.
