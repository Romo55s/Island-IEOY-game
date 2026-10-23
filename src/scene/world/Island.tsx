import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { ISLAND_LEVEL, ISLAND_ROUTES, ISLAND_ZONES, ISLAND_ZONES_BY_ID, isInsideIsland, sampleIslandSurfaceY, type EncounterZoneId } from "./islandLevel";

export const getIslandSurfaceY = sampleIslandSurfaceY;

function grounded(position: [number, number, number], offset = 0.05): [number, number, number] {
  return [position[0], sampleIslandSurfaceY(position[0], position[2]) + offset, position[2]];
}

function createTerrainGeometry(): BufferGeometry {
  const columns = 201;
  const rows = 177;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const vertexAt = new Int32Array(columns * rows).fill(-1);
  const sand = new Color("#bda06c");
  const grass = new Color("#527347");
  const highland = new Color("#696b5d");
  const cliff = new Color("#777260");

  for (let column = 0; column < columns; column += 1) {
    const x = -ISLAND_LEVEL.halfWidth + (ISLAND_LEVEL.width * column) / (columns - 1);
    for (let row = 0; row < rows; row += 1) {
      const z = -ISLAND_LEVEL.halfDepth + (ISLAND_LEVEL.depth * row) / (rows - 1);
      if (!isInsideIsland(x, z)) continue;
      const y = sampleIslandSurfaceY(x, z);
      const index = positions.length / 3;
      vertexAt[column * rows + row] = index;
      positions.push(x, y, z);

      const normalizedCoast = Math.hypot(x / ISLAND_LEVEL.halfWidth, z / ISLAND_LEVEL.halfDepth);
      const color = y >= 38 ? cliff : y >= 20 ? highland : normalizedCoast >= 0.78 ? sand : grass;
      colors.push(color.r, color.g, color.b);
    }
  }

  const triangle = (a: number, b: number, c: number) => {
    if (a >= 0 && b >= 0 && c >= 0) indices.push(a, b, c);
  };
  for (let column = 0; column < columns - 1; column += 1) {
    for (let row = 0; row < rows - 1; row += 1) {
      const a = vertexAt[column * rows + row]!;
      const b = vertexAt[(column + 1) * rows + row]!;
      const c = vertexAt[column * rows + row + 1]!;
      const d = vertexAt[(column + 1) * rows + row + 1]!;
      triangle(a, c, b);
      triangle(b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createTrailGeometry(from: EncounterZoneId, to: EncounterZoneId, routeIndex: number): BufferGeometry {
  const start = ISLAND_ZONES_BY_ID[from].position;
  const end = ISLAND_ZONES_BY_ID[to].position;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.hypot(dx, dz);
  const perpendicularX = -dz / length;
  const perpendicularZ = dx / length;
  const segments = Math.max(12, Math.ceil(length / 5));
  const halfWidth = ISLAND_LEVEL.trailWidth / 2;
  const bend = routeIndex % 2 === 0 ? 6 : -6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments;
    const curve = Math.sin(Math.PI * t) * bend;
    const x = start[0] + dx * t + perpendicularX * curve;
    const z = start[2] + dz * t + perpendicularZ * curve;
    const y = sampleIslandSurfaceY(x, z) + 0.22;
    positions.push(x + perpendicularX * halfWidth, y, z + perpendicularZ * halfWidth);
    positions.push(x - perpendicularX * halfWidth, y, z - perpendicularZ * halfWidth);
    if (segment < segments) {
      const current = segment * 2;
      indices.push(current, current + 2, current + 1, current + 1, current + 2, current + 3);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function IslandTerrain() {
  const geometry = useMemo(createTerrainGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh position={[0, -10, 0]} scale={[ISLAND_LEVEL.halfWidth, 12, ISLAND_LEVEL.halfDepth]} receiveShadow>
      <sphereGeometry args={[1, 40, 20]} /><meshStandardMaterial color="#6b6655" flatShading />
    </mesh>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors flatShading /></mesh>
  </>;
}

function TrailNetwork() {
  const trails = useMemo(() => Object.entries(ISLAND_ROUTES).flatMap(([from, destinations], routeIndex) =>
    destinations.map((to, branchIndex) => ({
      key: `${from}-${to}`,
      geometry: createTrailGeometry(from as EncounterZoneId, to, routeIndex + branchIndex),
    }))), []);
  useEffect(() => () => trails.forEach(({ geometry }) => geometry.dispose()), [trails]);
  return <group>{trails.map(({ key, geometry }) => <mesh key={key} geometry={geometry} receiveShadow>
    <meshStandardMaterial color="#c6aa70" flatShading />
  </mesh>)}</group>;
}

function Palm({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={grounded(position)} scale={scale}>
    <mesh position={[0, 3.1, 0]} rotation={[0, 0, -0.12]} castShadow><cylinderGeometry args={[0.3, 0.48, 6.2, 5]} /><meshStandardMaterial color="#71553b" flatShading /></mesh>
    {[0, 1, 2, 3, 4].map((index) => <mesh key={index} position={[0, 6.1, 0]} rotation={[0.45 + index * 0.06, (index * Math.PI * 2) / 5, (index % 2 ? 0.42 : -0.42)]} castShadow>
      <coneGeometry args={[0.9, 6.6, 4]} /><meshStandardMaterial color={index % 2 ? "#537b4d" : "#709253"} flatShading />
    </mesh>)}
  </group>;
}

function Wreckage() {
  const seats = [-5.8, -3.8, -1.8, 0.2].flatMap((z) => [-0.5, 0.5].map((x) => [x, 1.3, z] as [number, number, number]));
  const [planeX, , planeZ] = ISLAND_LEVEL.aircraft.position;
  const position: [number, number, number] = [planeX, sampleIslandSurfaceY(planeX, planeZ) + 0.1, planeZ];
  const wingspan = ISLAND_LEVEL.aircraft.wingspan;
  const fuselageLength = ISLAND_LEVEL.aircraft.fuselageLength;
  return <group position={position} rotation={[0, -0.38, 0.08]}>
    {/* Open-sided cabin so the eight-seat layout reads clearly from the game camera. */}
    <mesh position={[0, 1.25, -1.2]} castShadow><boxGeometry args={[2.4, 0.3, fuselageLength * 0.62]} /><meshStandardMaterial color="#817c6e" flatShading /></mesh>
    <mesh position={[-1.15, 1.8, -1.2]} castShadow><boxGeometry args={[0.14, 1.1, fuselageLength * 0.67]} /><meshStandardMaterial color="#b5a98b" flatShading /></mesh>
    <mesh position={[1.15, 1.8, -1.2]} castShadow><boxGeometry args={[0.14, 1.1, fuselageLength * 0.67]} /><meshStandardMaterial color="#b5a98b" flatShading /></mesh>
    <mesh position={[0, 1.7, 8]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[2.4, 5, 7]} /><meshStandardMaterial color="#b5a98b" flatShading /></mesh>
    <mesh position={[0, 1.6, -10]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.5, 0.7, 5, 6]} /><meshStandardMaterial color="#958a73" flatShading /></mesh>
    {seats.map(([x, y, z], index) => <group key={index} position={[x, y, z]}>
      <mesh castShadow><boxGeometry args={[0.42, 0.13, 0.38]} /><meshStandardMaterial color={index % 2 ? "#6d4937" : "#8c5c3f"} flatShading /></mesh>
      <mesh position={[0, 0.28, -0.15]} castShadow><boxGeometry args={[0.42, 0.5, 0.12]} /><meshStandardMaterial color="#6d4937" flatShading /></mesh>
    </group>)}
    <mesh position={[0, 2.1, -1.5]} castShadow><boxGeometry args={[wingspan, 0.4, 3.2]} /><meshStandardMaterial color="#a69b83" flatShading /></mesh>
    <mesh position={[-8, 1.75, 0.5]} rotation={[0, 0, -0.08]} castShadow><boxGeometry args={[7, 0.3, 5]} /><meshStandardMaterial color="#817c6e" flatShading /></mesh>
    <mesh position={[7.5, 1.85, -0.4]} rotation={[0, 0, 0.24]} castShadow><boxGeometry args={[6, 0.3, 4]} /><meshStandardMaterial color="#978e78" flatShading /></mesh>
    <mesh position={[0, 2.6, -11.2]} castShadow><boxGeometry args={[0.5, 3, 3.5]} /><meshStandardMaterial color="#978e78" flatShading /></mesh>
    <mesh position={[0, 2.1, -11.4]} rotation={[0, 0, Math.PI / 2]} castShadow><boxGeometry args={[6, 0.3, 2.4]} /><meshStandardMaterial color="#817c6e" flatShading /></mesh>
    <mesh position={[1.3, 2.15, 8.5]}><boxGeometry args={[1.2, 1, 0.12]} /><meshStandardMaterial color="#e56b3f" flatShading /></mesh>
  </group>;
}

function JungleFern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={grounded(position)} scale={scale}>
    <mesh position={[0, 0.36, 0]} castShadow><cylinderGeometry args={[0.035, 0.07, 0.72, 5]} /><meshStandardMaterial color="#786047" flatShading /></mesh>
    {Array.from({ length: 7 }, (_, index) => {
      const angle = (index / 7) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 0.28, 0.48 + (index % 2) * 0.08, Math.sin(angle) * 0.28]} rotation={[Math.sin(angle) * 0.48, -angle, Math.cos(angle) * 0.8]} scale={[0.65, 1.65, 0.34]} castShadow>
        <sphereGeometry args={[0.2, 5, 3]} /><meshStandardMaterial color={index % 2 ? "#416746" : "#56844c"} flatShading />
      </mesh>;
    })}
  </group>;
}

function BananaPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={grounded(position)} scale={scale}>
    <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 1.15, 5]} /><meshStandardMaterial color="#806443" flatShading /></mesh>
    {Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 0.38, 0.98 + (index % 3) * 0.1, Math.sin(angle) * 0.38]} rotation={[Math.sin(angle) * 0.38, -angle, Math.cos(angle) * 0.34]} scale={[0.58, 2.25, 0.28]} castShadow>
        <sphereGeometry args={[0.25, 6, 4]} /><meshStandardMaterial color={["#527a42", "#668c48", "#78984e"][index % 3]} flatShading />
      </mesh>;
    })}
  </group>;
}

function TropicalBush({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leaves: Array<[number, number, number]> = [[0, 0.38, 0], [0.36, 0.26, 0.08], [-0.34, 0.24, -0.12], [0.12, 0.2, 0.34], [-0.12, 0.22, -0.32]];
  return <group position={grounded(position)} scale={scale}>
    {leaves.map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} scale={[1.05, 0.9, 1]} castShadow><dodecahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color={index % 2 ? "#466b42" : "#5d8249"} flatShading /></mesh>)}
  </group>;
}

function MountainRange() {
  const { baseCenter, baseFootprint, summit, summitClearing } = ISLAND_LEVEL.mountain;
  const mountainHeight = summit[1] - baseCenter[1];
  return <group>
    {/* 140 m base diameter, 70 m rise from the 15 m foothill tier to the 85 m summit. */}
    <mesh position={[baseCenter[0], baseCenter[1] + mountainHeight / 2, baseCenter[2]]} scale={[1, 1, baseFootprint[1] / baseFootprint[0]]} castShadow receiveShadow>
      <cylinderGeometry args={[summitClearing[0] / 2, baseFootprint[0] / 2, mountainHeight, 9, 5]} /><meshStandardMaterial color="#777468" flatShading />
    </mesh>
    <mesh position={[2, 40, 103]} rotation={[0.08, 0.3, 0.12]} castShadow receiveShadow>
      <coneGeometry args={[30, 35, 7, 3]} /><meshStandardMaterial color="#65695b" flatShading />
    </mesh>
    <mesh position={[73, 39, 126]} rotation={[0.03, -0.35, -0.08]} castShadow receiveShadow>
      <coneGeometry args={[26, 34, 6, 3]} /><meshStandardMaterial color="#898372" flatShading />
    </mesh>
    <mesh position={[summit[0], summit[1] + 0.1, summit[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[summitClearing[0] / 2, summitClearing[1] / 2, 1]}>
      <circleGeometry args={[1, 8]} /><meshStandardMaterial color="#777b59" flatShading />
    </mesh>
    <mesh position={[35, 1.1, 112]} rotation={[-Math.PI / 2, 0, 0]} scale={[70, 65, 1]} receiveShadow>
      <ringGeometry args={[0.94, 1, 9]} /><meshStandardMaterial color="#514f48" flatShading />
    </mesh>
    <mesh position={[69, 20.3, 65]} rotation={[-Math.PI / 2, 0, 0]} scale={[15, 12.5, 1]}>
      <circleGeometry args={[1, 9]} /><meshStandardMaterial color="#8b8067" flatShading />
    </mesh>
    <mesh position={[132, 38.3, 58]} rotation={[-Math.PI / 2, 0, 0]} scale={[15, 12, 1]}>
      <circleGeometry args={[1, 9]} /><meshStandardMaterial color="#69695f" flatShading />
    </mesh>
  </group>;
}

function WaterfallSystem() {
  const stream = useMemo(() => createWatercourseGeometry(), []);
  const { pool, upperEdge, width, poolSize } = ISLAND_LEVEL.waterfall;
  const dropHeight = upperEdge[1] - pool[1];
  useEffect(() => () => stream.dispose(), [stream]);
  return <>
    <mesh position={[pool[0], pool[1] + 0.2, pool[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[poolSize[0] / 2, poolSize[1] / 2, 1]}>
      <circleGeometry args={[1, 12]} /><meshStandardMaterial color="#39b8b4" flatShading />
    </mesh>
    <mesh position={[pool[0], pool[1] + dropHeight / 2, pool[2]]} castShadow>
      <boxGeometry args={[width, dropHeight, 0.35]} /><meshStandardMaterial color="#63c6c5" transparent opacity={0.82} flatShading />
    </mesh>
    <mesh geometry={stream}>
      <meshStandardMaterial color="#258e9a" flatShading />
    </mesh>
  </>;
}

function createWatercourseGeometry(): BufferGeometry {
  const [poolX, , poolZ] = ISLAND_LEVEL.waterfall.pool;
  const points: Array<[number, number]> = [[poolX, poolZ], [28, -4], [13, -42], [4, -86], [14, -132], [22, -178]];
  const positions: number[] = [];
  const indices: number[] = [];
  const width = 3;
  let base = 0;
  for (let part = 0; part < points.length - 1; part += 1) {
    const start = points[part]!;
    const end = points[part + 1]!;
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const nx = -dz / length;
    const nz = dx / length;
    const segments = Math.ceil(length / 5);
    for (let step = 0; step <= segments; step += 1) {
      const t = step / segments;
      const x = start[0] + dx * t;
      const z = start[1] + dz * t;
      const y = sampleIslandSurfaceY(x, z) + 0.2;
      positions.push(x + nx * width / 2, y, z + nz * width / 2, x - nx * width / 2, y, z - nz * width / 2);
      if (step < segments) {
        const index = base + step * 2;
        indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
      }
    }
    base = positions.length / 3;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function OffshoreRock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 5, 0]} rotation={[0.08, 0.35, 0.06]} castShadow receiveShadow><dodecahedronGeometry args={[10, 0]} /><meshStandardMaterial color="#66716d" flatShading /></mesh>
    <mesh position={[1.2, 12, -0.6]} rotation={[0.02, 0.7, -0.04]} castShadow><coneGeometry args={[6.2, 14.5, 5, 1]} /><meshStandardMaterial color="#8b8879" flatShading /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}><ringGeometry args={[7.8, 12.4, 9]} /><meshBasicMaterial color="#a9ded0" transparent opacity={0.8} /></mesh>
  </group>;
}

type VegetationKind = "palm" | "broadleaf" | "shrub";
interface VegetationSpot { position: [number, number, number]; scale: number; kind: VegetationKind }

function distanceToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

function createVegetationSpots(): VegetationSpot[] {
  const spots: VegetationSpot[] = [];
  let index = 0;
  for (let x = -190; x <= 190; x += 18) {
    for (let z = -165; z <= 165; z += 18) {
      if (!isInsideIsland(x, z) || Math.hypot(x / 200, z / 175) > 0.87 || sampleIslandSurfaceY(x, z) > 38) continue;
      const inClearing = ISLAND_ZONES.some((entry) =>
        Math.abs(x - entry.position[0]) < entry.clearing[0] / 2 + 7 && Math.abs(z - entry.position[2]) < entry.clearing[1] / 2 + 7);
      if (inClearing) continue;
      const nearTrail = Object.entries(ISLAND_ROUTES).some(([from, destinations]) => destinations.some((to) => {
        const start = ISLAND_ZONES_BY_ID[from as EncounterZoneId].position;
        const end = ISLAND_ZONES_BY_ID[to].position;
        return distanceToSegment(x, z, start[0], start[2], end[0], end[2]) < 5;
      }));
      if (nearTrail) continue;

      const patchNoise = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
      const nearJungle = Math.hypot(x + 80, z + 48) < 80 || Math.hypot(x + 32, z - 5) < 70;
      if (patchNoise < (nearJungle ? 0.1 : 0.48)) continue;
      const kind: VegetationKind = index % 5 === 0 ? "palm" : index % 4 === 0 ? "shrub" : "broadleaf";
      spots.push({ position: [x, 0, z], scale: 0.75 + patchNoise * 0.55, kind });
      index += 1;
    }
  }
  return spots;
}

const vegetationSpots = createVegetationSpots();

export function Island() {
  return <group>
    {/* Sea level is zero; the layered shelf turns from aqua shallows into deep water. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><circleGeometry args={[1000, 128]} /><meshBasicMaterial color="#164a75" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} scale={[230, 200, 1]}><circleGeometry args={[1, 96]} /><meshBasicMaterial color="#126c83" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} scale={[216, 190, 1]}><ringGeometry args={[0.91, 1, 96]} /><meshBasicMaterial color="#35b7a8" /></mesh>
    <IslandTerrain />
    <MountainRange />
    <WaterfallSystem />
    <TrailNetwork />
    {vegetationSpots.map((spot, index) => {
      if (spot.kind === "palm") return <Palm key={index} position={spot.position} scale={spot.scale} />;
      if (spot.kind === "broadleaf") return <BananaPlant key={index} position={spot.position} scale={spot.scale * 2.4} />;
      return <TropicalBush key={index} position={spot.position} scale={spot.scale * 2.2} />;
    })}
    <JungleFern position={[-92, 0, -60]} scale={4.2} />
    <JungleFern position={[-69, 0, -35]} scale={3.8} />
    <JungleFern position={[-49, 0, 18]} scale={4} />
    <JungleFern position={[65, 0, 42]} scale={4.5} />
    <OffshoreRock position={[-213, 0, -90]} scale={1.35} />
    <OffshoreRock position={[-212, 0, 60]} scale={1.15} />
    <OffshoreRock position={[210, 0, -82]} scale={1.2} />
    <OffshoreRock position={[210, 0, 80]} scale={1.45} />
    <OffshoreRock position={[-110, 0, 184]} scale={1.05} />
    <OffshoreRock position={[74, 0, -184]} scale={0.95} />
    <mesh position={[-176, 9, 25]} rotation={[0.1, 0.4, 0.06]} castShadow><dodecahedronGeometry args={[14, 0]} /><meshStandardMaterial color="#615f56" flatShading /></mesh>
    <mesh position={[-184, 5, 43]} rotation={[0.08, 1.1, 0.1]} castShadow><icosahedronGeometry args={[9, 0]} /><meshStandardMaterial color="#857760" flatShading /></mesh>
    <Wreckage />
  </group>;
}
