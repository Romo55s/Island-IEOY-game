# Motorboat v1 balance-evaluation proposal

Status: measurement proposal, updated 2026-10-22. The player-approved tension direction is now represented by the current authored launch table; this document still sets no CI gate and does not substitute for human playtests.

## What the current rules can measure

The route has explicit launch probabilities, fuel consumption, unique missed-opportunity tracking, recovery, and terminal storm logic. Those support deterministic rule checks and a narrow headless launch-policy simulation.

The route does **not** currently model character skills/traits in its resolver, player discussion, betrayal intent, comprehension, laughter, perceived fairness, or a full resource economy. A numerical result cannot answer whether the route is fun or whether a private choice feels fair; those are human-playtest questions.

## Current mathematical baseline (not a target)

For a launch-ready boat that keeps the same engine condition and tries every one of its three opportunities, the existing odds imply the following exact outcomes. These are calculations from the authored probability table, not simulation results and not a recommendation to retune.

| Fixed policy | Sturdy engine | Fragile engine |
| --- | ---: | ---: |
| Group launches at every opportunity: escape before third failure | 91.34% | 79.0% |
| Solo custodian launches at every opportunity: individual escape before third failure | 83.91% | 58.56% |
| Group launch: storm after the third failure | 8.66% | 21.0% |
| Solo launch: storm after the third failure | 16.09% | 41.44% |

The real route can change engine condition during recovery, and human groups may wait or choose differently, so these values are a narrow baseline only. They do establish the intended current ordering: a group launch is safer than a solo launch, and sturdy is safer than fragile.

## Proposed non-gating scenarios

| Scenario | Question | Measurable metric | Policy/model | Suggested trials | Status |
| --- | --- | --- | --- | ---: | --- |
| Rule determinism | Do the same seed and inputs create the same route result? | Exact event/result transcript match | Fixed initial state and command sequence | 1 per fixed scenario | Existing deterministic tests; gate only on correctness |
| Launch table audit | Do the displayed qualitative bands correspond to the authored internal odds? | Success chance by engine × mode × previous misses | Direct `launchChanceBps` table | Exact, no sampling needed | Existing unit coverage; report only |
| Immediate group launch | How often does a launch-ready group escape versus enter recovery/storm? | Group-escape, recovery, storm proportions; launches consumed | Always choose group launch | 10,000 seeds after a narrow runner exists | Provisional, non-gating |
| Immediate solo launch | How strongly does selfish departure trade safety for individual escape? | Solo escape, failed solo, storm proportions; stranded count | Custodian always chooses solo | 10,000 seeds after a narrow runner exists | Provisional, non-gating |
| Delay pressure | Is the three-miss pressure legible rather than an accidental instant loss? | Miss count at ending; recovery count; storm rate | Always wait/quiet when permitted | Exact state paths plus 10,000 seeds for launch failures | Provisional, non-gating |

## Deliberately not proposing yet

- Absolute success-rate bands. The intended escape difficulty has not been approved by the designer.
- Trait, item, food, water, morale, shelter, or player-count balance claims. The motorboat resolver does not yet read most of those systems, so a simulator would measure an unfinished model rather than the game.
- A bot policy called “optimal.” Group loyalty, betrayal, and discussion are the intended social game, not an objective function we have defined.
- CI gating on any sampled probability. Until a reviewed baseline and an owner-approved regression tolerance exist, reports must never affect pass/fail status.

## Human-playtest companion questions

Ask every group after a major route event:

1. What did you choose, what happened, and what could you have done differently?
2. Did you understand why the warning, injury, recovery, or ending occurred?
3. Did the private fuel/custodian moment feel suspenseful, unfair, confusing, or easy to ignore?
4. Where did the group have idle time, and where did they argue or laugh?

Record these observations separately from any simulation output. A passing simulator cannot establish clarity, drama, or fun.

## Direction recorded; next implementation step

The approved eight-player direction is **tense but fair**: group departure is meaningfully safer than solo departure, sturdy is safer than fragile, and every route keeps a credible storm branch. Next, build the smallest seeded launch-policy runner, commit a reviewable baseline, and report deltas without automatically changing it.
