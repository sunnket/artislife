import { useEffect, useRef, useState } from 'react'
import { useGalleryStore } from '../state/useGalleryStore'
import { getDepartments, type Department } from '../data/metApi'

interface Era {
  label: string
  begin: number | null
  end: number | null
}
const ERAS: Era[] = [
  { label: 'All time', begin: null, end: null },
  { label: 'Ancient', begin: -3000, end: 500 },
  { label: 'Medieval', begin: 500, end: 1400 },
  { label: 'Renaissance', begin: 1400, end: 1600 },
  { label: 'Baroque', begin: 1600, end: 1750 },
  { label: '18th c.', begin: 1700, end: 1800 },
  { label: '19th c.', begin: 1800, end: 1900 },
  { label: 'Modern', begin: 1900, end: 2025 },
]

// Representative hue swatches (HSL hue centers).
const HUES = [0, 28, 50, 130, 175, 215, 260, 300, 330]

// Departments most likely to hold CC0 paintings/works (kept short + relevant).
const PREFERRED_DEPTS = new Set([
  'European Paintings',
  'The American Wing',
  'Asian Art',
  'Drawings and Prints',
  'Egyptian Art',
  'Greek and Roman Art',
  'Photographs',
  'Islamic Art',
  'Medieval Art',
  'Modern and Contemporary Art',
])

export function Filters() {
  const filtersOpen = useGalleryStore((s) => s.filtersOpen)
  const setFiltersOpen = useGalleryStore((s) => s.setFiltersOpen)
  const filters = useGalleryStore((s) => s.filters)
  const setFilters = useGalleryStore((s) => s.setFilters)
  const resetFilters = useGalleryStore((s) => s.resetFilters)
  const surprise = useGalleryStore((s) => s.surprise)
  const resolving = useGalleryStore((s) => s.resolving)
  const poolCount = useGalleryStore((s) => s.poolCount)

  const [depts, setDepts] = useState<Department[]>([])
  const [query, setQuery] = useState(filters.query)
  const searchDebounce = useRef(0)

  useEffect(() => {
    getDepartments().then((d) =>
      setDepts(d.filter((x) => PREFERRED_DEPTS.has(x.displayName))),
    )
  }, [])

  // keep local field in sync when filters reset elsewhere (surprise/reset)
  useEffect(() => {
    setQuery(filters.query)
  }, [filters.query])

  const onSearch = (v: string) => {
    setQuery(v)
    window.clearTimeout(searchDebounce.current)
    searchDebounce.current = window.setTimeout(() => setFilters({ query: v }), 250)
  }

  const activeEra = (e: Era) => filters.dateBegin === e.begin && filters.dateEnd === e.end

  return (
    <aside className={`filters glass ${filtersOpen ? 'filters--on' : ''}`} aria-hidden={!filtersOpen}>
      <div className="filters__head">
        <h2 className="filters__title">Discover</h2>
        <button className="filters__close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
          ×
        </button>
      </div>

      <div>
        <div className="filters__group-label">Search</div>
        <input
          className="filters__search"
          type="search"
          placeholder="Artist, subject, keyword…"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div>
        <div className="filters__group-label">Era — the time river</div>
        <div className="chips">
          {ERAS.map((e) => (
            <button
              key={e.label}
              className={`chip ${activeEra(e) ? 'is-active' : ''}`}
              onClick={() => setFilters({ dateBegin: e.begin, dateEnd: e.end })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {depts.length > 0 && (
        <div>
          <div className="filters__group-label">Department</div>
          <div className="chips">
            <button
              className={`chip ${filters.departmentId == null ? 'is-active' : ''}`}
              onClick={() => setFilters({ departmentId: null })}
            >
              Any
            </button>
            {depts.map((d) => (
              <button
                key={d.departmentId}
                className={`chip ${filters.departmentId === d.departmentId ? 'is-active' : ''}`}
                onClick={() => setFilters({ departmentId: d.departmentId })}
              >
                {d.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="filters__group-label">Colour</div>
        <div className="swatches">
          <button
            className={`swatch swatch--clear ${filters.hue == null ? 'is-active' : ''}`}
            onClick={() => setFilters({ hue: null })}
            title="Any colour"
          >
            ×
          </button>
          {HUES.map((h) => (
            <button
              key={h}
              className={`swatch ${filters.hue === h ? 'is-active' : ''}`}
              style={{ background: `hsl(${h}, 65%, 55%)` }}
              onClick={() => setFilters({ hue: h })}
              title={`Hue ${h}°`}
            />
          ))}
        </div>
      </div>

      <div className="filters__resolving">
        {resolving
          ? 'Reshaping the gallery…'
          : poolCount > 0
            ? `${poolCount.toLocaleString()} works in this stream`
            : ''}
      </div>

      <div className="filters__actions">
        <button className="glass-btn filters__action" onClick={surprise}>
          Surprise me
        </button>
        <button
          className="glass-btn filters__action"
          onClick={() => {
            resetFilters()
            setQuery('')
          }}
        >
          Reset
        </button>
      </div>
    </aside>
  )
}
