import { describe, expect, it } from "vitest";
import { findIslandRoute, ISLAND_LEVEL, ISLAND_ROUTES, ISLAND_ZONES, isInsideIsland, sampleIslandSurfaceY } from "../../src/scene/world/islandLevel";

describe("measured island level baseline", () => {
  it("uses the approved 400 by 350 meter Y-up world and sea level", () => {
    expect([ISLAND_LEVEL.width, ISLAND_LEVEL.depth, ISLAND_LEVEL.seaLevel, ISLAND_LEVEL.maxElevation]).toEqual([400, 350, 0, 85]);
  });

  it("records the spec aircraft, mountain, and waterfall dimensions", () => {
    expect(ISLAND_LEVEL.aircraft).toMatchObject({ fuselageLength: 24, wingspan: 22 });
    expect(ISLAND_LEVEL.mountain).toMatchObject({ baseFootprint: [140, 130], summit: [35, 85, 112] });
    expect(ISLAND_LEVEL.waterfall).toMatchObject({ upperEdge: [32, 33, 24], pool: [32, 15, 24], width: 6 });
  });

  it("keeps the eight original and four motorboat encounter zones inside the irregular coast at their target elevations", () => {
    expect(ISLAND_ZONES).toHaveLength(12);
    for (const zone of ISLAND_ZONES) {
      expect(isInsideIsland(zone.position[0], zone.position[2]), zone.id).toBe(true);
      expect(sampleIslandSurfaceY(zone.position[0], zone.position[2]), zone.id).toBe(zone.position[1]);
      expect(zone.triggerRadius).toBe(8);
      expect(zone.playerSlotOffsets).toHaveLength(8);
    }
  });

  it("provides a flat 10 by 10 meter staging footprint and slots at least 1.5 meters apart", () => {
    for (const zone of ISLAND_ZONES) {
      const [x, y, z] = zone.position;
      for (const dx of [-5, -2.5, 0, 2.5, 5]) {
        for (const dz of [-5, -2.5, 0, 2.5, 5]) {
          expect(sampleIslandSurfaceY(x + dx, z + dz), `${zone.id} staging ${dx},${dz}`).toBe(y);
        }
      }
      const slots = zone.playerSlotOffsets;
      for (let i = 0; i < slots.length; i += 1) {
        for (let j = i + 1; j < slots.length; j += 1) {
          const first = slots[i];
          const second = slots[j];
          expect(first).toBeDefined();
          expect(second).toBeDefined();
          if (first && second) expect(Math.hypot(first[0] - second[0], first[1] - second[1])).toBeGreaterThanOrEqual(1.5);
        }
      }
    }
  });

  it("caps every sampled land elevation at the 85 meter summit and returns sea level offshore", () => {
    for (let x = -200; x <= 200; x += 10) {
      for (let z = -175; z <= 175; z += 10) {
        expect(sampleIslandSurfaceY(x, z)).toBeLessThanOrEqual(85);
      }
    }
    expect(sampleIslandSurfaceY(220, 0)).toBe(0);
    expect(isInsideIsland(220, 0)).toBe(false);
  });

  it("keeps the proposed route graph connected from crash beach to the summit", () => {
    expect(ISLAND_ROUTES.crash_beach).toEqual(["jungle_clearing", "motorboat_cove"]);
    expect(ISLAND_ROUTES.forest_crossroads).toEqual(["rocky_coast", "waterfall_pool"]);
    expect(ISLAND_ROUTES.cliffside_plateau).toEqual(["mountain_summit"]);
    for (const zone of ISLAND_ZONES) {
      const route = findIslandRoute("crash_beach", zone.id);
      expect(route[0]).toBe("crash_beach");
      expect(route.at(-1)).toBe(zone.id);
      expect(route.length).toBeLessThanOrEqual(ISLAND_ZONES.length);
    }
  });
});
