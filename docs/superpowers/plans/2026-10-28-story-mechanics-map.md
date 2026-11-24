# Story and Mechanics Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a developer-only browser page that visualizes the game's implemented story decisions, outcome branches, route transitions, and major mechanics.

**Architecture:** Use React Flow for the pannable, zoomable node graph and ELK.js for layered layout. Build graph data from existing decision-card factories and domain/rule definitions; do not create a second editable story source. Display source conditions and mechanic details in a side inspector and clearly mark branches whose next route is dynamic or unspecified.

**Tech Stack:** React 19, TypeScript, `@xyflow/react`, `elkjs`, existing CSS tokens and app routing.

**Spec:** User request in chat; canonical visual contract at `docs/design/black-box-design-system-v2.json`.

## Global Constraints

- Register `/story-map` only in development, consistent with `/decision-test`.
- Preserve all game state, story rules, and multiplayer behavior.
- Derive cards, options, outcomes, mechanics, and route effects from current implementation.
- Style with the Black Box design tokens; avoid default React Flow dashboard styling.
- Do not imply a deterministic successor where current rules do not define one.

---

### Task 1: Add graph dependencies and typed graph model

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/game/storyMap/storyMapData.ts`

- [x] Install `@xyflow/react` and `elkjs`.
- [x] Derive a catalog of actual authored decision cards from `DECISION_CARDS`, campaign factories, and motorboat factories across representative existing state variants.
- [x] Merge duplicate card IDs and options by stable IDs, preserving all authored outcomes and assignment rules.
- [x] Convert cards to decision, option, outcome, route-state, ending, and mechanic nodes; create route edges only from explicit campaign/motorboat effects.
- [x] Include mechanics referenced by actual rules: public votes and tie/no-vote behavior, group nomination and random fallback, assignment response/refusal/timeout, resource effects, daily food use/starvation, death/ghost conversion, and ending conditions.
- [x] Export summaries/counts for visible nodes and mechanics filters.

### Task 2: Build the browser inspector page

**Files:**
- Create: `src/game/screens/StoryMapScreen.tsx`
- Create: `src/game/screens/StoryMapScreen.module.css`
- Create: `src/game/storyMap/StoryMapNode.tsx`

- [x] Render custom Black Box nodes and labeled edges using React Flow.
- [x] Run ELK layered layout for the directed graph and fit the initial viewport.
- [x] Add pan/zoom controls, minimap, fit-to-view, and filters for route graph, encounter cards, and mechanics.
- [x] Selecting a node opens a detail inspector with prompt/condition, options, outcome weights, resource consequences, assignments, and source identifiers.
- [x] Keep long graph details in the inspector rather than overflowing node cards; support narrow viewport by stacking the inspector below the graph.

### Task 3: Register the dev route and validate

**Files:**
- Modify: `src/app/App.tsx`

- [x] Lazy-load `/story-map` only when `import.meta.env.DEV` is true.
- [x] Check the page at `/story-map`; confirm the story branches, generic encounters, mechanics filters, selection details, pan/zoom, and mobile layout render.
- [x] Run the TypeScript typecheck; do not alter or run the game test suites unless requested.
