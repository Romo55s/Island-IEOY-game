# Gameplay UI and Multiplayer QA

**Date:** 2026-10-23  
**Scope:** Cinematic gameplay HUD, Pause/settings, incident reports, crash choices, public group voting, mobile layout, and campaign flow.  
**Browser:** Playwright Chromium.

## Summary

The gameplay interface and multiplayer flow passed the completed automated checks. The full Playwright suite passed **12/12 tests** in about **1.8 minutes**. The client unit suite passed **192/192**, and the worker suite passed **47/47**. TypeScript typecheck also passed.

Two usability defects found during this pass were corrected:

1. At tablet width, the boarding-code label wrapped and made the top HUD controls look uneven. The responsive header now gives the controls a stable row and keeps the label on one line; resource indicators occupy a separate compact row.
2. Closing Pause returned the player to the game visually but lost keyboard focus. The dialog now traps Tab/Shift+Tab, closes with Escape, and restores focus to its trigger.

After the user reviewed the header and requested closer design-system color matching, a follow-up refinement tightened the tablet controls and replaced the unsupported teal status/accent color with the design system's amber and metal colors. That follow-up passed the three crash-choice Playwright specs, both visual snapshot specs, and typecheck. The original 12-test full suite predates this final visual refinement.

The full campaign test initially expected the last player's vote to remain on screen after all players voted. The game correctly resolves immediately, so the test now checks visible ballots while the vote is open and then checks the incident report after the final vote.

## Changes made

- Refined the responsive gameplay header and tablet resource strip.
- Follow-up from the Anthropic frontend-design skill: grouped the flight identity with its boarding code, gave resources the central instrument band, and grouped connection status with Pause. This composition is consistent at desktop, tablet, and mobile widths.
- Reworked the header into a stable identity/resources/controls hierarchy. The connected state now uses a compact metal status indicator, boarding code stays contained, and Pause has a clear pause glyph and consistent touch target.
- Replaced the extra `sea-glass` teal token throughout the UI with canonical amber accents; connected status now uses the dark metal treatment and amber indicator.
- Added keyboard focus containment, Escape dismissal, and focus restoration for Pause/settings.
- Kept the gameplay HUD stats clearly labeled by scope: `YOU` values belong to the viewing player's selected character; `CREW` values such as shelter are shared crew state.
- Updated UI Lab visual snapshots because their previous images reflected the older interface. The current desktop and mobile screenshots are now the approved baselines.
- Adjusted the full-campaign Playwright assertion to match immediate resolution after the final vote.

## Test results

| Check | Result | Coverage |
| --- | --- | --- |
| Playwright end-to-end | **12 passed** | App shell, title navigation, admission, crash choices, reconnect, rescue report, first decision, group/solo escape endings, visual snapshots, full two-player campaign |
| Two-player campaign | **Passed** | Both clients completed ten story decisions and reached the same ending; public ballots were visible before resolution; each final vote advanced immediately |
| Three-player crash flow | **Passed** | Item selection, reconnect persistence, shared rescue report, live group ballots, vote replacement, desktop/mobile layout |
| Desktop/mobile visual snapshots | **2 passed** | UI Lab at 1440px and 390px; baselines refreshed to current intentional UI |
| Client unit suite | **192 passed / 40 files** | Client components and shared behavior |
| Worker suite | **47 passed / 8 files** | Authoritative multiplayer and game rules |
| Typecheck | **Passed** | App and worker TypeScript projects |

## Findings and decisions

### Fixed

- **Tablet header alignment and code wrapping — fixed.** Reproduced at 1024×768. The boarding-code label now stays on one line, the Pause button aligns with the connection/code controls, and the resources sit in a dedicated row.
- **Pause keyboard return — fixed.** Reproduced by opening Pause, navigating with Shift+Tab/Tab, and closing with Escape. Focus stays inside the dialog while open and returns to the Pause trigger when closed.
- **Immediate vote resolution — verified.** The last eligible vote transitions directly to the incident report; ballots are visible to connected players during the open voting phase.
- **Incident report presentation — reviewed.** The report reads as a distinct parchment panel within the cinematic scene, with outcome, vote results, and actual resource changes visible. Desktop and mobile captures are included below.

### Clarifications

- The top HUD is scoped to the local viewer. `YOU · food/health/morale/water` reflects that viewer's selected survivor. `CREW · shelter` is shared crew state, not another player's personal stat.
- A live ballot appears only while a decision is open. After the final vote, the game advances immediately, so the ballot list is replaced by the report.
- The UI Lab snapshot failures in the first run were stale reference images from the previous UI. The current screen was reviewed, its baselines were refreshed, and the visual checks passed on the full rerun.

## Coverage limits

- The full campaign run validates the deterministic two-client route that reached an ending; it does not exhaustively enumerate every possible story branch or ending.
- Mobile checks cover the core item-choice, active-vote, incident-report, and ending states at 390×844. They do not cover every supported phone size or every long-form radio/history combination.
- The end-to-end suite checks group ballot visibility and vote replacement. The private selfish-choice privacy rule was not independently stress-tested by this UI-focused pass.
- Accessibility verification here covers keyboard operation of Pause and the navigation scenario described by the specs; it is not a full screen-reader audit.

## Screenshot evidence

All captures are in [`output/playwright/adaptive-cinematic-ui`](../../output/playwright/adaptive-cinematic-ui/).

- [Tablet gameplay header, 1024×768](../../output/playwright/adaptive-cinematic-ui/gameplay-tablet-header.png)
- [Mobile gameplay header, 390×844](../../output/playwright/adaptive-cinematic-ui/gameplay-mobile-header.png)
- [Pause/settings on desktop](../../output/playwright/adaptive-cinematic-ui/pause-settings-desktop.png)
- [Crash item choice on desktop](../../output/playwright/adaptive-cinematic-ui/crash-item-choice-desktop.png)
- [Crash item choice on mobile](../../output/playwright/adaptive-cinematic-ui/crash-item-choice-mobile.png)
- [Open group vote on desktop](../../output/playwright/adaptive-cinematic-ui/decision-vote-desktop.png)
- [Waiting state on mobile](../../output/playwright/adaptive-cinematic-ui/decision-waiting-mobile.png)
- [Incident report on desktop](../../output/playwright/adaptive-cinematic-ui/incident-report-cinematic.png)
- [Incident report on mobile](../../output/playwright/adaptive-cinematic-ui/incident-report-cinematic-mobile.png)
- [Campaign incident reports, decisions 1 and 5](../../output/playwright/adaptive-cinematic-ui/decision-01-incident-report.png), [decision 5](../../output/playwright/adaptive-cinematic-ui/decision-05-incident-report.png)
- [Ending aftermath on desktop](../../output/playwright/adaptive-cinematic-ui/ending-aftermath-desktop.png)
- [Ending aftermath on mobile](../../output/playwright/adaptive-cinematic-ui/ending-aftermath-mobile.png)

## Commands run

- `npm run test:e2e` — 12 passed, about 1.8 minutes.
- `npm test` — 192 passed across 40 files.
- `npm run test:worker` — 47 passed across 8 files.
- `npm run typecheck` — passed.
