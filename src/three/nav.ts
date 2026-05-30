// Live rail position (0..1) + nearest piece, written by the CameraRig each frame
// and read by the DOM HUD (via rAF) for the bottom progress/era indicator.
export const nav = {
  t: 0,
  nearestId: null as number | null,
}
