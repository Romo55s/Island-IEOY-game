import { describe, expect, it } from "vitest";
import { advanceRouteMotion, createRouteMotionState, CREW_WALK_SPEED, getRouteLength, roundRouteCorners, sampleRoute, type RouteMotionState, type RoutePoint } from "../../src/scene/routeMotion";

describe("island route motion", () => {
  it("rounds an authored corner while preserving route endpoints", () => {
    const route: RoutePoint[] = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 10 }];
    const rounded = roundRouteCorners(route);
    expect(rounded[0]).toEqual(route[0]);
    expect(rounded.at(-1)).toEqual(route.at(-1));
    expect(rounded.some(({ x, z }) => x > 8 && x < 10 && z > 0 && z < 2)).toBe(true);
    expect(getRouteLength(rounded)).toBeLessThan(getRouteLength(route));
  });

  it("samples by distance and clamps beyond either endpoint", () => {
    const route = [{ x: 0, y: 2, z: 0 }, { x: 3, y: 5, z: 4 }];
    expect(sampleRoute(route, 0)).toEqual(route[0]);
    expect(sampleRoute(route, 10)).toEqual(route[1]);
    const midpoint = sampleRoute(route, 2.5);
    expect(midpoint.x).toBeCloseTo(3 * 2.5 / Math.sqrt(34));
    expect(midpoint.y).toBeCloseTo(2 + 3 * 2.5 / Math.sqrt(34));
    expect(midpoint.z).toBeCloseTo(4 * 2.5 / Math.sqrt(34));
  });

  it("accelerates smoothly, brakes at the endpoint, and never overshoots", () => {
    const length = 18;
    let state: RouteMotionState = { distance: 0, speed: 0 };
    let firstStep = 0;
    for (let frame = 0; frame < 2_000 && state.distance < length; frame += 1) {
      const next = advanceRouteMotion(state, length, 1 / 60);
      if (frame === 0) firstStep = next.distance;
      expect(next.distance).toBeGreaterThanOrEqual(state.distance);
      expect(next.distance).toBeLessThanOrEqual(length);
      expect(Number.isFinite(next.speed)).toBe(true);
      expect(next.speed).toBeLessThanOrEqual(CREW_WALK_SPEED);
      state = next;
    }
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(0.01);
    expect(state).toEqual({ distance: length, speed: 0 });
  });

  it("keeps the travel pace within the character walk-cycle range", () => {
    let state = createRouteMotionState();
    for (let frame = 0; frame < 180; frame += 1) state = advanceRouteMotion(state, 100, 1 / 60);
    expect(state.speed).toBeCloseTo(CREW_WALK_SPEED, 1);
  });

  it("resets progress and velocity when a destination changes mid-route", () => {
    const firstRoute = [{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }];
    let motion = createRouteMotionState();
    for (let frame = 0; frame < 45; frame += 1) motion = advanceRouteMotion(motion, getRouteLength(firstRoute), 1 / 60);
    expect(motion.distance).toBeGreaterThan(0);
    expect(motion.speed).toBeGreaterThan(0);

    // The scene builds the replacement route from the character's current position.
    const replacementStart = sampleRoute(firstRoute, motion.distance);
    const replacementRoute = [replacementStart, { x: 5, y: 0, z: 12 }];
    motion = createRouteMotionState();
    expect(motion).toEqual({ distance: 0, speed: 0 });
    expect(sampleRoute(replacementRoute, motion.distance)).toEqual(replacementStart);
  });

  it("is stable for invalid frame deltas and route lengths", () => {
    expect(advanceRouteMotion({ distance: 1, speed: 2 }, Number.NaN, 1 / 60)).toEqual({ distance: 0, speed: 0 });
    expect(advanceRouteMotion({ distance: 1, speed: 2 }, 10, Number.POSITIVE_INFINITY)).toEqual({ distance: 1, speed: 2 });
  });
});
