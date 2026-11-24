# Playtest Feedback Follow-up — 2026-11-24

## Completed

- Removed the duplicate connection-state label from the compact gameplay header.
- Changed character portrait models to mount only when their portrait enters the visible UI viewport; kept the initials fallback and shared WebGL canvas.
- Added static asset cache rules: HTML and the character manifest revalidate, fingerprinted `/assets/*` files cache for one year, and mutable images and GLBs cache for one day.
- Updated deployment documentation and aligned the voice-asset deployment manifest with the existing owner approval record.
- Deployed Worker version `2d42bddd-6aa8-40e1-a282-b92fc2011c34` to `https://ieoy-game.ieoy-game.workers.dev`.

## Verification

- `npm run typecheck` — passed.
- `npm run check:bundle` — passed.
- `node scripts/check-deployment-approval.mjs` — passed for 16 character models and team voice recordings.
- `cf deploy --prebuilt --mode production --dry-run` — passed; included the `GAME_ROOM` Durable Object binding.
- Focused Vitest run — 45 tests passed across five files, including connection/resume, resolved events, and consequence presentation.
- `npx playwright test e2e/crash-choice.spec.ts --project=chromium` — 3 tests passed. The multiplayer case verified three-client report consistency, visible vote updates, early resolution after all three votes, mobile overflow, and fewer than 16 character GLB requests during initial lobby loading.
- Production GET `/api/health` returned `{"ok":true}`.
- Production response headers were checked: HTML and the character manifest revalidate; a character GLB and an incident image use `max-age=86400`; the fingerprinted application bundle uses `max-age=31536000, immutable`.

## Remaining verification limits

- Browser network emulation did not close the established WebSocket, and the available Chromium CDP version did not support `Network.closeConnections`. The browser flow did verify that reloading during item selection resumes the same session and preserves the selected offer; connection unit tests verified fresh-ticket resume. A real mid-game socket interruption still needs validation from a separate client/network or a controllable WebSocket test harness.
- The randomly selected production story path did not guarantee a bear encounter or starvation event. Those outcomes remain covered by focused rule/content tests, not by this browser run.
- The production build reports a 1.79 MB main JavaScript chunk. The release bundle passes the configured gate, but code splitting is a follow-up performance improvement.
- The `THREE.Clock` deprecation originates in the project's current React Three Fiber v9 dependency. No safe same-major fix was available during this pass; upgrading R3F major versions should be planned and validated separately.
