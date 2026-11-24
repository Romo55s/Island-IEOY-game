# Story-First Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the multiplayer session a contextual, story-led decision experience with scene art and crew reactions, while keeping the 3D island sandbox available as a development route.

**Architecture:** Preserve the authoritative multiplayer phases, votes, resource rules, deadlines, and commands. Replace the live full-screen island canvas with a responsive incident-room presentation: one contextual illustration, phase content, crew dialogue, and compact status; map existing decision IDs and route events to art paths with a shared fallback. Do not load a character GLB into every crew row until distinct approved cast models exist.

**Tech Stack:** React 19, TypeScript, CSS Modules, Vite, Vitest, Playwright, existing shared domain snapshots and Black-Box design tokens.

**Spec:** `docs/design/black-box-design-system-v2.json`; `docs/GAME_DESIGN.md` sections 1–3 and 7; this user-approved story-first direction.

## Global Constraints

- Preserve current authoritative game mechanics, networking, timers, host permissions, and persistence.
- Use `#393731`, `#111317`, `#746B5D`, `#E8E0C9`, `#B6AC9A`, `#D6AD32`, `#E9C64D`, and `#B4312C` from the Black-Box design system.
- Use Silkscreen for short headings and IBM Plex Mono for readable copy, values, forms, and timers.
- Keep square metallic framing, high contrast, 44px minimum touch targets, visible keyboard focus, and reduced-motion support.
- Background art contains no text, UI, labels, or invented character identities; retain the original crash-site color grade.
- Keep `/sandbox` available for development and compare it separately from the normal session route.
- The current cast catalog has one approved GLB shared under all character IDs; do not present that shared model as distinct people.

---

### Task 1: Create the contextual story presentation model

**Files:**
- Create: `src/game/story/incidentPresentation.ts`

**Interfaces:**
- `getIncidentPresentation(snapshot: PublicGameSnapshot): { title: string; location: string; image: string; description: string }`
- Inputs are the live shared snapshot, latest public event, and current decision; output is stable story copy plus an image path with a universal fallback.

- [x] Review all existing decision IDs and route event IDs against the presentation map before implementation.
- [x] Implement a decision-ID map using the existing authored prompt and route state; do not fabricate player names or outcomes.
- [x] Inspect the result to confirm every decision maps to a non-empty title/location/image and unknown IDs resolve to `/images/crash-shore.png`.

### Task 2: Build the story incident room and crew reaction feed

**Files:**
- Create: `src/game/screens/StoryIncidentRoom.tsx`
- Create: `src/game/screens/StoryIncidentRoom.module.css`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`

**Interfaces:**
- `StoryIncidentRoom` accepts the current `PublicGameSnapshot`, session controls and already-rendered `phaseContent`.
- The view composes the existing decision, rescue, assignment, private choice, reveal, and ending components without moving their rules into presentation code.
- Crew feed uses the existing `toSessionScenePresentation(snapshot)` dialogue and the public character catalog; portraits remain neutral, name-led markers until per-character approved models/renders are available.

- [x] Confirm incident copy and art follow `currentDecision.id`, crew reactions are snapshot-backed, dead crew remain shown as ghosts, and phase content remains mounted.
- [x] Implement a black-box incident frame with contextual image, title/location, story beat, a readable phase-content area, compact cast/reaction rail, and collapsible manifest/route details.
- [x] Use responsive single-column reading order at narrow widths, 44px touch targets for actionable controls, visible focus, semantic live regions for state changes, and reduced-motion rules.
- [x] Replace only the normal session's `SessionIslandView` background with `StoryIncidentRoom`; keep the existing `/sandbox`, encounter preview, and route preview using the 3D scene.
- [x] Inspect the code path and confirm the existing phase component receives the same callbacks and deadline props.

### Task 3: Add first-pass story scene artwork and art manifest

**Files:**
- Create: `public/images/incidents/` reusable scene plates for the authored locations.
- Create: `docs/design/story-scene-art.md`
- Modify: `src/game/story/incidentPresentation.ts`

**Interfaces:**
- Each generated illustration is a 16:9 background plate keyed to one or more existing decision IDs, with dark negative space for the DOM incident frame.
- Use `/images/crash-shore.png` as the visual reference for palette, island geography, crash-site lighting, and late-1990s survival-game rendering.

- [x] Generate text-free scene plates for wreck salvage, jungle foraging, boar encounter, coast signal/raft, cliff shelter/cave, and motorboat cove.
- [x] Save each returned image under `public/images/incidents/` with a location-based filename; map related decision IDs to those shared locations and keep original scene art as the fallback.
- [x] Update the incident map to reference the checked-in files and document prompt, dimensions, and source image.
- [x] Verify each image exists and is loadable by Vite; check a representative desktop and mobile crop for readability.

### Task 4: Verify the story-first session and retain sandbox access

**Files:**
- No game rules or tests are changed in this task.

**Interfaces:**
- Normal `/` session uses the story incident room; `/sandbox` remains the development route for the previous island experience.

- [x] Run `npm run typecheck`; fix compile errors without altering server rules.
- [x] Review a real two-player browser session across the crash intro, rescue choice, group decision, reveal, and private-choice phases; inspect desktop and 390px mobile layouts. Phase timeouts advanced the session before all choices could be submitted manually.
- [x] Capture desktop and mobile screenshots; confirm no text is baked into art, choices remain visible, and the page has no horizontal overflow.
- [ ] Run `npm run build` and report the exact verified routes and any missing per-character model art.

## Self-Review

- Current confirmed game loop and authoritative rules are preserved by Tasks 1–2.
- Existing sandbox and previews remain 3D through Task 2.
- Art prompts, asset paths, fallback, and visual review are covered by Task 3.
- Responsive behavior, keyboard use, reduced motion, status accessibility, and browser verification are covered by Tasks 2 and 4.
- Distinct character models are intentionally not invented; the avatar rail can consume approved per-character renders when those assets are ready.
- A complete manual playthrough with submitted crash-item/rescue choices and a finished ending remains a separate acceptance step; this review focused on layout and phase presentation.
