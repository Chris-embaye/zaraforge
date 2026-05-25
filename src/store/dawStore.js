import { create } from 'zustand'

function computePeaks(buffer, count = 900) {
  if (!buffer) return null
  const data  = buffer.getChannelData(0)
  const block = Math.floor(data.length / count)
  const out   = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    let mx = 0
    for (let j = 0; j < block; j++) {
      const v = Math.abs(data[i * block + j] || 0)
      if (v > mx) mx = v
    }
    out[i] = mx
  }
  return out
}

const INIT_TRACKS = [
  { id: 'vocal',   name: 'Vocal Track',   color: '#00ff88', muted: false, solo: false, volume: 0.8, audioBuffer: null, peaks: null, durationMs: 0 },
  { id: 'backing', name: 'Backing Track', color: '#a78bfa', muted: false, solo: false, volume: 0.6, audioBuffer: null, peaks: null, durationMs: 0 },
]

const mkFx = () => ({
  scale: 'C Major', intensity: 50, speed: 40,
  reverbRoom: 0.8, reverbWet: 0,
  eqLow: 0, eqMid: 0, eqHigh: 0,
  // Vocal Doubler
  doublerEnabled: false, doublerDelay: 22, doublerDetune: 8,
  // Noise Gate
  gateEnabled: false, gateThreshold: -40,
})

// Snapshot for undo/redo — strips AudioBuffer & peaks (too large to serialize)
function makeSnap(s) {
  return {
    tracks: s.tracks.map(({ audioBuffer, peaks, ...rest }) => rest),
    fx: JSON.parse(JSON.stringify(s.fx)),
  }
}

// Module-level debounce timestamps so continuous slider drags create one history entry
let _fxPushTime  = 0
let _volPushTime = 0

export const useDawStore = create((set, get) => ({
  tracks:     INIT_TRACKS,
  fx:         { vocal: mkFx(), backing: mkFx() },
  selectedId: 'vocal',
  activeTool: 'select',
  playheadMs: 0,
  isPlaying:  false,
  bpm:        120,
  projectKey: 'C Major',
  zoom:       1,

  // ── Genre-Morph state ────────────────────────────────────────────────────────
  morphState: {
    phase: 'idle',          // 'idle' | 'morphing' | 'done'
    styleId: null,
    transformedBuffer: null,
    transformedPeaks:  null,
  },
  comparisonDeck: 'original',   // 'original' | 'transformed'

  // ── 4-Stem Demix state ───────────────────────────────────────────────────────
  stemDemix: {
    phase:   'idle',        // 'idle' | 'processing' | 'done'
    step:    0,
    buffers: { vocals: null, drums: null, bass: null, instruments: null },
    volumes: { vocals: 1,    drums: 1,    bass: 1,    instruments: 1    },
    muted:   { vocals: false, drums: false, bass: false, instruments: false },
  },

  // ── Video bridge ─────────────────────────────────────────────────────────────
  masterExportUrl: null,

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  undoStack: [],
  redoStack: [],

  _pushHistory: () => {
    const s = get()
    set({ undoStack: [...s.undoStack.slice(-49), makeSnap(s)], redoStack: [] })
  },

  undo: () => {
    const s = get()
    if (!s.undoStack.length) return
    const snap = s.undoStack[s.undoStack.length - 1]
    const cur  = makeSnap(s)
    set({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack.slice(-49), cur],
      tracks: s.tracks.map(t => {
        const st = snap.tracks.find(x => x.id === t.id)
        return st ? { ...t, ...st } : t  // preserve audioBuffer / peaks
      }),
      fx: snap.fx,
    })
  },

  redo: () => {
    const s = get()
    if (!s.redoStack.length) return
    const snap = s.redoStack[s.redoStack.length - 1]
    const cur  = makeSnap(s)
    set({
      undoStack: [...s.undoStack.slice(-49), cur],
      redoStack: s.redoStack.slice(0, -1),
      tracks: s.tracks.map(t => {
        const st = snap.tracks.find(x => x.id === t.id)
        return st ? { ...t, ...st } : t
      }),
      fx: snap.fx,
    })
  },

  // ── Tracks ──────────────────────────────────────────────────────────────────
  setBuffer: (id, audioBuffer) => {
    const peaks      = computePeaks(audioBuffer)
    const durationMs = audioBuffer ? Math.round(audioBuffer.duration * 1000) : 0
    set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, audioBuffer, peaks, durationMs } : t) }))
  },

  addTrack: () => {
    get()._pushHistory()
    const id     = `track-${Date.now()}`
    const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']
    const color  = colors[get().tracks.length % colors.length]
    set(s => ({
      tracks: [...s.tracks, { id, name: `Track ${s.tracks.length + 1}`, color, muted: false, solo: false, volume: 0.8, audioBuffer: null, peaks: null, durationMs: 0 }],
      fx:     { ...s.fx, [id]: mkFx() },
    }))
  },

  removeTrack: (id) => {
    get()._pushHistory()
    set(s => ({
      tracks:     s.tracks.filter(t => t.id !== id),
      selectedId: s.selectedId === id ? (s.tracks[0]?.id ?? null) : s.selectedId,
    }))
  },

  toggleMute: (id) => {
    get()._pushHistory()
    set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, muted: !t.muted } : t) }))
  },

  toggleSolo: (id) => {
    get()._pushHistory()
    set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, solo: !t.solo } : t) }))
  },

  setVolume: (id, v) => {
    const now = Date.now()
    if (now - _volPushTime > 800) { _volPushTime = now; get()._pushHistory() }
    set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, volume: v } : t) }))
  },

  // ── Transport / playhead ──────────────────────────────────────────────────
  selectTrack: (id) => set({ selectedId: id }),
  setTool:     (t)  => set({ activeTool: t }),
  setPlayhead: (ms) => set({ playheadMs: ms }),
  setPlaying:  (v)  => set({ isPlaying: v }),
  setBpm:      (v)  => set({ bpm: v }),
  setKey:      (k)  => set({ projectKey: k }),
  setZoom:     (v)  => set({ zoom: Math.max(0.25, Math.min(8, v)) }),

  // ── DSP FX ────────────────────────────────────────────────────────────────
  setFx: (id, key, val) => {
    const now = Date.now()
    if (now - _fxPushTime > 800) { _fxPushTime = now; get()._pushHistory() }
    set(s => ({ fx: { ...s.fx, [id]: { ...s.fx[id], [key]: val } } }))
  },

  // Apply multiple FX settings atomically (used by presets)
  setFxBatch: (id, settings) => {
    const now = Date.now()
    if (now - _fxPushTime > 800) { _fxPushTime = now; get()._pushHistory() }
    set(s => ({ fx: { ...s.fx, [id]: { ...s.fx[id], ...settings } } }))
  },

  // ── Clip offsets (Smart-Align / stem sync) ────────────────────────────────
  clipOffsets: {},
  setClipOffset:   (id, ms) => set(s => ({ clipOffsets: { ...s.clipOffsets, [id]: ms } })),
  clearClipOffset: (id)     => set(s => ({ clipOffsets: { ...s.clipOffsets, [id]: 0 } })),

  // ── Genre-Morph actions ──────────────────────────────────────────────────────
  setMorphState: (patch) => set(s => ({ morphState: { ...s.morphState, ...patch } })),
  setComparisonDeck: (deck) => set({ comparisonDeck: deck }),

  morphLockIn: () => {
    const { morphState } = get()
    if (!morphState.transformedBuffer) return
    const peaks      = computePeaks(morphState.transformedBuffer)
    const durationMs = Math.round(morphState.transformedBuffer.duration * 1000)
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === 'backing'
          ? { ...t, audioBuffer: morphState.transformedBuffer, peaks, durationMs }
          : t
      ),
      morphState: { phase: 'idle', styleId: null, transformedBuffer: null, transformedPeaks: null },
    }))
  },

  morphCombine: () => {
    const { morphState } = get()
    if (!morphState.transformedBuffer) return
    get()._pushHistory()
    const id         = `morph-${Date.now()}`
    const peaks      = computePeaks(morphState.transformedBuffer)
    const durationMs = Math.round(morphState.transformedBuffer.duration * 1000)
    set(s => ({
      tracks: [...s.tracks, {
        id, name: 'AI Style Morph', color: '#f472b6',
        muted: false, solo: false, volume: 0.65,
        audioBuffer: morphState.transformedBuffer,
        peaks, durationMs,
      }],
      fx: { ...s.fx, [id]: mkFx() },
      morphState: { phase: 'idle', styleId: null, transformedBuffer: null, transformedPeaks: null },
    }))
  },

  // ── 4-Stem Demix actions ─────────────────────────────────────────────────────
  setStemDemix: (patch) => set(s => ({ stemDemix: { ...s.stemDemix, ...patch } })),
  setStemDemixVolume: (stem, vol) => set(s => ({
    stemDemix: { ...s.stemDemix, volumes: { ...s.stemDemix.volumes, [stem]: vol } },
  })),
  toggleStemDemixMute: (stem) => set(s => ({
    stemDemix: { ...s.stemDemix, muted: { ...s.stemDemix.muted, [stem]: !s.stemDemix.muted[stem] } },
  })),
  setStemDemixBuffer: (stem, buf) => {
    const peaks = computePeaks(buf)
    set(s => ({
      stemDemix: {
        ...s.stemDemix,
        buffers: { ...s.stemDemix.buffers, [stem]: buf },
      },
    }))
  },

  // ── Video bridge ─────────────────────────────────────────────────────────────
  setMasterExportUrl: (url) => set({ masterExportUrl: url }),
}))
