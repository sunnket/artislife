import type {
  DepthOfFieldEffect,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
} from 'postprocessing'

// Module singleton holding the live postprocessing effect instances, assigned by
// <Effects/> on mount and mutated imperatively in useFrame by the hero-zoom
// choreography (cheaper than React re-renders for per-frame param animation).
export const postFx: {
  dof: DepthOfFieldEffect | null
  bloom: BloomEffect | null
  ca: ChromaticAberrationEffect | null
  vignette: VignetteEffect | null
} = { dof: null, bloom: null, ca: null, vignette: null }
