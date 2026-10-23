import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode, RefObject } from "react";
import { Component, useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ISLAND_ZONES_BY_ID } from "./world/islandLevel";

const initialTarget = ISLAND_ZONES_BY_ID.crash_beach.position;
const initialCameraPosition: [number, number, number] = [initialTarget[0] - 650, initialTarget[1] + 900, initialTarget[2] - 650];

class CanvasGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" style={{ position: "absolute", inset: "40% 16px auto", textAlign: "center", color: "#d9d2bb", fontFamily: "monospace" }}>The island view could not start. Try reloading the scene.</div>;
    return this.props.children;
  }
}

export function GameCanvas({ children, onCreated, zoom, target = initialTarget, directed = false }: { children: ReactNode; onCreated: () => void; zoom?: number; target?: readonly [number, number, number]; directed?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const cameraPosition: [number, number, number] = directed ? [target[0] - 12, target[1] + 16, target[2] - 20] : initialCameraPosition;
  return (
    <CanvasGuard>
      <Canvas
        orthographic
        camera={{ position: cameraPosition, zoom: zoom ?? 22, near: 0.1, far: 2500, up: [0, 1, 0] }}
        dpr={[0.8, 1.15]}
        gl={{ antialias: false, powerPreference: "low-power" }}
        onCreated={({ camera, gl }) => { camera.lookAt(...(directed ? target : initialTarget)); gl.setClearColor("#164a75"); onCreated(); }}
      >
        <ResponsiveCamera fixedZoom={zoom} />
        {directed ? <DirectedCamera target={target} /> : <>
          <OrbitControls ref={controls} target={initialTarget} enableDamping enablePan minPolarAngle={0.45} maxPolarAngle={1.42} minZoom={1.2} maxZoom={80} rotateSpeed={0.65} zoomSpeed={1.05} />
          <CameraTargetFollow target={target} controls={controls} />
          <KeyboardCameraPan controls={controls} />
        </>}
        {children}
      </Canvas>
    </CanvasGuard>
  );
}

function DirectedCamera({ target }: { target: readonly [number, number, number] }) {
  const { camera } = useThree();
  const [x, y, z] = target;
  // Cut camera and cast to the same encounter before painting. Long-distance
  // travel is not a gameplay phase and must never hide the consequence actors.
  useLayoutEffect(() => {
    camera.position.set(x - 12, y + 16, z - 20);
    camera.lookAt(x, y, z);
    camera.updateMatrixWorld();
  }, [camera, x, y, z]);
  return null;
}

function CameraTargetFollow({ target, controls }: { target: readonly [number, number, number]; controls: RefObject<OrbitControlsImpl | null> }) {
  const desired = useRef(new Vector3(...target));
  useEffect(() => { desired.current.set(...target); }, [target]);
  useFrame((_state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const factor = 1 - Math.exp(-1.5 * delta);
    const dx = (desired.current.x - orbit.target.x) * factor;
    const dy = (desired.current.y - orbit.target.y) * factor;
    const dz = (desired.current.z - orbit.target.z) * factor;
    orbit.target.x += dx; orbit.target.y += dy; orbit.target.z += dz;
    orbit.object.position.x += dx; orbit.object.position.y += dy; orbit.object.position.z += dz;
    orbit.update();
  });
  return null;
}

function KeyboardCameraPan({ controls }: { controls: RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isEditable = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true'], button");
      if (isEditable) return;

      const moves: Record<string, [number, number]> = {
        w: [0, 1], arrowup: [0, 1],
        s: [0, -1], arrowdown: [0, -1],
        a: [-1, 0], arrowleft: [-1, 0],
        d: [1, 0], arrowright: [1, 0],
      };
      const move = moves[key];
      const orbit = controls.current;
      if (!move || !orbit) return;
      event.preventDefault();

      const forward = camera.getWorldDirection(camera.position.clone());
      forward.y = 0;
      forward.normalize();
      const right = forward.clone().cross(camera.up).normalize();
      const step = (event.shiftKey ? 28 : 12) / Math.max(camera.zoom, 1.2) * 2.2;
      const deltaX = (right.x * move[0] + forward.x * move[1]) * step;
      const deltaZ = (right.z * move[0] + forward.z * move[1]) * step;
      const nextX = Math.max(-175, Math.min(175, orbit.target.x + deltaX));
      const nextZ = Math.max(-150, Math.min(150, orbit.target.z + deltaZ));
      const applied = [nextX - orbit.target.x, 0, nextZ - orbit.target.z] as const;
      orbit.target.x += applied[0];
      orbit.target.z += applied[2];
      camera.position.x += applied[0];
      camera.position.z += applied[2];
      orbit.update();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera, controls]);

  return null;
}

function ResponsiveCamera({ fixedZoom }: { fixedZoom?: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.zoom = fixedZoom ?? Math.min(26, Math.max(22, size.height / 38));
    camera.updateProjectionMatrix();
  }, [camera, fixedZoom, size.height, size.width]);
  return null;
}
