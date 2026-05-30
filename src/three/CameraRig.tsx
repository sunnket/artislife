import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ORBIT } from './constants'
import { useGalleryStore } from '../state/useGalleryStore'
import { nav } from './nav'
import { helix, HELIX } from './helix'

const TAU = Math.PI * 2
const clamp = THREE.MathUtils.clamp

// Orbit-view camera that circles the tornado (replaces the rail). Gentle
// auto-orbit when idle, drag to orbit, wheel to dolly; an intro push-in from
// high/far on Enter; hands the camera to the hero-zoom choreography while
// transitioning. The artworks come to the viewer (they revolve), so this only
// frames the vortex.
export function CameraRig() {
  const { camera, gl } = useThree()

  const theta = useRef<number>(0.7)
  const phi = useRef<number>(ORBIT.elevation)
  const radius = useRef<number>(ORBIT.radius)
  const tTheta = useRef<number>(0.7)
  const tPhi = useRef<number>(ORBIT.elevation)
  const tRadius = useRef<number>(ORBIT.radius)
  const lastInput = useRef(0)
  const intro = useRef(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDist = useRef(0)
  const center = useRef(new THREE.Vector3(0, ORBIT.lookHeight, 0))
  const pos = useRef(new THREE.Vector3())

  useEffect(() => {
    const el = gl.domElement
    if (import.meta.env.DEV) (window as unknown as { __helix: unknown }).__helix = helix
    const locked = () => useGalleryStore.getState().isTransitioning
    const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y)

    // Each scroll/swipe ADDS momentum (up = faster + climb, down = slower/reverse +
    // descend); the pool eases it back to the gentle base spin slowly. So two flicks
    // up stack into a faster spin; a flick down eases it back toward normal.
    const spinImpulse = (delta: number, sens: number) => {
      helix.vel = clamp(helix.vel - delta * sens, -HELIX.maxVel, HELIX.maxVel)
      lastInput.current = performance.now()
    }

    const onWheel = (e: WheelEvent) => {
      if (locked()) return
      if (e.ctrlKey) {
        // pinch-zoom gesture on a trackpad → dolly the camera
        tRadius.current = clamp(
          tRadius.current + e.deltaY * ORBIT.pinchWheelZoom,
          ORBIT.minRadius,
          ORBIT.maxRadius,
        )
        lastInput.current = performance.now()
      } else {
        // vertical scroll / two-finger swipe → add spin momentum
        spinImpulse(e.deltaY, HELIX.wheelImpulse)
      }
    }

    const onDown = (e: PointerEvent) => {
      if (locked()) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        pinchDist.current = dist2(a, b)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (locked()) return
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const next = { x: e.clientX, y: e.clientY }
      pointers.current.set(e.pointerId, next)

      if (pointers.current.size >= 2) {
        // two-finger pinch → dolly (stretch out = zoom in → smaller radius)
        const [a, b] = [...pointers.current.values()]
        const d = dist2(a, b)
        if (pinchDist.current > 0) {
          tRadius.current = clamp(
            tRadius.current - (d - pinchDist.current) * ORBIT.pinchZoom,
            ORBIT.minRadius,
            ORBIT.maxRadius,
          )
        }
        pinchDist.current = d
        lastInput.current = performance.now()
      } else {
        const dx = next.x - prev.x
        const dy = next.y - prev.y
        // horizontal drag → orbit the camera around the funnel
        if (dx !== 0) {
          useGalleryStore.getState().setTour(false)
          tTheta.current -= dx * ORBIT.dragAzimuth
        }
        // one-finger vertical swipe → add spin momentum
        spinImpulse(dy, HELIX.dragImpulse)
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchDist.current = 0
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl])

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const store = useGalleryStore.getState()
    if (store.isTransitioning) return // hero zoom owns the camera

    // The funnel of artworks revolves on its own; the camera stays steady unless
    // the viewer drags (horizontal) or Tour is on (a slow fly-around).
    if (store.entered && store.tourOn) tTheta.current += ORBIT.autoSpeed * 2 * d

    const k = ORBIT.damp * 2
    theta.current = THREE.MathUtils.damp(theta.current, tTheta.current, k, d)
    phi.current = THREE.MathUtils.damp(phi.current, tPhi.current, k, d)
    radius.current = THREE.MathUtils.damp(radius.current, tRadius.current, k, d)

    intro.current = THREE.MathUtils.damp(intro.current, store.entered ? 0 : 1, 1.5, d)

    const R = radius.current + intro.current * 9
    const PH = phi.current + intro.current * 0.22
    const horiz = Math.cos(PH) * R
    pos.current.set(
      Math.sin(theta.current) * horiz,
      ORBIT.lookHeight + Math.sin(PH) * R,
      Math.cos(theta.current) * horiz,
    )
    camera.position.copy(pos.current)
    camera.up.set(0, 1, 0)
    camera.lookAt(center.current)

    nav.t = ((theta.current / TAU) % 1 + 1) % 1
  })

  return null
}
