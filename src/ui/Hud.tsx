import { useEffect, useRef, useState } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'
import { nav } from '../three/nav'

interface Props {
  onOpenFilters: () => void
}

// Minimal auto-hiding glass HUD: wordmark, control cluster (Tour · Sound ·
// Filters), and a thin bottom rail-progress + "now viewing" caption.
export function Hud({ onOpenFilters }: Props) {
  const entered = useGalleryStore((s) => s.entered)
  const tourOn = useGalleryStore((s) => s.tourOn)
  const audioOn = useGalleryStore((s) => s.audioOn)
  const isTransitioning = useGalleryStore((s) => s.isTransitioning)
  const toggleTour = useGalleryStore((s) => s.toggleTour)
  const toggleAudio = useGalleryStore((s) => s.toggleAudio)

  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<number>(0)
  const fillRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  // Auto-hide after 3s idle; any input brings it back.
  useEffect(() => {
    const reset = () => {
      setIdle(false)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => setIdle(true), 3000)
    }
    reset()
    const evs = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'] as const
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(idleTimer.current)
      evs.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  // Live rail progress + nearest-piece caption (rAF; nav is updated by CameraRig).
  useEffect(() => {
    let raf = 0
    let lastId: number | null = null
    const tick = () => {
      if (fillRef.current) fillRef.current.style.width = `${(nav.t * 100).toFixed(1)}%`
      if (labelRef.current && nav.nearestId !== lastId) {
        lastId = nav.nearestId
        const art = useGalleryStore.getState().artworks.find((a) => a.objectID === nav.nearestId)
        labelRef.current.textContent = art ? `${art.artist} · ${art.date || '—'}` : 'The Met · Public Domain'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!entered) return null
  const hidden = idle || isTransitioning

  return (
    <div className={`hud ${hidden ? 'hud--hidden' : ''}`}>
      <div className="hud__wordmark">VITRINE</div>

      <div className="hud__cluster glass">
        <button
          className={`hud__btn ${tourOn ? 'is-active' : ''}`}
          onClick={toggleTour}
          title="Auto-tour"
          aria-label="Toggle auto-tour"
        >
          {tourOn ? '❚❚' : '▶'}
        </button>
        <span className="hud__sep" />
        <button
          className={`hud__btn ${audioOn ? 'is-active' : ''}`}
          onClick={toggleAudio}
          title="Sound"
          aria-label="Toggle sound"
        >
          {audioOn ? '◉' : '◌'}
        </button>
        <span className="hud__sep" />
        <button className="hud__btn" onClick={onOpenFilters} title="Filters" aria-label="Open filters">
          ☰
        </button>
      </div>

      <div className="hud__progress">
        <div className="hud__progress-track">
          <div ref={fillRef} className="hud__progress-fill" />
        </div>
        <div ref={labelRef} className="hud__progress-label">
          The Met · Public Domain
        </div>
      </div>
    </div>
  )
}
