# Island Decision Game Implementation Plan

> **For agentic workers:** Implement this plan task-by-task, keep the ownership boundaries below, and require tests plus review before each integration. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally validate **Island of Extremely Questionable Judgment**, a private 2–8 player browser game in which an authoritative server resolves ten darkly comic island-survival votes inside a PS1-inspired isometric 3D presentation.

**Architecture:** Use one full-stack Vite project: React and React Three Fiber render the client, while a Cloudflare Worker routes HTTP and PartySocket traffic to one hibernating PartyServer/Durable Object per session. Shared Zod schemas and pure rules live in `src/shared`; the server owns all state transitions, secrecy, timers, and randomness, while DOM UI and one persistent R3F canvas render authoritative snapshots.

**Tech Stack:** Node.js 22.18+, TypeScript, npm, React, Vite, Cloudflare `cf` CLI and Vite plugin, Three.js, React Three Fiber, Drei, Zustand, Zod, PartyServer, PartySocket, Vitest, Cloudflare Vitest plugin, Testing Library, Playwright, glTF Transform.

**Spec:** `docs/specs/island-decision-game.md`

**Design direction:** `docs/design/visual-direction.md`

**Product decision record:** all choices in `docs/specs/open-decisions.md` are confirmed and incorporated below.

## Global Constraints

- Support exactly 2–8 players and exactly ten decisions per game.
- Each decision has a 25-second discussion preview followed by a 15-second voting window and a 20-second reveal; disconnected-host migration occurs after 30 seconds; session recovery expires two hours after last valid activity; one-time connection tickets expire after 60 seconds.
- Use six-character codes from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Use React Three Fiber with one persistent canvas and a fixed orthographic isometric camera; players never control characters or camera.
- Keep gameplay simulation outside R3F render components and keep text-heavy interaction in native-resolution DOM UI.
- Keep one persistent R3F canvas. Do not add Rapier or another physics engine; the first release has no physics-driven gameplay.
- Ship runtime characters as optimized GLB; never ship source photos or unapproved personal likenesses.
- Use a 4px spacing grid, 2px borders, hard shadows, clipped corners, and a PS1-inspired original style without Sony trademarks or proprietary assets.
- Use Durable Object storage only; do not add accounts, an external database, matchmaking, chat, analytics, or permanent history.
- All authoritative transitions, timers, vote secrecy, tie breaking, consequences, death, reconnection, and host migration run on the server.
- Complete and approve every local gate before authenticating or deploying to Cloudflare.
- Use the Cloudflare free plan and a `workers.dev` address for the first deployment.
- Freeze compatible dependency versions in `package-lock.json`; no unbounded dependency ranges.
- Use Zod 4.5 or later and strict schemas at every HTTP and WebSocket boundary.
- Render all countdowns from server-supplied absolute deadlines using an estimated server-clock offset; client clocks never advance authoritative state.
- Players choose one unclaimed character in the lobby; display identity as “Player as Character.”
- Keep live votes private, then reveal anonymous option totals with the winner.
- Include ambient music and sound effects with master/music/effects controls and mute; audio never controls game timing.
- Ship English content from a centralized string module; Spanish localization is deferred.
- Support desktop and mobile, with desktop as the first-release design and QA priority.
- Use `3d_assets/Daniel_model.glb` as the repository-approved source for the initial test character; preserve it unchanged and ship only an optimized derivative at runtime. Remote deployment still requires the normal explicit release approval.
- Local validation uses the developer laptop as the authoritative full-stack server. Default to loopback; expose an opt-in trusted-LAN mode for other devices without requiring Cloudflare authentication or deployment.

---

## File and Ownership Map

```text
.
├── 3d_assets/
│   └── Daniel_model.glb
├── docs/
│   ├── assets/character-contract.md
│   ├── assets/daniel-model-inspection.md
│   ├── architecture/cloudflare-preflight.md
│   ├── design/visual-direction.md
│   ├── local-acceptance.md
│   ├── licenses/assets.md
│   └── specs/{island-decision-game,open-decisions}.md
├── e2e/
│   ├── fixtures/session.ts
│   ├── multiplayer.spec.ts
│   ├── responsive.spec.ts
│   └── visual.spec.ts
├── public/
│   ├── audio/
│   ├── fonts/
│   └── models/characters/
│       └── manifest.json
├── scripts/
│   ├── check-deploy-bundle.mjs
│   └── optimize-character.mjs
├── src/
│   ├── app/App.tsx
│   ├── app/routes.ts
│   ├── audio/{AudioDirector,audioSettings}.ts
│   ├── client/sessionApi.ts
│   ├── client/sessionStorage.ts
│   ├── client/useGameConnection.ts
│   ├── client/useGameStore.ts
│   ├── game/GameShell.tsx
│   ├── game/screens/{TitleScreen,JoinScreen,LobbyScreen,GameScreen,EndingScreen,UiLabScreen}.tsx
│   ├── scene/GameCanvas.tsx
│   ├── scene/SceneDirector.tsx
│   ├── scene/camera/IsometricCamera.tsx
│   ├── scene/characters/{CharacterCast,CharacterModel,PlaceholderCharacter}.tsx
│   ├── scene/effects/{LowResolutionPass,RetroMaterial}.tsx
│   ├── scene/phases/{LobbyScene,CrashIntroScene,DecisionScene,RevealScene,EndingScene}.tsx
│   ├── scene/world/Island.tsx
│   ├── shared/content/{decisionCards,strings.en}.ts
│   ├── shared/domain.ts
│   ├── shared/protocol.ts
│   ├── shared/rules/{outcomes,random,resolveVote,stateMachine}.ts
│   ├── styles/{reset,tokens,global}.css
│   ├── ui/atoms/
│   ├── ui/molecules/
│   ├── ui/organisms/
│   └── main.tsx
├── tests/
│   ├── client/
│   ├── scene/
│   ├── shared/
│   └── worker/
├── worker/
│   ├── auth/{passwords,rateLimit,tickets}.ts
│   ├── game/{GameRoom,roomScheduler,roomStorage}.ts
│   ├── http/{createSession,issueTicket,responses}.ts
│   └── index.ts
├── .gitignore
├── index.html
├── package.json
├── playwright.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.worker.json
├── vite.config.ts
├── vitest.config.ts
├── vitest.worker.config.ts
└── cloudflare.config.ts
```

The lead/integration agent owns root configuration, `src/shared`, and merge order. The backend agent owns `worker` and `tests/worker`. The frontend/3D agent owns `src/app`, `src/client`, `src/game`, all `src/scene` runtime components, and their tests. The content/assets agent owns `3d_assets`, `src/shared/content`, optimization scripts, `public/models`, `public/audio`, manifest tests, and asset/license documentation; it does not edit scene runtime files. After Task 2, backend Tasks 3–5 and frontend Tasks 6–8 may proceed in parallel; Task 9 is the first full integration gate.

## Shared Interfaces

These names are fixed before parallel work begins:

```ts
export const PROTOCOL_VERSION = 1 as const;
export type GamePhase = "lobby" | "intro" | "decision" | "reveal" | "ending" | "expired";
export type PlayerStatus = "alive" | "ghost";
export type ResourceKey = "food" | "health" | "morale" | "shelter";

export type ClientCommand =
  | { protocolVersion: 1; commandId: string; type: "character.select"; payload: { characterId: string } }
  | { protocolVersion: 1; commandId: string; type: "room.remove-player"; payload: { playerId: string } }
  | { protocolVersion: 1; commandId: string; type: "room.set-ready"; payload: { ready: boolean } }
  | { protocolVersion: 1; commandId: string; type: "room.start"; payload: Record<string, never> }
  | { protocolVersion: 1; commandId: string; type: "vote.submit"; payload: { optionId: string } }
  | { protocolVersion: 1; commandId: string; type: "client.ping"; payload: { sentAt: number } };

export type ServerEvent =
  | { protocolVersion: 1; type: "session.welcome"; payload: WelcomePayload & { serverNow: number } }
  | { protocolVersion: 1; type: "state.snapshot"; payload: PublicGameSnapshot }
  | { protocolVersion: 1; type: "command.rejected"; payload: { commandId: string; code: CommandErrorCode; message: string } }
  | { protocolVersion: 1; type: "server.pong"; payload: { sentAt: number; receivedAt: number } };

export type CreateSessionRequest = { displayName: string; password: string };
export type TicketRequest =
  | { mode: "join"; displayName: string; password: string }
  | { mode: "resume"; resumeToken: string };
export type AdmissionResponse = {
  code: string;
  playerId: string;
  resumeToken: string;
  ticket: string;
  ticketExpiresAt: number;
};
export type ApiErrorResponse = {
  error: { code: ApiErrorCode; message: string };
};
```

`PublicGameSnapshot` never contains password material, resume tokens, one-time tickets, unresolved option counts, or another player's vote. `PrivateRoomState` is server-only and never imported by client modules.

During `decision`, `PublicGameSnapshot` omits all option counts. During `reveal`, it includes `resolvedOptionCounts: Record<string, number>` and the winning option but never player-to-vote mappings. Lobby snapshots expose the character catalog, claims, and separate player/character display names.

---

### Task 0: Read-Only Cloudflare Free-Tier Feasibility Gate

**Owner:** Lead/integration agent

**Files:**
- Create: `docs/architecture/cloudflare-preflight.md`

**Interfaces:**
- Produces: a go/no-go record before dependencies or application code are created

- [ ] **Step 1: Verify the current official platform limits without authenticating**

Record links, retrieval date, and exact current values from official Cloudflare documentation. As of planning on 2026-10-15, the free plan supports SQLite-backed Durable Objects, 100,000 Durable Object requests/day, 13,000 GB-s/day, 5 GB account storage, hibernating WebSockets, and 100 Durable Object classes. Also record the current Worker free CPU limit and the separate Durable Object per-invocation CPU limit; do not assume they are the same.

- [ ] **Step 2: Validate the architecture against those limits**

Document that password derivation executes inside the Durable Object invocation rather than the 10 ms free Worker entry request; the entry Worker only parses, bounds, and forwards the request. Estimate a 15-minute eight-player game at under 2,000 WebSocket/HTTP/alarm operations, so at least 50 such worst-case sessions fit below the published 100,000-request daily allowance before other traffic.

- [ ] **Step 3: Benchmark password derivation locally before freezing it**

Run a Node Web Crypto benchmark for PBKDF2-SHA-256 at 100,000 iterations across 20 samples. Record median and p95. The gate passes when p95 is below 250 ms; otherwise reduce to 60,000 iterations and repeat, while retaining the five-attempt/60-second rate limiter. Task 3 must use the recorded iteration count verbatim.

- [ ] **Step 4: Decide go/no-go**

Proceed only if current official docs still show Durable Objects on the free plan and the benchmark passes. If either fails, stop planning execution and revise the backend target with the user; do not silently add a paid service.

- [ ] **Step 5: Commit the preflight record**

```bash
git init
git add docs/architecture/cloudflare-preflight.md
git commit -m "docs: verify cloudflare free-tier feasibility"
```

---

### Task 1: Full-Stack Foundation and Test Harness

**Owner:** Lead/integration agent

**Files:**
- Create: root configuration files listed in the file map
- Create: `src/main.tsx`, `src/app/App.tsx`, `worker/index.ts`
- Create: `scripts/check-deploy-bundle.mjs`
- Create: `tests/shared/smoke.test.ts`, `tests/worker/env.d.ts`, `tests/worker/smoke.test.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run test`, `npm run test:worker`, `npm run test:e2e`, `npm run check`
- Produces: `npm run dev:lan` for trusted same-Wi-Fi testing against the developer laptop
- Produces: a Worker environment type containing `GAME_ROOM: DurableObjectNamespace<GameRoom>`

- [ ] **Step 1: Initialize npm and install the locked runtime dependencies**

Run:

```bash
npm init -y
npm install react react-dom three @react-three/fiber @react-three/drei zustand zod@^4.5.0 partyserver partysocket meshoptimizer
npm install --save-dev typescript vite @vitejs/plugin-react @cloudflare/vite-plugin@beta cf vitest@^4.1.0 @cloudflare/vitest-plugin jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom eslint prettier @playwright/test @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions @types/react @types/react-dom @types/node @cloudflare/workers-types
npx playwright install chromium
```

Expected: `package-lock.json` exists and every dependency is recorded with a concrete resolved version.

- [ ] **Step 2: Add scripts and strict TypeScript/Vite/Worker configuration**

Set the scripts to:

```json
{
  "dev": "cf dev",
  "dev:lan": "IEOY_LAN_DEV=1 cf dev",
  "build": "cf build",
  "preview": "vite preview",
  "typecheck": "cf workers types && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.worker.json --noEmit",
  "test": "vitest run --config vitest.config.ts",
  "test:worker": "vitest run --config vitest.worker.config.ts --max-workers=1 --no-isolate",
  "test:e2e": "playwright test",
  "check:bundle": "node scripts/check-deploy-bundle.mjs dist",
  "check": "npm run typecheck && npm run test && npm run test:worker && npm run build && npm run check:bundle"
}
```

Set `"type": "module"` and require Node.js `>=22.18` in `package.json`. Configure the Cloudflare Vite plugin after the React plugin. In typed `cloudflare.config.ts`, import `bindings`, `defineConfig`, and `exports` from `cf/config`, import `worker/index.ts` with `{ type: "cf-worker" }`, and define worker name `ieoy-game`, compatibility date `2026-10-15`, SPA assets, `exports.GameRoom = exports.durableObject({ storage: "sqlite" })`, and `env.GAME_ROOM = bindings.durableObject({ worker: "ieoy-game", exportName: "GameRoom" })`. Configure `@cloudflare/vitest-plugin` with `main: "./worker/index.ts"` and Miniflare's `durableObjects: { GAME_ROOM: "GameRoom" }`; do not create a Wrangler configuration or deploy script. Set `allowImportingTsExtensions: true`, include `.cloudflare/types` in the TypeScript projects, and add `.cloudflare/`, `.env*`, and local secret files to `.gitignore` because generated types are recreated by `cf workers types`. Worker tests use shared storage because Durable Object WebSockets do not support per-file isolation; every test creates a unique room code and explicitly closes connections/cleans its room.

In `vite.config.ts`, keep `server.host` on `127.0.0.1` by default. Use strict port `5174` because port `5173` is already occupied by the user's separate long-running Vite project and must not be disturbed. When `IEOY_LAN_DEV=1`, bind to `0.0.0.0` on the same port and print both the loopback and LAN URLs. Derive API, WebSocket, and invitation origins from `window.location.origin`; never hardcode `localhost`. LAN mode is opt-in because it exposes the local game to the trusted network, and README instructions must mention the operating-system firewall prompt and that it is not intended for public Wi-Fi or internet exposure.

- [ ] **Step 3: Write failing smoke tests for the browser and Worker**

```ts
// tests/shared/smoke.test.ts
import { describe, expect, it } from "vitest";
import { APP_NAME } from "../../src/shared/domain";

describe("foundation", () => {
  it("exports the stable application name", () => {
    expect(APP_NAME).toBe("Island of Extremely Questionable Judgment");
  });
});
```

```ts
// tests/worker/smoke.test.ts
import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";

it("serves a health response without touching a room", async () => {
  expect(env.GAME_ROOM).toBeDefined();
  const response = await exports.default.fetch("https://local.test/api/health");
  expect(await response.json()).toEqual({ ok: true });
});
```

Declare the generated environment type for the plugin:

```ts
// tests/worker/env.d.ts
declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {}
}
```

Run: `npm run test && npm run test:worker`

Expected: FAIL because the source constants, Worker route, and test configurations do not exist.

- [ ] **Step 4: Add the minimal React shell and Worker health route**

Create `APP_NAME`, render it in `App`, and return JSON `{ ok: true }` only for `GET /api/health`. All other API requests return a JSON 404; PartyServer routing will be added in Task 3. Add the first bundle-check implementation: it requires the supplied build directory to exist and rejects `.env`, `.dev.vars`, `asset-intake`, `.fbx`, `.blend`, `.psd`, `.tif`, and `.heic` paths. Task 11 expands the same file with content scanning.

- [ ] **Step 5: Generate Worker types and pass the foundation checks**

Run:

```bash
npx cf workers types
npm run typecheck
npm run test
npm run test:worker
npm run build
```

Expected: all commands exit 0; the build emits SPA assets and Worker output.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json package-lock.json index.html src worker tests scripts/check-deploy-bundle.mjs vite.config.ts vitest.config.ts vitest.worker.config.ts tsconfig.json tsconfig.app.json tsconfig.worker.json cloudflare.config.ts .gitignore
git commit -m "chore: scaffold full-stack game runtime"
```

---

### Task 2: Shared Domain, Protocol, and Pure Rules

**Owner:** Lead/integration agent

**Files:**
- Create: `src/shared/domain.ts`
- Create: `src/shared/protocol.ts`
- Create: `src/shared/rules/random.ts`, `resolveVote.ts`, `outcomes.ts`, `stateMachine.ts`
- Create: `src/shared/content/decisionCards.ts`
- Test: `tests/shared/protocol.test.ts`, `tests/shared/rules.test.ts`, `tests/shared/content.test.ts`

**Interfaces:**
- Produces: `ClientCommandSchema`, `ServerEventSchema`, `PublicGameSnapshotSchema`
- Produces: `CreateSessionRequestSchema`, `TicketRequestSchema`, `AdmissionResponseSchema`, `ApiErrorResponseSchema`
- Produces: `resolveWinningOption(votes, optionIds, random): string`
- Produces: `pickWeightedOutcome(outcomes, random): Outcome`
- Produces: `applyOutcome(state, outcome, random): PrivateRoomState`
- Produces: `advancePhase(state, now, random): PrivateRoomState`

- [ ] **Step 1: Write protocol tests that protect validation and vote privacy**

Test these exact cases:

```ts
expect(ClientCommandSchema.safeParse(validVote).success).toBe(true);
expect(ClientCommandSchema.safeParse({ ...validVote, protocolVersion: 2 }).success).toBe(false);
expect(ClientCommandSchema.safeParse({ ...validVote, payload: { optionId: "" } }).success).toBe(false);
expect(PublicGameSnapshotSchema.safeParse(snapshotWithPasswordHash).success).toBe(false);
expect(PublicGameSnapshotSchema.safeParse(snapshotWithVotesByPlayer).success).toBe(false);
expect(CreateSessionRequestSchema.safeParse({ displayName: "Ana", password: "isla" }).success).toBe(true);
expect(TicketRequestSchema.safeParse({ mode: "resume", resumeToken: "x".repeat(43) }).success).toBe(true);
expect(ApiErrorResponseSchema.safeParse({ error: { code: "INVALID_PASSWORD", message: "No match" } }).success).toBe(true);
```

Run: `npm run test -- tests/shared/protocol.test.ts`

Expected: FAIL because schemas are absent.

- [ ] **Step 2: Define strict domain types and Zod schemas**

Define `Player`, `CharacterDefinition`, `CharacterState`, `Resources`, `DecisionCard`, `DecisionOption`, `Outcome`, `PrivateRoomState`, `PublicGameSnapshot`, `ClientCommand`, `ServerEvent`, and the four shared HTTP contracts shown above. Keep `player.displayName` separate from `character.displayName` and represent a lobby claim with `player.characterId`. Every object schema uses `.strict()`. IDs are bounded printable strings; timestamps are non-negative integers; resource values are integers `0..100`; arrays have explicit maximum lengths.

`toPublicSnapshot(state, viewerPlayerId)` must include `viewer.hasVoted`, omit the selected option and counts until reveal, then expose only anonymous `resolvedOptionCounts` plus the winner. Add a compile-time `satisfies PublicGameSnapshot` check in the implementation.

Define eight logical test characters with stable IDs, neutral temporary names, and distinct UI tint accents. They may all reference the same optimized Daniel GLB during development, but their claims and game states remain independent. Replace names/models through the character manifest later without changing player or protocol IDs.

- [ ] **Step 3: Write deterministic rules tests**

Cover these boundaries with a sequence-based fake random source:

```ts
const random = sequenceRandom([0, 0.999999]);
expect(resolveWinningOption({ a: 2, b: 1 }, ["a", "b"], random)).toBe("a");
expect(resolveWinningOption({ a: 1, b: 1 }, ["a", "b"], random)).toBe("a");
expect(resolveWinningOption({}, ["a", "b"], random)).toBe("b");
expect(clampResource(-5)).toBe(0);
expect(clampResource(108)).toBe(100);
```

Also assert that an elimination outcome changes an alive character and player to `ghost`, and that the ghost's player remains in `eligibleVoterIds`.

Run: `npm run test -- tests/shared/rules.test.ts`

Expected: FAIL because the rules functions are absent.

- [ ] **Step 4: Implement the random boundary and pure transition functions**

Use this interface everywhere randomness is needed:

```ts
export interface RandomSource {
  next(): number; // inclusive 0, exclusive 1
}

export const cryptoRandom: RandomSource = {
  next: () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
};
```

Reject an empty option/outcome list. Weighted selection treats weights as positive integers and uses cumulative half-open ranges. State transitions are pure: clone changed records, increment `revision` once per accepted transition, and never read wall-clock time internally; pass `now` as an argument.

- [ ] **Step 5: Add the exact ten-card initial content deck**

Create cards with stable IDs and three options each:

1. `wreckage-lighter`: pocket the lighter, rescue the first-aid kit, or drag out the suspicious snack cart.
2. `coconut-jury`: shake the palm, build a catcher, or appoint the tallest survivor as coconut ambassador.
3. `smoke-signal`: burn damp leaves, burn seat cushions, or burn the motivational retreat banner.
4. `mystery-berries`: taste one, feed one to the inflatable life vest, or leave them alone.
5. `shelter-politics`: build by the beach, build under the cliffs, or sleep inside the fuselage.
6. `boar-diplomacy`: share food, intimidate it with office jargon, or attempt a performance review.
7. `rainwater-budget`: use bottles, use the emergency slide, or declare rain an optional benefit.
8. `distress-flare`: fire now, save it for night, or let the least coordinated survivor handle it.
9. `cave-of-bad-ideas`: explore together, send one volunteer, or seal it with a meeting agenda.
10. `raft-committee`: launch immediately, reinforce it, or hold one final alignment meeting.

Each option has two or three outcomes whose integer weights sum to 100. Every card has at least one resource-positive and one resource-negative possibility; exactly six cards contain a low-probability elimination outcome of 5–15%; all text stays non-graphic. Validate uniqueness, count, weights, resource keys, and option count in `content.test.ts`.

Store interface labels and authored English text in `src/shared/content/strings.en.ts` rather than scattering literals through components. Keep the ten generic workplace-survival cards deployable; approved private jokes can replace individual strings later without changing IDs or rule data.

- [ ] **Step 6: Pass shared tests and commit the contracts**

Run: `npm run test -- tests/shared`

Expected: all shared tests pass.

```bash
git add src/shared tests/shared
git commit -m "feat: define game protocol and deterministic rules"
```

---

### Task 3: Session Creation, Password Admission, and One-Time Tickets

**Owner:** Backend agent

**Files:**
- Create: `worker/auth/passwords.ts`, `rateLimit.ts`, `tickets.ts`
- Create: `worker/http/createSession.ts`, `issueTicket.ts`, `responses.ts`
- Create: `worker/game/GameRoom.ts`, `roomStorage.ts`
- Modify: `worker/index.ts`
- Test: `tests/worker/admission.test.ts`

**Interfaces:**
- Consumes: shared WebSocket and HTTP schemas plus `PrivateRoomState`
- Produces: `POST /api/sessions` and `POST /api/sessions/:code/tickets`
- Produces: PartyServer route `/parties/game-room/:code`
- Produces: `GameRoom.initialize(input)`, `GameRoom.issueTicket(input)` internal operations

- [ ] **Step 1: Write failing admission tests**

Assert:

```ts
const created = await createSession({ displayName: "Ana", password: "isla" });
expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
expect(created.playerId).toMatch(/^p_/);
expect(created.resumeToken).toHaveLength(43);
expect(created.ticket).toHaveLength(43);

await expect(joinSession(created.code, { displayName: "Bo", password: "wrong" }))
  .rejects.toMatchObject({ status: 401, code: "INVALID_PASSWORD" });
```

Also test 4–64 code-point password bounds, 1–24 code-point normalized display names, control-character rejection, single-use ticket behavior, 60-second ticket expiry, five failed attempts in 60 seconds, a sixth `429`, and recovery with a valid resume token. Generate a deliberate first-attempt code collision and assert creation retries with a new code; after five forced collisions, assert `503 CODE_GENERATION_EXHAUSTED`.

Run: `npm run test:worker -- tests/worker/admission.test.ts`

Expected: FAIL with missing routes.

- [ ] **Step 2: Implement bounded input parsing and stable JSON errors**

All endpoint bodies are limited to 2 KiB and parsed with the shared HTTP schemas. Normalize display names with NFKC, trim outer whitespace, reject C0/C1 control characters, and enforce 1–24 Unicode code points. Normalize passwords with NFC without trimming, reject C0/C1 controls, and enforce 4–64 Unicode code points. Return the shared `{ error: { code, message } }` body with statuses `400`, `401`, `404`, `409`, `429`, or `503`. Set `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and JSON content type on API responses.

- [ ] **Step 3: Implement code generation and salted password digests**

Generate codes with rejection sampling over the 32-character alphabet to avoid modulo bias and retry initialization collisions up to five times. Store a 16-byte random salt and a PBKDF2-SHA-256 digest derived with the iteration count recorded by Task 0; perform derivation inside the Durable Object and compare equal-length byte arrays without early return. The per-address rate limiter provides an additional brute-force control for these short-lived rooms.

- [ ] **Step 4: Implement one-time tickets and resume identity**

Tickets and resume tokens use 32 cryptographically random bytes encoded base64url without padding. Persist only SHA-256 token digests. Issuing a join ticket stores `ticketDigest`, preallocated `playerId`, resume-token digest, normalized display name, mode, `expiresAt`, and `consumedAt` but does not create a player or reserve one of eight slots. Ticket consumption transactionally prunes expired tickets, rechecks capacity, creates or resumes the player, assigns the first successfully admitted player as host, and marks the ticket consumed. Expired unused tickets are pruned on issue, consume, and alarm. Ticket query parameters are removed after the WebSocket upgrade and never broadcast or logged.

- [ ] **Step 5: Route public requests and reject internal room operations**

The Worker handles only:

```text
GET  /api/health
POST /api/sessions
POST /api/sessions/:code/tickets
GET  /parties/game-room/:code   (WebSocket Upgrade only)
```

Any direct HTTP request to the PartyServer route without `Upgrade: websocket` returns `426`. Room initialization and ticket issuance use a typed Durable Object RPC method or an internal stub request that the public Worker router never forwards.

- [ ] **Step 6: Pass admission tests and commit**

Run: `npm run test:worker -- tests/worker/admission.test.ts`

Expected: all tests pass with fake timers.

```bash
git add worker tests/worker/admission.test.ts
git commit -m "feat: secure session creation and admission"
```

---

### Task 4: Lobby, Reconnection, Host Migration, and Persistent Scheduling

**Owner:** Backend agent

**Files:**
- Modify: `worker/game/GameRoom.ts`, `roomStorage.ts`
- Create: `worker/game/roomScheduler.ts`
- Test: `tests/worker/lobby.test.ts`, `tests/worker/scheduler.test.ts`

**Interfaces:**
- Consumes: authenticated PartyServer connections and `ClientCommandSchema`
- Produces: `processDueEvents(state, now, random)` and `nextAlarmAt(state)`
- Produces: snapshots with monotonic `revision`

- [ ] **Step 1: Write failing lobby and scheduler tests**

Cover capacity eight, minimum start of two currently connected players, host-only start, ready changes, unique character claims, claim replacement that clears ready, new join rejection after start, reconnect reclaiming the same player and character, duplicate live connection replacement, malformed-message rejection, and stale `commandId` idempotency. Assert the host may remove another player only in the lobby, a non-host cannot remove anyone, and removal releases the character claim, revokes the removed player's resume token, and prevents that identity from reconnecting.

Use fake time to prove:

```ts
expect(nextAlarmAt(state)).toBe(Math.min(state.phaseDeadlineAt!, state.hostMigrationAt!, state.expiresAt));
```

Disconnect the host, advance 29,999 ms, and assert no migration. Advance one more millisecond and assert the longest-connected active player becomes host. If nobody is connected, retain the pending migration and assign the first returning eligible player as host. Reconnect the original host after reassignment and assert they return as a regular player.

- [ ] **Step 2: Implement connection metadata and hibernation restoration**

Enable `static options = { hibernate: true }`. Store only `playerId` and a connection nonce in PartyServer connection state. On wake, load the private room state from Durable Object storage before accepting commands. Derive online presence from current connections and never persist raw WebSocket objects.

- [ ] **Step 3: Implement command validation, authorization, and idempotency**

Parse every frame as UTF-8 JSON no larger than 4 KiB. Reject binary frames. Keep the most recent 128 accepted command IDs per player; a duplicate receives the current snapshot without applying the command again. Authorize `character.select` only for the calling player in the lobby and clear ready after a successful change. Authorize `room.remove-player` only for the host against another lobby player; revoke the target's resume digest, release their claim, close their connection, and delete their roster entry atomically. Return stable errors: `INVALID_MESSAGE`, `UNAUTHORIZED`, `WRONG_PHASE`, `INVALID_CHARACTER`, `CHARACTER_TAKEN`, `INVALID_OPTION`, `SESSION_FULL`, and `SESSION_EXPIRED`.

- [ ] **Step 4: Implement the single-alarm scheduler**

Persist `phaseDeadlineAt`, `hostMigrationAt`, and `expiresAt` as absolute epoch milliseconds. `nextAlarmAt` returns the earliest defined deadline. `onAlarm` loads state, repeatedly processes every due event in chronological order, persists once, calls `sendViewerSnapshots()`, and schedules the next earliest deadline. `sendViewerSnapshots()` iterates authenticated connections and serializes `toPublicSnapshot(state, connection.playerId)` separately for each viewer; it never broadcasts one shared snapshot because `viewer.hasVoted` is private. This prevents missed transitions after hibernation without leaking vote state.

- [ ] **Step 5: Implement expiry and cleanup**

Every valid connection or accepted player command moves `expiresAt` to `now + 7_200_000`. On expiry, set the phase to `expired`, call `sendViewerSnapshots()`, close connections with application code `4001`, and call `deleteAll()` after all viewer-specific payloads have been constructed. Reusing the same code after cleanup creates a new unrelated room only through the creation endpoint.

- [ ] **Step 6: Pass lobby/scheduler tests and commit**

Run: `npm run test:worker -- tests/worker/lobby.test.ts tests/worker/scheduler.test.ts`

Expected: all tests pass, including a test that reconstructs the Durable Object between disconnect and alarm.

```bash
git add worker/game tests/worker/lobby.test.ts tests/worker/scheduler.test.ts
git commit -m "feat: persist multiplayer lobby lifecycle"
```

---

### Task 5: Authoritative Game Progression and Private Voting

**Owner:** Backend agent

**Files:**
- Modify: `worker/game/GameRoom.ts`
- Modify: `src/shared/rules/stateMachine.ts`
- Test: `tests/worker/gameplay.test.ts`, `tests/worker/privacy.test.ts`

**Interfaces:**
- Consumes: `room.start`, `vote.submit`, ten-card deck, pure rules
- Produces: authoritative `intro`, `decision`, `reveal`, and `ending` snapshots

- [ ] **Step 1: Write failing full-round tests**

Create three players, give each a unique character claim, start as host, advance the intro, submit two votes for option A and one for option B, and assert the server reveals A with anonymous counts `{ a: 2, b: 1 }`. Assert before reveal that no snapshot contains `votesByPlayer`, option counts, or another player's `hasVoted` value. Assert reveal snapshots never contain a player-to-option mapping. Assert a player may replace their own vote and that only the final value counts.

- [ ] **Step 2: Write timer, tie, ghost, and ending tests**

Use injected random values to verify uniform ties and no-vote selection. Resolve an elimination outcome, verify the victim becomes `ghost`, then complete the next round with that ghost's vote included. Advance through all ten cards and assert an identical ending snapshot for every connection.

- [ ] **Step 3: Implement start and phase deadlines**

`room.start` requires host, lobby phase, 2–8 currently connected admitted players, a unique character claim for every player, and all connected players ready. Set normal intro duration to 30 seconds. Each decision has a 25-second read/discussion interval followed by an exactly 15-second voting window; snapshots expose `votingOpensAt`, `earliestResolveAt` (ten seconds after voting opens), and `phaseDeadlineAt`. Reveal duration is 20 seconds. Test builds may shorten these durations without changing transition order. Persist the shuffled ten-card order at start. Even unanimous immediate voting cannot resolve before `earliestResolveAt`, keeping the normal session near 10 minutes; the maximum scripted duration is approximately 10.5 minutes before lobby and ending interaction.

- [ ] **Step 4: Implement private vote storage and early resolution**

Store votes only in `PrivateRoomState.votesByPlayer`. Reject votes before `votingOpensAt`. A valid vote must reference a current option and an admitted player. Resolve early only when every currently connected admitted player has a vote and `now >= earliestResolveAt`. On disconnect, re-evaluate early-resolution eligibility without deleting the player's stored vote.

- [ ] **Step 5: Implement consequence application and ending derivation**

Apply resource deltas with clamping, append at most 20 event-log entries, and select elimination targets uniformly from living characters allowed by the outcome. If no living target exists, convert elimination to a morale penalty of 10. Ending IDs are:

```ts
"rescued-inexplicably" // at least one survivor and average resources >= 60
"alive-technically"   // at least one survivor and average resources 25..59
"ghost-committee"     // zero survivors
"island-management"   // at least one survivor and average resources < 25
```

- [ ] **Step 6: Pass gameplay/privacy tests and commit**

Run: `npm run test:worker -- tests/worker/gameplay.test.ts tests/worker/privacy.test.ts`

Expected: all tests pass; serialized pre-reveal events contain no private voting data.

```bash
git add worker/game src/shared/rules tests/worker/gameplay.test.ts tests/worker/privacy.test.ts
git commit -m "feat: resolve authoritative survival votes"
```

---

### Task 6: Client Session API, Reconnecting Transport, and State Store

**Owner:** Frontend/3D agent

**Files:**
- Create: `src/client/sessionApi.ts`, `sessionStorage.ts`, `useGameStore.ts`, `useGameConnection.ts`
- Test: `tests/client/sessionApi.test.ts`, `tests/client/gameStore.test.ts`, `tests/client/connection.test.tsx`

**Interfaces:**
- Consumes: shared admission HTTP schemas and `ServerEventSchema`
- Produces: `createSession(input)`, `joinSession(input)`, `connectToSession(credentials)`
- Produces: `useGameStore` selectors and `sendCommand(command)`

- [ ] **Step 1: Write failing API and storage tests**

Verify trimmed inputs, stable mapping of server errors, `Cache-Control`-agnostic fetch behavior, and storage under the exact key `ieoy.session.v1`. Assert that `resumeToken` is stored in `sessionStorage`, not `localStorage`, and is removed on explicit leave or `SESSION_EXPIRED`.

- [ ] **Step 2: Implement the typed admission client**

Build request bodies with `CreateSessionRequestSchema` or `TicketRequestSchema` and parse responses with `AdmissionResponseSchema` or `ApiErrorResponseSchema`. Never interpolate password or resume token into a URL. `joinSession` requests a one-time ticket over POST, then passes only the ticket to PartySocket construction.

- [ ] **Step 3: Write failing store revision tests**

```ts
store.getState().acceptSnapshot(snapshotAtRevision(4));
store.getState().acceptSnapshot(snapshotAtRevision(3));
expect(store.getState().snapshot?.revision).toBe(4);
```

Also verify connection states `idle`, `connecting`, `connected`, `reconnecting`, `failed`, and `expired`, plus optimistic `pendingCommandIds` without optimistic gameplay mutation.

- [ ] **Step 4: Implement PartySocket lifecycle and validated events**

Use PartySocket reconnection with bounded exponential backoff. On reconnect, request a fresh ticket using the resume token before opening a new socket. Parse every server frame; invalid frames set a non-fatal protocol warning and are ignored. Generate command IDs from `crypto.getRandomValues()` rather than `crypto.randomUUID()` so trusted-LAN HTTP clients do not depend on a secure-context-only API.

Estimate server-clock offset from `session.welcome` and periodic ping/pong samples using the midpoint of the client send/receive timestamps. Smooth normal corrections, but snap when drift exceeds one second. Countdown selectors derive remaining time from the latest server deadline and estimated server time. Test client clocks that are five minutes fast and slow; both must display the same voting boundary within one second and neither may mutate phase locally.

- [ ] **Step 5: Pass client transport tests and commit**

Run: `npm run test -- tests/client/sessionApi.test.ts tests/client/gameStore.test.ts tests/client/connection.test.tsx`

Expected: all tests pass with mocked fetch and WebSocket transport.

```bash
git add src/client tests/client
git commit -m "feat: add resilient multiplayer client state"
```

---

### Task 7: Atomic Design System and UI Lab Approval Gate

**Owner:** Frontend/3D agent

**Files:**
- Create: `src/styles/reset.css`, `tokens.css`, `global.css`
- Create: focused components under `src/ui/atoms`, `molecules`, `organisms`
- Create: `src/game/screens/UiLabScreen.tsx`
- Test: `tests/client/uiLab.test.tsx`, `e2e/visual.spec.ts`

**Interfaces:**
- Consumes: domain resource/player types
- Produces: stable DOM components used by all screens

- [ ] **Step 1: Write token and interaction tests**

Render the UI Lab and assert every interactive element is keyboard reachable, focus-visible, and labeled. Verify resource meters expose `role="meter"`, current/min/max values, and text labels. Verify vote options expose selected, submitted, disabled, and rejected states without color-only cues. Verify character cards expose available, selected-by-viewer, and claimed-by-other states. Verify master, music, and effects controls expose accessible names and numeric values.

- [ ] **Step 2: Define the visual tokens**

Implement the six-color palette, typography, 4px spacing increments, 2px borders, hard 4px shadows, clipped-corner masks, z-index layers, motion durations, and native-resolution type sizes from `docs/design/visual-direction.md`. Bundle only OFL-compatible fonts and record their source/license in `docs/licenses/assets.md`.

- [ ] **Step 3: Build atoms and molecules**

Atoms: `RetroButton`, `PixelLabel`, `StatusBadge`, `ResourceMeter`, `Divider`, `FocusRing`. Molecules: `VoteOption`, `PlayerRow`, `SessionCode`, `ConnectionBanner`, `Countdown`. Each component accepts typed data, contains no networking, and has one colocated CSS module.

The countdown is visually updated each second but its live region announces only voting open, ten seconds remaining, five seconds remaining, and closed. Implement the documented keyboard map, including number keys `1`–`3` only when a visible enabled vote option owns that number.

- [ ] **Step 4: Build organisms and the UI Lab**

Organisms: `LobbyRoster`, `CharacterSelector`, `DecisionConsole`, `ConsequencePanel`, `SettingsDrawer`, `EndingSummary`. `/ui-lab` renders every state at desktop and narrow widths, including long “Player as Character” labels, eight players, available/claimed character cards, zero/full resources, ghost status, reconnection, audio settings, and validation errors.

- [ ] **Step 5: Capture and review baseline screenshots**

Run the development server in terminal A:

```bash
npm run dev
```

Then run screenshots in terminal B:

```bash
npx playwright test e2e/visual.spec.ts --update-snapshots
```

Expected: snapshots at 1440×900 and 390×844 show a survival-game interface, keep the center clear, and contain no glassmorphism or dashboard grid. Stop here for the user-facing UI Lab approval gate before assembling final screens.

Review the screenshots against both ASCII wireframes in `docs/design/visual-direction.md`. Reject a layout that permanently presents more than one primary and one secondary HUD cluster, obscures the character staging area, or could be mistaken for a generic admin dashboard.

- [ ] **Step 6: Commit the approved system**

```bash
git add src/styles src/ui src/game/screens/UiLabScreen.tsx tests/client/uiLab.test.tsx e2e/visual.spec.ts docs/licenses/assets.md public/fonts
git commit -m "feat: establish retro atomic interface"
```

---

### Task 8: Persistent R3F Scene and PS1-Inspired Rendering

**Owner:** Frontend/3D agent

**Files:**
- Create: `src/scene/GameCanvas.tsx`, `SceneDirector.tsx`
- Create: files under `src/scene/camera`, `effects`, `phases`, `world`, `characters`
- Test: `tests/scene/sceneDirector.test.tsx`, `tests/scene/characterModel.test.tsx`

**Interfaces:**
- Consumes: read-only `PublicGameSnapshot` and visual settings
- Produces: one persistent `<Canvas>` and phase-specific scene groups

- [ ] **Step 1: Write scene routing tests with a mocked Canvas**

Assert `SceneDirector` maps every `GamePhase` to exactly one phase group, preserves the canvas across phase changes, and renders one character slot per player. Assert a `ghost` receives the ghost material/pose but remains in the cast.

- [ ] **Step 2: Build the fixed camera and procedural greybox island**

Use an orthographic camera at an isometric three-quarter angle, with responsive frustum sizing but no controls. Build island, palms, wreckage, campfire, and airplane from low-poly primitives with shared materials. Use simple hemisphere/directional lighting and dusk fog; do not add physics.

Start with the safe quality tier and shared materials. Add retro effects one at a time only after recording a baseline for draw calls, material count, texture memory, and frame time. Do not add a post-processing dependency unless the isolated effect cannot be implemented with the existing renderer and the UI Lab/greybox review shows that it materially improves the direction.

- [ ] **Step 3: Implement low-resolution composition and optional retro effects**

Render the scene to a resolution capped by a configurable pixel scale, upscale with nearest-neighbor filtering, and leave DOM UI outside that surface. Implement restrained vertex quantization/jitter and dither as isolated effects controlled by `retroEffects: "full" | "reduced" | "off"`. Disable non-essential animation when `prefers-reduced-motion` is true.

- [ ] **Step 4: Implement synchronized phase presentations**

`CrashIntroScene` derives progress from server `phaseStartedAt` and `phaseDeadlineAt`, not from a local one-shot event. `DecisionScene` places survivors around camp. `RevealScene` plays the selected reaction or death/ghost transition. `EndingScene` frames remaining survivors and ghosts. Character animation uses stepped time without reducing input/network update frequency. `CharacterModel` explicitly configures `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` from the lockfile-pinned `meshoptimizer` dependency before loading optimized character GLBs.

- [ ] **Step 5: Add WebGL failure and performance fallback**

Catch canvas creation/context loss and show a DOM error with retry. Track rolling frame time; if sustained FPS falls below 30 for five seconds, reduce pixel scale and disable vertex jitter without altering game state. Expose the active quality tier in the settings drawer. The character loader catches a missing or invalid optional GLB and renders `PlaceholderCharacter`; assert this in `tests/scene/characterModel.test.tsx`.

Exercise all three quality tiers from `docs/design/visual-direction.md`. Record a SpectorJS or equivalent capture for the busiest greybox frame only when performance misses target; diagnose draw calls, unique materials, texture pressure, shader churn, and asset stalls before redesigning the scene.

- [ ] **Step 6: Pass scene tests and commit**

Run: `npm run test -- tests/scene`

Expected: phase, persistence, ghost, and fallback tests pass.

```bash
git add src/scene tests/scene
git commit -m "feat: add isometric retro 3d scene"
```

---

### Task 9: Screen Flow and End-to-End Local Game Integration

**Owner:** Lead integrates frontend/3D and backend branches

**Files:**
- Create: `src/game/GameShell.tsx`
- Create: `src/audio/AudioDirector.ts`, `src/audio/audioSettings.ts`
- Create: screen files under `src/game/screens`
- Modify: `src/app/App.tsx`, `src/app/routes.ts`
- Test: `tests/client/screens.test.tsx`, `e2e/multiplayer.spec.ts`

**Interfaces:**
- Consumes: client store/commands, design system, persistent canvas, authoritative snapshots
- Produces: complete create → lobby → intro → ten rounds → ending flow

- [ ] **Step 1: Write failing route and screen tests**

Test create/join validation, session code display, unique self-service character selection, “Player as Character” labels, host-only lobby removal/start, ready toggles, reconnect banner, disabled duplicate vote, private pre-reveal UI, anonymous revealed totals, consequence display, ghost styling, audio controls, and ending summary. Assert navigation does not recreate `GameCanvas` between game phases.

- [ ] **Step 2: Assemble title, create, join, and lobby screens**

Use URL routes `/`, `/join/:code`, `/session/:code`, and development-only `/ui-lab`. Password fields use autocomplete values appropriate to a one-off room. Copying a join link copies only `/join/:code`, never password, ticket, player ID, or resume token.

Build join links from the current origin so LAN clients receive the laptop IP rather than `localhost`. If the Clipboard API is unavailable on a non-secure LAN origin, show the full selectable URL and a clear manual-copy fallback.

The lobby renders the authoritative character catalog and claims. A player may select or change only their own unclaimed character before readying. The host's remove control requires confirmation, is hidden for the host's own row, and disappears once the game starts.

- [ ] **Step 3: Assemble game and ending screens around the playfield**

Keep one compact resource strip and connection indicator persistent. Show `DecisionConsole` contextually during decisions, `ConsequencePanel` during reveal, and `EndingSummary` after the tenth card. The center and lower-middle scene remain unobstructed outside modal/reveal states.

Implement `AudioDirector` outside the Canvas using browser audio elements or Web Audio primitives, with no gameplay dependency. It starts only from a user gesture, follows phase/outcome IDs idempotently, avoids duplicate playback after reconnect/re-render, and persists master/music/effects/mute settings locally. Missing or blocked audio reports a non-fatal state and leaves the game fully playable.

- [ ] **Step 4: Write a deterministic three-context Playwright flow**

The test creates a room as Ana, joins as Bo and Cy, claims three different logical characters, verifies a duplicate claim is rejected, removes and rejoins a lobby player, readies all players, starts, completes ten decisions, verifies anonymous reveal totals, forces one elimination through test-only deterministic randomness, confirms the ghost can vote, refreshes Bo and recovers identity/character, disconnects Ana for 30 seconds, and confirms host migration. Test-only controls are compiled only when `IEOY_E2E_MODE=1` in local/test builds and the bundle checker rejects them in a production build.

- [ ] **Step 5: Run the integrated local flow**

Run the server in terminal A:

```bash
IEOY_E2E_MODE=1 npm run dev
```

Then run the browser test in terminal B:

```bash
npm run test:e2e -- e2e/multiplayer.spec.ts
```

Expected: the complete three-player session passes with identical final revision and ending ID in all contexts.

- [ ] **Step 6: Commit the integrated vertical slice**

```bash
git add src/app src/audio src/game tests/client/screens.test.tsx e2e/multiplayer.spec.ts
git commit -m "feat: integrate complete local game flow"
```

---

### Task 10: Character and Media Asset Intake Pipeline

**Owner:** Content/assets agent

**Files:**
- Create: `docs/assets/character-contract.md`, `docs/licenses/assets.md`
- Create: `scripts/optimize-character.mjs`
- Create: `public/models/characters/manifest.json`
- Create: `public/audio/manifest.json`
- Test: `tests/shared/characterManifest.test.ts`, `tests/shared/audioManifest.test.ts`

**Interfaces:**
- Consumes initially: repository-approved `3d_assets/Daniel_model.glb`
- Consumes later: `.glb`, `.gltf` package, or `.fbx` source with an explicit permission record
- Produces: optimized `public/models/characters/daniel.glb` without modifying the source
- Produces manifest entries `{ id, displayName, url, heightMeters, animationMap, license, repositoryApproved, deploymentApproved }`
- Produces an audio manifest with stable cue IDs, URLs, categories, licenses, loop flags, and normalized default gains

- [ ] **Step 1: Document the intake contract and inspected source**

Keep `3d_assets/Daniel_model.glb` unchanged as the committed source. Its inspection record is `docs/assets/daniel-model-inspection.md`: valid GLB 2.0, about 7.7 MiB, one skinned mesh/material, 3,304 uploaded vertices, 4,769 triangles, three 2048×2048 textures, and 33 animation clips. It has no validation errors; record and test the tangent-space and non-root-skinned-node warnings.

Use `asset-intake/characters/` only for future unapproved sources and keep that directory gitignored. Document Y-up, +Z forward, meters, feet origin, semantic animation mapping, 64–256px runtime texture targets, and separate repository/deployment approval flags. State that FBX conversion requires a user-provided conversion tool or re-export; the project does not install Blender.

For audio, accept only original recordings or assets whose license permits redistribution. Record source URL, author, license, and required attribution. Keep individual effects short and compressed for browsers; provide a silent/missing-cue fallback so audio loading never blocks the game.

- [ ] **Step 2: Write failing manifest tests**

Reject duplicate IDs, missing GLB URLs, path traversal, textures over the configured budget, unknown semantic animation keys, source clip mappings that do not exist, and committed assets without `repositoryApproved: true`. The Daniel entry maps `Idle → idle`, `ReactPositive → agree`, `ReactFunny → laugh_02`, `Panic → afraid`, `Hurt → hit_to_stomach`, `Death → fall`, `OnFire → fire`, and `GhostIdle → idle`; source clips do not need renaming. Audio manifest tests reject duplicate cue IDs, remote runtime URLs, missing license records, unsupported media types, invalid loop/category/gain values, and unbounded file sizes.

- [ ] **Step 3: Implement GLB optimization and inspection**

The script accepts explicit input/output paths, allows source input only under `3d_assets` or gitignored `asset-intake/characters`, and permits output only under `public/models/characters`. It validates glTF, keeps only manifest-mapped clips, prunes, deduplicates, applies Meshopt compression using the lockfile-pinned `meshoptimizer`, and prints before/after byte counts plus mesh/material/texture/clip counts. It never overwrites a source file.

For the first PS1-style derivative, resize the base-color texture to 256×256 and remove the normal and metallic/roughness textures. This resolves the generated-tangent-space warning and avoids roughly 67 MiB of uncompressed texture memory. Retain those maps only if a side-by-side greybox review proves they materially improve the intended style.

Also print triangle, node, skin, and animation counts and verify feet-origin, +Z forward, stable node names, and the non-root skinned mesh behavior after scale normalization. Target at most 2 MiB for the initial optimized GLB, then revise only if visual and animation tests justify it.

- [ ] **Step 4: Validate the manifest against the frontend loader contract**

Validate that each manifest entry matches the frontend-owned loader contract from Task 8. Task 8 preloads the optimized GLB with `useGLTF`, imports `MeshoptDecoder` from the lockfile-pinned `meshoptimizer` package, configures `GLTFLoader.setMeshoptDecoder`, clones skinned scenes per slot while sharing geometry/textures, maps semantic actions through `animationMap`, normalizes the approximately one-unit source height using `heightMeters`, and applies per-slot PS1 material/tint settings after clone. The content/assets agent does not modify those runtime files. Missing assets fall back per character rather than blanking the entire cast.

- [ ] **Step 5: Validate supplied assets when available**

Run for the inspected Daniel source:

```bash
node scripts/optimize-character.mjs 3d_assets/Daniel_model.glb public/models/characters/daniel.glb --profile ps1-character --clips idle,agree,cheer,laugh_02,afraid,hit_to_stomach,fall,fire
npm run test -- tests/shared/characterManifest.test.ts tests/shared/audioManifest.test.ts
```

Expected: the optimized model validates, stays at or below the initial 2 MiB target, and loads into every logical test slot with shared geometry/textures but independent tint, animation, and ghost state. All semantic animation mappings play without console errors, and the source file hash remains unchanged.

- [ ] **Step 6: Commit only approved runtime assets and records**

```bash
git add 3d_assets/Daniel_model.glb .gitignore docs/assets docs/licenses scripts/optimize-character.mjs public/models/characters public/audio tests/shared/characterManifest.test.ts tests/shared/audioManifest.test.ts
git commit -m "feat: add safe browser media pipelines"
```

---

### Task 11: Accessibility, Responsive Layout, Privacy, and Abuse Checks

**Owner:** Lead with frontend and backend reviewers

**Files:**
- Modify: UI/scene/server files identified by failing checks
- Create: `e2e/responsive.spec.ts`, `tests/worker/security.test.ts`
- Modify: `scripts/check-deploy-bundle.mjs`

**Interfaces:**
- Consumes: complete local game
- Produces: enforceable release checks

- [ ] **Step 1: Add keyboard, reduced-motion, and responsive browser tests**

Run create/join/vote/settings using keyboard only. At 390×844 and 1024×768, assert the active vote action remains visible, no horizontal scroll appears, and the playfield is not fully covered. Emulate reduced motion and assert the crash uses the shortened presentation and no camera shake.

Also test number-key voting, focus restoration after closing the settings drawer, countdown announcement thresholds, resize during every game phase, WebGL context loss/retry, slow GLB fallback, and each adaptive quality tier. Capture screenshots for visual failures and assign likely ownership to simulation, renderer, frontend, or asset pipeline.

Test desktop first, then the same critical create/join/select/vote/settings flow on the mobile viewport. Test audio starting only after a user gesture, master/music/effects changes, mute persistence, missing-file fallback, and idempotent phase cues after reconnect. Mobile may select a reduced renderer tier but cannot lose a gameplay action.

- [ ] **Step 2: Add adversarial Worker tests**

Send oversized bodies/frames, malformed JSON, unknown discriminators, invalid option IDs, duplicate/unknown character claims, attempts to select another player's character, non-host start/removal, mid-game removal, cross-room tickets, reused tickets, forged resume tokens, more than eight joins, and rapid password failures. Assert stable errors, no state mutation, and no server stack traces or secrets in responses.

Add production response headers after checking the current Cloudflare/Vite asset behavior: a restrictive same-origin Content Security Policy compatible with WebSocket connections and self-hosted fonts, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and an appropriate `Permissions-Policy`. Verify API responses remain `Cache-Control: no-store` and static hashed assets remain cacheable.

- [ ] **Step 3: Implement deploy-bundle inspection**

Fail when `dist` contains extensions `.fbx`, `.blend`, `.psd`, `.tif`, `.heic`, files under `asset-intake` or `3d_assets`, the exact source filename/hash for `Daniel_model.glb`, or an unoptimized source-model URL. The optimized `public/models/characters/daniel.glb` is allowed. Also fail on the strings `IEOY_E2E_MODE`, known local test tokens, `.dev.vars`, or source-photo filenames. Print every offending path/string and exit nonzero.

- [ ] **Step 4: Run all release checks**

Run:

```bash
npm run check
npm run test:e2e
```

Expected: typecheck, unit, Worker, build, bundle inspection, multiplayer, responsive, reduced-motion, and visual tests all pass.

Run the full browser flow in Chromium, Firefox, and WebKit after the browser/device decision is confirmed. At minimum, capture visual baselines in Chromium and smoke-test the other required engines; record any intentional quality-tier differences.

- [ ] **Step 5: Commit hardening**

```bash
git add src worker tests e2e scripts/check-deploy-bundle.mjs
git commit -m "test: harden local multiplayer release"
```

---

### Task 12: Local Acceptance Build and User Approval Gate

**Owner:** Lead/integration agent

**Files:**
- Create: `docs/local-acceptance.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: passing local release checks
- Produces: a reproducible local acceptance record; does not deploy

- [ ] **Step 1: Write exact local setup and test instructions**

Document Node.js 22.18+/npm prerequisites, `npm ci`, `npm run dev`, three-browser testing, local Durable Object reset through the project-local `.cloudflare/state/` directory used by the Cloudflare Vite plugin, character intake, all check commands, and known free-tier constraints. Also document `npm run dev:lan`, how to find the laptop's private LAN IP, the `http://<laptop-ip>:5174` join URL, trusted-network/firewall precautions, and shutdown. Do not include Cloudflare credentials or a deploy command in the quick-start path.

- [ ] **Step 2: Run the acceptance checklist manually**

Record pass/fail for: create/join, wrong password, eight-player cap, unique character selection, “Player as Character” labels, host lobby removal, host-only start, crash intro, private vote, anonymous reveal totals, deadline, tie, consequence, resource clamp, death-to-ghost, ghost vote, refresh recovery, host migration, ending, audio controls/fallback, reduced motion, retro-effects toggle, WebGL error, 1440×900, 1024×768, and 390×844. Verify three independent browser contexts use one local authoritative room; when a second physical device is available, join it over trusted Wi-Fi and verify voting plus reconnect against the laptop server.

- [ ] **Step 3: Capture evidence**

Save approved UI Lab, lobby, decision, consequence, ghost, and ending screenshots under `docs/acceptance/` and link them from `docs/local-acceptance.md`. The repository-approved Daniel derivative may appear in this local evidence. Record the `package-lock.json` hash and the output of `npm run check`.

- [ ] **Step 4: Stop for explicit approval**

Present the local URL, test results, screenshots, and remaining limitations. Do not authenticate, create Cloudflare resources, or run a deployment command until the user explicitly approves this local build.

- [ ] **Step 5: Commit the accepted local release candidate**

After approval:

```bash
git add README.md docs/local-acceptance.md docs/acceptance
git commit -m "docs: approve local island game release"
```

---

### Task 13: Cloudflare Free-Tier Deployment After Approval

**Owner:** Lead/integration agent

**Files:**
- Modify: `package.json`, `README.md`, `cloudflare.config.ts` only if current official schema requires it
- Create: `docs/deployment.md`

**Interfaces:**
- Consumes: explicit user approval and the accepted local build
- Produces: one `workers.dev` deployment and a smoke-test record

- [ ] **Step 1: Re-check current official Cloudflare requirements**

Use the installed `cf` CLI help/schema and current official Cloudflare documentation to reconfirm free-plan Durable Object availability, generated Vite Build Output, and the typed Durable Object export/binding fields. Record the exact CLI and version in `docs/deployment.md`. Do not migrate to Wrangler configuration.

- [ ] **Step 2: Authenticate interactively with the minimum required scope**

The user completes browser-based authentication. Never request that an API token be pasted into chat or committed. Confirm the target account and Worker name before any remote command.

- [ ] **Step 3: Perform a dry build/package validation**

Before packaging, update each shipped asset's manifest record to `deploymentApproved: true` only as part of the user's explicit deployment approval. Then run `cf build` and `cf deploy --dry-run`; the dry run does not authenticate or upload. Confirm one Durable Object binding, one live SQLite Durable Object export, SPA assets, no secrets, no source character files, and no referenced asset lacking deployment approval.

Enable Workers logs and traces using the current typed configuration schema, with bounded sampling appropriate to the free plan. Logs are structured JSON and may contain room lifecycle, phase, duration, outcome ID, and error code, but never display names, passwords, tickets, resume tokens, votes, IP addresses, or likeness metadata.

- [ ] **Step 4: Deploy once to `workers.dev`**

Add a `deploy` script only after the CLI choice is verified. Run it against the explicitly confirmed account and environment. Record the returned deployment/version identifier and URL without recording credentials.

- [ ] **Step 5: Run remote smoke tests**

Verify health, create, password failure, two-player join, start, one vote/reveal cycle, reconnect, and static asset loading. Do not run destructive load tests against the free account.

- [ ] **Step 6: Document rollback and free-tier observations**

Record the CLI's current rollback command/limitations, how to inspect logs, and any observed usage. Note that code rollback does not roll back Durable Object data.

- [ ] **Step 7: Commit deployment documentation**

```bash
git add package.json package-lock.json cloudflare.config.ts README.md docs/deployment.md
git commit -m "ops: document approved cloudflare deployment"
```

---

## Review and Merge Order

1. Merge Task 1, then Task 2; do not parallelize before shared contracts pass.
2. Run backend Tasks 3–5 sequentially on one branch.
3. In parallel, run frontend Tasks 6–8 with mocked snapshots and the content portion of Task 10 with placeholders.
4. Merge backend first, frontend second, then execute Task 9 as the integration gate.
5. Finish real character intake, hardening, and local acceptance in Tasks 10–12.
6. Execute Task 13 only after explicit local approval.

Every task receives a fresh implementation review before merge. The lead runs `npm run check` after each shared-contract or integration merge and rejects changes that leak server-only state into `src/client`, `src/game`, or `src/scene`.
