import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from './motion'

interface Props {
  count?: number
  bounds?: [number, number, number] // full width, height, depth of the mote box
}

// A thin layer of slow-drifting dust motes (subtle additive Points). Their drift
// speed is multiplied by motion.dustSpeed, which the hero zoom drops to ~0.2 —
// the time-dilation cue (Section 6).
export function DustMotes({ count = 600, bounds = [36, 10, 70] }: Props) {
  const ref = useRef<THREE.Points>(null)
  const hw = bounds[0] / 2
  const hh = bounds[1]
  const hd = bounds[2] / 2

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() * 2 - 1) * hw
      positions[i * 3 + 1] = Math.random() * hh
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * hd
      velocities[i] = 0.02 + Math.random() * 0.05
    }
    return { positions, velocities }
  }, [count, hw, hh, hd])

  useFrame((_, dt) => {
    const pts = ref.current
    if (!pts) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    const speed = motion.dustSpeed
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + velocities[i] * d * speed
      if (y > hh) y = 0
      arr[i * 3 + 1] = y
      arr[i * 3 + 0] += Math.sin(y * 0.5 + i) * 0.0007 * speed
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#fff4e6"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
