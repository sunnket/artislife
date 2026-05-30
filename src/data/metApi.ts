import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { Artwork, Filters } from './types'
import { fetchAIC, fetchCMA, AIC_OFFSET, CMA_OFFSET } from './sources'

export const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

// In-memory record cache keyed by objectID (Section 3).
const memCache = new Map<number, Artwork>()

// ---- polite request queue: cap concurrent /objects fetches ----
const MAX_CONCURRENT = 8
let active = 0
const waiters: (() => void)[] = []

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  return new Promise((resolve) => waiters.push(resolve))
}
function release() {
  active--
  const next = waiters.shift()
  if (next) {
    active++
    next()
  }
}

async function fetchJSON(url: string, signal?: AbortSignal): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function normalize(o: any): Artwork {
  return {
    objectID: o.objectID,
    title: o.title?.trim() || 'Untitled',
    artist: o.artistDisplayName?.trim() || 'Unknown',
    date: o.objectDate?.trim() || '',
    beginDate: typeof o.objectBeginDate === 'number' ? o.objectBeginDate : 0,
    medium: o.medium?.trim() || '',
    culture: o.culture?.trim() || '',
    department: o.department?.trim() || '',
    creditLine: o.creditLine?.trim() || '',
    dimensions: o.dimensions?.trim() || '',
    primaryImageSmall: o.primaryImageSmall || '',
    primaryImage: o.primaryImage || o.primaryImageSmall || '',
    isPublicDomain: !!o.isPublicDomain,
  }
}

/** Resolve a filter set to an ordered array of objectIDs. Abortable. */
export async function searchIDs(
  filters: Partial<Filters>,
  signal?: AbortSignal,
): Promise<number[]> {
  const params = new URLSearchParams()
  params.set('hasImages', 'true')
  params.set('q', filters.query?.trim() || '*')
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId))
  if (filters.dateBegin != null && filters.dateEnd != null) {
    params.set('dateBegin', String(filters.dateBegin))
    params.set('dateEnd', String(filters.dateEnd))
  }
  const data = await fetchJSON(`${MET_BASE}/search?${params.toString()}`, signal)
  return Array.isArray(data?.objectIDs) ? data.objectIDs : []
}

/** Hydrate a full record. Memory → IndexedDB → network. Returns null on miss/failure. */
export async function getObject(id: number, signal?: AbortSignal): Promise<Artwork | null> {
  const hit = memCache.get(id)
  if (hit) return hit

  try {
    const persisted = await idbGet<Artwork>(`art:${id}`)
    if (persisted) {
      memCache.set(id, persisted)
      return persisted
    }
  } catch {
    /* IndexedDB unavailable — ignore */
  }

  await acquire()
  try {
    // Dispatch by ID range: Met (< 50M) · AIC ([50M,100M)) · Cleveland (>= 100M).
    let art: Artwork | null
    if (id >= CMA_OFFSET) art = await fetchCMA(id - CMA_OFFSET, signal)
    else if (id >= AIC_OFFSET) art = await fetchAIC(id - AIC_OFFSET, signal)
    else {
      const o = await fetchJSON(`${MET_BASE}/objects/${id}`, signal)
      art = o && o.primaryImageSmall && o.isPublicDomain ? normalize(o) : null
    }
    if (!art || !art.primaryImageSmall) return null
    memCache.set(id, art)
    idbSet(`art:${id}`, art).catch(() => {})
    return art
  } catch {
    return null
  } finally {
    release()
  }
}

export interface Department {
  departmentId: number
  displayName: string
}

/** The Met's entire object-ID list (~490k) in one request — total Met coverage. */
export async function metAllIDs(signal?: AbortSignal): Promise<number[]> {
  try {
    const data = await fetchJSON(`${MET_BASE}/objects`, signal)
    return Array.isArray(data?.objectIDs) ? data.objectIDs : []
  } catch {
    return []
  }
}

export async function getDepartments(signal?: AbortSignal): Promise<Department[]> {
  try {
    const data = await fetchJSON(`${MET_BASE}/departments`, signal)
    return Array.isArray(data?.departments) ? data.departments : []
  } catch {
    return []
  }
}

/** Seed records into the in-memory cache so their getObject() hits are instant. */
export function primeCache(arts: Artwork[]): void {
  for (const a of arts) if (!memCache.has(a.objectID)) memCache.set(a.objectID, a)
}

export function getCached(id: number): Artwork | undefined {
  return memCache.get(id)
}

/** All hydrated, displayable (public-domain + image) records seen so far. */
export function allCached(): Artwork[] {
  const out: Artwork[] = []
  for (const a of memCache.values()) if (a.isPublicDomain && a.primaryImageSmall) out.push(a)
  return out
}
