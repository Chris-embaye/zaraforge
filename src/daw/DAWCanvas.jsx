import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from 'react'
import {
  MousePointer2, Scissors, ArrowLeftRight, Move,
  Play, Square, SkipBack, ZoomIn, ZoomOut, Plus, Volume2,
  Undo2, Redo2, Magnet, Video,
} from 'lucide-react'
import { useDawStore }    from '../store/dawStore'
import { useBuilderStore } from '../store/builderStore'
import { useAssetLibraryStore } from '../store/assetLibraryStore'
import GenreMorphModal    from './GenreMorphModal'

// ── Constants ──────────────────────────────────────────────────────────────────
const HEADER_W  = 172
const TRACK_H   = 88
const MASTER_H  = 60
const RULER_H   = 30
const VIZUALIZER_H = 80
const MIN_MS    = 120_000

const TOOLS = [
  { id: 'select', Icon: MousePointer2, label: 'Select',    shortcut: 'V' },
  { id: 'cut',    Icon: Scissors,      label: 'Split/Cut', shortcut: 'C' },
  { id: 'trim',   Icon: ArrowLeftRight,label: 'Trim',      shortcut: 'T' },
  { id: 'slip',   Icon: Move,          label: 'Slip',      shortcut: 'S' },
]

const CURSORS = { select: 'default', cut: 'crosshair', trim: 'col-resize', slip: 'grab' }

function fmtMs(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Smart-Align: find optimal vocal clip shift to snap transients to beat grid ──
function computeOptimalOffset(track, bpm) {
  if (!track.peaks || !track.durationMs || bpm <= 0) return 0
  const beatMs = 60000 / bpm
  const peaks  = track.peaks

  // Find transient peaks (local maxima above threshold)
  const threshold = 0.38
  const transientMs = []
  for (let i = 1; i < peaks.length - 1; i++) {
    if (peaks[i] > threshold && peaks[i] > peaks[i - 1] && peaks[i] > peaks[i + 1]) {
      transientMs.push((i / peaks.length) * track.durationMs)
    }
  }
  if (!transientMs.length) return 0

  // Sweep offsets ±half-beat, find the one that minimises sum of distances to nearest beat
  let bestOffset = 0
  let bestScore  = Infinity
  for (let offset = -beatMs / 2; offset <= beatMs / 2; offset += 4) {
    let score = 0
    for (const t of transientMs) {
      const shifted     = t + offset
      const nearestBeat = Math.round(shifted / beatMs) * beatMs
      score += Math.abs(shifted - nearestBeat)
    }
    score /= transientMs.length
    if (score < bestScore) { bestScore = score; bestOffset = offset }
  }
  return Math.round(bestOffset)
}

// ── Real-time Spectrum Visualizer ─────────────────────────────────────────────
function SpectrumVisualizer({ spectrumAnalyserRef, isPlaying }) {
  const cRef   = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = cRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const freqBuf = new Uint8Array(1024)
    let frame = 0

    const draw = (time) => {
      rafRef.current = requestAnimationFrame(draw)
      frame++

      const W = canvas.width
      const H = canvas.height
      if (!W || !H) return

      const ctx2d   = canvas.getContext('2d')
      const analyser = spectrumAnalyserRef.current

      // Fade background for trailing glow
      ctx2d.fillStyle = 'rgba(2,2,10,0.55)'
      ctx2d.fillRect(0, 0, W, H)

      const BARS  = Math.min(180, Math.floor(W / (dpr * 2.8)))
      const barW  = W / BARS

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqBuf)
        const binCount = analyser.frequencyBinCount

        for (let i = 0; i < BARS; i++) {
          const t    = i / BARS
          const logT = Math.pow(t, 1.65)                     // logarithmic freq mapping
          const bin  = Math.min(Math.floor(logT * binCount), binCount - 1)
          // Average with neighbors for smoother bars
          const amp  = (
            (freqBuf[Math.max(0, bin - 1)] +
             freqBuf[bin] * 2 +
             freqBuf[Math.min(binCount - 1, bin + 1)]) / (4 * 255)
          )
          if (amp < 0.008) continue

          const barH = amp * H * 0.92
          const x    = i * barW
          const y    = H - barH

          // Neon gradient: cyan (bass) → indigo (mids) → electric-green (highs)
          let r, g, b
          if (t < 0.42) {
            const p = t / 0.42
            r = Math.round(0   + 99  * p)
            g = Math.round(229 - 127 * p)
            b = Math.round(255 - 9   * p)
          } else {
            const p = (t - 0.42) / 0.58
            r = Math.round(99  - 99  * p)
            g = Math.round(102 + 153 * p)
            b = Math.round(246 - 110 * p)
          }

          ctx2d.save()
          ctx2d.shadowColor = `rgb(${r},${g},${b})`
          ctx2d.shadowBlur  = Math.round(16 * amp * dpr)

          const grad = ctx2d.createLinearGradient(0, H, 0, y)
          grad.addColorStop(0,    `rgba(${r},${g},${b},0.95)`)
          grad.addColorStop(0.55, `rgba(${r},${g},${b},0.45)`)
          grad.addColorStop(1,    `rgba(${r},${g},${b},0.05)`)
          ctx2d.fillStyle = grad

          const bw = Math.max(dpr, barW - dpr * 1.2)
          ctx2d.fillRect(x + (barW - bw) / 2, y, bw, barH)
          ctx2d.restore()
        }

        // Peak dot at each bar top
        ctx2d.globalAlpha = 0.6
        for (let i = 0; i < BARS; i++) {
          const t    = i / BARS
          const logT = Math.pow(t, 1.65)
          const bin  = Math.min(Math.floor(logT * analyser.frequencyBinCount), analyser.frequencyBinCount - 1)
          const amp  = freqBuf[bin] / 255
          if (amp < 0.05) continue
          const barH = amp * H * 0.92
          ctx2d.fillStyle = t < 0.42 ? '#00e5ff' : t < 0.7 ? '#818cf8' : '#00ff88'
          ctx2d.fillRect(i * barW, H - barH - dpr, barW * 0.6, dpr)
        }
        ctx2d.globalAlpha = 1

      } else {
        // ── Idle ghost animation ─────────────────────────────────────
        const t0 = time / 1800
        ctx2d.globalAlpha = 0.22
        for (let i = 0; i < BARS; i++) {
          const t   = i / BARS
          const amp =
            Math.abs(Math.sin(t * Math.PI * 5   + t0))        * 0.16 +
            Math.abs(Math.sin(t * Math.PI * 12  + t0 * 1.5))  * 0.09 +
            Math.abs(Math.sin(t * Math.PI * 2.5 + t0 * 0.4))  * 0.10
          const barH = amp * H
          if (barH < 1) continue
          ctx2d.fillStyle = i % 3 === 0 ? '#00e5ff' : i % 3 === 1 ? '#818cf8' : '#00ff88'
          ctx2d.fillRect(i * barW + 0.5, H - barH, Math.max(1, barW - 1), barH)
        }
        ctx2d.globalAlpha = 1
      }

      // Hairline at center for reference
      ctx2d.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx2d.lineWidth   = 1
      ctx2d.beginPath(); ctx2d.moveTo(0, H / 2); ctx2d.lineTo(W, H / 2); ctx2d.stroke()
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [isPlaying, spectrumAnalyserRef])

  return (
    <canvas
      ref={cRef}
      style={{
        display: 'block', width: '100%', height: VIZUALIZER_H,
        background: '#02020a',
        borderBottom: '1px solid #0f1525',
      }}
    />
  )
}

// ── Master VU meter — own RAF, never triggers React re-renders ────────────────
function MasterVUMeter({ vuLevelRef, isPlaying }) {
  const cRef   = useRef(null)
  const rafRef = useRef(null)
  const peakRef = useRef(0)

  useEffect(() => {
    const canvas = cRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W   = canvas.offsetWidth  * dpr
    const H   = canvas.offsetHeight * dpr
    canvas.width  = W
    canvas.height = H
    if (W <= 0 || H <= 0) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const level = isPlaying ? (vuLevelRef.current || 0) : 0
      if (level > peakRef.current) peakRef.current = level
      else peakRef.current = Math.max(0, peakRef.current - 0.014)

      ctx.clearRect(0, 0, W, H)

      const channels = 2
      const gap  = Math.round(3 * dpr)
      const barW = Math.floor((W - gap * (channels + 1)) / channels)

      for (let ch = 0; ch < channels; ch++) {
        const x    = gap + ch * (barW + gap)
        const barH = Math.round(level * H * 0.92)
        const pkY  = Math.round((1 - peakRef.current * 0.92) * H)

        ctx.fillStyle = '#0a0a14'
        ctx.fillRect(x, 0, barW, H)

        if (barH > 0) {
          const grad = ctx.createLinearGradient(0, H, 0, 0)
          grad.addColorStop(0,    '#22c55e')
          grad.addColorStop(0.65, '#84cc16')
          grad.addColorStop(0.82, '#eab308')
          grad.addColorStop(1,    '#ef4444')
          ctx.fillStyle = grad
          ctx.fillRect(x, H - barH, barW, barH)
        }

        if (peakRef.current > 0.02) {
          ctx.fillStyle = peakRef.current > 0.88 ? '#ef4444' : '#e2e8f0'
          ctx.fillRect(x, pkY, barW, Math.max(1, dpr))
        }
      }

      if (isPlaying) rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, vuLevelRef])

  return (
    <canvas
      ref={cRef}
      style={{ display: 'block', width: '100%', height: 28, imageRendering: 'pixelated' }}
    />
  )
}

// ── Master composite waveform canvas ──────────────────────────────────────────
function MasterWaveformCanvas({ peaks, width, height }) {
  const ref = useRef(null)

  useEffect(() => {
    const c = ref.current
    if (!c || width <= 0) return
    c.width  = Math.round(width)
    c.height = height
    const ctx = c.getContext('2d')

    ctx.fillStyle = '#020208'
    ctx.fillRect(0, 0, width, height)

    if (peaks && peaks.length > 0) {
      const bw   = width / peaks.length
      const grad = ctx.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0,   '#00e5ffcc')
      grad.addColorStop(0.5, '#a78bfacc')
      grad.addColorStop(1,   '#00ff88cc')
      ctx.fillStyle = grad

      for (let i = 0; i < peaks.length; i++) {
        const h = peaks[i] * height * 0.74
        ctx.fillRect(i * bw, (height - h) / 2, Math.max(1, bw - 0.5), h)
      }
      ctx.globalAlpha = 0.18
      for (let i = 0; i < peaks.length; i++) {
        const h = peaks[i] * height * 0.74
        ctx.fillStyle = '#a78bfa'
        ctx.fillRect(i * bw, height / 2, Math.max(1, bw - 0.5), h / 2)
      }
      ctx.globalAlpha = 1
    } else {
      const bw = 2, gap = 1
      for (let x = 0; x < width; x += bw + gap) {
        const t   = x / width
        const amp =
          Math.abs(Math.sin(t * Math.PI * 11 + 0.8)) * 0.40 +
          Math.abs(Math.sin(t * Math.PI * 27 + 2.1)) * 0.35 +
          Math.abs(Math.sin(t * Math.PI *  6 + 3.7)) * 0.25
        const h = amp * height * 0.55
        ctx.globalAlpha = 0.07
        ctx.fillStyle = '#00e5ff'
        ctx.fillRect(x, (height - h) / 2, bw, h)
      }
      ctx.globalAlpha = 1
    }

    ctx.strokeStyle = '#ffffff06'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke()
  }, [peaks, width, height])

  return (
    <canvas
      ref={ref}
      style={{ display: 'block', width: '100%', height, imageRendering: 'pixelated' }}
    />
  )
}

// ── Track waveform canvas ──────────────────────────────────────────────────────
function WaveformCanvas({ track, width, height, isSelected, clipOffsetPx = 0 }) {
  const ref = useRef(null)

  useEffect(() => {
    const c = ref.current
    if (!c || width <= 0) return
    c.width  = Math.round(width)
    c.height = height
    const ctx = c.getContext('2d')

    const bg = isSelected ? '#040812' : '#02020a'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    if (track.peaks) {
      const peaks    = track.peaks
      const drawW    = Math.max(1, width - clipOffsetPx)
      const bw       = drawW / peaks.length

      // Dead zone before the clip
      if (clipOffsetPx > 0) {
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, clipOffsetPx, height)
      }

      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0,   track.color + 'ee')
      grad.addColorStop(0.5, track.color + 'cc')
      grad.addColorStop(1,   track.color + '88')
      ctx.fillStyle = grad

      for (let i = 0; i < peaks.length; i++) {
        const h = peaks[i] * height * 0.86
        ctx.fillRect(clipOffsetPx + i * bw, (height - h) / 2, Math.max(1, bw - 0.5), h)
      }
      ctx.globalAlpha = 0.25
      for (let i = 0; i < peaks.length; i++) {
        const h = peaks[i] * height * 0.86
        ctx.fillStyle = track.color
        ctx.fillRect(clipOffsetPx + i * bw, height / 2, Math.max(1, bw - 0.5), h / 2)
      }
      ctx.globalAlpha = 1
    } else {
      const seed = track.id === 'vocal' ? 0 : 1.7
      const bw = 2, gap = 1
      for (let x = 0; x < width; x += bw + gap) {
        const t   = x / width
        const amp =
          Math.abs(Math.sin(t * Math.PI * 14 + 0.5 + seed)) * 0.52 +
          Math.abs(Math.sin(t * Math.PI * 33 + 1.2 + seed)) * 0.28 +
          Math.abs(Math.sin(t * Math.PI *  8 + 2.4 + seed)) * 0.20
        const h = amp * height * 0.7
        ctx.globalAlpha = 0.13
        ctx.fillStyle = track.color
        ctx.fillRect(x, (height - h) / 2, bw, h)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = track.color + '28'
      ctx.font = '11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Drop audio here or use sidebar', width / 2, height / 2)
    }

    ctx.strokeStyle = track.color + (track.peaks ? '25' : '15')
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke()
  }, [track.peaks, track.color, track.id, width, height, isSelected, clipOffsetPx])

  return (
    <canvas
      ref={ref}
      style={{ display: 'block', width: '100%', height: TRACK_H, imageRendering: 'pixelated' }}
    />
  )
}

// ── Timeline ruler ─────────────────────────────────────────────────────────────
function TimelineRuler({ totalMs, pixelsPerMs, playheadMs, onSeek, bpm, showBeatGrid }) {
  const pxPerSec = pixelsPerMs * 1000
  let minor = 60, major = 60
  if      (pxPerSec > 180) { minor = 1;  major = 5   }
  else if (pxPerSec > 60)  { minor = 5;  major = 30  }
  else if (pxPerSec > 20)  { minor = 10; major = 60  }
  else if (pxPerSec > 7)   { minor = 30; major = 120 }

  const totalSec = totalMs / 1000
  const ticks    = []
  for (let t = 0; t <= totalSec + minor; t += minor) {
    ticks.push({ x: t * 1000 * pixelsPerMs, t, isMajor: t % major === 0 })
  }

  // Beat grid markers
  const beatMarkers = []
  if (showBeatGrid && bpm > 0) {
    const beatMs    = 60000 / bpm
    const beatCount = Math.ceil(totalMs / beatMs)
    for (let b = 0; b <= beatCount; b++) {
      const x         = b * beatMs * pixelsPerMs
      const isDownbeat = b % 4 === 0
      beatMarkers.push({ x, isDownbeat })
    }
  }

  return (
    <div
      className="relative select-none"
      style={{
        height: RULER_H, background: '#0a0a12',
        borderBottom: '1px solid #1a1a2e', cursor: 'pointer',
      }}
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek((e.clientX - r.left) / pixelsPerMs)
      }}>

      {/* Beat grid in ruler */}
      {beatMarkers.map(({ x, isDownbeat }, i) => (
        <div key={i} style={{
          position: 'absolute', left: Math.round(x), top: 0,
          width: isDownbeat ? 1 : 1,
          height: '100%',
          background: isDownbeat ? '#4f46e544' : '#1e293b44',
          pointerEvents: 'none',
        }} />
      ))}

      {ticks.map(({ x, t, isMajor }) => (
        <Fragment key={t}>
          <div style={{
            position: 'absolute', left: Math.round(x), top: 0,
            width: 1, height: isMajor ? '55%' : '35%',
            background: isMajor ? '#2d3748' : '#1a1a2e',
          }} />
          {isMajor && (
            <span style={{
              position: 'absolute', left: Math.round(x) + 3, top: 5,
              fontSize: 9, color: '#475569',
              fontFamily: 'monospace', pointerEvents: 'none', userSelect: 'none',
            }}>
              {fmtMs(t * 1000)}
            </span>
          )}
        </Fragment>
      ))}

      <div style={{
        position: 'absolute',
        left: Math.round(playheadMs * pixelsPerMs) - 5, top: 0,
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `${RULER_H * 0.55}px solid #ef4444`,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 3px #ef4444)',
      }} />
    </div>
  )
}

// ── Track header strip ─────────────────────────────────────────────────────────
function TrackHeader({ track, isSelected, onSelect }) {
  const { toggleMute, toggleSolo, setVolume, removeTrack } = useDawStore()
  return (
    <div
      onClick={onSelect}
      className="flex-shrink-0 flex flex-col justify-between py-2 px-2.5 cursor-pointer"
      style={{
        width: HEADER_W, height: TRACK_H,
        borderLeft:   `3px solid ${track.color}`,
        borderRight:  '1px solid #1a1a2e',
        borderBottom: '1px solid #111118',
        background: isSelected ? '#080e1a' : '#04040c',
        transition: 'background 0.15s',
      }}>

      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="text-xs font-semibold truncate" style={{ color: isSelected ? '#e2e8f0' : '#94a3b8' }}>
          {track.name}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); toggleMute(track.id) }}
            title="Mute"
            className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-colors"
            style={{ background: track.muted ? '#7f1d1d' : '#1e293b', color: track.muted ? '#fca5a5' : '#475569' }}>
            M
          </button>
          <button
            onClick={e => { e.stopPropagation(); toggleSolo(track.id) }}
            title="Solo"
            className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-colors"
            style={{ background: track.solo ? track.color + '33' : '#1e293b', color: track.solo ? track.color : '#475569' }}>
            S
          </button>
          <button
            onClick={e => { e.stopPropagation(); removeTrack(track.id) }}
            title="Remove track"
            className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-gray-700 hover:text-red-500 hover:bg-red-950/40 transition-colors">
            ×
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Volume2 size={9} className="text-gray-700 flex-shrink-0" />
        <input
          type="range" min={0} max={1} step={0.01} value={track.volume}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); setVolume(track.id, +e.target.value) }}
          className="flex-1 h-0.5"
          style={{ accentColor: track.color, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', minWidth: 22, textAlign: 'right' }}>
          {Math.round(track.volume * 100)}
        </span>
      </div>

      <div style={{
        height: 3, borderRadius: 2,
        background: `linear-gradient(90deg, ${track.color}88, transparent)`,
      }} />
    </div>
  )
}

// ── Master Out header (fixed column) ──────────────────────────────────────────
function MasterHeader({ vuLevelRef, isPlaying }) {
  return (
    <div
      className="flex-shrink-0 flex flex-col justify-between py-2 px-2.5"
      style={{
        width: HEADER_W, height: MASTER_H,
        borderLeft:  '3px solid #334155',
        borderRight: '1px solid #1a1a2e',
        borderTop:   '1px solid #1a1a2e',
        background:  '#06060f',
      }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#475569',
        }}>
          Master Out
        </span>
        <span style={{ fontSize: 9, color: '#1e293b', fontFamily: 'monospace' }}>100</span>
      </div>
      <MasterVUMeter vuLevelRef={vuLevelRef} isPlaying={isPlaying} />
      <div style={{
        height: 2, borderRadius: 2,
        background: 'linear-gradient(90deg, #00e5ff44, #a78bfa44, #00ff8844)',
      }} />
    </div>
  )
}

// ── Main DAW canvas ────────────────────────────────────────────────────────────
export default function DAWCanvas() {
  const {
    tracks, fx, selectedId, activeTool, playheadMs, isPlaying, zoom, bpm,
    undoStack, redoStack, clipOffsets,
    selectTrack, setTool, setPlayhead, setPlaying, setZoom, setBuffer, addTrack,
    undo, redo, setClipOffset, clearClipOffset,
    setMasterExportUrl,
  } = useDawStore()

  const { setAppMode }           = useBuilderStore()
  const { setMasterAudioExport } = useAssetLibraryStore()

  const outerRef  = useRef(null)
  const scrollRef = useRef(null)
  const [waveW, setWaveW]   = useState(800)
  const [dragOver, setDragOver] = useState(null)

  // Genre Morph modal
  const [morphOpen, setMorphOpen] = useState(false)

  // Smart-Align state
  const [showBeatGrid,  setShowBeatGrid]  = useState(false)
  const [alignResult,   setAlignResult]   = useState(null)  // { offsetMs, trackName }

  useEffect(() => {
    const measure = () => {
      if (outerRef.current) setWaveW(outerRef.current.clientWidth - HEADER_W)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [])

  const totalMs     = Math.max(MIN_MS, ...tracks.map(t => t.durationMs))
  const contentW    = Math.max(waveW, waveW * zoom)
  const pixelsPerMs = contentW / totalMs

  // Audio engine refs
  const audioCtxRef         = useRef(null)
  const srcNodesRef         = useRef([])
  const analyserRef         = useRef(null)       // VU meter
  const spectrumAnalyserRef = useRef(null)       // Spectrum visualizer (higher fftSize)
  const vuLevelRef          = useRef(0)
  const gateAnalysersRef    = useRef({})
  const rafRef              = useRef(null)
  const startCtxRef         = useRef(0)
  const startPhRef          = useRef(0)
  const mediaRecRef         = useRef(null)
  const chunksRef           = useRef([])
  const [isRecording, setIsRecording] = useState(false)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  const stopPlayback = useCallback(() => {
    srcNodesRef.current.forEach(n => { try { n.stop() } catch {} })
    srcNodesRef.current    = []
    cancelAnimationFrame(rafRef.current)
    vuLevelRef.current     = 0
    gateAnalysersRef.current = {}
    setPlaying(false)
  }, [setPlaying])

  const togglePlayback = useCallback(() => {
    if (isPlaying) { stopPlayback(); return }
    const ctx       = getCtx()
    const hasTracks = tracks.some(t => t.audioBuffer)
    if (!hasTracks) return

    // ── Signal chain: master → limiter → spectrumAnalyser → vuAnalyser → destination ──
    const master = ctx.createGain()

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -3
    limiter.knee.value      = 0
    limiter.ratio.value     = 20
    limiter.attack.value    = 0.003
    limiter.release.value   = 0.05

    // Spectrum analyser — higher fftSize for better frequency resolution
    const spectrumAnalyser = ctx.createAnalyser()
    spectrumAnalyser.fftSize          = 4096
    spectrumAnalyser.smoothingTimeConstant = 0.82
    spectrumAnalyserRef.current = spectrumAnalyser

    // VU analyser
    const vuAnalyser = ctx.createAnalyser()
    vuAnalyser.fftSize = 512
    analyserRef.current = vuAnalyser

    master.connect(limiter)
    limiter.connect(spectrumAnalyser)
    spectrumAnalyser.connect(vuAnalyser)
    vuAnalyser.connect(ctx.destination)

    gateAnalysersRef.current = {}

    const offsetSec = playheadMs / 1000
    startCtxRef.current = ctx.currentTime
    startPhRef.current  = playheadMs

    const hasSolo = tracks.some(t => t.solo)

    tracks.forEach(track => {
      if (!track.audioBuffer) return
      if (track.muted) return
      if (hasSolo && !track.solo) return

      const clipOffsetMs  = clipOffsets[track.id] ?? 0
      const clipOffsetSec = clipOffsetMs / 1000
      const tfx = fx[track.id] || {}

      // Determine when and where in the buffer to play
      const effectiveStart = offsetSec - clipOffsetSec
      if (effectiveStart >= track.audioBuffer.duration) return  // already past end

      const src  = ctx.createBufferSource()
      const gain = ctx.createGain()
      src.buffer      = track.audioBuffer
      gain.gain.value = track.volume

      if (tfx.gateEnabled) {
        const gateAnalyser = ctx.createAnalyser()
        gateAnalyser.fftSize = 256
        const gateGain = ctx.createGain()
        gateGain.gain.value = 1
        src.connect(gateAnalyser)
        src.connect(gateGain)
        gateGain.connect(gain)
        gateAnalysersRef.current[track.id] = {
          analyser:  gateAnalyser,
          gainNode:  gateGain,
          threshold: tfx.gateThreshold ?? -40,
        }
      } else {
        src.connect(gain)
      }

      gain.connect(master)

      if (effectiveStart < 0) {
        // Clip starts after the current playhead — schedule with delay
        src.start(ctx.currentTime + (-effectiveStart), 0)
      } else {
        src.start(0, effectiveStart)
      }
      srcNodesRef.current.push(src)

      if (tfx.doublerEnabled) {
        const detune  = tfx.doublerDetune ?? 8
        const delayMs = tfx.doublerDelay  ?? 22
        const delayS  = delayMs / 1000
        const doublerPairs = [
          [+detune, ctx.currentTime + delayS],
          [-detune, ctx.currentTime + delayS * 1.35],
        ]
        for (const [d, startAt] of doublerPairs) {
          const s2 = ctx.createBufferSource()
          const g2 = ctx.createGain()
          s2.buffer       = track.audioBuffer
          s2.detune.value = d
          g2.gain.value   = 0.32
          s2.connect(g2); g2.connect(master)
          s2.start(Math.max(ctx.currentTime, startAt), Math.max(0, effectiveStart))
          srcNodesRef.current.push(s2)
        }
      }
    })

    setPlaying(true)

    const vuBuf     = new Uint8Array(vuAnalyser.frequencyBinCount)
    const gateVuBuf = new Uint8Array(128)

    const tick = () => {
      const elapsed = (ctx.currentTime - startCtxRef.current) * 1000
      const now     = startPhRef.current + elapsed
      if (now >= totalMs) { stopPlayback(); setPlayhead(0); return }
      setPlayhead(now)

      // Master VU level
      vuAnalyser.getByteTimeDomainData(vuBuf)
      let sum = 0
      for (let i = 0; i < vuBuf.length; i++) {
        const v = vuBuf[i] / 128 - 1; sum += v * v
      }
      vuLevelRef.current = Math.sqrt(sum / vuBuf.length)

      // Noise gate
      for (const refs of Object.values(gateAnalysersRef.current)) {
        refs.analyser.getByteTimeDomainData(gateVuBuf)
        let gs = 0
        for (let i = 0; i < gateVuBuf.length; i++) {
          const v = gateVuBuf[i] / 128 - 1; gs += v * v
        }
        const rms   = Math.sqrt(gs / gateVuBuf.length)
        const dbRms = rms > 1e-9 ? 20 * Math.log10(rms) : -100
        const open  = dbRms > refs.threshold
        refs.gainNode.gain.setTargetAtTime(open ? 1 : 0.001, ctx.currentTime, 0.015)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [isPlaying, stopPlayback, getCtx, tracks, fx, clipOffsets, playheadMs, totalMs, setPlaying, setPlayhead])

  // ── Forward master mix to Video Editor ───────────────────────────────────────
  const exportToVideo = useCallback(async () => {
    const loadedTracks = tracks.filter(t => t.audioBuffer)
    if (!loadedTracks.length) return

    const ctx   = getCtx()
    const hasSolo = tracks.some(t => t.solo)
    const sampleRate = loadedTracks[0].audioBuffer.sampleRate
    const totalLen   = Math.max(...loadedTracks.map(t => t.audioBuffer.length))

    const offCtx = new OfflineAudioContext(2, totalLen, sampleRate)

    loadedTracks.forEach(track => {
      if (track.muted) return
      if (hasSolo && !track.solo) return
      const src  = offCtx.createBufferSource()
      const gain = offCtx.createGain()
      src.buffer      = track.audioBuffer
      gain.gain.value = track.volume
      src.connect(gain)
      gain.connect(offCtx.destination)
      src.start()
    })

    const rendered = await offCtx.startRendering()

    // Encode to WAV blob
    const numCh   = rendered.numberOfChannels
    const len     = rendered.length
    const sr      = rendered.sampleRate
    const buf     = new ArrayBuffer(44 + len * numCh * 2)
    const view    = new DataView(buf)
    const write   = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
    write(0, 'RIFF'); view.setUint32(4, 36 + len * numCh * 2, true); write(8, 'WAVE')
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, numCh, true); view.setUint32(24, sr, true)
    view.setUint32(28, sr * numCh * 2, true); view.setUint16(32, numCh * 2, true)
    view.setUint16(34, 16, true); write(36, 'data')
    view.setUint32(40, len * numCh * 2, true)
    let offset = 44
    for (let i = 0; i < len; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const s = Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
        offset += 2
      }
    }
    const blob    = new Blob([buf], { type: 'audio/wav' })
    const url     = URL.createObjectURL(blob)
    setMasterExportUrl(url)
    setMasterAudioExport({ dataUrl: url, name: 'Master Mix.wav', source: 'DAW Studio' })
    setAppMode('video')
  }, [tracks, getCtx, setMasterExportUrl, setMasterAudioExport, setAppMode])

  // ── Smart-Align ─────────────────────────────────────────────────────────────
  const handleSmartAlign = useCallback(() => {
    const vocal = tracks.find(t => t.id === 'vocal')
    if (!vocal?.peaks) return

    const offsetMs = computeOptimalOffset(vocal, bpm)
    setClipOffset('vocal', offsetMs)
    setShowBeatGrid(true)
    setAlignResult({ offsetMs, trackName: vocal.name })

    // Auto-dismiss the result badge after 5s
    setTimeout(() => setAlignResult(null), 5000)
  }, [tracks, bpm, setClipOffset])

  // Composite master peaks
  const masterPeaks = useMemo(() => {
    const loaded = tracks.filter(t => t.peaks && !t.muted)
    if (!loaded.length) return null
    const count = 900
    const out   = new Float32Array(count)
    for (const t of loaded) {
      const step = t.peaks.length / count
      for (let i = 0; i < count; i++) {
        out[i] = Math.max(out[i], t.peaks[Math.floor(i * step)] * t.volume)
      }
    }
    return out
  }, [tracks])

  // Drag-and-drop
  const handleDrop = useCallback((trackId, e) => {
    e.preventDefault()
    setDragOver(null)
    const file = Array.from(e.dataTransfer.files).find(
      f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(f.name)
    )
    if (!file) return
    getCtx().decodeAudioData
    file.arrayBuffer()
      .then(ab => getCtx().decodeAudioData(ab))
      .then(buf => setBuffer(trackId, buf))
      .catch(err => console.error('Audio decode failed:', err))
  }, [getCtx, setBuffer])

  const uploadToTrack = useCallback((trackId) => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async e => {
      const file = e.target.files?.[0]; if (!file) return
      const buf = await getCtx().decodeAudioData(await file.arrayBuffer())
      setBuffer(trackId, buf)
    }
    el.click()
  }, [getCtx, setBuffer])

  const startRecording = useCallback(async () => {
    let stream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { alert('Microphone access denied.'); return }
    chunksRef.current = []
    const mr = new MediaRecorder(stream)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const buf  = await getCtx().decodeAudioData(await blob.arrayBuffer())
      setBuffer('vocal', buf)
    }
    mr.start(); mediaRecRef.current = mr; setIsRecording(true)
  }, [getCtx, setBuffer])

  const stopRecording = () => mediaRecRef.current?.stop()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); return
      }
      const map = { v: 'select', c: 'cut', t: 'trim', s: 'slip' }
      if (e.key === ' ')                   { e.preventDefault(); togglePlayback() }
      else if (map[e.key?.toLowerCase()])  setTool(map[e.key.toLowerCase()])
      else if (e.key === 'Home')           { e.preventDefault(); setPlayhead(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlayback, setTool, setPlayhead, undo, redo])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    srcNodesRef.current.forEach(n => { try { n.stop() } catch {} })
    audioCtxRef.current?.close()
  }, [])

  const handleSeek = (ms) => {
    if (isPlaying) stopPlayback()
    setPlayhead(Math.max(0, Math.min(ms, totalMs)))
  }

  const totalTrackH    = tracks.length * TRACK_H
  const vocalTrack     = tracks.find(t => t.id === 'vocal')
  const hasVocalPeaks  = !!vocalTrack?.peaks

  return (
    <div className="flex flex-col" style={{ position: 'absolute', inset: 0, background: '#02020a', cursor: CURSORS[activeTool] }}>
      {morphOpen && <GenreMorphModal onClose={() => setMorphOpen(false)} />}

      {/* ── Editing toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 flex-shrink-0"
        style={{
          height: 40,
          background: 'rgba(4,4,14,0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          paddingLeft: 88,
        }}>

        {/* Tool buttons */}
        <div className="flex items-center gap-0.5">
          {TOOLS.map(({ id, Icon, label, shortcut }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={`${label} [${shortcut}]`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: activeTool === id ? '#0f172a' : 'transparent',
                color:      activeTool === id ? '#cbd5e1' : '#475569',
                outline:    activeTool === id ? '1px solid #1e293b' : 'none',
              }}>
              <Icon size={12} />
              <span className="hidden xl:block">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-2 flex-shrink-0" style={{ background: '#1e293b' }} />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!undoStack.length}
          title={`Undo [Ctrl+Z] — ${undoStack.length} step${undoStack.length !== 1 ? 's' : ''}`}
          className="p-1.5 rounded transition-colors text-gray-600 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed">
          <Undo2 size={13} />
        </button>
        <button
          onClick={redo}
          disabled={!redoStack.length}
          title={`Redo [Ctrl+Y] — ${redoStack.length} step${redoStack.length !== 1 ? 's' : ''}`}
          className="p-1.5 rounded transition-colors text-gray-600 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed">
          <Redo2 size={13} />
        </button>

        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: '#1e293b' }} />

        {/* Transport */}
        <button
          onClick={() => { setPlayhead(0); stopPlayback() }}
          title="Return to start [Home]"
          className="p-1.5 rounded transition-colors text-gray-600 hover:text-gray-300 hover:bg-gray-800">
          <SkipBack size={13} />
        </button>

        <button
          onClick={togglePlayback}
          title="Play / Stop [Space]"
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
          style={{
            background: isPlaying ? '#ef444420' : '#22c55e20',
            border:     isPlaying ? '1px solid #ef444460' : '1px solid #22c55e60',
            color:      isPlaying ? '#ef4444'   : '#22c55e',
            boxShadow:  isPlaying ? '0 0 10px rgba(239,68,68,0.25)' : '0 0 10px rgba(34,197,94,0.25)',
          }}>
          {isPlaying
            ? <Square size={11} fill="currentColor" />
            : <Play   size={11} fill="currentColor" className="ml-0.5" />}
        </button>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isPlaying}
          title={isRecording ? 'Stop Recording' : 'Record Vocals'}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ml-1 transition-all disabled:opacity-30"
          style={{
            background: isRecording ? '#450a0a' : 'transparent',
            border:     isRecording ? '1px solid #7f1d1d' : '1px solid transparent',
            color:      isRecording ? '#fca5a5' : '#6b7280',
          }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#ef4444', boxShadow: isRecording ? '0 0 6px #ef4444' : 'none' }} />
          <span className="hidden sm:block">{isRecording ? 'Recording…' : 'Record'}</span>
        </button>

        <div className="w-px h-5 mx-2 flex-shrink-0" style={{ background: '#1e293b' }} />

        {/* Smart-Align vocal */}
        <button
          onClick={handleSmartAlign}
          disabled={!hasVocalPeaks}
          title="Snap vocal transients to nearest beat grid position"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30"
          style={{
            background: showBeatGrid ? '#1e1b4b' : 'transparent',
            color:      showBeatGrid ? '#818cf8' : '#6b7280',
            border:     showBeatGrid ? '1px solid #3730a3' : '1px solid transparent',
          }}>
          <Magnet size={12} />
          <span className="hidden lg:block">Vibe Snap</span>
        </button>

        {/* Beat grid toggle */}
        <button
          onClick={() => setShowBeatGrid(v => !v)}
          title="Toggle beat grid"
          className="px-2 py-1.5 rounded text-[10px] font-bold transition-all"
          style={{
            background: showBeatGrid ? '#1e1b4b' : 'transparent',
            color:      showBeatGrid ? '#818cf8' : '#374151',
            border:     showBeatGrid ? '1px solid #3730a388' : '1px solid transparent',
          }}>
          ♩
        </button>

        {/* Smart-Align result badge */}
        {alignResult && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: '#1e1b4b', border: '1px solid #4f46e5' }}>
            <span className="text-[9px] font-bold text-indigo-400">
              Snapped {alignResult.offsetMs >= 0 ? '+' : ''}{alignResult.offsetMs}ms
            </span>
            <button
              onClick={() => { clearClipOffset('vocal'); setAlignResult(null) }}
              className="text-indigo-600 hover:text-indigo-400 transition-colors text-xs leading-none">
              ×
            </button>
          </div>
        )}

        <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: '#1e293b' }} />

        <span className="text-xs font-mono tabular-nums" style={{ color: '#64748b', minWidth: 36 }}>
          {fmtMs(playheadMs)}
        </span>

        <div className="flex-1" />

        {/* 🔮 AI Infinite Style Morph */}
        <button
          onClick={() => setMorphOpen(true)}
          title="AI Infinite Style Morph — transform your track's genre while keeping key, pitch & rhythm"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border:     '1px solid rgba(99,102,241,0.35)',
            color:      '#818cf8',
            boxShadow:  '0 0 14px rgba(99,102,241,0.18)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(99,102,241,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(99,102,241,0.18)' }}>
          <span>🔮</span>
          <span className="hidden lg:block">AI Style Morph</span>
        </button>

        {/* 🎬 Forward to Video Editor */}
        <button
          onClick={exportToVideo}
          disabled={tracks.every(t => !t.audioBuffer)}
          title="Render master mix and send to Video Editor timeline"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(244,114,182,0.10)',
            border:     '1px solid rgba(244,114,182,0.30)',
            color:      '#f472b6',
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(244,114,182,0.20)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(244,114,182,0.25)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,114,182,0.10)'; e.currentTarget.style.boxShadow = 'none' }}>
          <Video size={12} />
          <span className="hidden lg:block">To Video</span>
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(zoom - 0.5)}
            className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors">
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] font-mono text-gray-700 w-7 text-center">{zoom}×</span>
          <button onClick={() => setZoom(zoom + 0.5)}
            className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors">
            <ZoomIn size={12} />
          </button>
        </div>

        <button
          onClick={addTrack}
          className="flex items-center gap-1 px-2.5 py-1.5 ml-2 rounded text-[11px] font-medium transition-colors text-gray-500 hover:text-gray-200 hover:bg-gray-800">
          <Plus size={11} /> Track
        </button>
      </div>

      {/* ── Spectrum Visualizer ──────────────────────────────────────────── */}
      <SpectrumVisualizer spectrumAnalyserRef={spectrumAnalyserRef} isPlaying={isPlaying} />

      {/* ── Timeline body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden" ref={outerRef}>

        {/* Fixed left column */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: HEADER_W, background: '#04040c' }}>
          <div style={{ height: RULER_H, borderBottom: '1px solid #111118', background: '#080812' }} />
          {tracks.map(t => (
            <TrackHeader
              key={t.id}
              track={t}
              isSelected={selectedId === t.id}
              onSelect={() => selectTrack(t.id)}
            />
          ))}
          <MasterHeader vuLevelRef={vuLevelRef} isPlaying={isPlaying} />
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: contentW, minWidth: waveW, position: 'relative' }}>

            {/* Ruler */}
            <TimelineRuler
              totalMs={totalMs}
              pixelsPerMs={pixelsPerMs}
              playheadMs={playheadMs}
              onSeek={handleSeek}
              bpm={bpm}
              showBeatGrid={showBeatGrid}
            />

            {/* Track lanes + playhead */}
            <div className="relative">
              {tracks.map(t => {
                const clipOffsetMs = clipOffsets[t.id] ?? 0
                const clipOffsetPx = Math.round(clipOffsetMs * pixelsPerMs)
                return (
                  <div
                    key={t.id}
                    style={{
                      height: TRACK_H, position: 'relative',
                      borderBottom: '1px solid #0d0d18',
                      background: dragOver === t.id
                        ? t.color + '0c'
                        : selectedId === t.id ? '#030610' : '#02020a',
                      transition: 'background 0.12s',
                      outline:       dragOver === t.id ? `2px dashed ${t.color}88` : 'none',
                      outlineOffset: '-2px',
                    }}
                    onClick={() => selectTrack(t.id)}
                    onDragOver={e => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'copy'
                      setDragOver(t.id)
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
                    }}
                    onDrop={e => handleDrop(t.id, e)}>

                    <WaveformCanvas
                      track={t}
                      width={contentW}
                      height={TRACK_H}
                      isSelected={selectedId === t.id}
                      clipOffsetPx={clipOffsetPx}
                    />

                    {/* Beat grid overlay on track lane */}
                    {showBeatGrid && bpm > 0 && (() => {
                      const beatMs    = 60000 / bpm
                      const beatCount = Math.ceil(totalMs / beatMs) + 1
                      return Array.from({ length: beatCount }, (_, b) => {
                        const x          = Math.round(b * beatMs * pixelsPerMs)
                        const isDownbeat = b % 4 === 0
                        return (
                          <div key={b} style={{
                            position: 'absolute', top: 0, left: x,
                            width: 1, height: TRACK_H,
                            background: isDownbeat ? '#4f46e533' : '#1e293b22',
                            pointerEvents: 'none', zIndex: 5,
                          }} />
                        )
                      })
                    })()}

                    {/* Clip offset indicator badge */}
                    {clipOffsetPx !== 0 && (
                      <div style={{
                        position: 'absolute', top: 4, left: Math.max(4, clipOffsetPx - 50),
                        background: '#1e1b4b', border: '1px solid #4f46e5',
                        borderRadius: 4, padding: '2px 6px',
                        fontSize: 8, fontWeight: 700, color: '#818cf8',
                        pointerEvents: 'none', zIndex: 10,
                      }}>
                        ⌥ {clipOffsetMs > 0 ? '+' : ''}{clipOffsetMs}ms
                      </div>
                    )}

                    {/* Drag-over label */}
                    {dragOver === t.id && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none',
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: t.color,
                          background: '#02020acc', padding: '4px 12px', borderRadius: 6,
                        }}>
                          Drop to load into {t.name}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Playhead */}
              <div
                style={{
                  position: 'absolute', top: 0,
                  left: Math.round(playheadMs * pixelsPerMs),
                  width: 2, height: totalTrackH + MASTER_H,
                  background: '#ef4444',
                  boxShadow: '0 0 8px rgba(239,68,68,0.7), 0 0 2px rgba(239,68,68,1)',
                  pointerEvents: 'none', zIndex: 20,
                }}
              />

              {/* Master Out lane */}
              <div style={{
                height: MASTER_H, position: 'relative',
                borderTop: '1px solid #1a1a2e',
                background: '#020208',
              }}>
                <MasterWaveformCanvas peaks={masterPeaks} width={contentW} height={MASTER_H} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', paddingLeft: 10,
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    background: masterPeaks
                      ? 'linear-gradient(90deg, #00e5ff66, #a78bfa66, #00ff8866)'
                      : 'none',
                    WebkitBackgroundClip: masterPeaks ? 'text' : 'unset',
                    WebkitTextFillColor:  masterPeaks ? 'transparent' : '#1e293b',
                    backgroundClip:       masterPeaks ? 'text' : 'unset',
                    color:                masterPeaks ? 'transparent' : '#1e293b',
                  }}>
                    {masterPeaks ? '◈  Master Mix' : 'Load audio to see master mix'}
                  </span>
                </div>
              </div>
            </div>

            {tracks.every(t => !t.audioBuffer) && (
              <div style={{
                position: 'absolute',
                top: RULER_H + totalTrackH + MASTER_H + 20,
                left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
              }}>
                <p style={{ fontSize: 11, color: '#1e293b', fontFamily: 'system-ui' }}>
                  Drag &amp; drop audio files onto track lanes, or use the sidebar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
