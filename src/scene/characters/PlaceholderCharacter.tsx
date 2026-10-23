export function PlaceholderCharacter({ tint }: { tint: string }) {
  return <group position={[0, 0, 0]} scale={1.76}>
    <mesh position={[0, 0.48, 0]} castShadow><capsuleGeometry args={[0.25, 0.52, 3, 6]} /><meshStandardMaterial color={tint} flatShading /></mesh>
    <mesh position={[0, 0.98, 0]} castShadow><icosahedronGeometry args={[0.23, 0]} /><meshStandardMaterial color="#d9d2bb" flatShading /></mesh>
  </group>;
}
