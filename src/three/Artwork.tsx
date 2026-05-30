import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGalleryStore } from '../state/useGalleryStore'
import type { Artwork as Art } from '../data/types'
import { ART_EMISSIVE_BASE, ART_EMISSIVE_FOCUS_ADD } from './constants'
import { focus } from './focus'
import { proxied, THUMB_W } from '../data/imageProxy'

export const LONGEST = 2.0 // world units for the artwork's longest side

// NB: Met's image CDN (images.metmuseum.org) does NOT send CORS headers. A bare
// `new Image()` defaults crossOrigin to null (no CORS) so it loads fine; we then
// wrap it in a THREE.Texture. (THREE.TextureLoader defaults crossOrigin to
// 'anonymous', which would make every load fail.) Such textures are "tainted"
// (pixels unreadable) — color extraction (Section 9) handles that separately.

interface Props {
  art: Art
  castShadow?: boolean
  fade?: { value: number } // helix opacity envelope (1 = full), set by the pool
  onDims?: (w: number, h: number) => void // report sized dims for hero-zoom framing
}

function makeShimmer() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec3 base = vec3(0.05, 0.05, 0.06);
        float d = fract((vUv.x + vUv.y) * 0.5 - uTime * 0.18);
        float band = smoothstep(0.35, 0.5, d) * (1.0 - smoothstep(0.5, 0.66, d));
        vec3 col = base + band * vec3(0.10, 0.09, 0.08);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

export function Artwork({ art, castShadow = false, fade, onDims }: Props) {
  const select = useGalleryStore((s) => s.select)

  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [aspect, setAspect] = useState(1) // width / height
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const shimmer = useMemo(makeShimmer, [])
  const groupRef = useRef<THREE.Group>(null)
  const opacity = useRef(0)
  const hoverScale = useRef(1)
  const [hovered, setHovered] = useState(false)

  // Load thumbnail (independent per frame: shimmer -> fade-in). Dispose on swap.
  useEffect(() => {
    let cancelled = false
    let loaded: THREE.Texture | null = null
    opacity.current = 0
    setTex(null)

    const img = new Image()
    img.crossOrigin = 'anonymous' // safe now: proxy is CORS-enabled
    img.onload = () => {
      if (cancelled) return
      const t = new THREE.Texture(img)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8 // crisp when viewed at an angle on the funnel
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      t.needsUpdate = true
      setAspect(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1)
      loaded = t
      setTex(t)
    }
    img.onerror = () => {
      /* keep shimmer on error */
    }
    img.src = proxied(art.primaryImageSmall, THUMB_W)

    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [art.primaryImageSmall])

  // Dispose the shimmer material on unmount (R3F doesn't auto-dispose <primitive>).
  useEffect(() => () => shimmer.dispose(), [shimmer])

  const [w, h] = aspect >= 1 ? [LONGEST, LONGEST / aspect] : [LONGEST * aspect, LONGEST]

  // Report sized dimensions to the pool (for hero-zoom framing distance).
  useEffect(() => {
    onDims?.(w, h)
  }, [w, h, onDims])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    shimmer.uniforms.uTime.value = state.clock.elapsedTime
    const env = fade ? fade.value : 1 // helix fade envelope

    // fade the image in once ready (× helix envelope)
    if (tex && matRef.current) {
      opacity.current = THREE.MathUtils.damp(opacity.current, 1, 4, d)
      matRef.current.opacity = opacity.current * env
    }

    // hover lift
    const targetScale = hovered ? 1.03 : 1
    hoverScale.current = THREE.MathUtils.damp(hoverScale.current, targetScale, 8, d)
    if (groupRef.current) groupRef.current.scale.setScalar(hoverScale.current)

    // focus boost (hero zoom): the focused piece glows brighter
    const focused = focus.selectedId === art.objectID
    const fp = focused ? focus.progress : 0
    if (matRef.current) {
      matRef.current.emissiveIntensity =
        (ART_EMISSIVE_BASE + ART_EMISSIVE_FOCUS_ADD * fp) * opacity.current * env
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (useGalleryStore.getState().isTransitioning) return
    select(art.objectID)
  }

  return (
    <group ref={groupRef}>
      {/* Double-sided luminous art card — visible from both faces (no occluding
          frame), so the funnel reads as art from every angle. */}
      <mesh
        castShadow={castShadow}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[w, h]} />
        {tex ? (
          <meshStandardMaterial
            ref={matRef}
            map={tex}
            emissive={'#ffffff'}
            emissiveMap={tex}
            emissiveIntensity={0}
            roughness={0.95}
            metalness={0}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        ) : (
          <primitive object={shimmer} attach="material" />
        )}
      </mesh>
    </group>
  )
}
