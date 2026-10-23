# Island of Extremely Questionable Judgment

A private multiplayer decision-making game: friends stranded on an island choose what to do, then watch their characters live with the consequences.

**Current stage:** working multiplayer prototype; gameplay coherence and visual consequence presentation need refinement. Passing tests do not mean the game is finished or fun.

Start with the [current project index and implementation status](docs/README.md), the [current design brief](docs/GAME_DESIGN.md), and the [forward roadmap](docs/ROADMAP.md). The [game audit](docs/audits/2026-10-18-game-audit.md) records the evidence behind this refinement.

## Local development

Use Node.js 22.18 or later and `npm ci`, then `npm run dev`. Open `http://127.0.0.1:5174/`. Create a room and join from a second browser context to play; minimum two players. `/sandbox` is a visual sandbox with fabricated resource values, not the multiplayer game. `/ui-lab` and `/crash-choice-preview` are development previews.

Relevant checks: `npm run test`, `npm run test:worker`, `npm run test:e2e -- e2e/full-session.spec.ts`, and `npm run check`. The full-session browser test uses real timers and takes about ten minutes.

Development-only `/encounter-preview` exercises the real live renderer with two/eight crew, encounter cuts, repeated reactions, and death fixtures. It is not a playable session and is excluded from production builds.

Old plans are preserved under `docs/archive/2026-10-18/` for provenance. Their checkboxes and instructions are historical, not the active backlog. Asset permissions remain in `docs/licenses/` and `THIRD_PARTY_LICENSES.md`. Remote deployment requires separate approval.
