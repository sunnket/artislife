import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense } from 'react'
import { Backdrop } from './Backdrop'
import { Effects } from './Effects'
import { ArtworkPool } from './ArtworkPool'
import { CameraRig } from './CameraRig'
import { ZoomChoreographer } from './ZoomChoreographer'
import { lights } from './lights'
import { QUALITY, isMobile } from './device'
import { COLORS, FOG_DENSITY, AMBIENT_BASE, EXPOSURE, CAMERA } from './constants'

export function Scene() {
  return (
    <Canvas
      shadows={QUALITY.shadows}
      dpr={QUALITY.dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: [0, 11, 24], // intro vantage; CameraRig drives it after
      }}
      onCreated={(state) => {
        state.gl.toneMapping = THREE.ACESFilmicToneMapping
        state.gl.toneMappingExposure = EXPOSURE
        if (import.meta.env.DEV) {
          ;(window as unknown as { __three: typeof state }).__three = state
        }
      }}
    >
      <color attach="background" args={[COLORS.void]} />
      <fogExp2 attach="fog" args={[COLORS.void, FOG_DENSITY]} />
      <Backdrop />

      {/* The artworks glow (emissive). Ambient + a faint warm/cool pair of fills
          give their surfaces a touch of modelling as they revolve. */}
      <ambientLight
        ref={(l) => void (lights.ambient = l)}
        intensity={AMBIENT_BASE}
      />
      <directionalLight position={[-9, 6, -7]} intensity={0.28} color={COLORS.rimCool} />
      <directionalLight position={[8, 4, 9]} intensity={0.22} color={COLORS.spotWarm} />

      <CameraRig />
      <ZoomChoreographer />

      <Suspense fallback={null}>
        <ArtworkPool />
        <Preload all />
      </Suspense>

      <Effects mobile={isMobile} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  )
}
