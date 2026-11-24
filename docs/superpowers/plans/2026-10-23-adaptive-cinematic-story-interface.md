# BLACK-BOX Adaptive Cinematic Story Interface Implementation Plan

> **For agentic workers:** This plan is being executed inline in this session, as explicitly requested by the user. Tasks use checkbox tracking.

**Goal:** Replace the stacked story gameplay presentation with a responsive, phase-adaptive cinematic shell while preserving authoritative story, vote, multiplayer, and survival state.

**Architecture:** Keep `GameSessionScreen` as the sole consumer of the authoritative `PublicGameSnapshot` and command API. Refactor `StoryIncidentRoom` into the fixed-height HUD/sidebar/stage presentation, then render the existing phase components inside it. Derive waiting, report, context, and ending surfaces only from public snapshot fields; do not add a second game state or protocol feature.

**Tech Stack:** React, TypeScript, CSS Modules, Zustand snapshot store, Playwright CLI / existing Playwright e2e suite.

**Spec:** User-provided BLACK-BOX Adaptive Cinematic Story Interface brief; canonical visual contract `docs/design/black-box-design-system-v2.json`; visual reference `/Users/tonyromo55/Downloads/Black Box Island Survival UI.png`.

## Global Constraints

- Preserve all existing story nodes, branching, timer resolution, fallback choices, randomized consequences, connection/reconnect behavior, radio thoughts, and multiplayer synchronization.
- Do not change backend endpoints, command schemas, or game mechanics.
- Use a fixed `100dvh` gameplay shell with responsive CSS Grid and no ordinary document-level gameplay scrolling.
- Use the v2 palette and PS1 survival-horror material language; parchment is reserved for reports.
- Show each player's group ballot during an active decision; keep aggregate results and consequences authoritative and reveal them only after resolution.
- Keep personal selfish responses private to their actor; these use the separate private-choice flow and never enter the public live-ballot list.
- Do not show motorboat facts until the existing public snapshot indicates the route is discoverable.
- Preserve keyboard operation, visible focus, reduced-motion behavior, 44px minimum touch targets, and safe-area insets.
- The current protocol contains no player chat send command; keep radio as the existing live character-thought feed and do not fabricate chat functionality.

## Design Direction

- **Color:** `#0B0E13` black-box surround, `#393731` worn metal, `#111317` inset, `#746B5D` metal edge, `#E8E0C9` readable bone text, `#D6AD32` amber selection, `#B4312C` danger/report stamp, `#6DAFA2` connection accent, `#D5C5A8` aged report paper.
- **Type:** Silkscreen only for short instrument labels and headings; IBM Plex Mono for readable narration, dialogue, values, and controls.
- **Layout:** Desktop: `HUD` above a `244px sidebar | flexible story stage`; decision stage splits scene and choices near `62/38`; non-decision states center one scene with its current report/narration. Mobile: compact HUD, collapsible manifest, fixed radio dock with expandable scrollable feed, vertically scrollable story stage.
- **Principles:** The crash-site illustration is the focal point; the black-box HUD is instrumentation; radio thoughts remain in a fixed crew channel; choices appear only when the server phase allows them; reports become the paper artifact.

ASCII structure:

```text
DESKTOP
┌──────────────────────────────────────────────────────────────────────┐
│ Flight ID | live resources                         link | code | pause│
├──────────────────────┬───────────────────────────────────────────────┤
│ Manifest             │ Scene art (16:9)          │ Phase panel       │
│                      │ title / narration        │ vote or response  │
│ Crew radio           │                           │                   │
└──────────────────────┴───────────────────────────────────────────────┘

MOBILE
┌─────────────────────────────────┐
│ compact HUD + resources          │
│ manifest disclosure              │
│ cinematic scene (16:9)           │
│ active phase panel / report      │
│ fixed Crew Radio dock            │
└─────────────────────────────────┘
```

Review against the brief: a full 3D canvas overlay or always-expanded roster would undermine the requested story-first hierarchy. The design therefore keeps the existing illustrated scene as the visual anchor, reserves choices for active phases, and keeps radio accessible without allocating a second large desktop rail.

## Existing Files and Responsibilities

- `src/game/screens/GameSessionScreen.tsx`: authoritative snapshot mapping, current commands, top HUD data, pause state.
- `src/game/screens/GameSessionScreen.module.css`: gameplay shell sizing, responsive HUD and modal.
- `src/game/screens/StoryIncidentRoom.tsx`: scene, crew roster, radio thoughts, phase composition.
- `src/game/screens/StoryIncidentRoom.module.css`: scene/stage/sidebar layout and breakpoints.
- `src/game/story/incidentPresentation.ts`: phase/story-to-illustration and context copy mapping.
- `src/ui/organisms/DecisionConsole.tsx`: current option rendering and vote timer.
- `src/ui/organisms/ConsequencePanel.tsx`: authoritative report text, vote totals, and resource changes.
- `src/ui/organisms/LobbyRoster.tsx`, `src/ui/molecules/PlayerRow.tsx`: connected/alive/ghost/disconnected manifest.
- `src/ui/organisms/EndingSummary.tsx`: existing ending semantics and survivor disposition.
- `tests/client/`: phase, snapshot, report, ending component coverage.
- `e2e/full-session.spec.ts`, `e2e/crash-choice.spec.ts`, `e2e/motorboat-escape.spec.ts`: browser flows and ending coverage.

## Tasks

### Task 1: Build the fixed gameplay shell and persistent crew sidebar

**Files:** Modify `src/game/screens/GameSessionScreen.tsx`, `src/game/screens/GameSessionScreen.module.css`, `src/game/screens/StoryIncidentRoom.tsx`, and `src/game/screens/StoryIncidentRoom.module.css`.

- [x] Put gameplay HUD and content into a single `100dvh` grid; keep current live resources, connection status, boarding code, and pause action.
- [x] Render manifest and existing crew thoughts in a permanent desktop sidebar; make roster and radio histories locally scrollable.
- [x] Remove gameplay dependence on the hidden manifest toggle; retain existing motorboat disclosure only when current state permits it.
- [x] Keep `/sandbox` separate; do not mount or expand 3D gameplay in the new shell.

### Task 2: Adapt the main stage to authoritative phases

**Files:** Modify `src/game/screens/GameSessionScreen.tsx`, `src/game/screens/StoryIncidentRoom.tsx`, `src/game/story/incidentPresentation.ts`, and add a focused waiting-state component/style under `src/ui/organisms/` if needed.

- [x] Preserve current phase components and command handlers; use phase to select narrative, active decision, waiting, report, or ending presentation.
- [x] Keep decision controls available after a vote so a player can change it until the last connected player votes; show public group ballots while the decision is open.
- [x] Keep crash choices, private choices, assignments, and reports bound to their existing public/viewer-specific snapshot fields.
- [x] Show a cinematic ending within the story stage with the existing title, disposition, epilogue, and Return to Shore action.
- [x] Use a graceful local fallback when scene art fails; preserve source aspect ratio and never stretch image content.

### Task 3: Responsive and accessible treatment

**Files:** Modify the two gameplay CSS modules and add/update component tests.

- [x] At desktop, use a 220–260px sidebar and a readable scene/decision split; at tablet, use a narrower persistent sidebar; at mobile, collapse the roster and keep a labeled Crew Radio dock continuously available.
- [x] Keep reports and long choice lists internally scrollable, avoid horizontal overflow, and honor safe-area padding.
- [x] Add visible focus, semantic labels/states, keyboard number shortcuts only where existing code supports them, and reduced-motion transitions capped at 150–350ms.
- [x] Preserve high contrast and readable body text without CRT scanline interference.

### Task 4: Verify behavior and layout

**Files:** Existing component and e2e tests; screenshot output in `output/playwright/adaptive-cinematic-ui/`.

- [x] Run `npm run typecheck`, client/worker suites, and Playwright e2e coverage.
- [x] Browser-check two clients through crash/rescue, shoreline, first-night, failed signal to motorboat route, report, and group-escape ending; separately validate the two motorboat ending fixtures.
- [x] Check public group ballots, private-choice privacy, immediate resolution after all connected votes, reconnect/reload, report readability, radio drawer, keyboard-number submission, desktop, and mobile below 768px.
- [x] Capture and visually inspect representative screenshots for crash choices, voting, waiting, reports, mobile radio, and ending states.

## Acceptance Review

- The scene is the primary visual during narration; voting switches to a cinematic split.
- The resource/connection/code/pause HUD stays consistent in active phases.
- The manifest and radio remain accessible, with radio visible on mobile.
- Group decisions show each submitted vote in real time; selfish private-choice responses remain actor-only, and all options come from live decision data.
- Reports and endings use existing authoritative content and state.
- Desktop gameplay fits the viewport without document scrolling; mobile remains usable without horizontal scrolling.
- No networking, story-graph, timer, resource, or persistence behavior changes.

## Validation Results

- `npm run typecheck`: passed.
- `npm test`: 192 tests passed.
- `npm run test:worker`: 45 tests passed.
- `npm run build`: passed; Vite reports the existing large development 3D sandbox chunk.
- Playwright full multiplayer campaign: passed with two clients through ten decisions, a failed signal, the motorboat branch, and a shared ending.
- Playwright three-client crash/rescue/reload/mobile-radio/first-vote flow: passed.
- Playwright group and solo motorboat ending fixtures: passed.
- Evidence: `output/playwright/adaptive-cinematic-ui/` contains 11 captures across crash choices, decisions, waiting, incident reports, mobile radio, and endings. The ending CSS-module selector correction was made after the campaign screenshot capture; typecheck, build, and unit tests pass after that correction, but the campaign ending screenshots have not been recaptured.

The browser campaign exercised the failed-signal branch. A successful signal ending was not forced deterministically in the final passing run; the ending presentation is shared by all ending IDs and the signal outcome remains authoritative.
