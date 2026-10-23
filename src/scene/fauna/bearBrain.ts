import { ISLAND_ROUTES, ISLAND_ZONES_BY_ID, sampleIslandSurfaceY, type EncounterZoneId } from "../world/islandLevel";

export type BearMode = "idle" | "wander";

export interface BearBrain {
  mode: BearMode;
  zone: EncounterZoneId;
  previousZone: EncounterZoneId | null;
  targetZone: EncounterZoneId | null;
  x: number;
  z: number;
  startX: number;
  startZ: number;
  progress: number;
  travelSeconds: number;
  idleSeconds: number;
  randomState: number;
}

const WALK_SPEED = 1.25;
const ROUTE_NEIGHBORS = createNeighborMap();

function createNeighborMap(): Record<EncounterZoneId, EncounterZoneId[]> {
  const neighbors = Object.fromEntries(Object.keys(ISLAND_ROUTES).map((id) => [id, new Set<EncounterZoneId>()])) as Record<EncounterZoneId, Set<EncounterZoneId>>;
  for (const [from, destinations] of Object.entries(ISLAND_ROUTES) as Array<[EncounterZoneId, readonly EncounterZoneId[]]>) {
    for (const to of destinations) {
      neighbors[from].add(to);
      neighbors[to].add(from);
    }
  }
  return Object.fromEntries(Object.entries(neighbors).map(([id, values]) => [id, [...values]])) as Record<EncounterZoneId, EncounterZoneId[]>;
}

function random01(brain: BearBrain): number {
  let value = brain.randomState | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  brain.randomState = value | 0;
  return (value >>> 0) / 0x1_0000_0000;
}

function nextIdleDuration(brain: BearBrain): number {
  return 2.8 + random01(brain) * 4.2;
}

function chooseDestination(brain: BearBrain): EncounterZoneId {
  const neighbors = ROUTE_NEIGHBORS[brain.zone] ?? [];
  const options = neighbors.filter((zone) => zone !== brain.previousZone);
  const pool = options.length > 0 ? options : neighbors;
  if (pool.length === 0) return brain.zone;
  return pool[Math.floor(random01(brain) * pool.length)] ?? pool[0]!;
}

export function createBearBrain(seed = 0x5eed1234): BearBrain {
  const zone = ISLAND_ZONES_BY_ID.crash_beach;
  return {
    mode: "idle",
    zone: "crash_beach",
    previousZone: null,
    targetZone: null,
    x: zone.position[0] + 12,
    z: zone.position[2] + 9,
    startX: zone.position[0] + 12,
    startZ: zone.position[2] + 9,
    progress: 0,
    travelSeconds: 0,
    idleSeconds: 1.6,
    randomState: seed || 1,
  };
}

export function stepBearBrain(brain: BearBrain, deltaSeconds: number): BearBrain {
  const delta = Math.max(0, Math.min(deltaSeconds, 0.1));
  if (brain.mode === "idle") {
    brain.idleSeconds -= delta;
    if (brain.idleSeconds <= 0) {
      const targetZone = chooseDestination(brain);
      const target = ISLAND_ZONES_BY_ID[targetZone].position;
      const distance = Math.hypot(target[0] - brain.x, target[2] - brain.z);
      brain.mode = "wander";
      brain.targetZone = targetZone;
      brain.startX = brain.x;
      brain.startZ = brain.z;
      brain.progress = 0;
      brain.travelSeconds = Math.max(0.5, distance / WALK_SPEED);
    }
    return brain;
  }

  brain.progress = Math.min(1, brain.progress + delta / brain.travelSeconds);
  const target = ISLAND_ZONES_BY_ID[brain.targetZone ?? brain.zone].position;
  brain.x = brain.startX + (target[0] - brain.startX) * brain.progress;
  brain.z = brain.startZ + (target[2] - brain.startZ) * brain.progress;
  if (brain.progress >= 1) {
    brain.previousZone = brain.zone;
    brain.zone = brain.targetZone ?? brain.zone;
    brain.targetZone = null;
    brain.mode = "idle";
    brain.idleSeconds = nextIdleDuration(brain);
  }
  return brain;
}

export function getBearGroundY(brain: BearBrain): number {
  return sampleIslandSurfaceY(brain.x, brain.z) + 0.04;
}

export function getBearHeading(brain: BearBrain): number | null {
  if (brain.mode !== "wander" || !brain.targetZone) return null;
  const target = ISLAND_ZONES_BY_ID[brain.targetZone].position;
  return Math.atan2(target[0] - brain.startX, target[2] - brain.startZ);
}
