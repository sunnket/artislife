import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { useGalleryStore } from '../state/useGalleryStore'
import { artRegistry } from './artRegistry'
import { postFx } from './postfx'
import { lights } from './lights'
import { motion } from './motion'
import { focus } from './focus'
import { proxied, FULL_W } from '../data/imageProxy'
import {
  RAIL,
  ZOOM,
  AMBIENT_BASE,
  AMBIENT_FOCUS,
  VIGNETTE,
  CHROMA,
  DOF,
} from './constants'

gsap.registerPlugin(CustomEase)
// Easing *functions* only — we advance time ourselves in useFrame so the dolly
// is frame-rate independent and never stalls (GSAP's RAF ticker pauses when the
// document is hidden, which would freeze the timeline).
const EASE_IN = CustomEase.create('steadicam', 'M0,0 C0.16,1 0.3,1 1,1') // soft landing
const EASE_OUT = gsap.parseEase('power2.inOut')
const UP = new THREE.Vector3(0, 1, 0)

// Keep the selected piece tack-sharp by focusing the DOF effect exactly on it.
// The effect's own calculateFocusDistance() converts a world point to the
// correct normalized focusDistance uniform (a naive dist/far is wrong and blurs
// the piece). Setting target makes it track the point each frame too.
type DofUniforms = {
  focusDistance?: { value: number }
  focusRange?: { value: number }
}
type DofLike = {
  target?: THREE.Vector3 | null
  calculateFocusDistance?: (t: THREE.Vector3) => number
  cocMaterial?: { uniforms?: DofUniforms }
} | null

function setDofFocus(art: THREE.Vector3) {
  const dof = postFx.dof as unknown as DofLike
  if (!dof) return
  try {
    dof.target = art
    const u = dof.cocMaterial?.uniforms
    if (dof.calculateFocusDistance && u?.focusDistance) {
      u.focusDistance.value = dof.calculateFocusDistance(art)
    }
    if (u?.focusRange) u.focusRange.value = DOF.focusRangeFocus
  } catch {
    /* effect API differs — bokeh still animates */
  }
}

// Browse-state DOF: focus on the comfortable mid-rail distance with a wide range
// so passing pieces stay sharp under gentle bokeh.
function setBrowseDof() {
  const dof = postFx.dof as unknown as DofLike & { bokehScale?: number }
  if (!dof) return
  try {
    dof.bokehScale = DOF.bokehBrowse
    dof.target = null
    const u = dof.cocMaterial?.uniforms
    if (u?.focusDistance) u.focusDistance.value = DOF.focusWorldBrowse
    if (u?.focusRange) u.focusRange.value = DOF.focusRangeBrowse
  } catch {
    /* ignore */
  }
}

function restoreBrowse() {
  motion.dustSpeed = 1
  motion.ambientDrift = 1
  if (lights.ambient) lights.ambient.intensity = AMBIENT_BASE
  setBrowseDof()
  if (postFx.vignette) postFx.vignette.darkness = VIGNETTE.darkness
  if (postFx.ca) postFx.ca.offset.set(CHROMA.base, CHROMA.base)
}

export function ZoomChoreographer() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const selectedId = useGalleryStore((s) => s.selectedId)

  const phase = useRef<'idle' | 'in' | 'out'>('idle')
  const u = useRef(0) // 0..1 within the current phase
  const lastP = useRef(0) // last focus progress applied
  const pStart = useRef(0) // progress at the start of a dismissal
  const panelFired = useRef(false)
  const engaged = useRef(false)
  const browseInit = useRef(false)

  const startPos = useRef(new THREE.Vector3())
  const startQuat = useRef(new THREE.Quaternion())
  const endPos = useRef(new THREE.Vector3())
  const endQuat = useRef(new THREE.Quaternion())
  const artPos = useRef(new THREE.Vector3())
  const mat = useRef(new THREE.Matrix4())
  const n = useRef(new THREE.Vector3())

  function computeTarget(id: number): boolean {
    const reg = artRegistry.get(id)
    if (!reg) return false
    const [x, y, z] = reg.position
    artPos.current.set(x, y, z)
    n.current.set(Math.sin(reg.rotationY), 0, Math.cos(reg.rotationY))
    const fovRad = (camera.fov * Math.PI) / 180
    const dist = reg.h / (2 * Math.tan(fovRad / 2) * RAIL.fillViewport)
    endPos.current.copy(artPos.current).addScaledVector(n.current, dist)
    endPos.current.y = y
    // Camera convention (looks down -Z), so use Matrix4.lookAt — NOT
    // Object3D.lookAt, which orients +Z toward the target (camera would face away).
    mat.current.lookAt(endPos.current, artPos.current, UP)
    endQuat.current.setFromRotationMatrix(mat.current)
    return true
  }

  function applyProgress(p: number) {
    lastP.current = p
    camera.position.lerpVectors(startPos.current, endPos.current, p)
    camera.quaternion.slerpQuaternions(startQuat.current, endQuat.current, p)

    focus.progress = p
    motion.dustSpeed = 1 - 0.8 * p
    motion.ambientDrift = 1 - 0.8 * p

    if (lights.ambient) {
      lights.ambient.intensity = AMBIENT_BASE + (AMBIENT_FOCUS - AMBIENT_BASE) * p
    }
    if (postFx.dof) {
      postFx.dof.bokehScale = DOF.bokehBrowse + (DOF.bokehZoom - DOF.bokehBrowse) * p
      setDofFocus(artPos.current)
    }
    if (postFx.vignette) {
      postFx.vignette.darkness = VIGNETTE.darkness + (VIGNETTE.darknessFocus - VIGNETTE.darkness) * p
    }
    if (postFx.ca) {
      const o = CHROMA.base + (CHROMA.zoom - CHROMA.base) * p
      postFx.ca.offset.set(o, o)
    }
  }

  useEffect(() => {
    const store = useGalleryStore.getState()

    if (selectedId != null) {
      if (!computeTarget(selectedId)) return
      startPos.current.copy(camera.position)
      startQuat.current.copy(camera.quaternion)
      phase.current = 'in'
      u.current = 0
      panelFired.current = false
      engaged.current = true
      focus.selectedId = selectedId
      store.setTransitioning(true)
      store.setPanelVisible(false)

      // Warm the full-res image so deep-zoom is instant and the dolly never stutters.
      const art = store.artworks.find((a) => a.objectID === selectedId)
      if (art?.primaryImage) {
        const im = new Image()
        im.crossOrigin = 'anonymous'
        im.src = proxied(art.primaryImage, FULL_W)
      }
    } else {
      if (!engaged.current) return
      store.setPanelVisible(false)
      phase.current = 'out'
      u.current = 0
      pStart.current = lastP.current
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Dev-only deterministic helpers (the headless preview pauses RAF, so the
  // animated dolly can't be verified by waiting). Snap to the focused / browse
  // state instantly to inspect framing + exposure.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __postfx: unknown }).__postfx = postFx
    ;(window as unknown as { __hero: unknown }).__hero = {
      focusNow: (id: number) => {
        if (!computeTarget(id)) return false
        useGalleryStore.getState().setTransitioning(true)
        camera.position.copy(endPos.current)
        camera.quaternion.copy(endQuat.current)
        startPos.current.copy(endPos.current)
        startQuat.current.copy(endQuat.current)
        engaged.current = true
        phase.current = 'idle'
        focus.selectedId = id
        applyProgress(1)
        useGalleryStore.getState().setPanelVisible(true)
        return true
      },
      browseNow: () => {
        phase.current = 'idle'
        engaged.current = false
        restoreBrowse()
        focus.selectedId = null
        focus.progress = 0
        useGalleryStore.getState().setPanelVisible(false)
        useGalleryStore.getState().setTransitioning(false)
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  useFrame((_, dt) => {
    if (import.meta.env.DEV) {
      ;(window as unknown as { __zoom: unknown }).__zoom = { phase: phase.current, u: u.current, p: lastP.current }
    }
    // Initialise browse-state DOF once the effect exists (so the glide is sharp).
    if (!browseInit.current && postFx.dof) {
      setBrowseDof()
      browseInit.current = true
    }
    if (phase.current === 'idle') return
    const d = Math.min(dt, 0.05)

    if (phase.current === 'in') {
      u.current = Math.min(1, u.current + d / ZOOM.inDuration)
      applyProgress(EASE_IN(u.current))
      if (!panelFired.current && u.current >= ZOOM.panelAt) {
        panelFired.current = true
        useGalleryStore.getState().setPanelVisible(true)
      }
      if (u.current >= 1) phase.current = 'idle' // hold on the piece
    } else {
      u.current = Math.min(1, u.current + d / ZOOM.outDuration)
      applyProgress(pStart.current * (1 - (EASE_OUT as (t: number) => number)(u.current)))
      if (u.current >= 1) {
        phase.current = 'idle'
        engaged.current = false
        focus.selectedId = null
        focus.progress = 0
        restoreBrowse()
        useGalleryStore.getState().setTransitioning(false)
      }
    }
  })

  return null
}
