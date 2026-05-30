// Device capability detection → adaptive quality (Section 11). Computed once.
const coarse =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 820)

export const isMobile = !!coarse

export const QUALITY = {
  dpr: isMobile ? ([1, 1.5] as [number, number]) : ([1, 2] as [number, number]),
  shadows: !isMobile,
  shadowCasters: isMobile ? 0 : 4, // nearest pieces that cast shadows
  motes: isMobile ? 220 : 600,
  slots: isMobile ? 24 : 40, // dense spiral of framed pieces forming the funnel
  spiralTurns: isMobile ? 3.2 : 4.2, // helix revolutions across the vertical span
  bloomScale: isMobile ? 0.7 : 1,
  dofResolution: isMobile ? 240 : 480,
} as const
