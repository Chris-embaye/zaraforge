import { create } from 'zustand'

export const PPS      = 60
export const DURATION = 30

let _playTimer    = null
let _analyzeTimer = null
let _syncTimer    = null
let _trackTimer   = null

export function waveH(seed, i) {
  return ((((seed * 1.618 + i * 7.3) % 10) / 10) * 0.65 + 0.3)
}

export function fmtDuration(secs) {
  if (!isFinite(secs) || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ── Default multi-cam clip data ───────────────────────────────────────────────
const DEFAULT_CLIPS = {
  cam3: [
    { id: 'c3-a', start: 0,  end: 30, label: 'Wide Shot — CAM C',    color: '#7c3aed' },
  ],
  cam2: [
    { id: 'c2-a', start: 0,  end: 30, label: 'Medium Frame — CAM B', color: '#4338ca' },
  ],
  cam1: [
    { id: 'c1-a', start: 0,  end: 11, label: 'Close Up — CAM A',     color: '#6d28d9' },
    { id: 'c1-b', start: 11, end: 22, label: 'Reaction Shot',         color: '#5b21b6' },
    { id: 'c1-c', start: 22, end: 30, label: 'Outro — Wide',          color: '#4c1d95' },
  ],
  text: [
    { id: 'tx-a', start: 1,  end: 5,  label: '✦ Title Card',          color: '#b45309' },
    { id: 'tx-b', start: 12, end: 16, label: 'Lower Third',            color: '#92400e' },
    { id: 'tx-c', start: 24, end: 28, label: 'End Card CTA',           color: '#78350f' },
  ],
  audio: [
    { id: 'au-a', start: 0,  end: 30, label: 'Master Beat Track — Full Mix', color: '#065f46' },
  ],
}

export const TRACKS = [
  { id: 'cam3',  label: '📹 CAM C — Wide',         type: 'video' },
  { id: 'cam2',  label: '📹 CAM B — Medium',        type: 'video' },
  { id: 'cam1',  label: '📹 CAM A — Master',        type: 'video' },
  { id: 'text',  label: '🔤 Text / Overlay',         type: 'text'  },
  { id: 'audio', label: '🎵 Master Audio Track',     type: 'audio' },
]

export const TRACK_STYLE = {
  cam3:  { clip: '#7c3aed', accent: '#c4b5fd', text: 'rgba(255,255,255,0.9)' },
  cam2:  { clip: '#4338ca', accent: '#818cf8', text: 'rgba(255,255,255,0.9)' },
  cam1:  { clip: '#6d28d9', accent: '#a78bfa', text: 'rgba(255,255,255,0.9)' },
  text:  { clip: '#92400e', accent: '#fbbf24', text: 'rgba(255,255,255,0.9)' },
  audio: { clip: '#065f46', accent: '#34d399', text: 'rgba(255,255,255,0.9)' },
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useVideoStore = create((set, get) => ({

  // ── Playback ──────────────────────────────────────────────────────────────
  isPlaying:   false,
  currentTime: 0,
  duration:    DURATION,

  play: () => {
    if (get().isPlaying) return
    set({ isPlaying: true })
    _playTimer = setInterval(() => {
      const { currentTime, duration } = get()
      const next = +(currentTime + 0.1).toFixed(2)
      if (next >= duration) {
        clearInterval(_playTimer); _playTimer = null
        set({ isPlaying: false, currentTime: 0 })
      } else {
        set({ currentTime: next })
      }
    }, 100)
  },

  pause: () => {
    if (_playTimer) { clearInterval(_playTimer); _playTimer = null }
    set({ isPlaying: false })
  },

  seek: (t) => set({ currentTime: Math.max(0, Math.min(t, get().duration)) }),

  stepFrame: (dir) => {
    const next = +(get().currentTime + dir * (1 / 30)).toFixed(4)
    set({ currentTime: Math.max(0, Math.min(next, get().duration)) })
  },

  // ── Timeline tool ─────────────────────────────────────────────────────────
  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),

  // ── Tracks & clips ────────────────────────────────────────────────────────
  clips:        DEFAULT_CLIPS,
  activeClipId: null,
  setActiveClipId: (id) => set({ activeClipId: id }),

  clearClips: () => set({
    clips: { cam1: [], cam2: [], cam3: [], text: [], audio: [] },
    activeClipId: null,
  }),

  deleteClip: (trackId, clipId) => set(s => {
    const track = s.clips[trackId] ?? []
    const idx = track.findIndex(c => c.id === clipId)
    if (idx === -1) return {}
    const deleted = track[idx]
    const dur = deleted.end - deleted.start
    const linkedGroupId = deleted.linkedGroupId ?? null

    function rippleTrack(arr, removeId, removeStart, removeDur) {
      return arr.filter(c => c.id !== removeId).map(c =>
        c.start >= removeStart + removeDur
          ? { ...c, start: +(c.start - removeDur).toFixed(3), end: +(c.end - removeDur).toFixed(3) }
          : c
      )
    }

    const newClips = { ...s.clips, [trackId]: rippleTrack(track, clipId, deleted.start, dur) }

    if (linkedGroupId) {
      for (const [tid, tClips] of Object.entries(newClips)) {
        if (tid === trackId) continue
        const twin = (tClips ?? []).find(c => c.linkedGroupId === linkedGroupId)
        if (twin) {
          const twinDur = twin.end - twin.start
          newClips[tid] = rippleTrack(tClips, twin.id, twin.start, twinDur)
          break
        }
      }
    }

    return {
      clips: newClips,
      activeClipId: s.activeClipId === clipId ? null : s.activeClipId,
    }
  }),

  // ── Clip context menu ─────────────────────────────────────────────────────
  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  // ── Beat sync ─────────────────────────────────────────────────────────────
  beatMarkers:     [],
  beatSyncOn:      false,
  isAnalyzing:     false,
  analyzeProgress: 0,

  analyzeBeats: () => {
    if (get().isAnalyzing) return
    set({ isAnalyzing: true, beatMarkers: [], analyzeProgress: 0 })
    const beats    = []
    const bpm      = 128
    const interval = 60 / bpm
    const steps    = Math.floor(DURATION / interval)
    let   step     = 0
    _analyzeTimer = setInterval(() => {
      step++
      const t = +(step * interval).toFixed(3)
      if (t <= DURATION) {
        const h = +(t + (((step * 7) % 5) - 2) * 0.008).toFixed(3)
        beats.push(h)
        set({ beatMarkers: [...beats], analyzeProgress: step / steps })
      }
      if (t >= DURATION) {
        clearInterval(_analyzeTimer); _analyzeTimer = null
        set({ isAnalyzing: false, analyzeProgress: 1 })
      }
    }, 40)
  },

  setBeatSyncOn: (v) => set({ beatSyncOn: v }),

  // ── FX presets ────────────────────────────────────────────────────────────
  activeFX: null,
  setActiveFX: (fx) => set({ activeFX: fx }),

  // ── Hollywood Color LUT Engine ────────────────────────────────────────────
  activeLUT: 'None',
  setActiveLUT: (l) => set({ activeLUT: l }),

  colorGrade: {
    exposure:    0,
    highlights:  0,
    shadows:     0,
    temperature: 0,
    tint:        0,
  },
  setColorGrade: (key, val) =>
    set(s => ({ colorGrade: { ...s.colorGrade, [key]: val } })),

  colorWheels: {
    shadows:    { angle: 220, dist: 0.18 },
    midtones:   { angle: 32,  dist: 0.09 },
    highlights: { angle: 42,  dist: 0.22 },
  },
  setColorWheel: (wheel, data) =>
    set(s => ({ colorWheels: { ...s.colorWheels, [wheel]: data } })),

  blendMode: 'Normal',
  setBlendMode: (m) => set({ blendMode: m }),

  activeTransition: null,
  setActiveTransition: (t) => set({ activeTransition: t }),

  // ── Multi-Cam Sequence Switcher ───────────────────────────────────────────
  multiCamMode:    false,
  activeCamAngle:  1,
  camSyncState:    'idle',
  camSyncProgress: 0,
  camCutMarkers:   [],

  setMultiCamMode: (v) => set({ multiCamMode: v }),

  setActiveCamAngle: (n) => {
    const { isPlaying, currentTime, camCutMarkers } = get()
    const markers = isPlaying
      ? [...camCutMarkers, { time: currentTime, camAngle: n }]
      : camCutMarkers
    set({ activeCamAngle: n, camCutMarkers: markers })
  },

  syncCamAudio: () => {
    if (get().camSyncState === 'analyzing') return
    set({ camSyncState: 'analyzing', camSyncProgress: 0 })
    let p = 0
    _syncTimer = setInterval(() => {
      p = Math.min(p + 0.055, 1)
      set({ camSyncProgress: p })
      if (p >= 1) {
        clearInterval(_syncTimer); _syncTimer = null
        set({ camSyncState: 'synced' })
      }
    }, 80)
  },

  // ── Advanced Chroma Key ───────────────────────────────────────────────────
  chromaKey: {
    enabled:          false,
    color:            '#00b140',
    pedestal:         40,
    tolerance:        55,
    choke:            0,
    soften:           5,
    spillSuppression: 30,
    eyedropperActive: false,
  },
  setChromaKey: (key, val) =>
    set(s => ({ chromaKey: { ...s.chromaKey, [key]: val } })),

  // ── AI Motion Tracking ────────────────────────────────────────────────────
  motionTracker: {
    active:     false,
    tracking:   false,
    progress:   0,
    bbox:       { x: 30, y: 18, w: 26, h: 48 },
    bindEffect: null,
  },
  setMotionTracker: (key, val) =>
    set(s => ({ motionTracker: { ...s.motionTracker, [key]: val } })),

  startMotionTracking: () => {
    set(s => ({ motionTracker: { ...s.motionTracker, tracking: true, progress: 0, active: false } }))
    let p = 0
    _trackTimer = setInterval(() => {
      p = Math.min(p + 0.04, 1)
      set(s => ({ motionTracker: { ...s.motionTracker, progress: p } }))
      if (p >= 1) {
        clearInterval(_trackTimer); _trackTimer = null
        set(s => ({ motionTracker: { ...s.motionTracker, tracking: false, active: true } }))
      }
    }, 60)
  },

  // ── Time Remapping ────────────────────────────────────────────────────────
  timeRamps: {},
  activeRampClipId: null,

  toggleTimeRamp: (clipId) => {
    const { timeRamps } = get()
    if (timeRamps[clipId]) {
      const copy = { ...timeRamps }
      delete copy[clipId]
      set({ timeRamps: copy, activeRampClipId: null })
    } else {
      set(s => ({
        timeRamps: {
          ...s.timeRamps,
          [clipId]: [
            { t: 0.0,  speed: 1.0  },
            { t: 0.3,  speed: 0.25 },
            { t: 0.55, speed: 0.25 },
            { t: 0.75, speed: 4.0  },
            { t: 1.0,  speed: 1.0  },
          ],
        },
        activeRampClipId: clipId,
      }))
    }
  },

  // ── Cinematic Audio Mastering ─────────────────────────────────────────────
  audioMaster: {
    deEsser:          30,
    dialogueEnhancer: false,
    reverb:           20,
    compLow:          60,
    compMid:          70,
    compHigh:         55,
  },
  setAudioMaster: (key, val) =>
    set(s => ({ audioMaster: { ...s.audioMaster, [key]: val } })),

  // ── User Media Assets ─────────────────────────────────────────────────────
  // videoAssets: [{ id, name, fileName, url, duration, durationRaw, thumbnail, size, type:'video' }]
  // audioAssets: [{ id, name, fileName, url, duration, durationRaw, waveform, size, type:'audio' }]
  videoAssets: [],
  audioAssets: [],

  addAsset: (asset) => {
    if (asset.type === 'video') {
      set(s => ({ videoAssets: [...s.videoAssets, asset] }))
    } else {
      set(s => ({ audioAssets: [...s.audioAssets, asset] }))
    }
  },

  removeAsset: (id, type) => {
    if (type === 'video') {
      const asset = get().videoAssets.find(a => a.id === id)
      if (asset?.url) URL.revokeObjectURL(asset.url)
      set(s => ({ videoAssets: s.videoAssets.filter(a => a.id !== id) }))
    } else {
      const asset = get().audioAssets.find(a => a.id === id)
      if (asset?.url) URL.revokeObjectURL(asset.url)
      set(s => ({ audioAssets: s.audioAssets.filter(a => a.id !== id) }))
    }
  },

  // Append an uploaded asset as a new clip on the appropriate timeline track.
  // Auto-clears default mockup clips on first user import.
  // Fix 1: uses full native durationRaw — no project-duration cap.
  // Fix 2: splits video into linked video + audio clips.
  // Expands project duration if the clip is longer than current timeline.
  addClipFromAsset: (asset) => {
    const { clips, duration: projectDur } = get()
    const trackId = asset.type === 'video' ? 'cam1' : 'audio'

    const hasDefaults = Object.values(clips).flat().some(c => !c.isUser)
    const baseClips   = hasDefaults
      ? { cam1: [], cam2: [], cam3: [], text: [], audio: [] }
      : clips

    const existing = baseClips[trackId] ?? []
    const lastEnd  = existing.length > 0 ? Math.max(...existing.map(c => c.end)) : 0
    // Use real duration; fall back to current project duration if metadata extraction failed
    const clipDur  = Math.max(asset.durationRaw > 0 ? asset.durationRaw : projectDur, 0.1)

    const stamp = Date.now()
    // Fix 2: shared linkedGroupId for video+audio pair
    const linkedGroupId = asset.type === 'video' ? `lg-${stamp}` : null

    const videoClip = {
      id:            `user-${asset.id}-${stamp}`,
      start:         lastEnd,
      end:           +(lastEnd + clipDur).toFixed(3),
      label:         asset.name,
      color:         asset.type === 'video' ? '#6d28d9' : '#065f46',
      url:           asset.url,
      thumbnail:     asset.thumbnail ?? null,
      isUser:        true,
      assetId:       asset.id,
      linkedGroupId,
    }

    // Synthetic waveform seeded from asset id (for audio lane block)
    function syntheticWave(seed) {
      return Array.from({ length: 64 }, (_, i) => {
        const s = seed.charCodeAt(i % seed.length) || 97
        return Math.max(0.06, Math.min(1,
          0.35 + Math.sin(i * 0.31 + s * 0.011) * 0.28 + Math.sin(i * 0.73) * 0.14
        ))
      })
    }

    // Fix 2: audio twin for every video asset
    const audioClip = linkedGroupId ? {
      id:            `ua-${asset.id}-${stamp}`,
      start:         lastEnd,
      end:           +(lastEnd + clipDur).toFixed(3),
      label:         `${asset.name} — Audio`,
      color:         '#065f46',
      url:           asset.url,
      isUser:        true,
      assetId:       asset.id,
      linkedGroupId,
      isLinkedAudio: true,
      waveform:      syntheticWave(asset.id),
    } : null

    // Fix 1: expand project duration if clip extends beyond it
    const newEnd      = lastEnd + clipDur
    const newDuration = newEnd > projectDur ? Math.ceil(newEnd) + 4 : projectDur

    const updatedClips = {
      ...baseClips,
      [trackId]: [...existing, videoClip],
      ...(audioClip ? { audio: [...(baseClips.audio ?? []), audioClip] } : {}),
    }

    set({ clips: updatedClips, duration: newDuration })
  },

  // Fix 3: move a clip from one track to another at the same timestamp
  moveClipToTrack: (clipId, fromTrackId, toTrackId) => {
    if (fromTrackId === toTrackId) return
    set(s => {
      const fromTrack = s.clips[fromTrackId] ?? []
      const clip = fromTrack.find(c => c.id === clipId)
      if (!clip) return {}
      const toTrack = s.clips[toTrackId] ?? []
      // Keep the same start time; caller ensures no overlap check needed for now
      return {
        clips: {
          ...s.clips,
          [fromTrackId]: fromTrack.filter(c => c.id !== clipId),
          [toTrackId]:   [...toTrack, clip].sort((a, b) => a.start - b.start),
        },
      }
    })
  },

  // Unlink the video/audio pair — removes linkedGroupId from both clips in group
  unlinkClip: (clipId) => set(s => {
    let groupId = null
    for (const trackClips of Object.values(s.clips)) {
      const hit = (trackClips ?? []).find(c => c.id === clipId)
      if (hit?.linkedGroupId) { groupId = hit.linkedGroupId; break }
    }
    if (!groupId) return {}
    const newClips = {}
    for (const [tid, trackClips] of Object.entries(s.clips)) {
      newClips[tid] = (trackClips ?? []).map(c =>
        c.linkedGroupId === groupId ? { ...c, linkedGroupId: null } : c
      )
    }
    return { clips: newClips }
  }),

  // ── Clip transforms (Position / Scale / Rotation / Opacity) ──────────────────
  clipTransforms: {},

  getClipTransform: (clipId) => {
    return get().clipTransforms[clipId] ?? { posX: 0, posY: 0, scale: 100, lockScale: true, rotation: 0, anchorX: 50, anchorY: 50, opacity: 100 }
  },

  setClipTransform: (clipId, key, val) => {
    if (key === '__reset__') {
      return set(s => {
        const copy = { ...s.clipTransforms }
        delete copy[clipId]
        return { clipTransforms: copy }
      })
    }
    return set(s => ({
      clipTransforms: {
        ...s.clipTransforms,
        [clipId]: {
          ...(s.clipTransforms[clipId] ?? { posX: 0, posY: 0, scale: 100, lockScale: true, rotation: 0, anchorX: 50, anchorY: 50, opacity: 100 }),
          [key]: val,
        },
      },
    }))
  },

  // ── Keyframes ────────────────────────────────────────────────────────────────
  clipKeyframes: {},
  keyframeRecordingFor: null,

  setKeyframeRecordingFor: (clipId) => set({ keyframeRecordingFor: clipId }),

  addKeyframe: (clipId, prop) => {
    const { currentTime, clipTransforms } = get()
    const t = get().clipTransforms[clipId] ?? { posX: 0, posY: 0, scale: 100, lockScale: true, rotation: 0, anchorX: 50, anchorY: 50, opacity: 100 }
    const val = t[prop] ?? 0
    set(s => {
      const existing = s.clipKeyframes[clipId]?.[prop] ?? []
      const filtered = existing.filter(kf => Math.abs(kf.t - currentTime) > 0.05)
      const updated = [...filtered, { t: currentTime, val, interp: 'ease' }].sort((a, b) => a.t - b.t)
      return {
        clipKeyframes: {
          ...s.clipKeyframes,
          [clipId]: { ...(s.clipKeyframes[clipId] ?? {}), [prop]: updated },
        },
      }
    })
  },

  setKeyframeInterp: (clipId, prop, kfIdx, interp) => set(s => {
    const kfs = s.clipKeyframes[clipId]?.[prop] ?? []
    return {
      clipKeyframes: {
        ...s.clipKeyframes,
        [clipId]: { ...(s.clipKeyframes[clipId] ?? {}), [prop]: kfs.map((kf, i) => i === kfIdx ? { ...kf, interp } : kf) },
      },
    }
  }),

  velocityGraphOpen: false,
  setVelocityGraphOpen: (v) => set({ velocityGraphOpen: v }),

  // ── Per-clip VFX rack ─────────────────────────────────────────────────────────
  clipVFX: {},

  setClipVFX: (clipId, effect, key, val) => set(s => {
    const existing = s.clipVFX[clipId] ?? {}
    return {
      clipVFX: {
        ...s.clipVFX,
        [clipId]: { ...existing, [effect]: { ...(existing[effect] ?? {}), [key]: val } },
      },
    }
  }),

  // ── Pen tool / clip masks ─────────────────────────────────────────────────────
  penToolActive: false,
  penPoints:     [],
  clipMasks:     {},

  setPenToolActive: (v) => set({ penToolActive: v, ...(v ? { penPoints: [] } : {}) }),
  addPenPoint:      (pt) => set(s => ({ penPoints: [...s.penPoints, pt] })),
  clearPenPoints:   ()   => set({ penPoints: [] }),

  finalizeMask: (clipId) => {
    const { penPoints } = get()
    if (penPoints.length < 3) return
    set(s => ({ clipMasks: { ...s.clipMasks, [clipId]: [...s.penPoints] }, penPoints: [], penToolActive: false }))
  },

  clearMask: (clipId) => set(s => {
    const m = { ...s.clipMasks }
    delete m[clipId]
    return { clipMasks: m }
  }),

  // ── Signal scopes ─────────────────────────────────────────────────────────────
  scopesEnabled: false,
  setScopesEnabled: (v) => set({ scopesEnabled: v }),

  // ── Proxy tools ───────────────────────────────────────────────────────────────
  generateProxies: false,
  setGenerateProxies: (v) => set({ generateProxies: v }),

  // ── Adjustment layers ─────────────────────────────────────────────────────────
  adjustmentLayers: [],

  addAdjustmentLayer: () => set(s => ({
    adjustmentLayers: [
      ...s.adjustmentLayers,
      { id: `adj-${Date.now()}`, start: 0, end: 30, label: `Adjustment ${s.adjustmentLayers.length + 1}` },
    ],
  })),

  removeAdjustmentLayer: (id) => set(s => ({
    adjustmentLayers: s.adjustmentLayers.filter(l => l.id !== id),
  })),

  // ── AI Transcript panel ───────────────────────────────────────────────────────
  transcriptOpen: false,
  setTranscriptOpen: (v) => set({ transcriptOpen: v }),

  // ── AI Creative Engine (6 tools) ─────────────────────────────────────────────
  // Feature 1 — AI Video Generator
  aiGenPrompt:   '',
  aiGenState:    'idle',   // 'idle' | 'generating' | 'done'
  aiGenProgress: 0,
  setAiGenPrompt: (v) => set({ aiGenPrompt: v }),
  resetAiGen:     () => set({ aiGenState: 'idle', aiGenProgress: 0 }),
  runAiGenerate: () => {
    if (get().aiGenState === 'generating') return
    set({ aiGenState: 'generating', aiGenProgress: 0 })
    let p = 0
    const tick = () => {
      p = Math.min(+(p + Math.random() * 7 + 3).toFixed(1), 100)
      set({ aiGenProgress: p })
      if (p < 100) {
        setTimeout(tick, 220 + Math.random() * 330)
      } else {
        const segDur = DURATION / 4
        const genClips = Array.from({ length: 4 }, (_, i) => ({
          id: `aigen-${Date.now()}-${i}`, isUser: true,
          start: +(i * segDur).toFixed(3), end: +((i + 1) * segDur).toFixed(3),
          label: `AI Scene ${i + 1} — ${['Photorealistic', 'Cinematic', 'Dynamic', 'Atmospheric'][i]}`,
          color: '#0e7490',
        }))
        set(s => ({ aiGenState: 'done', aiGenProgress: 100, clips: { ...s.clips, cam1: genClips } }))
      }
    }
    setTimeout(tick, 400)
  },

  // Feature 2 — AI Audio-to-Video
  audioToVideoState: 'idle',   // 'idle' | 'analyzing' | 'done'
  setAudioToVideoState: (v) => set({ audioToVideoState: v }),
  runAudioToVideo: () => {
    if (get().audioToVideoState === 'analyzing') return
    set({ audioToVideoState: 'analyzing' })
    setTimeout(() => {
      const themes = ['City Skyline', 'Crowd Energy', 'Abstract Flow', 'Neon Streets', 'Motion Blur', 'Aerial Pan']
      const genClips = themes.map((label, i) => ({
        id: `atv-${Date.now()}-${i}`, isUser: true,
        start: i * 5, end: (i + 1) * 5,
        label, color: '#7c3aed',
      }))
      set(s => ({ audioToVideoState: 'done', clips: { ...s.clips, cam1: genClips } }))
    }, 3400)
  },

  // Feature 3 — Smart Short Clip
  shortClipEnabled:  false,
  shortClipDuration: 'auto',
  setShortClipEnabled:  (v) => set({ shortClipEnabled: v }),
  setShortClipDuration: (v) => set({ shortClipDuration: v }),

  // Feature 4 — AI Color Palette
  colorSwatches:       [],
  colorHarmonyEnabled: false,
  setColorSwatches:       (v) => set({ colorSwatches: v }),
  setColorHarmonyEnabled: (v) => set({ colorHarmonyEnabled: v }),

  // Feature 5 — AI Face Mosaic
  faceMosaicEnabled:  false,
  faceMosaicStyle:    'blur',   // 'pixel' | 'blur' | 'bar'
  faceMosaicStrength: 50,
  setFaceMosaicEnabled:  (v) => set({ faceMosaicEnabled: v }),
  setFaceMosaicStyle:    (v) => set({ faceMosaicStyle: v }),
  setFaceMosaicStrength: (v) => set({ faceMosaicStrength: v }),

  // Feature 6 — AI Translation
  translationLang:  '',
  translationState: 'idle',   // 'idle' | 'processing' | 'done'
  setTranslationLang:  (v) => set({ translationLang: v, translationState: 'idle' }),
  runTranslation: () => {
    if (get().translationState === 'processing') return
    set({ translationState: 'processing' })
    setTimeout(() => set({ translationState: 'done' }), 4800)
  },

  // ── Viral Content Creator Suite ───────────────────────────────────────────────
  captionStyle:       'hormozi',
  captionsEnabled:    false,
  captionsGenerating: false,
  captionWords:       [],
  setCaptionStyle:       (v) => set({ captionStyle: v }),
  setCaptionsEnabled:    (v) => set({ captionsEnabled: v }),
  setCaptionsGenerating: (v) => set({ captionsGenerating: v }),
  setCaptionWords:       (v) => set({ captionWords: v }),

  reframeEnabled:    false,
  setReframeEnabled: (v) => set({ reframeEnabled: v }),

  viralSlicerOpen:    false,
  setViralSlicerOpen: (v) => set({ viralSlicerOpen: v }),

  brollEnabled:    false,
  brollKeywords:   [],
  setBrollEnabled:  (v) => set({ brollEnabled: v }),
  setBrollKeywords: (v) => set({ brollKeywords: v }),

  // ── Split clip at a precise time (razor cut) ──────────────────────────────────
  splitClip: (clipId, atTime) => set(s => {
    for (const [trackId, trackClips] of Object.entries(s.clips)) {
      const idx = (trackClips ?? []).findIndex(c => c.id === clipId)
      if (idx === -1) continue
      const clip = trackClips[idx]
      if (atTime <= clip.start + 0.05 || atTime >= clip.end - 0.05) return {}
      const t     = +atTime.toFixed(3)
      const left  = { ...clip, end: t }
      const right = { ...clip, id: `${clip.id}-r${Date.now()}`, start: t }
      const newTrack = [...trackClips.slice(0, idx), left, right, ...trackClips.slice(idx + 1)]
      return { clips: { ...s.clips, [trackId]: newTrack } }
    }
    return {}
  }),

  // ── Duplicate clip (places copy at end of track) ──────────────────────────────
  duplicateClip: (clipId) => set(s => {
    for (const [trackId, trackClips] of Object.entries(s.clips)) {
      const clip = (trackClips ?? []).find(c => c.id === clipId)
      if (!clip) continue
      const dur     = clip.end - clip.start
      const lastEnd = trackClips.reduce((m, c) => Math.max(m, c.end), 0)
      const dup = { ...clip, id: `dup-${Date.now()}`, start: +lastEnd.toFixed(3), end: +(lastEnd + dur).toFixed(3) }
      return { clips: { ...s.clips, [trackId]: [...trackClips, dup].sort((a, b) => a.start - b.start) } }
    }
    return {}
  }),

  // ── Move clip to a new start time (preserves track, preserves duration) ───────
  moveClipInTime: (trackId, clipId, newStart) => set(s => {
    const track = s.clips[trackId] ?? []
    const clip  = track.find(c => c.id === clipId)
    if (!clip) return {}
    const dur       = clip.end - clip.start
    const safeStart = Math.max(0, +newStart.toFixed(3))
    return {
      clips: {
        ...s.clips,
        [trackId]: track
          .map(c => c.id === clipId ? { ...c, start: safeStart, end: +(safeStart + dur).toFixed(3) } : c)
          .sort((a, b) => a.start - b.start),
      },
    }
  }),

  // ── Trim one edge of a clip (left = in-point, right = out-point) ─────────────
  trimClip: (trackId, clipId, side, newTime) => set(s => {
    const track = s.clips[trackId] ?? []
    return {
      clips: {
        ...s.clips,
        [trackId]: track.map(c => {
          if (c.id !== clipId) return c
          const t = +newTime.toFixed(3)
          if (side === 'left')  return { ...c, start: Math.max(0, Math.min(t, c.end - 0.1)) }
          if (side === 'right') return { ...c, end:   Math.max(c.start + 0.1, t) }
          return c
        }),
      },
    }
  }),

  // ── Per-track Mute / Solo ─────────────────────────────────────────────────────
  mutedTracks: {},
  soledTracks: {},
  toggleMuteTrack: (trackId) => set(s => ({ mutedTracks: { ...s.mutedTracks, [trackId]: !s.mutedTracks[trackId] } })),
  toggleSoloTrack: (trackId) => set(s => ({ soledTracks: { ...s.soledTracks, [trackId]: !s.soledTracks[trackId] } })),

  // ── Timeline zoom level (multiplier of base PPS) ──────────────────────────────
  zoomLevel: 1,
  setZoomLevel: (z) => set({ zoomLevel: Math.max(0.25, Math.min(8, z)) }),

  // ── In / Out points ───────────────────────────────────────────────────────────
  inPoint:    null,
  outPoint:   null,
  setInPoint:  () => set(s => ({ inPoint:  +s.currentTime.toFixed(3) })),
  setOutPoint: () => set(s => ({ outPoint: +s.currentTime.toFixed(3) })),
  clearInOut:  () => set({ inPoint: null, outPoint: null }),

  // ── Sequence Settings ─────────────────────────────────────────────────────────
  sequenceSettings: {
    name: 'Sequence 01', fps: 29.97, width: 1920, height: 1080,
    sampleRate: 48000, pixelAR: 'Square', codec: 'H.264',
  },
  setSequenceSettings: (key, val) => set(s => ({ sequenceSettings: { ...s.sequenceSettings, [key]: val } })),
  showSequenceSettings: false,
  setShowSequenceSettings: (v) => set({ showSequenceSettings: v }),

  // ── Snap Engine ───────────────────────────────────────────────────────────────
  snapEnabled:   true,
  snapToClips:   true,
  snapToMarkers: true,
  snapToGrid:    false,
  setSnapEnabled:      (v) => set({ snapEnabled: v }),
  toggleSnapToClips:   () => set(s => ({ snapToClips: !s.snapToClips })),
  toggleSnapToMarkers: () => set(s => ({ snapToMarkers: !s.snapToMarkers })),
  toggleSnapToGrid:    () => set(s => ({ snapToGrid: !s.snapToGrid })),

  // ── Track Visibility / Lock / Height ──────────────────────────────────────────
  hiddenTracks: {},
  lockedTracks: {},
  trackHeights:  {},
  toggleHideTrack: (trackId) => set(s => ({ hiddenTracks: { ...s.hiddenTracks, [trackId]: !s.hiddenTracks[trackId] } })),
  toggleLockTrack: (trackId) => set(s => ({ lockedTracks: { ...s.lockedTracks, [trackId]: !s.lockedTracks[trackId] } })),
  setTrackHeight:  (trackId, h) => set(s => ({ trackHeights: { ...s.trackHeights, [trackId]: Math.max(32, Math.min(120, h)) } })),

  // ── Sequence Markers ──────────────────────────────────────────────────────────
  sequenceMarkers: [],
  addSequenceMarker: (label) => set(s => ({
    sequenceMarkers: [...s.sequenceMarkers, {
      id: `sm-${Date.now()}`, time: +s.currentTime.toFixed(3),
      label: label || `Marker ${s.sequenceMarkers.length + 1}`, color: '#fbbf24',
    }].sort((a, b) => a.time - b.time),
  })),
  removeSequenceMarker: (id) => set(s => ({ sequenceMarkers: s.sequenceMarkers.filter(m => m.id !== id) })),

  // ── Clip Speed / Reverse ──────────────────────────────────────────────────────
  clipSpeeds: {},
  setClipSpeed: (clipId, speed, reverse = false) => set(s => ({
    clipSpeeds: { ...s.clipSpeeds, [clipId]: { speed: Math.max(0.1, Math.min(10, speed)), reverse } },
  })),

  // ── Advanced Lumetri (Curves, HSL, Vignette, Grain, Sharpen) ─────────────────
  lumetriAdvanced: {
    curves: {
      master: [[0,0],[0.25,0.25],[0.75,0.75],[1,1]],
      red: [[0,0],[1,1]], green: [[0,0],[1,1]], blue: [[0,0],[1,1]],
    },
    hslEnabled: false, hueRange: [0,360], satRange: [0,100], lumRange: [0,100],
    hueShift: 0, satShift: 0, lumShift: 0,
    vignetteAmount: 0, vignetteMidpoint: 50, vignetteRoundness: 50, vignetteSoftness: 50,
    grainAmount: 0, grainSize: 25, grainRough: 50,
    sharpen: 0, clarity: 0, vibrance: 0, saturation: 0, fade: 0,
    denoise: 0, deband: 0,
  },
  setLumetriAdvanced: (key, val) => set(s => ({ lumetriAdvanced: { ...s.lumetriAdvanced, [key]: val } })),
  setLumetriCurve: (channel, points) => set(s => ({
    lumetriAdvanced: { ...s.lumetriAdvanced, curves: { ...s.lumetriAdvanced.curves, [channel]: points } },
  })),

  // ── Warp Stabilizer ───────────────────────────────────────────────────────────
  warpStabilizer: {
    enabled: false, analyzing: false, progress: 0, result: null,
    smoothness: 50, method: 'subspace-warp', cropLess: false,
  },
  setWarpStabilizer: (key, val) => set(s => ({ warpStabilizer: { ...s.warpStabilizer, [key]: val } })),
  analyzeWarpStabilizer: () => {
    set(s => ({ warpStabilizer: { ...s.warpStabilizer, analyzing: true, progress: 0, result: null } }))
    let p = 0
    const tick = setInterval(() => {
      p = Math.min(p + 4, 100)
      set(s => ({ warpStabilizer: { ...s.warpStabilizer, progress: p } }))
      if (p >= 100) {
        clearInterval(tick)
        set(s => ({ warpStabilizer: { ...s.warpStabilizer, analyzing: false, result: 'stable', enabled: true } }))
      }
    }, 80)
  },

  // ── Applied Effects per Clip ──────────────────────────────────────────────────
  appliedEffects: {},
  addEffect: (clipId, effect) => set(s => {
    const existing = s.appliedEffects[clipId] ?? []
    return {
      appliedEffects: {
        ...s.appliedEffects,
        [clipId]: [...existing, { ...effect, instanceId: `${effect.id}-${Date.now()}`, params: effect.defaultParams ?? {} }],
      },
    }
  }),
  removeEffect: (clipId, instanceId) => set(s => ({
    appliedEffects: {
      ...s.appliedEffects,
      [clipId]: (s.appliedEffects[clipId] ?? []).filter(e => e.instanceId !== instanceId),
    },
  })),
  updateEffectParam: (clipId, instanceId, paramKey, val) => set(s => ({
    appliedEffects: {
      ...s.appliedEffects,
      [clipId]: (s.appliedEffects[clipId] ?? []).map(e =>
        e.instanceId === instanceId ? { ...e, params: { ...e.params, [paramKey]: val } } : e
      ),
    },
  })),

  // ── Track Mixer (volume / pan) ────────────────────────────────────────────────
  trackMixer: {},
  setTrackVolume: (trackId, vol) => set(s => ({
    trackMixer: { ...s.trackMixer, [trackId]: { ...(s.trackMixer[trackId] ?? { volume: 100, pan: 0 }), volume: vol } },
  })),
  setTrackPan: (trackId, pan) => set(s => ({
    trackMixer: { ...s.trackMixer, [trackId]: { ...(s.trackMixer[trackId] ?? { volume: 100, pan: 0 }), pan } },
  })),

  // ── Playback Resolution ────────────────────────────────────────────────────────
  playbackResolution: 'full',
  setPlaybackResolution: (v) => set({ playbackResolution: v }),

  // ── Safe Zones & Guides ────────────────────────────────────────────────────────
  safeZonesEnabled: false,
  guidesEnabled:    false,
  setSafeZonesEnabled: (v) => set({ safeZonesEnabled: v }),
  setGuidesEnabled:    (v) => set({ guidesEnabled: v }),

  // ── Comparison (before/after split) View ─────────────────────────────────────
  comparisonView:   false,
  comparisonSplit:  50,
  setComparisonView:  (v) => set({ comparisonView: v }),
  setComparisonSplit: (v) => set({ comparisonSplit: v }),

  // ── Noise Reduction ────────────────────────────────────────────────────────────
  noiseReduction: { enabled: false, amount: 50, method: 'temporal', analyzing: false, done: false },
  setNoiseReduction: (key, val) => set(s => ({ noiseReduction: { ...s.noiseReduction, [key]: val } })),
  runNoiseReduction: () => {
    set(s => ({ noiseReduction: { ...s.noiseReduction, analyzing: true, done: false } }))
    setTimeout(() => set(s => ({ noiseReduction: { ...s.noiseReduction, analyzing: false, done: true, enabled: true } })), 2400)
  },

  // ── Rolling Shutter Repair ────────────────────────────────────────────────────
  rollingShutter: { enabled: false, amount: 50, advanced: false },
  setRollingShutter: (key, val) => set(s => ({ rollingShutter: { ...s.rollingShutter, [key]: val } })),

  // ── Frame Hold ────────────────────────────────────────────────────────────────
  frameHolds: {},
  setFrameHold: (clipId, enabled, holdTime) => set(s => ({
    frameHolds: { ...s.frameHolds, [clipId]: { enabled, holdTime: holdTime ?? s.currentTime } },
  })),

  // ── Scene Edit Detection ───────────────────────────────────────────────────────
  sceneEdits: [], sceneEditDetecting: false,
  detectSceneEdits: () => {
    set({ sceneEditDetecting: true, sceneEdits: [] })
    const dur = get().duration
    const cuts = Array.from({ length: Math.floor(dur / 3) }, (_, i) =>
      +(i * 3 + 2 + (Math.random() * 0.8 - 0.4)).toFixed(3)
    ).filter(t => t > 0 && t < dur)
    setTimeout(() => set({ sceneEditDetecting: false, sceneEdits: cuts }), 2200)
  },

  // ── Color Match ────────────────────────────────────────────────────────────────
  colorMatchEnabled: false, colorMatchState: 'idle',
  runColorMatch: () => {
    set({ colorMatchState: 'analyzing' })
    setTimeout(() => set({ colorMatchEnabled: true, colorMatchState: 'done' }), 2800)
  },

  // ── Super Resolution ──────────────────────────────────────────────────────────
  superResolution: { enabled: false, scale: '2×', quality: 'high', analyzing: false },
  setSuperResolution: (key, val) => set(s => ({ superResolution: { ...s.superResolution, [key]: val } })),
  runSuperResolution: () => {
    set(s => ({ superResolution: { ...s.superResolution, analyzing: true } }))
    setTimeout(() => set(s => ({ superResolution: { ...s.superResolution, analyzing: false, enabled: true } })), 3500)
  },

  // ── Export Panel ──────────────────────────────────────────────────────────────
  showExportPanel: false,
  setShowExportPanel: (v) => set({ showExportPanel: v }),
  exportSettings: {
    preset: 'h264-1080p', format: 'H.264', width: 1920, height: 1080,
    fps: 29.97, bitrate: 8000, audioBitrate: 320, quality: 'high', filename: 'Export',
  },
  setExportSetting: (key, val) => set(s => ({ exportSettings: { ...s.exportSettings, [key]: val } })),
  exportState: 'idle', exportProgress: 0,
  startExport: () => {
    if (get().exportState === 'rendering') return
    set({ exportState: 'rendering', exportProgress: 0 })
    let p = 0
    const tick = setInterval(() => {
      p = Math.min(p + Math.random() * 3 + 1, 100)
      set({ exportProgress: Math.round(p) })
      if (p >= 100) { clearInterval(tick); set({ exportState: 'done' }) }
    }, 150)
  },
  resetExport: () => set({ exportState: 'idle', exportProgress: 0 }),

  // ── Audio Mixer & Effects Browser ─────────────────────────────────────────────
  showAudioMixer:     false,
  showEffectsBrowser: false,
  setShowAudioMixer:     (v) => set({ showAudioMixer: v }),
  setShowEffectsBrowser: (v) => set({ showEffectsBrowser: v }),

  // ── Undo / Redo (50-snapshot ring) ────────────────────────────────────────────
  _history: [], _historyIndex: -1,
  pushHistory: () => {
    const snap = JSON.stringify({ clips: get().clips, clipTransforms: get().clipTransforms })
    const h    = get()._history.slice(0, get()._historyIndex + 1)
    const next = [...h, snap].slice(-50)
    set({ _history: next, _historyIndex: next.length - 1 })
  },
  undo: () => {
    const { _history: h, _historyIndex: idx } = get()
    if (idx <= 0) return
    const snap = JSON.parse(h[idx - 1])
    set({ ...snap, _historyIndex: idx - 1 })
  },
  redo: () => {
    const { _history: h, _historyIndex: idx } = get()
    if (idx >= h.length - 1) return
    const snap = JSON.parse(h[idx + 1])
    set({ ...snap, _historyIndex: idx + 1 })
  },

  // Ripple-delete: remove [startSec, endSec] from all tracks, shift subsequent clips left
  rippleDelete: (startSec, endSec) => {
    const deletedDur = endSec - startSec
    set(s => {
      const nextClips = {}
      for (const [trackId, trackClips] of Object.entries(s.clips)) {
        nextClips[trackId] = trackClips
          .map(clip => {
            // Clip entirely before the range → unchanged
            if (clip.end <= startSec) return clip
            // Clip entirely inside the range → remove
            if (clip.start >= startSec && clip.end <= endSec) return null
            // Clip overlaps start of range → trim end
            if (clip.start < startSec && clip.end > startSec && clip.end <= endSec) {
              return { ...clip, end: startSec }
            }
            // Clip overlaps end of range → trim start, shift left
            if (clip.start >= startSec && clip.start < endSec && clip.end > endSec) {
              return { ...clip, start: startSec, end: +(clip.end - deletedDur).toFixed(3) }
            }
            // Clip straddles entire range → punch hole (split not supported, trim end)
            if (clip.start < startSec && clip.end > endSec) {
              return { ...clip, end: startSec }
            }
            // Clip entirely after range → shift left
            if (clip.start >= endSec) {
              return { ...clip, start: +(clip.start - deletedDur).toFixed(3), end: +(clip.end - deletedDur).toFixed(3) }
            }
            return clip
          })
          .filter(Boolean)
      }
      return { clips: nextClips }
    })
  },
}))
