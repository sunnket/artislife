import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGalleryStore } from '../state/useGalleryStore'
import { getObject } from '../data/metApi'
import { dominantHue, hueDistance } from '../data/colorExtract'
import { Artwork, LONGEST } from './Artwork'
import { SLOTS, SLOT_BASES, HELIX, HELIX_SPAN, helix, radiusAt } from './helix'
import { artRegistry, type ArtTransform } from './artRegistry'
import { poolSlots } from './poolState'
import { QUALITY } from './device'
import { nav } from './nav'
import type { Artwork as Art } from '../data/types'

const wrap01 = (v: number) => ((v % 1) + 1) % 1
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const HUE_THRESHOLD = 42
const MAX_TRIES = 16

// The artworks orbit the tornado on a tall rising helix. Each slot is a wrapper
// group the pool positions every frame (revolve + rise); when a slot crests the
// top it wraps to the bottom (off-screen) and is reassigned the next pool work —
// so the same piece never repeats while revolving. The helix freezes during the
// hero zoom so the focused piece holds still. Streams the full Met pool on demand.
export function ArtworkPool() {
  const pool = useGalleryStore((s) => s.pool)
  const hue = useGalleryStore((s) => s.filters.hue)
  const setArtworks = useGalleryStore((s) => s.setArtworks)

  const [slots, setSlots] = useState<(Art | null)[]>(() => Array(SLOTS).fill(null))

  // per-slot stable handles
  const groupRefs = useRef<(THREE.Group | null)[]>(Array(SLOTS).fill(null))
  const refFns = useRef(
    Array.from({ length: SLOTS }, (_, i) => (el: THREE.Group | null) => {
      groupRefs.current[i] = el
    }),
  )
  const fades = useRef(Array.from({ length: SLOTS }, () => ({ value: 0 })))
  const dims = useRef(Array.from({ length: SLOTS }, () => ({ w: LONGEST, h: LONGEST })))
  const onDimsFns = useRef(
    Array.from({ length: SLOTS }, (_, i) => (w: number, h: number) => {
      dims.current[i] = { w, h }
    }),
  )
  const regObjs = useRef<ArtTransform[]>(
    Array.from({ length: SLOTS }, () => ({ w: LONGEST, h: LONGEST, position: [0, 0, 0], rotationY: 0 })),
  )
  const prevPhase = useRef<number[]>(Array(SLOTS).fill(0))

  // streaming bookkeeping
  const poolRef = useRef<number[]>([])
  const hueRef = useRef<number | null>(null)
  const cursor = useRef(0)
  const filling = useRef<boolean[]>(Array(SLOTS).fill(false))
  const slotsRef = useRef<(Art | null)[]>(Array(SLOTS).fill(null))
  const gen = useRef(0)
  const commitTimer = useRef(0)

  useEffect(() => {
    poolSlots.length = SLOTS
    poolSlots.fill(null)
  }, [])

  const nextId = (): number | null => {
    const p = poolRef.current
    if (!p.length) return null
    const id = p[cursor.current % p.length]
    cursor.current++
    return id
  }

  const commit = () => {
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => {
      const next = [...slotsRef.current]
      setSlots(next)
      setArtworks(next.filter((a): a is Art => !!a))
    }, 70)
  }

  // Advance through the pool until a displayable (PD + image, colour-matching if a
  // swatch is active) record is found, then assign it to the slot.
  const fillSlot = async (i: number, g: number) => {
    if (filling.current[i]) return
    filling.current[i] = true
    try {
      for (let tries = 0; tries < MAX_TRIES; tries++) {
        if (g !== gen.current) return
        const id = nextId()
        if (id == null) return
        const art = await getObject(id)
        if (g !== gen.current) return
        if (!art || !art.primaryImageSmall || !art.isPublicDomain) continue
        if (hueRef.current != null) {
          const hh = await dominantHue(art.objectID, art.primaryImageSmall)
          if (g !== gen.current) return
          if (hh == null || hueDistance(hh, hueRef.current) > HUE_THRESHOLD) continue
        }
        const old = slotsRef.current[i]
        if (old && old.objectID !== art.objectID) artRegistry.delete(old.objectID)
        slotsRef.current[i] = art
        poolSlots[i] = art.objectID
        commit()
        return
      }
    } finally {
      filling.current[i] = false
    }
  }

  // (Re)stream on pool/colour change — old frames stay until replacements load.
  useEffect(() => {
    poolRef.current = pool
    hueRef.current = hue
    gen.current++
    cursor.current = 0
    for (let i = 0; i < SLOTS; i++) fillSlot(i, gen.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, hue])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const frozen = useGalleryStore.getState().isTransitioning

    // Velocity carries momentum from scroll impulses and eases back to the gentle
    // base spin slowly. The funnel ALWAYS revolves (base spin); vertical rise comes
    // only from the scroll-driven excess, so idle pieces spin 360° in place and
    // never vanish, while scrolling lifts them (and scroll-down brings them back).
    helix.vel = THREE.MathUtils.damp(helix.vel, HELIX.baseVel, HELIX.decay, d)
    if (!frozen) {
      helix.angle += helix.vel * d
      helix.heightPhase += (helix.vel - HELIX.baseVel) * HELIX.riseK * d
    }
    const g = gen.current
    const cam = state.camera
    let best = -1
    let bestD = Infinity

    for (let i = 0; i < SLOTS; i++) {
      const base = SLOT_BASES[i]
      const phase = wrap01(base.phase0 + helix.heightPhase)
      const y = HELIX.yBottom + phase * HELIX_SPAN
      const ang = base.angle0 + helix.angle
      const r = radiusAt(phase) // funnel: widens with height
      const x = r * Math.sin(ang)
      const z = r * Math.cos(ang)

      const grp = groupRefs.current[i]
      if (grp) {
        grp.position.set(x, y, z)
        grp.rotation.set(0, ang, 0)
      }

      // fade envelope (full in the visible band; fades at the off-screen wrap edges)
      fades.current[i].value = smoothstep(0, 0.07, phase) * (1 - smoothstep(0.9, 1, phase))

      // keep the registry current (mutate in place) for the hero zoom
      const reg = regObjs.current[i]
      reg.position[0] = x
      reg.position[1] = y
      reg.position[2] = z
      reg.rotationY = ang
      reg.w = dims.current[i].w
      reg.h = dims.current[i].h
      const sa = slotsRef.current[i]
      if (sa) artRegistry.set(sa.objectID, reg)

      // wrap (either direction, off-screen) → reassign the next pool work
      if (!frozen && Math.abs(phase - prevPhase.current[i]) > 0.6) fillSlot(i, g)
      prevPhase.current[i] = phase

      // nearest visible piece → HUD caption
      if (sa && fades.current[i].value > 0.5) {
        const dx = x - cam.position.x
        const dy = y - cam.position.y
        const dz = z - cam.position.z
        const dd = dx * dx + dy * dy + dz * dz
        if (dd < bestD) {
          bestD = dd
          best = i
        }
      }
    }
    nav.nearestId = best >= 0 ? slotsRef.current[best]?.objectID ?? null : null
  })

  return (
    <group>
      {slots.map((art, i) => (
        <group key={i} ref={refFns.current[i]}>
          {art && (
            <Artwork
              key={art.objectID}
              art={art}
              fade={fades.current[i]}
              onDims={onDimsFns.current[i]}
              castShadow={i < QUALITY.shadowCasters}
            />
          )}
        </group>
      ))}
    </group>
  )
}
