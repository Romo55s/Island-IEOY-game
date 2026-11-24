# Current project index

## Latest implementation — 2026-11-23

The team-feedback mechanics are implemented locally: Jim's reckless influence, Courtney's occasional stutter, eight new starting objects, bear encounters, group cannibalism votes and private nighttime attempts. The game currently has a 16-character catalog and 25 starting objects. View `/team-feedback` with `npm run dev` for deterministic scenarios using the live components and rules.

Read the [completed implementation plan](superpowers/plans/2026-11-12-team-feedback.md), [feature design and initial tuning](design/2026-11-12-team-feedback-features.md), and [verification report with screenshots](qa/team-feedback.md). Focused tests, all Worker tests, five browser scenarios, typecheck, build and bundle validation pass. The broader unit suite has six failing files around existing assets, roster expectations and test setup. Human balance and authenticated multiplayer acceptance remain open. The older audit/status tables below predate this update.

Updated 2026-10-19 with the latest design decisions following the 2026-10-18 code, test, asset, and browser audit. This is the entry point for current work.

## Direction and document authority

The owner's current intent: **a decision-making game whose consequences visibly unfold in the background**, with character attachment, dark comedy, real survival mechanics, and both cooperation and selfish escape. The working genre is a semi-cooperative, choice-driven survival party game.

The implementation currently has group votes, individual crash choices, a ten-card shuffled deck, per-character survival stats, and a 3D island. These are observations, not a decision to keep every mechanic.

Latest confirmed direction: first successful escape ends with a fade-to-black aftermath; the third genuine missed motorboat opportunity triggers the storm-surge failure; group assignments can be compulsory with one personal refusal attempt; ghosts vote equally; risk is descriptive; authored connected paths replace the ten-round cap. Test with 8 now and expand to approximately 14 players. The reusable assignment/refusal foundation and first motorboat route are implemented; balancing, playtest acceptance, more routes, and fourteen-player support are not.

Read in this order:

1. [Current design brief](GAME_DESIGN.md): owner's answers, confirmed direction, proposed mechanics, and remaining decisions. This supersedes earlier creative recommendations, not the implementation status below.
2. [Roadmap: completed work and next milestones](ROADMAP.md). Proposed design changes are explicitly marked.
3. [Audit: evidence and problems](audits/2026-10-18-game-audit.md). Its initial questions have now been answered in the design brief; do not ask them all again.
4. [Visual reference](design/visual-direction.md) and the [PS1 Black-Box Design System](design/ps1-black-box-design-system.md) for visual language, component rules, and UI review gates; several original rendering ambitions remain unimplemented.
5. Asset contracts and [license records](licenses/assets.md) when touching models, audio, or images. [Character contract](assets/character-contract.md) includes current implementation caveats.

Historical product specifications, recorded decisions, preflights, and implementation plans are [archived](archive/2026-10-18/README.md). They preserve previous decisions, consent records, technical reasoning, and unfinished tasks. They must not override later owner direction or be mistaken for current completion status. Existing privacy, asset-consent, and deployment constraints remain in force unless the owner changes them.

## Implementation status

“Implemented” means the behavior exists and has the evidence indicated; it is not a polish or release sign-off.

| Area | Status | Evidence / gap |
| --- | --- | --- |
| Private rooms, admission, character selection, ready/start | Implemented | Worker tests and fresh two-client browser session |
| Fourteen-player support | Missing | Current server/start/protocol limits are 8; catalog has 9 identities. Owner's target is approximately 14, with current testing at 8 |
| Shared phases, vote resolution, timers, reconnect/host logic | Implemented foundation | Worker suite; the fresh browser session covers normal progression, not every reconnect edge |
| Highest-count / tied-leader / no-vote selection | Existing rule helper | `resolveVote.ts` already selects the highest count, random tied leaders, or random listed option for no votes; visual picker and future dynamic-eligibility handling are not accepted yet |
| Private starting offers, item selection, simultaneous rescue | Implemented rules | Unit/Worker tests and full browser flow; rescue incentives need redesign |
| Active route, weighted consequences, deaths and ghost voting | Implemented prototype | The motorboat route now replaces the ten-card completion loop; legacy cards remain as content infrastructure, while 8-player balance and human acceptance remain open |
| Food consumption, starvation, HP-zero death | Implemented | Unit/Worker coverage; fairness and recovery opportunities not accepted yet |
| Water, morale, shelter | Partial | Stored; morale/shelter affect ending and some presentation; water never changes in the authored deck; live HUD omits these values |
| Starting-item gameplay, actor assignment, stateful encounter eligibility | Partial | Decisions can nominate one living actor and target consequences correctly. Items remain carried/flavor and the next card is still deck-indexed |
| Forced assignment and personal refusal | Implemented | Public assignment, actor-only 15-second response, timeout acceptance, refusal success/failure, unavailable-actor fallback, persistence, cave proof, and motorboat repair integration are covered |
| Island, cloned character, item props, bear, route graph | Implemented visual foundation | Live camera/cast now cut together to grounded acting anchors; eight-crew desktop fixtures inspected across six current encounter zones. Sandbox retains travel |
| Animation playback | First repair implemented | Event-keyed replay, idle return, paused-action fade/stop, missing-clip fallback and phase-time catchup covered with real-mixer tests; complete ghost/rig/slow-load browser acceptance remains |
| Social director and pair choreography | Partial / defective | Pair orientation added; smooth approaches, contextual death labels, repetition and synchronized hugs still need correction |
| Decision-specific actions and lasting world changes | Partial | Motorboat discovery/repair/launch state, directed route zones, boat condition, and terminal storm presentation are implemented; legacy encounter actions remain generic |
| Structured decision consequences | Implemented foundation | The server stores winning choice/outcome, anonymous totals, exact resource/status transitions, cue, and optional assignment/refusal result in one history event; reveal UI and scene selection consume it. Items and world mutations remain open |
| Escape-triggered ending and authored aftermath | Implemented prototype | Group, solo, and no-survivor endings store exact factual character sets, then show a fade-to-black compatible aftermath; more authored aftermath variety remains open |
| Accessible/responsive live play | Partial | DOM controls and keyboard voting exist; live layout, 3D reduced motion, and broader device QA unfinished |
| Sound and settings | Placeholder | Audio manifest reserves unavailable cues; settings sliders are read-only and not wired into live play |
| Distinct character models | Placeholder | All regular crew members use Daniel; Courtney is an isolated experiment |
| Ready for release | No | Gameplay direction, visual acceptance, media integration, and final checks remain |

## Verification on this audit

- `npm run test`: 26 files / 113 tests passed.
- `npm run test:worker`: 6 files / 30 tests passed.
- Full-session Chromium E2E: one test passed, 10.2 minutes overall; both clients completed all ten rounds without reported uncaught page errors. Visual review found major defects despite the pass.
- [Read-only diagnostics](audits/evidence/2026-10-18-diagnostics.mjs): inspected actual GLB clips, sampled routes, reproduced paused one-shot behavior, and checked rescue/scene contradictions.

No production gameplay code was changed by the audit. No new build, release, mobile, cross-browser, FPS, or exhaustive animation-retargeting certification is claimed. The working tree already contained substantial uncommitted development; document moves preserved its current content.

## Implementation verification — 2026-10-19

The [first encounter-presentation slice](implementation/2026-10-19-encounter-presentation.md) changes client scene code, not server gameplay rules. 124 client/shared/scene tests and 30 Worker tests pass; application/Worker TypeScript checks, production build and bundle check pass. Browser fixtures exercise the real live renderer at two/eight crew; retained screenshots and limitations are in the execution record. No fresh full-session multiplayer test or release approval is claimed. The build still reports a large JS chunk; the browser reports a Three.js Clock deprecation warning.

The [resolved-event foundation](implementation/2026-10-19-resolved-event-foundation.md) adds server-authored structured decision facts and a reveal report driven by those facts. The [assignment/refusal foundation](implementation/2026-10-19-assignment-refusal-foundation-plan.md) adds nomination, actor-only response, timeout/refusal resolution, actor-targeted outcomes, persistence, and the cave proving encounter. The combined verification baseline is now 146 client/shared/scene tests and 40 Worker tests, with TypeScript, production build, and bundle checks passing. A real Durable Object alarm test covers persisted timeout resolution. This was not a fresh full-session multiplayer browser acceptance run.

Use `/encounter-preview` in local development to inspect the actual live scene with controlled zones, repeated success, and death fixtures. This preview is excluded from production output. The branching motorboat story, real inventory effects, escape endings, complete assignment-specific choreography, and 14-player support remain unfinished.

## Motorboat route verification — 2026-10-22

The first connected route is now live: boat discovery, anonymous private fuel custody, repair assignment/refusal, descriptive launch risk, group or selfish departure, bounded recovery, three genuine missed-opportunity storm failure, and causal escape/failure aftermath. `npm run check` passed with 184 client/shared/scene tests and 45 Worker tests, TypeScript, production build, and bundle validation. A fresh two-client browser session reached the new discovery card, shared fuel state, repair assignment, directed cove/repair scenes, storm ending, and fade-to-black aftermath without runtime errors; the only warning was the existing Three.js `Clock` deprecation. Development-only `/motorboat-route-preview` provides deterministic shared/group, hidden/solo, recovery, and storm inspection, while Chromium fixtures retain successful group/solo ending captures. Balance telemetry, human playtest acceptance, audio, alternative escapes, animation polish, fourteen-player support, and deployment remain open. No deployment was performed.
