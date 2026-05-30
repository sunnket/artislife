import * as THREE from 'three'
import { CAMERA } from './constants'
import { QUALITY } from './device'

// A long, gentle closed loop through the void — S-curves so the glide feels
// alive, and a loop so recycling + auto-tour wrap naturally (Section 5).
const RAIL_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 22),
  new THREE.Vector3(12, 0, 13),
  new THREE.Vector3(15, 0, -6),
  new THREE.Vector3(7, 0, -22),
  new THREE.Vector3(-6, 0, -27),
  new THREE.Vector3(-16, 0, -13),
  new THREE.Vector3(-14, 0, 8),
  new THREE.Vector3(-4, 0, 19),
]

export const rail = new THREE.CatmullRomCurve3(RAIL_POINTS, true, 'catmullrom', 0.5)

export const GALLERY_SLOTS = QUALITY.slots

export interface Placement {
  position: [number, number, number]
  rotationY: number
  t: number
}

const UP = new THREE.Vector3(0, 1, 0)

// Distribute `count` slots along the loop, offset to alternating sides, facing
// inward toward the rail, hung at eye height with slight vertical variation.
export function railPlacements(count: number, offset = 2.8): Placement[] {
  const out: Placement[] = []
  const pos = new THREE.Vector3()
  const tan = new THREE.Vector3()
  const normal = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const t = i / count
    rail.getPointAt(t, pos)
    rail.getTangentAt(t, tan)
    normal.crossVectors(tan, UP).normalize() // side direction in xz-plane
    const side = i % 2 === 0 ? 1 : -1
    const px = pos.x + normal.x * offset * side
    const pz = pos.z + normal.z * offset * side
    const py = CAMERA.eyeHeight + Math.sin(i * 1.7) * 0.12
    const dirx = -normal.x * side // face inward toward the rail
    const dirz = -normal.z * side
    out.push({ position: [px, py, pz], rotationY: Math.atan2(dirx, dirz), t })
  }
  return out
}

// Shared placement set used by both the gallery and the camera's look-blend.
export const PLACEMENTS = railPlacements(GALLERY_SLOTS)
