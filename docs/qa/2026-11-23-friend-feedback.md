# Friend Playtest Feedback Follow-up — 2026-11-23

## Changes made

- Added an in-game black-box history view alongside the crew radio. It shows resolved outcomes and per-character health deltas with before/after values and a cause.
- Increased manifest health meter granularity from four steps to ten, while keeping exact values available to assistive labels and the character inspector.
- Made bear encounter outcomes explicit: retreat and distraction list food lost; hunting outcomes state whether the bear was killed, the hunter's health loss, or the fatality, plus rewards where applicable.
- Fixed snapshot revision filtering so a player joining a different room can accept that room's lower initial revision. Revisions are compared only within the same room.
- Added an actionable reconnect control after automatic retries fail. Manual reconnect resumes the same room using a freshly requested ticket.
- Added Cloudflare Static Assets cache headers: revalidate HTML/root paths, cache fingerprinted `/assets/` files for one year, and cache public images/models for one day.

## Verification status

- Automated tests and browser playtests were not run in this follow-up.
- A full eight-player reconnect and health-history playtest remains recommended before treating the friend-reported freeze and stale health display as fully closed.
- The phrase “letras, números” was ambiguous; numeric health values versus letter/number decision shortcuts still needs confirmation before changing visible labels.
- Public image/model replacements at the same URL may remain cached for up to one day; use a new filename or versioned URL for immediate updates.
