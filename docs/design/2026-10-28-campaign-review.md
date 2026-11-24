# Expanded campaign review

Reviewed 2026-10-28 against the current working tree, including the expansion documents dated 2026-10-29. Base commit: `f9cce81`. The campaign and related presentation changes are uncommitted; this review assesses their combined behavior, not authorship or commit ordering.

## Assessment

The overall story works: establish a survival priority, stabilize camp, choose an escape project, prepare it, and resolve an escape or a bounded failure. Server-owned transitions, persistent opening choices, a single signal opportunity, and reuse of the boat system are good decisions. Keep that structure.

The expansion is not ready for acceptance as a coherent, validated campaign. Some narration invents prior events, some choices promise consequences the rules do not implement, the visual map breaks before the route split, and a survival tick can overwrite a successful escape. Fix those before adding more scenes. The eight survival scenes currently form a fixed sequence with state variants; meaningful reconvergence is a valid design, but it should not be described as eight independently branching situations.

Implementation follow-up: [Campaign coherence and validation plan](../superpowers/plans/2026-10-28-campaign-coherence-and-validation.md).

## Findings, in priority order

### R1 — High: a successful escape can resolve as no survivors

In `src/shared/rules/stateMachine.ts:316–374`, the daily survival tick runs before the successful campaign/boat effect. If it kills the last survivors, the no-survivor branch prevents the successful escape effect from running.

Reproduction: enter `signal-attempt` with two living characters at 10 health, zero food, and `decisionsSinceFoodTick: 2`; select smoke and force its successful outcome. The event records `smoke-beacon-success`, but the ending is `no-survivors`. Partial starvation deaths can also change the passenger list of an otherwise successful escape. Group boat launch uses this same ordering; solo launch follows a different resolution path.

This violates the confirmed first-success precedence rule and creates contradictory history. Commit a valid successful escape before unrelated survival consumption. Preserve direct action costs and deaths where an outcome actually specifies them. Test signal, group boat, partial crew, replay, and non-successful outcomes separately.

### R2 — High: the story map is not a reliable representation of the campaign

`src/game/storyMap/storyMapData.ts:236` routes all three storm outcomes to `decision:escape-project`, which does not exist. The actual cases are `escape-radio`, `escape-no-radio`, and `escape-no-radio-scouted`. A graph endpoint check fails on all three edges.

Other map cases lose relevant history: signal approach transitions inspect only the new outcome's flag, not previously stored facts; preparing a signal kit is incorrectly coupled to the presence of rope/binoculars in fixtures; and every coastal-hazard case routes to scouted boat discovery. These are representative examples, not exhaustive live eligibility.

The Markdown graph also reuses `C` for crash/cave and `W` for wreck/wildlife (`docs/design/first-campaign-story-map-v1.md:17–29`). Those are identical Mermaid nodes, producing false connections and cycles. It advertises a boat-recovery → escape-project edge that the server does not implement. Its prose says failed signal returns to project selection, while the actual server correctly follows the newer expansion plan directly to the coastal expedition.

Repair the map and reconcile these descriptions to the implemented one-way route commitment. Do not silently add a new route-switch feature merely to match an old diagram.

### R3 — Medium: location, preparation, and weather facts are conflated

`coast-route-marked` is set by the daybreak coastal map, storm preparation, signal preparation, and ridge approach. The signal-window prompt and success weights treat it as current ridge position (`campaignRoute.ts:143–160, 230–233`).

Reproduction: map the coast at daybreak, then explicitly choose `use-low-path`. The next prompt still says “From the ridge,” and the crew retains the position bonus. Choosing the low path does not replace the earlier fact. Likewise, first-night lookout knowledge grants the position bonus independently of the crew's later physical position.

Signal preparation can already narrate reaching the ridge, followed by another climb decision. The weather-window option says the crew sends the signal, but the next decision still asks which signal to send. A gust scatters prepared tinder without changing preparation state. Separate knowledge, current position, preparation, and the actual signal attempt; have each scene do one of those jobs.

### R4 — Medium: several scenes claim history that never happened

Concrete reachable examples in `src/shared/content/campaignRoute.ts`:

| Prior choice | Later contradiction | Evidence |
| --- | --- | --- |
| Catch rain at camp | Cave prompt claims a discovered spring trail | Lines 62, 92–94 |
| Skip shelter work or fail the platform | Storm option guarantees a reinforced shelter/braced roof | Lines 107–108, 124–129 |
| Drive off the boar, then skip shelter work | Council says the shelter is holding | Lines 115–116 |
| Recover bottles/crackers, or food/kindling in the cave | Shelter option produces salvaged roof panels | Lines 49, 95, 104 |
| Reach the cove without an early scout | `coveLocated` remains false; after failed signal, discovery narrates searching for the boat again | Lines 174–184; `motorboatRoute.ts:38–42` |
| Avoid injury successfully | Medical prompt insists that the boar caused scrapes and a limp | Line 87; a sheltered, rested crew can still be fully healthy |

Use precise state predicates or neutral copy where no persistent fact is needed. Preserve the distinction between arriving at the cove and having scouted it early enough to gain an advantage. Remove unreachable “boar has returned” and “finish repairs” entry variants unless there is an actual return path: those flags are currently set by the same one-time encounter they are meant to precede.

### R5 — Medium: choices do not always deliver their advertised stakes

- `boar-charge` says one survivor is bruised but applies −8 health to every living character. The new cave's “small team” also has no actor/team selection and damages everyone on a rockfall. `applyOutcome` defaults to all living characters. This matters particularly to near-death characters who did not appear to take the risk.
- The coastal shortcut promises saved time but has the same transition and survival-tick cost as the safe path, with strictly worse immediate resources. Shoreline survey also duplicates the safe path with less morale. These are not meaningful time/risk choices as implemented.
- Shelter “keep supplies for the escape plan” stores no reserved material and grants no later material advantage. Bracing the shelter does not consume those supplies either.
- `crew-unified`, `storm-shelter`, `cave-disturbed`, and `coast-injured` are stored but have no later gameplay or scene-specific consumer found in the live path. `boar-distracted` is only checked at the same encounter or its presentation, not a later consequence. Remove unnecessary persistent flags or give them a defined payoff.
- Food and health have direct survival consequences; water and morale receive numeric changes but do not currently modify these campaign checks. Character skills likewise do not modify the new weighted outcomes. These are gaps against the wider brief, not proof that every new card requires a new subsystem.

First make existing copy and consequences truthful. Then prioritize one actor-specific encounter and one later callback over adding further mandatory votes. Full character skill formulas and a complete water economy should remain separately scoped work.

### R6 — Medium: the current timers do not support the intended discussion pace

The authored decision counts are correct for first-attempt group endings. Deterministic runs using every scheduled deadline produced:

| Path | Group decisions | Scheduled time to ending |
| --- | ---: | ---: |
| Successful signal with radio repair | 15 | 10:02 |
| Direct boat route, first group launch succeeds | 16 | 11:22 |
| Failed signal, first group boat launch succeeds | 20 | 13:42 |

These calculations include 82 seconds for intro/crash setup, 15-second votes, 20-second nonterminal reveals, and the relevant 15-second assignment/private deadlines. The direct boat sample also chose radio repair at first night; another first-night choice can shorten it by 15 seconds. These are server schedule calculations, not measured human play, and exclude lobby setup, ending reading, scheduler lag, and retries. Early submissions shorten them further. They show that 15 minutes is not just unmeasured: a normal successful route currently offers too little decision time to approach that target reliably.

Retain immediate resolution when everyone votes. Trial a longer voting deadline, measure reading/discussion separately from reveal waiting, and tune from people playing. Avoid adding compulsory scenes solely to increase duration. Also clarify narrative time: the current rule consumes a day's food every three decisions while the scene text often describes one morning; this is an abstraction that should be made consistent rather than advertised as realistic elapsed days.

### R7 — Medium: acceptance coverage is behind the implementation

`e2e/full-session.spec.ts` still loops over exactly ten decisions and then expects an ending. A surviving expanded campaign has not even reached project selection at that point. It also selects the first available option rather than specifying a route, so it cannot establish both routes or their endings.

The focused Worker tests pass, but their campaign-specific assertion establishes the shoreline start, not the entire new path. Replace the ten-decision contract with route-aware terminal-state coverage and a diagnostic safety bound. Exercise normal, failed-signal, solo, storm, all-dead, and reconnect cases with deterministic rules tests; use two real clients to validate synchronization and privacy.

## Verification and limits

- App and Worker `tsc --noEmit`: passed.
- `git diff --check`: passed for tracked changes. The initial campaign content file is untracked, so that command alone does not validate its whitespace.
- Focused Worker tests (`gameplay`, `motorboat`, `scheduler`): 22 passed across three files. The initial sandbox run could not open the local test port; the permitted retry passed.
- Existing shared/client/scene suite: 187 passed, four failed, four skipped; five failing files including one suite setup failure. Observed failures: character manifest/catalog disagree with query-suffixed Jorge/Maria asset URLs; assignment nomination selector is ambiguous; private transfer test still expects a combobox; UI Lab lacks a ResizeObserver test environment setup. These are current working-tree failures, not attributed to the campaign expansion.
- Review probes: six passed by reproducing current behavior, including five defect cases and three complete deterministic routes; one graph invariant failed, exposing dangling story-map edges. Passing reproduction probes do **not** mean the defects are fixed.
- Probe source and results: `output/campaign-review/audit.test.ts`, `audit-results.txt`, and `worker-results.txt`. Run with `./node_modules/.bin/vitest run --config output/campaign-review/vitest.config.ts --reporter=verbose`.
- No live multiplayer browser run or human duration study was performed in this review. No production gameplay code was changed.

## Recommended order

1. Protect successful endings from survival ticks.
2. Separate signal position from coastal knowledge and correct unsupported history.
3. Make costs, actors, and later consequences match the choices shown.
4. Repair map topology and align all three design documents.
5. Establish deterministic route coverage and real two-client acceptance.
6. Tune discussion time; only then consider optional branches or additional encounters.
