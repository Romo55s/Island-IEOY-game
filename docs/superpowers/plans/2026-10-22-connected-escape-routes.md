# Connected Escape Routes v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the motorboat-only post-crash sequence with three connected, authored escape projects: motorboat, plane signal, and a day-three rescue boat.

**Architecture:** Keep the existing server-authoritative state machine and vote/assignment protocol. Add one persisted `escapeProjects` aggregate to the room state, data-driven cards for the two new routes, and a route director that selects the next eligible project card after each reveal. Project effects are applied server-side alongside existing motorboat effects; the public snapshot exposes only public route facts.

**Tech Stack:** TypeScript, React, Zod protocol schemas, Durable Object room state, Vitest.

**Spec:** `docs/design/connected-escape-routes-v1.md`

## Global Constraints

- Do not return to a fixed ten-decision deck or label gameplay as `Decision n of 10`.
- Preserve no-vote random selection, majority voting, ghost participation, and authoritative random sources.
- Do not expose private fuel or private-choice information through public project state.
- All public snapshot changes must be represented in `src/shared/protocol.ts`, validated, and covered by protocol tests.
- A route success must create an ending summary covering every selected character exactly once.

---

### Task 1: Add authoritative escape-project state and protocol support

**Files:**
- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Modify: `src/shared/rules/stateMachine.ts`
- Test: `tests/shared/protocol.test.ts`

- [ ] Define `EscapeProjectsState` with a day counter; plane materials/beacon/contact/window fields; and rescue-boat marker/provision/window fields.
- [ ] Add public-safe `PublicEscapeProjectsState`, an optional `escapeProjects` state field, and a typed outcome effect union that can change project state.
- [ ] Extend ending cause/epilogue unions for plane and rescue-boat group escapes while retaining all motorboat payloads.
- [ ] Initialize project state in `startGame`, expose it in `toPublicSnapshot`, and validate it in the Zod protocol.
- [ ] Raise the protocol decision-count ceiling or remove its artificial cap so it no longer encodes the old ten-card assumption.
- [ ] Add schema tests for valid public project state and rejection of invalid public/private state combinations.

### Task 2: Make project effects deterministic and testable

**Files:**
- Create: `src/shared/rules/escapeProjects.ts`
- Modify: `src/shared/rules/outcomes.ts`
- Test: `tests/shared/escapeProjects.test.ts`

- [ ] Implement `initialEscapeProjects`, `applyEscapeProjectEffect`, `advanceProjectDay`, and route eligibility helpers as pure functions.
- [ ] Encode cross-route facts: motorboat salvage grants reflector, a beacon/radio contact qualifies rescue pickup, and a flare consumed for a plane cannot also improve pickup.
- [ ] Give every project failure a bounded resource/time cost and reserve terminal failure for the documented final-storm/motorboat rules.
- [ ] Add deterministic tests for each cross-route connection, day-three unlock, and effect idempotence/guard behavior.

### Task 3: Author the plane-signal and rescue-boat card sets

**Files:**
- Create: `src/shared/content/escapeRoutes.ts`
- Modify: `src/shared/content/motorboatRoute.ts`
- Test: `tests/shared/escapeRoutesContent.test.ts`

- [ ] Add ridge-search, beacon-build, and plane-window cards with 2–4 clear group options and weighted outcomes.
- [ ] Add shore-prep, survive-the-night/day-three, and rescue-pickup cards with supply costs and clear success requirements.
- [ ] Add an escape-project hub card that lets the group choose which viable project receives attention when more than one route is available.
- [ ] Add a motorboat discovery result that can explicitly yield the shared reflector without leaking private fuel information.
- [ ] Test card IDs, option limits, all referenced effects, and success/failure outcome availability.

### Task 4: Replace the motorboat-only director with the connected route director

**Files:**
- Modify: `src/shared/rules/stateMachine.ts`
- Modify: `src/shared/rules/motorboat.ts`
- Test: `tests/shared/stateMachine.test.ts`
- Test: `tests/shared/motorboatRoute.test.ts`

- [ ] Replace `beginNextMotorboatStep` call sites with `beginNextEscapeStep`; retain it as a narrow compatibility helper only if tests need it.
- [ ] Start post-crash play at the project hub, then choose urgent windows first (plane, day-three pickup), unfinished selected work second, and the hub when multiple projects remain.
- [ ] Apply project effects during `finalizeDecisionOutcome` before deciding the next step and include public structured facts in the resolution/event history.
- [ ] Implement plane/pickup group-escape construction and ending transition without duplicating or bypassing character-fate accounting.
- [ ] Ensure a route loss returns to the director when other viable routes remain.
- [ ] Cover normal route switching, day-three pickup, signal-to-pickup synergy, group escape, all-dead, and existing motorboat regression cases.

### Task 5: Present the route status and endings coherently

**Files:**
- Create: `src/ui/organisms/EscapeProjectsPanel.tsx`
- Modify: `src/ui/organisms/EndingSummary.tsx`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/scene/sessionPresentation.ts`
- Test: `tests/client/gameSessionScreen.test.tsx`
- Test: `tests/client/endingSummary.test.tsx`

- [ ] Add a compact PS1-style public project panel showing Day, beacon/contact, and shore-marker/pickup status.
- [ ] Render route-specific ending titles and dark-comedy epilogues for plane and rescue-boat outcomes.
- [ ] Replace the old generic decision counter in gameplay/reveal with project/day context, leaving dev fixtures explicitly labeled as fixtures.
- [ ] Update scene text so the in-world presentation identifies the active escape project rather than displaying a stale fixed total.
- [ ] Add focused UI tests for the project panel and both new endings.

### Task 6: QA the full session and update the source-of-truth docs

**Files:**
- Modify: `docs/GAME_DESIGN.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/design/connected-escape-routes-v1.md`
- Test: `tests/shared/stateMachine.test.ts`

- [ ] Write seeded full-session simulations for: coordinated plane rescue, three-day rescue boat pickup, route-switching recovery after a failed signal, and motorboat solo escape.
- [ ] Run `npm run check` and fix type, protocol, unit, and build failures.
- [ ] Run the browser playtest against a local session and verify no stale `Decision 1 of 10` gameplay label remains.
- [ ] Mark the road map only after the implementation and tests pass; do not describe unimplemented content as shipped.
