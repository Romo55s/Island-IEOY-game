# Cloudflare Platform Preflight

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

Retrieved: 2026-10-15 (America/Mexico_City)

Scope: read-only verification of the Cloudflare free-tier architecture for *Island of Extremely Questionable Judgment*. No authentication was attempted and no Cloudflare resource was created or changed.

## Decision

**Platform gate: GO, with one remaining local benchmark gate.**

The current Workers Free plan supports the proposed architecture: a Worker can route each game session to a SQLite-backed Durable Object, that object can coordinate server-side hibernating WebSockets, and the project can use the beta `cf` CLI with typed `cloudflare.config.ts` and the Cloudflare Vite plugin.

The free quotas are ample for a private prototype, provided the implementation uses the Hibernation WebSocket API and deletes expired room storage. The separate PBKDF2 performance benchmark required by the implementation plan is not part of this platform-only check and must still pass before the password iteration count is frozen.

## Verified free-plan availability and limits

| Item | Current documented value | Architectural consequence |
|---|---:|---|
| Durable Objects on Workers Free | Available, **SQLite storage only** | The proposed `GameRoom` is supported. Do not use the legacy key-value storage backend. |
| Durable Object requests | **100,000/day** | Includes HTTP requests, RPC sessions, incoming WebSocket messages, and alarm invocations. Cloudflare applies a 20:1 billing ratio to incoming WebSocket messages; 100 incoming messages count as five billed requests. |
| Durable Object duration | **13,000 GB-s/day** | Hibernating WebSockets are important because eligible idle objects do not accrue duration. Limits reset at 00:00 UTC. |
| SQLite row reads | **5 million/day** | More than sufficient for small ephemeral rooms. |
| SQLite rows written | **100,000/day** | State snapshots should remain compact; alarm writes and deletes also count as writes. |
| Durable Object storage per free account | **5 GB total** | Expiring rooms and calling `deleteAll()` are required to avoid accumulating storage. |
| Durable Object storage per object | **Use 1 GB as the conservative Free-plan ceiling** | Cloudflare's limits table displays 10 GB per SQLite-backed object, but the same official page's FAQ says writes fail at 1 GB on Free. This game should stay many orders of magnitude below either value. |
| Durable Object classes per free account | **100** | This project needs one class, not one class per room. Individual object instances are unlimited within the account/class. |
| Worker requests | **100,000/day** | This is the outer Worker quota. Keep HTTP endpoints bounded and avoid unnecessary polling. |
| Worker memory | **128 MB** | Keep room state and WebSocket attachments compact. |

Primary sources:

- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects on the Workers Free plan announcement](https://developers.cloudflare.com/changelog/post/2025-04-07-durable-objects-free-tier/)

## Worker CPU versus Durable Object CPU

These are distinct limits and must not be conflated:

- A normal HTTP request entering a Worker on Workers Free has **10 ms of CPU time**.
- A Durable Object invocation has **30 seconds of active CPU time by default** for each HTTP request, RPC request, WebSocket message, or alarm. Cloudflare documents this as configurable up to five minutes, although this game should not need an increased limit.
- CPU time excludes time waiting on network and storage I/O.
- Durable Object RPC/HTTP wall time has no hard limit while the caller remains connected; alarms have a 15-minute wall-time limit.

Therefore the entry Worker should only validate/bound the request and forward it. Password derivation belongs inside the Durable Object invocation as planned. The 30-second Durable Object ceiling makes the architecture feasible, but it does not replace the required local PBKDF2 p95 benchmark.

Sources:

- [Workers limits: account and CPU limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects limits and CPU FAQ](https://developers.cloudflare.com/durable-objects/platform/limits/)

## Hibernating WebSockets

The Hibernation WebSocket API is currently supported and recommended when a Durable Object acts as the WebSocket server:

- Clients remain connected while the Durable Object is removed from memory.
- Eligible idle time does not accrue Durable Object duration.
- A new event reconstructs the object and runs its constructor, so authoritative game state must be persisted and connection metadata must use WebSocket attachments/tags rather than in-memory-only state.
- Hibernation is for inbound/server WebSockets; it is not available for an outgoing WebSocket opened by a Durable Object.
- The platform limit is 32,768 accepted hibernating WebSockets per object and 32 MiB per received WebSocket message. The game's eight-player and 4 KiB protocol limits are safely below these values.

Sources:

- [Use WebSockets with Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [WebSocket Hibernation server example](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)
- [Durable Object State WebSocket API](https://developers.cloudflare.com/durable-objects/api/state/)
- [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)

## `cf`, Node.js, Vite, and typed configuration

Current requirements and status:

- Cloudflare's `cf` CLI requires **Node.js 22.18 or later** for `cloudflare.config.ts`; Bun is not supported for this configuration path.
- The local machine currently has Node.js **v24.16.0** and npm **11.13.0**, satisfying the Node requirement.
- Neither `cf` nor its `cloudflare` alias is currently installed on `PATH`, and this repository does not yet have a `package.json`. The implementation must install `cf` as a locked development dependency before CLI validation.
- `cf` and `cloudflare.config.ts` are **beta**. Cloudflare warns that commands, configuration, and Build Output may change before stable release.
- Current official `cf` documentation uses the **Cloudflare Vite plugin 2.0 beta**, installed as `@cloudflare/vite-plugin@beta`; that path does not depend on Wrangler.
- `cf dev`, `cf build`, and `cf deploy` use `cloudflare.config.ts`. Builds produce standardized Build Output under `.cloudflare/output/v0/`.
- `cf deploy --dry-run` builds and validates without credentials, API requests, or uploads. Authentication is required only for a real deployment.
- Cloudflare documentation supports Vite 6 and Vite 7, but the beta toolchain can move. Resolve mutually compatible current packages during Task 1 and rely on the committed lockfile rather than assuming a Vite major from memory.

Package metadata observed during research identifies the public `cf` package as a beta release and the public `@cloudflare/vite-plugin` package as the official Workers SDK plugin. Exact installed versions must be recorded after Task 1 because neither package is installed locally yet.

Sources:

- [`cf` requirements and installation](https://developers.cloudflare.com/cf/get-started/)
- [`cf` project development, builds, and deployment](https://developers.cloudflare.com/cf/projects/)
- [`cf` overview and beta status](https://developers.cloudflare.com/cf/)
- [Cloudflare Vite plugin Vite 7 support](https://developers.cloudflare.com/changelog/post/2025-07-17-vite-plugin-vite-7-support/)
- [`cf` npm package metadata](https://www.npmjs.com/package/cf)
- [`@cloudflare/vite-plugin` npm package metadata](https://www.npmjs.com/package/@cloudflare/vite-plugin)

## Typed `cloudflare.config.ts` feasibility

The typed configuration can express all required deployment state without a Wrangler configuration:

- Import `defineConfig`, `bindings`, and `exports` from `cf/config`.
- Import the Worker entry module with the `cf-worker` import attribute.
- Declare `GameRoom` in `worker.exports` with `exports.durableObject({ storage: "sqlite" })`. This typed export replaces a hand-written ordered migration for a newly created class.
- Bind `env.GAME_ROOM` with `bindings.durableObject({ worker: "ieoy-game", exportName: "GameRoom" })`.
- Use the Vite build's client output for static assets and configure SPA not-found behavior in the Worker assets options; `cloudflare.config.ts` does not take an assets directory for a Vite project.
- Generate binding/runtime types with `cf workers types`, which writes `.cloudflare/types/index.d.ts`.
- Include `cloudflare.config.ts` and `.cloudflare/types` explicitly in TypeScript configuration. A `.ts` entrypoint import requires `allowImportingTsExtensions: true` with `noEmit: true`.

This exactly covers the planned single Worker, one SQLite Durable Object class, environment binding, React/Vite SPA, local development, dry run, and eventual `workers.dev` deployment.

Sources:

- [Programmatic `cloudflare.config.ts` configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [Durable Object class exports and lifecycle](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [`cf` Worker project workflow](https://developers.cloudflare.com/cf/projects/)

## Uncertainties and follow-up checks

1. **Per-object storage wording conflicts in Cloudflare's current limits page.** The general table says 10 GB per SQLite-backed object, while its FAQ says 1 GB on Workers Free. Treat 1 GB as the operational ceiling and recheck before deployment. This does not threaten the project because a room contains only compact game state and expires after two hours.
2. **The `cf`/typed-config/Vite 2.0 path is beta.** Freeze resolved package versions in `package-lock.json`, run `cf workers types`, `cf build`, and `cf deploy --dry-run` locally, and re-read the official schema before actual deployment.
3. **No CLI binary is installed yet.** Package-level commands and generated configuration cannot be validated until Task 1 installs the dependencies. No authentication is needed for type generation, build, or dry-run validation.
4. **The password cost remains an application benchmark.** Run the separate Node Web Crypto PBKDF2 benchmark before choosing the iteration count; do not infer runtime performance solely from the 30-second platform ceiling.

No platform limit found here requires a paid plan or a backend redesign.
