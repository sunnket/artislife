# VITRINE — Art Is Life

A browser-based, cinematic art gallery: half a million public-domain masterpieces
**spiral around a tornado of art**, glowing in a deep gradient void. Swipe to spin
the funnel faster (up = climb, down = descend), tap any piece for a slow-motion
dolly-in with a glass info panel, and fall into the brushstrokes at full resolution.

No backend. No API keys. No login. Just light, motion, and art.

![VITRINE](https://images.metmuseum.org/CRDImages/ep/web-large/DP346474.jpg)

## What it does

- **A vortex of artworks** — the pieces themselves form a revolving, rising funnel.
  It always spins gently in place (so a piece does a full 360° and never vanishes);
  **scroll/swipe** adds momentum and lifts the funnel — scroll down brings pieces back.
  **Pinch** (or trackpad pinch) zooms; **drag horizontally** orbits the camera.
- **The hero zoom** — tap a piece and the whole funnel holds its breath: the camera
  dollies in, the background melts to bokeh, and a frosted-glass panel rises with the
  museum's own metadata + related works. **Examine** opens a full-res deep-zoom.
- **~550,000 works, keyless** — streamed and recycled on demand from three open
  collections, so memory stays bounded while the gallery feels endless:
  - [The Metropolitan Museum of Art](https://metmuseum.github.io/) (~490k objects)
  - [Cleveland Museum of Art](https://openaccess-api.clevelandart.org/) (CC0 open access)
  - [Art Institute of Chicago](https://api.artic.edu/docs/) (public domain, IIIF)
- **Discover** — search, an era "time river", department chips, a client-side
  dominant-colour filter, and "surprise me" — all client-side, no AI.
- **Soothing procedural score** — a warm Tone.js ambient pad, generated live (no files).
- **Offline-safe** — a bundled `public/seed.json` of curated CC0 works paints instantly
  and is the graceful fallback if the live APIs are unavailable. Never a blank wall.

## Tech

React 19 · Vite · TypeScript · three.js + React Three Fiber · @react-three/postprocessing
(DOF · bloom · vignette · grain · ACES) · GSAP · maath · Zustand · Tone.js.

Images are routed through the keyless [wsrv.nl](https://wsrv.nl) proxy (the Met CDN
sends no CORS headers, so its images can't otherwise be used as WebGL textures).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run seed       # regenerate public/seed.json from the Met API (optional)
```

Open it, click **Enter**, and watch the tornado of art turn — swipe to spin it up.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
