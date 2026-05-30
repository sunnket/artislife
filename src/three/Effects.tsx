import { useMemo } from 'react'
import * as THREE from 'three'
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  SMAA,
} from '@react-three/postprocessing'
import { postFx } from './postfx'
import { DOF, BLOOM, VIGNETTE, CHROMA, NOISE_OPACITY } from './constants'

// The cinematography pipeline (Section 7). Order matters. Effect instances are
// captured into postFx so the hero-zoom choreography can animate them per-frame.
export function Effects({ mobile = false }: { mobile?: boolean }) {
  const caOffset = useMemo(() => new THREE.Vector2(CHROMA.base, CHROMA.base), [])

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField
        ref={(e: unknown) => void (postFx.dof = (e as typeof postFx.dof) ?? null)}
        focusDistance={DOF.focusDistanceBrowse}
        focalLength={DOF.focalLength}
        bokehScale={DOF.bokehBrowse}
      />
      <Bloom
        ref={(e: unknown) => void (postFx.bloom = (e as typeof postFx.bloom) ?? null)}
        intensity={mobile ? BLOOM.intensity * 0.7 : BLOOM.intensity}
        luminanceThreshold={BLOOM.threshold}
        luminanceSmoothing={BLOOM.smoothing}
        mipmapBlur
      />
      <Vignette
        ref={(e: unknown) => void (postFx.vignette = (e as typeof postFx.vignette) ?? null)}
        offset={VIGNETTE.offset}
        darkness={VIGNETTE.darkness}
        eskil={false}
      />
      <ChromaticAberration
        ref={(e: unknown) => void (postFx.ca = (e as typeof postFx.ca) ?? null)}
        offset={caOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={NOISE_OPACITY} premultiply />
      <SMAA />
    </EffectComposer>
  )
}
