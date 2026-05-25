import { useRef, useEffect, useState } from 'react'
import { Upload, Play, Pause, Download, RefreshCw, Mic2, ChevronDown } from 'lucide-react'
import { useAICoverStore } from '../store/aiCoverStore'

// ── Kits.ai voice catalogue (swap IDs for real ones from your Kits.ai account) ──
const VOICE_BANK = [
  { id: '200',  name: 'Drake',     emoji: '🎤', genre: 'Hip-Hop',   color: '#f59e0b' },
  { id: '201',  name: 'The Weeknd',emoji: '🌙', genre: 'R&B',       color: '#818cf8' },
  { id: '202',  name: 'Ariana',    emoji: '✨', genre: 'Pop',        color: '#f472b6' },
  { id: '203',  name: 'Travis',    emoji: '🌹', genre: 'Trap',       color: '#7c3aed' },
  { id: '204',  name: 'Adele',     emoji: '🏆', genre: 'Soul',       color: '#00e5ff' },
  { id: '205',  name: 'Burna Boy', emoji: '🌍', genre: 'Afrobeats',  color: '#00ff88' },
  { id: '206',  name: 'Billie',    emoji: '🖤', genre: 'Alt Pop',    color: '#a78bfa' },
  { id: '207',  name: 'Juice WRLD',emoji: '🔮', genre: 'Emo Rap',   color: '#fb923c' },
]

const STEP_LABELS = [
  'Separating vocals from beat',
  'Cloning to selected voice',
  'Merging final master mix',
]

// ── Waveform mini-viz (decorative, seeded from voice ID) ─────────────────────
function VoiceWave({ color, seed = 0 }) {
  const bars = Array.from({ length: 12 }, (_, i) =>
    0.25 + Math.abs(Math.sin(i * 0.7 + seed * 0.31)) * 0.7
  )
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 14 }}>
      {bars.map((h, i) => (
        <div key={i} style={{ width: 2, borderRadius: 1, background: color, height: `${h * 100}%`, opacity: 0.7 }} />
      ))}
    </div>
  )
}

// ── Step progress indicator ───────────────────────────────────────────────────
function StepRow({ index, current, total, label, done, color }) {
  const active = index === current - 1 && current <= total
  const past   = index < current - 1 || done

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {/* node */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background:  past ? color : active ? `${color}22` : 'rgba(255,255,255,0.04)',
          border:      `2px solid ${past || active ? color : 'rgba(255,255,255,0.08)'}`,
          boxShadow:   active ? `0 0 10px ${color}66` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: past ? '#0a0a0f' : active ? color : '#334155',
          fontWeight: 900,
          transition: 'all 0.3s',
        }}>
          {past ? '✓' : index + 1}
        </div>
        {index < STEP_LABELS.length - 1 && (
          <div style={{ width: 2, flex: 1, minHeight: 16, background: past ? color : 'rgba(255,255,255,0.05)', borderRadius: 1, marginTop: 3, transition: 'background 0.3s' }} />
        )}
      </div>
      {/* label */}
      <div style={{ paddingTop: 1, paddingBottom: index < STEP_LABELS.length - 1 ? 14 : 0 }}>
        <p style={{ fontSize: 10.5, fontWeight: active ? 800 : 500, color: past ? '#94a3b8' : active ? '#e2e8f0' : '#334155', margin: 0, lineHeight: 1.4, transition: 'color 0.3s' }}>
          {label}
        </p>
        {active && (
          <p style={{ fontSize: 9, color, margin: '2px 0 0', animation: 'aiCoverPulse 1.4s ease-in-out infinite' }}>
            Processing…
          </p>
        )}
        {past && (
          <p style={{ fontSize: 9, color: '#334155', margin: '2px 0 0' }}>Complete</p>
        )}
      </div>
    </div>
  )
}

export default function AICoverPanel() {
  const {
    sourceFile, sourceUrl, voiceId, pitchShift,
    status, step, totalSteps, message,
    downloadUrl, resultBlob, error,
    setSourceFile, setVoiceId, setPitchShift,
    generate, reset,
  } = useAICoverStore()

  const fileRef    = useRef(null)
  const audioRef   = useRef(null)
  const [playing,  setPlaying]  = useState(false)
  const [resultUrl, setResultUrl] = useState(null)

  // Revoke previous result blob URL on cleanup
  useEffect(() => {
    if (resultBlob) {
      const url = URL.createObjectURL(resultBlob)
      setResultUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [resultBlob])

  const selectedVoice = VOICE_BANK.find(v => v.id === voiceId)
  const accent = selectedVoice?.color ?? '#818cf8'

  const isIdle       = status === 'idle'
  const isUploading  = status === 'uploading'
  const isProcessing = status === 'processing'
  const isDone       = status === 'done'
  const isError      = status === 'error'
  const isBusy       = isUploading || isProcessing

  const pct = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('audio')) setSourceFile(f)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else         { audioRef.current.play();  setPlaying(true)  }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Source song upload ─────────────────────────────────────────────── */}
      <div style={{ padding: '4px 14px 10px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
          Source Song
        </p>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !sourceFile && fileRef.current?.click()}
          style={{
            borderRadius: 10, padding: '10px 12px',
            border: `1px dashed ${sourceFile ? accent + '66' : 'rgba(255,255,255,0.1)'}`,
            background: sourceFile ? `${accent}08` : 'rgba(255,255,255,0.02)',
            cursor: sourceFile ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'all 0.2s',
          }}>
          <Upload size={14} style={{ color: sourceFile ? accent : '#334155', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {sourceFile ? (
              <>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sourceFile.name}
                </p>
                <p style={{ fontSize: 9, color: '#475569', margin: '1px 0 0' }}>
                  {(sourceFile.size / 1_000_000).toFixed(1)} MB
                </p>
              </>
            ) : (
              <p style={{ fontSize: 10.5, color: '#334155', margin: 0 }}>
                Drop song or click to browse
              </p>
            )}
          </div>
          {sourceFile && (
            <button onClick={e => { e.stopPropagation(); setSourceFile(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 2, fontSize: 13, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) setSourceFile(f) }} />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px' }} />

      {/* ── Voice selector ────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
          Replace Vocals With
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {VOICE_BANK.map((v, idx) => {
            const sel = voiceId === v.id
            return (
              <button key={v.id} onClick={() => setVoiceId(v.id)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background:  sel ? `${v.color}15` : 'rgba(255,255,255,0.025)',
                  border:      `1px solid ${sel ? v.color + '55' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow:   sel ? `0 0 14px ${v.color}22` : 'none',
                  transition:  'all 0.18s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>{v.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 800, color: sel ? v.color : '#94a3b8', margin: 0 }}>{v.name}</p>
                    <p style={{ fontSize: 8.5, color: '#334155', margin: 0 }}>{v.genre}</p>
                  </div>
                  {sel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, boxShadow: `0 0 6px ${v.color}` }} />}
                </div>
                {sel && <VoiceWave color={v.color} seed={idx} />}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px' }} />

      {/* ── Pitch shift ───────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Pitch Shift
          </p>
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: pitchShift === 0 ? '#475569' : accent }}>
            {pitchShift > 0 ? '+' : ''}{pitchShift} st
          </span>
        </div>
        <input type="range" min={-12} max={12} step={1} value={pitchShift}
          onChange={e => setPitchShift(+e.target.value)}
          style={{ width: '100%', accentColor: accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 8.5, color: '#1e293b' }}>−12 (lower)</span>
          <span style={{ fontSize: 8.5, color: '#1e293b' }}>+12 (higher)</span>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px 10px' }} />

      {/* ── Generate button ───────────────────────────────────────────────── */}
      <div style={{ padding: '0 14px 10px' }}>
        <button
          onClick={isBusy ? undefined : generate}
          disabled={!sourceFile || !voiceId || isBusy}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 12,
            fontSize: 12, fontWeight: 900, cursor: (!sourceFile || !voiceId || isBusy) ? 'not-allowed' : 'pointer',
            background: isBusy
              ? `rgba(${accent === '#818cf8' ? '129,140,248' : '109,40,217'},0.1)`
              : (!sourceFile || !voiceId)
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${accent}33, ${accent}15)`,
            border: `1px solid ${(!sourceFile || !voiceId) ? 'rgba(255,255,255,0.07)' : accent + '55'}`,
            color: (!sourceFile || !voiceId) ? '#334155' : accent,
            boxShadow: (!sourceFile || !voiceId || isBusy) ? 'none' : `0 0 24px ${accent}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
          {isBusy
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⚙️</span> Processing…</>
            : <><Mic2 size={14} /> Generate AI Cover</>
          }
        </button>
      </div>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      {(isBusy || isDone || isError) && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {isBusy && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Pipeline</p>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: accent }}>{pct}%</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                {STEP_LABELS.map((label, i) => (
                  <StepRow key={i} index={i} current={step} total={totalSteps} label={label} done={isDone} color={accent} />
                ))}
              </div>
              {/* Bar */}
              <div style={{ height: 3, borderRadius: 9, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 9, width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, #6d28d9)`, transition: 'width 0.5s ease' }} />
              </div>
            </>
          )}

          {isDone && resultUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                ✓ AI Cover Ready
              </p>
              <audio ref={audioRef} src={resultUrl} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={togglePlay}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(0,255,136,0.10)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88',
                    fontSize: 11, fontWeight: 800,
                  }}>
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                  {playing ? 'Pause' : 'Play Preview'}
                </button>
                <a href={downloadUrl} download="ai_cover.wav"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer', textDecoration: 'none',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b',
                    fontSize: 11, fontWeight: 800,
                  }}>
                  <Download size={13} />
                </a>
              </div>
              <button onClick={reset}
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 8, cursor: 'pointer',
                  background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#334155',
                  fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                <RefreshCw size={10} /> Start New Cover
              </button>
            </div>
          )}

          {isError && (
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 10, color: '#f87171', fontWeight: 700, margin: '0 0 4px' }}>Pipeline failed</p>
              <p style={{ fontSize: 9, color: '#7f1d1d', margin: '0 0 8px', lineHeight: 1.4 }}>{error}</p>
              <button onClick={reset}
                style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes aiCoverPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
