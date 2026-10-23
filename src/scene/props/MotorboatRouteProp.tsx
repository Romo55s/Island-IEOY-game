import type { PublicMotorboatRouteState } from "../../shared/domain";
import type { MotorboatScenePresentation } from "../motorboatPresentation";

export interface MotorboatPropAppearance {
  visible: boolean;
  hullColor: string;
  engineColor: string;
  showLeakPatch: boolean;
  warningColor: string;
  warningPennants: number;
  destroyed: boolean;
}

/** Public-state-only visual treatment; it cannot encode fuel ownership. */
export function getMotorboatPropAppearance(
  route: PublicMotorboatRouteState,
  cue: MotorboatScenePresentation["cue"],
): MotorboatPropAppearance {
  return {
    visible: route.discovered,
    hullColor: route.hull === "leaking" ? "#876052" : route.hull === "sound" ? "#d2c6a2" : "#817968",
    engineColor: route.engine === "sturdy" ? "#65885c"
      : route.engine === "fragile" ? "#b48645"
        : route.engine === "broken" ? "#844a41"
          : "#555b58",
    showLeakPatch: route.hull === "leaking",
    warningColor: route.warningLevel === 2 ? "#d85d45" : route.warningLevel === 1 ? "#d4a23b" : "#6c9d91",
    warningPennants: route.warningLevel,
    destroyed: cue === "storm-destroyed",
  };
}

export function MotorboatRouteProp({ presentation }: { presentation: MotorboatScenePresentation }) {
  const appearance = getMotorboatPropAppearance(presentation.route, presentation.cue);
  if (!appearance.visible) return null;

  return <group rotation={[appearance.destroyed ? 0.28 : 0, 0, appearance.destroyed ? -0.22 : 0]}>
    <mesh position={[0, 0.48, 0]} scale={[2.65, 0.48, 1.12]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color={appearance.hullColor} roughness={0.82} />
    </mesh>
    <mesh position={[0.8, 0.98, 0]} scale={[0.95, 0.55, 0.92]} castShadow>
      <boxGeometry />
      <meshStandardMaterial color="#b8aa86" roughness={0.78} />
    </mesh>
    <mesh position={[-2.45, 0.72, 0]} scale={[0.48, 0.72, 0.62]} castShadow>
      <boxGeometry />
      <meshStandardMaterial color={appearance.engineColor} roughness={0.68} />
    </mesh>
    {appearance.showLeakPatch && <mesh position={[0.45, 0.49, -1.13]} scale={[0.72, 0.18, 0.035]}>
      <boxGeometry />
      <meshStandardMaterial color="#592e2d" roughness={1} />
    </mesh>}
    <mesh position={[0.95, 2.05, 0]} scale={[0.04, 1.2, 0.04]}>
      <boxGeometry />
      <meshStandardMaterial color="#3d4140" roughness={1} />
    </mesh>
    {Array.from({ length: appearance.warningPennants }, (_, index) => <mesh key={index} position={[1.18, 2.75 - index * 0.38, 0]} scale={[0.38, 0.14, 0.03]}>
      <boxGeometry />
      <meshBasicMaterial color={appearance.warningColor} />
    </mesh>)}
  </group>;
}
