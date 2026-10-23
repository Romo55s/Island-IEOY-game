export interface RoutePoint {
  x: number;
  y: number;
  z: number;
}

export interface RouteMotionState {
  distance: number;
  speed: number;
}

/** Nominal walk-cycle speed in world meters per second. */
export const CREW_WALK_SPEED = 2.6;

/** Fresh progress for a newly assigned route; never carries velocity over. */
export function createRouteMotionState(): RouteMotionState {
  return { distance: 0, speed: 0 };
}

const distanceBetween = (a: RoutePoint, b: RoutePoint) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const mix = (a: RoutePoint, b: RoutePoint, t: number): RoutePoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

/** Rounds each interior polyline corner with a small quadratic arc. */
export function roundRouteCorners(points: readonly RoutePoint[], radius = 2, curveSteps = 8): RoutePoint[] {
  if (points.length < 3) return points.map((point) => ({ ...point }));
  const result: RoutePoint[] = [{ ...points[0]! }];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!;
    const corner = points[index]!;
    const next = points[index + 1]!;
    const incoming = distanceBetween(previous, corner);
    const outgoing = distanceBetween(corner, next);
    if (incoming < 1e-4 || outgoing < 1e-4) continue;
    const trim = Math.min(radius, incoming * 0.25, outgoing * 0.25);
    const entry = mix(corner, previous, trim / incoming);
    const exit = mix(corner, next, trim / outgoing);
    result.push(entry);
    for (let step = 1; step <= Math.max(2, curveSteps); step += 1) {
      const t = step / Math.max(2, curveSteps);
      const inverse = 1 - t;
      result.push({
        x: inverse * inverse * entry.x + 2 * inverse * t * corner.x + t * t * exit.x,
        y: inverse * inverse * entry.y + 2 * inverse * t * corner.y + t * t * exit.y,
        z: inverse * inverse * entry.z + 2 * inverse * t * corner.z + t * t * exit.z,
      });
    }
  }
  result.push({ ...points.at(-1)! });
  return result;
}

export function getRouteLength(points: readonly RoutePoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) length += distanceBetween(points[index - 1]!, points[index]!);
  return length;
}

/** Samples a polyline by traveled distance, independent of render frame rate. */
export function sampleRoute(points: readonly RoutePoint[], distance: number): RoutePoint {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  let remaining = Math.max(0, distance);
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const segmentLength = distanceBetween(start, end);
    if (remaining <= segmentLength || index === points.length - 1) {
      return mix(start, end, segmentLength > 0 ? Math.min(1, remaining / segmentLength) : 1);
    }
    remaining -= segmentLength;
  }
  return { ...points.at(-1)! };
}

/** Accelerates out of a stop and brakes continuously before the route endpoint. */
export function advanceRouteMotion(
  state: RouteMotionState,
  routeLength: number,
  deltaSeconds: number,
  maxSpeed = CREW_WALK_SPEED,
  acceleration = 5,
): RouteMotionState {
  const length = Math.max(0, Number.isFinite(routeLength) ? routeLength : 0);
  const dt = Math.max(0, Math.min(0.05, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  const distance = Math.max(0, Math.min(length, Number.isFinite(state.distance) ? state.distance : 0));
  const speed = Math.max(0, Number.isFinite(state.speed) ? state.speed : 0);
  const remaining = length - distance;
  if (remaining <= 1e-4 || dt === 0 || acceleration <= 0 || maxSpeed <= 0) {
    return remaining <= 1e-4 ? { distance: length, speed: 0 } : { distance, speed };
  }
  const desiredSpeed = Math.min(maxSpeed, Math.sqrt(2 * acceleration * remaining));
  const nextSpeed = speed + Math.max(-acceleration * dt, Math.min(acceleration * dt, desiredSpeed - speed));
  const nextDistance = Math.min(length, distance + (speed + nextSpeed) * 0.5 * dt);
  return { distance: nextDistance, speed: nextDistance >= length ? 0 : nextSpeed };
}
