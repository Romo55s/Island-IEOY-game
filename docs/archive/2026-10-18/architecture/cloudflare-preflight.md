# Cloudflare and Local Runtime Preflight

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

Date: 2026-10-15 (America/Mexico_City)

## Decision

**GO.** The prototype can begin locally with the planned React Three Fiber client, Cloudflare Worker entrypoint, and one SQLite-backed Durable Object per room. No Cloudflare login, resource creation, or deployment was performed.

The detailed platform evidence is recorded in [cloudflare-preflight-platform.md](./cloudflare-preflight-platform.md).

## Local environment

- macOS arm64 on Apple M5 with 16 GiB memory
- Node.js 24.16.0, satisfying the `cf` typed-config minimum of Node.js 22.18
- npm 11.13.0 and Git 2.50.1
- Port 5173 belongs to another project and must not be disturbed
- Port 5174 is free and is the strict local game port
- `3d_assets/Daniel_model.glb` is present and valid
- No globally installed Cloudflare CLI is required; the project will pin `cf` locally

## PBKDF2 benchmark

Node Web Crypto PBKDF2-SHA-256 was measured at 100,000 iterations across 20 samples:

| Statistic | Result |
|---|---:|
| Median | 7.113 ms |
| p95 | 7.419 ms |
| Minimum | 6.975 ms |
| Maximum | 7.513 ms |
| Pass threshold | p95 < 250 ms |

The gate passes with substantial headroom. The room password derivation constant is therefore fixed at **100,000 iterations**, together with a 16-byte random salt and the planned five-attempt/60-second rate limiter.

## Platform conclusions

- Workers Free currently supports SQLite-backed Durable Objects.
- A room is one Durable Object instance of the shared `GameRoom` class, not a separate class.
- Hibernating WebSockets are the correct transport for eight-player ephemeral rooms.
- The entry Worker must stay thin because its Free-plan CPU allowance is smaller than a Durable Object invocation's allowance.
- The free request, duration, storage, and class quotas are sufficient for this private prototype.
- Expired room state must be deleted and the implementation should conservatively treat 1 GB as the per-object Free-plan storage ceiling despite conflicting official wording. The actual room state will be many orders of magnitude smaller.
- `cf`, `cloudflare.config.ts`, and Cloudflare Vite plugin 2.0 are beta. Exact resolved versions will be locked, and local type generation/build/dry-run checks are required before any future deployment decision.

## Task 1 dependency corrections

- Add direct development dependencies for `@types/react`, `@types/react-dom`, `@types/node`, and `@cloudflare/workers-types`.
- Install `@playwright/test` only; the separate `playwright` package is redundant.
- Initialize Git before making the first implementation commit.

## Gate conditions carried into implementation

1. Use port 5174 with loopback binding by default and explicit trusted-LAN opt-in.
2. Use 100,000 PBKDF2 iterations verbatim.
3. Use the Durable Object hibernation API and persist authoritative state.
4. Keep protocol payloads bounded to the planned 4 KiB maximum.
5. Do not authenticate, create remote resources, or deploy during the local-first milestone.

