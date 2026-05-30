// Generate public/seed.json from the keyless Met Museum Collection API.
// Run once: `npm run seed`. Output is committed and offline-safe thereafter.
//
// Strategy: query a curated list of famous artists/terms, gather candidate
// objectIDs, fetch each record, keep only CC0 (isPublicDomain) works that have a
// thumbnail, prefer museum "highlights", de-dupe, and cap at ~110.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/seed.json')

const TERMS = [
  'Vincent van Gogh', 'Claude Monet', 'Johannes Vermeer', 'Rembrandt',
  'Pierre-Auguste Renoir', 'Edgar Degas', 'Paul Cézanne', 'Georges Seurat',
  'Katsushika Hokusai', 'Utagawa Hiroshige', 'J. M. W. Turner',
  'John Singer Sargent', 'Édouard Manet', 'Camille Pissarro', 'El Greco',
  'Caravaggio', 'Botticelli', 'Titian', 'Francisco Goya', 'Jacques Louis David',
  'Winslow Homer', 'Mary Cassatt', 'Thomas Cole', 'Frederic Edwin Church',
  'Gustave Caillebotte', 'Eugène Delacroix', 'Jan van Eyck', 'Albrecht Dürer',
]

const PER_TERM = 26
const MAX_CANDIDATES = 720
const TARGET = 110
const CONCURRENCY = 8

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 15000)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === tries - 1) throw err
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
}

function slim(o) {
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
    isHighlight: !!o.isHighlight,
  }
}

async function mapLimit(items, limit, fn) {
  const out = []
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        out[idx] = await fn(items[idx])
      } catch {
        out[idx] = null
      }
    }
  })
  await Promise.all(workers)
  return out
}

async function main() {
  console.log('Resolving candidate objectIDs from %d terms…', TERMS.length)
  const idSet = new Set()

  for (const term of TERMS) {
    if (idSet.size >= MAX_CANDIDATES) break
    try {
      const url = `${BASE}/search?hasImages=true&q=${encodeURIComponent(term)}`
      const data = await getJSON(url)
      const ids = (data?.objectIDs || []).slice(0, PER_TERM)
      ids.forEach((id) => idSet.add(id))
      console.log('  %s → %d ids (total %d)', term, ids.length, idSet.size)
    } catch (err) {
      console.warn('  search failed for "%s": %s', term, err.message)
    }
  }

  const candidates = [...idSet].slice(0, MAX_CANDIDATES)
  console.log('Fetching %d candidate records…', candidates.length)

  const records = (await mapLimit(candidates, CONCURRENCY, async (id) => {
    const o = await getJSON(`${BASE}/objects/${id}`)
    return o ? slim(o) : null
  })).filter(Boolean)

  let kept = records.filter((r) => r.isPublicDomain && r.primaryImageSmall)
  // Prefer highlights, then dedupe defensively, then cap.
  kept.sort((a, b) => Number(b.isHighlight) - Number(a.isHighlight))
  const seen = new Set()
  kept = kept.filter((r) => (seen.has(r.objectID) ? false : (seen.add(r.objectID), true)))
  kept = kept.slice(0, TARGET).map(({ isHighlight, ...rest }) => rest)

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(kept, null, 0))
  console.log('\n✓ Wrote %d works to %s', kept.length, OUT)
}

main().catch((err) => {
  console.error('Seed generation failed:', err)
  process.exit(1)
})
