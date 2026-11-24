# Team feedback features — design v1

Status: implemented locally, verified 2026-11-23. The user authorized implementation after the 2026-11-12 plan. Numerical defaults remain unvalidated tuning. See [implementation evidence and limits](../qa/team-feedback.md). The foundation paragraph below records the pre-change baseline.

## Goal and current foundation

Make the crew's questionable judgment playable: Jim encourages reckless plans, Tony can respond to him, a bear encounter supports the named tools, severe hunger creates group and individual cannibalism choices, the starting item pool gains absurd objects, and Courtney's authored speech includes a light stutter.

Current source inspection confirms: Jim has sarcastic workplace dialogue; Courtney has a patient fishing-oriented profile; the starting pool has 17 items and private three-item offers; starvation consumes 10 food on a daily tick and costs 20 health if food was already zero. Campaign time currently advances one day per three ordinary decisions. Cannibalism appears only in character jokes. The bear currently wanders in the scene; the authored wildlife encounter is a boar. Private choices currently support fuel discovery and the launch custodian only.

## Global constraints

- The server validates choices, draws outcomes once, persists results, and projects viewer-specific snapshots.
- One equal group vote per player, including ghosts; highest count wins, with random leading ties and random eligible no-vote choices, matching the current game rules.
- Only living characters perform physical actions or become targets. Death preserves ghost voting.
- Show descriptive risk in player UI; percentages in this document and development previews are internal tuning. The feedback requests chances of success, which does not require changing the existing descriptive-risk policy.
- Dialogue never submits a player's action, changes odds, grants a tool, or reveals a private choice.
- Use existing dark survival-comedy art and report UI. Cannibalism outcomes are explicit in text but visually non-graphic; no new gore assets are needed.
- Starting-item offers remain private, contain three distinct choices, and use the same pool for every player.
- No additional production dependencies or generative dialogue service.
- Existing rooms without the new optional state fields load with neutral defaults. Successful escape and no-survivor endings take priority over queued encounters.

## 1. Jim, Tony, and Courtney

Jim becomes an inventive, sarcastic instigator whose suggestions are entertainingly overconfident. Add general lines for risky repair, exploration, food, and wildlife choices, plus at least four Jim/Tony exchanges. Keep his concerned response to a fresh death or serious injury.

Example bear opening, only when both living characters and the named tool are present:

> Jim: “Hey Tony, you've got an improvised bow. I think we're about to solve dinner.”
> Tony: “You keep saying ‘we’ while pointing at me.”

Knife variant:

> Jim: “Tony, you've got a knife. The bear hasn't even brought cutlery.”
> Tony: “Your confidence is doing a lot of work here.”

Do not substitute another speaker into these named exchanges when Jim or Tony is absent. Generic Jim lines can run with other crew members. Dialogue selection must know actual public encounter/tool context; inventory facts do not come from text matching. Cap named instigator exchanges at one per encounter and avoid repeating the same exchange within the last three saved opening exchanges.

Interpret the owner's final note as permission for Courtney's character to stutter. Keep his fishing knowledge and patient voice. Author occasional brief repetitions or pauses in approximately one third of his lines, rather than mechanically altering every word. Example: “I—I can try the shallows. Let's check the current first.” No odds penalty, timer penalty, intelligence change, mockery reaction, or extra mechanic is attached to this speech trait.

## 2. Bear encounter

Retain the boar encounter and insert one authored bear encounter after cave exploration, before shelter reinforcement. The party encounters a bear near supplies on its return toward camp. It happens once per campaign and does not depend on Jim/Tony being selected.

| Action | Eligibility | Proposed outcome package |
| --- | --- | --- |
| Retreat | Always | Everyone returns; each living character loses 4 food; bear remains alive |
| Distract with supplies | Each living character has at least 5 food | Each loses 5 food; everyone passes safely; bear remains alive |
| Hunt with improvised bow | A living owner of that item exists | 35% success; 45% hunter injured for 20 HP; 20% hunter dies |
| Attack with hunting knife | A living owner of that item exists | 15% success; 55% hunter injured for 30 HP; 30% hunter dies |

On successful hunt, eliminate the bear and grant each living character 12 food and 2 morale, clamped to resource limits. Failed injury can itself cause the hunter's death if HP reaches zero. Persist the precise result; never injure an unrelated crew member. Record bear alive/dead so its scene representation and later dialogue agree.

The group selects an eligible hunter who owns the selected tool. Reuse the existing assignment response: Accept / Try to refuse; 15-second deadline; timeout accepts. Proposed refusal success is 50%; successful refusal takes the retreat outcome, failed refusal resolves the chosen hunt. Group assignment is compulsory under existing game rules. This slice does not allow borrowing an absent or privately withheld item. Improvised bow and knife are the two supported attack approaches in v1; other weapons can remain in the catalog without claiming to unlock a bear action.

## 3. More starting items

Add these eight equally eligible items to the existing shared pool:

| ID | Display name | Category | Flavor text |
| --- | --- | --- | --- |
| popcorn-basket | Popcorn basket | food | Dinner and a front-row seat to everyone else's decisions. |
| polo-shirt | Polo shirt | keepsake | Business casual has survived the crash. |
| golf-club | Golf club | improvised | The island has hazards, but no scorecard. |
| rubber-duck | Rubber duck | keepsake | An experienced debugger with no survival advice. |
| frying-pan | Frying pan | tool | Suitable for dinner, provided dinner cooperates. |
| office-stapler | Office stapler | improvised | The last surviving member of office administration. |
| beach-umbrella | Beach umbrella | survival | Shade with a dangerously optimistic weather rating. |
| novelty-mug | Novelty mug | keepsake | World's Best Survivor remains an unverified claim. |

Interpret “golf bat” as golf club. Use category fallback visuals initially (`assetKey: null`); do not invent missing model files. Preserve existing crash-rescue effects and describe these new items as starting objects, without promising unimplemented special powers. In this first slice the popcorn basket is flavor inventory, consistent with the existing apple; consumable food/inventory depletion is a separate system and is not silently added here.

## 4. Hunger opportunities and time

Introduce a persisted survival day counter and opportunity bookkeeping. Increment the day only when an actual normal daily food tick runs. Additional vote, response, reveal, and private-choice phases do not consume another day or advance `decisionsSinceFoodTick`.

At a safe route boundary, after the previous reveal, offer a group hunger crisis when at least half the living crew (rounded up) have zero food and at least two characters are alive. Hunger is the cause; never offer it to a well-fed crew. Available camp boundaries are upcoming first-night, daybreak, shelter-reinforcement, crew-council, storm-warning, and escape-project nodes, or motorboat repair at the cove. Present an explicit camp/rest beat before nighttime choices. No prompt appears during an active vote, assignment, launch window, private fuel choice, or ending.

Proposed pacing limits: one crisis per survival day; at least one normal decision between crises; maximum two group crises and two nighttime offers per session. Queue a due nighttime check until an eligible camp boundary; persist and consume the check even when it produces no offer. Existing room migration starts from the current boundary without replaying earlier days.

A group crisis is guaranteed when eligible and below the limits. A nighttime opportunity is drawn once per eligible night if someone has zero food: 35% when fewer than half are starving, 65% when at least half are starving, 85% when all are starving. Pick one living starving actor uniformly from sorted eligible IDs; avoid the previous actor when another is eligible. The actor decides whether to attempt anything. Hunger changes opportunity frequency, not the attack outcome probabilities. Skip nighttime offers on a day when the group chose to attempt cannibalism.

Normal food levels may mean these events are rare on a successful route. Do not reduce starting food or increase starvation damage merely to force their appearance. Development fixtures must demonstrate the hunger branches; human playtests determine whether their natural frequency needs adjustment.

## 5. Group cannibalism

The crisis offers “Search for food” and “Choose someone to eat.” Search succeeds 65% of the time, giving each living character 8 food; otherwise it yields no food and costs each living character 2 morale. It is a meaningful alternative to betrayal.

The second option requires an explicit living target nomination. Store target nominations separately from task assignments: a victim is not an assigned worker. Votes without a valid target for this option are rejected. Resolve the option using existing equal vote rules, then select the most nominated target among voters for that winning option, with one server draw for a tie. If no one votes, the existing no-vote random rule may pick this option and then a random living target; make this consequence explicit in the prompt. This deliberately retains existing voting behavior, rather than silently changing abstention rules for this feature.

| Outcome | Probability | Exact effects |
| --- | --- | --- |
| Group succeeds | 45% | Named target dies/becomes a ghost; other living members gain 25 food and lose 15 morale |
| Target fights free | 35% | Target survives, loses up to 10 HP with a floor of 1; all living members lose 8 morale; no food |
| Group backs down | 20% | Everyone survives; all living members lose 5 morale; no food |

There is one outcome roll, not an extra independent roll per crew member. The target's resistance is represented by the outcome package, with no extra assignment/acceptance stage. The report names the target, what happened, the food result, and actual clamped health/morale changes. A failed group attempt is still recorded as an attempt. If the target is invalid at resolution, cancel the attempt without a replacement target or reward and resume the route.

## 6. Individual nighttime attempt

The selected hungry actor alone sees “Sleep” and “Try to eat someone,” with a living target picker excluding themselves. They have 15 seconds; timeout or disconnection defaults to Sleep. Other players see a generic camp-night waiting state, without the actor, target, option list, or response. Ghosts cannot receive or submit this private action.

| Attempt outcome | Probability | Exact effects |
| --- | --- | --- |
| Success | 20% | Target dies/becomes a ghost; actor gains 35 food and loses 10 morale; other living members lose 15 morale |
| Target catches and knocks out actor | 50% | Actor loses 15 HP and 10 morale; target survives; no food |
| Attempt fails and actor backs out | 30% | Actor loses 10 morale; everyone survives; no food |

The knockout can kill an already critically injured actor; show that actual death instead of claiming they merely sleep. “Knocked out” is report/animation language, not a new persistent incapacitation status. On every attempted outcome, reveal actor and target by name publicly, including failure and regret. Example: “Jim tried to eat Tony while he slept. Tony woke up and knocked Jim out. Jim lost 15 health.” Sleep reveals no attempted action or private actor identity. Revalidate both living participants immediately before resolving; invalid targets cancel without damage, reward, or retargeting.

## Acceptance and unresolved tuning

Every branch must be reachable in development previews and have reproducible server fixtures. Check two living players plus ghosts, a lone survivor, all-dead, full roster, reconnect during each private phase, expired/duplicate submissions, restart before and after resolution, and both escape routes. Verify no extra day tick, no duplicate resource reward, no target leakage before reveal, and no stale pending action after an ending.

Proposed odds, rewards, frequency caps, and the extra bear beat are concrete defaults for review. They have not been balance-simulated or human-playtested; deterministic rule and browser verification is recorded in the QA report. Measure encounter frequency, added session duration, cooperation versus betrayal outcomes, deaths, and whether failed attempts produce understandable stories. Courtney's occasional stutter and the eight new object choices are proposed authored content based on the owner's feedback.
