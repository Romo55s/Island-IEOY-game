# Game coherence and playability audit

Date: 2026-10-18. Scope: current working tree, not just the last commit. Purpose: explain clunky/repetitive play, inspect animation failures, and prepare a creative refinement discussion. No gameplay changes were made.

Follow-up: the owner has answered the initial questions. See the [current design brief](../GAME_DESIGN.md) for confirmed direction and remaining decisions. Recommendations below describe the audit stage and do not override that later direction.

## Assessment

The foundation can run a multiplayer session, but its main promise is incomplete: choosing an action rarely produces a specific, readable action in the world. A player often sees a generic landscape, an abstract resource change, and a joke. Adding more cards or animation files alone will not repair this gap.

The most useful direction to test is a **playable ensemble story**: establish a situation, let the group make a meaningful choice, stage the chosen action, show its consequence, then let that consequence change the next situation. This is a recommendation, not a finalized replacement specification.

## Evidence and limits

- Read gameplay rules, authored cards, UI flow, scene adapters/director, movement, animation loading, actual GLB metadata, tests, and project documentation.
- Ran 113 client/shared/scene tests and 30 Worker tests: all passed.
- Ran the existing two-client ten-round browser test with production timers: passed in 10.2 minutes overall, 10.1 minutes test time. Both clients reached the ending; captured host view showed two living characters at 18 HP and zero food. The test clicks the first option each round; this is one random session, not a balance study or proof of fun.
- Inspected fresh screenshots and the existing live eight-character sandbox. The sandbox displays fabricated stats and must not be treated as live gameplay evidence.
- Ran reproducible [diagnostics](evidence/2026-10-18-diagnostics.mjs) using the actual production route helpers, rescue rules, director, and installed Three.js API.
- Did not measure FPS/GPU cost, exercise every clip on every rig, run a human group playtest, or newly verify mobile/Safari/Firefox. Distinguish confirmed source behavior, captured visual defects, and hypotheses below.

## Priority findings

### A01 — Critical: camera, travel, and phase timing disagree

**Observed:** the first vote, first reveal, and fifth vote captures show no visible crew in the main scene. The UI claims the crew is at the encounter and celebrating while displaying terrain.

**Cause:** `SessionIslandView.tsx:20` targets the destination immediately; `GameCanvas.tsx:43` interpolates the camera independently. `IslandScene.tsx:65` starts actual route travel at 2.6 m/s. The server opens voting after 25 seconds and normally resolves at 35–40 seconds, then reveals for 20 seconds. Centerline diagnostics at 60 FPS give beach → rocky coast **98.2 seconds** and beach → foothills **101.7 seconds**, including acceleration. These are helper-derived estimates, not browser frame measurements. They explain why a decision can finish before its characters arrive.

Travel also overrides every non-fall reaction (`IslandScene.tsx:130`), so the very consequence the player waits to see can be skipped. During death, the route loop continues moving the group even though it swaps to a fall clip. Local delta time is capped at 0.05 seconds; slow/hidden clients can lag further. Refresh mounts the crew at the current zone instead of matching another client's travel position.

**Reproduce:** start a session whose early card targets a distant zone; inspect crew visibility when voting opens and during reveal. Existing screenshots already demonstrate it. **Owner:** scene choreography / camera. **Priority:** first fix. Prefer short transitions and local staging; do not make game timers wait on the slowest rendering client.

### A02 — High: one-shot animation lifecycle is incomplete

`CharacterModel.tsx:90` sets `LoopOnce` and `clampWhenFinished=true`. There is no finished-event transition back to idle. Restart occurs only when the selected action object changes; a second event requesting the same clip has no event identity to trigger playback. A local Three.js diagnostic confirms a clamped action stays paused after a repeated request without reset.

Additionally, a clamped previous action is not `isRunning()`, so the existing branch fades in the new action without fading out the old paused action. This can leave competing weighted poses. The API/lifecycle defect is source-confirmed; exact visual distortion across all assets remains unmeasured.

**Owner:** animation controller. Use an event-keyed request, explicit idle return, clearing/fading of old actions including paused ones, and a distinct death → ghost lifecycle. Test real mixer time, repeated events, interrupted playback, and missing clips, not only clip-name selection.

### A03 — High: the world does not enact the selected outcome

`IslandScene` renders `<Island />` without outcome/world-state inputs. The director mostly maps success/setback/danger to gestures. A successful signal does not show a flare and approaching vessel; shelter choices do not create the chosen shelter; a boar event has no event-driven boar performance; a raft outcome does not change a raft. The roaming bear is scenery behavior, separate from the card rules.

**Owner:** event schema + encounter presentation. Each authored outcome needs actors, action, target/prop, consequence cue, and any persistent world change. Generic social gestures should follow that action, not substitute for it.

### A04 — High: shuffle creates variety of order, not a coherent story

`startGame` shuffles the same ten cards; `beginDecision` picks the next index. There are no prerequisites or world flags. The raft is already built because its prompt says so. “Save it for night” resolves immediately without an actual deferred night event. A ship can change course in round one without influencing rescue progress or later encounters.

`deriveEndingId` uses survivor presence and an average of living-character resources plus shelter. The raft/flare story does not directly determine escape. The weight of the single shelter value also decreases as the number of surviving characters rises.

**Owner:** game design / shared rules. Introduce a small stateful encounter structure and explicit escape progress only after choosing the intended win condition. Start with three connected encounters; do not expand into a giant branch tree.

### A05 — High: survival offers too little readable agency

Starting items are validated, saved, displayed, and held, but neither rescue success nor card outcomes use their properties. An apple cannot be eaten and a tool cannot unlock a practical response. Character strengths/flaws mostly personalize presentation. “Send one volunteer” selects no named volunteer; a death chooses a random living player.

There are **zero water-changing outcomes** in the deck, including rainwater collection, which changes health/food/shelter instead. Only food and health have ongoing survival rules. Morale/shelter contribute to endings and some reactions but do not provide the intuitive protective/resource effects their labels imply.

Food drops by ten each decision, but players cannot choose to forage whenever they need to. The director's “Searching the area for food” and aid labels do not gather or heal. Zero-food banter overrides most other reactions every hungry round, making the same cannibalism exchange recur and drowning out the selected outcome.

**Owner:** mechanics / content / UI. Decide which resources and items earn real gameplay roles. Explain time units and costs. Pair scarcity with available recovery choices. Do not infer balance quality from one random playthrough or change constants just to make tests pass.

### A06 — High: rescue incentives and presentation contradict the fiction

`resolveCrashBatch` leaves everyone alive when nobody attempts rescue: no initial peril/death is resolved except rescue complications. Attempting a rescue can kill someone; successful rescue offers no survival advantage over everyone abstaining. The timeout path therefore avoids rescue-generated mortality. This is a consequence of the implemented rules, not a recommendation for players.

Multiple attempts can produce an initial success and a final death for the same target. The rules deliberately let elimination win. However, `deriveCrewHistoryBeat` selects the first successful attempt before considering deaths or final alive state. A diagnostic using real resolver output yields a reunion pair with a dead target. The separate crash clip resolver correctly prioritizes fall, leaving gesture, staging, and dialogue inconsistent. Self-rescue can also create a pair containing the same ID twice.

All later deaths get the director label “Lost in the crash” (`crewHistoryDirector.ts:50`), even when berries or starvation caused them.

**Owner:** crash design / director. Define who is in danger, what rescue changes, and what self-preservation costs; final state and death must take precedence in presentation. Use cause-specific wording and distinct living participants for pairs.

### A07 — High: the interface hides why decisions matter

The live HUD exposes HP and food but omits water, morale, and shared shelter. Anonymous vote counts arrive in the public snapshot but are not rendered. The reveal gives prose without a before/after resource ledger or a clearly attributed actor. Players cannot easily see what changed or understand the ending.

`stateMachine.ts` truncates the choice plus outcome narrative to fit a 280-character event string after reserving up to 220 characters for starvation copy. In longer cases the actual consequence can be cut mid-sentence. Structured facts should remain separate from a short activity-log summary.

At the browser test's 1280×720 viewport, the choice buttons begin below the visible bottom of the screen (full-page capture shows them around y=778). A tall header and scene force scrolling between action and context. The whole reveal is styled as a large heading. The newer full-screen sandbox layout and the live game are separate interfaces; visual work on one has not consistently improved the other.

**Owner:** live-game UI. Keep the active choice and important actors visible together; show current stakes, anonymous totals, applied changes, and a concise cause-specific report. Preserve character identity in speech: current thoughts are labeled with the player's callsign rather than the speaking character's name.

### A08 — Medium: waiting has little dramatic purpose

Each round uses 25 seconds of disabled choices, a 15-second vote window with a ten-second minimum, and a 20-second reveal. Across ten rounds, that alone is approximately 550–600 seconds before opening phases. Much of the time is a static panel or generic animation. The 30-second intro is text over the island, not the promised crash sequence.

The UI says voting opens “when the crew is ready,” but a timestamp opens it. “LOCKED” styling appears while a vote is still replaceable. There is no visible reveal countdown or group-ready continuation.

**Owner:** pacing / copy / server timing. Decide whether the group is chatting in person/voice and whether readiness should end waiting. Preserve a clear deadline and server authority. Do not remove discussion time without understanding how the group plays.

### A09 — Medium: motion and pair staging lack spatial guarantees

Routes interpolate endpoint Y rather than resampling terrain along the path. Centerline diagnostics show gaps of up to 12.37 m against `sampleIslandSurfaceY` for the foothills route. This is a geometry mismatch; its exact screen appearance depends on the terrain mesh and camera.

Pair offsets change without a dedicated approach/face-partner state. After travel, actors keep their route-facing rotation. On stationary pair changes, positions can snap directly to the new offsets. A hug clip alone cannot coordinate two bodies. Ghosts still use the normal model/locomotion with a ring and wireframe overlay rather than a complete ghost animation/material state.

**Owner:** staging and locomotion. Use small encounter-local marks, partner orientation, non-overlap, grounded feet, and graceful fallbacks. Validate with two and eight actors.

### A10 — Medium: asset and test contracts cover an older runtime

The eight-clip `daniel.glb` is 1,835,652 bytes. The actual loader also fetches `daniel-animation-library.glb`: **8,032,452 bytes and 33 clips**, including walk, hug, and the social gestures. Thus “the clip is absent from the eight-clip manifest” is not the general cause of current failures. The runtime uses the separate library and literal source names; the semantic manifest is not its selection source.

Manifest tests validate the smaller model, not the actual library/controller relationship. The build artifact checker rejects selected file extensions/paths; it does not establish every model's approval or runtime animation coverage. Do not treat a passing check as full asset acceptance. The library also contains a mesh; inspect whether that payload can be reduced after correctness is restored.

**Owner:** asset pipeline / animation integration. Inventory both loaded assets, validate every referenced action, use fallbacks, and measure actual download/decode cost. Distinct crew models and retargeting remain a later polish scope.

### A11 — Medium: tests prove transport and rules more than the experience

The fresh full-session test passed while the captured scene showed no crew. Scene unit tests assert names, labels, and deterministic mappings; route tests assert interpolation, not arrival before a consequence; no controller test catches repeated one-shots or return to idle. A single first-option policy and random outcomes cannot establish fairness, narrative coherence, or replayability.

Add deterministic representative encounter replays with screenshots before/during/after consequences, real mixer tests, and integration checks tying event facts to UI/world changes. Keep human playtesting for comprehension, humor, tension, and boredom.

### A12 — Medium: promised features and documentation have diverged

The old spec calls resources shared, promises a fixed camera, audio/settings, crash choreography, a performance quality ladder, and broad acceptance. Current resources are mostly per-character; the camera has controls plus automatic recentering; audio files/player are absent; settings are placeholders; the crash sequence and 3D reduced-motion control are incomplete. Old unchecked master tasks coexist with later all-checked polish plans that still have the defects above.

Historical records are now archived. Current status is in [the project index](../README.md); the [roadmap](../ROADMAP.md) is the active backlog. Asset/license records remain available.

## Fresh visual evidence

- [Round 1 vote: rocky coast, no visible actors](evidence/full-session-vote-1.png).
- [Round 1 consequence: successful flare report over empty terrain](evidence/full-session-reveal-1.png). Both speakers repeat the same celebration line.
- [Round 5 vote: foothills, no visible actors](evidence/full-session-vote-5.png).
- [Round 5 consequence](evidence/full-session-reveal-5.png).
- [Ending: two visible survivors, both starving at 18 HP](evidence/full-session-ending.png).

These copies are retained separately from the test runner's overwriteable `test-results` directory. The run was launched before the audit's date rollover with output folder `output/audit-2026-10-17/e2e`; the audit and retained evidence are dated 2026-10-18.

## Questions for the owner

Answer in rough notes; there is no need for a full design document. Defaults below are proposals only.

1. **Emotional center:** should players mainly laugh at disasters, struggle to survive, or become attached to the cast? Which should dominate? Suggested: understandable survival stakes with comedy emerging from consequences.
2. **Loyalties:** does everyone try to save the whole crew, or should players protect themselves, betray others, or pursue personal goals? Suggested first slice: shared survival, with named volunteers and costly sacrifices but no hidden traitors.
3. **Decision authority:** group majority only, individual decisions, or a combination? Can a player refuse to be the selected volunteer? This determines actor targeting and fairness.
4. **What should actually appear on screen?** Give two or three scenes you imagine—for example, someone lighting a flare and burning the shelter, rescuing another person, or using a ridiculous item to scare an animal. Which outcomes must be visibly acted out?
5. **Items and personality:** should items be consumable tools that unlock options, passive bonuses, comedy props, or combinations? Should strengths/flaws change outcomes or only voice/animation?
6. **Risk and death:** should sensible preparation usually work, with visible residual risk, or should unpredictable disasters be common? Can a character die during the opening? What meaningful role should their ghost have afterward?
7. **Survival detail:** which meters should players actively manage—shared supplies, personal hunger/injury, morale, shelter, water? Suggested first slice: only meters with clearly understandable choices and visible effects.
8. **Session and social setting:** how many players normally, how long should a run last, and are they together or on a voice call? Should fast agreement advance immediately, or should everyone get fixed discussion time?
9. **Victory and replay:** is the goal to get rescued, finish a survival period, keep everyone alive, or produce the funniest ending? Should a replay have new encounters, different branches, or just different outcomes?
10. **Presentation and tone:** directed camera or free inspection? Desktop-first or equal phone support? Keep the retro workplace humor, or move toward more grounded island comedy? Mention any comedy boundaries and one or two reference games/scenes you like.

Follow-up implementation questions can be resolved after these answers: exact actor/target consent, tie and abstention behavior, what happens when everyone is dead, vote privacy if adding personal actions, readiness/timeouts, item ownership after death, which facts persist between encounters, and whether any between-session progression is desirable. Existing private-vote and deployment constraints remain unchanged pending explicit revisions.
