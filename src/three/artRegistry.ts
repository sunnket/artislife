// Live registry of each mounted artwork's world transform + sized dimensions,
// keyed by objectID. The hero-zoom choreography reads this to compute the dolly
// target (where to place the camera so the piece fills the frame). Updated by
// Artwork as textures load / frames recycle.
export interface ArtTransform {
  w: number
  h: number
  position: [number, number, number]
  rotationY: number
}

export const artRegistry = new Map<number, ArtTransform>()
