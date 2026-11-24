# Expand Session Capacity to the Character Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow one player per available character, currently 15, and keep the roster, multiplayer protocol, scene staging, and session UI consistent with that capacity.

**Architecture:** Derive the maximum player count from the character catalog so adding a character also expands room capacity. Use that shared constant in Worker admission checks, start validation, public snapshot schemas, scene staging, and UI counts; preserve unrelated limits such as three item choices and ten campaign decisions.

**Tech Stack:** TypeScript, React, Zod, Cloudflare Worker Durable Objects, Vitest, Playwright.

**Spec:** User request dated 2026-11-10; the 15-entry `CHARACTER_CATALOG` and existing worker/session protocol.

**Implementation status:** Capacity now derives from the catalog and is applied to Worker admission/start checks, player-related protocol arrays, player counters, and optional island staging. Walter, Jessica, Zach, and Steve were already catalogued with model assets. Automated max-capacity regression testing and a 15-client load/reconnect run remain unverified.

## Global Constraints

- One player claims one unique character.
- Current capacity is the number of characters in `CHARACTER_CATALOG` (15).
- Do not change campaign decision counts, per-player item offer counts, or other unrelated numeric limits.
- Existing eight-player rooms must still load and resume after this capacity increase.

---

## File responsibilities

| Files | Responsibility |
| --- | --- |
| `src/shared/domain.ts` | Export the catalog-derived maximum player count. |
| `src/shared/protocol.ts` | Accept player, character, vote, assignment, and outcome arrays up to the new cap. |
| `worker/game/GameRoom.ts` | Enforce the same cap when issuing and consuming admission tickets and starting a session. |
| `src/game/screens/GameSessionScreen.tsx`, `src/game/screens/StoryIncidentRoom.tsx` | Show the dynamic player capacity in passenger counts. |
| `src/scene/world/islandLevel.ts`, `src/scene/phases/IslandScene.tsx` | Provide 15 scene slots for the optional 3D staging view. |
| `tests/shared/characterCatalog.test.ts`, `tests/worker/*`, `e2e/*` | Protect character presence, room capacity, protocol bounds, and multiplayer admission. |
| `docs/GAME_DESIGN.md`, `docs/ROADMAP.md` | Update the supported-player claim. |

## Task 1: Make player capacity follow the catalog

- [x] Export `MAX_PLAYER_COUNT = CHARACTER_CATALOG.length` and use it in both Worker room-full checks and the session-start bounds.
- [x] Replace player-derived `.max(8)` protocol limits with `.max(MAX_PLAYER_COUNT)` while retaining limits that describe non-player data.
- [x] Expand 3D island staging offsets to at least 15 slots and remove eight-player truncation from the sandbox/scene roster.
- [x] Replace hardcoded `/8` lobby and manifest labels with the shared capacity.

## Task 2: Cover the full roster and admission boundary

- [x] Confirm Walter, Jessica, Zach, and Steve appear in the catalog with models and manifest entries; their existing catalog coverage already includes all four.
- [ ] Add Worker coverage for admitting exactly `MAX_PLAYER_COUNT` unique characters and rejecting one more player, including the ticket-consumption admission path.
- [ ] Validate public snapshot schemas with a maximum-size room, resolved outcome, and vote list.
- [ ] Update user-facing capacity documentation and any existing E2E expectations that assert `/8`.

## Verification

Run the focused catalog, protocol, and Worker room admission tests; app and Worker TypeScript checks; then run a Playwright lobby test at full capacity and confirm the next admission is rejected cleanly.

## Acceptance criteria

- All 15 catalog characters, including Walter, Jessica, Zach, and Steve, are selectable.
- A room admits up to 15 distinct players and rejects a sixteenth.
- Public snapshots and resolved events support the 15-player roster.
- Lobby and passenger manifest counts show the 15-player capacity.
- The optional island staging view can place all 15 without truncating the crew.
