import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, Mesh, MeshStandardMaterial, SkinnedMesh, Vector3 } from "three";
import { createBearBrain, getBearGroundY, getBearHeading, stepBearBrain, type BearBrain, type BearMode } from "./bearBrain";

const MODEL_URL = "/models/fauna/black-bear-walk-in-place.glb";
const BEAR_LENGTH_METERS = 1.85;
const MODEL_FORWARD_OFFSET = -Math.PI / 2;

export function RoamingBear() {
  const root = useRef<Group>(null);
  const brain = useRef<BearBrain | null>(null);
  const previousMode = useRef<BearMode | null>(null);
  const time = useRef(0);
  const facing = useRef(0);
  if (!brain.current) brain.current = createBearBrain(Math.floor(Math.random() * 0x7fffffff));

  const gltf = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const instance = clone(gltf.scene) as Group;
    instance.traverse((node) => {
      const mesh = node as Mesh | SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const tuneMaterial = (source: MeshStandardMaterial) => {
        const material = source.clone();
        material.metalness = 0;
        material.roughness = 1;
        material.flatShading = true;
        material.emissive.set("#241d14");
        material.emissiveIntensity = 0.32;
        return material;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material instanceof MeshStandardMaterial ? tuneMaterial(material) : material)
        : mesh.material instanceof MeshStandardMaterial ? tuneMaterial(mesh.material) : mesh.material;
    });

    const bounds = new Box3().setFromObject(instance);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    // Tripo's bear is authored lengthwise on local X, not local Z. Fit its
    // footprint to a believable 1.85 m bear instead of scaling from the rig bounds.
    const scale = BEAR_LENGTH_METERS / Math.max(size.x, 0.01);
    instance.scale.setScalar(scale);
    instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return instance;
  }, [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, model);
  const walkName = names.find((name) => name.toLowerCase().includes("walk"));
  const walkAction = walkName ? actions[walkName] : undefined;

  useEffect(() => {
    return () => { walkAction?.stop(); };
  }, [walkAction]);

  useFrame((_, delta) => {
    const group = root.current;
    const state = brain.current;
    if (!group || !state) return;
    const step = Math.min(delta, 0.1);
    time.current += step;
    stepBearBrain(state, step);

    if (state.mode !== previousMode.current) {
      if (state.mode === "wander") walkAction?.reset().fadeIn(0.35).play();
      else walkAction?.stop();
      previousMode.current = state.mode;
    }

    const travelHeading = getBearHeading(state);
    if (travelHeading !== null) facing.current = travelHeading;
    const idleLook = state.mode === "idle" ? Math.sin(time.current * 0.55) * 0.22 : 0;
    const targetYaw = facing.current + MODEL_FORWARD_OFFSET + idleLook;
    const yawDelta = Math.atan2(Math.sin(targetYaw - group.rotation.y), Math.cos(targetYaw - group.rotation.y));
    group.rotation.y += yawDelta * Math.min(1, step * 2.4);
    group.position.set(state.x, getBearGroundY(state) + (state.mode === "idle" ? Math.sin(time.current * 2.2) * 0.015 : 0), state.z);
  });

  return <group ref={root}>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.62, 12]} />
      <meshBasicMaterial color="#18221b" transparent opacity={0.2} depthWrite={false} />
    </mesh>
    <primitive object={model} />
  </group>;
}

useGLTF.preload(MODEL_URL);
