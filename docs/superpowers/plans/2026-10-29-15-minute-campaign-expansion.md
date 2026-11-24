# Fifteen-Minute Playable Campaign Expansion

**Goal:** Expand the server-owned campaign so a typical complete run offers enough connected decisions and character moments to approach a 15-minute session.

**Architecture:** Add authored campaign nodes and outcomes in shared content. The server remains the only authority for node transitions, random outcomes, resources, flags, and endings. Add explicit persistent story flags only when later content reads them. Reuse the existing cinematic shell and incident images as temporary scene art.

**Starting baseline:** shoreline priority → first night → escape project → signal attempt / motorboat route. The story graph visualization had map-only representative cases; this plan adds server-playable content.

**Implementation status:** complete through content, routing, presentation mappings, `/decision-test`, and story map integration. App and Worker TypeScript checks pass. Full two-client runs and an observed session-duration measurement remain outstanding.

## Implemented playable sequence

After first night, add a connected island-survival arc:

1. Daybreak survey
2. Freshwater run
3. Wildlife at camp
4. Medical triage
5. Cave supply decision
6. Shelter reinforcement
7. Crew council
8. Storm warning
9. Escape project

The signal route gets signal preparation before the current signal attempt. The boat route gets a coastal expedition and hazard scene before the existing boat discovery, fuel, repair, and launch rules. Choices update resources and named story flags; subsequent prompts/options read those facts where useful. Branches may reconverge while preserving consequences.

## Implementation tasks

### 1. Extend authoritative campaign state
- Add the new node IDs and typed story-beat outcome effect.
- Add a bounded set of persistent story flags, expose them in the public campaign projection, and migrate older persisted rooms with an empty flag list.
- Keep current signal, boat, starvation, assignment, vote, and ending logic authoritative.

### 2. Author the new campaign decisions
- Add one decision factory per new story node with context-matched choices, weighted outcomes, and resource changes.
- Branch outcome text and later options from flags where it changes play; do not let random outcomes choose unrelated scenes.
- Route failed signal into the existing motorboat system and preserve all existing endings.

### 3. Integrate scene presentation and development tools
- Add contextual incident titles, descriptions, and current image mappings for each new card.
- Add cards to `/decision-test` and the story map with live prerequisites and successor edges.
- Keep image loading fallback behavior and avoid new image-generation dependencies.

### 4. Validate duration and route integrity
- [x] Count the authored group decisions: approximately 15 before signal rescue and 16 on the boat path, plus crash choices and boat-specific actions.
- [x] Preserve early resolution when all eligible players have voted; the current vote deadline remains a timeout for unfinished ballots.
- [x] Run app and Worker TypeScript checks.
- [ ] Play two-client runs through signal rescue and boat endings; observe the actual duration and adjust pacing after playtesting.

## Constraints

- Do not add a fixed turn limit or end a run based only on elapsed real time.
- Do not alter existing endings or motorboat third-miss semantics.
- No 3D sandbox work or minigames in this slice.
- Current authored tone (dark comedy with consequences) remains consistent.
- Keep all transitions reconstructible from persisted server state and public snapshots.
