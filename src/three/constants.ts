// Centralized, tuned constants. Dev-tune with leva if desired, then bake here.

export const COLORS = {
  void: '#0a0a0c',
  spotWarm: '#fff4e6',
  rimCool: '#3a4658',
  gold: '#d4b483',
  frame: '#0d0d10',
  frameBevel: '#6b573a', // warm metal inner bevel ("gold" without gaudiness)
} as const

// Atmosphere
export const FOG_DENSITY = 0.024
export const EXPOSURE = 1.06

// Lighting (animated during the hero zoom)
export const AMBIENT_BASE = 0.17
export const AMBIENT_FOCUS = 0.06
export const SPOT_BASE_INTENSITY = 38 // physically-based units (three r155+)
export const SPOT_FOCUS_MULT = 1.22

// The dense funnel of artworks is self-luminous (emissive) rather than lit by 40
// individual spotlights — a glowing spiral of art. Base glow keeps them readable
// floating in the void; the focused piece brightens further during the hero zoom.
export const ART_EMISSIVE_BASE = 0.62
export const ART_EMISSIVE_FOCUS_ADD = 0.5

// Postprocessing — starting values (Section 7)
export const DOF = {
  focusDistanceBrowse: 0.05, // normalized seed for the <DepthOfField> prop (overridden imperatively)
  focalLength: 0.02,
  bokehBrowse: 0.55, // minimal blur while browsing so the art reads clearly
  bokehZoom: 5,
  // World-unit focus control (postprocessing v6 CoC works in world units). Wide
  // range while browsing keeps the whole funnel sharp; a moderate range while
  // focused keeps the flat piece sharp while the background melts to bokeh.
  focusWorldBrowse: 14,
  focusRangeBrowse: 30,
  focusRangeFocus: 2.6,
} as const
export const BLOOM = { intensity: 0.5, threshold: 0.9, smoothing: 0.22 } as const
export const VIGNETTE = { offset: 0.35, darkness: 0.7, darknessFocus: 0.85 } as const
export const CHROMA = { base: 0.0004, zoom: 0.0013 } as const
export const NOISE_OPACITY = 0.045

// Camera
export const CAMERA = { fov: 50, near: 0.1, far: 100, eyeHeight: 1.55 } as const

// Rail (Section 5)
export const RAIL = {
  lookAhead: 0.012,
  tSmoothTime: 0.55, // maath easing.damp smoothing for t -> targetT
  wheelSensitivity: 0.00009,
  dragSensitivity: 0.00035,
  speedClamp: 0.05, // max |targetT - t| applied per input burst
  autoTourSpeed: 0.012, // t per second (explicit documentary tour)
  autoScrollSpeed: 0.0065, // t per second (gentle idle auto-scroll, always on)
  autoScrollResume: 2, // seconds of no input before idle auto-scroll resumes
  fillViewport: 0.76, // hero zoom: work fills ~76% of viewport height
} as const

// Orbit-view camera (circles the tornado; replaces the rail)
export const ORBIT = {
  radius: 19, // default distance from the axis
  minRadius: 13.5, // stay just outside the funnel crown (rTop ~11.5)
  maxRadius: 34,
  lookHeight: 5.6, // y the camera looks at (mid-helix)
  elevation: 0.1, // radians above horizontal
  autoSpeed: 0.045, // rad/sec gentle auto-orbit when idle
  resume: 2, // seconds after input before auto-orbit resumes
  dragAzimuth: 0.0042, // horizontal drag → camera orbit
  wheelSpin: 0.014, // vertical scroll/swipe → tornado spin/rise velocity
  pinchZoom: 0.03, // two-finger touch pinch (distance px) → dolly radius
  pinchWheelZoom: 0.06, // trackpad pinch (ctrl+wheel deltaY) → dolly radius
  damp: 0.5,
} as const

// Tornado vortex (GPU particle funnel)
export const TORNADO = {
  yBottom: -1, // narrow base just below the floor (touches down)
  yTop: 14,
  rBottom: 0.35,
  rTop: 5.2,
  rise: 0.05, // phase/sec upward
  swirl: 0.55, // base angular speed
} as const

// Hero zoom timing (Section 6)
export const ZOOM = {
  inDuration: 2.4,
  outDuration: 1.6,
  panelAt: 0.66, // fraction of timeline when the detail panel rises
} as const
