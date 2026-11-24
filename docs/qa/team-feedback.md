# Team feedback implementation and QA

Verified locally on 2026-11-23. Implementation is complete for the requested mechanics; this is not a deployment or balance sign-off.

## What changed

- Jim is an overconfident instigator, including four exact Jim/Tony exchanges. Bear dialogue requires both living speakers and Tony's actual bow/knife. Recent opening exchanges persist across reloads and suppress repetition over the last three openings. Serious injury/death reactions still take priority.
- Courtney has occasional authored repetitions and pauses, retaining his fishing knowledge and normal gameplay rules.
- Eight new starting objects expand the shared pool from 17 to 25: popcorn basket, polo shirt, golf club, rubber duck, frying pan, stapler, beach umbrella, and novelty mug. Offers remain private and distinct. These objects use existing category visuals; popcorn is flavor inventory, not a new consumable system.
- The bear encounter follows the cave and precedes shelter reinforcement. Retreat, supply distraction, and tool-owner bow/knife hunts use existing votes and assignment/refusal. A successful hunt records bear defeat and hides the roaming bear.
- Severe hunger can interrupt a camp boundary with Search or a group vote naming someone to eat. Target nominations are separate from task assignments; ghosts can vote but cannot be victims or hunters.
- A starving individual can receive a private 15-second Sleep / Try to eat someone choice. More widespread starvation raises its opportunity chance. Timeout sleeps; failed attempts reveal both names and either regret or a retaliatory health loss. A critically injured attacker can die from retaliation.
- Outcomes use server-owned rolls, clamped resource deltas, ghost conversion, persisted reports, and route continuation without an extra food tick. Unavailable victims cancel without retargeting. Endings clear queued hunger work.
- Protocol version is 7. Missing optional private state loads with neutral defaults. Old connected clients must refresh after a future deployment.

## Reproduce and review

Run `npm run dev` and open `/team-feedback`. The development-only preview uses the live components, public projection, and rule reducers. Choose bear/group/night, 2/3/full-roster crew, and an outcome roll. It is a local fixture, not an authenticated multiplayer room.

Roll 0 demonstrates successful attempts/search; 0.5 demonstrates resistance or injury; 0.9 demonstrates backing down/regret or fatal bear combat. Search, Sleep, and refusal can be chosen directly. Invalid-target cancellation and fatal knockout are covered by deterministic unit fixtures. Numerical odds are initial tuning in `src/shared/desperation/config.ts` and the [design](../design/2026-11-12-team-feedback-features.md); ordinary player controls use descriptive risk.

Reviewed browser captures:

- [Bear death and named hunter](../../output/qa/team-feedback/bear-death.png)
- [Group target and food report](../../output/qa/team-feedback/group-result.png)
- [Mobile private target selection](../../output/qa/team-feedback/mobile-target.png)
- [Mobile caught-attempt report](../../output/qa/team-feedback/mobile-night-result.png)

The mobile target copy explicitly says the selection stays private until an attempt resolves. The target cannot be the actor. At 390px the report has no horizontal overflow. Keyboard-only selection reaches the target and confirms it; number shortcuts cannot submit a vote through an open modal.

## Executed checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, app and Worker |
| Focused shared/client tests: teamFeedback, campaignCoherence, crewDialogue, protocol, assignmentResponsePanel, privateChoicePanel, consequencePanel | 7 files, 73 tests passed |
| `npm run test:worker` | 9 files, all 56 tests passed |
| `npm run test:e2e -- e2e/team-feedback.spec.ts` | All 5 Chromium scenarios passed, including desktop, mobile, keyboard and full catalog roster |
| `npm run build` | Pass; existing large-chunk advisory remains |
| `npm run check:bundle` | Pass |
| `npm run check` | Typecheck passed; broad unit suite stopped the chain: 38 files passed, 6 failed; 224 tests passed, 5 failed, 4 skipped, plus one setup failure. Remaining stages were run separately above. This broad run preceded the final added regression cases. |

Worker evidence includes server target/owner validation, ghost voting, outsider projection, duplicate/stale submission rejection, old-room normalization, storage load, and a Durable Object alarm resolving a pending night with Sleep. Shared fixtures finish both the signal and motorboat routes after a hunger interrupt and validate snapshots at each phase. They also check weighted boundaries, actual clamped changes, invalid victims, fatal retaliation, one-time resolution, and one-time opportunity rolls.

## Broader workspace failures

These failures concern existing asset/roster/test-setup work outside this feature; the workspace was already modified. No clean-baseline comparison was made by discarding that work.

- `tests/shared/characterManifest.test.ts`: test URL regex rejects current model URL query suffixes (suite setup failure).
- `tests/shared/characterCatalog.test.ts`: expected model mappings differ from current catalog URLs.
- `tests/shared/audioManifest.test.ts`: test URL regex rejects current audio URL query suffixes.
- `tests/client/islandLevel.test.ts`: fixture expects 8 crew positions; current island has 16.
- `tests/client/islandSandbox.test.tsx`: fixture expects “8 crew slots staged.”
- `tests/client/uiLab.test.tsx`: browser test environment has no ResizeObserver for the current model portrait.

## Limits and follow-up

The browser scenarios use a deterministic preview. They do not constitute a fresh two-authenticated-client/reconnect campaign acceptance run. Persistence/privacy are covered at the Worker boundary, and complete escape-route continuation is covered by shared rule fixtures. Human multiplayer acceptance remains open.

No balance simulation or human pacing study was performed. Measure crisis frequency, choices declined, food recovered, deaths, and added session duration before changing the initial tables. A well-fed successful run may never encounter cannibalism. No deployment was performed.
