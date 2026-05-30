import { useEffect, useRef } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'
import { loadSeed } from './seed'
import { searchIDs, primeCache, metAllIDs } from './metApi'
import { aicListIDs, cmaListIDs } from './sources'
import type { Filters } from './types'

// Broad terms unioned to build the default "everything" pool — hundreds of
// thousands of objectIDs across the Met's public collection (lakhs of works).
const BROAD_TERMS = [
  'painting', 'portrait', 'landscape', 'drawing', 'print', 'study', 'figure',
  'still life', 'view', 'flower', 'woman', 'man', 'river', 'saint', 'horse',
  'garden', 'temple', 'vase', 'mythology', 'sea',
]
const SURPRISE_TERMS = [
  'landscape', 'portrait', 'still life', 'flowers', 'sea', 'night', 'river',
  'mountain', 'angel', 'horse', 'garden', 'dance', 'storm', 'harbor', 'temple', 'market',
]
const POOL_CAP = 600_000

const serverSig = (f: Filters) =>
  `${f.query.trim()}|${f.departmentId ?? ''}|${f.dateBegin ?? ''}|${f.dateEnd ?? ''}`
const isServerDefault = (f: Filters) =>
  !f.query.trim() && f.departmentId == null && f.dateBegin == null && f.dateEnd == null

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Resolves the current filter to a large objectID POOL (not a fixed window); the
// ArtworkPool streams + recycles through it on demand. Seed paints instantly,
// then the full collection loads in the background.
export function useArtworkStream() {
  const setArtworks = useGalleryStore((s) => s.setArtworks)
  const setPool = useGalleryStore((s) => s.setPool)
  const setLoading = useGalleryStore((s) => s.setLoading)
  const setResolving = useGalleryStore((s) => s.setResolving)
  const showToast = useGalleryStore((s) => s.showToast)
  const filters = useGalleryStore((s) => s.filters)
  const surpriseTick = useGalleryStore((s) => s.surpriseTick)

  const seedIds = useRef<number[]>([])
  const defaultPool = useRef<number[]>([])
  const reqId = useRef(0)
  const debounce = useRef(0)
  const sig = useRef('__init__')
  const prevTick = useRef(0)
  const booted = useRef(false)

  // Seed first (instant, offline-safe), then resolve the huge default pool.
  useEffect(() => {
    let alive = true
    loadSeed().then(async (seed) => {
      if (!alive) return
      primeCache(seed)
      seedIds.current = seed.map((s) => s.objectID)
      setArtworks(seed)
      setPool(seedIds.current)
      defaultPool.current = seedIds.current
      setLoading(false)
      booted.current = true
      sig.current = serverSig(useGalleryStore.getState().filters)

      const set = new Set<number>()
      const publish = () => {
        if (!alive || set.size === 0) return
        const seedSet = new Set(seedIds.current)
        const rest = [...set].filter((id) => !seedSet.has(id))
        defaultPool.current = [...seedIds.current, ...shuffle(rest)]
        const st = useGalleryStore.getState()
        if (isServerDefault(st.filters) && st.surpriseTick === prevTick.current) {
          setPool(defaultPool.current)
        }
      }
      try {
        for (const term of BROAD_TERMS) {
          if (!alive) return
          try {
            const ids = await searchIDs({ query: term })
            for (const id of ids) {
              set.add(id)
              if (set.size >= POOL_CAP) break
            }
          } catch {
            /* skip this term */
          }
          if (set.size >= POOL_CAP) break
        }
        publish() // surface the dense Met union immediately — don't wait on the rest

        // Total Met coverage: append the museum's entire object list (~490k).
        try {
          ;(await metAllIDs()).forEach((id) => {
            if (set.size < POOL_CAP) set.add(id)
          })
          publish()
        } catch {
          /* keep the union */
        }

        // Then grow with additional keyless, CC0, CORS-friendly museums (more
        // displayable works + variety) without blocking the count already shown.
        try {
          ;(await cmaListIDs()).forEach((id) => set.add(id))
          publish()
        } catch {
          /* source unavailable */
        }
        try {
          ;(await aicListIDs()).forEach((id) => set.add(id))
        } catch {
          /* source unavailable */
        }
        publish()
      } catch {
        /* keep seed pool */
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-resolve the pool on era/department/search/surprise changes (debounced).
  // A colour-swatch-only change keeps the same pool (the ArtworkPool re-filters).
  useEffect(() => {
    const f = filters
    const surprise = surpriseTick > prevTick.current
    prevTick.current = surpriseTick
    const newSig = serverSig(f)
    if (!surprise && newSig === sig.current && booted.current) return
    sig.current = newSig

    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(async () => {
      if (!booted.current) return
      const id = ++reqId.current

      if (!surprise && isServerDefault(f)) {
        setPool(defaultPool.current.length ? defaultPool.current : seedIds.current)
        return
      }

      setResolving(true)
      try {
        const query = surprise
          ? SURPRISE_TERMS[Math.floor(Math.random() * SURPRISE_TERMS.length)]
          : f.query
        let ids = await searchIDs({ ...f, query })
        if (id !== reqId.current) return
        if (surprise) ids = shuffle(ids)
        if (!ids.length) {
          showToast('No works match — showing the curated set')
          setPool(seedIds.current)
          return
        }
        setPool(ids)
      } catch {
        showToast('Live collection unavailable — showing the curated set')
        setPool(seedIds.current)
      } finally {
        if (id === reqId.current) setResolving(false)
      }
    }, 350)

    return () => window.clearTimeout(debounce.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, surpriseTick])
}
