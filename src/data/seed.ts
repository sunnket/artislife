import type { Artwork } from './types'

// Last-resort inline fallback so the wall is NEVER blank, even if /seed.json
// itself can't be fetched. Real records (verified CC0, valid Met image URLs).
const INLINE_FALLBACK: Artwork[] = [
  { objectID: 459123, title: 'Madame Roulin and Her Baby', artist: 'Vincent van Gogh', date: '1888', beginDate: 1888, medium: 'Oil on canvas', culture: '', department: 'Robert Lehman Collection', creditLine: 'Robert Lehman Collection, 1975', dimensions: '25 × 20 in. (63.5 × 50.8 cm)', primaryImageSmall: 'https://images.metmuseum.org/CRDImages/rl/web-large/DT3154.jpg', primaryImage: 'https://images.metmuseum.org/CRDImages/rl/original/DT3154.jpg', isPublicDomain: true },
  { objectID: 436528, title: 'Irises', artist: 'Vincent van Gogh', date: '1890', beginDate: 1890, medium: 'Oil on canvas', culture: '', department: 'European Paintings', creditLine: 'Gift of Adele R. Levy, 1958', dimensions: '29 x 36 1/4 in. (73.7 x 92.1 cm)', primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP346474.jpg', primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DP346474.jpg', isPublicDomain: true },
  { objectID: 436532, title: 'Self-Portrait with a Straw Hat', artist: 'Vincent van Gogh', date: '1887', beginDate: 1887, medium: 'Oil on canvas', culture: '', department: 'European Paintings', creditLine: 'Bequest of Miss Adelaide Milton de Groot, 1967', dimensions: '16 x 12 1/2 in. (40.6 x 31.8 cm)', primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1502_cropped2.jpg', primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DT1502_cropped2.jpg', isPublicDomain: true },
  { objectID: 459193, title: 'Road in Etten', artist: 'Vincent van Gogh', date: '1881', beginDate: 1881, medium: 'Chalk, pencil, pastel, watercolor', culture: '', department: 'Robert Lehman Collection', creditLine: 'Robert Lehman Collection, 1975', dimensions: '15 1/2 x 22 3/4 in. (39.4 x 57.8 cm)', primaryImageSmall: 'https://images.metmuseum.org/CRDImages/rl/web-large/DP359031.jpg', primaryImage: 'https://images.metmuseum.org/CRDImages/rl/original/DP359031.jpg', isPublicDomain: true },
  { objectID: 336327, title: 'Corridor in the Asylum', artist: 'Vincent van Gogh', date: 'September 1889', beginDate: 1889, medium: 'Brush and oils over black chalk on pink laid paper', culture: '', department: 'Drawings and Prints', creditLine: 'Bequest of Abby Aldrich Rockefeller, 1948', dimensions: '25 5/8 x 19 5/16 in. (65.1 x 49.1 cm)', primaryImageSmall: 'https://images.metmuseum.org/CRDImages/dp/web-large/DT365509.jpg', primaryImage: 'https://images.metmuseum.org/CRDImages/dp/original/DT365509.jpg', isPublicDomain: true },
]

let cached: Artwork[] | null = null

// Load the bundled seed (instant, offline-safe first paint). Falls back to the
// inline set if the static file somehow can't be read.
export async function loadSeed(): Promise<Artwork[]> {
  if (cached) return cached
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'force-cache' })
    if (!res.ok) throw new Error(`seed ${res.status}`)
    const data = (await res.json()) as Artwork[]
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty seed')
    cached = data
    return data
  } catch {
    cached = INLINE_FALLBACK
    return INLINE_FALLBACK
  }
}
