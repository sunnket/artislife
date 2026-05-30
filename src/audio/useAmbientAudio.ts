import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useGalleryStore } from '../state/useGalleryStore'
import { nav } from '../three/nav'

// Soothing procedural ambient score (no files, no AI): a warm, consonant pad of
// pure sine tones (open voicing — root, fifth, octave, major third, twelfth) with
// a very slow breathing tremolo through a lush reverb. The root drifts gently with
// the era of the nearest piece. A soft swell + warm bell on the hero zoom.
// Starts on the Enter gesture; master volume = mute toggle.

const CHORD = [1, 1.5, 2, 2.5, 3] // root · fifth · octave · maj third (+8ve) · twelfth
const DETUNE = [-3, 2, -2, 4, -4] // subtle chorus, cents
const VOICE_DB = [-11, -19, -17, -23, -24]
const ON_DB = -16
const OFF_DB = -60

function rootForDate(beginDate: number): number {
  if (!beginDate || beginDate < 500) return 110.0 // A2 — antiquity, warm
  if (beginDate < 1500) return 123.47 // B2 — medieval
  if (beginDate < 1700) return 130.81 // C3 — renaissance/baroque
  if (beginDate < 1850) return 146.83 // D3 — 18th–19th c.
  return 164.81 // E3 — modern, brighter
}

interface Graph {
  master: Tone.Volume
  reverb: Tone.Reverb
  filter: Tone.Filter
  lfo: Tone.LFO
  tremolo: Tone.Tremolo
  oscs: Tone.Oscillator[]
  swell: Tone.NoiseSynth
  bell: Tone.Synth
}

export function useAmbientAudio() {
  const entered = useGalleryStore((s) => s.entered)
  const audioOn = useGalleryStore((s) => s.audioOn)
  const selectedId = useGalleryStore((s) => s.selectedId)

  const built = useRef(false)
  const graph = useRef<Graph | null>(null)
  const rootHz = useRef(130.81)

  // Build the graph on the first Enter (user gesture unlocks the AudioContext).
  useEffect(() => {
    if (!entered || built.current) return
    built.current = true
    let disposed = false
    ;(async () => {
      try {
        await Tone.start()
      } catch {
        /* gesture already unlocked elsewhere */
      }
      if (disposed) return

      const master = new Tone.Volume(OFF_DB).toDestination()
      const reverb = new Tone.Reverb({ decay: 11, wet: 0.62, preDelay: 0.18 }).connect(master)

      // Very slow amplitude "breathing".
      const tremolo = new Tone.Tremolo({ frequency: 0.05, depth: 0.22, spread: 0 })
      tremolo.connect(reverb)
      tremolo.start()

      const filter = new Tone.Filter(1200, 'lowpass')
      filter.Q.value = 0.4
      filter.connect(tremolo)

      // Gentle warmth drift on the cutoff.
      const lfo = new Tone.LFO({ frequency: 0.025, min: 850, max: 1600 })
      lfo.connect(filter.frequency)
      lfo.start()

      const oscs = CHORD.map((r, i) => {
        const o = new Tone.Oscillator({
          frequency: rootHz.current * r,
          type: 'sine',
          detune: DETUNE[i],
          volume: VOICE_DB[i],
        })
        o.connect(filter)
        o.start()
        return o
      })

      // Soft airy swell on the hero zoom (replaces the harsh whoosh).
      const swellFilter = new Tone.Filter(700, 'bandpass').connect(reverb)
      const swell = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 1.4, decay: 2.2, sustain: 0, release: 1.6 },
        volume: -20,
      }).connect(swellFilter)

      // Warm bell on select (soft attack + long release).
      const bell = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.04, decay: 1.8, sustain: 0, release: 1.8 },
        volume: -16,
      }).connect(reverb)

      graph.current = { master, reverb, filter, lfo, tremolo, oscs, swell, bell }
      master.volume.rampTo(useGalleryStore.getState().audioOn ? ON_DB : OFF_DB, 4)
    })()
    return () => {
      disposed = true
    }
  }, [entered])

  // Mute toggle.
  useEffect(() => {
    const g = graph.current
    if (!g) return
    g.master.volume.rampTo(audioOn ? ON_DB : OFF_DB, 1)
  }, [audioOn])

  // Drift the pad's root note gently toward the era of the nearest piece.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const g = graph.current
      if (!g) return
      const art = useGalleryStore.getState().artworks.find((a) => a.objectID === nav.nearestId)
      const target = rootForDate(art?.beginDate ?? 0)
      if (Math.abs(target - rootHz.current) > 0.5) {
        rootHz.current = target
        g.oscs.forEach((o, i) => o.frequency.rampTo(target * CHORD[i], 8))
      }
    }, 3000)
    return () => window.clearInterval(interval)
  }, [])

  // UI sounds: a soft swell + warm bell when a piece is selected (the hero zoom).
  useEffect(() => {
    const g = graph.current
    if (!g || selectedId == null) return
    try {
      g.bell.triggerAttackRelease(rootHz.current * 3, 1.6)
      g.swell.triggerAttackRelease(2.2)
    } catch {
      /* audio not ready */
    }
  }, [selectedId])
}
