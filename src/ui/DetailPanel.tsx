import { useEffect, useMemo } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'
import type { Artwork } from '../data/types'
import { proxied } from '../data/imageProxy'

// Pure-metadata "related works" (no AI): same artist, or same department within
// ±50 years of objectBeginDate.
function relatedWorks(art: Artwork, all: Artwork[]): Artwork[] {
  const byArtist = all.filter(
    (a) => a.objectID !== art.objectID && a.artist !== 'Unknown' && a.artist === art.artist,
  )
  const byContext = all.filter(
    (a) =>
      a.objectID !== art.objectID &&
      a.department === art.department &&
      Math.abs(a.beginDate - art.beginDate) <= 50,
  )
  const seen = new Set<number>([art.objectID])
  const out: Artwork[] = []
  for (const a of [...byArtist, ...byContext]) {
    if (seen.has(a.objectID)) continue
    seen.add(a.objectID)
    out.push(a)
    if (out.length >= 8) break
  }
  return out
}

export function DetailPanel() {
  const selectedId = useGalleryStore((s) => s.selectedId)
  const panelVisible = useGalleryStore((s) => s.panelVisible)
  const artworks = useGalleryStore((s) => s.artworks)
  const select = useGalleryStore((s) => s.select)
  const openDeepZoom = useGalleryStore((s) => s.openDeepZoom)
  const deepZoomOpen = useGalleryStore((s) => s.deepZoomOpen)

  const art = useMemo(
    () => artworks.find((a) => a.objectID === selectedId) ?? null,
    [artworks, selectedId],
  )
  const related = useMemo(() => (art ? relatedWorks(art, artworks) : []), [art, artworks])

  // Esc closes the focused view (unless deep-zoom is open — it handles its own Esc).
  useEffect(() => {
    if (!selectedId || deepZoomOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, deepZoomOpen, select])

  if (!art) return null

  const lines = [
    art.artist,
    [art.date, art.medium].filter(Boolean).join('  ·  '),
    [art.culture, art.department].filter(Boolean).join('  ·  '),
    art.dimensions,
  ].filter(Boolean) as string[]

  return (
    <>
      <div className={`scrim ${panelVisible ? 'scrim--on' : ''}`} onClick={() => select(null)} />
      <aside className={`panel glass ${panelVisible ? 'panel--on' : ''}`} key={art.objectID}>
        <button className="panel__close" onClick={() => select(null)} aria-label="Close">
          ×
        </button>
        <h2 className="panel__title">{art.title}</h2>

        <div className="panel__meta">
          {lines.map((l, i) => (
            <p key={i} className="panel__line" style={{ animationDelay: `${i * 45}ms` }}>
              {l}
            </p>
          ))}
        </div>

        {art.creditLine && (
          <p
            className="panel__credit panel__line"
            style={{ animationDelay: `${lines.length * 45}ms` }}
          >
            {art.creditLine}
          </p>
        )}

        <div className="panel__actions">
          <button className="glass-btn panel__examine" onClick={openDeepZoom}>
            Examine
          </button>
        </div>

        {related.length > 0 && (
          <div className="panel__related">
            <div className="panel__related-label">Related works</div>
            <div className="panel__related-rail">
              {related.map((r) => (
                <button
                  key={r.objectID}
                  className="panel__related-thumb"
                  onClick={() => select(r.objectID)}
                  title={`${r.title} — ${r.artist}`}
                >
                  <img src={proxied(r.primaryImageSmall, 140)} alt={r.title} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
