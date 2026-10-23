# Crash Rescue and Character Personality Design

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

## Purpose

Define the opening cooperative choice loop for Island of Extremely Questionable Judgment. This feature replaces the current passive crash intro with private player choices, simultaneous rescue attempts, character-specific behavior, and a shared dark-comedy outcome. It extends the existing server-authoritative game; it does not move gameplay decisions into the 3D renderer.

## Player Experience

1. Players select a character in the lobby as they do today. Each character has an authored profile: personality tags, strengths, flaws, preferred reactions, and joke pools. These profiles do not affect which items are offered.
2. The crash sequence plays. Characters are staged with contextual idle/reaction animations; this presentation is cosmetic and does not decide outcomes.
3. Each player independently receives three distinct items sampled uniformly at random from the same shared item catalog. The draw is not weighted by character, personality, player, or other players' draws; the same item may appear in different players' offers. Each player privately chooses one item for their own character. Item choice is simultaneous and private until the choice window closes.
4. Each player then privately chooses one living character to attempt to save. Self-rescue is permitted. Multiple players may select the same target.
5. Once all connected living players have submitted both choices, or the server deadline expires, the server resolves the entire batch in a deterministic order-independent way using authoritative random draws. Missing choices follow documented safe defaults; they never block the room.
6. The server publishes one shared crash report: once choices lock, it names the in-world rescuer and target characters, the selected items, outcomes, deaths, survivors, and ghosts. This reveal creates the funny social consequence (“Tony tried to save Daniel…”); pending choices remain private before lock-in.
7. Survivors and ghosts proceed into the existing ten-decision game. Ghost players remain eligible to vote as they do today.

## Character Profiles

Profiles are content data, not executable scripts. Each profile has a stable `characterId`, display name, short public personality summary, private/internal tags only if needed by rules, a small set of strengths and flaws, and joke/reaction pools. Profiles do not contain item-offer affinities. Avoid assigning a gameplay modifier to every personality trait; use only a small number of explicit mechanical traits so profiles remain understandable and balanceable.

Profile content should be centralized and validated like decision-card content. The server uses profile IDs and numeric modifiers only; it does not trust values supplied by a client. UI and animation systems may use personality/reaction tags for presentation but may not infer gameplay outcomes from animation state.

## Items

Items are catalog entries with stable IDs, display names, category, short flavor text, icon/model keys, and explicitly scoped rule effects. The initial catalog should include ordinary, comic, survival, and improvised/craftable objects. Character loadout offers are drawn from authored weights rather than arbitrary procedural item generation.

The initial design treats the chosen item as a carried inventory item that persists after the crash and may be referenced by later decisions. Items do not grant passive bonuses unless their catalog entry explicitly says so. The shared offer draw is uniform without replacement within each player's three choices, and with replacement between different players' offers. Craftable items are separate catalog entries with recipe requirements; crafting is unavailable until a later authored decision or feature enables it.

## Rescue Resolution

Every submitted rescue is an independent directed attempt from a living rescuer to a living target. A ghost cannot physically rescue someone. A rescue targeting a character who is already a ghost at resolution is invalid and receives a harmless authored failure result. Self-rescue is allowed.

All valid attempts in the batch resolve against the same pre-resolution snapshot. No attempt gets priority because of message arrival order. The resolver first calculates each attempt's success chance from a documented base chance plus narrowly scoped character/item modifiers, clamps it to a configured range, then samples each attempt from the server's injected random source. All attempt results are determined before any resulting deaths are applied. The server applies the outcome policy to the resulting attempt graph, so one mishap can affect both rescuer and target only when its authored result explicitly says so. Duplicate attempts are not automatically additive; policy for multiple successful rescuers targeting one person is to count the target as saved once, while every attempt may still produce its own authored complication.

The exact base odds, whether the UI shows approximate odds, whether chosen items alter odds, and how competing successful rescue attempts affect complications are balance decisions to confirm before implementation. Recommended defaults: hide exact percentages; show qualitative risk labels; chosen item affects only its authored attempt/item effect; each rescue attempt is sampled independently; target can be saved at most once; authored attempt complications can still affect their participants.

## Simultaneous Choice and Privacy

- Choices are accepted only during the server-owned crash-choice window and only once per player; a player may replace their own selection until lock-in.
- Clients submit intentions, never outcome probabilities or random seeds.
- Before lock-in, snapshots expose phase, absolute deadline, and only the viewer's own offer, selection, and submission status. Do not expose other players' pending selections, live totals, or item offer pools.
- At lock-in, resolve once, persist the result, and make duplicate/replayed commands idempotent.
- Disconnected players do not block resolution. Reconnecting players recover their identity; if the window remains open they may complete or change their own choices.
- A player whose character is already a ghost cannot submit a physical rescue. Ghosts remain eligible in the later group votes.

## Suggested State/Phase Shape

Extend the game flow to:

`lobby → crashIntro → crashItemChoice → crashRescueChoice → crashResolution → decision → reveal … → ending → expired`

The exact number of presentation phases may be collapsed in implementation, but the server must persist phase start/deadline, private submissions, and a committed resolution result. The scene reads server snapshots and plays the appropriate character animations; animation completion never advances the authoritative phase.

## Data and Module Boundaries

- `src/shared/content/characterProfiles.ts`: profile content and profile validation.
- `src/shared/content/items.ts`: item catalog, offer weights, and explicit effects.
- `src/shared/rules/crashRescue.ts`: pure offer generation, choice validation, probability calculation, and order-independent batch resolution behind injected randomness.
- `src/shared/domain.ts` and `src/shared/protocol.ts`: typed private state, public snapshot, commands, and schemas.
- `worker/game/GameRoom.ts` and `roomScheduler.ts`: authorize commands, own deadlines, persist choices/results, and broadcast viewer-specific snapshots.
- `src/game` and `src/scene`: render prompts, offer cards, rescue targets, report, and contextual animation only.
- Tests: pure seeded rule tests, protocol/privacy tests, Worker deadline/reconnect/idempotency tests, and multiplayer browser flow.

## Acceptance Criteria

- 2–8 players can complete the crash item and rescue stages without a client being authoritative.
- Every player receives a valid, private offer of three distinct items uniformly drawn from the shared item catalog; offers are not character-weighted and may overlap across players.
- Duplicate rescue targets are accepted and resolved in a single order-independent batch.
- Seeded tests cover self-rescue, duplicate rescue targets, missing submissions, invalid/ghost targets, rescuer/target complications, simultaneous deaths, and exact success-probability boundaries.
- Retries, reconnects, alarms, or Worker restarts cannot resolve a batch twice or change its outcome.
- No pending choice or item offer for another player is visible in public snapshots or logs.
- A death in the opening rescue stage immediately marks the character and player as a ghost, and that ghost can vote in the first group decision.
- The R3F scene's animation state does not affect rules, deadlines, odds, or persistence.

## Confirmed Defaults and Tuning

The chosen item persists for the rest of the session. The opening uses private item choice followed by private rescue choice. Self-rescue is allowed; ghosts cannot make physical rescue attempts; rescue risk is presented qualitatively rather than as a percentage; duplicate attempts resolve independently and may each cause a complication, while one target can only be saved once; and the existing ten group decisions follow the crash sequence. Character profiles do not affect the uniform shared item draw. Only explicit, limited character/item rule modifiers may alter rescue odds.

Provisional playtest tuning: every rescue attempt begins with a 60% success chance. A failed attempt causes no deaths 80% of the time; otherwise it eliminates the rescuer 10% of the time, the target 5%, or both 5%. These constants are implementation defaults for local playtesting, not locked product balance.

Remaining authoring choices: which characters, if any, receive mechanical rescue modifiers; and which items, if any, affect rescue odds or have a one-use effect. Until those choices are authored, character profiles influence narration only and starting items are persistent inventory/flavor only.

