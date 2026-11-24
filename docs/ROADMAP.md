# Game refinement roadmap

Updated 2026-10-23. This is the active backlog. It replaces the overlapping historical plans listed in the [archive](archive/2026-10-18/README.md).

**Goal:** make each decision understandable and consequential, show the cast's reactions, then build a replayable session around that experience.

**Current creative basis:** [Design brief v4](GAME_DESIGN.md) records the owner's answers through 2026-10-19. First successful escape ends the session with fade-to-black aftermath; compulsory assignments allow one individual probabilistic refusal attempt; ghosts have equal votes; highest count wins with random tied/no-vote selection; risk is descriptive; typed-language interpretation is deferred. The third genuine missed motorboat opportunity triggers the authored storm-surge failure. Replace the fixed ten-round ending with connected routes. Session capacity now matches the 15-character roster; full-scale reliability and human playtesting remain open.

**Scope:** active implementation sequence after the audit and owner approvals. Preserve the working multiplayer foundation and existing uncommitted development. Implement the approved motorboat slice before expanding content or capacity.

**Technical basis:** React/TypeScript, React Three Fiber/Three.js, Cloudflare Worker/PartyServer, Zod, Vitest, Playwright. The server owns game facts; clients present those facts. No new engine, database, accounts, or deployment is needed for the next slice.

**Presentation pivot — 2026-10-23:** the owner approved a story-first incident room as the normal multiplayer view. Contextual illustrations and authored crew dialogue frame the existing choice phases; the server-owned decision mechanics remain intact. The 3D island is a development sandbox at `/sandbox`, and its route is lazy-loaded. Character models are intended as portraits once distinct approved models/renders exist; the shared Daniel GLB is not a cast portrait set. Minigames are deferred until the decision loop has been accepted.

**Contextual dialogue slice — 2026-11-10:** resolved event exchanges and decision-opening lines are selected from explicit public event/outcome IDs, saved on room history, and reused by the incident report and crew radio. Dialogue selection is deterministic and isolated from gameplay RNG; role-aware content, serious loss/injury fallbacks, a short motif cooldown, and `/decision-test` seed preview are implemented. Coverage and QA limits are recorded in `docs/qa/crew-dialogue.md`; expanding the authored exchange library remains content work.

**Narrative direction — 2026-10-23:** the owner clarified that the intended game is a connected authored decision tree with multiple routes and good, mixed, and bad endings. Prior choices must affect later scene eligibility, state, narration, and reachable endings. Randomness should resolve uncertainty within that authored story, not shuffle unrelated scenes into a fake branching campaign. The motorboat route is one current route foundation, not the complete story.

**Implementation status — 2026-10-22:** the three foundations remain implemented, and the first authored [motorboat route](implementation/2026-10-19-motorboat-route-plan.md) is now implemented too: discovery, private fuel custody, compulsory repair, group/solo departure, bounded recovery, third-miss storm failure, factual escape sets, and fade-to-black aftermath. The current verification baseline is 184 client/shared/scene tests and 45 Worker tests, both TypeScript checks, production build/bundle validation, real Durable Object timeout tests, a fresh two-client browser route through discovery, repair, and the storm ending, deterministic Chromium coverage for group/solo endings, and a development-only route preview. It is an implemented prototype, not balance acceptance, a completed content set, or fourteen-player support.

**Campaign coherence corrections — 2026-10-28:** successful signal/group escape now bypasses the same-resolution food tick; direct outcome effects still resolve. Signal position and cove arrival are tracked separately from map knowledge/scouting. Contradictory history claims and unsupported time/supply stakes were corrected; story-map edges now have endpoints. The vote deadline is trialed at 40 seconds, with all-voted immediate resolution retained. Deterministic schedule upper bounds become 16:17 for the reviewed successful signal path and 18:02 for direct boat; human timing remains untested. App typechecks and 14 focused client / 22 focused Worker tests pass. Full route acceptance remains open. See the [review](design/2026-10-28-campaign-review.md), [correction plan](superpowers/plans/2026-10-28-campaign-coherence-and-validation.md), and [first campaign story map](design/first-campaign-story-map-v1.md).

**Roster capacity — 2026-11-12:** 16 selectable characters are present, including Courtney. Room admission, start validation, protocol array bounds, passenger counts, and island staging now share the character-catalog capacity. A full 16-client load/reconnect playtest remains open.

## M0 — Audit and documentation reset: completed

- [x] Inspect current rules, cards, presentation, animation loading, and docs.
- [x] Verify the shared/client/scene and Worker suites: 143 tests pass in total.
- [x] Run a full two-client session with real timers; inspect fresh vote/reveal/ending screenshots.
- [x] Reproduce one-shot lifecycle behavior; measure route duration from production helpers; inspect the real animation library and rescue contradictions.
- [x] Retain fresh visual evidence and a reproducible diagnostic script.
- [x] Move 16 historical plans/specs/preflights/acceptance records into a recoverable archive; distinguish design targets from implemented behavior.
- [x] Create one current status index, one audit, and this roadmap.
- [x] Record the owner's answers to the audit questions in the current design brief; label additional mechanics as proposals.
- [x] Record the follow-up decisions and replace superseded voluntary-assignment, numeric-risk-display, and undecided-ending proposals.

## Existing foundation to keep

- [x] Room creation/join, password/ticket admission, unique character selection, readiness.
- [x] Server-owned phases, deadlines, votes, public/private snapshot boundaries, outcomes, deaths, persistence/reconnection machinery.
- [x] Starting-item offers and simultaneous rescue plumbing.
- [x] Ten authored decisions, resource updates, hunger/health/death rules, ghost voting.
- [x] Four ending IDs rendered with distinct titles/copy.
- [x] Island geometry, encounter zones, route graph, cloned rig, animation library, placeholder props, bear.
- [x] DOM voting interface, keyboard shortcuts, test infrastructure.

These boxes track implementation only. Rescue incentives, survival balance, narrative rules, camera behavior, and animation quality still need the work below.

## M1 — Agree on the experience and make one encounter readable

### 1. Capture the owner’s design decisions

**Input:** [current design brief and remaining decisions](GAME_DESIGN.md), current code, and the owner's discovery/sharing, bear hunt, and selfish boat departure examples.

**Output:** update the single current design brief rather than starting another competing specification. Record each choice as confirmed, proposed, or deferred. Never mark a recommended default as confirmed without an answer.

- [x] Record main emotions, cooperation/self-interest, and mixed group/individual decisions.
- [x] Record escape as the objective, early death with continued group voting, real items/traits, and all requested survival resources.
- [x] Record directed cinematic camera and desktop-first priority.
- [x] Confirm first escape ends, forced assignments with refusal attempts, equal ghost votes, and removal of the ten-round cap.
- [x] Confirm 8-player testing / approximately 14-player target, descriptive risk, deferred typed language, and no additional owner-specified humor boundaries.
- [x] Confirm repeated missed escape opportunities can trigger a deadly situation and no-escape ending.
- [x] Specify refusal visibility/timeout/fallback, qualifying missed opportunities, escalation warnings, threshold and terminal scene. Discussion timers remain pending until the social setup is known.
- [x] Author a compact branching boat-route map with meaningful reconvergence, bounded recovery, and persistent consequences.
- [ ] Specify resource ownership/rates, private-action visibility, and the cinematic action vocabulary.
- [ ] Choose one representative encounter with success, failure, and death/injury outcomes that exercise the desired loop.

**Exit condition:** we can describe what players do, why their choice matters, what they see afterward, and how it affects their next decision without inventing missing rules.

### 2. Repair staging, camera, and animation playback

**Files:** `src/scene/characters/CharacterModel.tsx`, `src/scene/phases/IslandScene.tsx`, `src/scene/GameCanvas.tsx`, `src/scene/routeMotion.ts`, `src/scene/sessionPresentation.ts`; tests in `tests/scene/` and a focused browser encounter replay.

- [x] Give animation requests an event identity; replay a new event even when it requests the same clip.
- [x] Return completed one-shots to idle, including the existing ghost overlay; fade/stop clamped paused actions. Missing clips fall back to idle and report in development. A full ghost material/choreography redesign remains separate.
- [x] Remove long-distance locomotion from live encounter presentation; recorded death takes priority over social/ambient selection. The exploration sandbox retains its old travel path.
- [x] Use directed cuts between distant live zones, with cast and camera sharing an acting anchor; no client animation completion changes server rules.
- [x] Ground live marks with the surface sampler, move waterfall/foothills anchors out of intersecting scenery, and orient paired actors toward each other.
- [ ] Smooth pair approach/repositioning and validate exact rendered foot contact across trail overlays; current pair changes use direct marks.
- [x] Derive one-shot catchup from server-estimated phase time, including delayed model loads; test elapsed-event fallback without replay. Loop phase synchronization and real reconnect browser acceptance remain.
- [x] Add real-mixer checks for repeated one-shots, paused-action replacement, interruption, disposal, missing clips and elapsed one-shots.
- [ ] Exercise a real reconnect/slow-asset browser session during reveal; current coverage is controller tests plus deterministic live-view fixtures.
- [x] Inspect desktop captures of eight crew across the six current encounter zones and two-crew reaction/replay/death/rest. Broader device QA and full synchronized pair choreography are not accepted yet.

**Exit condition:** every sampled consequence has its relevant actors visible; the same action can replay on a later event; characters return to a stable rest state; reconnect does not produce a contradictory result.

## M2 — Connect the decision to world state and a clear report

### 3. Define one structured resolved-event contract

**Files:** `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/rules/stateMachine.ts`, `src/shared/rules/outcomes.ts`, `src/shared/content/decisionCards.ts`; consume it in `src/scene/sessionPresentation.ts`, `src/scene/crewHistoryDirector.ts`, and encounter props under `src/scene/`.

**Contract responsibilities:** stable event ID/time; encounter, option, and outcome IDs; named actor assignment; assignment/refusal result; actual per-character/shared changes; injury/death cause; and presentation cue. Persistent world mutations and richer target/item facts remain extensions for the motorboat slice.

**Foundation completed — 2026-10-19:** the server stores the prompt, winning option/outcome, anonymous totals, exact clamped resource transitions, death/status cause, affected characters, presentation cue, and optional resolved assignment inside the authoritative history event. Assignment IDs and event IDs use a persisted sequence; actor-only effects, all refusal outcomes, reconnect privacy, and alarm timeout are covered. Items and world mutations are not represented yet. See the [resolved-event record](implementation/2026-10-19-resolved-event-foundation.md) and [assignment/refusal record](implementation/2026-10-19-assignment-refusal-foundation-plan.md).

- [x] Capture the current implemented decision facts once on the server; keep individual voter identity private.
- [x] Render anonymous totals and exact before/after resource/status changes from the same stored event.
- [x] Separate compact activity-log prose from the full structured reveal so truncation does not erase the authoritative facts.
- [x] Reject inconsistent event identifiers/deltas and make an already-resolved phase a no-op.

- [x] Resolve assigned actor and current measured changes once on the server; retain vote privacy. Richer target/item/world facts remain open.
- [x] Preserve highest-count/tied-leader/no-vote assignment selection, including random fallback, and persist the selected actor. Dynamic route-option eligibility remains open.
- [ ] Render character actions and persistent world changes from the same event; report copy and measured deltas already use it.
- [x] Separate short event-log text from the full consequence report; never truncate away causal facts to fit starvation text.
- [ ] Enact the selected action before social reactions. For example, the chosen flare action uses an actual flare cue and a recorded rescue/world-state effect where designed.
- [ ] Retain lasting changes across subsequent encounters and reconnects; derive them from state rather than whether a client happened to watch an animation.
- [ ] Test success, injury, death, pre-existing ghost, simultaneous effects, and event replay without duplicate application.

**Exit condition:** a player can explain which choice won, who acted, what happened, what changed, and why the scene looks different.

### 4. Unify the live presentation

**Files:** `src/game/screens/GameSessionScreen.tsx`, `SessionIslandView.tsx` and their CSS; `src/ui/organisms/DecisionConsole.tsx`, `ConsequencePanel.tsx`, `CharacterStatusPanel.tsx`, `EndingSummary.tsx`; `src/ui/molecules/VoteOption.tsx`.

- [ ] Keep the active choice, stakes, and relevant scene actors visible together at the primary viewport; shrink the persistent title/room chrome.
- [ ] Show all resources that actually matter under the agreed rules, with clear ownership (crew vs character).
- [x] Show anonymous winning totals and actual before/after changes during reveal.
- [x] Show descriptive refusal risk, not numeric odds, and give only the assigned player the accept/refuse prompt. Concurrent multi-assignment prompts are outside v1 and remain open if later content requires them.
- [ ] Replace misleading readiness/locked labels with accurate received/replaceable/closed state; show what happens next and when.
- [ ] Use character names for character speech. Resolve death, hunger, and success priorities consistently; suppress identical paired lines and repeated hunger jokes.
- [ ] Make the real live screen the acceptance surface. Reuse tested UI components from the sandbox where useful; keep fabricated demo values out of gameplay.
- [ ] Verify keyboard use, desktop reflow, text size, contrast, reduced motion in the 3D sequence, and reconnect/error feedback. Preserve basic responsive behavior; defer comprehensive phone QA.

**Exit condition:** nobody must scroll away from the consequence to understand the decision; no hidden score determines an unexplained result.

## M3 — Build a branching island story with real choices

### 5. Make choices form a connected story tree

**Files:** shared domain/content/rules, `worker/game/GameRoom.ts`, `worker/game/roomStorage.ts`, `worker/game/roomScheduler.ts`, scene presentation and relevant unit/Worker tests.

- [ ] Redesign the crash around explicit peril, rescue benefit, self-preservation cost, and final-state precedence. Cover no submissions, duplicate targets, self-rescue, partial success plus death, and all-dead outcomes.
- [ ] Implement a small selected set of real item uses; record consumption, ownership after death, and effects. Do not imply mechanics for flavor-only items.
- [ ] Connect the retained survival meters to understandable choices. Fix rainwater semantics; provide recovery opportunities if starvation is intended as a manageable threat.
- [x] Implement compulsory group assignment to a living actor with an individual accept/refuse response, timeout acceptance, one probabilistic refusal attempt, authored success fallback, actor-targeted effects, truthful narration, persistence, and reconnect privacy. The cave is the proving encounter; motorboat use remains next.
- [x] Author the first-arc branch map with connected crash/camp setup, signal and motorboat routes, five target endings, branch conditions, reconvergence, and ending rules in `docs/design/first-campaign-story-map-v1.md`.
- [x] Define the minimum persistent story facts for rescue, inventory, shelter, signal readiness, cove discovery, route outcomes, and character condition in the branch map; relationship/debt tracking is excluded until a later scene uses it.
- [x] Route new sessions through server-selected shoreline, first-night, signal, and motorboat nodes; keep random rolls inside vote/actor/risky-action resolution. Older persisted sessions retain their legacy progression.
- [x] Make earlier choices visibly change later scene access, available options, character reactions, and ending eligibility through campaign flags and route conditions. Full path variation and motorboat browser playthroughs remain in M4.
- [ ] Validate graph reachability: every intended ending is reachable; no nonterminal state dead-ends; each route has a credible recovery or terminal consequence; early deaths and hidden/private facts have defined fallbacks.
- [x] Implement one proposed escape project (motorboat first) with explicit prerequisites, capacity, and failed-attempt aftermath. First successful escape ends the session; replace round-count success with this confirmed rule.
- [x] Exercise group departure, selfish departure, and no-survivor failure in deterministic rules/Worker/UI coverage. A human acceptance run for both successful exits remains in M4.
- [x] Implement authored missed-escape escalation: unique persisted opportunities, public warnings, bounded recovery, and the coherent third-miss storm terminal; successful escape has precedence.
- [x] Implement fade to black followed by coherent factual escape/stranding/death reporting and one persisted-compatible dark-comedy aftermath bundle.
- [x] Validate the motorboat story-map's unavailable-actor/item fallbacks and bounded retry cycle in deterministic tests. Broader future routes still need their own reachability checks.
- [x] Validate that motorboat private discovery, contribution, and escape controls do not leak through viewer snapshots, logs, or scene staging.
- [ ] Keep player-typed suggestions non-executable unless converted into supported, validated, confirmed actions. No unrestricted AI referee in the proposed first slice.
- [ ] Keep numeric tuning provisional while measuring survival, duration, and choice distributions. Use the installed `eval-driven-game-development` skill only after the simulation actually represents the relevant mechanics; human playtests decide readability and fun.

**Exit condition:** two runs can differ because of player choices; the later scene acknowledges earlier facts; no encounter refers to an absent object/actor without establishing it.

## M4 — Human playtest, then scale and polish

### 6. Validate the slice with the actual group

- [ ] Play the small authored slice with a group sized for the current 15-player roster. Validate full-run pacing and reliability before claiming support for large groups.
- [ ] Ask after each consequence: “What did you choose, what happened, and what could you do differently?” Record confusion without coaching the answer.
- [ ] Observe idle time, discussion, laughter, frustration with chance, ghost engagement, repeated dialogue, and which scene actions players notice.
- [ ] Keep numerical balance reports separate from human observations; do not claim that a passing simulation proves fun.
- [ ] Resolve the highest-impact findings before authoring a larger encounter set.

### 7. Expand only the proven pattern

- [ ] Expand the encounter pool and conditional follow-ups only after the first connected story tree passes playtests; preserve authored prerequisites and actor/world-state validation.
- [ ] Add alternative escape routes only after the first works. Verify every blocked project has obtainable recovery/substitution options rather than waiting indefinitely for a rare card.
- [ ] Design explicit long-session pause/resume and disconnection handling if needed; do not equate storage persistence with a finished resume experience.
- [ ] Add audio startup/mute/volume controls and short consequence cues with valid media licenses.
- [ ] Validate and optimize the actual model + animation library payload; profile loading and frame performance with two/fifteen characters.
- [ ] Add approved distinct character assets and test retargeting/action coverage per rig.
- [x] Expand session capacity to the full character roster (15): Worker admission and start checks, public snapshot/event bounds, player counters, and 3D staging now use the catalog-derived maximum. Eight-player sessions remain within the new bounds.
- [ ] Validate the 15-player lobby and gameplay under full browser load, including reconnect, private prompts, ghost votes, and report readability.
- [ ] Verify the final live game on agreed browsers/devices, including reduced motion, slow loading, disconnection, and complete sessions.
- [ ] Run release checks and obtain local gameplay/visual acceptance before any separate deployment request.

## Deferred until the core experience works

Large persistent progression systems, assigned hidden-traitor roles, public matchmaking, autonomous gameplay agents, an unrestricted AI referee, a larger island, mass asset generation, and exhaustive expansion of the authored story map. These are possible future scope, not prerequisites for the first slice. Authored branching, situational selfish choices, and betrayal are confirmed core direction. Defer content volume, not the branching architecture itself.

## Skills to use by task

| Task | Relevant skills |
| --- | --- |
| Agree on mechanics, tone, meaningful decisions | `game-designer` |
| Live UI and understandable feedback | `game-ui-frontend`, `ux-usability-foundations`, `ux-writing-content-design`, `accessibility-inclusive-design` |
| Animation, camera, event presentation | `react-three-fiber-game`, `web-3d-asset-pipeline` |
| Server changes and synchronization | `durable-objects`, `workers-best-practices` |
| Numeric balance once mechanics exist | `eval-driven-game-development` |
| Visual and full-session acceptance | `game-playtest` and the existing Playwright tests |

Use only the skills relevant to the current milestone. The audit used game-design/usability/playtest guidance and planning structure; installation alone does not validate a design or an animation.
