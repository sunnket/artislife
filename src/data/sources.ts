import type { Artwork } from './types'

// Additional keyless, CORS-open art APIs unioned into the gallery pool. To keep a
// single numeric ID space (so the pool/cache/registry stay number-keyed), each
// source's IDs are offset into a distinct range. getObject() dispatches by range.
export const AIC_OFFSET = 50_000_000 // Art Institute of Chicago
export const CMA_OFFSET = 100_000_000 // Cleveland Museum of Art

async function fetchJSON(url: string, signal?: AbortSignal): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// ----------------------------- Art Institute of Chicago -----------------------------
const AIC_API = 'https://api.artic.edu/api/v1'

export async function fetchAIC(realId: number, signal?: AbortSignal): Promise<Artwork | null> {
  const fields =
    'id,title,artist_title,date_display,date_start,medium_display,place_of_origin,department_title,credit_line,dimensions,image_id,is_public_domain'
  const j = await fetchJSON(`${AIC_API}/artworks/${realId}?fields=${fields}`, signal)
  const a = j?.data
  if (!a || !a.image_id || !a.is_public_domain) return null
  const base = `https://www.artic.edu/iiif/2/${a.image_id}/full`
  return {
    objectID: AIC_OFFSET + a.id,
    title: str(a.title) || 'Untitled',
    artist: str(a.artist_title) || 'Unknown',
    date: str(a.date_display),
    beginDate: typeof a.date_start === 'number' ? a.date_start : 0,
    medium: str(a.medium_display),
    culture: str(a.place_of_origin),
    department: str(a.department_title) || 'Art Institute of Chicago',
    creditLine: str(a.credit_line),
    dimensions: str(a.dimensions),
    primaryImageSmall: `${base}/1200,/0/default.jpg`,
    primaryImage: `${base}/2400,/0/default.jpg`,
    isPublicDomain: true,
  }
}

export async function aicListIDs(pages = 90, signal?: AbortSignal): Promise<number[]> {
  const out: number[] = []
  for (let p = 1; p <= pages; p++) {
    try {
      const url = `${AIC_API}/artworks/search?fields=id&limit=100&page=${p}&query[term][is_public_domain]=true`
      const j = await fetchJSON(url, signal)
      const ids: number[] = (j?.data || []).map((d: { id: number }) => AIC_OFFSET + d.id)
      out.push(...ids)
      if (!ids.length) break
    } catch {
      break
    }
  }
  return out
}

// ----------------------------- Cleveland Museum of Art ------------------------------
const CMA_API = 'https://openaccess-api.clevelandart.org/api/artworks'

export async function fetchCMA(realId: number, signal?: AbortSignal): Promise<Artwork | null> {
  const j = await fetchJSON(`${CMA_API}/${realId}`, signal)
  const a = j?.data
  if (!a || a.share_license_status !== 'CC0') return null
  const imgs = a.images || {}
  const small = imgs.web?.url || imgs.print?.url || imgs.full?.url
  if (!small) return null
  return {
    objectID: CMA_OFFSET + a.id,
    title: str(a.title) || 'Untitled',
    artist: str(a.creators?.[0]?.description) || 'Unknown',
    date: str(a.creation_date),
    beginDate: typeof a.creation_date_earliest === 'number' ? a.creation_date_earliest : 0,
    medium: str(a.technique) || str(a.type),
    culture: Array.isArray(a.culture) ? str(a.culture[0]) : str(a.culture),
    department: str(a.department) || 'Cleveland Museum of Art',
    creditLine: str(a.creditline),
    dimensions: str(a.measurements),
    primaryImageSmall: small,
    primaryImage: imgs.print?.url || imgs.full?.url || small,
    isPublicDomain: true,
  }
}

export async function cmaListIDs(batches = 55, signal?: AbortSignal): Promise<number[]> {
  const out: number[] = []
  for (let b = 0; b < batches; b++) {
    try {
      const url = `${CMA_API}?cc0=1&has_image=1&limit=1000&skip=${b * 1000}&fields=id`
      const j = await fetchJSON(url, signal)
      const ids: number[] = (j?.data || []).map((d: { id: number }) => CMA_OFFSET + d.id)
      out.push(...ids)
      if (ids.length < 1000) break
    } catch {
      break
    }
  }
  return out
}
