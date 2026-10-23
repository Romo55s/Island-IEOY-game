# Compulsory assignment and refusal v1

Status: approved design contract. The reusable assignment/refusal foundation and one cave proving encounter were implemented and verified on 2026-10-19; motorboat-specific use remains pending.

## Purpose

Group choices may publicly assign a living character to perform a dangerous task. The assignment creates social pressure without removing all agency: the assigned player may accept or make one probabilistic refusal attempt. The task itself, if performed, resolves separately from the refusal.

## Player-facing sequence

1. The group selects a plan and nominates an eligible living character. Living players and ghosts retain equal vote weight.
2. When the ballot locks, every player sees the compulsory assignment: **“The crew assigned [Character] to [task].”**
3. Only the assigned player receives **Accept assignment** and **Try to refuse**. The prompt shows a qualitative refusal risk and the explicit default: **“No response in 15 seconds means you accept.”** Numerical odds remain hidden.
4. The response window lasts exactly 15 seconds of server time. The first valid response locks and resolves immediately; if no valid response arrives before the deadline, the server treats it as acceptance.
5. Accept, or no response at the deadline, proceeds to the assigned task. Timeout is acceptance, not a refusal attempt.
6. Try to refuse makes one server-owned refusal check. Relevant Nerve, traits, morale and condition may modify it.
7. On refusal success, the actor does not perform the task. The encounter follows its declared alternative, cost or canceled-plan consequence. It never opens an automatic nominate-someone-else loop.
8. On refusal failure, the original compulsory task proceeds with that actor. The later task check is a separate roll and may still succeed, produce a costly success, fail or cause a warned catastrophe.
9. After resolution, every player sees whether a refusal was attempted and whether it succeeded. The private controls and internal percentage are never published.

## Public and private information

Public before the response:

- selected plan;
- assigned character and task;
- response deadline;
- declared stakes of the task.

Private to the assigned player before resolution:

- Accept / Try to refuse controls;
- qualitative refusal risk and relevant reasons;
- a response control only while no valid response has been accepted.

Public after resolution:

- accepted, timed out to acceptance, refusal succeeded, refusal failed, or actor became unavailable and triggered the authored fallback;
- the authored alternative or the task that actually followed;
- actual actor, target, item use, injury/death and world/resource changes.

Do not publish numerical odds, pending response content or private inventory. A compulsory assignment does not authorize the group to spend an undisclosed item belonging to the actor.

## Authoring contract

Every assignable task must declare:

- eligible living actor rules and an unavailable-actor fallback;
- public task stakes and qualitative risk;
- refusal modifiers;
- exactly one refusal-success branch with a real alternative or cost;
- the original task branch used by accept, timeout and failed refusal;
- actor-specific success, costly-success, setback and any explicitly warned lethal outcome;
- presentation cues that show the assigned actor performing the actual resolved action.

An encounter is invalid if successful refusal can leave it with no eligible next action. Refusal success must not silently perform the same task under different prose.

## Resolution and persistence rules

- The server creates one stable assignment ID and one absolute response deadline.
- Only a connected command authenticated as the assigned player may set that response.
- The first valid response is finalized and persisted once; timeout and any refusal roll are also persisted once. Reconnect, duplicate commands and alarms cannot reroll them.
- Assignment, response result, actual task actor and subsequent task result are distinct fields in the resolved event.
- Refusal and task probabilities use separate random draws and event facts.
- Client animation completion never advances or changes authoritative state.
- If an assignment contains multiple ballot dimensions, such as plan and actor nomination, each uses the confirmed highest-count rule. Leading ties and zero-vote selection are drawn once from eligible values and persisted.

## Edge cases

- **Disconnected actor:** the timer continues. No response at 15 seconds accepts the task. Disconnecting is not a free refusal.
- **Reconnect during the window:** if no valid response was accepted yet, restore the same deadline and actor-only controls without exposing them to anyone else. An accepted response has already advanced to the public result.
- **Actor becomes dead or otherwise ineligible before task resolution:** do not make a ghost act. Use the authored unavailable-actor fallback; do not silently nominate a replacement.
- **No living eligible actor when voting opens:** hide or disable the plan and provide an authored alternative. Never draw from an empty candidate list.
- **Successful refusal:** apply the authored alternative once; never recursively reassign in v1.
- **Failed refusal:** force the original task once. Do not apply a generic extra injury merely for refusing; only declared encounter consequences apply.
- **Timeout:** record `timeout-accepted`, not `refusal-failed`.
- **Hidden tool:** the actor may use it only through a separate permitted commitment. Otherwise resolve without it or use the declared missing-tool fallback.
- **Duplicate or late response:** acknowledge idempotently or reject as closed; never resolve another refusal roll.
- **All characters dead:** skip assignment and enter the no-survivor ending.

## Acceptance criteria

- All clients see the same named compulsory assignment and absolute deadline.
- Only the assigned player's snapshot contains response controls; a valid response immediately resolves the phase and is then reported publicly as part of the consequence.
- Accept, timeout, refusal success, refusal failure and actor-unavailable fallback each follow their declared branch exactly once.
- The response window is 15 seconds; timeout produces acceptance even when the actor disconnected.
- A failed refusal uses the original actor and task; a successful refusal uses the authored fallback without another nomination loop.
- Refusal and task checks are separately recorded and replay deterministically after reconnect.
- Ghosts can vote and nominate but never appear in the eligible actor list.
- The consequence report and cinematic agree about who was assigned, whether they refused, what they actually did and what changed.
- Private items and numerical odds do not leak through public snapshots, logs or staging.

