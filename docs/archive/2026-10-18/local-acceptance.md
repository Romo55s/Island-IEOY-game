# Local Acceptance Notes

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

## Crash choice and session flow

- The live client is available at `/`; `/sandbox` preserves the standalone 3D island sandbox, `/crash-choice-preview` previews the crash panels, and `/ui-lab` remains the component lab.
- Active sessions include a snapshot-driven island viewport. Each decision stages the crew at its authored encounter zone; a client-only director routes them between zones with Daniel's `walk` clip, follows the scene with the camera, and keeps the DOM HUD limited to phase/zone/crew survival data.
- Resolved public events record the decision, winning option, outcome, social cue, and death IDs—but not individual votes. A deterministic character-history director selects rescue reunions, group celebrations, setback/comfort responses, danger reactions, and mourning beats from that data and the cast profiles. These are presentation reactions, not autonomous votes or gameplay authority.
- Character reaction lines have multiple authored variants per profile/emotional category and use event identity for repeatable cross-client selection.
- A Playwright test drives three independent browser clients through session creation/join, character selection, ready/start, the timed crash intro, private item offers, a real reload/resume during item choice, shared duplicate-target rescue resolution, report consistency, the reading interval, and the first group vote.
- Browser evidence: `npx playwright test e2e/crash-choice.spec.ts` (the three-client test takes roughly 70 seconds because it honors the real intro/report/voting timers). It also checks the isolated preview and mobile overflow.
- Full-session browser evidence: `npm run test:e2e -- e2e/full-session.spec.ts` completed a two-client game through all ten decisions and the ending in 10.4 minutes with production timers. It checked public event-history progression, shared ending identity, hunger/health HUD, and no browser errors. The ghost path is covered separately in Worker and scene-adapter tests. Vote/reveal/ending screenshots are in `test-results/`.
- The room's pending item offers/submissions are player-private; the identical finalized report is asserted across all three clients. The reconnecting player receives the original offer and selected item after a reload.
- Ghost voting is covered in the Worker command test; the complete ten-decision progression and ending transition are covered deterministically in the Worker gameplay test, avoiding probabilistic elimination and multi-minute browser waits.
- Decision options remain disabled during the reading interval; the label/countdown switches to the vote window at the server-provided opening timestamp.
- Session reports now lead with the winning option before its consequence, and shelter consequences name the shelter/location so the narrative remains tied to what players chose.
- The session HUD presents contextual crew thoughts/interactions instead of generic radio chatter, while keeping their presentation-only nature explicit. Paired reactions have authored, distinct lines.
- Zero food now shows a STARVING status and health in the roster; reveal text reports each character's actual starvation damage and ghost conversion. Rules remain 10 food per decision and up to 20 HP damage on a day that starts at zero food; five consecutive foodless damage ticks take a full-health character to death. This pacing still needs a human balance/playability pass.
- Decision options are centered, color-coded with text/selection cues (not color alone), and the island playfield is larger. Desktop and mobile UI Lab screenshots were captured and visually inspected; a live two-client session reached a choice and contextual reveal without browser errors. The browser did show a Three.js `THREE.Clock` deprecation warning, but no source usage was found in the game code.
- Crew route motion now rounds turns, eases acceleration/deceleration, and keeps facing and walk animation aligned with travel. Automated route-motion tests pass; distant-zone visual review is still worth doing during gameplay.
- Follow-up polish: crash item/rescue cards are now horizontally centered on the live session page (not just the preview wrapper); measured center was x=600/1200 desktop and x=195/390 mobile, with no mobile horizontal overflow. Evidence: `output/playwright/crash-item-choice-centered.png` and `output/playwright/crash-item-choice-mobile-centered.png`.
- Crew movement now follows a 2.6 m/s walk pace; the walk-cycle time scale tracks the same acceleration curve, and animation changes crossfade over 320 ms. This addresses foot sliding and abrupt idle/walk switching. Route helper and targeted crash-choice tests pass; visually recheck distant-zone motion in the next full game playtest.

## Verification

- `npm run typecheck`
- `npm run test:worker`
- `npm run test` (including deterministic social-beat and ending presentation cases; the runtime manifest now matches the eight clips shipped in the optimized Daniel GLB. The original source model still contains 33 clips; a 33-clip optimizer trial produced a 2,575,120-byte file, above the existing 2 MiB limit, so the full set is deferred until it can meet the asset budget.)
- `npm run build`
- `npm run check:bundle`
- `npm run check` (typecheck, all 142 unit/worker tests, production build, and deploy-bundle check; all passed after these changes.)

The connected screen is a functional gameplay shell, not a final production lobby. Crash item meshes remain temporary low-poly proxies. The current waterfall encounter fills much of the viewport at its camera zoom; this composition issue is documented in `docs/playtests/2026-10-17-full-session.md`. Survival values (10 food per decision; 20 health damage after a day starts at zero food) are first-pass tuning, not designer-approved balance targets.

Full-session browser findings and screenshots are recorded in `docs/playtests/2026-10-17-full-session.md`.
