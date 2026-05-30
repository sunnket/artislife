import { create } from 'zustand'
import type { Artwork, Filters } from '../data/types'
import { EMPTY_FILTERS } from '../data/types'

interface GalleryState {
  // session
  entered: boolean
  audioOn: boolean
  tourOn: boolean
  freeLook: boolean

  // selection / transition
  selectedId: number | null
  isTransitioning: boolean
  deepZoomOpen: boolean
  panelVisible: boolean

  // collection
  artworks: Artwork[] // currently-visible hydrated records (slot-compacted)
  pool: number[] // large objectID pool the rail streams/recycles through
  poolCount: number // total works available for the current filter
  filters: Filters
  loading: boolean
  resolving: boolean
  filtersOpen: boolean
  surpriseTick: number

  // ephemeral UI
  toast: string | null

  // actions
  enter: () => void
  toggleAudio: () => void
  setTour: (v: boolean) => void
  toggleTour: () => void
  toggleFreeLook: () => void
  select: (id: number | null) => void
  setTransitioning: (v: boolean) => void
  setPanelVisible: (v: boolean) => void
  openDeepZoom: () => void
  closeDeepZoom: () => void
  setArtworks: (a: Artwork[]) => void
  setPool: (ids: number[]) => void
  patchArtwork: (id: number, patch: Partial<Artwork>) => void
  setFilters: (f: Partial<Filters>) => void
  resetFilters: () => void
  setLoading: (v: boolean) => void
  setResolving: (v: boolean) => void
  toggleFilters: () => void
  setFiltersOpen: (v: boolean) => void
  surprise: () => void
  showToast: (msg: string) => void
  clearToast: () => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  entered: false,
  audioOn: true,
  tourOn: false,
  freeLook: false,

  selectedId: null,
  isTransitioning: false,
  deepZoomOpen: false,
  panelVisible: false,

  artworks: [],
  pool: [],
  poolCount: 0,
  filters: { ...EMPTY_FILTERS },
  loading: true,
  resolving: false,
  filtersOpen: false,
  surpriseTick: 0,

  toast: null,

  enter: () => set({ entered: true }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setTour: (v) => set({ tourOn: v }),
  toggleTour: () => set((s) => ({ tourOn: !s.tourOn })),
  toggleFreeLook: () => set((s) => ({ freeLook: !s.freeLook })),

  select: (id) => set({ selectedId: id }),
  setTransitioning: (v) => set({ isTransitioning: v }),
  setPanelVisible: (v) => set({ panelVisible: v }),
  openDeepZoom: () => set({ deepZoomOpen: true }),
  closeDeepZoom: () => set({ deepZoomOpen: false }),

  setArtworks: (a) => set({ artworks: a }),
  setPool: (ids) => set({ pool: ids, poolCount: ids.length }),
  patchArtwork: (id, patch) =>
    set((s) => ({
      artworks: s.artworks.map((w) => (w.objectID === id ? { ...w, ...patch } : w)),
    })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),
  setLoading: (v) => set({ loading: v }),
  setResolving: (v) => set({ resolving: v }),
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
  setFiltersOpen: (v) => set({ filtersOpen: v }),
  surprise: () => set((s) => ({ filters: { ...EMPTY_FILTERS }, surpriseTick: s.surpriseTick + 1 })),

  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),
}))
