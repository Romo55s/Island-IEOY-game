import { useEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { type Group, type Mesh, type SkinnedMesh } from "three";
import { MeshoptDecoder } from "meshoptimizer";
import { retargetClip } from "three/examples/jsm/utils/SkeletonUtils.js";
import { StartingItemProp } from "./StartingItemProp";
import { CREW_WALK_SPEED } from "../routeMotion";
import { createAnimationPlayback } from "./animationPlayback";

const MODEL_URL = "/models/characters/daniel.glb";
// Keep one shared source for every character so newly added Daniel clips
// automatically become available to every compatible rig.
const ANIMATION_SOURCE_URL = "/models/characters/daniel-animation-library.glb";

export function CharacterModel({
  tint,
  modelUrl = MODEL_URL,
  animationName,
  animationOnce = false,
  animationHoldAtEnd = false,
  animationEventId = "ambient",
  animationStartedAt,
  serverClockOffsetMs = 0,
  startingItemId,
  animationMode = "retarget",
  walkSpeed,
}: {
  tint: string;
  modelUrl?: string;
  animationName?: string;
  animationOnce?: boolean;
  animationHoldAtEnd?: boolean;
  animationEventId?: string;
  animationStartedAt?: number;
  serverClockOffsetMs?: number;
  startingItemId?: string;
  animationMode?: "direct" | "retarget";
  walkSpeed?: React.RefObject<number>;
}) {
  const gltf = useGLTF(modelUrl, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
  const animationSource = useGLTF(ANIMATION_SOURCE_URL, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
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
  const sourceSkin = animationSource.scene.getObjectByProperty("isSkinnedMesh", true) as SkinnedMesh | undefined;
  const targetSkin = model.getObjectByProperty("isSkinnedMesh", true) as SkinnedMesh | undefined;
  const rightHand = model.getObjectByName("mixamorig:RightHand") ?? model.getObjectByName("mixamorigRightHand");
  const heldItem = useMemo(() => rightHand && startingItemId
    ? createPortal(<group position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}><StartingItemProp itemId={startingItemId} /></group>, rightHand)
    : null, [rightHand, startingItemId]);
  const isDaniel = modelUrl === MODEL_URL;
  const animationRoot = isDaniel || animationMode === "direct" ? model : targetSkin ?? model;
  // Retarget in pose space: same Mixamo bone labels do not imply identical
  // rest-pose axes. SkeletonUtils also omits joints absent from Courtney.
  const compatibleClips = useMemo(() => animationSource.animations.map((clip) => {
    if (isDaniel || !sourceSkin || !targetSkin) return clip;

    if (animationMode === "direct") {
      const compatible = clip.clone();
      compatible.tracks = clip.tracks.filter((track) => {
        const separator = track.name.indexOf(".");
        const targetName = separator < 0 ? track.name : track.name.slice(0, separator);
        return model.getObjectByName(targetName) !== undefined;
      });
      return compatible;
    }

    const normalizeBoneName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const sourceNames = new Map(sourceSkin.skeleton.bones.map((bone) => [normalizeBoneName(bone.name), bone.name]));
    const names = Object.fromEntries(targetSkin.skeleton.bones.flatMap((bone) => {
      const sourceName = sourceNames.get(normalizeBoneName(bone.name));
      return sourceName ? [[bone.name, sourceName]] : [];
    }));
    const sourceHip = sourceSkin.skeleton.bones.find((bone) => /hips?/i.test(bone.name));

    return retargetClip(targetSkin, sourceSkin, clip, {
      names,
      hip: sourceHip?.name,
      preserveBoneMatrix: true,
      preserveHipPosition: true,
    });
  }), [animationSource.animations, animationMode, isDaniel, model, sourceSkin, targetSkin]);
  const { actions, names, mixer } = useAnimations(compatibleClips, animationRoot);
  const idleName = names.find((name) => name.toLowerCase().includes("idle")) ?? names[0] ?? "";
  const playback = useMemo(() => createAnimationPlayback(mixer, actions, idleName, (name) => {
    if (import.meta.env.DEV) console.warn(`Missing character animation "${name}"; using "${idleName}".`);
  }), [mixer, actions, idleName]);
  const elapsedSeconds = () => animationStartedAt === undefined ? undefined
    : Math.max(0, (Date.now() + serverClockOffsetMs - animationStartedAt) / 1000);

  useEffect(() => () => playback.dispose(), [playback]);
  useEffect(() => {
    playback.request({ name: animationName ?? idleName, once: animationOnce, holdAtEnd: animationHoldAtEnd, eventId: animationEventId, elapsedSeconds: elapsedSeconds() });
  }, [playback, animationName, animationOnce, animationHoldAtEnd, animationEventId, animationStartedAt, serverClockOffsetMs, idleName]);

  useFrame(() => {
    playback.tick(elapsedSeconds());
    if (animationName?.toLowerCase() !== "walk") return;
    const action = animationName ? actions[animationName] : undefined;
    if (!action) return;
    action.timeScale = Math.max(0.08, Math.min(1.25, (walkSpeed?.current ?? CREW_WALK_SPEED) / CREW_WALK_SPEED));
  });

  return <group>
    <primitive object={model} scale={1.76} />
    {heldItem}
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.22, 0.3, 8]} /><meshBasicMaterial color={tint} />
    </mesh>
  </group>;
}

useGLTF.preload(MODEL_URL);
useGLTF.preload(ANIMATION_SOURCE_URL, false, true, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
