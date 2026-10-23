# Encounter presentation implementation plan

> For agentic workers: the writing-plans skill names `superpowers:executing-plans` or `superpowers:subagent-driven-development` as execution helpers. Neither is installed here. Execute inline with test checkpoints; do not delegate, commit the existing dirty worktree, or deploy. This is a scoped execution record, not a competing game specification.

**Goal:** make the live cast appear at its encounter with the directed camera and make one-shot actions replay, finish, and release their pose correctly.

**Architecture:** keep server gameplay unchanged. Add a small Three.js playback controller and pure encounter staging helpers; the existing snapshot adapter supplies stable animation event identity. Live sessions use directed cuts and grounded encounter marks, while the exploration sandbox retains its existing route/controls behavior.

**Tech Stack:** existing React, R3F, Drei, Three.js, TypeScript, Vitest, Playwright. No added dependencies.

**Spec:** `docs/GAME_DESIGN.md` confirmed directed cinematics; `docs/ROADMAP.md` M1 presentation repair; audit A01/A02/A09. This implements only the first bounded portion of M1, not branching, refusal, resource changes, or final escape rules.

## Global constraints

- The server owns game facts; clients present those facts.
- Desktop first; preserve existing eight-player support and sandbox.
- Preserve the working multiplayer foundation and existing uncommitted development.
- No deployment, new assets, dependency changes, or automatic commits.

## Task 1 — Event-keyed playback with real-mixer tests

Files: create `src/scene/characters/animationPlayback.ts` and `tests/scene/animationPlayback.test.ts`; modify `CharacterModel.tsx`, `sessionPresentation.ts`, and its existing test.

Interface: `createAnimationPlayback(mixer, actions, idleName, onMissing?)` returns `request({name, once, eventId, elapsedSeconds?})`, `tick(elapsedSeconds?)`, and `dispose()`. Actions are Drei's lazy action map. The controller does not advance the mixer; Drei owns that clock.

- [x] Write real `AnimationMixer` tests before implementation. Concrete regression:

```ts
playback.request({ name: "cheer", once: true, eventId: "first" });
mixer.update(1.1);
playback.tick();
expect(actions.idle.isRunning()).toBe(true);
playback.request({ name: "cheer", once: true, eventId: "second" });
expect(actions.cheer.paused).toBe(false);
expect(actions.cheer.time).toBe(0);
```

Also assert identical requests do not restart, paused outgoing actions lose weight/stop after the fade, missing clips choose idle and report once, late one-shots choose idle, interruption prevents obsolete finish behavior, and dispose stops actions.

- [x] Run `npm run test -- tests/scene/animationPlayback.test.ts`; expect missing-module failure before implementation.
- [x] Implement request identity using name/once/event ID; reset new requests, crossfade outgoing actions even when paused, stop them after 0.2 seconds of mixer time, and transition completed one-shots to looping idle. Retain request identity after completion so unrelated renders cannot replay the same event. Empty-name animation test mode stops playback. Missing clips fall back to idle.
- [x] Add optional `animationEventId` and `animationStartedAt` to scene members. Derive IDs from phase/start/decision/latest-event/character, not snapshot revision. Prioritize recorded death over social/ambient clips and keep old ghosts idle. Tests compare revisions and successive event identities.
- [x] Integrate a controller per model/mixer; pass elapsed server-estimated phase time for live clips, including after slow asset loads. Dispose safely on effect cleanup/StrictMode. Preserve current retargeting/loading and sandbox walk speed.
- [x] Rerun focused tests and `npx tsc -p tsconfig.app.json --noEmit`.

## Task 2 — Directed live staging

Files: create `src/scene/encounterStaging.ts` and `tests/scene/encounterStaging.test.ts`; modify `GameCanvas.tsx`, `IslandScene.tsx`, `SessionIslandView.tsx`.

Interfaces: `getEncounterMark(zoneId, slotIndex, pairIndex?)` returns `{ position: [number, number, number], rotationY: number }`; `getEncounterCameraTarget(zoneId)` returns a grounded look target. `IslandScene` gains `staging="travel" | "encounter"` (default travel); `GameCanvas` gains `directed` (default false).

- [x] Write tests across all authored zones and all eight slots:

```ts
const mark = getEncounterMark("mountain_foothills", 0);
expect(mark.position[1]).toBeCloseTo(sampleIslandSurfaceY(mark.position[0], mark.position[2]) + 0.08);
expect(getEncounterMark("rocky_coast", 0, 0).rotationY).toBe(Math.PI / 2);
expect(getEncounterMark("rocky_coast", 1, 1).rotationY).toBe(-Math.PI / 2);
```

Assert finite positions and eight unique marks, including a two-member interaction pair. Run focused tests to see missing-module failure.
- [x] Stage live actors immediately at grounded encounter marks, without running the island-distance route loop. Keep travel component for the sandbox. Pass event/time props through both slots. Directed camera snaps to the same grounded zone before rendering and disables orbit/pan/zoom input. Do not remount models on each zone or snapshot revision.
- [x] Add a mocked live-view integration test asserting `directed`, `staging="encounter"`, changed zone propagation, and absence of free-camera instructions.
- [x] Run focused tests and TypeScript checks.

## Task 3 — Deterministic browser evidence and handoff

Files: add a dev-only `EncounterPreviewScreen.tsx` with the real `SessionIslandView`, gated in `App.tsx`. Fixture snapshots use actual catalog members; controls change zones, replay events, show death, and set two/eight crew. Never expose fixture state mutation to production gameplay. Use the installed Playwright CLI skill for browser verification (it directs CLI-first checking rather than new E2E test files).

- [x] Exercise the real live view at distant zones, with two/eight crew, repeated reveal, death, and return to decision. Use CLI snapshots/select/click/screenshot commands; retain screenshots under `output/playwright/encounter-2026-10-19/` and inspect them, not only DOM assertions.
- [x] Run `npm run test`, client/Worker TypeScript checks, and the focused browser check. If local server commands require discovery, use installed cf help; no authentication/deployment is needed for local playtesting.
- [x] Update roadmap/status with verified results, evidence location, and unfinished M1 items. Do not mark the entire scene milestone or new game rules complete.

## Review and handoff

The full design has intentionally unimplemented systems: forced assignment/refusal, real item effects, story graph, escape state, epilogues, 14-player support. Complete this presentation slice first. Pair approach transitions, fully synchronized looping motion, reduced-motion choreography and every animation rig are not certified by this slice. Record those remaining acceptance items rather than expanding scope silently.

## Results — 2026-10-19

- 124 client/shared/scene tests pass (29 files); 30 Worker tests pass (6 files). Both application and Worker TypeScript checks pass.
- Production build and bundle checker pass. Build still warns about a large client JS chunk (~1.59 MB minified); this slice does not claim a performance budget pass.
- Browser preview uses the real `SessionIslandView` and renderer with deterministic fixtures, not the separate sandbox UI. Eight crew checked at the six zones used by current cards; two-crew repeated success, rest, and death checked. No browser console errors observed; Three.js emits a Clock deprecation warning.
- Screenshot inspection found and corrected first-load camera reset, waterfall-center occlusion, and foothills dressing intersection. Acting anchors now use the waterfall bank and the clear approach to the foothills. Live camera zoom is closer for a small cast.
- Development preview: `/encounter-preview`. Production output was searched after the final build: the fixture chunk and its heading are absent. No deployment or commits performed.
- Evidence: [coast](../../output/playwright/encounter-2026-10-19/coast-eight.png), [foothills](../../output/playwright/encounter-2026-10-19/foothills-eight.png), [waterfall](../../output/playwright/encounter-2026-10-19/waterfall-eight.png), [jungle](../../output/playwright/encounter-2026-10-19/jungle-eight.png), [forest](../../output/playwright/encounter-2026-10-19/forest-eight.png), [beach](../../output/playwright/encounter-2026-10-19/beach-eight.png), [rest](../../output/playwright/encounter-2026-10-19/success-rest.png), [repeated reaction](../../output/playwright/encounter-2026-10-19/success-repeated.png), [death](../../output/playwright/encounter-2026-10-19/death-two.png). Some eight-crew captures precede the final increase from zoom 36 to 48; final coast/foothills/waterfall captures use 48.
- Limits: no fresh full ten-round multiplayer E2E, Safari/mobile acceptance, FPS profiling or complete retargeting audit. Unit tests cover late-time catchup; a real network reconnect/slow-load browser scenario remains to be exercised. Pair marks face one another but still cut rather than approach smoothly; hugs are not synchronized two-body choreography. Ghosts return to idle with the existing wireframe/ring treatment. Trail overlays can still partially hide foot rings; exact rendered-ground collision alignment is a later cleanup. Generic/repetitive dialogue and the incorrect “Lost in the crash” label remain known director issues, not fixed by this lifecycle change.

Lifecycle behavior was checked against the installed implementation and [Three.js AnimationAction documentation](https://threejs.org/docs/pages/AnimationAction.html), then verified with real-mixer tests. The important correction is explicit handling of paused, clamped outgoing actions, not merely checking `isRunning()`.
