import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, Upload, Play, Square, Download,
  Volume2, Music, Zap, Loader2, Activity, Sliders,
} from 'lucide-react'
import {
  SCALES, detectPitch, midiToName, freqToMidi,
  processAutoTune, mixAndDownload, calcRMS,
} from '../lib/pitchEngine'

const SCALE_NAMES = Object.keys(SCALES)

// ── Reverb presets ────────────────────────────────────────────────────────────
// duration: IR length in seconds  |  decay: exponential tail shape (higher = shorter tail)
// wet: 0–1 mix ratio into the convolver
const REVERB_PRESETS = {
  dry:       { label: 'Dry Studio',  duration: 0,   decay: 0,   wet: 0    },
  stage:     { label: 'Live Stage',  duration: 1.8, decay: 2.5, wet: 0.28 },
  plate:     { label: 'Plate Verb',  duration: 2.4, decay: 2.0, wet: 0.35 },
  cathedral: { label: 'Cathedral',   duration: 4.5, decay: 1.2, wet: 0.52 },
}

// Builds a synthetic stereo impulse response for ConvolverNode
function createIR(ctx, duration, decay) {
  const len = Math.ceil(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(Math.max(1 - i / len, 0), decay)
    }
  }
  return buf
}

// ── Static waveform painter (used when track is idle) ─────────────────────────
function drawStatic(canvas, buffer, color) {
  if (!canvas) return
  const W = 600, H = 52
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#07070d'
  ctx.fillRect(0, 0, W, H)

  if (!buffer) {
    // Decorative placeholder — compound sine bars at low opacity
    const barW = 2, gap = 1
    for (let x = 0; x < W; x += barW + gap) {
      const t = x / W
      const amp =
        Math.abs(Math.sin(t * Math.PI * 13 + 0.5)) * 0.55 +
        Math.abs(Math.sin(t * Math.PI * 31 + 1.1)) * 0.28 +
        Math.abs(Math.sin(t * Math.PI * 7  + 2.3)) * 0.17
      const h = amp * H * 0.88
      ctx.globalAlpha = 0.18
      ctx.fillStyle = color
      ctx.fillRect(x, (H - h) / 2, barW, h)
    }
    // Hairline center guide
    ctx.globalAlpha = 0.07
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()
    ctx.globalAlpha = 1
    return
  }

  const data = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / W))
  ctx.strokeStyle = color + 'bb'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < W; x++) {
    let mn = 1, mx = -1
    for (let s = 0; s < step; s++) {
      const v = data[Math.min(x * step + s, data.length - 1)]
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    ctx.moveTo(x, ((1 - mx) / 2) * H)
    ctx.lineTo(x, ((1 - mn) / 2) * H)
  }
  ctx.stroke()
}

// ── Live waveform / oscilloscope ──────────────────────────────────────────────
// When `active` is true and analyserRef has a node, renders a live oscilloscope.
// Falls back to drawing the static buffer waveform when idle.
function LiveWaveform({ active, analyserRef, buffer, color }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!active || !analyserRef?.current) {
      drawStatic(canvas, buffer, color)
      return
    }

    const analyser = analyserRef.current
    analyser.fftSize = 2048
    const W = 600, H = 52
    canvas.width = W
    canvas.height = H
    const timeData = new Uint8Array(analyser.frequencyBinCount)
    let rafId

    const draw = () => {
      analyser.getByteTimeDomainData(timeData)
      const ctx2d = canvas.getContext('2d')
      ctx2d.fillStyle = '#07070d'
      ctx2d.fillRect(0, 0, W, H)
      ctx2d.strokeStyle = color
      ctx2d.lineWidth = 1.5
      ctx2d.beginPath()
      const sliceW = W / timeData.length
      for (let i = 0; i < timeData.length; i++) {
        const y = ((timeData[i] / 128) - 1) * -(H / 2) + H / 2
        if (i === 0) ctx2d.moveTo(0, y); else ctx2d.lineTo(i * sliceW, y)
      }
      ctx2d.stroke()
      rafId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafId)
  }, [active, buffer, color]) // analyserRef is a ref — stable, no dep needed

  return (
    <canvas
      ref={canvasRef}
      width={600} height={52}
      style={{ width: '100%', height: 52, display: 'block', borderRadius: 8 }}
    />
  )
}

// ── VU meter ──────────────────────────────────────────────────────────────────
function VU({ level, color }) {
  const n = 14
  const active = Math.round(Math.min(level, 1) * n)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{
          width: 4,
          height: `${45 + (i / n) * 55}%`,
          borderRadius: 2,
          background: i < active
            ? (i >= n * 0.8 ? '#ef4444' : i >= n * 0.6 ? '#f59e0b' : color)
            : '#1a1a2e',
          transition: 'background 60ms',
        }} />
      ))}
    </div>
  )
}

// ── Small toggle / action button ──────────────────────────────────────────────
function IconBtn({ active, activeColor, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        background: active ? activeColor : '#1a1a2e',
        color: active ? '#fff' : '#6b7280',
        transition: 'all 0.15s',
      }}>
      {children}
    </button>
  )
}

// ── RMS of Uint8Array analyser output (centered at 128) ───────────────────────
function calcRMSUint8(data) {
  let s = 0
  for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v }
  return Math.sqrt(s / data.length)
}

// ── Beat / transient detection ────────────────────────────────────────────────
// Returns [{ms, strength}] sorted by time. Uses frame-energy RMS differences
// to find onset peaks above an adaptive threshold.
function detectTransients(buffer, frameSize = 1024, hop = 512) {
  const data  = buffer.getChannelData(0)
  const sr    = buffer.sampleRate
  const peaks = []

  // Compute RMS energy for every hop
  const energies = []
  for (let offset = 0; offset + frameSize <= data.length; offset += hop) {
    let s = 0
    for (let i = 0; i < frameSize; i++) { const v = data[offset + i]; s += v * v }
    energies.push(Math.sqrt(s / frameSize))
  }

  // Onset strength = positive first-difference of energy
  const strength = energies.map((e, i) => i === 0 ? 0 : Math.max(0, e - energies[i - 1]))

  // Adaptive threshold: 75th-percentile × 1.5
  const sorted    = [...strength].sort((a, b) => a - b)
  const threshold = sorted[Math.floor(sorted.length * 0.75)] * 1.5

  const minGapFrames = Math.ceil((sr * 0.15) / hop) // 150 ms minimum gap
  let lastPeak = -minGapFrames

  for (let i = 1; i < strength.length - 1; i++) {
    if (strength[i] > threshold && strength[i] >= strength[i - 1] && strength[i] >= strength[i + 1] && i - lastPeak >= minGapFrames) {
      peaks.push({ ms: Math.round((i * hop / sr) * 1000), strength: strength[i] })
      lastPeak = i
    }
  }
  return peaks
}

// Aligns vocal's strongest early transient to the backing's first transient.
// Returns { offset: number (ms, positive = vocal delayed), bpm: number|null }
function computeBeatOffset(vocalBuffer, backingBuffer) {
  const vPeaks = detectTransients(vocalBuffer)
  const bPeaks = detectTransients(backingBuffer)

  if (!vPeaks.length || !bPeaks.length) return { offset: 0, bpm: null }

  const vFirst = vPeaks[0].ms
  const bFirst = bPeaks[0].ms
  const offset = bFirst - vFirst   // positive = vocal needs to be delayed

  let bpm = null
  if (bPeaks.length >= 2) {
    const gaps   = bPeaks.slice(1).map((p, i) => p.ms - bPeaks[i].ms)
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    bpm = avgGap > 0 ? Math.round(60000 / avgGap) : null
  }

  return { offset, bpm }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VocalStudioComp({ props: p }) {
  const accentColor = p.accentColor || '#00ff88'
  const bgColor     = p.bgColor     || '#07070d'

  // ── Audio refs ──────────────────────────────────────────────────────────────
  const audioCtxRef    = useRef(null)
  const mediaRecRef    = useRef(null)
  const chunksRef      = useRef([])
  const srcNodesRef    = useRef([])   // active AudioBufferSourceNodes
  const rafRef         = useRef(null) // VU animation frame
  const vocalAnlRef    = useRef(null) // vocal analyser (mic or playback)
  const backingAnlRef  = useRef(null) // backing analyser (playback only)

  // ── Buffers ─────────────────────────────────────────────────────────────────
  const [vocalBuf,     setVocalBuf]     = useState(null)
  const [backingBuf,   setBackingBuf]   = useState(null)
  const [processedBuf, setProcessedBuf] = useState(null)

  // ── Transport state ──────────────────────────────────────────────────────────
  const [isRecording,  setIsRecording]  = useState(false)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress,     setProgress]     = useState(0)

  // ── Auto-tune settings ───────────────────────────────────────────────────────
  const [scale,     setScale]     = useState(p.defaultKey || 'C Major')
  const [intensity, setIntensity] = useState(p.defaultIntensity ?? 50)

  // ── Mixer ────────────────────────────────────────────────────────────────────
  const [vocalGain,    setVocalGain]    = useState(0.8)
  const [backingGain,  setBackingGain]  = useState(0.6)
  const [vocalMuted,   setVocalMuted]   = useState(false)
  const [backingMuted, setBackingMuted] = useState(false)
  const [vocalSolo,    setVocalSolo]    = useState(false)
  const [backingSolo,  setBackingSolo]  = useState(false)

  // ── Feature 1: Studio Enhance ────────────────────────────────────────────────
  const [enhanceOn, setEnhanceOn] = useState(false)

  // ── Feature 2: Vocal offset (beat-matching) ──────────────────────────────────
  const [vocalOffset, setVocalOffset] = useState(0) // ms, -1000 to +1000

  // ── Feature 3: Smart Reverb ──────────────────────────────────────────────────
  const [reverbPreset, setReverbPreset] = useState('dry')

  // ── Feature 4: Beat sync ──────────────────────────────────────────────────────
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [beatInfo,    setBeatInfo]    = useState(null) // { offset, bpm }

  const syncToBeat = useCallback(async () => {
    if (!vocalBuf || !backingBuf || isSyncing) return
    setIsSyncing(true)
    try {
      const result = computeBeatOffset(vocalBuf, backingBuf)
      // Clamp to the slider range [-1000, +1000] ms
      const clamped = Math.max(-1000, Math.min(1000, result.offset))
      setVocalOffset(clamped)
      setBeatInfo({ offset: clamped, bpm: result.bpm })
    } finally {
      setIsSyncing(false)
    }
  }, [vocalBuf, backingBuf, isSyncing])

  // ── Live meters / pitch ──────────────────────────────────────────────────────
  const [vuVocal,   setVuVocal]   = useState(0)
  const [vuBacking, setVuBacking] = useState(0)
  const [pitchNote, setPitchNote] = useState(null)

  // ── Lazy AudioContext ─────────────────────────────────────────────────────────
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    srcNodesRef.current.forEach(n => { try { n.stop() } catch {} })
    audioCtxRef.current?.close()
  }, [])

  // ── Decode helper ─────────────────────────────────────────────────────────────
  const decode = useCallback(async (ab) => {
    return getCtx().decodeAudioData(ab)
  }, [getCtx])

  // ── File uploads ─────────────────────────────────────────────────────────────
  const uploadVocal = useCallback(() => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return
      setVocalBuf(await decode(await file.arrayBuffer()))
      setProcessedBuf(null)
    }
    el.click()
  }, [decode])

  const uploadBacking = useCallback(() => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return
      setBackingBuf(await decode(await file.arrayBuffer()))
    }
    el.click()
  }, [decode])

  // ── Recording ─────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    let stream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) }
    catch { alert('Microphone access denied. Please allow mic access and try again.'); return }

    const ctx      = getCtx()
    const micSrc   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    micSrc.connect(analyser)
    vocalAnlRef.current = analyser // live waveform during recording

    const floatBuf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(floatBuf)
      setVuVocal(Math.min(calcRMS(floatBuf) * 5, 1))
      const freq = detectPitch(floatBuf, ctx.sampleRate)
      setPitchNote(freq ? midiToName(freqToMidi(freq)) : null)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    chunksRef.current = []
    const mr = new MediaRecorder(stream)
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      cancelAnimationFrame(rafRef.current)
      stream.getTracks().forEach(t => t.stop())
      vocalAnlRef.current = null
      setVuVocal(0); setPitchNote(null); setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setVocalBuf(await decode(await blob.arrayBuffer()))
      setProcessedBuf(null)
    }
    mr.start()
    mediaRecRef.current = mr
    setIsRecording(true)
  }, [getCtx, decode])

  const stopRecording = useCallback(() => { mediaRecRef.current?.stop() }, [])

  // ── Auto-tune ─────────────────────────────────────────────────────────────────
  const applyAutoTune = useCallback(async () => {
    if (!vocalBuf || isProcessing) return
    const ctx = getCtx()
    setIsProcessing(true); setProgress(0)
    try {
      const out = await processAutoTune(vocalBuf, ctx, SCALES[scale], intensity, pct => setProgress(pct))
      setProcessedBuf(out)
    } catch (err) { console.error('Auto-tune failed:', err) }
    setIsProcessing(false)
  }, [vocalBuf, isProcessing, getCtx, scale, intensity])

  // ── Stop playback ─────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    srcNodesRef.current.forEach(n => { try { n.stop() } catch {} })
    srcNodesRef.current = []
    cancelAnimationFrame(rafRef.current)
    vocalAnlRef.current   = null
    backingAnlRef.current = null
    setIsPlaying(false); setVuVocal(0); setVuBacking(0)
  }, [])

  // ── Play mix — full signal chain ──────────────────────────────────────────────
  const playMix = useCallback(() => {
    if (isPlaying) { stopPlayback(); return }

    const ctx         = getCtx()
    const dispVocal   = processedBuf || vocalBuf
    const hasBoth     = !!(dispVocal && backingBuf)
    const totalTracks = [dispVocal, backingBuf].filter(Boolean).length
    if (totalTracks === 0) return

    const masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)

    // Beat-match offset: positive = vocal starts late; negative = backing starts late
    const vocalDelay   = Math.max(0,  vocalOffset) / 1000
    const backingDelay = Math.max(0, -vocalOffset) / 1000

    let endedCount = 0
    const onEnded = () => {
      if (++endedCount >= totalTracks) {
        cancelAnimationFrame(rafRef.current)
        vocalAnlRef.current   = null
        backingAnlRef.current = null
        setIsPlaying(false); setVuVocal(0); setVuBacking(0)
      }
    }

    // Builds the audio graph for one track and returns its post-effects AnalyserNode.
    const buildTrack = (buf, gainVal, muted, solo, otherSolo, startDelay, isVocal) => {
      if (!buf) return null

      const effective = muted || (hasBoth && otherSolo && !solo) ? 0 : gainVal
      const src  = ctx.createBufferSource()
      const gain = ctx.createGain()
      src.buffer = buf; gain.gain.value = effective
      src.connect(gain)
      let last = gain

      if (isVocal) {
        // ── Feature 1: Studio Enhance chain ────────────────────────────────
        // High-pass at 80 Hz (cuts mic rumble), high-shelf boost at 5 kHz (presence),
        // then a gentle compressor to even out dynamics.
        if (enhanceOn) {
          const hpf = ctx.createBiquadFilter()
          hpf.type = 'highpass'; hpf.frequency.value = 80; hpf.Q.value = 0.707

          const hshelf = ctx.createBiquadFilter()
          hshelf.type = 'highshelf'; hshelf.frequency.value = 5000; hshelf.gain.value = 3.5

          const comp = ctx.createDynamicsCompressor()
          comp.threshold.value = -18; comp.knee.value = 8
          comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15

          last.connect(hpf); hpf.connect(hshelf); hshelf.connect(comp)
          last = comp
        }

        // ── Feature 3: Smart Reverb (ConvolverNode wet/dry mix) ────────────
        // Both dry and wet paths connect to the same AnalyserNode — WebAudio
        // automatically sums multiple inputs, giving us a simple mix bus.
        const preset = REVERB_PRESETS[reverbPreset]
        if (preset && preset.wet > 0) {
          const convolver = ctx.createConvolver()
          convolver.buffer = createIR(ctx, preset.duration, preset.decay)

          const dryGain = ctx.createGain(); dryGain.gain.value = 1 - preset.wet
          const wetGain = ctx.createGain(); wetGain.gain.value = preset.wet

          const anl = ctx.createAnalyser(); anl.fftSize = 2048
          last.connect(dryGain);   dryGain.connect(anl)   // dry path
          last.connect(convolver); convolver.connect(wetGain); wetGain.connect(anl) // wet path
          anl.connect(masterGain)

          src.onended = onEnded
          src.start(ctx.currentTime + startDelay)
          srcNodesRef.current.push(src)
          return anl
        }
      }

      // Default path (no reverb, or backing track)
      const anl = ctx.createAnalyser(); anl.fftSize = 2048
      last.connect(anl); anl.connect(masterGain)
      src.onended = onEnded
      src.start(ctx.currentTime + startDelay)
      srcNodesRef.current.push(src)
      return anl
    }

    // ── Feature 2: Beat-matching offset applied via start-time delay ────────
    const vAnl = buildTrack(dispVocal,  vocalGain,   vocalMuted,   vocalSolo,   backingSolo, vocalDelay,   true)
    const bAnl = buildTrack(backingBuf, backingGain, backingMuted, backingSolo, vocalSolo,  backingDelay, false)

    vocalAnlRef.current   = vAnl
    backingAnlRef.current = bAnl
    setIsPlaying(true)

    // VU meter animation (separate from LiveWaveform's own RAF loops)
    const vBuf = vAnl ? new Uint8Array(vAnl.frequencyBinCount) : null
    const bBuf = bAnl ? new Uint8Array(bAnl.frequencyBinCount) : null
    const tickVU = () => {
      if (vAnl && vBuf) { vAnl.getByteTimeDomainData(vBuf); setVuVocal(Math.min(calcRMSUint8(vBuf) * 4, 1)) }
      if (bAnl && bBuf) { bAnl.getByteTimeDomainData(bBuf); setVuBacking(Math.min(calcRMSUint8(bBuf) * 4, 1)) }
      rafRef.current = requestAnimationFrame(tickVU)
    }
    tickVU()
  }, [
    isPlaying, stopPlayback, getCtx,
    processedBuf, vocalBuf, backingBuf,
    vocalGain, backingGain, vocalMuted, backingMuted, vocalSolo, backingSolo,
    vocalOffset, enhanceOn, reverbPreset,
  ])

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    await mixAndDownload({
      vocalBuffer:   processedBuf || vocalBuf,
      backingBuffer: backingBuf,
      vocalGain:     vocalMuted   ? 0 : vocalGain,
      backingGain:   backingMuted ? 0 : backingGain,
    })
  }, [processedBuf, vocalBuf, backingBuf, vocalGain, vocalMuted, backingGain, backingMuted])

  // ── Derived ───────────────────────────────────────────────────────────────────
  const displayVocal  = processedBuf || vocalBuf
  const hasVocal      = !!vocalBuf
  const hasAudio      = hasVocal || !!backingBuf
  const isAutoTuned   = !!processedBuf
  const vocalActive   = isRecording || isPlaying
  const backingActive = isPlaying

  const panel = { background: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 12, padding: '1rem' }
  const label = { fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }

  return (
    <div style={{ background: bgColor, padding: '4rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: accentColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={20} style={{ color: accentColor }} />
          </div>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>
              {p.title || 'Vocal Studio'}
            </h2>
            <p style={{ color: '#475569', fontSize: '0.68rem', margin: '2px 0 0' }}>
              Recording · Auto-Tune · Studio Enhance · Smart Reverb · Beat-Match
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.56rem', fontWeight: 600, letterSpacing: '0.06em', color: '#1e3a2f' }}>
              Powered by{' '}
              <span style={{ color: accentColor + 'aa', fontWeight: 700 }}>ZaraForge Engine</span>
            </p>
          </div>
          {pitchNote && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, background: accentColor + '18', border: `1px solid ${accentColor}44` }}>
              <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Live pitch</span>
              <span style={{ color: accentColor, fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{pitchNote}</span>
            </div>
          )}
        </div>

        {/* ── Row 1: Auto-tune key + intensity ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={panel}>
            <div style={{ ...label, marginBottom: 8 }}>Key / Scale</div>
            <select
              value={scale}
              onChange={e => setScale(e.target.value)}
              style={{ width: '100%', background: 'transparent', color: accentColor, fontSize: '0.875rem', fontWeight: 600, border: 'none', outline: 'none', cursor: 'pointer' }}>
              {SCALE_NAMES.map(s => <option key={s} value={s} style={{ background: '#1a1a2e', color: '#fff' }}>{s}</option>)}
            </select>
          </div>

          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={label}>Auto-Tune Intensity</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: accentColor }}>{intensity}%</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={intensity}
              onChange={e => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor, height: 4, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.58rem', color: '#374151' }}>Natural</span>
              <span style={{ fontSize: '0.58rem', color: intensity >= 85 ? accentColor : '#374151' }}>
                {intensity >= 85 ? '🤖 T-Pain!' : intensity >= 60 ? 'Strong' : intensity >= 30 ? 'Moderate' : 'Subtle'}
              </span>
              <span style={{ fontSize: '0.58rem', color: '#374151' }}>Robot</span>
            </div>
          </div>
        </div>

        {/* ── Row 2: Studio Enhance + Smart Reverb (Feature 1 & 3) ─────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

          {/* Feature 1 — Studio Enhance */}
          <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...label, display: 'block', marginBottom: 2 }}>Studio Enhance</div>
                <span style={{ fontSize: '0.62rem', color: '#374151', lineHeight: 1.4 }}>
                  HPF 80 Hz · HShelf +3.5 dB · Compressor
                </span>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => setEnhanceOn(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: enhanceOn ? accentColor : '#1a1a2e',
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}>
                <span style={{
                  position: 'absolute', top: 3, left: enhanceOn ? 22 : 4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: enhanceOn ? '#000' : '#374151', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'HPF', tip: 'High-pass @ 80 Hz', color: '#60a5fa' },
                { key: 'EQ',  tip: '+3.5 dB @ 5 kHz',  color: '#a78bfa' },
                { key: 'CMP', tip: '4:1 compression',   color: '#34d399' },
              ].map(({ key, tip, color }) => (
                <div key={key} title={tip} style={{
                  flex: 1, padding: '4px 0', borderRadius: 6, textAlign: 'center',
                  fontSize: '0.6rem', fontWeight: 700,
                  background: enhanceOn ? color + '22' : '#111118',
                  color: enhanceOn ? color : '#374151',
                  border: `1px solid ${enhanceOn ? color + '44' : '#1a1a2e'}`,
                  transition: 'all 0.2s',
                }}>
                  {key}
                </div>
              ))}
            </div>
          </div>

          {/* Feature 3 — Smart Reverb */}
          <div style={panel}>
            <div style={{ ...label, marginBottom: 8 }}>Studio Space (Smart Reverb)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {Object.entries(REVERB_PRESETS).map(([key, { label: lbl, wet }]) => (
                <button
                  key={key}
                  onClick={() => setReverbPreset(key)}
                  style={{
                    padding: '7px 6px', borderRadius: 8, cursor: 'pointer',
                    fontSize: '0.65rem', fontWeight: 700, textAlign: 'center',
                    background: reverbPreset === key ? accentColor + '22' : '#111118',
                    color: reverbPreset === key ? accentColor : '#6b7280',
                    border: `1px solid ${reverbPreset === key ? accentColor + '55' : '#1a1a2e'}`,
                    transition: 'all 0.15s',
                  }}>
                  {lbl}
                  {wet > 0 && <div style={{ fontSize: '0.55rem', fontWeight: 400, marginTop: 1, opacity: 0.7 }}>{Math.round(wet * 100)}% wet</div>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Vocal track ───────────────────────────────────────────────────── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Mic size={13} style={{ color: accentColor }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d1d5db' }}>Vocal Track</span>
            {isAutoTuned && (
              <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}44` }}>AUTO-TUNED</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <VU level={vocalActive && !vocalMuted ? vuVocal : 0} color={accentColor} />
              <IconBtn active={vocalMuted}  activeColor="#ef4444"    onClick={() => setVocalMuted(m => !m)}  title="Mute">M</IconBtn>
              <IconBtn active={vocalSolo}   activeColor={accentColor} onClick={() => setVocalSolo(s => !s)}   title="Solo">S</IconBtn>
            </div>
          </div>

          {/* Feature 2: live oscilloscope waveform during recording & playback */}
          <LiveWaveform active={vocalActive} analyserRef={vocalAnlRef} buffer={displayVocal} color={accentColor} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Volume2 size={11} style={{ color: '#374151', flexShrink: 0 }} />
            <input type="range" min={0} max={1} step={0.01} value={vocalGain}
              onChange={e => setVocalGain(+e.target.value)}
              style={{ flex: 1, accentColor, height: 4, cursor: 'pointer' }} />
            <span style={{ fontSize: '0.6rem', color: '#6b7280', width: 28, textAlign: 'right' }}>{Math.round(vocalGain * 100)}%</span>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isPlaying}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700,
                background: isRecording ? '#dc2626' : accentColor,
                color: isRecording ? '#fff' : '#000',
                opacity: (isProcessing || isPlaying) ? 0.35 : 1,
              }}>
              {isRecording ? <><MicOff size={11} /> Stop</> : <><Mic size={11} /> Record</>}
            </button>
            <button
              onClick={uploadVocal}
              disabled={isRecording || isProcessing}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 600,
                background: '#1f2937', color: '#d1d5db',
                opacity: (isRecording || isProcessing) ? 0.35 : 1,
              }}>
              <Upload size={11} /> Upload
            </button>
          </div>
        </div>

        {/* ── Backing track ─────────────────────────────────────────────────── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Music size={13} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d1d5db' }}>Backing Track</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <VU level={backingActive && !backingMuted ? vuBacking : 0} color="#a78bfa" />
              <IconBtn active={backingMuted} activeColor="#ef4444" onClick={() => setBackingMuted(m => !m)} title="Mute">M</IconBtn>
              <IconBtn active={backingSolo}  activeColor="#a78bfa" onClick={() => setBackingSolo(s => !s)}  title="Solo">S</IconBtn>
            </div>
          </div>

          <LiveWaveform active={backingActive} analyserRef={backingAnlRef} buffer={backingBuf} color="#a78bfa" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Volume2 size={11} style={{ color: '#374151', flexShrink: 0 }} />
            <input type="range" min={0} max={1} step={0.01} value={backingGain}
              onChange={e => setBackingGain(+e.target.value)}
              style={{ flex: 1, accentColor: '#a78bfa', height: 4, cursor: 'pointer' }} />
            <span style={{ fontSize: '0.6rem', color: '#6b7280', width: 28, textAlign: 'right' }}>{Math.round(backingGain * 100)}%</span>
            <button
              onClick={uploadBacking}
              disabled={isRecording}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 600,
                background: '#1f2937', color: '#d1d5db',
                opacity: isRecording ? 0.35 : 1,
              }}>
              <Upload size={11} /> Upload
            </button>
          </div>
        </div>

        {/* ── Feature 2 + 4: Vocal offset / beat-match slider + auto sync ──── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <span style={label}>Vocal Delay / Beat-Match Offset</span>
              <span style={{ fontSize: '0.62rem', color: '#374151', marginLeft: 8 }}>
                {vocalOffset === 0 ? 'In sync' : vocalOffset > 0 ? `Vocal +${vocalOffset}ms (delayed)` : `Vocal ${vocalOffset}ms (early)`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace', color: vocalOffset === 0 ? '#374151' : accentColor }}>
                {vocalOffset > 0 ? '+' : ''}{vocalOffset} ms
              </span>
              {vocalOffset !== 0 && (
                <button
                  onClick={() => { setVocalOffset(0); setBeatInfo(null) }}
                  style={{ fontSize: '0.6rem', padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#1a1a2e', color: '#6b7280' }}>
                  Reset
                </button>
              )}
            </div>
          </div>
          <input
            type="range" min={-1000} max={1000} step={10} value={vocalOffset}
            onChange={e => { setVocalOffset(Number(e.target.value)); setBeatInfo(null) }}
            style={{ width: '100%', accentColor, height: 4, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.58rem', color: '#374151' }}>← Vocal early (−1s)</span>
            <span style={{ fontSize: '0.58rem', color: '#475569' }}>⟵ drag to sync ⟶</span>
            <span style={{ fontSize: '0.58rem', color: '#374151' }}>Vocal late (+1s) →</span>
          </div>

          {/* Feature 4 — Vibe Voice Beat Detector */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={syncToBeat}
              disabled={!vocalBuf || !backingBuf || isSyncing || isPlaying || isRecording}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700,
                background: (!vocalBuf || !backingBuf) ? '#1a1a2e' : accentColor + '22',
                color: (!vocalBuf || !backingBuf) ? '#374151' : accentColor,
                outline: `1px solid ${(!vocalBuf || !backingBuf) ? '#1a1a2e' : accentColor + '55'}`,
                opacity: (isSyncing || isPlaying || isRecording) ? 0.5 : 1,
                transition: 'all 0.15s',
              }}>
              {isSyncing
                ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Detecting…</>
                : <>⚡ Sync Voice to Beat</>}
            </button>

            {!vocalBuf || !backingBuf ? (
              <span style={{ fontSize: '0.6rem', color: '#374151' }}>
                Requires both vocal + backing tracks to be loaded
              </span>
            ) : beatInfo ? (
              <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                First transient at <span style={{ color: accentColor, fontWeight: 700 }}>{beatInfo.offset > 0 ? '+' : ''}{beatInfo.offset}ms</span>
                {beatInfo.bpm && <> · Detected ~<span style={{ color: '#a78bfa', fontWeight: 700 }}>{beatInfo.bpm} BPM</span></>}
              </span>
            ) : (
              <span style={{ fontSize: '0.6rem', color: '#374151' }}>
                Analyzes transients to auto-snap vocal to first beat
              </span>
            )}
          </div>
        </div>

        {/* ── Processing progress bar ────────────────────────────────────────── */}
        {isProcessing && (
          <div style={{ ...panel, border: `1px solid ${accentColor}44` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Loader2 size={13} style={{ color: accentColor, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.75rem', color: '#d1d5db' }}>Applying auto-tune frame by frame…</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: accentColor }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: '#1a1a2e', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: accentColor, borderRadius: 999, transition: 'width 100ms linear' }} />
            </div>
          </div>
        )}

        {/* ── Transport ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={applyAutoTune}
            disabled={!hasVocal || isProcessing || isRecording || isPlaying}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              background: accentColor, color: '#000',
              opacity: (!hasVocal || isProcessing || isRecording || isPlaying) ? 0.3 : 1,
            }}>
            <Zap size={13} />
            {isProcessing ? 'Processing…' : 'Apply Auto-Tune'}
          </button>

          <button
            onClick={playMix}
            disabled={!hasAudio || isRecording || isProcessing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              background: isPlaying ? '#374151' : '#1f2937', color: '#fff',
              opacity: (!hasAudio || isRecording || isProcessing) ? 0.3 : 1,
              outline: isPlaying ? `2px solid ${accentColor}66` : 'none',
            }}>
            {isPlaying ? <><Square size={13} /> Stop</> : <><Play size={13} /> Play Mix</>}
          </button>

          {/* Active effects badges */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {enhanceOn && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: '#60a5fa22', color: '#60a5fa', border: '1px solid #60a5fa44' }}>✦ Enhance</span>}
            {reverbPreset !== 'dry' && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: '#a78bfa22', color: '#a78bfa', border: '1px solid #a78bfa44' }}>✦ {REVERB_PRESETS[reverbPreset].label}</span>}
            {vocalOffset !== 0 && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}44` }}>✦ {vocalOffset > 0 ? '+' : ''}{vocalOffset}ms</span>}
          </div>

          <button
            onClick={handleExport}
            disabled={!hasAudio || isRecording || isProcessing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              background: '#059669', color: '#fff', marginLeft: 'auto',
              opacity: (!hasAudio || isRecording || isProcessing) ? 0.3 : 1,
            }}>
            <Download size={13} />
            Render &amp; Download WAV
          </button>
        </div>

        {!hasAudio && !isRecording && (
          <p style={{ fontSize: '0.7rem', color: '#374151', textAlign: 'center', margin: 0 }}>
            Record vocals with your microphone or upload audio files to get started.
          </p>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
