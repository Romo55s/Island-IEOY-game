import { describe, expect, it } from "vitest";
import { getEncounterCameraTarget, getEncounterMark } from "../../src/scene/encounterStaging";
import { ISLAND_ZONES, sampleIslandSurfaceY } from "../../src/scene/world/islandLevel";

describe("directed encounter staging", () => {
  it("grounds all eight slots at every authored destination immediately", () => {
    for (const zone of ISLAND_ZONES) {
      const marks = Array.from({ length: 8 }, (_, slot) => getEncounterMark(zone.id, slot));
      const target = getEncounterCameraTarget(zone.id);
      expect(new Set(marks.map(({ position }) => position.join(","))).size).toBe(8);
      for (const { position: [x, y, z] } of marks) {
        expect([x, y, z].every(Number.isFinite)).toBe(true);
        expect(y).toBeCloseTo(sampleIslandSurfaceY(x, z) + 0.08);
        expect(Math.hypot(x - target[0], z - target[2])).toBeLessThan(5);
      }
      expect(target[1]).toBeCloseTo(sampleIslandSurfaceY(target[0], target[2]) + 1);
    }
  });

  it("keeps the waterfall cast on the bank and the foothills cast clear of mountain dressing", () => {
    const waterfall = getEncounterCameraTarget("waterfall_pool");
    const foothills = getEncounterCameraTarget("mountain_foothills");
    expect(waterfall[0]).toBe(44);
    expect(waterfall[2]).toBe(14);
    expect(foothills[0]).toBe(80);
    expect(foothills[2]).toBe(51);
  });

  it("grounds the four motorboat route pads on the existing western coast", () => {
    const routeZones = ["motorboat_cove", "motorboat_repair", "motorboat_launch", "motorboat_storm"] as const;
    for (const zoneId of routeZones) {
      const target = getEncounterCameraTarget(zoneId);
      expect(target[0]).toBeLessThan(-140);
      expect(target[1]).toBeCloseTo(sampleIslandSurfaceY(target[0], target[2]) + 1);
      for (let slot = 0; slot < 8; slot += 1) {
        const mark = getEncounterMark(zoneId, slot);
        expect(mark.position[1]).toBeCloseTo(sampleIslandSurfaceY(mark.position[0], mark.position[2]) + 0.08);
      }
    }
  });

  it("places a public motorboat actor at the boat-side mark without moving private passengers", () => {
    const actor = getEncounterMark("motorboat_repair", 0, -1, "motorboat-actor");
    const ordinary = getEncounterMark("motorboat_repair", 0);
    expect(actor.position[0]).toBeGreaterThan(ordinary.position[0]);
    expect(actor.position[2]).not.toBe(ordinary.position[2]);
    expect(actor.rotationY).toBe(Math.PI / 2);
    expect(actor.position[1]).toBeCloseTo(sampleIslandSurfaceY(actor.position[0], actor.position[2]) + 0.08);
  });

  it("faces a pair toward each other without overlapping other crew slots", () => {
    const a = getEncounterMark("rocky_coast", 0, 0);
    const b = getEncounterMark("rocky_coast", 1, 1);
    expect(a.rotationY).toBe(Math.PI / 2);
    expect(b.rotationY).toBe(-Math.PI / 2);
    expect(b.position[0] - a.position[0]).toBeCloseTo(1.3);
    const marks = [a, b, ...Array.from({ length: 6 }, (_, i) => getEncounterMark("rocky_coast", i + 2))];
    expect(new Set(marks.map(({ position }) => position.join(","))).size).toBe(8);
  });
});
