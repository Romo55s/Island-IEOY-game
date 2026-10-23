import { ISLAND_ZONES_BY_ID, PLAYER_SLOT_OFFSETS, sampleIslandSurfaceY, type EncounterZoneId } from "./world/islandLevel";
import type { MotorboatStageRole } from "./motorboatPresentation";

// Zone centers describe landmarks, not necessarily safe acting spaces: the
// waterfall center is inside the water sheet, and foothills intersects dressing.
const ACTING_OFFSETS: Partial<Record<EncounterZoneId, readonly [number, number]>> = {
  waterfall_pool: [12, -10],
  mountain_foothills: [10, -14],
};

function encounterCenter(zoneId: EncounterZoneId) {
  const center = ISLAND_ZONES_BY_ID[zoneId].position;
  const offset = ACTING_OFFSETS[zoneId] ?? [0, 0];
  return [center[0] + offset[0]!, center[2] + offset[1]!] as const;
}

export function getEncounterMark(zoneId: EncounterZoneId, slotIndex: number, pairIndex = -1, stageRole?: MotorboatStageRole) {
  const [centerX, centerZ] = encounterCenter(zoneId);
  const offset = stageRole === "motorboat-actor" ? [1.9, 0]
    : pairIndex === 0 ? [-0.65, 0]
      : pairIndex === 1 ? [0.65, 0]
        : PLAYER_SLOT_OFFSETS[slotIndex];
  if (!offset) throw new Error(`No encounter slot for index ${slotIndex}`);
  const x = centerX + offset[0]!;
  const z = centerZ + offset[1]!;
  return {
    position: [x, sampleIslandSurfaceY(x, z) + 0.08, z] as [number, number, number],
    rotationY: stageRole === "motorboat-actor" ? Math.PI / 2
      : pairIndex === 0 ? Math.PI / 2
        : pairIndex === 1 ? -Math.PI / 2
          : -Math.PI * 0.75,
  };
}

export function getEncounterCameraTarget(zoneId: EncounterZoneId): [number, number, number] {
  const [x, z] = encounterCenter(zoneId);
  return [x, sampleIslandSurfaceY(x, z) + 1, z];
}
