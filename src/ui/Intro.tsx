import { useRef } from 'react'
import * as Tone from 'tone'
import { useGalleryStore } from '../state/useGalleryStore'

// Black screen → serif title fades up → dim subtitle → glass Enter. Enter ripples,
// (audio starts in Step 8), and the camera pushes in from darkness. The Scene
// renders behind this overlay so textures preload during the title.
export function Intro() {
  const entered = useGalleryStore((s) => s.entered)
  const loading = useGalleryStore((s) => s.loading)
  const enter = useGalleryStore((s) => s.enter)
  const btnRef = useRef<HTMLButtonElement>(null)

  const onEnter = () => {
    if (loading) return
    // Unlock the AudioContext from within the user gesture (Tone graph builds in
    // useAmbientAudio once `entered` flips).
    void Tone.start()
    // ripple
    const btn = btnRef.current
    if (btn) {
      const span = document.createElement('span')
      span.className = 'ripple'
      btn.appendChild(span)
      window.setTimeout(() => span.remove(), 900)
    }
    enter()
  }

  return (
    <div className={`intro ${entered ? 'intro--leaving' : ''}`} aria-hidden={entered}>
      <div className="intro__inner">
        <h1 className="intro__title">VITRINE</h1>
        <p className="intro__subtitle">A cinematic gallery of public-domain masterworks</p>
        <button
          ref={btnRef}
          className="glass-btn intro__enter"
          onClick={onEnter}
          disabled={loading}
        >
          {loading ? 'Preparing the gallery' : 'Enter'}
        </button>
      </div>
    </div>
  )
}
