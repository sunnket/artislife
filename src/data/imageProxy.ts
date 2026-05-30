// Met's image CDN (images.metmuseum.org) sends no CORS headers. Browsers refuse
// to upload a cross-origin image as a WebGL texture (SecurityError on
// texSubImage2D) AND refuse to read its canvas pixels. So every Met image we put
// on a 3D plane or sample for color MUST go through a CORS-enabled, keyless image
// proxy. wsrv.nl (images.weserv.nl) does this for free and also resizes on the
// fly — a bandwidth win for thumbnails. Graceful fallback: if the proxy fails,
// the frame simply keeps its shimmer (handled by the loader's onerror).
const PROXY = 'https://wsrv.nl/'

export function proxied(url: string, width?: number): string {
  if (!url) return url
  const params = new URLSearchParams()
  params.set('url', url)
  if (width) params.set('w', String(width))
  params.set('output', 'jpg')
  params.set('q', '88')
  return `${PROXY}?${params.toString()}`
}

// Recommended widths per use (keeps GPU memory + bandwidth bounded).
export const THUMB_W = 1200 // crisp on the larger funnel frames
export const FULL_W = 2400
export const SAMPLE_W = 24
