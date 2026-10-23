# Resolved-event foundation implementation plan

> Status: completed and locally verified on 2026-10-19. This is a bounded foundation from `docs/ROADMAP.md`; it does not implement branching escape routes, assignments, refusal, inventory consumption, or persistent world mutations.

**Goal:** make one server-created decision record the single source of truth for the reveal report and the scene reaction.

**Why this comes next:** the current server applies outcomes correctly, but the retained event mostly contains prose and a few IDs. The UI, resource state, and 3D reactions can therefore describe the same decision differently. Branching stories would multiply that problem.

**Architecture:** when the server resolves a decision, capture the chosen option and outcome, anonymous vote totals, exact resource transitions, exact status transitions, and a presentation cue. Store that object inside the existing immutable history entry. Public snapshots expose it only after resolution, while individual votes remain private. Presentation code consumes the stored result and never rerolls or reapplies it.

**Constraints:**

- Preserve the existing room storage key and persisted state shape compatibility.
- Preserve the current anonymous-vote boundary.
- Record clamped, actual before/after values rather than authored intent.
- Distinguish outcome effects, daily food consumption, and starvation.
- Do not invent actor assignment, refusal, inventory, or world-state fields before those rules are specified.
- Keep the short history sentence for compact logs; render the full report from structured facts.

## Task 1 — Contract and deterministic fact capture

**Files:**

- Modify: `src/shared/domain.ts`
- Modify: `src/shared/protocol.ts`
- Create: `src/shared/rules/resolvedEvents.ts`
- Modify: `src/shared/rules/stateMachine.ts`
- Test: `tests/shared/resolvedEvents.test.ts`
- Test: `tests/shared/protocol.test.ts`
- Test: `tests/worker/gameplay.test.ts`

Steps:

1. Add failing tests for exact clamped resource changes, daily survival changes, starvation death cause, anonymous option totals, and schema rejection of malformed nested facts.
2. Add the minimal public types and strict Zod schemas.
3. Build the resolution from three authoritative snapshots: before outcome, after outcome, and after survival.
4. Store the resolution once in the history entry and make repeated resolution outside the decision phase a no-op.
5. Verify private vote ownership never appears in serialized snapshots.

## Task 2 — One reveal report, one presentation event

**Files:**

- Modify: `src/ui/organisms/ConsequencePanel.tsx`
- Modify: `src/ui/organisms/organisms.module.css`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`
- Modify: `src/scene/crewHistoryDirector.ts`
- Modify: `src/scene/sessionPresentation.ts`
- Test: `tests/client/consequencePanel.test.tsx`
- Test: `tests/scene/crewHistoryDirector.test.ts`
- Test: `tests/scene/sessionPresentation.test.ts`

Steps:

1. Render the winning choice, outcome, anonymous vote totals, named before/after resource changes, and status changes from the stored resolution.
2. Retain a prose-only fallback for old or crash history entries.
3. Make scene cue and death selection prefer the structured resolution, with backward-compatible fallbacks for existing fixtures.
4. Confirm no client code mutates gameplay state or derives a different outcome.

## Task 3 — Verification and roadmap update

**Files:**

- Modify: `docs/ROADMAP.md`
- Modify: `docs/README.md`
- Update this execution record with results.

Steps:

1. Run focused shared/client/scene tests.
2. Run the Worker suite to verify runtime serialization and existing multiplayer behavior.
3. Run both TypeScript checks and the production build/bundle check.
4. Mark only the completed portion of M2. Keep persistence across future world mutations, assignments, and decision-specific 3D actions open.

## After this slice

The next creative dependency remains a short feature specification for refusal visibility/timeout/fallback and a compact three-encounter motorboat route. Once confirmed, implement that route on top of this event contract, then add real item use and escape-triggered endings.

## Execution record

Implemented:

- A strict `ResolvedDecision` contract containing the prompt, winning choice, outcome, anonymous option totals, actual resource transitions, status transitions with cause, affected character IDs, and presentation cue.
- A pure server-side fact builder that compares pre-outcome, post-outcome, and post-survival state. It records clamped values rather than authored intent and distinguishes outcome effects, daily food use, and starvation.
- One immutable resolution inside the existing history entry. Re-entering decision resolution after the phase has changed is a no-op.
- Protocol validation for delta arithmetic and agreement between the full resolution and compact history identifiers. Individual voter identity remains absent.
- A reveal-only incident report driven by the stored event, including grouped anonymous totals, named before/after changes, and death cause. Identical character changes are grouped to control eight-player report length.
- Scene cue and death animation selection now prefer the same structured resolution, while old prose-only history remains readable.

Verification:

- `npm run test`: 31 files / 130 tests passed.
- `npm run test:worker`: 6 files / 31 tests passed in the Workers runtime.
- `npm run typecheck`: application and Worker TypeScript checks passed.
- `npm run build` and `npm run check:bundle`: passed. The existing large-client-chunk warning remains.
- Browser UI-lab inspection at 1440×1000: semantic snapshot exposed the selected choice, anonymous totals, and exact changes; no browser warnings or errors were reported. Screenshot: `output/playwright/resolved-event-ui-lab-structured-2026-10-19.png`.

Deliberately still open:

- Named actor/target assignment, refusal results and visibility, item ownership/consumption, injuries as a distinct state, and persistent world changes need their own confirmed rules.
- Decision-specific 3D action clips still need to happen before generic social reactions.
- A real reconnect during reveal and a complete multiplayer session were not rerun for this slice.
- The old ten-card ending remains in code until the first authored escape route replaces it.
