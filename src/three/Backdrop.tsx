import { useMemo } from 'react'
import * as THREE from 'three'

// A large enclosing sphere with a soft vertical gradient — a moody dreamlike sky
// behind the funnel (deep blue-violet up high fading to near-black below) instead
// of flat void. Unlit, fog-independent, rendered on the inside (BackSide).
const RADIUS = 60

export function Backdrop() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          // Low-contrast, cohesive deep gradient — bottom matches the void so the
          // reflective floor blends in (no hard two-tone horizon).
          uTop: { value: new THREE.Color('#15112a') }, // faint deep indigo, only up high
          uMid: { value: new THREE.Color('#0b0b12') },
          uBottom: { value: new THREE.Color('#0a0a0c') }, // = void color
          uWarm: { value: new THREE.Color('#1e1018') }, // whisper of warmth at the crown
        },
        vertexShader: /* glsl */ `
          varying float vH;
          void main() {
            vH = position.y / ${RADIUS.toFixed(1)};
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uMid, uBottom, uWarm;
          varying float vH;
          void main() {
            float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
            vec3 c = mix(uBottom, uMid, smoothstep(0.0, 0.55, h));
            c = mix(c, uTop, smoothstep(0.55, 1.0, h));
            c += uWarm * smoothstep(0.86, 1.0, h) * 0.35; // whisper of warmth at the crown
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [],
  )

  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 32, 24]} />
    </mesh>
  )
}
