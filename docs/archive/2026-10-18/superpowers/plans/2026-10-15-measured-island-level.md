# Measured Island Level Implementation Plan

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution for this approved implementation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small sandbox island with a metric-driven 400 × 350 m low-poly level that matches the approved encounter coordinates and 85 m summit baseline.

**Architecture:** Put world dimensions, zone metadata, route graph, and terrain sampling in one shared client-side level module. Build static terrain and trails from that data in the R3F scene; place the initial crew at the crash-beach zone and frame an overview with zoom controls that can reach encounter scale.

**Tech Stack:** React, React Three Fiber, Three.js, Vitest, existing browser preview.

**Spec:** `/Users/tonyromo55/Downloads/island_level_design_technical_spec_v1.md`

## Global Constraints

- Coordinate system is Three.js Y-up; 1 unit = 1 meter; sea level is Y = 0.
- Landmass footprint is 400 × 350 m and maximum elevation is 85 m.
- Keep the eight encounter centers, clearings, and route graph from spec sections 3 and 4.
- Use extreme low-poly, angular, flat-shaded tropical art; no buildings other than the aircraft wreck.
- Opening camera remains orthographic; scene controls allow overview and close encounter framing.
- This milestone builds the visual/static level baseline only; do not claim guided travel or server synchronization is implemented.

---

### Task 1: Centralize level metrics and terrain sampling

**Files:**
- Create: `src/scene/world/islandLevel.ts`
- Create: `tests/client/islandLevel.test.ts`
- Modify: `src/scene/world/Island.tsx`

**Interfaces:**
- Produce `ISLAND_LEVEL`, `EncounterZoneId`, `EncounterZone`, `sampleIslandSurfaceY(x, z)`, and `isInsideIsland(x, z)`.
- Export the eight spec zones with exact coordinates, clearing dimensions, 8 m trigger radius, slot offsets, and route graph.
- The sampler returns exact target elevation within each zone’s centered 10 × 10 m staging footprint, blends between zone elevations elsewhere, and never exceeds 85 m.

- [x] Add tests for exact zone coordinates, all zone centers inside the irregular coast, 10 × 10 m staging plateaus at target elevation, and the 85 m summit ceiling.
- [x] Implement the shared level module and run `npm run test -- --run tests/client/islandLevel.test.ts`.
- [x] Replace the duplicated terrain-height helper in `Island.tsx` with the shared sampler.

### Task 2: Build the measured island terrain and landmarks

**Files:**
- Modify: `src/scene/world/Island.tsx`
- Test: `tests/client/islandLevel.test.ts`

**Interfaces:**
- `Island` consumes `ISLAND_LEVEL`, `sampleIslandSurfaceY`, and the exact zone IDs; it does not redefine world-scale positions.
- Construct a static irregular triangulated land surface inside the 400 × 350 m bounds, with a sea-level coast, broad sandy southwest beach, green interior, and a dominant angular mountain whose summit plateau is at `(35, 85, 112)`.
- Place the 24 m × 22 m aircraft wreck in the crash-beach clearing; place low-poly waterfall, pool, stream, rocky coast, vegetation, and offshore islets at spec-relevant locations.
- Render 2–3 m trail ribbons along the route graph using terrain-sampled heights; keep encounter staging patches and sightlines open.

- [x] Generate the irregular terrain mesh from the shared coastline and sampler, with an underside/cliff edge below sea level.
- [x] Add the mountain tiers, summit staging patch, waterfall/pool/stream, beach wreck, coastal features, vegetation clusters, and route trails using shared coordinates.
- [x] Add/adjust geometry tests for terrain bounds, zone patch heights, max summit height, trail endpoints, and aircraft footprint.

### Task 3: Stage the crew and frame the local overview

**Files:**
- Modify: `src/scene/phases/IslandScene.tsx`
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/game/screens/IslandSandboxScreen.module.css`

**Interfaces:**
- Initial crew positions use the crash-beach zone’s eight `playerSlotOffsets`; all character roots use sampled terrain height.
- The initial orthographic view shows the island footprint with sea margin; controls zoom from map overview to an encounter-sized 24–32 m frame.
- Camera clipping planes support the 400 m world without making existing HUD overlays part of the 3D scene.

- [x] Replace the temporary central cast positions with crash-beach slots from `ISLAND_LEVEL`.
- [x] Update camera distance, zoom range, near/far planes, sea/background colors, and reset behavior for full-island and encounter views.
- [x] Capture and inspect a browser screenshot at overview and close zoom; run `npm run check` and fix regressions.

## Validation gaps carried forward

- The spec does not include terrain height samples, trail spline waypoints, or camera keyframes. This milestone uses an explicit interpolated heightfield and straight route ribbons as visual proxies, not production navigation paths.
- Guided server-synchronized movement, route branching, reconnect-safe timelines, collision, and session pacing remain outside this visual-level milestone.
