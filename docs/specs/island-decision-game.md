# Island Decision Game Product and Technical Specification

## Product Summary

Build **Island of Extremely Questionable Judgment**, a private, browser-based multiplayer party game for a group of coworkers and friends. An airplane crashes on a tropical island, the survivors face ten absurd survival decisions, and every connected player privately votes. The server resolves the majority choice and a weighted consequence, which can change shared resources or permanently kill a character. Dead characters become ghosts and continue voting.

The experience should feel like a readable late-1990s console survival game with dark comedy rather than a generic web dashboard. Players do not directly control characters or the camera.

## Success Criteria

- Two to eight players can create or join a password-protected session using a six-character code.
- Each player chooses one unclaimed character in the lobby; the roster displays “Player as Character.”
- A complete session lasts approximately 10–15 minutes and contains exactly ten decisions.
- All players see the same authoritative phase, deadline, selected choice, consequence, resources, and character states.
- Individual votes and live option totals remain private until the server resolves a decision.
- A resolved decision reveals anonymous option totals and the winning option, never player-to-vote mappings.
- A dead character is visibly represented as a ghost and retains the ability to vote.
- Refreshing or briefly losing the connection restores the same player for up to two hours after the session's last valid activity.
- If the host remains disconnected for 30 seconds, host authority transfers to the longest-connected eligible player.
- Each decision provides 25 seconds to read and discuss, then opens a 15-second voting window. It resolves after every eligible player votes or the voting window ends.
- The complete experience runs locally before any remote deployment is attempted.
- During local validation, the developer laptop runs the SPA, Worker routes, WebSocket room server, and Durable Object emulation. Independent browsers on that laptop—and optionally phones or laptops on the same trusted LAN—connect to that one authoritative local server.
- Deployment is performed only after explicit approval of the local acceptance build.

## Audience and Content Boundaries

- The intended audience is a private adult friend group.
- Humor may be dark and slapstick, but avoid hate speech, sexual violence, torture detail, or graphic gore.
- Coworker likenesses, names, voices, and personal photographs are not shipped without each person's permission.
- Sony and PlayStation trademarks, boot screens, logos, button glyphs, sounds, and proprietary assets are not used. “PS1-inspired” refers only to an original low-poly, low-resolution visual language.

## Locked Technology Choices

- Language: TypeScript with strict type checking.
- Package manager: npm with a committed `package-lock.json`.
- Frontend: React, Vite, React Three Fiber, Three.js, and Drei.
- Backend: a Cloudflare Worker with one PartyServer/Durable Object instance per session.
- Realtime transport: PartySocket/WebSocket using a shared, runtime-validated message protocol.
- Validation: Zod schemas shared by browser and Worker code.
- Tests: Vitest for shared/client tests, Cloudflare's Vitest integration for Worker/Durable Object tests, and Playwright for browser flows and visual snapshots.
- Hosting target: one Cloudflare Worker serving the React SPA and realtime/API routes on the Cloudflare free plan, initially under `workers.dev`.
- Persistence: Durable Object storage only; no user accounts and no external database.
- Local runtime: Node.js 22.18 or later, Cloudflare's `cf` CLI, typed `cloudflare.config.ts`, the Cloudflare Vite plugin, and local Durable Object emulation.
- Runtime character format: optimized `.glb` using glTF 2.0 conventions.

Dependency versions are resolved to mutually compatible current releases when Task 1 is executed and are then frozen by `package-lock.json`. No dependency uses an unbounded version range.

The confirmed choices are recorded in `docs/specs/open-decisions.md` and incorporated into this specification.

## Architecture

The repository is a single full-stack Vite project. `src/` contains the React application, DOM interface, R3F scene, client connection state, shared protocol, and shared game rules. `worker/` contains the Worker entry point and PartyServer room implementation. Both sides import the same schemas and domain types from `src/shared/`.

The Worker owns all security-sensitive and authoritative behavior: session creation, password verification, one-time connection tickets, player identity, timers, host migration, vote privacy, majority/tie resolution, randomized consequences, character death, persistence, and expiry. Clients send intentions only and render server snapshots.

One named Durable Object represents one six-character session code. PartyServer hibernation is enabled. Durable state includes absolute deadlines, so wake-up processing and alarms recover correctly after eviction. The Worker exposes only the public creation/ticket endpoints and the WebSocket route; internal room initialization is not publicly forwarded.

Server timestamps are authoritative. Welcome and pong messages include server time so the client can estimate clock offset and render countdowns from absolute deadlines; local animation timing never decides when a vote opens or closes.

Local development binds to loopback by default. An explicit LAN mode binds the same-origin server to the laptop's network interface so other devices on the same trusted Wi-Fi can join through `http://<laptop-ip>:5174`. LAN mode is not an internet deployment, does not use Cloudflare credentials, and must never hardcode `localhost` into join links or WebSocket URLs.

## Session and Identity Rules

- Session codes use six uppercase characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, excluding visually ambiguous characters.
- Passwords contain 4–64 Unicode characters and are stored only as a salted digest.
- Display names contain 1–24 visible characters after trimming.
- Player display names and character display names are distinct. The same character cannot be claimed by two players in one room.
- Session capacity is eight players; the minimum to start is two.
- Creation and join endpoints issue a cryptographically random, single-use connection ticket valid for 60 seconds.
- Issuing a ticket does not reserve a roster slot. A player roster slot is created atomically when a valid ticket is consumed, capacity is checked again at that moment, and the player claims a character afterward in the lobby.
- Successful admission issues a cryptographically random resume token stored in browser `sessionStorage`; it is never placed in a URL.
- Failed password attempts are limited per session and network address to five attempts in a rolling 60-second window.
- A reconnect with a valid resume token reclaims the prior player identity and character claim.
- The resume token is scoped to the current browser session. The newest valid connection replaces an older live connection for the same player, preventing two tabs from casting as one identity.
- New joins are rejected after the game starts; reconnects remain allowed.
- Before the game starts, the host may remove another player from the lobby. The host cannot remove players, pause, force a vote, or skip a phase after the game starts.
- Changing character selection clears the player's ready state. Host removal revokes that player's resume token and releases the character claim, so removal cannot be bypassed by reconnecting.
- Session storage expires two hours after the last valid connection or player action.

## Authoritative Game Model

### Phases

`lobby → intro → decision → reveal → decision … → ending → expired`

- Only the current host can start from the lobby.
- The intro is a synchronized, non-interactive airplane-crash sequence.
- The first decision begins when the intro deadline elapses.
- The intro lasts 30 seconds in the normal game.
- A decision displays for 25 seconds before voting opens; its voting window is exactly 15 seconds.
- A decision resolves when all connected eligible voters have submitted after voting opens or its voting deadline elapses.
- Reveal lasts 20 seconds, then advances automatically.
- After ten resolved decisions, the room enters the ending phase.

### Voting

- Every admitted player, alive or ghost, has one vote.
- The server acknowledges whether the current player has voted but never sends their selected option back in shared snapshots before reveal.
- Live option counts and other players' selections are not broadcast.
- During reveal, every client receives the anonymous total for each option plus the winning option; individual selections remain server-only.
- A player may replace their own vote before the deadline.
- Disconnected players are not required for early resolution; if they reconnect before the deadline, they may vote.
- The option with the most votes wins.
- Ties are resolved uniformly by the server among the tied options.
- If no votes are received, the server chooses uniformly from all options.

### Consequences and Resources

- Exactly ten authored decision cards are selected without repetition for the initial game.
- The same authored ten-card deck is shuffled for each session. Choices affect resources, character state, event history, and the ending, but do not branch to a different card graph in the first release.
- Each option defines weighted outcomes; the server chooses one outcome using cryptographically sourced randomness behind an injectable random interface for tests.
- Shared resources are integer values clamped to `0..100`: food, health, morale, and shelter.
- An outcome may adjust resources, add a short event entry, or eliminate one eligible living character.
- Character elimination is permanent for that session. The associated player becomes a ghost immediately.
- The ending is derived from survivor count and final resource bands and is identical for all clients.

## Realtime Protocol

All messages use a versioned JSON envelope. HTTP request, success, and error bodies are also shared strict schemas imported by both the Worker and browser; the backend and frontend do not define endpoint payloads independently. Browser-to-server commands are:

- `character.select`
- `room.remove-player`
- `room.set-ready`
- `room.start`
- `vote.submit`
- `client.ping`

Server-to-browser events are:

- `session.welcome`
- `state.snapshot`
- `command.rejected`
- `server.pong`

Every command contains `protocolVersion`, `commandId`, and its typed payload. The server validates every message, rejects malformed or unauthorized commands without mutating state, and returns a stable error code. Snapshots include a monotonically increasing revision; clients ignore older revisions. Because `viewer.hasVoted` is private and viewer-specific, the server constructs and sends a separate public snapshot for each connection.

## Visual Direction

The concrete palette, typography, HUD budgets, responsive wireframes, motion rules, and quality ladder are defined in `docs/design/visual-direction.md`.

### Scene

- Fixed orthographic isometric camera; no camera controls during play.
- Tropical island at dusk with an original low-poly visual language.
- Low-resolution 3D render is upscaled with nearest-neighbor sampling while text and controls remain native-resolution DOM elements.
- Materials use small textures, limited palettes, flat or restrained lighting, visible vertex/affine-style instability, distance fog, and restrained dithering.
- Character animation is intentionally stepped at approximately 12–24 frames per second while UI input and networking remain responsive.
- Retro effects can be reduced or disabled without changing game state.
- The airplane and initial island may use original procedural low-poly geometry so the local build does not depend on an external asset license.

### Atomic Design System

- Spacing follows a 4px base grid.
- Panels use 2px borders, hard offset shadows, clipped or chamfered corners, and no glassmorphism.
- Typography pairs an original or freely licensed pixel-style display face with IBM Plex Mono or a comparable OFL-licensed monospace face.
- Persistent HUD covers no more than roughly 25% of the desktop viewport and keeps the center and lower-middle playfield clear.
- The signature UI motif is a damaged safety card connected to a black-box decision recorder; choice panels become stamped incident reports during consequences.
- Atoms: button, label, icon, meter, badge, divider, focus ring.
- Molecules: resource meter, player row, vote option, code display, connection banner.
- Organisms: lobby roster, decision console, consequence panel, pause/settings drawer, ending summary.
- Screens: title/create, join, lobby, game, ending, and a development-only UI Lab.
- All voting, menus, status text, and settings remain DOM-based rather than embedded in WebGL.

### Audio and Language

- The first release includes one subtle ambient loop plus original or freely licensed crash, vote, consequence, fire, and ghost effects.
- Audio starts only after a user gesture and exposes master, music, and effects volume controls plus mute.
- Audio never controls authoritative timing and gracefully remains silent when browser autoplay policy blocks playback.
- Authored interface and game strings ship in English and remain centralized so Spanish can be added later without changing components or protocol shapes.

## Character Asset Contract

- Preferred input: a rigged `.glb` containing mesh, materials, textures, and animation clips.
- Accepted conversion inputs: `.gltf` with all referenced files, or `.fbx`; these are source inputs, not shipped runtime files.
- Required orientation: Y-up, forward along +Z, meters, origin centered at the feet.
- Required semantic action: `Idle`; optional actions include `ReactPositive`, `ReactFunny`, `Panic`, `Hurt`, `Death`, `OnFire`, and `GhostIdle`. A manifest maps these actions to each asset's real clip names, so source clips do not need destructive renaming.
- Each character is normalized to a common height and slot footprint during preprocessing.
- Runtime character textures target 64–256 pixels per side unless visual testing proves a higher resolution necessary. Preserve higher-resolution source assets unchanged.
- glTF Transform performs validation, pruning, deduplication, Meshopt compression where compatible, and texture resizing/conversion.
- Source files and personal photos remain in a gitignored local intake directory. Only approved, optimized runtime files and a metadata manifest are eligible for the deployed bundle.
- The build must work with generated placeholder survivors until approved character models are supplied.
- Initial testing uses the repository asset `3d_assets/Daniel_model.glb`. A separate optimized runtime derivative is cloned across all logical character slots; each slot still has an independent name, tint accent, animation state, and ghost state.
- The user approves keeping the source and optimized derivative in GitHub. Preserve the source unchanged, record the inspection in `docs/assets/daniel-model-inspection.md`, and perform remote deployment only after the existing explicit release approval gate.

## Accessibility and Device Support

- All critical actions are keyboard reachable and have visible focus states.
- Status is not conveyed by color alone.
- Vote choices have programmatic labels and disabled/submitted states.
- Keyboard defaults are `Tab`/`Shift+Tab` to navigate, `Enter`/`Space` to activate, `1`–`3` to choose a visible vote option, and `Escape` to close the topmost drawer or modal.
- Countdown changes are not announced every second; assistive announcements occur when voting opens, at ten and five seconds remaining, and when voting closes.
- A reduced-motion preference skips non-essential camera shake, flashing, and UI animation; the crash intro becomes a short crossfade sequence.
- A reduced-retro-effects setting disables vertex jitter/dither while retaining the low-poly art direction.
- Layout supports current desktop and mobile evergreen browsers. Desktop is the primary design and QA priority; mobile remains fully playable with adaptive quality. The primary acceptance viewport is 1440×900; secondary checks are 390×844 and 1024×768.
- WebGL failure produces a readable DOM error with retry guidance rather than a blank screen.
- Context loss, viewport resizing, slow GLB loading, and adaptive quality transitions are explicit browser test cases.

## Local-First Delivery Gates

1. UI Lab approval: tokens and representative components are reviewed before full screen assembly.
2. Greybox approval: one local browser renders the island, placeholders, intro, decision, reveal, and ending.
3. Multiplayer approval: at least three local browser contexts complete a full game with reconnect, ghost voting, and host migration.
   When another device is available, also smoke-test one physical phone or laptop over the same trusted LAN against the developer laptop server.
4. Asset approval: approved character GLBs pass validation and load within the agreed budgets.
5. Local release approval: automated checks pass and the user explicitly confirms behavior and visual direction.
6. Deployment: only after Gate 5, configure Cloudflare authentication and deploy to a free `workers.dev` target.

## Team Execution Model

- Lead/integration agent owns repository scaffolding, shared schemas, integration order, reviews, and release gates.
- Backend agent owns Worker routing, PartyServer/Durable Object state, authorization, timers, and Worker tests.
- Frontend/3D agent owns React screens, client connection state, R3F scene composition, and PS1-inspired rendering.
- Content/assets agent owns decision-card data, placeholder geometry, character intake validation, manifests, and license records.
- Parallel work starts only after the foundation and shared protocol are committed. Each role works in non-overlapping feature directories and integrates through the shared contracts.

## Testing Requirements

- Shared schema tests cover every message discriminator, invalid input, and snapshot revision rule.
- Rules-engine tests use seeded random values and cover majority, tie, no-vote, weighted outcome boundaries, resource clamping, death, ghost voting, and ending derivation.
- Durable Object tests cover creation, password/ticket admission, capacity, late join rejection, private voting, reconnect, stale commands, host migration, alarm recovery, and two-hour expiry.
- React tests cover screen routing, keyboard interaction, connection banners, and authoritative snapshot rendering.
- Playwright runs three browser contexts through a complete deterministic game and verifies refresh recovery, disconnect behavior, visual snapshots, reduced motion, and mobile layout.
- Build output is inspected for accidentally bundled source character files, personal photos, secrets, and unapproved licenses.
- Audio tests cover user-gesture startup, mute, independent volume controls, missing-file fallback, and phase changes without duplicate playback.
- Performance acceptance on a typical laptop is a stable 30 FPS minimum during the busiest greybox scene, with a target of 60 FPS; mobile uses adaptive DPR/effects if needed.
- Browser performance review records draw calls, material count, texture memory, asset decode stalls, and initial transferred asset bytes before changing renderer architecture.

## Non-Goals for the First Release

- Public matchmaking or discoverable rooms.
- Accounts, profiles, progression, analytics, chat, or permanent game history.
- Direct character control, combat, physics-driven gameplay, or free camera movement.
- A physics engine; the crash, reactions, and character staging are authored animations rather than rigid-body simulation.
- A content-management system or in-browser scenario editor.
- Paid assets, paid infrastructure, or a traditional database.
- More than one island, more than ten decisions per session, or procedural narrative generation.
- Spanish localization in the first release.
