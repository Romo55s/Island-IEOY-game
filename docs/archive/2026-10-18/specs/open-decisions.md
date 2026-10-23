# Island Decision Game Decision Record

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

All product choices below were confirmed by the user. The game title is **Island of Extremely Questionable Judgment**. These decisions are incorporated into the product specification and implementation plan.

## 1. Player and Character Assignment

**Confirmed:** each player chooses one available coworker character in the lobby; duplicate selections are blocked, and the host does not assign other people.

Alternative: assign characters randomly after everyone is ready. Host assignment is possible but adds control and conflict states to the lobby.

## 2. Player Names Versus Character Names

**Confirmed:** keep the entered player name separate from the character name and display roster entries as “Tony as Character Name.” This avoids assuming that the person playing must select their own likeness.

## 3. Vote Reveal

**Confirmed:** keep votes fully private while voting, then reveal anonymous option totals after resolution. Never reveal who voted for which option.

Alternative: reveal only the winning option and no totals.

## 4. Host Powers

**Confirmed:** the host can start the game and remove a player only while still in the lobby. There is no pause, forced vote, skipped consequence, or mid-game kick in the first release.

## 5. Joining After Start

**Confirmed:** reject new players after the game starts; only existing players with a valid resume token may return. Do not add spectators in the first release.

## 6. Scenario Structure

**Confirmed:** use the same ten authored cards in a shuffled order. Choices change resources, characters, event history, and the ending, but do not branch into a larger story graph in the first release.

## 7. Audio Scope

**Confirmed:** include one subtle ambient loop plus a small set of original or freely licensed crash, vote, consequence, fire, and ghost effects. Audio begins only after a user gesture and includes master/music/effects controls plus mute. Reduced motion does not automatically mute audio.

Alternatives: effects only, or no audio in the first release.

## 8. Language

**Confirmed:** ship the first release in English, but keep authored strings centralized so Spanish can be added later without changing components or protocol shapes.

Alternatives: Spanish-only or English/Spanish selection in the first release.

## 9. Browser and Device Baseline

**Confirmed:** support current Chrome, Edge, Firefox, and Safari on desktop plus current Chrome Android and Safari iOS, with adaptive visual quality. Desktop is the primary design and QA priority for the first release, while mobile remains fully playable. Treat a current mid-range phone as the mobile baseline; older/low-memory devices receive the safe renderer rather than richer effects.

If the group will play only on laptops, mobile can remain joinable and usable but receive a smaller QA matrix.

## 10. Reconnection Scope

**Confirmed:** support refresh and temporary disconnect while the tab remains in the same browser session. Closing the tab/browser ends that player's recoverable identity; do not support moving it to another device or recovering after browser session data is lost.

## 11. Character Assets and Consent

**Confirmed:** the initial test asset is the rigged `3d_assets/Daniel_model.glb`, and the user approves keeping it in GitHub. Reuse optimized cloned instances across all character slots during development, while preserving unique player/character names, UI accents, animation state, and ghost state. Additional characters can be added later through the same manifest and optimization pipeline.

The source and optimized derivative may be versioned in the repository. Remote deployment remains a separate explicit approval gate for the complete build.

## 12. Group-Specific Comedy

**Confirmed:** use a mixture of generic workplace-survival humor and approved coworker inside jokes. Add private jokes only after the user supplies or explicitly approves them, and maintain a “do not reference” list for sensitive topics, people, or events. Until that material is provided, the content deck uses generic humor only.

## 13. Crash Items and Rescue Choices

**Confirmed:** after the crash, every player receives three distinct items drawn uniformly from the same shared item pool. Offers are independent across players and may overlap; character profiles never weight the offers. Each player chooses one persistent item for their character, then privately chooses one character to attempt to save. Self-rescue is permitted, ghosts cannot physically rescue, duplicate rescue targets are valid, and all attempts resolve simultaneously. The crash report reveals named character attempts and outcomes after lock-in. The crash opening precedes and does not count as one of the ten group decisions.

Qualitative risk is shown instead of exact percentages. Initial rescue odds and mishap rates are provisional local-playtest tuning and may be adjusted. Initial items have inventory/flavor behavior only until an explicit item effect is authored.

