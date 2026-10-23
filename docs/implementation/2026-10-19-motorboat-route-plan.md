# Motorboat Route v1 Implementation Plan

**Status:** core implementation complete and verified on 2026-10-22. The remaining follow-up is a reusable development fixture plus broader human balance/playtesting; it is not a blocker for the implemented route.

**Goal:** replace the shuffled ten-card success condition with one playable authored route: discover the motorboat and fuel, repair it through the assignment/refusal system, then launch together, leave alone, wait, fail into bounded recovery, or reach the third-miss storm-surge ending.

**Design contract:** [Motorboat escape route v1](../design/motorboat-route-v1.md), depending on the completed [assignment/refusal foundation](2026-10-19-assignment-refusal-foundation-plan.md).

**Scope boundary:** keep the current eight-player cap. Typed ideas, other escape projects, fourteen-player capacity, a general inventory/economy framework, and content expansion remain out of scope. Fuel is the first real consumable item; existing starting items remain unchanged unless a route option explicitly reads them without spending them.

## Architecture

The Worker remains authoritative. A persisted `MotorboatRouteState` selects the next authored node; clients never infer route progress from prose or animations. Existing `decision`, `assignmentResponse`, and `reveal` phases are reused for public ballots. A single new `privateChoice` phase handles both fuel-owner decisions and the launch custodian's selfish opportunity. Each private choice has a stable ID, absolute deadline, server-owned default, and viewer-specific options.

The route does not build a combinatorial tree. Pure rule functions mutate explicit route facts and return a next-node directive. After each reveal, the scheduler enters the next eligible route node. Recovery returns to a repair variant with at least one always-available option.

## Task 1 — Route, private-choice, and ending contracts

**Files:** `src/shared/domain.ts`, `src/shared/protocol.ts`, `tests/shared/protocol.test.ts`, `worker/game/roomStorage.ts`.

- [ ] Add `privateChoice` to `GamePhase` and bump the protocol version.
- [ ] Add private persisted types for boat node, hull/engine, fuel charges and visibility, private owner, repair actor, active opportunity ID, unique missed IDs, warning level, and route completion.
- [ ] Add a generic persisted private choice with `fuel-discovery` and `launch-custodian` variants. Store the actor privately; expose a public actor only when the design says the custodian is public.
- [ ] Add escape results containing one of `group-escape`, `solo-escape`, or `no-survivors`, exact escaped/stranded/dead character sets, factual cause, and a persisted compatible epilogue ID.
- [ ] Replace the aggregate success endings with route ending IDs while retaining a safe normalization path for already stored prototype rooms.
- [ ] Expose only public boat facts: node, hull, engine, fuel availability/charges when shared, warning level, miss count, and completion. A known-private fuel state says fuel exists but never includes owner identity.
- [ ] Expose private-choice controls only to the authenticated actor. The fuel finder remains anonymous unless sharing; the public custodian identity may be shown. Never expose internal launch percentages.

## Task 2 — Pure motorboat rules

**Files:** create `src/shared/rules/motorboat.ts`, `src/shared/content/motorboatRoute.ts`, and `tests/shared/motorboat.test.ts`.

- [ ] Author discovery, repair, recovery, and group-launch decisions with stable IDs and eligibility predicates.
- [ ] Initialize the route after crash resolution. Resolve a living fuel finder once, persist three fuel charges, and create a fuel choice whose timeout defaults to sharing.
- [ ] Implement share, hide, and private transfer. Transfer requires a current living target. A dead private owner drops fuel to shared inventory.
- [ ] Generate repair options from authoritative state: careful patch only when route parts are available, force starter always, and shelter braces only when 15 shelter can be paid.
- [ ] Reuse assignment/refusal. Repair acceptance/failed refusal targets the assigned actor; successful refusal uses the fixed shelter-cost emergency bypass and produces a fragile engine. No repair result may deadlock the route.
- [ ] Resolve custodian once. Timeout wakes the group. Solo departure is actor-only; quiet waiting exists only for the private fuel owner and records one deliberate miss without naming them publicly.
- [ ] Resolve group and solo launches from persisted engine state and prior miss count. Consume one fuel charge per attempted launch. Persist actual passengers before ending or failure.
- [ ] Count a stable opportunity ID once only when all five design prerequisites were true. Failed launch, explicit group wait, and private quiet count; preparation failures do not.
- [ ] Misses one and two set warnings and return to bounded recovery. Miss three atomically ghosts every remaining survivor with a storm-surge cause and enters the no-survivor ending. A successful launch has precedence.
- [ ] Cover tie/no-vote behavior, dead owner, disconnected actor defaults, all dead, insufficient shelter, duplicate opportunity, exact probability boundaries, and no double spend.

## Task 3 — Integrate route progression with decisions and assignment

**Files:** `src/shared/rules/stateMachine.ts`, `src/shared/rules/outcomes.ts`, `src/shared/rules/resolvedEvents.ts`, `tests/worker/gameplay.test.ts`, `tests/worker/scheduler.test.ts`.

- [ ] Start the discovery decision after crash resolution instead of shuffling the old ten-card deck.
- [ ] Add one `beginNextMotorboatStep` boundary used by reveal advancement. It returns a public decision, a private choice, or a terminal ending; it never returns an empty active phase.
- [ ] Apply route effects in the same authoritative transition as their resolved decision/outcome. Never derive engine/fuel/miss state later from event text.
- [ ] Preserve one daily survival tick per public decision. Private bookkeeping choices do not secretly consume an extra day.
- [ ] Extend structured events with optional route facts: node, boat change, opportunity ID, actual passengers, miss number, and ending cause. Keep short log prose separate.
- [ ] Ensure assignment outcomes update the repair state before reveal and actor-unavailable uses the route's explicit emergency fallback.
- [ ] Give successful escape and all-dead state precedence over later deadlines, scheduled reveals, and storm escalation.

## Task 4 — Worker commands, alarms, privacy, and storage

**Files:** `worker/game/GameRoom.ts`, `worker/game/roomScheduler.ts`, `worker/game/roomStorage.ts`, create `tests/worker/motorboat.test.ts`.

- [ ] Add `private-choice.respond` with stable choice ID, allowed option ID, optional living transfer target, actor authorization, first-response lock, and deadline validation.
- [ ] Resolve a valid private response immediately, save before broadcast, and preserve command idempotence.
- [ ] Resolve fuel timeout as share and custodian timeout as wake through a real Durable Object alarm.
- [ ] Normalize route/private-choice fields for old stored rooms without changing `room:v1` during this milestone.
- [ ] Prove with viewer-specific snapshots that fuel owner, hidden/transfer response, and solo/quiet controls do not leak.
- [ ] Test duplicate commands, alarm replay, reconnect to the same deadline, owner death, simultaneous launch/deadline ordering, and miss-ID idempotence in the Cloudflare runtime.

## Task 5 — Player-facing route UI and ending

**Files:** create `src/ui/organisms/PrivateChoicePanel.tsx` and `MotorboatStatusPanel.tsx`; modify `GameSessionScreen.tsx`, its CSS, `DecisionConsole.tsx`, `ConsequencePanel.tsx`, `EndingSummary.tsx`; add focused client tests.

- [ ] Keep one contextual surface. Show boat condition, fuel state, and storm warning near the current decision without adding a second permanent HUD wall.
- [ ] Fuel finder sees share/hide/transfer and a living target selector; everyone else sees anonymous waiting copy. Timeout copy says fuel will be shared.
- [ ] Custodian sees wake/solo and, only when eligible, quiet. Everyone sees who has night watch but not whether they privately own fuel. Timeout copy says the group will be awakened.
- [ ] Show qualitative launch risk and reasons: sturdy/fragile, group/solo, and prior misses. Keep numbers server-private.
- [ ] Consequence reports state who repaired, whether the launch was group or solo, actual passengers, fuel consumed, whether a miss counted, and the new warning.
- [ ] End with a fade-to-black transition and factual epilogue. List escaped, stranded, and previously dead characters without contradictions; then show one persisted dark-comedy aftermath bundle.
- [ ] Preserve keyboard focus, countdown accessibility, reduced motion, reconnect/error feedback, and eight-player desktop readability.

## Task 6 — Scene consequences and world state

**Files:** `src/scene/sessionPresentation.ts`, `src/scene/crewHistoryDirector.ts`, `src/scene/phases/IslandScene.tsx`, boat world components/props, and scene tests.

- [ ] Add mangrove/repair/shore/storm route zones or grounded anchors and map each route event to one.
- [ ] Present the actual finder only in their private view, the public repair actor during assignment, and the real custodian/passengers at launch.
- [ ] Show hull/engine state and storm warning from public route state. Hidden fuel ownership must not leak through staging.
- [ ] Use event IDs for repair, launch, selfish departure, failed launch, and storm one-shots. Missing clips retain the existing truthful idle fallback.
- [ ] Fade to black before the factual ending report; reduced-motion mode uses an immediate cut.

## Task 7 — Verification and roadmap handoff

- [x] Run focused pure-rule, protocol, Worker, UI, and scene tests during each task.
- [x] Run `npm run check` and keep the existing large-client-chunk warning documented.
- [x] Add a development route fixture covering shared fuel/group escape, hidden fuel/solo escape, failed launch/recovery, and third-miss storm.
- [x] Run a real two-client browser route to discovery, repair, and storm; add deterministic Chromium screenshots for successful group and solo endings.
- [x] Update `docs/ROADMAP.md` and `docs/README.md` only after evidence exists. Do not mark fourteen-player support, general items, alternative escapes, or full animation polish complete.
- [x] Do not deploy without a separate user request.

## Completion gate

The slice is complete only when two runs can diverge into a group escape and selfish solo escape; failed/waited opportunities count once; the third genuine miss ends coherently; private fuel ownership never leaks; reconnect and alarms preserve the same facts; and the 3D/UI presentation agrees with the authoritative event.

## Execution record — 2026-10-22

Tasks 1–6 are implemented. The shipped route uses protocol v4 and persisted, Worker-authoritative motorboat state; never exposes a private fuel owner or private fuel charges; supports the fuel, repair, custodian, group launch, solo launch, recovery, and storm-ending paths; and writes factual escape results before rendering a compatible dark-comedy aftermath. The directed scene receives only public route facts.

Verification completed: `npm run check` passed with 184 client/shared/scene tests and 45 Worker tests, both TypeScript projects, production build, and deployment-bundle validation. Worker coverage includes real Durable Object alarms for both assignment and private-choice timeout resolution, private-command authorization/deadline checks, idempotence, and safe legacy-ending normalization. A real two-client browser session reached discovery, public fuel state, repair assignment, recovery/storm ending, directed cove/repair scenes, and the fade-to-black aftermath without runtime errors; the only browser console warning is the pre-existing Three.js `Clock` deprecation. Development-only `/motorboat-route-preview` now renders deterministic shared/group, hidden/solo, failure/recovery, and storm states using the real route UI and scene. Chromium browser fixtures cover and retain screenshots for group and solo success ending facts, reduced-motion behavior, focus, and the fade.

Still deliberately open: a fresh live-network capture of the actor-only fuel panel and successful group/solo exits, balance telemetry, human eight-player playtests, additional route content, fourteen-player support, full animation polish, audio, and deployment. No deployment was performed.
