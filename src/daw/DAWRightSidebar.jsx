import { useState, useCallback, useRef } from 'react'
import { Sliders, Zap, Loader2, Download, Shield, Sparkles, ChevronDown, X } from 'lucide-react'
import { useDawStore } from '../store/dawStore'
import { SCALES, processAutoTune, mixAndDownload } from '../lib/pitchEngine'

// ── FX Preset definitions ─────────────────────────────────────────────────────
const FX_PRESETS = [
  {
    id:    'trap',
    emoji: '🤖',
    label: 'Hyper-Tune',
    sub:   'T-Pain / Trap Star',
    color: '#00ff88',
    settings: {
      intensity: 100, speed: 0,
      eqLow: 0, eqMid: 0, eqHigh: 8,
      reverbRoom: 1.8, reverbWet: 0.15,
      doublerEnabled: false,
    },
  },
  {
    id:    'radio',
    emoji: '📻',
    label: 'Radio Vintage',
    sub:   'Telephone bandpass',
    color: '#f59e0b',
    settings: {
      intensity: 28, speed: 22,
      eqLow: -8, eqMid: 6, eqHigh: -10,
      reverbRoom: 0.4, reverbWet: 0.06,
      doublerEnabled: false,
    },
  },
  {
    id:    'cloud',
    emoji: '☁️',
    label: 'Cloud Rap',
    sub:   'Travis · deep space delay',
    color: '#818cf8',
    settings: {
      intensity: 45, speed: 55,
      eqLow: 3, eqMid: -2, eqHigh: 4,
      reverbRoom: 4.5, reverbWet: 0.55,
      doublerEnabled: true, doublerDelay: 28, doublerDetune: 15,
    },
  },
]

const SCALE_NAMES = Object.keys(SCALES)

const REVERB_PRESETS = [
  { key: 'dry',   label: 'Dry',    room: 0,   wet: 0    },
  { key: 'room',  label: 'Room',   room: 1.2, wet: 0.22 },
  { key: 'hall',  label: 'Hall',   room: 2.4, wet: 0.35 },
  { key: 'plate', label: 'Plate',  room: 1.8, wet: 0.30 },
  { key: 'cave',  label: 'Cave',   room: 4.5, wet: 0.55 },
]

function Knob({ label, value, min, max, step = 1, unit = '', color = '#6366f1', onChange }) {
  const pct  = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const sign = value > 0 ? '+' : ''
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>
          {sign}{value}{unit}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
        <div className="absolute top-0 left-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 60ms' }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-0.5 appearance-none bg-transparent cursor-pointer -mt-3.5"
        style={{ accentColor: color }}
      />
    </div>
  )
}

function MiniToggle({ value, onChange, color = '#6366f1' }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(!value) }}
      style={{
        width: 32, height: 18, borderRadius: 9,
        border: 'none', cursor: 'pointer',
        background: value ? color : 'rgba(255,255,255,0.06)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 2, borderRadius: '50%',
        width: 14, height: 14, background: '#fff',
        left: value ? 16 : 2,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

// Accordion section wrapper
function AccSection({ title, icon, color = '#818cf8', open, onToggle, toggleValue, onToggleValue, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
          color: open ? '#e2e8f0' : '#475569',
          transition: 'color 0.15s',
        }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 10.5, fontWeight: 800, textAlign: 'left', letterSpacing: '0.02em' }}>
          {title}
        </span>
        {onToggleValue !== undefined && (
          <MiniToggle value={toggleValue} onChange={onToggleValue} color={color} />
        )}
        <ChevronDown size={12} style={{
          color: '#334155',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </button>
      {open && (
        <div style={{ padding: '2px 14px 12px', animation: 'glass-float-in 0.18s ease forwards' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function DAWRightSidebar() {
  const { tracks, selectedId, fx, setFx, setFxBatch } = useDawStore()
  const selectedTrack = tracks.find(t => t.id === selectedId)

  const trackFx = fx[selectedId] || {}
  const accent  = selectedTrack?.color || '#6366f1'
  const setF    = (key, val) => setFx(selectedId, key, val)
  const hasBuf  = !!selectedTrack?.audioBuffer

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress,     setProgress]     = useState(0)
  const audioCtxRef = useRef(null)

  // Which accordion sections are open
  const [open, setOpen] = useState({ presets: true, autotune: false, reverb: false, eq: false, doubler: false, gate: false })
  const toggle = (key) => setOpen(p => ({ ...p, [key]: !p[key] }))

  const getCtx = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const applyAutoTune = useCallback(async () => {
    if (!hasBuf || isProcessing) return
    const ctx = getCtx()
    setIsProcessing(true); setProgress(0)
    try {
      await processAutoTune(
        selectedTrack.audioBuffer, ctx,
        SCALES[trackFx.scale || 'C Major'],
        trackFx.intensity ?? 50,
        pct => setProgress(pct),
      )
    } catch (e) { console.error('Auto-tune failed', e) }
    setIsProcessing(false)
  }, [hasBuf, isProcessing, selectedTrack, trackFx])

  const renderMix = useCallback(async () => {
    const vocal   = tracks.find(t => t.id === 'vocal')
    const backing = tracks.find(t => t.id === 'backing')
    await mixAndDownload({
      vocalBuffer:   vocal?.audioBuffer,
      backingBuffer: backing?.audioBuffer,
      vocalGain:     vocal?.muted   ? 0 : (vocal?.volume   ?? 0.8),
      backingGain:   backing?.muted ? 0 : (backing?.volume ?? 0.6),
    })
  }, [tracks])

  const activeReverb = REVERB_PRESETS.find(
    r => Math.abs(r.wet - (trackFx.reverbWet ?? 0)) < 0.05
  )?.key || 'dry'

  return (
    <div style={{
      position: 'absolute', top: 56, right: 16, zIndex: 39,
      width: 248,
      maxHeight: 'calc(100vh - 130px)',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(7,7,20,0.88)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 18,
      boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.07) inset',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.025)',
        flexShrink: 0,
      }}>
        <Sliders size={13} style={{ color: accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', display: 'block' }}>FX Inspector</span>
          {selectedTrack && (
            <span style={{ fontSize: 9.5, color: accent + 'aa', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedTrack.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 6, background: '#052e16', border: '1px solid #14532d', flexShrink: 0 }}>
          <Shield size={8} style={{ color: '#4ade80' }} />
          <span style={{ fontSize: 7.5, fontWeight: 800, color: '#4ade80', letterSpacing: '0.06em' }}>LIMIT</span>
        </div>
      </div>

      {!selectedTrack ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', lineHeight: 1.5 }}>
            Click a track lane to select it and edit its FX chain
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── FX Presets ───────────────────────────────────────────────── */}
          <AccSection title="Vocal FX Presets" icon={<Sparkles size={11} style={{ color: '#fbbf24' }} />}
            color="#fbbf24" open={open.presets} onToggle={() => toggle('presets')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FX_PRESETS.map(preset => (
                <button key={preset.id}
                  onClick={() => selectedId && setFxBatch(selectedId, preset.settings)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: preset.color + '0d',
                    border: `1px solid ${preset.color}25`,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{preset.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: preset.color, margin: 0 }}>{preset.label}</p>
                    <p style={{ fontSize: 9, color: '#475569', margin: '2px 0 0' }}>{preset.sub}</p>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: preset.color + '22', color: preset.color }}>APPLY</span>
                </button>
              ))}
            </div>
          </AccSection>

          {/* ── Auto-Tune ────────────────────────────────────────────────── */}
          <AccSection title="Auto-Tune" icon="🎵" color={accent}
            open={open.autotune} onToggle={() => toggle('autotune')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, color: '#475569', display: 'block', marginBottom: 4 }}>Key / Scale</span>
                <select value={trackFx.scale || 'C Major'} onChange={e => setF('scale', e.target.value)}
                  style={{
                    width: '100%', fontSize: 11, borderRadius: 8, padding: '5px 8px', outline: 'none', cursor: 'pointer',
                    background: 'rgba(12,12,26,0.9)', border: '1px solid rgba(255,255,255,0.08)', color: accent,
                  }}>
                  {SCALE_NAMES.map(s => (
                    <option key={s} value={s} style={{ background: '#0c0c1a', color: '#fff' }}>{s}</option>
                  ))}
                </select>
              </div>
              <Knob label="Intensity" value={trackFx.intensity ?? 50}
                min={0} max={100} unit="%" color={accent} onChange={v => setF('intensity', v)} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#334155' }}>Natural</span>
                <span style={{ color: (trackFx.intensity ?? 50) >= 85 ? accent : '#374151', fontWeight: 700 }}>
                  {(trackFx.intensity ?? 50) >= 85 ? '🤖 T-Pain' : (trackFx.intensity ?? 50) >= 60 ? 'Heavy' : 'Subtle'}
                </span>
                <span style={{ color: '#334155' }}>Robot</span>
              </div>
              <Knob label="Correction Speed" value={trackFx.speed ?? 40}
                min={0} max={100} unit="%" color="#60a5fa" onChange={v => setF('speed', v)} />
            </div>
          </AccSection>

          {/* ── Reverb / Space ───────────────────────────────────────────── */}
          <AccSection title="Reverb / Space" icon="🌊" color="#818cf8"
            open={open.reverb} onToggle={() => toggle('reverb')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                {REVERB_PRESETS.map(({ key, label }) => (
                  <button key={key}
                    onClick={() => {
                      const p = REVERB_PRESETS.find(r => r.key === key)
                      setF('reverbRoom', p.room); setF('reverbWet', p.wet)
                    }}
                    style={{
                      padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: 'pointer',
                      background: activeReverb === key ? '#818cf822' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${activeReverb === key ? '#818cf855' : 'rgba(255,255,255,0.06)'}`,
                      color: activeReverb === key ? '#818cf8' : '#334155',
                    }}>{label}</button>
                ))}
              </div>
              <Knob label="Wet Mix" value={Math.round((trackFx.reverbWet ?? 0) * 100)}
                min={0} max={100} unit="%" color="#818cf8" onChange={v => setF('reverbWet', v / 100)} />
              <Knob label="Room Size" value={+(trackFx.reverbRoom ?? 0.8).toFixed(1)}
                min={0} max={5} step={0.1} unit="s" color="#818cf8" onChange={v => setF('reverbRoom', v)} />
            </div>
          </AccSection>

          {/* ── EQ ──────────────────────────────────────────────────────── */}
          <AccSection title="Equalizer (EQ)" icon="〰️" color="#34d399"
            open={open.eq} onToggle={() => toggle('eq')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Knob label="Low Shelf (120Hz)" value={trackFx.eqLow ?? 0}
                min={-12} max={12} unit=" dB" color="#34d399" onChange={v => setF('eqLow', v)} />
              <Knob label="Mid Peak (1kHz)" value={trackFx.eqMid ?? 0}
                min={-12} max={12} unit=" dB" color="#fbbf24" onChange={v => setF('eqMid', v)} />
              <Knob label="High Shelf (8kHz)" value={trackFx.eqHigh ?? 0}
                min={-12} max={12} unit=" dB" color="#60a5fa" onChange={v => setF('eqHigh', v)} />
            </div>
          </AccSection>

          {/* ── Vocal Doubler ────────────────────────────────────────────── */}
          <AccSection title="Vocal Doubler" icon="👥" color={accent}
            open={open.doubler} onToggle={() => toggle('doubler')}
            toggleValue={trackFx.doublerEnabled ?? false}
            onToggleValue={v => setF('doublerEnabled', v)}>
            {(trackFx.doublerEnabled) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Knob label="Delay" value={trackFx.doublerDelay ?? 22}
                  min={15} max={30} unit=" ms" color={accent} onChange={v => setF('doublerDelay', v)} />
                <Knob label="Width (Detune)" value={trackFx.doublerDetune ?? 8}
                  min={0} max={20} unit="¢" color={accent} onChange={v => setF('doublerDetune', v)} />
                <p style={{ fontSize: 9, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  Creates two detuned ghost copies ±{trackFx.doublerDetune ?? 8}¢ for studio thickness.
                </p>
              </div>
            )}
          </AccSection>

          {/* ── Noise Gate ───────────────────────────────────────────────── */}
          <AccSection title="Noise Gate" icon="🔇" color="#ef4444"
            open={open.gate} onToggle={() => toggle('gate')}
            toggleValue={trackFx.gateEnabled ?? false}
            onToggleValue={v => setF('gateEnabled', v)}>
            {(trackFx.gateEnabled) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Knob label="Threshold" value={trackFx.gateThreshold ?? -40}
                  min={-60} max={-20} unit=" dB" color="#ef4444" onChange={v => setF('gateThreshold', v)} />
                <p style={{ fontSize: 9, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  Silences signal below {trackFx.gateThreshold ?? -40} dB — kills mic hiss & room noise.
                </p>
              </div>
            )}
          </AccSection>

          {/* ── Render Actions ───────────────────────────────────────────── */}
          <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isProcessing && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> Processing…
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: accent }}>{progress}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 9, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', borderRadius: 9, width: `${progress}%`, background: accent, transition: 'width 120ms' }} />
                </div>
              </div>
            )}
            <button onClick={applyAutoTune} disabled={!hasBuf || isProcessing}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: hasBuf && !isProcessing ? 'pointer' : 'not-allowed',
                background: accent + '18', border: `1px solid ${accent}40`, color: accent,
                opacity: (!hasBuf || isProcessing) ? 0.35 : 1,
                transition: 'all 0.15s',
              }}>
              <Zap size={12} /> Apply Auto-Tune
            </button>
            <button onClick={renderMix} disabled={tracks.every(t => !t.audioBuffer)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800,
                cursor: tracks.every(t => !t.audioBuffer) ? 'not-allowed' : 'pointer',
                background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', color: '#34d399',
                opacity: tracks.every(t => !t.audioBuffer) ? 0.35 : 1,
                transition: 'all 0.15s',
              }}>
              <Download size={12} /> Render &amp; Download WAV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
