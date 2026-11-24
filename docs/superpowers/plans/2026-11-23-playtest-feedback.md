# Playtest Feedback Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use task-focused agents for independent areas and review all shared changes before integration.

**Goal:** Make survival consequences, health state, history, reconnection, and asset loading understandable and dependable during multiplayer play.

**Architecture:** Keep the Durable Object snapshot as the single source of truth. Carry authored outcome and survival causes into the event history, then derive the passenger manifest, report, and radio from the same committed event data. Improve reconnect feedback without bypassing ticket validation; let static assets use explicit cache lifetimes that distinguish HTML from stable media.

**Tech Stack:** React, TypeScript, Cloudflare Worker, PartyServer, SQLite Durable Objects, React Three Fiber, Cloudflare Static Assets.

**Spec:** `docs/design/2026-11-23-playtest-feedback.md`

## Global Constraints

- Do not create a second authoritative health value on the client.
- Do not infer an outcome from a decision prompt when a resolved outcome is available.
- Preserve the existing event, multiplayer, ticket, and reconnect protocols unless an identified defect requires a versioned change.
- Keep the existing pending voice feature edits intact.
- Do not cache `index.html` as immutable; mutable public model and image URLs need a revalidation window.

---

### Task 1: Health state and cause history

**Files:**
- Review and modify `src/shared/domain.ts` and `src/shared/rules/resolvedEvents.ts` only as needed for cause fidelity.
- Review and modify `src/shared/rules/survival.ts` and `src/shared/desperation/resolve.ts` only if a cause is being discarded.
- Modify the manifest/history presentation in `src/game/screens/GameSessionScreen.tsx` and its CSS, coordinating with the existing voice feature edits.

**Deliverable:** The roster uses the latest authoritative character resource values; the event feed shows each health change with cause, delta, and resulting value, including starvation and decision outcomes.

### Task 2: Outcome-specific incident reports

**Files:**
- Review `src/game/story/incidentPresentation.ts` and `src/game/screens/StoryIncidentRoom.tsx`.
- Review `src/shared/content/bearEncounter.ts`, `src/shared/rules/resolvedEvents.ts`, and `src/shared/domain.ts` for the resolved bear outcome.

**Deliverable:** Reports name the committed result and consequences; bear encounters distinguish fight win, retreat, injury, and death when those outcomes occur.

### Task 3: Multiplayer freeze and recovery

**Files:**
- Review `src/client/useGameConnection.ts`, `src/client/useGameStore.ts`, `src/client/sessionApi.ts`, `src/ui/molecules/ConnectionBanner.tsx`, and `src/game/screens/GameSessionScreen.tsx`.
- Review `worker/game/GameRoom.ts`, `worker/game/roomScheduler.ts`, and `worker/http/issueTicket.ts` for server/client state transitions.

**Deliverable:** Reconnection refreshes credentials safely, resumes the same session, and applies a newer snapshot. Exhausted retries and expired tickets produce actionable UI rather than an indefinite overlay.

### Task 4: Image and model caching — complete

**Files:**
- Review `cloudflare.config.ts`, `public/`, and the Cloudflare Worker asset output.
- Add an appropriate asset headers file or configuration using the current Cloudflare Workers Static Assets behavior.
- Review model/image URL versioning in `src/shared/domain.ts` and scene loaders only if the selected cache policy requires it.
- Update `docs/deployment/cloudflare.md` with cache behavior.

**Deliverable:** HTML revalidates; fingerprinted build assets can be cached long-term; public images and GLBs use a bounded cache lifetime and update correctly after asset revisions.

### Task 6: Avoid downloading every character model on the first screen — complete

**Files:**
- Modify `src/ui/atoms/CharacterModelPortrait.tsx` to mount the GLB model only while its portrait is visible inside the UI viewport.
- Preserve the shared portrait canvas, existing `IntersectionObserver` clipping behavior, and initial-letter fallback.
- Verify with browser network inspection that the lobby requests visible character models first and requests additional GLBs only as their cards become visible; selected and active player portraits must still resolve to 3D.

**Deliverable:** Initial lobby loading no longer requests all sixteen GLBs before players need them.

### Task 7: Production verification of report and multiplayer triggers — partial

**Files:**
- Use the production browser flows and existing decision-test tooling; do not add a new gameplay source of truth.
- Inspect server-resolved event data, roster projections, reconnect state, and vote resolution in `src/shared/rules/`, `src/client/`, and `src/game/screens/` as needed.

**Deliverable:** A short multiplayer pass verifies all-voted early resolution, cause-aware health history, bear outcome text, and reconnect after a forced network interruption. Unreached random events remain explicitly unverified.

**Progress:** Local three-client Playwright verified synchronized incident/radio text, visible vote changes, immediate resolution after all three votes, and lobby requests for fewer than sixteen character GLBs. A mid-game socket drop could not be reproduced with the available browser network controls; session reload recovery and fresh-ticket resume are covered separately. See `docs/qa/2026-11-24-playtest-feedback-followup.md` for test results and remaining limits.

### Task 5: Release notes and player guidance — complete

**Files:**
- Update `docs/deployment/cloudflare.md` with cache behavior and deployment notes.
- Update `docs/qa/` with a concise account of changes and any known limits.

**Deliverable:** Player-facing behavior and deployment caching are documented; remaining risks are stated without implying unperformed QA.
