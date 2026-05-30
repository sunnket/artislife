import { useEffect, useMemo, useRef } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'
import { proxied, FULL_W } from '../data/imageProxy'

// Fullscreen pan/zoom of the high-res image (CSS transform + inertial easing).
// Drag to pan, wheel/pinch to zoom, double-tap/click to reset. The full-res image
// was warmed during the hero dolly, so it appears instantly.
export function DeepZoom() {
  const selectedId = useGalleryStore((s) => s.selectedId)
  const artworks = useGalleryStore((s) => s.artworks)
  const close = useGalleryStore((s) => s.closeDeepZoom)

  const art = useMemo(
    () => artworks.find((a) => a.objectID === selectedId) ?? null,
    [artworks, selectedId],
  )

  const imgRef = useRef<HTMLImageElement>(null)
  const target = useRef({ scale: 1, x: 0, y: 0 })
  const cur = useRef({ scale: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef({ dist: 0, scale: 1 })
  const lastTap = useRef(0)

  useEffect(() => {
    let raf = 0
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      const c = cur.current
      const t = target.current
      c.scale = lerp(c.scale, t.scale, 0.18)
      c.x = lerp(c.x, t.x, 0.18)
      c.y = lerp(c.y, t.y, 0.18)
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.scale})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!art) return null

  const clampScale = (s: number) => Math.min(6, Math.max(1, s))
  const reset = () => {
    target.current = { scale: 1, x: 0, y: 0 }
  }

  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const ns = clampScale(target.current.scale * factor)
    target.current.scale = ns
    if (ns === 1) {
      target.current.x = 0
      target.current.y = 0
    }
  }

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = { dist: dist(a, b), scale: target.current.scale }
    }
    const now = Date.now()
    if (now - lastTap.current < 300) reset()
    lastTap.current = now
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, next)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = dist(a, b)
      if (pinchStart.current.dist > 0) {
        target.current.scale = clampScale((d / pinchStart.current.dist) * pinchStart.current.scale)
      }
    } else if (pointers.current.size === 1 && target.current.scale > 1) {
      target.current.x += next.x - prev.x
      target.current.y += next.y - prev.y
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (target.current.scale <= 1.01) reset()
  }

  return (
    <div
      className="deepzoom"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={reset}
    >
      <button className="glass-btn deepzoom__close" onClick={close} aria-label="Close deep zoom">
        ×
      </button>
      <img
        ref={imgRef}
        className="deepzoom__img"
        src={proxied(art.primaryImage, FULL_W)}
        alt={art.title}
        draggable={false}
      />
      <div className="deepzoom__hint">Drag to pan · scroll or pinch to zoom · double-tap to reset</div>
    </div>
  )
}
