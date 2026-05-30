import { useEffect } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'

// Tiny, non-blocking glass toast (e.g. "Live collection unavailable — showing
// the curated set"). Auto-dismisses; never blocks the experience.
export function Toast() {
  const toast = useGalleryStore((s) => s.toast)
  const clearToast = useGalleryStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(clearToast, 4200)
    return () => window.clearTimeout(id)
  }, [toast, clearToast])

  return <div className={`glass toast ${toast ? 'toast--on' : ''}`}>{toast}</div>
}
