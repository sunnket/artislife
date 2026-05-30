import type { AmbientLight } from 'three'

// Handle to the scene ambient light so the hero zoom can dim it (0.12 -> 0.045).
export const lights: { ambient: AmbientLight | null } = { ambient: null }
