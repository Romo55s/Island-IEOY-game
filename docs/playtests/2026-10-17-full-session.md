# Full Session Browser Playtest · 2026-10-17

> Historical test report. Its observations and fixes describe that earlier run, not current visual acceptance. The [2026-10-18 audit](../audits/2026-10-18-game-audit.md) has fresh evidence of empty encounter views and timing/animation defects. Original `test-results/` screenshot names below are ephemeral and may have been overwritten by subsequent runs; use the new audit's retained evidence for current findings.

## Result

- Two Chromium clients completed lobby admission, character selection, timed intro, private item choice, rescue, all ten timed decisions, and the ending.
- Runtime: 10.4 minutes using production timers. Both players survived this seeded-by-choices run; the ending HUD showed 30 HP and 0 food for each. No uncaught browser page errors were observed.
- The ghost path is separately covered by Worker tests (death sets HP to zero and ghosts remain eligible to vote) and scene-adapter tests (only explicit death IDs trigger the fall clip).
- Automated run: `npm run test:e2e -- e2e/full-session.spec.ts`.
- Evidence: `test-results/full-session-vote-1.png`, `test-results/full-session-reveal-1.png`, `test-results/full-session-vote-5.png`, `test-results/full-session-reveal-5.png`, `test-results/full-session-ending.png`.

## Verified behavior

1. Decision IDs move the scene staging area to the matching island zone; the crew walks along the authored route graph and the camera follows the active encounter.
2. The DOM HUD shows the active zone, player roster, and each character's HP/food without covering the camera controls.
3. The reveal view shows structured public outcomes. A deterministic social beat stages a close pair for success/setback/rescue/mourning while the other crew members react. A screenshot review caught overlapping interaction nameplates; those are now offset outward.
4. Food is consumed once per resolved decision. The ending screenshot showed the crew with empty food and reduced health, confirming the survival loop is visible through a complete run.
5. The server-selected ending appears on both clients; the full-session test no longer assumes one random ending title.

## Findings and follow-ups

1. **Waterfall visual dominates the playfield at its encounter camera.** The 20 × 16 m pool and vertical fall occupy much of the 3D viewport at the current session zoom. This is a world composition/camera framing follow-up, not a state or movement defect.
2. **Radio dialogue needed more authored variety.** The first and fifth reveal screenshots repeated Samantha's success line. Each character now has a second line per emotional category, with speaker/line selection keyed by event history. Unit/profile tests pass; a new full-length run after this copy-only change is not required to validate the event plumbing.
3. **Hovered primary ending button contrast.** The ending capture showed the hover color overriding the yellow primary treatment while keeping dark text. A primary-hover override now preserves the high-contrast yellow state; full unit/build checks pass, though no new screenshot was taken after this small CSS correction.

## Screenshots

The vote images show the panel, timer, active encounter, and status HUD together. Reveal images show the outcome and scene reaction. The ending image shows the server ending, survivors/ghost count, and final HP/food values.
