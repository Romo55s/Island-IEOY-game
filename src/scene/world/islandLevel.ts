export type Vec3 = readonly [number, number, number];
export type Vec2 = readonly [number, number];

export const PLAYER_SLOT_OFFSETS: readonly Vec2[] = [
  [-3, -1.5], [-1, -1.5], [1, -1.5], [3, -1.5],
  [-3, 1.5], [-1, 1.5], [1, 1.5], [3, 1.5],
];

export type EncounterZoneId =
  | "crash_beach"
  | "jungle_clearing"
  | "rocky_coast"
  | "waterfall_pool"
  | "forest_crossroads"
  | "mountain_foothills"
  | "cliffside_plateau"
  | "mountain_summit"
  | "motorboat_cove"
  | "motorboat_repair"
  | "motorboat_launch"
  | "motorboat_storm";

export interface EncounterZone {
  id: EncounterZoneId;
  name: string;
  position: Vec3;
  clearing: Vec2;
  triggerRadius: number;
  playerSlotOffsets: readonly Vec2[];
}

const zone = (id: EncounterZoneId, name: string, position: Vec3, clearing: Vec2): EncounterZone => ({
  id,
  name,
  position,
  clearing,
  triggerRadius: 8,
  playerSlotOffsets: PLAYER_SLOT_OFFSETS,
});

export const ISLAND_ZONES: readonly EncounterZone[] = [
  zone("crash_beach", "Crash beach", [-125, 2, -100], [55, 40]),
  zone("jungle_clearing", "Jungle clearing", [-80, 8, -48], [25, 25]),
  zone("rocky_coast", "Rocky coast", [-145, 5, 25], [25, 20]),
  zone("waterfall_pool", "Waterfall pool", [32, 15, 24], [20, 16]),
  zone("forest_crossroads", "Forest crossroads", [-32, 10, 5], [18, 18]),
  zone("mountain_foothills", "Mountain foothills", [70, 20, 65], [30, 25]),
  zone("cliffside_plateau", "Cliffside plateau", [132, 38, 58], [30, 24]),
  zone("mountain_summit", "Mountain summit", [35, 85, 112], [22, 18]),
  // Route-specific acting pads use the existing western coast. Their names
  // describe what the camera can truthfully show; no unseen mangrove asset is
  // implied by the presentation layer.
  zone("motorboat_cove", "Sheltered motorboat cove", [-150, 3, -45], [18, 16]),
  zone("motorboat_repair", "Motorboat repair beach", [-160, 2, -8], [18, 16]),
  zone("motorboat_launch", "Motorboat launch shore", [-164, 2, 20], [18, 16]),
  zone("motorboat_storm", "Storm shore", [-158, 2, 38], [18, 16]),
];

export const ISLAND_ZONES_BY_ID = Object.fromEntries(ISLAND_ZONES.map((entry) => [entry.id, entry])) as Record<EncounterZoneId, EncounterZone>;

export const ISLAND_ROUTES: Readonly<Record<EncounterZoneId, readonly EncounterZoneId[]>> = {
  crash_beach: ["jungle_clearing", "motorboat_cove"],
  jungle_clearing: ["forest_crossroads"],
  rocky_coast: ["waterfall_pool"],
  waterfall_pool: ["mountain_foothills"],
  forest_crossroads: ["rocky_coast", "waterfall_pool"],
  mountain_foothills: ["cliffside_plateau"],
  cliffside_plateau: ["mountain_summit"],
  mountain_summit: [],
  motorboat_cove: ["motorboat_repair"],
  motorboat_repair: ["motorboat_launch"],
  motorboat_launch: ["motorboat_storm"],
  motorboat_storm: [],
};

/** Shortest trail route; the authored links are treated as traversable in either direction. */
export function findIslandRoute(from: EncounterZoneId, to: EncounterZoneId): EncounterZoneId[] {
  if (from === to) return [from];
  const queue: EncounterZoneId[][] = [[from]];
  const visited = new Set<EncounterZoneId>([from]);
  while (queue.length > 0) {
    const route = queue.shift()!;
    const current = route[route.length - 1]!;
    const neighbors = new Set<EncounterZoneId>([
      ...ISLAND_ROUTES[current],
      ...Object.entries(ISLAND_ROUTES).flatMap(([zoneId, destinations]) => destinations.includes(current) ? [zoneId as EncounterZoneId] : []),
    ]);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const next = [...route, neighbor];
      if (neighbor === to) return next;
      visited.add(neighbor);
      queue.push(next);
    }
  }
  return [from, to];
}

export const ISLAND_LEVEL = {
  id: "island_01",
  version: 1,
  width: 400,
  depth: 350,
  halfWidth: 200,
  halfDepth: 175,
  seaLevel: 0,
  maxElevation: 85,
  trailWidth: 2.5,
  maxPlayers: 8,
  aircraft: { position: [-140, 2, -100], fuselageLength: 24, wingspan: 22 },
  mountain: { baseCenter: [35, 15, 112], baseFootprint: [140, 130], summit: [35, 85, 112], summitClearing: [22, 18] },
  waterfall: { pool: [32, 15, 24], upperEdge: [32, 33, 24], width: 6, poolSize: [20, 16] },
  zones: ISLAND_ZONES,
  routes: ISLAND_ROUTES,
} as const;

const STAGING_HALF_SIZE = 5;

function baseTerrainHeight(x: number, z: number): number {
  const normalizedCoast = Math.min(1, Math.hypot(x / ISLAND_LEVEL.halfWidth, z / ISLAND_LEVEL.halfDepth));
  const lowland = 2.5 + 7.5 * (1 - normalizedCoast);
  const mountainRadius = Math.hypot((x - 35) / 70, (z - 112) / 65);
  const mountain = mountainRadius < 1 ? 15 + 70 * Math.pow(1 - mountainRadius, 0.75) : 0;
  const plateauDistance = Math.hypot((x - 132) / 30, (z - 58) / 24);
  const cliffPlateau = 5 + 33 * Math.max(0, 1 - plateauDistance);
  const poolDistance = Math.hypot((x - 32) / 24, (z - 24) / 20);
  const waterfallRidge = 8 + 7 * Math.max(0, 1 - poolDistance);
  return Math.min(ISLAND_LEVEL.maxElevation, Math.max(lowland, mountain, cliffPlateau, waterfallRidge));
}

/** Elliptical, asymmetric coast; cardinal extents stay at exactly ±200 × ±175 m. */
export function isInsideIsland(x: number, z: number): boolean {
  if (Math.abs(x) > ISLAND_LEVEL.halfWidth || Math.abs(z) > ISLAND_LEVEL.halfDepth) return false;
  const nx = x / ISLAND_LEVEL.halfWidth;
  const nz = z / ISLAND_LEVEL.halfDepth;
  const radius = Math.hypot(nx, nz);
  const angle = Math.atan2(nz, nx);
  const irregularity = 1 + 0.055 * Math.sin(2 * angle) + 0.018 * Math.sin(4 * angle);
  return radius <= irregularity;
}

/**
 * Proposed terrain baseline: exact level staging pads at each spec elevation,
 * smoothly blended between them. Detailed sculpting can replace this sampler later.
 */
export function sampleIslandSurfaceY(x: number, z: number): number {
  if (!isInsideIsland(x, z)) return ISLAND_LEVEL.seaLevel;

  for (const entry of ISLAND_ZONES) {
    const dx = x - entry.position[0];
    const dz = z - entry.position[2];
    if (Math.abs(dx) <= STAGING_HALF_SIZE && Math.abs(dz) <= STAGING_HALF_SIZE) return entry.position[1];
  }

  let height = baseTerrainHeight(x, z);
  for (const entry of ISLAND_ZONES) {
    const dx = x - entry.position[0];
    const dz = z - entry.position[2];
    const correction = entry.position[1] - baseTerrainHeight(entry.position[0], entry.position[2]);
    const weight = Math.exp(-(dx * dx + dz * dz) / (2 * 12 * 12));
    height += correction * weight;
  }
  return Math.min(ISLAND_LEVEL.maxElevation, Math.max(1, height));
}
