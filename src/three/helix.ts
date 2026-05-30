import { QUALITY } from './device'

// The artworks form the tornado: a spiral whose radius widens with height. The
// funnel ALWAYS spins gently (so pieces revolve 360° forever and never vanish on
// their own). Vertical rise happens ONLY from the scroll-driven excess velocity —
// scroll up = pieces climb, scroll down = they come back. Velocity is impulse-based
// (each scroll adds momentum) and eases back to the gentle base spin slowly.
export const SLOTS = QUALITY.slots

export const HELIX = {
  rBottom: 5.6, // funnel radius at the base — wide enough that pieces don't overlap
  rTop: 11.5, // funnel radius at the crown
  rCurve: 0.82,
  yBottom: -3.5,
  yTop: 14,
  turns: QUALITY.spiralTurns,
  baseVel: 0.17, // gentle base angular velocity (rad/sec) — the constant revolve
  maxVel: 3.2, // clamp for scroll-driven spin
  riseK: 0.11, // rise per (vel − base) per sec — only the scroll excess lifts pieces
  decay: 0.55, // how fast vel eases back to base (smaller = slower / more momentum)
  wheelImpulse: 0.0045, // wheel deltaY → velocity added per event
  dragImpulse: 0.012, // vertical drag px → velocity added per move
} as const

export const HELIX_SPAN = HELIX.yTop - HELIX.yBottom

export interface SlotBase {
  angle0: number
  phase0: number
}

export function slotBases(count: number): SlotBase[] {
  const out: SlotBase[] = []
  for (let i = 0; i < count; i++) {
    const f = i / count
    out.push({ angle0: f * Math.PI * 2 * HELIX.turns, phase0: f })
  }
  return out
}

// Funnel radius at a normalized height phase (0 = base, 1 = crown).
export function radiusAt(phase: number): number {
  return HELIX.rBottom + (HELIX.rTop - HELIX.rBottom) * Math.pow(Math.max(0, phase), HELIX.rCurve)
}

// Global animated state, advanced by the ArtworkPool; vel impulses from CameraRig.
export const helix: { angle: number; heightPhase: number; vel: number } = {
  angle: 0,
  heightPhase: 0,
  vel: HELIX.baseVel,
}

export const SLOT_BASES = slotBases(SLOTS)
