import { describe, expect, it } from "vitest";
import { createBearBrain, getBearGroundY, stepBearBrain } from "../../src/scene/fauna/bearBrain";

describe("ambient bear decision brain", () => {
  it("idles before choosing a connected island route and walks at a bounded pace", () => {
    const brain = createBearBrain(1234);
    expect(brain.mode).toBe("idle");
    for (let step = 0; step < 15; step += 1) stepBearBrain(brain, 0.1);
    expect(brain.mode).toBe("idle");

    for (let step = 0; step < 5 && brain.mode === "idle"; step += 1) stepBearBrain(brain, 0.1);
    expect(brain.mode).toBe("wander");
    expect(brain.targetZone).toBe("jungle_clearing");
    const initial = [brain.x, brain.z];

    stepBearBrain(brain, 0.1);
    expect(Math.hypot(brain.x - initial[0]!, brain.z - initial[1]!)).toBeLessThanOrEqual(0.126);
  });

  it("pauses at a destination and avoids immediately retracing its last route when alternatives exist", () => {
    const brain = createBearBrain(42);
    for (let step = 0; step < 700 && !(brain.mode === "idle" && brain.zone === "jungle_clearing"); step += 1) {
      stepBearBrain(brain, 0.1);
    }
    expect(brain.mode).toBe("idle");
    expect(brain.zone).toBe("jungle_clearing");
    expect(brain.previousZone).toBe("crash_beach");

    for (let step = 0; step < 80 && brain.mode === "idle"; step += 1) stepBearBrain(brain, 0.1);
    expect(brain.mode).toBe("wander");
    expect(brain.targetZone).toBe("forest_crossroads");
    expect(getBearGroundY(brain)).toBeGreaterThan(0);
  });

  it("uses the same seed to make reproducible route choices", () => {
    const first = createBearBrain(99);
    const second = createBearBrain(99);
    for (let step = 0; step < 500; step += 1) {
      stepBearBrain(first, 0.1);
      stepBearBrain(second, 0.1);
    }
    expect([first.mode, first.zone, first.targetZone, first.x, first.z]).toEqual([
      second.mode, second.zone, second.targetZone, second.x, second.z,
    ]);
  });
});
