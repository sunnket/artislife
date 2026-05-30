import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  // three.js + postprocessing + gsap + tone make a legitimately large single
  // chunk for a cinematic 3D app; the Intro overlay covers the brief load.
  build: { chunkSizeWarningLimit: 2000 },
})
