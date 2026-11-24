import { Suspense, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, NearestFilter } from "three";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { CharacterModel } from "../characters/CharacterModel";
import { PlaceholderCharacter } from "../characters/PlaceholderCharacter";
import { Island } from "../world/Island";
import { RoamingBear } from "../fauna/RoamingBear";
import type { CrashResolution } from "../../shared/domain";
import { CHARACTER_CATALOG, MAX_PLAYER_COUNT } from "../../shared/domain";
import { getCrashReactionClip } from "./crashReactions";
import { findIslandRoute, ISLAND_ZONES_BY_ID, PLAYER_SLOT_OFFSETS, sampleIslandSurfaceY } from "../world/islandLevel";
import type { EncounterZoneId } from "../world/islandLevel";
import type { SessionSceneMember } from "../sessionPresentation";
import type { MotorboatScenePresentation } from "../motorboatPresentation";
import { advanceRouteMotion, createRouteMotionState, getRouteLength, roundRouteCorners, sampleRoute } from "../routeMotion";
import type { RouteMotionState, RoutePoint } from "../routeMotion";
import { getEncounterCameraTarget, getEncounterMark } from "../encounterStaging";
import { MotorboatRouteProp } from "../props/MotorboatRouteProp";
const accents = ["#e05a47", "#6f9f62", "#e7b84d", "#4d93b6", "#93659f", "#b77b52", "#66b8a0", "#7d8584"];

export function IslandScene({ bearDefeated = false, crew = [], crewMembers, crashResolution, showCrashReactions = false, startingItemsByCharacter = {}, zoneId = "crash_beach", interactionPairCharacterIds = null, motorboatPresentation = null, staging = "travel", serverClockOffsetMs = 0 }: { bearDefeated?: boolean; crew?: string[]; crewMembers?: SessionSceneMember[]; crashResolution?: CrashResolution; showCrashReactions?: boolean; startingItemsByCharacter?: Record<string, string>; zoneId?: EncounterZoneId; interactionPairCharacterIds?: [string, string] | null; motorboatPresentation?: MotorboatScenePresentation | null; staging?: "travel" | "encounter"; serverClockOffsetMs?: number }) {
  const roster = useMemo(() => crewMembers?.slice(0, MAX_PLAYER_COUNT) ?? crew.slice(0, MAX_PLAYER_COUNT).map((name, index) => ({
    playerId: `sandbox-${index}`, playerName: name, characterId: CHARACTER_CATALOG[index]?.id ?? `sandbox-${index}`, modelUrl: CHARACTER_CATALOG[index]?.modelUrl ?? "/models/characters/daniel.glb", name, reactionLine: "", emotion: "neutral" as const,
    tint: accents[index] ?? CHARACTER_CATALOG[index]?.tint ?? "#e05a47", status: "alive" as const,
    startingItemId: CHARACTER_CATALOG[index] ? startingItemsByCharacter[CHARACTER_CATALOG[index]!.id] : undefined,
    animationName: "idle", animationOnce: false,
  })), [crew, crewMembers, startingItemsByCharacter]);
  return (
    <>
      <color attach="background" args={["#164a75"]} />
      <fog attach="fog" args={["#164a75", 2600, 3800]} />
      <ambientLight intensity={1.25} color="#b1c5ac" />
      <directionalLight position={[-7, 12, 7]} intensity={2.4} color="#ffd59a" />
      <directionalLight position={[7, 7, -7]} intensity={1.1} color="#81aaa8" />
      <Island />
      <CharacterErrorBoundary fallback={null}>
        {!bearDefeated && <Suspense fallback={null}><RoamingBear /></Suspense>}
      </CharacterErrorBoundary>
      {motorboatPresentation && <MotorboatAnchor presentation={motorboatPresentation} />}
      {roster.map((member, index) => {
        const offset = PLAYER_SLOT_OFFSETS[index];
        if (!offset) return null;
        const tint = member.status === "ghost" ? "#777c77" : member.tint;
        const crashReaction = showCrashReactions && crashResolution ? getCrashReactionClip(member.characterId, crashResolution) : undefined;
        const pairIndex = interactionPairCharacterIds?.indexOf(member.characterId) ?? -1;
        const formationOffset: readonly [number, number] = pairIndex >= 0 ? [pairIndex === 0 ? -0.65 : 0.65, 0] : offset;
        return <MovingCrewMember key={member.playerId} member={member} index={index} offset={formationOffset} pairIndex={pairIndex} staging={staging} serverClockOffsetMs={serverClockOffsetMs} nameTagOffset={pairIndex >= 0 ? pairIndex === 0 ? -0.48 : 0.48 : 0} zoneId={zoneId} tint={tint} crashReaction={crashReaction} startingItemId={member.startingItemId ?? startingItemsByCharacter[member.characterId]} />;
      })}
    </>
  );
}

function MovingCrewMember({ member, index, offset, pairIndex, staging, serverClockOffsetMs, nameTagOffset, zoneId, tint, crashReaction, startingItemId }: { member: SessionSceneMember; index: number; offset: readonly [number, number]; pairIndex: number; staging: "travel" | "encounter"; serverClockOffsetMs: number; nameTagOffset: number; zoneId: EncounterZoneId; tint: string; crashReaction?: string; startingItemId?: string }) {
  const group = useRef<Group>(null);
  const lastZone = useRef<EncounterZoneId>(zoneId);
  const routePoints = useRef<RoutePoint[]>([]);
  const routeLength = useRef(0);
  const motion = useRef<RouteMotionState>(createRouteMotionState());
  const targetPosition = (id: EncounterZoneId) => {
    const center = ISLAND_ZONES_BY_ID[id].position;
    const x = center[0] + offset[0];
    const z = center[2] + offset[1];
    return [x, sampleIslandSurfaceY(x, z) + 0.08, z] as const;
  };
  useEffect(() => {
    if (staging === "encounter") {
      lastZone.current = zoneId;
      routePoints.current = [];
      routeLength.current = 0;
      return;
    }
    if (lastZone.current === zoneId) return;
    const wasInTransit = routePoints.current.length >= 2;
    const completeRoute = findIslandRoute(lastZone.current, zoneId);
    // Mid-walk retargeting must still pass through the previous destination
    // before taking its next authored trail; otherwise the crew cuts the corner.
    const route = wasInTransit ? completeRoute : completeRoute.slice(1);
    const object = group.current;
    if (!object || route.length === 0) {
      routePoints.current = [];
      routeLength.current = 0;
      motion.current = createRouteMotionState();
      lastZone.current = zoneId;
      return;
    }
    routePoints.current = roundRouteCorners([
      { x: object.position.x, y: object.position.y, z: object.position.z },
      ...route.map((id) => {
        const [x, y, z] = targetPosition(id);
        return { x, y, z };
      }),
    ]);
    routeLength.current = getRouteLength(routePoints.current);
    motion.current = createRouteMotionState();
    lastZone.current = zoneId;
  }, [zoneId, staging]);
  useFrame((_state, delta) => {
    if (staging === "encounter") return;
    const object = group.current;
    if (!object || routePoints.current.length < 2) return;
    motion.current = advanceRouteMotion(motion.current, routeLength.current, delta);
    const position = sampleRoute(routePoints.current, motion.current.distance);
    object.position.set(position.x, position.y, position.z);
    const ahead = sampleRoute(routePoints.current, Math.min(routeLength.current, motion.current.distance + 0.45));
    const dx = ahead.x - position.x;
    const dz = ahead.z - position.z;
    if (Math.hypot(dx, dz) > 0.001) {
      const targetAngle = Math.atan2(dx, dz);
      const angleDelta = Math.atan2(Math.sin(targetAngle - object.rotation.y), Math.cos(targetAngle - object.rotation.y));
      object.rotation.y += angleDelta * (1 - Math.exp(-8 * Math.min(delta, 0.05)));
    }
    if (motion.current.distance >= routeLength.current) {
      const destination = routePoints.current.at(-1)!;
      object.position.set(destination.x, destination.y, destination.z);
      routePoints.current = [];
      routeLength.current = 0;
      motion.current = createRouteMotionState();
    }
  });
  const [x, y, z] = targetPosition(zoneId);
  const startsAtCurrentZone = lastZone.current === zoneId && routePoints.current.length === 0;
  const mark = staging === "encounter" ? getEncounterMark(zoneId, index, pairIndex, member.stageRole) : undefined;
  return <group ref={group} position={mark?.position ?? (startsAtCurrentZone ? [x, y, z] : undefined)} rotation={mark ? [0, mark.rotationY, 0] : undefined}>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 9]} /><meshBasicMaterial color={member.status === "ghost" ? "#63d2da" : "#141a1d"} transparent opacity={member.status === "ghost" ? 0.75 : 0.48} />
          </mesh>
          <CharacterSlot
            tint={tint}
            characterId={member.characterId}
            animationName={crashReaction ?? member.animationName}
            animationOnce={Boolean(crashReaction) || member.animationOnce}
            animationHoldAtEnd={member.animationHoldAtEnd}
            animationEventId={member.animationEventId}
            animationStartedAt={staging === "encounter" ? member.animationStartedAt : undefined}
            serverClockOffsetMs={serverClockOffsetMs}
            startingItemId={startingItemId}
          />
          <CrewNameTag name={member.name} offsetX={nameTagOffset} />
  </group>;
}

function MotorboatAnchor({ presentation }: { presentation: MotorboatScenePresentation }) {
  const [x, y, z] = getEncounterCameraTarget(presentation.zoneId);
  // The directed camera approaches from negative X/Z. Keeping the boat just
  // beyond the cast on that axis makes its silhouette readable instead of
  // leaving it stranded at the edge of the encounter frame.
  return <group position={[x - 4.2, y - 1, z + 1.6]}>
    <MotorboatRouteProp presentation={presentation} />
  </group>;
}

function CrewNameTag({ name, offsetX = 0 }: { name: string; offsetX?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#141a1d";
      context.fillRect(2, 2, 252, 60);
      context.fillStyle = "#e8c547";
      context.fillRect(2, 58, 252, 4);
      context.fillStyle = "#d9d2bb";
      context.font = "bold 28px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(name.slice(0, 16), 128, 31, 232);
    }
    const result = new CanvasTexture(canvas);
    result.magFilter = NearestFilter;
    return result;
  }, [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[offsetX, 2.05, 0]} scale={[1.22, 0.31, 1]}>
    <spriteMaterial map={texture} transparent depthWrite={false} />
  </sprite>;
}

function CharacterSlot({ tint, characterId, modelUrl, animationName, animationOnce = false, animationHoldAtEnd = false, animationEventId, animationStartedAt, serverClockOffsetMs, startingItemId }: { tint: string; characterId: string; modelUrl?: string; animationName?: string; animationOnce?: boolean; animationHoldAtEnd?: boolean; animationEventId?: string; animationStartedAt?: number; serverClockOffsetMs?: number; startingItemId?: string }) {
  return <CharacterErrorBoundary fallback={<PlaceholderCharacter tint={tint} />}>
    <Suspense fallback={<PlaceholderCharacter tint={tint} />}>
      <CharacterModel tint={tint} characterId={characterId} modelUrl={modelUrl} animationName={animationName} animationOnce={animationOnce} animationHoldAtEnd={animationHoldAtEnd} animationEventId={animationEventId} animationStartedAt={animationStartedAt} serverClockOffsetMs={serverClockOffsetMs} startingItemId={startingItemId} />
    </Suspense>
  </CharacterErrorBoundary>;
}

import { Component, type ReactNode } from "react";
class CharacterErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Character model failed to load or render:", error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
