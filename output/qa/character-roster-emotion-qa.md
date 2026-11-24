# Character roster and death-reaction QA

**Date:** 2026-10-27

## Result

All 14 supplied character GLBs loaded successfully and were checked against the character shown in the roster and gallery. The roster and gallery display each character's catalog name and matching profile, and the model gallery can switch among the full 15-character catalog. Daniel uses his animation library; the imported models use their own clips with the compatible Daniel walk clip as fallback where needed.

**Tony is the one exception:** no Tony GLB was present in Downloads. The catalog currently uses Daniel's model as a temporary placeholder for Tony. The other 14 names have corresponding model files.

## Death reactions

A forced death in the decision test produced the incident report, a ghost for the deceased character, and sad reactions from the surviving crew in this run. The death system assigns the deceased and one comforter a sad reaction. Other survivors receive deterministic, event-seeded reactions: empathic characters have an 82% sad, 13% afraid, 5% relieved distribution; others have 65% sad, 20% afraid, 15% relieved. The deterministic seed makes all clients show the same reactions for a given event. A unit test across 80 event seeds confirmed sad, afraid, and relieved outcomes occur and repeat consistently for the same event.

## Verification

- `npm run typecheck` — passed.
- Focused Vitest suite — 4 files, 19 tests passed (character catalog, profiles, manifest, crew history).
- Focused Playwright character roster test — passed after correcting a gallery-heading locator; all roster model requests returned successfully, gallery names/profiles were visited, and the death scenario rendered.
- Full Playwright suite — initial run: 10 passed, 3 failed. After fixing the character test locator, that focused scenario passes. The remaining 2 failures are UI Lab desktop and mobile screenshot comparisons: the current page dimensions/content differ from their checked-in snapshots. The full suite was not rerun after the locator-only test fix.

## Screenshots

- `character-roster-core.png` — core cast in the decision bench.
- `character-roster-additional.png` — additional cast in the decision bench.
- `character-render-preview.png` — selected model, profile, and animation preview.
- `character-death-reactions.png` — death incident report and crew reactions.
