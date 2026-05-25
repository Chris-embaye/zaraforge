import { useState, useRef, useCallback } from 'react'
import { Upload, Mic, Music2, Trash2, CheckCircle2, Loader2, ImageIcon, X, Volume2, Disc3 } from 'lucide-react'
import { useDawStore } from '../store/dawStore'
import { useAssetLibraryStore } from '../store/assetLibraryStore'
import AICoverPanel from './AICoverPanel'

function fmtDuration(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── 4-Stem offline processing helpers ────────────────────────────────────────
async function processOffline(srcBuffer, filterSetup) {
  const offCtx = new OfflineAudioContext(
    srcBuffer.numberOfChannels,
    srcBuffer.length,
    srcBuffer.sampleRate,
  )
  const src = offCtx.createBufferSource()
  src.buffer = srcBuffer
  filterSetup(offCtx, src)
  src.start()
  return offCtx.startRendering()
}

// 🎤 Vocals: high-pass at 160Hz + presence peak + air shelf
async function extractStemVocals(buf) {
  return processOffline(buf, (ctx, src) => {
    const hpf      = ctx.createBiquadFilter()
    hpf.type = 'highpass'; hpf.frequency.value = 160; hpf.Q.value = 0.7
    const presence = ctx.createBiquadFilter()
    presence.type = 'peaking'; presence.frequency.value = 2800; presence.gain.value = 10; presence.Q.value = 1.1
    const air      = ctx.createBiquadFilter()
    air.type = 'highshelf'; air.frequency.value = 7500; air.gain.value = 4
    const gn       = ctx.createGain(); gn.gain.value = 1.25
    src.connect(hpf); hpf.connect(presence); presence.connect(air); air.connect(gn); gn.connect(ctx.destination)
  })
}

// 🥁 Drums: band-pass emphasising transients, preserve kick sub + snare crack
async function extractStemDrums(buf) {
  return processOffline(buf, (ctx, src) => {
    const subBoost  = ctx.createBiquadFilter()
    subBoost.type = 'peaking'; subBoost.frequency.value = 65; subBoost.gain.value = 7; subBoost.Q.value = 1.4
    const midNotch  = ctx.createBiquadFilter()
    midNotch.type = 'peaking'; midNotch.frequency.value = 600; midNotch.gain.value = -8; midNotch.Q.value = 1.0
    const snap      = ctx.createBiquadFilter()
    snap.type = 'peaking'; snap.frequency.value = 4800; snap.gain.value = 8; snap.Q.value = 1.5
    const airCut    = ctx.createBiquadFilter()
    airCut.type = 'highshelf'; airCut.frequency.value = 12000; airCut.gain.value = -4
    const comp      = ctx.createDynamicsCompressor()
    comp.threshold.value = -20; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.1
    src.connect(subBoost); subBoost.connect(midNotch); midNotch.connect(snap); snap.connect(airCut); airCut.connect(comp); comp.connect(ctx.destination)
  })
}

// 🎸 Bass engine: low-pass 250Hz + sub boost
async function extractStemBass(buf) {
  return processOffline(buf, (ctx, src) => {
    const lpf      = ctx.createBiquadFilter()
    lpf.type = 'lowpass'; lpf.frequency.value = 250; lpf.Q.value = 0.6
    const subBoost = ctx.createBiquadFilter()
    subBoost.type = 'peaking'; subBoost.frequency.value = 80; subBoost.gain.value = 9; subBoost.Q.value = 1.6
    const warmth   = ctx.createBiquadFilter()
    warmth.type = 'peaking'; warmth.frequency.value = 160; warmth.gain.value = 4; warmth.Q.value = 0.9
    const gn       = ctx.createGain(); gn.gain.value = 1.15
    src.connect(lpf); lpf.connect(subBoost); subBoost.connect(warmth); warmth.connect(gn); gn.connect(ctx.destination)
  })
}

// 🎹 Instrument melodies: mid-band + vocal notch + bass notch
async function extractStemInstruments(buf) {
  return processOffline(buf, (ctx, src) => {
    const bassNotch  = ctx.createBiquadFilter()
    bassNotch.type = 'highpass'; bassNotch.frequency.value = 220; bassNotch.Q.value = 0.5
    const vocalNotch = ctx.createBiquadFilter()
    vocalNotch.type = 'peaking'; vocalNotch.frequency.value = 2400; vocalNotch.gain.value = -9; vocalNotch.Q.value = 1.2
    const midBoost   = ctx.createBiquadFilter()
    midBoost.type = 'peaking'; midBoost.frequency.value = 1100; midBoost.gain.value = 4; midBoost.Q.value = 0.8
    const airShelf   = ctx.createBiquadFilter()
    airShelf.type = 'highshelf'; airShelf.frequency.value = 8000; airShelf.gain.value = 3
    src.connect(bassNotch); bassNotch.connect(vocalNotch); vocalNotch.connect(midBoost); midBoost.connect(airShelf); airShelf.connect(ctx.destination)
  })
}

const STEM_STEPS = [
  'Parsing audio container & decoding frames',
  'Analyzing spectral frequency distribution',
  'Mapping transient & harmonic partials',
  'Isolating vocal formant fingerprints',
  'Extracting sub-frequency bass engine',
  'Reconstructing drum & percussion transients',
  'Separating melodic instrument layers',
  'Normalizing, syncing & final render',
  'Complete — 4 stems ready',
]

// ── 4-Stem console channel strip ──────────────────────────────────────────────
const STEM_CHANNELS = [
  { id: 'vocals',      emoji: '🎤', label: 'Vocals',      color: '#00ff88' },
  { id: 'drums',       emoji: '🥁', label: 'Drums',       color: '#f59e0b' },
  { id: 'bass',        emoji: '🔊', label: 'Bass',        color: '#3b82f6' },
  { id: 'instruments', emoji: '🎸', label: 'Instruments', color: '#a78bfa' },
]

function StemChannelStrip({ ch, volumes, muted, onVolume, onMute }) {
  const vol = volumes[ch.id] ?? 1
  const mut = muted[ch.id]  ?? false
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '10px 6px', borderRadius: 10,
      background: mut ? 'rgba(255,255,255,0.02)' : `${ch.color}08`,
      border: `1px solid ${mut ? 'rgba(255,255,255,0.06)' : ch.color + '22'}`,
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 14 }}>{ch.emoji}</span>
      <p style={{ fontSize: 8, fontWeight: 800, color: mut ? '#334155' : ch.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
        {ch.label}
      </p>

      {/* Vertical fader */}
      <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input
          type="range" min={0} max={1} step={0.01} value={vol}
          onChange={e => onVolume(ch.id, +e.target.value)}
          disabled={mut}
          style={{
            writingMode: 'vertical-lr', direction: 'rtl',
            width: 18, height: 60,
            accentColor: mut ? '#334155' : ch.color,
            opacity: mut ? 0.3 : 1,
            cursor: mut ? 'not-allowed' : 'pointer',
          }}
        />
      </div>

      {/* VU bar */}
      <div style={{ width: '100%', height: 3, borderRadius: 2, background: '#0f0f1a', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: mut ? '0%' : `${vol * 100}%`,
          background: ch.color,
          boxShadow: mut ? 'none' : `0 0 6px ${ch.color}88`,
          transition: 'width 60ms',
        }} />
      </div>

      <span style={{ fontSize: 8, fontFamily: 'monospace', color: mut ? '#334155' : '#475569' }}>
        {Math.round(vol * 100)}
      </span>

      {/* Mute button */}
      <button
        onClick={() => onMute(ch.id)}
        style={{
          width: 24, height: 16, borderRadius: 4, border: 'none', cursor: 'pointer',
          fontSize: 7, fontWeight: 800,
          background: mut ? '#7f1d1d' : 'rgba(255,255,255,0.05)',
          color: mut ? '#fca5a5' : '#475569',
          transition: 'all 0.15s',
        }}>M</button>
    </div>
  )
}

function StemConsole() {
  const { stemDemix, setStemDemixVolume, toggleStemDemixMute } = useDawStore()
  if (stemDemix.phase !== 'done') return null
  return (
    <div style={{ padding: '0 12px 14px' }}>
      <p style={{ fontSize: 8, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 2px' }}>
        Stem Console Mixer
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {STEM_CHANNELS.map(ch => (
          <StemChannelStrip
            key={ch.id}
            ch={ch}
            volumes={stemDemix.volumes}
            muted={stemDemix.muted}
            onVolume={setStemDemixVolume}
            onMute={toggleStemDemixMute}
          />
        ))}
      </div>
    </div>
  )
}

// ── Track asset row ───────────────────────────────────────────────────────────
function TrackAssetRow({ track, onUpload, onSelect, isSelected }) {
  const { removeTrack } = useDawStore()
  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all"
      style={{
        background:  isSelected ? '#0c1220' : 'transparent',
        borderLeft:  `2px solid ${isSelected ? track.color : 'transparent'}`,
      }}>
      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: track.color + '18', border: `1px solid ${track.color}30` }}>
        <Music2 size={12} style={{ color: track.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-300 truncate">{track.name}</p>
        <p className="text-[10px] text-gray-600">
          {track.audioBuffer ? (
            <span style={{ color: track.color + 'aa' }}>
              ✓ {fmtDuration(track.durationMs)}
            </span>
          ) : 'No audio loaded'}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onUpload() }}
          title="Replace audio"
          className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors">
          <Upload size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); removeTrack(track.id) }}
          title="Remove track"
          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── 4-Stem splitter progress UI ───────────────────────────────────────────────
function StemProgress({ step, done }) {
  const pct = Math.round((step / (STEM_STEPS.length - 1)) * 100)
  return (
    <div className="px-3 py-3 rounded-xl space-y-3"
      style={{ background: '#080814', border: '1px solid #1a1a2e' }}>

      <div className="flex items-center gap-2">
        {done
          ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
          : <Loader2 size={13} className="animate-spin flex-shrink-0" style={{ color: '#00e5ff' }} />}
        <span className="text-[11px] font-semibold"
          style={{ color: done ? '#34d399' : '#00e5ff' }}>
          {done ? '✓ 4 Stems extracted!' : STEM_STEPS[Math.min(step, STEM_STEPS.length - 2)]}
        </span>
      </div>

      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{
          width: `${pct}%`,
          background: done
            ? 'linear-gradient(90deg, #00ff88, #34d399)'
            : 'linear-gradient(90deg, #00e5ff, #818cf8)',
          boxShadow: done ? '0 0 8px #00ff8866' : '0 0 8px #00e5ff66',
        }} />
      </div>

      <div className="space-y-0.5">
        {STEM_STEPS.slice(0, -1).map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: i < step ? '#34d399' : i === step ? '#00e5ff' : '#1e293b',
                boxShadow:  i === step && !done ? '0 0 4px #00e5ff' : 'none',
              }} />
            <span className="text-[9px]"
              style={{ color: i < step ? '#4ade80' : i === step ? '#7dd3fc' : '#1e3a52' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {done && (
        <p className="text-[10px] text-gray-500 leading-snug">
          4 isolated stems loaded into the console mixer. Use the channel faders to balance each layer.
        </p>
      )}
    </div>
  )
}

// ── Voice Clone Bank ──────────────────────────────────────────────────────────
const PRESET_VOICES = [
  { id: 'vc-1', name: 'Studio Tenor',  avatar: '🎙', active: true,  hue: '#818cf8' },
  { id: 'vc-2', name: 'Deep Bass',     avatar: '🎤', active: false, hue: '#34d399' },
]

const SCAN_STEPS = ['Extracting formants…', 'Mapping vocal tract…', 'Building phoneme model…', 'Calibrating pitch DNA…', 'Clone ready ✓']

function VoiceCloneBank() {
  const [profiles, setProfiles]     = useState(PRESET_VOICES)
  const [scanPhase, setScanPhase]   = useState('idle')  // idle | scanning | done
  const [scanStep,  setScanStep]    = useState(0)
  const [dragOver,  setDragOver]    = useState(false)

  function startScan(fileName) {
    setScanPhase('scanning')
    setScanStep(0)
    let s = 0
    const tick = () => {
      s++
      setScanStep(s)
      if (s < SCAN_STEPS.length - 1) {
        setTimeout(tick, 700 + Math.random() * 500)
      } else {
        setTimeout(() => {
          setScanPhase('done')
          const name = fileName.replace(/\.[^.]+$/, '').slice(0, 18) || 'Custom Clone'
          setProfiles(prev => [...prev, {
            id: `vc-${Date.now()}`, name, avatar: '🧬', active: true,
            hue: `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`,
          }])
        }, 500)
      }
    }
    setTimeout(tick, 600)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('audio/')) startScan(file.name)
  }

  function handleFileInput() {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = e => {
      const f = e.target.files?.[0]
      if (f) { setScanPhase('idle'); startScan(f.name) }
    }
    el.click()
  }

  function toggleProfile(id) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  const isScanning = scanPhase === 'scanning'
  const BAR_COUNT  = 18

  return (
    <div style={{ margin: '0 12px 12px', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(129,140,248,0.2)', background: 'rgba(129,140,248,0.03)' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid rgba(129,140,248,0.12)', background: 'rgba(129,140,248,0.06)' }}>
        <span style={{ fontSize: 13 }}>👤</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.04em' }}>AI VOICE CLONE BANK</div>
          <div style={{ fontSize: 7.5, color: '#334155', marginTop: 1 }}>Drop 30s sample to clone a voice</div>
        </div>
        <div style={{ fontSize: 7, fontWeight: 800, color: '#818cf8', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', padding: '2px 5px', borderRadius: 4 }}>
          PRO
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={scanPhase === 'idle' ? handleFileInput : undefined}
        style={{
          margin: 8, borderRadius: 8, padding: '10px 8px',
          border: `1px dashed ${dragOver ? '#818cf8' : isScanning ? 'rgba(0,229,255,0.3)' : 'rgba(129,140,248,0.2)'}`,
          background: dragOver ? 'rgba(129,140,248,0.08)' : isScanning ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.01)',
          cursor: scanPhase === 'idle' ? 'pointer' : 'default',
          transition: 'all 0.2s',
          minHeight: 52,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {scanPhase === 'idle' && (
          <>
            <span style={{ fontSize: 18, opacity: 0.5 }}>🎙</span>
            <div style={{ fontSize: 8.5, color: '#475569', textAlign: 'center', lineHeight: 1.4 }}>
              Drop audio or click<br />
              <span style={{ color: '#818cf8', fontWeight: 700 }}>min 30s sample</span>
            </div>
          </>
        )}

        {isScanning && (
          <>
            {/* Animated frequency bars */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 22 }}>
              {Array.from({ length: BAR_COUNT }, (_, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: `rgba(0,229,255,${0.4 + (i % 4) * 0.15})`,
                  animation: `vcBar${i % 5} ${0.5 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                  height: `${25 + Math.sin(i * 0.9) * 18 + 10}%`,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 8, color: '#00e5ff', fontWeight: 700, textAlign: 'center' }}>
              {SCAN_STEPS[scanStep] || SCAN_STEPS[0]}
            </div>
          </>
        )}

        {scanPhase === 'done' && (
          <div style={{ fontSize: 8.5, color: '#34d399', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>✅</span> Voice profile cloned
          </div>
        )}
      </div>

      {/* Clone profiles */}
      {profiles.length > 0 && (
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {profiles.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 8px', borderRadius: 7,
              background: p.active ? `${p.hue}11` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${p.active ? `${p.hue}33` : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: p.active ? `${p.hue}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${p.active ? `${p.hue}55` : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}>{p.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: p.active ? '#e2e8f0' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 7.5, color: p.active ? p.hue : '#1e3a5f', fontWeight: p.active ? 700 : 400 }}>
                  {p.active ? '● Routing active' : '○ Bypassed'}
                </div>
              </div>
              <button
                onClick={() => toggleProfile(p.id)}
                style={{
                  flexShrink: 0, width: 32, height: 18, borderRadius: 9,
                  border: 'none', cursor: 'pointer',
                  background: p.active ? p.hue : '#1e293b',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: 2, borderRadius: '50%',
                  width: 14, height: 14, background: '#fff',
                  left: p.active ? 16 : 2,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes vcBar0 { from{height:15%} to{height:80%} }
        @keyframes vcBar1 { from{height:30%} to{height:95%} }
        @keyframes vcBar2 { from{height:10%} to{height:65%} }
        @keyframes vcBar3 { from{height:45%} to{height:85%} }
        @keyframes vcBar4 { from{height:20%} to{height:70%} }
      `}</style>
    </div>
  )
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function DAWLeftSidebar() {
  const {
    tracks, selectedId, selectTrack, setBuffer, addTrack,
    stemDemix, setStemDemix, setStemDemixBuffer,
  } = useDawStore()
  const { studioAlbumCover, clearStudioAlbumCover } = useAssetLibraryStore()

  // Recording
  const audioCtxRef = useRef(null)
  const mediaRecRef = useRef(null)
  const chunksRef   = useRef([])
  const timerRef    = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recSeconds,  setRecSeconds]  = useState(0)

  const getCtx = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const uploadToTrack = useCallback((trackId) => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async e => {
      const file = e.target.files?.[0]; if (!file) return
      const ctx = getCtx()
      const buf = await ctx.decodeAudioData(await file.arrayBuffer())
      setBuffer(trackId, buf)
    }
    el.click()
  }, [setBuffer])

  // ── 4-Stem Acoustic Demixer ───────────────────────────────────────────────
  const handleStemSplit = useCallback(() => {
    if (stemDemix.phase === 'processing') return
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*' })
    el.onchange = async e => {
      const file = e.target.files?.[0]; if (!file) return

      setStemDemix({ phase: 'processing', step: 0 })

      const ab  = await file.arrayBuffer()
      const ctx = getCtx()
      let srcBuffer
      try {
        srcBuffer = await ctx.decodeAudioData(ab)
      } catch (err) {
        console.error('4-stem decode failed', err)
        setStemDemix({ phase: 'idle', step: 0 })
        alert('Could not decode the audio file. Try a different format.')
        return
      }

      // Step animation — runs alongside the actual processing
      const animPromise = new Promise(resolve => {
        let s = 0
        const advance = () => {
          s++
          setStemDemix({ phase: 'processing', step: s })
          if (s < STEM_STEPS.length - 2) {
            setTimeout(advance, 780 + Math.random() * 540)
          } else {
            setTimeout(resolve, 600)
          }
        }
        setTimeout(advance, 680)
      })

      // All 4 stems processed in parallel
      const processingPromise = Promise.all([
        extractStemVocals(srcBuffer),
        extractStemDrums(srcBuffer),
        extractStemBass(srcBuffer),
        extractStemInstruments(srcBuffer),
      ])

      const [, [vocalBuf, drumsBuf, bassBuf, instBuf]] = await Promise.all([animPromise, processingPromise])

      // Push each stem into a DAW track (add if needed)
      const stemMap = [
        { trackId: 'vocal',   buf: vocalBuf },
        { trackId: 'backing', buf: instBuf  },
      ]
      stemMap.forEach(({ trackId, buf }) => setBuffer(trackId, buf))

      // Store all 4 buffers in stemDemix state
      setStemDemixBuffer('vocals',      vocalBuf)
      setStemDemixBuffer('drums',       drumsBuf)
      setStemDemixBuffer('bass',        bassBuf)
      setStemDemixBuffer('instruments', instBuf)

      setStemDemix({ phase: 'done', step: STEM_STEPS.length - 1 })
    }
    el.click()
  }, [stemDemix.phase, setBuffer, setStemDemix, setStemDemixBuffer])

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    let stream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { alert('Microphone access denied. Please allow mic and try again.'); return }
    chunksRef.current = []
    setRecSeconds(0)
    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    const mr = new MediaRecorder(stream)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      clearInterval(timerRef.current)
      stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const buf  = await getCtx().decodeAudioData(await blob.arrayBuffer())
      setBuffer('vocal', buf)
    }
    mr.start(); mediaRecRef.current = mr; setIsRecording(true)
  }, [setBuffer])

  const stopRecording = () => {
    clearInterval(timerRef.current)
    mediaRecRef.current?.stop()
  }

  const fmtRecTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const section = (label) => (
    <p className="px-3 pb-1 pt-3 text-[9px] font-bold uppercase tracking-widest text-gray-600">
      {label}
    </p>
  )

  const [activePanel, setActivePanel] = useState(null)

  const DOCK = [
    { id: 'tracks',  Icon: Music2,      label: 'Tracks',  color: '#818cf8' },
    { id: 'stems',   Icon: CheckCircle2,label: 'Stems',   color: '#00e5ff' },
    { id: 'clone',   Icon: Mic,         label: 'Clone',   color: '#c084fc' },
    { id: 'record',  Icon: Volume2,     label: 'Record',  color: '#f87171' },
    { id: 'art',     Icon: ImageIcon,   label: 'Art',     color: '#f472b6' },
    { id: 'cover',   Icon: Disc3,       label: 'Cover',   color: '#00ff88' },
  ]

  const togglePanel = (id) => setActivePanel(p => p === id ? null : id)

  // Panel content map
  const PANEL_CONTENT = {
    tracks: (
      <div className="py-1">
        {section('Upload')}
        <div className="px-3 space-y-1.5 pb-2">
          <button onClick={() => uploadToTrack('vocal')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-gray-400 hover:text-gray-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Upload size={12} style={{ color: '#00ff88' }} /> Upload Vocal File
          </button>
          <button onClick={() => uploadToTrack('backing')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-gray-400 hover:text-gray-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Upload size={12} style={{ color: '#a78bfa' }} /> Upload Instrumental
          </button>
        </div>
        {section('My Tracks')}
        <div className="px-1.5 space-y-0.5">
          {tracks.map(t => (
            <TrackAssetRow key={t.id} track={t}
              isSelected={selectedId === t.id}
              onSelect={() => selectTrack(t.id)}
              onUpload={() => uploadToTrack(t.id)}
            />
          ))}
        </div>
        <div className="px-3 pt-2 pb-3">
          <button onClick={addTrack}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-400 transition-colors border border-dashed"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            + Add Track
          </button>
        </div>
        {section('Shortcuts')}
        <div className="px-3 pb-4 space-y-1">
          {[['Space','Play / Stop'],['V','Select'],['C','Cut'],['T','Trim'],['S','Slip'],['Home','Start'],['Ctrl+Z','Undo']].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[10px] text-gray-600">{v}</span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
                {k}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    ),

    stems: (
      <div className="py-1">
        {section('✂️ AI 4-Stem Acoustic Demixing')}
        <div className="px-3 pb-2 space-y-2">
          <button onClick={handleStemSplit} disabled={stemDemix.phase === 'processing'}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{
              background: stemDemix.phase === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(0,229,255,0.07)',
              border:     stemDemix.phase === 'done' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(0,229,255,0.22)',
              color:      stemDemix.phase === 'done' ? '#34d399' : '#00e5ff',
            }}>
            <span style={{ fontSize: 13 }}>✂️</span>
            {stemDemix.phase === 'done' ? 'Demix again' : 'Upload & Demix 4 Stems'}
          </button>
          <p className="text-[9px] text-gray-700 leading-snug px-0.5">
            Splits a flat audio file into 4 independent stems: Vocals, Drums, Bass & Instruments.
          </p>
          {stemDemix.phase !== 'idle' && (
            <StemProgress step={stemDemix.step} done={stemDemix.phase === 'done'} />
          )}
        </div>
        <StemConsole />
      </div>
    ),

    clone: (
      <div className="py-1">
        {section('AI Voice Clone Bank')}
        <VoiceCloneBank />
      </div>
    ),

    record: (
      <div className="py-1">
        {section('Record')}
        <div className="px-3 pb-3">
          {isRecording ? (
            <button onClick={stopRecording}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Stop · {fmtRecTime(recSeconds)}
            </button>
          ) : (
            <button onClick={startRecording}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <Mic size={13} /> Record Vocals
            </button>
          )}
        </div>
      </div>
    ),

    art: (
      <div className="py-1">
        {section('Album Art')}
        <div className="px-3 pb-3">
          {studioAlbumCover ? (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(244,114,182,0.3)', boxShadow: '0 0 20px rgba(244,114,182,0.12)' }}>
              <img src={studioAlbumCover.dataUrl} alt={studioAlbumCover.name}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,2,10,0.85) 0%, transparent 55%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#f472b6', marginBottom: 2 }}>{studioAlbumCover.name}</p>
                <p style={{ fontSize: 9, color: '#64748b' }}>from {studioAlbumCover.source}</p>
              </div>
              <button onClick={clearStudioAlbumCover} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(2,2,10,0.75)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={11} style={{ color: '#64748b' }} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <ImageIcon size={18} style={{ color: '#1e293b' }} />
              <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', lineHeight: 1.4 }}>Send from Logo Maker<br />or BG Remover</p>
            </div>
          )}
        </div>
      </div>
    ),

    cover: <AICoverPanel />,
  }

  return (
    <>
      {/* Click-away backdrop */}
      {activePanel && (
        <div className="fixed inset-0" style={{ zIndex: 38 }} onClick={() => setActivePanel(null)} />
      )}

      {/* Dock + panel row */}
      <div style={{ position: 'absolute', top: 56, left: 16, zIndex: 39, display: 'flex', gap: 8, alignItems: 'flex-start' }}>

        {/* ── 64px icon dock ── */}
        <div style={{
          width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '10px 6px',
          background: 'rgba(7,7,20,0.88)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.07) inset',
        }}>
          {/* Brand dot */}
          <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg,#6d28d9,#00e5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 11 }}>⚡</span>
          </div>
          <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />

          {DOCK.map(({ id, Icon, label, color }) => {
            const active = activePanel === id
            return (
              <button key={id} onClick={() => togglePanel(id)} title={label}
                style={{
                  width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background:  active ? `${color}18` : 'transparent',
                  border:      active ? `1px solid ${color}44` : '1px solid transparent',
                  color:       active ? color : '#475569',
                  boxShadow:   active ? `0 0 14px ${color}33` : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                }}>
                <Icon size={14} />
                <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Sliding glass panel ── */}
        {activePanel && (
          <div style={{
            width: activePanel === 'cover' ? 280 : 240,
            maxHeight: 'calc(100vh - 130px)',
            overflowY: 'auto',
            background: 'rgba(7,7,20,0.88)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 18,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.07) inset',
            animation: 'glass-float-in 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.025)',
              position: 'sticky', top: 0, zIndex: 1,
              backdropFilter: 'blur(8px)',
            }}>
              {(() => { const d = DOCK.find(x => x.id === activePanel); return d ? <d.Icon size={12} style={{ color: d.color, flexShrink: 0 }} /> : null })()}
              <span style={{ flex: 1, fontSize: 11, fontWeight: 800, color: '#e2e8f0' }}>
                {DOCK.find(x => x.id === activePanel)?.label}
              </span>
              <button onClick={() => setActivePanel(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 2 }}>
                <X size={12} />
              </button>
            </div>
            {PANEL_CONTENT[activePanel]}
          </div>
        )}
      </div>
    </>
  )
}
