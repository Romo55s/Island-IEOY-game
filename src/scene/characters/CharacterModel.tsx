import { useEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { type Group, type Mesh, type SkinnedMesh } from "three";
import { MeshoptDecoder } from "meshoptimizer";
import { StartingItemProp } from "./StartingItemProp";
import { createAnimationPlayback } from "./animationPlayback";

const MODEL_URL = "/models/characters/daniel.glb";
// Keep one shared source for every character so newly added Daniel clips
// automatically become available to every compatible rig.
const ANIMATION_SOURCE_URL = "/models/characters/daniel-animation-library.glb";
const SOURCE_ALIGNED_CHARACTER_IDS = new Set(["cast-jorge", "cast-maria", "cast-jessica-adlock", "cast-tony", "cast-courtney"]);

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function CharacterModel({
  tint,
  characterId,
  modelUrl = MODEL_URL,
  animationName,
  animationOnce = false,
  animationHoldAtEnd = false,
  animationEventId = "ambient",
  animationStartedAt,
  serverClockOffsetMs = 0,
  startingItemId,
  showGroundMarker = true,
}: {
  tint: string;
  characterId?: string;
  modelUrl?: string;
  animationName?: string;
  animationOnce?: boolean;
  animationHoldAtEnd?: boolean;
  animationEventId?: string;
  animationStartedAt?: number;
  serverClockOffsetMs?: number;
  startingItemId?: string;
  showGroundMarker?: boolean;
}) {
  const isDaniel = modelUrl === MODEL_URL && (characterId === undefined || characterId === "cast-daniel");
  const needsFootPivotCompensation = !isDaniel && !SOURCE_ALIGNED_CHARACTER_IDS.has(characterId ?? "");
  const gltf = useGLTF(modelUrl, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
  const animationSource = useGLTF(isDaniel ? ANIMATION_SOURCE_URL : modelUrl, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
  const model = useMemo(() => {
    const instance = clone(gltf.scene) as Group;
    instance.traverse((node) => {
      const mesh = node as Mesh | SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return instance;
  }, [gltf.scene]);
  const rightHand = model.getObjectByName("mixamorig:RightHand") ?? model.getObjectByName("mixamorigRightHand");
  const heldItem = useMemo(() => rightHand && startingItemId
    ? createPortal(<group position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}><StartingItemProp itemId={startingItemId} /></group>, rightHand)
    : null, [rightHand, startingItemId]);
  const animationRoot = model;
  // Each cast member uses clips embedded in their own model. Daniel's separate
  // library is reserved for Daniel's model and is never retargeted to other rigs.
  const compatibleClips = useMemo(() => {
    const sourceClips = isDaniel ? animationSource.animations : gltf.animations;
    return sourceClips.map((clip) => {
      if (isDaniel) return clip;
      const compatible = clip.clone();
      compatible.tracks = clip.tracks.filter((track) => {
        const separator = track.name.indexOf(".");
        const targetName = separator < 0 ? track.name : track.name.slice(0, separator);
        return model.getObjectByName(targetName) !== undefined;
      });
      return compatible;
    });
  }, [animationSource.animations, gltf.animations, isDaniel, model]);
  const { actions, names, mixer } = useAnimations(compatibleClips, animationRoot);
  const idleName = names.find((name) => name.toLowerCase().includes("idle")) ?? names[0] ?? "";
  const idleVariant = stableHash(modelUrl);
  const idleSpeed = ([0.72, 0.86, 1] as const)[idleVariant % 3]!;
  const idlePhase = ((idleVariant >>> 8) % 1000) / 1000;
  const resolveClipName = (requested: string): string | undefined => {
    const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const exact = names.find((name) => normalized(name) === normalized(requested));
    if (exact) return exact;
    const key = normalized(requested);
    const aliases: Record<string, string[]> = {
      laugh02: ["laugh01"], greet03: ["greet01", "greet02"], greet01: ["greet03", "greet02", "wavegoodbye02"],
      complain01: ["complain02", "scratch", "afraid", "scared01"], complain02: ["complain01"], frustrated02: ["complain01", "complain02"],
      afraid: ["scared01"], scared01: ["afraid"], hittohead: ["afraid", "scared01"], hittostomach: ["afraid", "scared01"],
      depressed: ["cry", "afraid", "scared01"], cry: ["depressed", "afraid", "scared01"], clap: ["cheer", "agree"],
      foldarms: ["agree", "complain01", "complain02"],
      hug: ["cheer", "greet01", "greet03"], fire: ["afraid", "scared01"],
      lookaround: ["wait", "scratch"],
    };
    const alias = aliases[key]?.map((candidate) => names.find((name) => normalized(name) === candidate)).find(Boolean);
    if (alias) return alias;
    if (key.startsWith("dance")) return names.find((name) => normalized(name).startsWith("dance"));
    if (key.startsWith("laugh")) return names.find((name) => normalized(name).startsWith("laugh")) ?? names.find((name) => normalized(name).startsWith("cheer")) ?? names.find((name) => normalized(name) === "clap");
    if (key.startsWith("cheer")) return names.find((name) => normalized(name).startsWith("cheer")) ?? names.find((name) => normalized(name) === "clap") ?? names.find((name) => normalized(name) === "agree");
    if (key.startsWith("greet")) return names.find((name) => normalized(name).startsWith("greet")) ?? names.find((name) => normalized(name).startsWith("wavegoodbye"));
    if (key.startsWith("complain") || key.startsWith("frustrated")) return names.find((name) => normalized(name).startsWith("complain")) ?? names.find((name) => normalized(name).startsWith("afraid")) ?? names.find((name) => normalized(name).startsWith("scared"));
    return undefined;
  };
  const effectiveAnimationName = animationName ? resolveClipName(animationName) ?? animationName : idleName;
  const playback = useMemo(() => createAnimationPlayback(mixer, actions, idleName, (name) => {
    if (import.meta.env.DEV) console.warn(`Missing character animation "${name}"; using "${idleName}".`);
  }), [mixer, actions, idleName]);
  const elapsedSeconds = () => animationStartedAt === undefined ? undefined
    : Math.max(0, (Date.now() + serverClockOffsetMs - animationStartedAt) / 1000);

  useEffect(() => () => playback.dispose(), [playback]);
  useEffect(() => {
    playback.request({ name: effectiveAnimationName, once: animationOnce, holdAtEnd: animationHoldAtEnd, eventId: animationEventId, elapsedSeconds: elapsedSeconds() });
    if (!animationOnce && effectiveAnimationName.toLowerCase() === idleName.toLowerCase()) {
      const idleAction = actions[effectiveAnimationName];
      if (idleAction) idleAction.time = idleAction.getClip().duration * idlePhase;
    }
  }, [playback, actions, effectiveAnimationName, animationOnce, animationHoldAtEnd, animationEventId, animationStartedAt, serverClockOffsetMs, idleName, idlePhase]);

  useFrame(() => {
    playback.tick(elapsedSeconds());
    if (effectiveAnimationName.toLowerCase() === idleName.toLowerCase()) {
      const idleAction = actions[effectiveAnimationName];
      if (idleAction) idleAction.timeScale = idleSpeed;
      return;
    }
  });

  return <group>
    {!needsFootPivotCompensation
      ? <group scale={1.76}><primitive object={model} />{heldItem}</group>
      : <group scale={1.76}><group position={[0, -1, 0]} scale={2}><primitive object={model} />{heldItem}</group></group>}
    {showGroundMarker && <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.22, 0.3, 8]} /><meshBasicMaterial color={tint} />
    </mesh>}
  </group>;
}

useGLTF.preload(MODEL_URL);
useGLTF.preload(ANIMATION_SOURCE_URL, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
