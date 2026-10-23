# Island survival: current design brief

Version 4 — 2026-10-19, including the approved compulsory-assignment/refusal contract and first motorboat route. Earlier voluntary-assignment, numeric-risk-display, undecided-ending, and unbounded missed-escape proposals are superseded.

This is the current creative brief, not a blanket claim of implemented functionality. Section 1 records confirmed direction. Everything marked **proposed** requires agreement or playtesting. The reusable compulsory-assignment/refusal foundation and the first motorboat route are implemented; the [implementation status](README.md) describes what exists, while the [roadmap](ROADMAP.md) tracks what remains. The earlier audit remains historical evidence, not a newer creative instruction.

## 1. Confirmed direction

- Emotional goal: laugh at disasters while becoming attached to individual characters.
- Escape the island is the objective. Selfish choices, betrayal, helping others, and solo escape are legitimate parts of play; at least one escape counts as success, with individual outcomes distinguished.
- Players choose; characters perform the action in the background. No player-controlled movement or real-time combat is requested.
- Mostly group decisions, with individual opportunities that introduce secrecy and drama. Example: privately share or keep a useful discovery.
- Character skills, strengths, flaws, and personality affect gameplay and success probabilities, not just dialogue. Profiles can be invented provisionally and refined later.
- Items unlock actions, food is consumed, equipment can break, and players can feed or heal each other.
- Retain hunger, injury, shared supplies, water, morale, and shelter as meaningful systems.
- Unexpected chaos should be common. Early death is allowed; dead players still participate in group decisions.
- No fixed real-time session duration is specified; escape determines success. Boat escape and other alternatives should be developed.
- Directed cinematic camera, desktop first, dark humor. Phones are not the immediate priority.
- Death Road to Canada is a reference for character-driven situations and consequences, not a request to copy its action gameplay.
- First successful escape ends the entire session, even if only one character escapes. Fade to black, then tell what happened to escapees and the abandoned crew, including darkly comic later fates.
- In motorboat route v1, the third genuine missed escape opportunity triggers an authored storm-surge disaster that kills the remaining survivors and ends the run without an escape. Qualification, warning and idempotence rules are fixed in [Motorboat escape route v1](design/motorboat-route-v1.md).
- Group decisions can publicly force a living character into a task. Only that player receives a 15-second Accept / Try to refuse response; timeout accepts, refusal is attempted once, and a failed refusal forces the original task. The attempt and result become public after resolution. See [Compulsory assignment and refusal v1](design/assignment-refusal-v1.md).
- Living players and ghosts have equal group vote weight. The option with the most votes wins; ties are selected randomly between tied leaders; no votes means a random available answer. This interprets “majority” as most votes, not a requirement for more than half of all players.
- Show descriptive risk, not numerical success percentages. Probabilities still exist internally.
- Remove the fixed ten-decision limit. Build authored, connected paths toward endings rather than unrelated shuffled encounters. Detailed branch/pace architecture below is proposed.
- Typed-language interpretation is deferred. Authored choices and bounded actions are the first version.
- Target the actual group of approximately 14 players; current testing is with 8. This is a desired capacity, not a claim that the current implementation supports 14.
- The owner specified no additional humor boundaries. Use dark fictional game events; do not invent biographical claims about the real people represented by the cast. Existing asset/privacy constraints are unchanged.

The current code uses the motorboat route rather than a ten-card completion loop and still has eight-player limits. Voice/in-person setup remains unspecified. Three success categories, general resource rates, and later-route pressure remain proposals. The assignment/refusal behavior is implemented and proven by the cave and motorboat-repair encounters; the first motorboat route is implemented but still requires balance and human playtest acceptance.

## 2. Pitch and reference

**Working genre:** semi-cooperative, choice-driven survival party game with cinematic consequences and dark comedy.

Friends stranded on an island need one another's skills to survive and build an escape. Every helpful act can create a debt; every useful discovery can become a secret. The group chooses a plan, individual players decide how much to contribute, and the cast acts out the resulting success, humiliation, injury, or betrayal. Someone may escape without everyone else.

Death Road to Canada's publisher describes randomized encounters/personalities, trait-dependent interactive-fiction choices, and action combat. [Publisher-provided description on Nintendo](https://www.nintendo.com/us/store/products/death-road-to-canada-switch/).

**Design inference for this game:** borrow character-dependent choices, scarcity, varied situations, and memorable aftermath. Here, choosing who acts, which tools to risk, and whether to help must carry the agency that direct combat/movement would otherwise provide. Cinematics are feedback, not a substitute for a meaningful choice. No external game formulas or event scripts are being copied.

## 3. Proposed core loop

Situation → group plan → relevant personal commitments → cinematic resolution → persistent aftermath → new situation.

1. **Establish:** show the actual problem, location, involved characters, relevant resources, and known risks. Present eligible actions, not an arbitrary unrelated card.
2. **Choose:** group votes on the plan, such as hunt, distract, retreat, or spend food to avoid the bear. Assign a named living actor/helper when needed; group assignment can be compulsory.
3. **Respond:** ask only relevant players for individual decisions: accept the assignment, attempt refusal, lend a knife, use hidden bait, keep a discovery, or accept a personal opportunity. Avoid giving every player a separate prompt every round. A successful refusal follows the authored alternative branch rather than an endless series of reassignments.
4. **Resolve:** the server validates available resources and actors, applies skill/condition/tool modifiers, and resolves once. If a commitment changes the advertised plan materially, show the revised public risk/cost and reconfirm; do not silently execute a different plan.
5. **Perform:** camera establishes the actors, shows the action, then its consequence. Present public deltas and reactions; privately report secret outcomes to their owner.
6. **Remember:** injured actors remain injured, a broken knife is unusable, the bear may remain near camp, the repaired boat is visibly closer to ready. Those facts determine future choices.

**Camp decisions** provide repeatable agency between special encounters: food/water collection, rationing, rest, healing, sharing, and escape work. Use limited action opportunities and explicit in-game time costs; ordinary transfers must not each consume a whole day. Clocks for browser voting are separate from survival time. Short readiness-driven transitions are proposed, with server timeouts and safe defaults to prevent one disconnected player blocking everyone.

## 4. Proposed character and risk model

Keep three separate layers:

- **Skills:** Strength, Survival, Craft, Medicine, and Nerve (working names, 0–5). Choose relevant skills per action; do not roll every stat for every event.
- **Traits:** one useful specialization and one contextual flaw initially. Examples: improvised repairs, animal panic, reckless optimism. Traits can unlock options, alter costs, or change specific risks. They must not secretly override a player's decision to betray/help.
- **Condition:** hunger, thirst, injury, and morale. Conditions change with events and affect relevant actions; they are not permanent competence scores.

Illustrative success calculation, **not tuned or implemented**:

`chance = clamp(base + skill + tools + help + traits - condition penalties - hazards, 5%, 95%)`

For one repair: 30% base + 50 points from Craft 5 + 15 from tools + 10 from a helper − 20 from injury − 10 from storm = **75% success**. Another actor or situation can have a different base/modifier set. Routine safe actions such as handing someone food need no chance roll. Impossible actions are unavailable, not given a magical 5% chance.

**Confirmed display:** use descriptions such as Favorable, Uncertain, Risky, or Desperate, plus reasons such as “skilled mechanic; injured hand.” The exact labels/band thresholds are proposed and must consistently map to internal chances. Keep the numerical example above for designers/tests only. Warn about severe consequences separately: “Risky — may cause serious injury” describes both likelihood and stakes. A 75% internal success chance must not imply that the other 25% is automatically death. Design bounded success, costly-success, setback, and catastrophe outcomes. Unexpected complications can be frequent while lethal complications are reserved for explicitly dangerous situations.

Do not roll every possible mishap independently: five individually modest risks can make almost every action fail. Resolve one coherent outcome package, with conditional complication weights that can later be simulated. Seeded tests and replayable event records should verify probabilities and consequences.

Attachment comes from mechanical individuality and remembered deeds: who healed whom, who lost the knife, who rescued someone, who kept the last ration. Use those facts for future dialogue and ending epilogues. A numerical relationship meter is optional, not necessary for the first slice.

## 5. Proposed resource ownership

| System | Ownership and purpose | Available player responses |
| --- | --- | --- |
| Hunger / thirst | Personal condition; consumes available food/water over explicit game time | Eat/drink, share, ration, forage, collect/purify water |
| Injury / health | Personal; specific injuries affect appropriate actions | Treat, assist, rest, accept risk with the injured actor |
| Morale | Personal; influences nerve/cooperation-related actions, not every skill | Rest, successful aid, comforts, social choices |
| Shared supplies | Camp stock of food, water, medicine, materials and committed equipment; not another abstract score | Allocate, contribute, withdraw under agreed rules |
| Shelter | Shared built world state; capacity/condition protects rest and exposed supplies | Build, expand, repair, sacrifice materials needed elsewhere |
| Private inventory | Owned items, hidden discoveries, tool durability | Keep, disclose, lend, consume, give; theft rules still unconfirmed |

Show a shared stock summary plus each character's relevant condition, rather than eight permanent meters for every character. Public items and secret items need separate visibility. Current code's food stat must not silently become both a carried ration count and a hunger meter.

Transfers require sufficient stock and a living eligible recipient; no duplication or double spending when players act simultaneously. Consumption, borrowing/return, breakage, death drops, and disconnection must have explicit rules. Recommended first slice: free giving, no unrestricted stealing, and contextual betrayal opportunities authored as encounters. Sharing a rare item changes actual ownership/state; it is not a cosmetic dialogue choice.

## 6. Group votes and forced assignments

- **Confirmed:** group votes set the plan and can assign a living character against their wishes. The assigned player can try to refuse; refusal succeeds or fails probabilistically.
- **Confirmed:** one equal vote per player, including ghosts. Ghosts can outvote the living. Dead characters cannot perform physical assignments; equal voting does not confer physical agency.
- **Confirmed rule, precise interpretation:** the highest count of valid submitted votes wins, even without an absolute majority. For 8 players, 3–2–2 with one abstention chooses the option with 3. A 3–3–2 tie selects only between the two leaders. Zero votes selects from the currently eligible options, not disabled actions. Abstention is not a vote for a random option.
- **Proposed implementation contract:** draw uniformly once on the server from tied leading option IDs (or all eligible IDs for zero votes), store the selected result, and show the same short picker animation to everyone. Do not pick a random voter or reroll on reconnect. Ghost/living ballots have no different weights. If no option is eligible, use an authored fallback event rather than attempting a random draw from an empty set.
- **Confirmed private response:** only the assigned player sees Accept / Try to refuse, with a qualitative refusal risk and an explicit 15-second deadline. The compulsory assignment is public; after resolution the attempt and success/failure are public, while the private controls and numerical odds remain private.
- **Confirmed refusal resolution:** one attempt per assignment event; relevant Nerve/trait/condition modifiers affect it. Failure forces the original task. Success follows the encounter's explicit alternative, cost or canceled-plan consequence. Refusal and task checks are separate, and no recursive nomination loop occurs in v1.
- **Confirmed timeout:** no response by the server deadline accepts the existing assignment. Disconnection does not pause the timer or provide a free refusal. The full contract and edge cases are in [Compulsory assignment and refusal v1](design/assignment-refusal-v1.md).
- Forced assignment does not automatically authorize spending undisclosed private items. If a required tool is withheld or an actor becomes unavailable, the encounter's fallback/revised choice must be explicit; do not invent tools or assign a ghost. Exact shared-stock access and theft rules remain separate design decisions.
- Do not assign a mandatory traitor. Betrayal emerges from situational incentives: limited seats, an exclusive opportunity, fear, or scarce supplies.
- Give cooperation a real advantage: helpers improve odds, extra crew carry supplies, complementary skills unlock safer routes. Give selfishness a cost: fewer skills/support, smaller escape capacity, lost future aid. Neither choice should always dominate.
- A private discovery stays private until disclosed or discovered. The public camera must not show the hidden stash or label its owner. Other clients must not receive the secret in their snapshots; hiding a UI element is insufficient. Voice-chat disclosure by the player is their choice.
- End-of-run reveal of secrets is proposed for comedic payoff, rather than instant public accusations after every private choice.

## 7. Proposed escape projects and endings

Escape is a world-state project, not a resource average or a round count. Show known requirements, achieved milestones, missing pieces, risks, and capacity. Failed attempts can injure someone, damage equipment, or create a repair task; they should not automatically erase every prior achievement.

| Route | Example milestones | Main tradeoff / dramatic opportunity |
| --- | --- | --- |
| Repair a motorboat | Discover hull → repair engine/hull → acquire fuel → select passengers → launch | Craft and scarce fuel; early usable capacity can tempt someone to depart alone |
| Build a sailing raft | Collect wood/rope → build flotation → make sail/navigation aids → provision → launch | More material/time and weather exposure; ability to expand capacity |
| Signal a rescue vessel | Establish signal site → repair radio or prepare signal → confirm contact → reach pickup | Nerve/Survival and exposed terrain; public pickup requires coordination |

These are proposed alternatives, **not three required builds for the first milestone**. Start with the motorboat route and make group versus selfish departure work before adding the others. Never rely on repeatedly drawing one rare card to obtain a mandatory part. Offer repair, substitution, or another obtainable route. After setbacks, provide visible next steps. Reusable camp actions need changing conditions/cooldowns so the system does not replace ten repetitive cards with endless repetitive grinding.

**Confirmed session-ending rule:** first successful escape ends the run for everyone. Failed attempts continue play. A departure is one authoritative event with its actual passenger set; members of the same departure escape together, not in client-response order. A successful escape has precedence over later deadlines or terminal transitions, never a network-speed advantage.

For the first-success rule, three proposed success epilogues:

1. **Everyone made it:** every original player character escapes.
2. **Some made it:** at least two, but not all original characters escape.
3. **One made it:** exactly one escapes.

**Confirmed presentation:** fade the scene to black, then tell the escapees' and remaining crew's later fates. The owner wants dark comic possibilities such as starvation, infighting, and a stranded survivor turning to cannibalism. These are fictional post-session outcomes, not new interactive rounds.

**Proposed epilogue model:** freeze the actual end-of-play record, then choose compatible authored aftermath bundles using that record. Establish a coherent group fate before selecting individual lines. Mark later events as “In the weeks that followed…” so they are not confused with things players saw happen. A character already dead cannot become the later survivor; escapees cannot also die of starvation on the island; a cannibal survivor cannot coexist with a line claiming no one survived. Use separate island and escapee pools, name eligible characters, and record the chosen aftermath once so reconnect/replay never rerolls it. Existing food, shelter, injuries, betrayals and aid affect which bundles are plausible. Rich supplies must not instantly produce unexplained starvation; establish a later disaster or choose another aftermath. Randomness chooses among consistent stories, not unrelated contradictory jokes.

Proposed presentation order: escape report → coherent island aftermath → brief personalized callbacks → group summary. At 14 players use a compact roster/end-card view for quieter characters rather than 14 long mandatory cutscenes. Someone escaping alone after everyone else died is not automatically branded a traitor; motive and prior choices shape the copy. A **no survivors / failed expedition** result is confirmed for everyone dying before escape and for the motorboat route's third genuine miss. Three success categories remain a proposal, not the owner's final selection.

**Confirmed:** no ten-turn success condition. In motorboat route v1, the third genuine missed opportunity causes the warned lethal storm-surge ending. Everyone dying before anyone escapes produces a no-survivor failure, not a successful escape ending. This is not a hidden fixed-round or real-time death clock: only unique, actually available escape opportunities qualify. Pause/resume remains important if human sessions can be long; existing room persistence alone is not an accepted resume experience.

## 8. Proposed example sequence

**Discovery:** Samantha finds engine fuel near the wreck. Her private choices are disclose it, keep it, or give it to a selected survivor. In motorboat v1, an inventory plate establishes publicly that a spare fuel can existed, but the finder and current owner remain private unless it is shared or later revealed. The boat's known fuel requirement makes her choice meaningful without leaking ownership through the camera or snapshots.

**Pressure:** a bear is near the supplies. The group can distract it using food, attempt a trap, assign Tony to hunt, or retreat at a known cost. Tony gets his own accept/refuse attempt before an assigned hunt. His Strength helps one approach; Samantha's Survival helps another. Hunger, injuries, and the offered knife change the risks. If refusal fails and the hunt proceeds, failure might injure Tony and break the knife rather than kill a random uninvolved player. The public scene shows that specific action and aftermath.

**Payoff:** the repaired boat is usable. Under the motorboat v1 night-watch opportunity, its custodian may wake everyone for a group launch vote, leave alone, or—when privately holding the fuel—keep quiet and let the tide pass. Inventory ownership and actor position must make this opportunity possible; the event cannot invent possession of someone else's hidden fuel. Waiting is an explicit missed opportunity only after the route is genuinely launchable and the warning is shown.

These beats illustrate dependency, not a mandatory script every run. Change eligibility, actors, available tools, costs and consequences. Reuse acting sequences with different props/targets before commissioning an animation for every possible sentence.

## 9. Typed ideas: scope options

| Approach | What players can do | Scope and limitation |
| --- | --- | --- |
| Authored choices + text proposals | Type a suggestion to teammates; assemble executable plans from supported actions/targets/items | Recommended first version. Predictable rules and cinematics; text alone creates no new mechanic |
| Bounded language interpreter | Type “use the wreck door as a raft”; translate into a supported build action if the door is an eligible material | Later option. Needs ambiguity handling, validation, confirmation, latency/error fallback, and service cost if model-backed |
| Unrestricted AI referee | Propose any invention and have the game invent its rules, result, and staging | Much larger scope; inconsistent adjudication and unavailable animations/world mechanics are core risks |

**Confirmed scope:** typed-language interpretation comes later. Start with authored options and bounded supported actions. A **Propose a plan** interface using action + target + offered items is a later optional extension, not required for the first slice. Never let free text directly grant items, invent skills, bypass turn costs, reveal secrets, or declare escape. Unsupported ideas should say what the game can currently do and suggest the closest supported action, not falsely claim universal understanding. Rate-limit/restrict any future suggestion submission to the planning window so it cannot flood the vote.

If a language interpreter is later added, it may propose a structured action; the authoritative server still validates prerequisites, actors, permissions, costs and outcomes. Only confirmed valid actions run. It must receive only information its player is allowed to know. Timeouts fall back to normal choices. A cinematic action vocabulary (give, repair, consume, flee, signal, launch, etc.) is necessary regardless of whether text is AI-parsed.

## 10. Scope and next acceptance gate

This is a systems redesign, not a larger card pack. Keep the current React/R3F client and authoritative Cloudflare game server. First deliver one small playable story with a real item, relevant skill check, private choice, persistent world consequence, and boat departure. It should prove the full choice-to-visible-consequence loop, not all resource systems or every escape route at once. Retain all confirmed resources in the design; schedule their complete mechanics after the slice rather than labeling placeholders finished.

Proposed first acceptance checks:

- Two different choices produce different persistent states and visible actions in the same encounter.
- Changing the actor/tool/condition changes the internal chance and appropriate descriptive band/reasons correctly; numeric odds are not shown. A routine gift never fails randomly.
- The group can assign a task, only that actor receives the response prompt, and refusal success/failure/timeout each follows the declared branch exactly once.
- Equal ghost/living vote weights, highest-count wins, leading ties, zero votes, and no eligible options all have explicit test cases; reconnect never rerolls a picker result.
- A private discovery is absent from another client's data and public cinematic.
- A knife is consumed/damaged only once; invalid or simultaneous spends cannot duplicate it.
- A failed escape preserves explicit repairable state; a valid successful escape produces named passenger outcomes.
- Group success, solo departure, early death with ghost voting, and no-survivor failure are all representable.
- Actors are visible, one-shot actions replay correctly, and the cinematic agrees with the server report.
- A human group can explain the cause of a disaster and at least one alternative action afterward.
- Fade-to-black epilogues distinguish actual session facts from later authored fates and contain no resurrected dead characters or inconsistent island/escapee assignments.

Keep the work at design/roadmap level for this discussion. Next produce separately testable implementation plans for presentation repair, shared/private event rules, and the escape slice. Do not generate a speculative whole-game code plan or start implementation from unapproved defaults. The target group is 14, but first validate the existing eight-player format. Fourteen-player support requires room/protocol limits, enough selectable characters, cast staging, HUD/ballot capacity, parallel private prompts, and load/reconnect testing; it is not just increasing one constant.

## 11. Proposed authored story map and progression

The owner wants a controlled tree of situations in which choices cause future situations. Recommended implementation: an **authored branching story graph with persistent facts**, not a giant completely separate tree and not a random card director. Branches may rejoin at the same place while retaining injuries, belongings, damaged structures, secrets and prior deeds. Convergence does not erase consequences.

With three new independent branches at each of ten steps, a fully expanded tree has 59,049 terminal paths before accounting for the cast and inventory. Shared nodes make authored scope manageable while retaining choice-dependent variants. Only reconverge when the fiction and prerequisites support it; different routes still need distinct situations, not identical text with changed numbers.

Illustrative map, not an approved script:

```text
Crash / immediate rescue
├─ Salvage the wreck → discover damaged boat / repair materials
│  ├─ Repair engine → fuel search ──────────────┐
│  └─ Strip useful parts → raft construction ──┤
└─ Explore inland → ridge / radio equipment    │
   ├─ Restore signal → rescue contact          │
   └─ Bring tools back → boat repair ──────────┘

Each route: personal opportunities + survival complications
             ↓
Viable escape → passenger/loyalty decision → escape attempt
                  failure → bounded recovery or alternative route
                  success → fade to black + aftermath
```

Each situation needs: entry requirements; eligible actor slots; public options and qualitative risks; optional private responses; resource/time costs; outcome facts and presentation cues; explicit next-node conditions; and an unavailable-actor/item fallback. Use actor roles (assigned hunter, finder, injured friend), not hardcoded Daniel-only scripts. Named roles bind to eligible living characters and their real history.

**Proposed progression structure:** establish survival → discover/pursue a route → confront complications and loyalty → attempt escape. These are milestones, not fixed rounds. Supporting someone, refusing a task, or losing an item can change the path, cost, passengers, and climax.

**How to reach an ending without an arbitrary decision cap:**

- Major choices advance a project, consume explicit game time/resources, or cross a one-way narrative milestone. Waiting/resting is not a free infinite reset.
- Successful milestones remain achieved unless a named event damages them. There is always an understandable next step, not a rare random-card lottery.
- Recovery branches are finite or consume a non-renewable opportunity. Repeated failed repairs redirect to salvage/substitution or another route instead of retrying the same roll forever.
- Restrict optional detours and prevent cheap farming loops. Exhausted areas remain exhausted; completed personal discoveries do not regenerate.
- Route-specific pressure is visible and author-controlled. Motorboat v1 uses worsening seas, explicit safe-tide warnings and fuel consumed by attempted launches. Other routes may use announced departure windows or different established hazards; none may add an invisible unavoidable timer.
- When escape opportunities have been missed too often, an authored deadly crisis may end the run with the remaining survivors dying. This failure direction is confirmed; warn and establish its cause in the story rather than abruptly displaying a game-over counter. If no action is eligible earlier, provide a defined recovery/alternative or coherent terminal branch, not an empty choice screen.

**Confirmed motorboat missed-escape accounting:** count a unique opportunity only when the boat was launchable, fuel and a living passenger existed, its stable opportunity ID and warning were presented, and it ended through a failed launch, an explicit choice to wait, or the custodian deliberately leaving it unused. Preparation failures, invalid state, network errors and choosing another already viable route do not count. Persist opportunity IDs once across reconnects and route changes. The third genuine motorboat miss is terminal; full rules are in [Motorboat escape route v1](design/motorboat-route-v1.md).

**Confirmed motorboat escalation:** the first missed opportunity makes the seas visibly rougher and warns that two safe tides remain; the second damages camp and warns that the next tide is the last; the third resolves a storm surge that destroys the boat and camp and kills the remaining survivors. A successful escape takes precedence and cannot be overwritten. The deadly scene is a terminal consequence, not a fake final choice, and is followed by the confirmed fade-to-black no-survivor epilogue.

For structural validation, inspect reachable situations with their state guards, not just arrows on a picture. Every nonterminal state must have an eligible next action; every retry cycle must have a finite resource/budget or guaranteed exit. Verify paths with early deaths, hidden fuel, broken tools, repeated refusal, all ghosts voting against the survivor, and different crew sizes. Random success probabilities alone do not guarantee a run ends.

**Scope recommendation:** author one compact boat-route map first, with discovery, forced assignment/refusal, a meaningful private secret, recovery, launch, and aftermath. The earlier three-encounter slice remains a prototype of the loop, not a promise that the finished game has only three situations. Expand to longer authored routes after the full pattern is fun and coherent.

## 12. Resolved route defaults and remaining tuning

The major answers are recorded; do not ask them again. The compulsory assignment, private 15-second response, public resolved refusal, timeout acceptance, failed-refusal forced action, one-attempt limit and authored success fallback are fixed in [Compulsory assignment and refusal v1](design/assignment-refusal-v1.md).

Motorboat v1 fixes the qualifying missed-opportunity rules, warning beats, storm-surge terminal scene and threshold of three in [Motorboat escape route v1](design/motorboat-route-v1.md). These are approved design rules, not implementation claims.

Social setup (voice/in-person) can be confirmed when choosing discussion timers. Precise resource rates, risk bands, refusal modifiers, authored ending titles and provisional cast profiles can be proposed and playtested rather than asking the owner to supply all of them.
