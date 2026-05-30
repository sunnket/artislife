// The slim artwork record we use everywhere (subset of the Met object record).
export interface Artwork {
  objectID: number
  title: string
  artist: string // artistDisplayName
  date: string // objectDate (display)
  beginDate: number // objectBeginDate (numeric, for era filtering / related)
  medium: string
  culture: string
  department: string
  creditLine: string
  dimensions: string
  primaryImageSmall: string // thumbnail (wall)
  primaryImage: string // full-res (deep zoom)
  isPublicDomain: boolean
  // client-computed (Section 9 color filter):
  dominantHue?: number // 0..360, undefined until sampled
}

export interface Filters {
  query: string
  departmentId: number | null
  dateBegin: number | null
  dateEnd: number | null
  hue: number | null // selected hue swatch center (0..360)
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  departmentId: null,
  dateBegin: null,
  dateEnd: null,
  hue: null,
}
