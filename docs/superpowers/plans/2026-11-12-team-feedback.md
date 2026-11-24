# Team Feedback Implementation Plan — completion record

Implemented locally and verified 2026-11-23 after the user's instruction to proceed. Deployment was not part of this implementation pass.

**Goal:** Implement Jim's reckless influence, Courtney's speech trait, more starting items, a playable bear encounter, and group/private hunger decisions.

**Architecture:** Existing server-owned decisions, assignments, private choices, and persisted reports. Hunger scheduling and reduction live in focused modules while the underlying route is preserved. Dialogue has no gameplay authority.

**Spec:** [Team feedback design](../../design/2026-11-12-team-feedback-features.md).

## Implementation

- [x] Character voices, exact Jim/Tony eligibility and persisted opening cooldown; eight starting objects.
- [x] Bear node, actual tool-owner assignments/refusal, attributable injuries/deaths, and bear visibility state.
- [x] Group hunger votes with explicit living targets and separate nomination storage.
- [x] Private night choices, hunger-dependent opportunity frequency, Sleep timeout, failure/regret/retaliation and public reports.
- [x] Server validation, old-room defaults, one-time resolution, route continuation, no extra food tick, ending cleanup.
- [x] Development preview, story-map/presentation integration, mobile and keyboard verification, full catalog roster fixture.
- [x] Focused shared/client tests, full Worker suite, five browser scenarios, typecheck, production build and bundle validation.
- [x] Run integrated check and record remaining unrelated workspace failures rather than claim a clean suite.
- [x] Update design, roadmap, project index and [QA evidence](../../qa/team-feedback.md).

## Acceptance still open

- [ ] Human multiplayer pacing/balance review of odds, costs, opportunity frequency and no-vote victim behavior.
- [ ] Fresh authenticated multi-client/reconnect browser campaign acceptance. Worker privacy/persistence and both complete rule-based escape routes passed; deterministic browser previews are not a substitute for this acceptance session.

## Package records

Original detailed implementation checklists remain in [voices/items](2026-11-12-team-feedback-voices-items.md), [bear](2026-11-12-team-feedback-bear.md), and [hunger](2026-11-12-team-feedback-hunger.md). Their historical file suggestions were consolidated into `tests/shared/teamFeedback.test.ts`, `tests/worker/teamFeedback.test.ts`, `e2e/team-feedback.spec.ts`, and the `/team-feedback` preview. Existing assignment eligibility projection was reused instead of introducing a duplicate field. `prepareDesperation` returns consumed opportunity bookkeeping even when no offer starts, preventing rerolls.

Numerical values are initial defaults, not measured balance. Existing unrelated workspace changes were preserved.
