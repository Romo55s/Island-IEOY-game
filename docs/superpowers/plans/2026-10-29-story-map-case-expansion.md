# Story Map Case Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show more of the campaign’s already implemented state-dependent cases and connect them only through transitions supported by the current game rules.

**Architecture:** Add stable map-case IDs around existing decision-card factories so state variants remain distinct even when they share a gameplay card ID. Build edges from the current campaign and motorboat effects, then validate that each edge endpoint exists. Do not add new playable story logic in this map expansion.

**Tech Stack:** React, TypeScript, React Flow, ELK.js, existing campaign and motorboat decision factories.

**Spec:** `docs/design/first-campaign-story-map-v1.md`; existing rules in `src/shared/content/campaignRoute.ts` and `src/shared/content/motorboatRoute.ts`.

## Global Constraints

- Derive prompts, options, outcomes, and weights from existing game factories.
- Mark each state-dependent card as a representative case with its exact modeled prerequisites.
- Preserve existing game rules and do not imply unsupported transitions.
- Keep focused-branch browsing and the full-map view available.
- Keep the Black Box design tokens and use ellipses for card text that exceeds its visible lines.

---

### Task 1: Correct map-only presentation issues

**Files:**
- Modify: `src/game/screens/StoryMapScreen.tsx`
- Modify: `src/game/screens/StoryMapScreen.module.css`
- Modify: `src/game/storyMap/StoryMapNode.tsx`

- [x] Hide the minimap for a focused decision branch; retain a compact minimap for full-map and mechanics views.
- [x] Clamp card titles and subtitles with visible ellipses and expose full text through the node inspector and native title attributes.

### Task 2: Model implemented state variants as distinct map cases

**Files:**
- Modify: `src/game/storyMap/storyMapData.ts`

- [x] Introduce a typed case wrapper containing a stable map ID, source gameplay card, human-readable case title, and representative-state note.
- [x] Keep the campaign opening and shared decision cards, then add state-dependent first-night, escape, signal, boat discovery, repair, recovery, and launch cases.
- [x] Create node and option/outcome IDs from the map-case ID so variants do not overwrite each other when their gameplay card IDs match.
- [x] Generate successor edges from actual `campaignEffect` and `motorboatEffect` fields; encode conditional case links from their documented prerequisites.
- [x] Remove duplicate unreachable route-state nodes and retain all existing terminal outcomes.
- [x] Keep encounter cards as a catalog unless current game rules define a real route into them.

### Task 3: Check graph readability and branch navigation

**Files:**
- Modify: `src/game/screens/StoryMapScreen.tsx` only if focused traversal needs adjustment.

- [x] Open the story map and inspect the shoreline representative branch in focused view.
- [x] Confirm the case selector reaches the new variants and the full map includes every case and ending.
- [x] Confirm the graph lays out without missing-edge errors; variant IDs are namespaced by case ID.
- [x] Capture desktop screenshots; check clamped text, minimap placement, connector readability, and the responsive rule that hides the minimap on narrow screens.

## Out of Scope

- New playable decision cards or changes to server-owned story state.
- New endings or mechanics not already implemented in the game.
