import { MeshReflectorMaterial } from '@react-three/drei'

// Very dark, faintly mirrored floor — the single element that carries the
// whole "gallery" feeling. Spotlights and frames reflect softly below.
export function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[300, 300]} />
      <MeshReflectorMaterial
        resolution={1024}
        blur={[320, 110]}
        mixBlur={1.2}
        mixStrength={0.55}
        mirror={0.55}
        depthScale={1.0}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.35}
        roughness={0.62}
        metalness={0.55}
        color="#0b0b0e"
      />
    </mesh>
  )
}
