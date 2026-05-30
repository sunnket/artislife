import { proxied, SAMPLE_W } from './imageProxy'

// Client-side dominant-hue extraction (no AI, no key). Draws a tiny proxied
// thumbnail to a 16×16 canvas and computes a saturation/value-weighted CIRCULAR
// mean hue (better than a naive average across the hue wheel). Dark/near-gray
// pixels are ignored; fully desaturated images return null. Results cached.
const hueCache = new Map<number, number | null>()

export function cachedHue(objectID: number): number | null | undefined {
  return hueCache.get(objectID)
}

export async function dominantHue(objectID: number, imageUrl: string): Promise<number | null> {
  if (hueCache.has(objectID)) return hueCache.get(objectID) ?? null
  const result = await new Promise<number | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const n = 16
        const c = document.createElement('canvas')
        c.width = n
        c.height = n
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, n, n)
        const data = ctx.getImageData(0, 0, n, n).data
        let sx = 0
        let sy = 0
        let wsum = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          if (max < 0.12) continue // skip very dark pixels
          const d = max - min
          const s = max === 0 ? 0 : d / max
          let h = 0
          if (d > 0) {
            if (max === r) h = ((g - b) / d) % 6
            else if (max === g) h = (b - r) / d + 2
            else h = (r - g) / d + 4
            h *= 60
            if (h < 0) h += 360
          }
          const w = s * max // weight by colorfulness
          const rad = (h * Math.PI) / 180
          sx += Math.cos(rad) * w
          sy += Math.sin(rad) * w
          wsum += w
        }
        if (wsum < 1e-4) return resolve(null) // effectively grayscale
        let ang = (Math.atan2(sy, sx) * 180) / Math.PI
        if (ang < 0) ang += 360
        resolve(ang)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = proxied(imageUrl, SAMPLE_W)
  })
  hueCache.set(objectID, result)
  return result
}

// Smallest distance between two hues on the 0..360 wheel.
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
