# Team Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Jim's reckless influence, Courtney's speech trait, more starting items, a playable bear encounter, and group/private hunger decisions.

**Architecture:** Extend authored content and existing server-owned decisions, assignments, private choices, and persisted reports. Keep hunger scheduling and outcome reduction in focused modules; preserve normal route state while an interrupt resolves. Dialogue consumes public facts and has no gameplay authority.

**Tech Stack:** TypeScript, React, Zustand, Zod, Cloudflare Workers/Durable Objects through PartyServer, React Three Fiber, Vitest, Playwright. Use the existing package scripts and dependencies.

**Spec:** `docs/design/2026-11-12-team-feedback-features.md`.

## Global Constraints

All constraints and numerical tables in the spec apply. Numerical values are proposed tuning, not measured balance. This planning task changes documentation only. Existing unrelated worktree edits must be preserved during implementation; stage only intended feature files when making checkpoints.

## Work packages and order

The feedback spans three independently reviewable subsystems, so use three implementation plans:

1. [Character voices and starting items](2026-11-12-team-feedback-voices-items.md). Ships independently; defines dialogue eligibility hooks needed by the bear work.
2. [Bear encounter](2026-11-12-team-feedback-bear.md). Depends on package 1 for named exchanges. Adds actual gameplay corresponding to Jim's suggestions.
3. [Hunger and nighttime decisions](2026-11-12-team-feedback-hunger.md). Can be developed independently of the bear; integrate both through the same route boundary checks.

Do not add a blanket inventory/crafting system, universal combat, live AI dialogue, or new character models to complete these packages. Existing assets and category icons are sufficient. Later art improvements can be reviewed separately.

## Final acceptance

- [ ] Review the authored examples and proposed numerical tables against the spec; preserve the distinction between proposed tuning and confirmed feedback.
- [ ] Complete each package's focused tests and previews, then run `npm run check` once across the integrated result.
- [ ] Run `npm run test:e2e -- e2e/team-feedback.spec.ts`; include desktop and narrow/mobile flows, keyboard target selection, reconnect, both escape routes, and post-death ghost voting.
- [ ] Record actual test outcomes and any pre-existing failures in `docs/qa/team-feedback.md`; do not claim a full pass from only targeted tests.
- [ ] Update `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, and `docs/README.md` with implemented versus proposed behavior, linked preview evidence, and balance limitations.
- [ ] Confirm the 16-character roster still works and use catalog size in fixtures; do not hard-code an older player count.

## Review notes

The spec covers every requested feature, including increased opportunity under hunger, a chosen victim, individual target choice, failed attempts becoming public, regret, knockout health loss, and Courtney's speech. The no-vote cannibalism behavior deliberately retains the game's existing random no-vote rule and is called out for creative review. No implementation, test execution, deployment, or balance validation has occurred as part of writing this plan.
