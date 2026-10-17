import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, NearestFilter } from "three";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { CharacterModel } from "../characters/CharacterModel";
import { PlaceholderCharacter } from "../characters/PlaceholderCharacter";
import { Island } from "../world/Island";
import { RoamingBear } from "../fauna/RoamingBear";
import type { CrashResolution } from "../../shared/domain";
import { CHARACTER_CATALOG } from "../../shared/domain";
import { getCrashReactionClip } from "./crashReactions";
import { findIslandRoute, ISLAND_ZONES_BY_ID, PLAYER_SLOT_OFFSETS, sampleIslandSurfaceY } from "../world/islandLevel";
import type { EncounterZoneId } from "../world/islandLevel";
import type { SessionSceneMember } from "../sessionPresentation";
import { advanceRouteMotion, createRouteMotionState, getRouteLength, roundRouteCorners, sampleRoute } from "../routeMotion";
import type { RouteMotionState, RoutePoint } from "../routeMotion";
const accents = ["#e05a47", "#6f9f62", "#e7b84d", "#4d93b6", "#93659f", "#b77b52", "#66b8a0", "#7d8584"];

export function IslandScene({ crew = [], crewMembers, animationTest = false, crashResolution, showCrashReactions = false, startingItemsByCharacter = {}, zoneId = "crash_beach", interactionPairCharacterIds = null }: { crew?: string[]; crewMembers?: SessionSceneMember[]; animationTest?: boolean; crashResolution?: CrashResolution; showCrashReactions?: boolean; startingItemsByCharacter?: Record<string, string>; zoneId?: EncounterZoneId; interactionPairCharacterIds?: [string, string] | null }) {
  const roster = useMemo(() => crewMembers?.slice(0, 8) ?? crew.slice(0, 8).map((name, index) => ({
    playerId: `sandbox-${index}`, playerName: name, characterId: CHARACTER_CATALOG[index]?.id ?? `sandbox-${index}`, name, reactionLine: "",
    tint: accents[index] ?? "#e05a47", status: "alive" as const,
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
        <Suspense fallback={null}><RoamingBear /></Suspense>
      </CharacterErrorBoundary>
      {roster.map((member, index) => {
        const offset = PLAYER_SLOT_OFFSETS[index];
        if (!offset) return null;
        const tint = member.status === "ghost" ? "#76c9d0" : member.tint;
        const crashReaction = showCrashReactions && crashResolution ? getCrashReactionClip(member.characterId, crashResolution) : undefined;
        const pairIndex = interactionPairCharacterIds?.indexOf(member.characterId) ?? -1;
        const formationOffset: readonly [number, number] = pairIndex >= 0 ? [pairIndex === 0 ? -0.65 : 0.65, 0] : offset;
        return <MovingCrewMember key={member.playerId} member={member} index={index} offset={formationOffset} nameTagOffset={pairIndex >= 0 ? pairIndex === 0 ? -0.48 : 0.48 : 0} zoneId={zoneId} tint={tint} animationTest={animationTest} crashReaction={crashReaction} startingItemId={member.startingItemId ?? startingItemsByCharacter[member.characterId]} />;
      })}
    </>
  );
}

function MovingCrewMember({ member, index, offset, nameTagOffset, zoneId, tint, animationTest, crashReaction, startingItemId }: { member: SessionSceneMember; index: number; offset: readonly [number, number]; nameTagOffset: number; zoneId: EncounterZoneId; tint: string; animationTest: boolean; crashReaction?: string; startingItemId?: string }) {
  const group = useRef<Group>(null);
  const lastZone = useRef<EncounterZoneId>(zoneId);
  const routePoints = useRef<RoutePoint[]>([]);
  const routeLength = useRef(0);
  const motion = useRef<RouteMotionState>(createRouteMotionState());
  const [walking, setWalking] = useState(false);
  const targetPosition = (id: EncounterZoneId) => {
    const center = ISLAND_ZONES_BY_ID[id].position;
    const x = center[0] + offset[0];
    const z = center[2] + offset[1];
    return [x, sampleIslandSurfaceY(x, z) + 0.08, z] as const;
  };
  useEffect(() => {
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
      setWalking(false);
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
    setWalking(routeLength.current > 0.001);
  }, [zoneId]);
  useFrame((_state, delta) => {
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
      setWalking(false);
    }
  });
  const [x, y, z] = targetPosition(zoneId);
  const startsAtCurrentZone = lastZone.current === zoneId && routePoints.current.length === 0;
  return <group ref={group} position={startsAtCurrentZone ? [x, y, z] : undefined}>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 9]} /><meshBasicMaterial color={member.status === "ghost" ? "#63d2da" : "#141a1d"} transparent opacity={member.status === "ghost" ? 0.75 : 0.48} />
          </mesh>
          {member.status === "ghost" && <mesh position={[0, 0.93, 0]} scale={[0.36, 0.82, 0.32]}>
            <sphereGeometry args={[1, 7, 5]} /><meshBasicMaterial color="#63d2da" transparent opacity={0.18} wireframe depthWrite={false} />
          </mesh>}
          <CharacterSlot
            tint={tint}
            modelUrl={animationTest && index === 0 ? "/models/characters/courtney-download-test.glb" : undefined}
            animationName={walking && !(member.animationOnce && member.animationName === "fall") ? "walk" : animationTest && index === 0 ? "cheer" : crashReaction ?? member.animationName}
            animationOnce={!walking && !animationTest && (Boolean(crashReaction) || member.animationOnce) || walking && member.animationOnce && member.animationName === "fall"}
            animationMode={animationTest && index === 0 ? new URLSearchParams(window.location.search).get("mode") === "direct" ? "direct" : "retarget" : undefined}
            startingItemId={startingItemId}
          />
          <CrewNameTag name={animationTest && index === 0 ? "Courtney · cheer test" : member.name} offsetX={nameTagOffset} />
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

function CharacterSlot({ tint, modelUrl, animationName, animationOnce = false, startingItemId, animationMode }: { tint: string; modelUrl?: string; animationName?: string; animationOnce?: boolean; startingItemId?: string; animationMode?: "direct" | "retarget" }) {
  return <CharacterErrorBoundary fallback={<PlaceholderCharacter tint={tint} />}>
    <Suspense fallback={<PlaceholderCharacter tint={tint} />}>
      <CharacterModel tint={tint} modelUrl={modelUrl} animationName={animationName} animationOnce={animationOnce} startingItemId={startingItemId} animationMode={animationMode} />
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
