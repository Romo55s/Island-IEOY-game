import { SURVIVAL_ITEMS } from "../../shared/content/items";

const mat = { flatShading: true, roughness: 1 } as const;

/** Temporary low-poly hand-held proxies until the generated GLB props are ready. */
export function StartingItemProp({ itemId }: { itemId: string }) {
  if (!SURVIVAL_ITEMS.some(({ id }) => id === itemId)) return null;
  return <group scale={0.75}>
    {itemId === "knife" && <>
      <mesh position={[0, -0.035, 0]} castShadow><boxGeometry args={[0.035, 0.12, 0.03]} /><meshStandardMaterial color="#614632" {...mat} /></mesh>
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><coneGeometry args={[0.035, 0.16, 4]} /><meshStandardMaterial color="#999d9b" {...mat} /></mesh>
    </>}
    {itemId === "lighter" && <>
      <mesh castShadow><boxGeometry args={[0.07, 0.11, 0.045]} /><meshStandardMaterial color="#b77b52" {...mat} /></mesh>
      <mesh position={[0, 0.065, 0]} castShadow><boxGeometry args={[0.04, 0.025, 0.035]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "rope" && <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.095, 0.018, 4, 7]} /><meshStandardMaterial color="#ad8962" {...mat} /></mesh>}
    {itemId === "binoculars" && <>
      <mesh position={[-0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.15, 6]} /><meshStandardMaterial color="#454b50" {...mat} /></mesh>
      <mesh position={[0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.15, 6]} /><meshStandardMaterial color="#454b50" {...mat} /></mesh>
      <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.11, 0.035, 0.04]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "flare" && <>
      <mesh rotation={[0, 0, -0.15]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.22, 6]} /><meshStandardMaterial color="#e56b3f" {...mat} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.035, 6]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "apple" && <>
      <mesh castShadow><icosahedronGeometry args={[0.09, 0]} /><meshStandardMaterial color="#a54535" {...mat} /></mesh>
      <mesh position={[0, 0.09, 0]} rotation={[0, 0, -0.25]} castShadow><cylinderGeometry args={[0.009, 0.012, 0.05, 4]} /><meshStandardMaterial color="#614632" {...mat} /></mesh>
    </>}
    {itemId === "guitar" && <>
      <mesh position={[0, -0.07, 0]} scale={[0.78, 1, 0.35]} castShadow><dodecahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
      <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[0.035, 0.3, 0.035]} /><meshStandardMaterial color="#614632" {...mat} /></mesh>
      <mesh position={[0, 0.29, 0]} castShadow><boxGeometry args={[0.07, 0.055, 0.04]} /><meshStandardMaterial color="#ad8962" {...mat} /></mesh>
    </>}
    {itemId === "crossbow" && <>
      <mesh castShadow><boxGeometry args={[0.24, 0.035, 0.04]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
      <mesh position={[0, -0.02, 0]} castShadow><boxGeometry args={[0.06, 0.12, 0.045]} /><meshStandardMaterial color="#614632" {...mat} /></mesh>
      <mesh position={[0, 0.015, 0]} castShadow><boxGeometry args={[0.015, 0.02, 0.055]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "compound-bow" && <>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><torusGeometry args={[0.11, 0.018, 4, 7, Math.PI]} /><meshStandardMaterial color="#614632" {...mat} /></mesh>
      <mesh castShadow><boxGeometry args={[0.025, 0.2, 0.025]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
    </>}
    {itemId === "first-aid-kit" && <>
      <mesh castShadow><boxGeometry args={[0.14, 0.1, 0.075]} /><meshStandardMaterial color="#d9d2bb" {...mat} /></mesh>
      <mesh castShadow><boxGeometry args={[0.025, 0.075, 0.012]} /><meshStandardMaterial color="#a54535" {...mat} /></mesh>
      <mesh castShadow><boxGeometry args={[0.075, 0.025, 0.012]} /><meshStandardMaterial color="#a54535" {...mat} /></mesh>
    </>}
    {itemId === "water-bottle" && <>
      <mesh castShadow><cylinderGeometry args={[0.04, 0.05, 0.2, 6]} /><meshStandardMaterial color="#438b9e" {...mat} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 0.035, 6]} /><meshStandardMaterial color="#d6bc85" {...mat} /></mesh>
    </>}
    {itemId === "fishing-line" && <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.085, 0.014, 4, 8]} /><meshStandardMaterial color="#ad8962" {...mat} /></mesh>}
    {itemId === "hatchet" && <>
      <mesh rotation={[0, 0, -0.25]} castShadow><boxGeometry args={[0.028, 0.24, 0.028]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
      <mesh position={[0.035, 0.07, 0]} castShadow><boxGeometry args={[0.095, 0.075, 0.04]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "improvised-spear" && <>
      <mesh rotation={[0, 0, -0.15]} castShadow><boxGeometry args={[0.025, 0.34, 0.025]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
      <mesh position={[0.025, 0.18, 0]} rotation={[0, 0, -0.15]} castShadow><coneGeometry args={[0.035, 0.11, 4]} /><meshStandardMaterial color="#71777a" {...mat} /></mesh>
    </>}
    {itemId === "improvised-bow" && <>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><torusGeometry args={[0.12, 0.018, 4, 7, Math.PI]} /><meshStandardMaterial color="#896445" {...mat} /></mesh>
      <mesh castShadow><boxGeometry args={[0.018, 0.22, 0.018]} /><meshStandardMaterial color="#ad8962" {...mat} /></mesh>
    </>}
    {itemId === "emergency-blanket" && <mesh rotation={[0, 0, -0.2]} castShadow><boxGeometry args={[0.16, 0.18, 0.025]} /><meshStandardMaterial color="#e8c547" {...mat} /></mesh>}
    {itemId === "seashell" && <mesh rotation={[0, 0, -0.25]} castShadow><coneGeometry args={[0.075, 0.18, 5]} /><meshStandardMaterial color="#d6bc85" {...mat} /></mesh>}
  </group>;
}
