# Motorboat escape route v1

Status: implemented prototype and design contract for the first three-node authored route, verified 2026-10-22. This is a prototype of the reusable story-graph pattern, not a claim that the finished game contains only three situations or that balancing/playtest acceptance is complete.

## Purpose and success rule

The route proves discovery, a private secret, public compulsory assignment, persistent repair state, selfish versus group departure, bounded recovery and a causal ending. The first successful launch ends the whole session. A departure is one authoritative event with an actual passenger set; network response order never decides who escaped.

```text
1. Boat discovery
   └─ private fuel decision
          ↓
2. Engine repair + compulsory assignment
   ├─ sturdy or fragile repair
   └─ successful refusal → costly emergency bypass
          ↓
3. Last good tide
   ├─ group launch succeeds → ending
   ├─ selfish launch succeeds → ending
   ├─ launch fails or opportunity expires
   │      └─ miss 1–2 → recovery variant of node 2
   └─ third genuine miss → terminal storm disaster
```

The three entries are reusable nodes. Recovery may revisit node 2 and then create a new node-3 opportunity without inventing an unrelated encounter.

## Authoritative state

The exact TypeScript shape may differ, but the server must represent these facts rather than infer them from prose:

```ts
interface MotorboatRouteState {
  node: "discovery" | "repair" | "launch" | "terminal" | "complete";
  discovered: boolean;
  hull: "sound" | "leaking";
  engine: "broken" | "sturdy" | "fragile";
  fuelCharges: 0 | 1 | 2 | 3;
  fuelVisibility: "shared" | "known-private";
  fuelOwnerCharacterId?: string; // server/private owner view only
  repairActorCharacterId?: string;
  activeOpportunityId?: string;
  missedOpportunityIds: string[];
  warningLevel: 0 | 1 | 2;
}
```

Ending state separately records `group-escape`, `solo-escape` or `no-survivors`, the exact escaped and stranded character IDs, and the factual cause. Later comic epilogue fates are selected compatibly and persisted separately.

Public state may say that somebody privately holds usable fuel. It must not expose the owner's ID. Fuel ownership, charges, engine/hull condition, opportunity IDs, miss records and ending results survive reconnect.

## Node 1 — The boat under the mangroves

Entry: crash resolution is complete and at least one character is alive.

Public group choices:

- **Haul it above the tide:** protects the hull; exertion can cost health.
- **Inspect it where it lies:** diagnoses the engine and improves the next careful repair.
- **Strip the wreck for parts first:** creates shared repair parts, but the delayed boat becomes leaky.

Every valid result sets `discovered = true`, `engine = broken` and establishes a sealed fuel can with three launch charges. The boat's inventory plate publicly establishes that a spare can existed, while a living finder and the can's current owner remain server-private unless someone discloses them. That finder privately chooses:

- share it with camp;
- hide it;
- give it privately to another living character.

The private discovery window uses a safe share-on-timeout default so absence cannot silently deadlock the route. Sharing publicly credits the finder. Hiding or private transfer leaves the group with only the inventory-plate evidence that usable fuel is in private hands; the finder and owner identities stay private until disclosure or the end-of-run secret reveal. If its owner dies, the fuel drops into shared camp inventory.

## Node 2 — Make it run

Entry: boat discovered, engine broken, at least one living eligible actor and fuel still exists somewhere.

Each group ballot submits a repair plan plus one eligible living actor nomination. Resolve the plan and actor tally independently with the confirmed highest-count, tied-leader and zero-vote rules. Ghost ballots have equal weight; ghosts never enter the actor candidate set.

Plans:

- **Careful patch:** requires publicly committed repair parts, knife or hatchet; Craft-focused and most likely to produce a sturdy engine.
- **Force the starter:** always available; Strength-focused, with higher injury and fragile-repair risk.
- **Sacrifice shelter braces:** available when the declared shelter cost can be paid; costs 15 shelter and lowers the skill requirement.

The selected assignment follows [Compulsory assignment and refusal v1](assignment-refusal-v1.md): it is public, the actor receives a 15-second private response, timeout accepts, and a failed refusal forces the original task.

Motorboat-specific refusal success uses one declared fallback: the actor is spared, the group tears 15 shelter from camp for an emergency pull-start, and the engine becomes fragile but launchable. It never opens another nomination.

Repair outcome packages:

- **Success:** engine becomes sturdy.
- **Costly success:** engine becomes sturdy; a committed item loses durability or the actor receives a recorded injury.
- **Setback:** engine becomes fragile; apply the declared actor injury/morale loss.
- **Warned catastrophe:** only for a plan labeled as potentially lethal; the assigned actor dies and the emergency result remains fragile but launchable.

No outcome may leave the route permanently broken. When ordinary materials are gone, Force the starter remains the bounded fallback.

## Node 3 — Last good tide

Entry requires a sturdy or fragile engine, at least one fuel charge, at least one living character, and no already-resolved escape.

The server creates and stores one new opportunity ID. If fuel is privately held, its living owner is the night custodian. Otherwise the living repair actor is custodian, with a deterministic eligible fallback if that actor died. Everyone sees the custodian role; private fuel ownership remains hidden unless the resulting action reveals it.

The custodian privately chooses:

- **Wake the group** — default on timeout.
- **Leave alone now.**
- **Keep quiet and let the tide pass** — available only to a private fuel holder; records a deliberate missed opportunity without revealing the holder.

Leaving alone immediately attempts a solo launch. Waking the group opens a public vote:

- **Launch together now.**
- **Wait for a better tide.**

This route spec was first authored for an eight-player prototype. The live roster now supports up to 16 players; group launch and passenger results include all living characters. Validate readability and load for a full 16-player run before claiming large-group acceptance.

Approved tense-but-fair internal launch chances. Follow-up playtests can still retune them:

| Boat state | Group launch | Solo launch |
| --- | ---: | ---: |
| Sturdy | 65% | 55% |
| Fragile | 50% | 35% |

Subtract 10 percentage points per prior genuine miss, then apply any approved relevant condition modifiers. Players see only a qualitative risk and its reasons. Cooperation is safer because crew can navigate, bail and stabilize the boat.

An attempted launch consumes one fuel charge. A successful launch stores its exact passenger set and immediately wins ordering priority over later deadlines or disasters. A failed launch beaches the boat, applies one coherent passenger-specific injury/damage package, and records the current opportunity as missed. Misses one and two return to a recovery variant of node 2; the recovery always retains an obtainable fallback.

## Genuine missed-escape accounting

The threshold is exactly **three** genuine missed opportunities for motorboat v1.

Count an opportunity only when all of these were true:

1. the boat was launchable;
2. at least one fuel charge existed;
3. at least one living character could depart;
4. a stable opportunity ID and warning were shown to the relevant player or group; and
5. that opportunity ended through a failed launch, an explicit group choice to wait, or the custodian deliberately leaving the valid opportunity unused.

Store each missed opportunity ID once. Duplicate commands, reconnect and repeated presentation cannot increment it again. Switching routes later does not erase recorded misses.

Do not count discovery or repair failures, successful refusal during preparation, missing prerequisites, invalid actors, empty eligible-option sets, server/network failure, or events after a successful escape. Choosing another already viable escape route is not automatically a motorboat miss.

## Escalation and terminal disaster

- **Before any miss:** “The tide is usable. Dark weather is forming offshore.”
- **After miss one:** visibly rougher water; “One safe tide is gone. Two remain.” Set warning level 1.
- **After miss two:** heavy surf and camp damage; “This is the last safe tide. The storm surge arrives before another.” Set warning level 2.
- **On miss three:** no fake final choice. Resolve one terminal storm-surge event that destroys the motorboat and camp, changes every remaining living character to ghost with the recorded storm-surge cause, and enters the no-survivor ending.

The terminal scene follows the same fade-to-black treatment as a successful escape. The later epilogue preserves prior deaths and deeds. Dark-comedy copy may note that the empty motorboat was recovered later in suspiciously excellent condition, but it cannot resurrect or escape a stranded character.

## Endings

- **Group escape:** every living passenger in the departure escapes. Characters who died earlier remain dead, so this can still be a “some original characters made it” epilogue.
- **Solo escape:** only the selfish custodian escapes; the successful launch ends the session and the remaining crew receive a compatible stranded-group aftermath.
- **No survivors:** everyone dies before escape, or the third genuine miss triggers the storm surge.

Resolve and persist factual escape results before selecting comic aftermath bundles. A character cannot be dead, escaped and stranded at the same time. Reconnect never rerolls an epilogue.

## Edge cases and invariants

- Successful escape has precedence over a simultaneous alarm or terminal transition.
- All-dead state ends immediately; do not open another assignment or opportunity.
- A dead fuel owner drops fuel into shared inventory; a ghost cannot remain a private physical custodian.
- A disconnected custodian keeps the same deadline; timeout wakes the group rather than choosing betrayal.
- No vote selects once from currently eligible choices. Leading ties select once only among tied leaders.
- Items, fuel, health and shelter cannot be spent twice by simultaneous or repeated commands.
- Failed launch consequences target actual passengers, never an uninvolved random character.
- Private fuel ownership never leaks through another viewer's snapshot, activity log or cinematic staging.
- Every recovery state has an eligible repair action; no path waits for a rare random card.
- All picker, refusal, repair, launch, miss, passenger and ending results are server-owned, persisted and replay-safe.
- The scene shows the actual custodian/repair actor and boat state; client animation never determines the result.

## Acceptance criteria

- Two node-1 choices create different persistent hull/tool or repair conditions.
- Share, hide, transfer and timeout preserve the declared public/private boundaries.
- Node 2 exercises accept, timeout, refusal success and forced action after failed refusal exactly once.
- Sturdy versus fragile repair changes the displayed launch risk and stored outcome chances.
- Group and solo success end the whole session with the correct passenger and stranded sets.
- A failed launch and an explicit wait each count their opportunity exactly once; preparation failure does not count.
- Miss one and miss two produce their warning/recovery states. Miss three produces the storm terminal event with no additional vote.
- Early death, dead fuel owner, all ghosts, actor/custodian disconnect, tied/no votes and reconnect all have deterministic tests.
- A human can state which opportunity was missed, why it counted, what worsened, and what could have been chosen instead.

