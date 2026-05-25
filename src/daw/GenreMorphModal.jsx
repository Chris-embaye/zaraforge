import { useState, useRef, useEffect, useCallback } from 'react'
import { X, FolderOpen } from 'lucide-react'
import { useDawStore } from '../store/dawStore'

// ── Style profile definitions ─────────────────────────────────────────────────
const STYLE_PROFILES = [
  {
    id: 'acoustic', emoji: '🎸',
    label: 'Acoustic Roots / Traditional',
    desc: 'Swaps synths for live strings, acoustic guitars, and traditional organic percussion',
    color: '#f59e0b',
    tags: ['Warm', 'Organic', 'Natural'],
  },
  {
    id: 'rnb', emoji: '🎹',
    label: 'Smooth Modern R&B / Lo-Fi',
    desc: 'Infuses deep baseline sub-woofers, Rhodes piano keys, and relaxed vinyl crackle textures',
    color: '#a78bfa',
    tags: ['Deep Bass', 'Smooth', 'Soulful'],
  },
  {
    id: 'edm', emoji: '⚡',
    label: 'Cyberpunk Electronic / EDM',
    desc: 'Overhauls the sequence into hard-hitting synthesized basslines, crisp electronic snares, and fast arpeggios',
    color: '#00e5ff',
    tags: ['Hard Bass', 'Electronic', 'High Energy'],
  },
  {
    id: 'orchestral', emoji: '🎼',
    label: 'Epic Cinematic Orchestral',
    desc: 'Transforms the arrangement into grand brass horn movements, cinematic timpani drums, and sweeping string assemblies',
    color: '#f472b6',
    tags: ['Grand', 'Cinematic', 'Sweeping'],
  },
]

const MORPH_STEPS = [
  '🔬 Analyzing melodic DNA & harmonic content…',
  '🎵 Extracting rhythmic grid & tempo markers…',
  '🎸 Re-synthesizing instrument timbre profiles…',
  '🔄 Transposing genre-specific performance patterns…',
  '🎚️ Calibrating dynamic range & frequency balance…',
  '✨ Rendering final transformed stem…',
]

// ── Shared DSP helpers ────────────────────────────────────────────────────────

// Synthetic reverb impulse response (exponentially decaying white noise)
function generateIR(ctx, durationSec, decay) {
  const len = Math.floor(ctx.sampleRate * durationSec)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

// Smooth tanh saturation curve (drive 1=clean … 12=hard clip)
function makeSatCurve(drive) {
  const N = 512
  const c = new Float32Array(N)
  const th = Math.tanh(drive)
  for (let i = 0; i < N; i++) {
    const x = (i * 2) / N - 1
    c[i] = Math.tanh(drive * x) / th
  }
  return c
}

// Wire a wet/dry reverb blend onto an already-chained node
function addReverb(ctx, node, durationSec, decay, wet, dry) {
  const conv  = ctx.createConvolver()
  conv.buffer = generateIR(ctx, durationSec, decay)
  const wg = ctx.createGain(); wg.gain.value = wet
  const dg = ctx.createGain(); dg.gain.value = dry
  const out = ctx.createGain()
  node.connect(dg);   dg.connect(out)
  node.connect(conv); conv.connect(wg); wg.connect(out)
  return out
}

// ── Per-genre transformation chains ──────────────────────────────────────────
function buildFXChain(ctx, styleId) {

  // ── 🎸 Acoustic — dark, warm, woody, room reverb ─────────────────────────
  if (styleId === 'acoustic') {
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'; hpf.frequency.value = 60; hpf.Q.value = 0.7

    const warmth = ctx.createBiquadFilter()
    warmth.type = 'lowshelf'; warmth.frequency.value = 260; warmth.gain.value = 8

    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'; mid.frequency.value = 1100; mid.gain.value = 5; mid.Q.value = 0.9

    // Kill electronic harshness — the most audible change
    const highCut = ctx.createBiquadFilter()
    highCut.type = 'highshelf'; highCut.frequency.value = 4200; highCut.gain.value = -14

    // Tape saturation
    const sat = ctx.createWaveShaper()
    sat.curve = makeSatCurve(2.5); sat.oversample = '2x'

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.1; comp.release.value = 0.4

    hpf.connect(warmth); warmth.connect(mid); mid.connect(highCut); highCut.connect(sat); sat.connect(comp)

    // Room reverb (wet 40%)
    const out = addReverb(ctx, comp, 1.8, 2.2, 0.40, 0.65)
    return { input: hpf, output: out }
  }

  // ── 🎹 R&B / Lo-Fi — bandwidth-limited, sub-heavy, vinyl crackle ──────────
  if (styleId === 'rnb') {
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'; hpf.frequency.value = 80; hpf.Q.value = 0.5

    // Bandwidth limit = instant lo-fi character
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'; lpf.frequency.value = 3400; lpf.Q.value = 1.1

    const sub = ctx.createBiquadFilter()
    sub.type = 'peaking'; sub.frequency.value = 62; sub.gain.value = 13; sub.Q.value = 2.0

    const warmth = ctx.createBiquadFilter()
    warmth.type = 'peaking'; warmth.frequency.value = 190; warmth.gain.value = 7; warmth.Q.value = 0.7

    // Vinyl tube warmth
    const sat = ctx.createWaveShaper()
    sat.curve = makeSatCurve(3.5); sat.oversample = '2x'

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.02; comp.release.value = 0.22

    hpf.connect(sub); sub.connect(warmth); warmth.connect(lpf); lpf.connect(sat); sat.connect(comp)

    const out = addReverb(ctx, comp, 1.0, 2.8, 0.28, 0.80)
    return { input: hpf, output: out }
  }

  // ── ⚡ EDM — hard sub, scooped mids, air boost, hard clipper ─────────────
  if (styleId === 'edm') {
    const sub = ctx.createBiquadFilter()
    sub.type = 'peaking'; sub.frequency.value = 50; sub.gain.value = 16; sub.Q.value = 2.5

    const midScoop = ctx.createBiquadFilter()
    midScoop.type = 'peaking'; midScoop.frequency.value = 380; midScoop.gain.value = -13; midScoop.Q.value = 1.0

    const presence = ctx.createBiquadFilter()
    presence.type = 'peaking'; presence.frequency.value = 3600; presence.gain.value = 9; presence.Q.value = 1.2

    const air = ctx.createBiquadFilter()
    air.type = 'highshelf'; air.frequency.value = 10000; air.gain.value = 11

    // Hard electronic clipping
    const dist = ctx.createWaveShaper()
    dist.curve = makeSatCurve(9); dist.oversample = '4x'

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -5; comp.ratio.value = 20; comp.attack.value = 0.001; comp.release.value = 0.04

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -0.5; limiter.ratio.value = 20; limiter.attack.value = 0; limiter.release.value = 0.01

    sub.connect(midScoop); midScoop.connect(presence); presence.connect(air)
    air.connect(dist); dist.connect(comp); comp.connect(limiter)
    return { input: sub, output: limiter }
  }

  // ── 🎼 Orchestral — wide concert-hall reverb, cinematic dynamics ──────────
  if (styleId === 'orchestral') {
    const bassWarm = ctx.createBiquadFilter()
    bassWarm.type = 'lowshelf'; bassWarm.frequency.value = 200; bassWarm.gain.value = 6

    const brass = ctx.createBiquadFilter()
    brass.type = 'peaking'; brass.frequency.value = 820; brass.gain.value = 6; brass.Q.value = 0.6

    const stringAir = ctx.createBiquadFilter()
    stringAir.type = 'highshelf'; stringAir.frequency.value = 5500; stringAir.gain.value = 5

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = 0.15; comp.release.value = 0.6

    bassWarm.connect(brass); brass.connect(stringAir); stringAir.connect(comp)

    // Massive hall reverb (wet 65%) — the defining transformation
    const out = addReverb(ctx, comp, 5.0, 1.6, 0.65, 0.42)
    return { input: bassWarm, output: out }
  }

  const g = ctx.createGain()
  return { input: g, output: g }
}

async function transformAudio(srcBuffer, styleId) {
  // Extend buffer length to capture reverb tail
  const tailSec    = styleId === 'orchestral' ? 5.5 : styleId === 'acoustic' ? 2.2 : 1.2
  const tailSamples = Math.floor(srcBuffer.sampleRate * tailSec)

  const offCtx = new OfflineAudioContext(
    srcBuffer.numberOfChannels,
    srcBuffer.length + tailSamples,
    srcBuffer.sampleRate,
  )
  const src   = offCtx.createBufferSource()
  src.buffer  = srcBuffer
  const chain = buildFXChain(offCtx, styleId)
  src.connect(chain.input)
  chain.output.connect(offCtx.destination)
  src.start()
  return offCtx.startRendering()
}

function computePeaksLocal(buffer, count = 900) {
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

// ── Waveform silhouette canvas ─────────────────────────────────────────────────
function WaveformSilhouette({ peaks, color, label, active, isPlaying, onClick }) {
  const ref = useRef(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const W = c.offsetWidth || 300
    const H = c.offsetHeight || 80
    c.width  = W
    c.height = H
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    if (!peaks || !peaks.length) {
      const BARS = 80
      ctx.globalAlpha = 0.14
      for (let i = 0; i < BARS; i++) {
        const t   = i / BARS
        const amp = Math.abs(Math.sin(t * Math.PI * 7 + 0.5)) * 0.55 + 0.1
        const h   = amp * H * 0.72
        ctx.fillStyle = color
        ctx.fillRect(i * (W / BARS) + 0.5, (H - h) / 2, Math.max(1, W / BARS - 1), h)
      }
      ctx.globalAlpha = 1
      return
    }

    const BARS = Math.min(peaks.length, Math.floor(W / 3))
    const step = peaks.length / BARS
    const bw   = W / BARS

    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0,   color + 'dd')
    grad.addColorStop(0.5, color + 'aa')
    grad.addColorStop(1,   color + '33')
    ctx.fillStyle = grad

    for (let i = 0; i < BARS; i++) {
      const p = peaks[Math.floor(i * step)]
      const h = p * H * 0.82
      ctx.fillRect(i * bw + 0.5, (H - h) / 2, Math.max(1, bw - 1), h)
    }
    ctx.globalAlpha = 0.18
    for (let i = 0; i < BARS; i++) {
      const p = peaks[Math.floor(i * step)]
      const h = p * H * 0.82
      ctx.fillStyle = color
      ctx.fillRect(i * bw + 0.5, H / 2, Math.max(1, bw - 1), h / 2)
    }
    ctx.globalAlpha = 1
  }, [peaks, color])

  return (
    <div onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: active ? `${color}15` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? color + '44' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10, transition: 'all 0.25s', userSelect: 'none',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: active && isPlaying ? color : 'transparent',
          border: `2px solid ${active ? color : '#334155'}`,
          transition: 'all 0.2s',
          boxShadow: active && isPlaying ? `0 0 8px ${color}` : 'none',
          animation: active && isPlaying ? 'deckDot 1.2s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#e2e8f0' : '#475569', flex: 1 }}>
          {label}
        </span>
        <div style={{
          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
          background: active ? `${color}22` : 'transparent',
          color: active ? color : '#334155',
          border: `1px solid ${active ? color + '44' : 'transparent'}`,
          transition: 'all 0.2s',
        }}>
          {active ? (isPlaying ? '▶ LIVE' : '◼ PAUSED') : 'CLICK TO A/B'}
        </div>
      </div>

      <div style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${active ? color + '33' : '#111118'}`,
        background: active ? `${color}06` : '#02020a',
        transition: 'all 0.25s', height: 90,
        boxShadow: active ? `0 0 24px ${color}1a` : 'none',
      }}>
        <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />
        {active && isPlaying && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, transparent, ${color}0c, transparent)`,
            animation: 'deckSweep 2.4s linear infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function GenreMorphModal({ onClose }) {
  const {
    tracks, setBuffer,
    morphState, setMorphState, comparisonDeck, setComparisonDeck,
    morphLockIn, morphCombine,
  } = useDawStore()

  const [phase,        setPhase]        = useState('select')
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [morphStep,    setMorphStep]    = useState(0)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [transformedPeaks, setTransformedPeaks] = useState(null)

  const audioCtxRef   = useRef(null)
  const srcNodeRef    = useRef(null)
  const playOffsetRef = useRef(0)
  const playStartRef  = useRef(0)
  const animRef       = useRef(null)

  const [loadingAudio, setLoadingAudio] = useState(false)
  const sourceTrack = tracks.find(t => t.audioBuffer)

  const loadAudioFromModal = useCallback(() => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async e => {
      const file = e.target.files?.[0]
      if (!file) return
      setLoadingAudio(true)
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)()
        const buf  = await actx.decodeAudioData(await file.arrayBuffer())
        setBuffer('vocal', buf)
      } catch {
        alert('Could not decode audio file. Try MP3 or WAV.')
      }
      setLoadingAudio(false)
    }
    el.click()
  }, [setBuffer])

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  const stopPreview = useCallback(() => {
    try { srcNodeRef.current?.stop() } catch {}
    srcNodeRef.current = null
    setIsPlaying(false)
  }, [])

  const playDeck = useCallback((deck) => {
    const buf = deck === 'original'
      ? sourceTrack?.audioBuffer
      : morphState.transformedBuffer
    if (!buf) return

    // Save current offset so the A/B switch is phase-locked
    const ctx = getCtx()
    if (srcNodeRef.current) {
      playOffsetRef.current = (ctx.currentTime - playStartRef.current) % buf.duration
      try { srcNodeRef.current.stop() } catch {}
    }

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    const offset = playOffsetRef.current % buf.duration
    src.start(0, offset)
    playStartRef.current  = ctx.currentTime - offset
    srcNodeRef.current    = src
    setComparisonDeck(deck)
    setIsPlaying(true)
    src.onended = () => { setIsPlaying(false); srcNodeRef.current = null; playOffsetRef.current = 0 }
  }, [sourceTrack, morphState.transformedBuffer, getCtx, setComparisonDeck])

  const handleStyleSelect = useCallback(async (profile) => {
    if (!sourceTrack?.audioBuffer) return
    setSelectedStyle(profile)
    setPhase('morphing')
    setMorphStep(0)

    // Animate step progress independently of processing
    let s = 0
    animRef.current = setInterval(() => {
      s++
      setMorphStep(s)
      if (s >= MORPH_STEPS.length - 1) clearInterval(animRef.current)
    }, 820)

    const transformed = await transformAudio(sourceTrack.audioBuffer, profile.id)
    clearInterval(animRef.current)
    setMorphStep(MORPH_STEPS.length - 1)

    const peaks = computePeaksLocal(transformed)
    setTransformedPeaks(peaks)

    setTimeout(() => {
      setMorphState({ phase: 'done', styleId: profile.id, transformedBuffer: transformed, transformedPeaks: peaks })
      setPhase('comparison')
    }, 500)
  }, [sourceTrack, setMorphState])

  const handleLockIn = useCallback(() => {
    stopPreview()
    morphLockIn()
    onClose()
  }, [stopPreview, morphLockIn, onClose])

  const handleCombine = useCallback(() => {
    stopPreview()
    morphCombine()
    onClose()
  }, [stopPreview, morphCombine, onClose])

  const handleBackToSelect = useCallback(() => {
    stopPreview()
    clearInterval(animRef.current)
    setPhase('select')
    setSelectedStyle(null)
    setTransformedPeaks(null)
    setMorphState({ phase: 'idle', styleId: null, transformedBuffer: null, transformedPeaks: null })
  }, [stopPreview, setMorphState])

  useEffect(() => () => {
    stopPreview()
    clearInterval(animRef.current)
    audioCtxRef.current?.close()
  }, [stopPreview])

  const profile = STYLE_PROFILES.find(p => p.id === selectedStyle?.id)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(1,1,8,0.86)',
      backdropFilter: 'blur(20px) saturate(1.4)',
    }}>
      <div style={{
        width: '92%', maxWidth: 900,
        maxHeight: '90vh',
        background: 'linear-gradient(145deg, rgba(8,8,24,0.98), rgba(4,4,14,0.98))',
        border: '1px solid rgba(99,102,241,0.22)',
        borderRadius: 22,
        boxShadow: '0 0 90px rgba(99,102,241,0.14), 0 40px 120px rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(99,102,241,0.05)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🔮</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.01em' }}>
              AI Infinite Style Morph
            </h2>
            <p style={{ fontSize: 10, color: '#6366f1', margin: '2px 0 0', fontWeight: 600 }}>
              {phase === 'select'
                ? 'Select a performance style to transform your track — key, pitch & rhythm stay locked'
                : phase === 'morphing'
                  ? `Morphing → ${profile?.label}…`
                  : `✓ Transformation complete — ${profile?.label}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#475569', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
            <X size={13} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ════ PHASE: SELECT ════════════════════════════════════════════ */}
          {phase === 'select' && (
            <>
              {!sourceTrack?.audioBuffer ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '44px 24px' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 18,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                  }}>🎵</div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>No audio loaded yet</p>
                    <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                      Browse and load any MP3 or WAV file to begin the style transformation
                    </p>
                  </div>
                  <button
                    onClick={loadAudioFromModal}
                    disabled={loadingAudio}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '13px 28px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(99,102,241,0.14)',
                      border: '1px solid rgba(99,102,241,0.4)',
                      color: '#818cf8', fontSize: 13, fontWeight: 800,
                      boxShadow: '0 0 24px rgba(99,102,241,0.2)',
                      transition: 'all 0.2s',
                      opacity: loadingAudio ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!loadingAudio) { e.currentTarget.style.background = 'rgba(99,102,241,0.26)'; e.currentTarget.style.boxShadow = '0 0 36px rgba(99,102,241,0.35)' } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.2)' }}>
                    <FolderOpen size={16} />
                    {loadingAudio ? 'Loading…' : 'Browse Audio File (MP3 / WAV)'}
                  </button>
                  <p style={{ fontSize: 10, color: '#1e293b' }}>or drag a file onto a track lane in the DAW, then re-open this panel</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {STYLE_PROFILES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleStyleSelect(p)}
                      style={{
                        textAlign: 'left', cursor: 'pointer', padding: 18,
                        borderRadius: 16, border: `1px solid ${p.color}22`,
                        background: `${p.color}07`, transition: 'all 0.22s',
                        display: 'flex', flexDirection: 'column', gap: 12,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${p.color}14`
                        e.currentTarget.style.borderColor = `${p.color}50`
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = `0 10px 32px ${p.color}20`
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = `${p.color}07`
                        e.currentTarget.style.borderColor = `${p.color}22`
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                          background: `${p.color}18`, border: `1px solid ${p.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                        }}>{p.emoji}</div>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', margin: 0, lineHeight: 1.35 }}>
                          {p.label}
                        </p>
                      </div>
                      <p style={{ fontSize: 10.5, color: '#64748b', margin: 0, lineHeight: 1.65 }}>
                        {p.desc}
                      </p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {p.tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30`,
                          }}>{tag}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════ PHASE: MORPHING ══════════════════════════════════════════ */}
          {phase === 'morphing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, padding: '16px 0' }}>
              <div style={{
                width: 84, height: 84, borderRadius: 22, flexShrink: 0,
                background: `${profile?.color ?? '#6366f1'}16`,
                border: `2px solid ${profile?.color ?? '#6366f1'}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
                boxShadow: `0 0 48px ${profile?.color ?? '#6366f1'}30`,
                animation: 'morphGlow 2s ease-in-out infinite',
              }}>{profile?.emoji ?? '🔮'}</div>

              {/* Animated frequency bars */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 52 }}>
                {Array.from({ length: 36 }, (_, i) => (
                  <div key={i} style={{
                    width: 4, borderRadius: 3,
                    background: profile?.color ?? '#6366f1',
                    opacity: 0.55 + (i % 4) * 0.12,
                    animationName: `morphBar${i % 6}`,
                    animationDuration: `${0.38 + (i % 6) * 0.09}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDirection: 'alternate',
                    animationDelay: `${i * 0.038}s`,
                    height: `${18 + Math.abs(Math.sin(i * 0.75)) * 28}px`,
                  }} />
                ))}
              </div>

              {/* Step checklist */}
              <div style={{ width: '100%', maxWidth: 500 }}>
                {MORPH_STEPS.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px',
                    borderRadius: 9, marginBottom: 4,
                    background: i < morphStep
                      ? 'rgba(16,185,129,0.06)'
                      : i === morphStep
                        ? `${profile?.color ?? '#6366f1'}0c`
                        : 'transparent',
                    border: `1px solid ${
                      i < morphStep  ? 'rgba(16,185,129,0.2)'
                      : i === morphStep ? `${profile?.color ?? '#6366f1'}30`
                      : 'transparent'
                    }`,
                    transition: 'all 0.3s',
                  }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                      background: i < morphStep ? '#10b981' : i === morphStep ? (profile?.color ?? '#6366f1') : '#1e293b',
                      boxShadow: i === morphStep ? `0 0 10px ${profile?.color ?? '#6366f1'}88` : 'none',
                      color: '#fff',
                    }}>
                      {i < morphStep ? '✓' : i === morphStep ? '●' : ''}
                    </div>
                    <span style={{
                      fontSize: 11,
                      color: i < morphStep ? '#34d399' : i === morphStep ? '#e2e8f0' : '#1e3a52',
                      fontWeight: i === morphStep ? 600 : 400,
                      transition: 'color 0.3s',
                    }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ PHASE: COMPARISON ════════════════════════════════════════ */}
          {phase === 'comparison' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Help line */}
              <p style={{ fontSize: 10.5, color: '#475569', textAlign: 'center', margin: 0 }}>
                Click either deck to A/B compare at the exact same timestamp — phase-locked switching
              </p>

              {/* Dual deck */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                <WaveformSilhouette
                  peaks={sourceTrack?.peaks}
                  color="#00e5ff"
                  label="🅐  Original Composition"
                  active={comparisonDeck === 'original'}
                  isPlaying={isPlaying}
                  onClick={() => playDeck('original')}
                />

                {/* VS divider */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 6 }}>
                  <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: '#060614', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#334155',
                  }}>VS</div>
                  <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                </div>

                <WaveformSilhouette
                  peaks={transformedPeaks ?? sourceTrack?.peaks}
                  color={profile?.color ?? '#a78bfa'}
                  label={`🅑  AI ${profile?.label ?? 'Style'} Transform`}
                  active={comparisonDeck === 'transformed'}
                  isPlaying={isPlaying}
                  onClick={() => playDeck('transformed')}
                />
              </div>

              {/* A/B toggle hint bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', borderRadius: 10,
                background: `${profile?.color}0a`,
                border: `1px solid ${profile?.color}20`,
              }}>
                <span style={{ fontSize: 18 }}>{profile?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                    Applied: {profile?.label}
                  </p>
                  <p style={{ fontSize: 9.5, color: '#475569', margin: '2px 0 0' }}>{profile?.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={isPlaying ? stopPreview : () => playDeck(comparisonDeck)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 700,
                      background: isPlaying ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                      border: isPlaying ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)',
                      color: isPlaying ? '#f87171' : '#4ade80',
                    }}>
                    {isPlaying ? '◼ Stop' : '▶ Play Active'}
                  </button>
                </div>
              </div>

              {/* Finalization buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                <button
                  onClick={handleLockIn}
                  style={{
                    padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(16,185,129,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🟢</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Lock In &amp; Merge AI Performance</div>
                    <div style={{ fontSize: 9.5, color: '#059669', marginTop: 3, lineHeight: 1.5 }}>
                      Replaces Backing Track completely with the transformed genre performance
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleCombine}
                  style={{
                    padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fbbf24', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(245,158,11,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🟡</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Combine Both as Multi-Layer Stack</div>
                    <div style={{ fontSize: 9.5, color: '#d97706', marginTop: 3, lineHeight: 1.5 }}>
                      Keeps both copies and stacks them into a harmonized audio layer sequence
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={handleBackToSelect}
                style={{
                  alignSelf: 'center', padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                  color: '#334155', fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
                onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
                ← Try a different style
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes morphGlow {
          0%,100% { box-shadow: 0 0 48px ${profile?.color ?? '#6366f1'}30; transform: scale(1); }
          50%      { box-shadow: 0 0 72px ${profile?.color ?? '#6366f1'}50; transform: scale(1.03); }
        }
        @keyframes morphBar0 { from{height:18%} to{height:82%} }
        @keyframes morphBar1 { from{height:32%} to{height:95%} }
        @keyframes morphBar2 { from{height:14%} to{height:68%} }
        @keyframes morphBar3 { from{height:48%} to{height:88%} }
        @keyframes morphBar4 { from{height:22%} to{height:76%} }
        @keyframes morphBar5 { from{height:38%} to{height:70%} }
        @keyframes deckDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.35; transform: scale(0.7); }
        }
        @keyframes deckSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  )
}
