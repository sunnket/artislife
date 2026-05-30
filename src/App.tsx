import { Scene } from './three/Scene'
import { useArtworkStream } from './data/useArtworkStream'
import { useAmbientAudio } from './audio/useAmbientAudio'
import { useGalleryStore } from './state/useGalleryStore'
import { Intro } from './ui/Intro'
import { Hud } from './ui/Hud'
import { DetailPanel } from './ui/DetailPanel'
import { DeepZoom } from './ui/DeepZoom'
import { Filters } from './ui/Filters'
import { Toast } from './ui/Toast'

if (import.meta.env.DEV) {
  // expose store for preview/debugging
  ;(window as unknown as { __gallery: typeof useGalleryStore }).__gallery = useGalleryStore
}

export default function App() {
  useArtworkStream()
  useAmbientAudio()
  const deepZoomOpen = useGalleryStore((s) => s.deepZoomOpen)
  const toggleFilters = useGalleryStore((s) => s.toggleFilters)

  return (
    <div id="app-root">
      <Scene />
      <div className="ui-layer">
        <Hud onOpenFilters={toggleFilters} />
        <Filters />
        <DetailPanel />
        {deepZoomOpen && <DeepZoom />}
        <Toast />
        <Intro />
      </div>
    </div>
  )
}
