import { useState, useRef, useEffect } from 'react'
import { useVideoStore, TRACKS, TRACK_STYLE } from '../store/videoStore'

const AUDIO_TRACKS = TRACKS.filter(t => t.type === 'audio' || t.type === 'video')

function VUMeter({ level, isPlaying }) {
  const [db, setDb] = useState(-60)

  useEffect(() => {
    if (!isPlaying) { setDb(-60); return }
    const id = setInterval(() => {
      const target = level * 0.6 - 18 + (Math.random() * 8 - 4)
      setDb(prev => prev + (target - prev) * 0.35)
    }, 80)
    return () => clearInterval(id)
  }, [isPlaying, level])

  const pct = Math.max(0, Math.min(100, (db + 60) / 60 * 100))
  const color = db > -6 ? '#ef4444' : db > -14 ? '#fbbf24' : '#34d399'

  return (
    <div style={{ display: 'flex', gap: 2, height: 80, alignItems: 'flex-end' }}>
      {[0, 1].map(ch => (
        <div key={ch} style={{ width: 5, height: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
          <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: 2, transition: 'height 0.08s, background 0.15s' }} />
        </div>
      ))}
    </div>
  )
}

function KnobPan({ value, onChange }) {
  const dragging  = useRef(false)
  const startY    = useRef(0)
  const startVal  = useRef(0)

  function onMouseDown(e) {
    dragging.current = true
    startY.current   = e.clientY
    startVal.current = value
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  function onMouseMove(e) {
    if (!dragging.current) return
    const dy  = startY.current - e.clientY
    const next = Math.max(-100, Math.min(100, startVal.current + dy * 1.5))
    onChange(Math.round(next))
  }

  function onMouseUp() {
    dragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }

  const angle = (value / 100) * 140
  const rad   = (angle - 90) * (Math.PI / 180)
  const cx = 18, cy = 18, r = 12
  const dotX = cx + Math.cos(rad) * r
  const dotY = cy + Math.sin(rad) * r

  return (
    <svg width={36} height={36} onMouseDown={onMouseDown} style={{ cursor: 'ns-resize', userSelect: 'none' }}>
      <circle cx={cx} cy={cy} r={14} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r} fill="rgba(99,102,241,0.2)" />
      <circle cx={dotX} cy={dotY} r={2.5} fill="#a5b4fc" />
    </svg>
  )
}

function Fader({ volume, onChange }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)

  function onMouseDown(e) {
    dragging.current = true
    e.preventDefault()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  function onMouseMove(e) {
    if (!dragging.current || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct  = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    onChange(Math.round(pct * 150))
  }

  function onMouseUp() {
    dragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }

  const pct    = Math.max(0, Math.min(1, volume / 150))
  const thumbY = (1 - pct) * 100

  const dbLabel = volume === 0 ? '-∞' : volume === 100 ? '0.0' : volume > 100 ? `+${(20 * Math.log10(volume / 100)).toFixed(1)}` : `${(20 * Math.log10(volume / 100)).toFixed(1)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 8, color: '#475569', fontFamily: 'monospace' }}>{dbLabel} dB</span>
      <div ref={trackRef} style={{ position: 'relative', width: 16, height: 100, background: 'rgba(255,255,255,0.05)', borderRadius: 8, cursor: 'pointer' }}
        onMouseDown={onMouseDown}>
        {/* Track groove */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.08)', transform: 'translateX(-50%)' }} />
        {/* 0 dB tick */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '33%', height: 1, background: 'rgba(99,102,241,0.4)' }} />
        {/* Filled track (below thumb) */}
        <div style={{ position: 'absolute', left: '50%', top: `${thumbY}%`, bottom: 0, width: 4, background: 'rgba(99,102,241,0.35)', transform: 'translateX(-50%)', borderRadius: '0 0 2px 2px' }} />
        {/* Thumb */}
        <div style={{ position: 'absolute', left: '50%', top: `${thumbY}%`, transform: 'translate(-50%, -50%)', width: 16, height: 6, background: '#a5b4fc', borderRadius: 3, boxShadow: '0 1px 6px rgba(99,102,241,0.6)' }} />
      </div>
    </div>
  )
}

function ChannelStrip({ track, mixer, isPlaying, onVolume, onPan, onMute, onSolo, soloedTracks }) {
  const mix   = mixer[track.id] ?? { volume: 100, pan: 0, muted: false, soloed: false }
  const style = TRACK_STYLE[track.id] ?? { accent: '#6366f1' }
  const isMuted  = mix.muted
  const isSoloed = soloedTracks.has(track.id)
  const dimmed   = soloedTracks.size > 0 && !isSoloed

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 66, gap: 8, padding: '10px 6px',
      background: dimmed ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.02)',
      borderRight: '1px solid #111118',
      opacity: isMuted ? 0.45 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* Track name */}
      <div style={{ fontSize: 7.5, color: style.accent, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, maxWidth: 54, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.label.replace(/^[^\s]+ /, '')}
      </div>

      {/* VU meter */}
      <VUMeter level={isMuted ? 0 : mix.volume} isPlaying={isPlaying && !isMuted} />

      {/* Pan knob */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <KnobPan value={mix.pan} onChange={v => onPan(track.id, v)} />
        <span style={{ fontSize: 7.5, color: '#475569', fontFamily: 'monospace' }}>
          {mix.pan === 0 ? 'C' : mix.pan > 0 ? `R${mix.pan}` : `L${Math.abs(mix.pan)}`}
        </span>
      </div>

      {/* Fader */}
      <Fader volume={mix.volume} onChange={v => onVolume(track.id, v)} />

      {/* Mute / Solo */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onMute(track.id)} style={{
          width: 22, height: 16, borderRadius: 3, border: 'none', cursor: 'pointer',
          background: isMuted ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.06)',
          color: isMuted ? '#fff' : '#475569', fontSize: 7, fontWeight: 800, fontFamily: 'inherit',
        }}>M</button>
        <button onClick={() => onSolo(track.id)} style={{
          width: 22, height: 16, borderRadius: 3, border: 'none', cursor: 'pointer',
          background: isSoloed ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.06)',
          color: isSoloed ? '#000' : '#475569', fontSize: 7, fontWeight: 800, fontFamily: 'inherit',
        }}>S</button>
      </div>

      {/* Volume readout */}
      <span style={{ fontSize: 7.5, color: '#334155', fontFamily: 'monospace' }}>{mix.volume}%</span>
    </div>
  )
}

export default function VideoAudioMixer() {
  const {
    isPlaying,
    trackMixer, setTrackVolume, setTrackPan,
    setShowAudioMixer,
  } = useVideoStore()

  const [localMixer, setLocalMixer] = useState(() => {
    const m = {}
    AUDIO_TRACKS.forEach(t => { m[t.id] = { volume: 100, pan: 0, muted: false, soloed: false } })
    return m
  })

  const [masterVol, setMasterVol] = useState(100)
  const [masterPan, setMasterPan] = useState(0)

  const soloedTracks = new Set(Object.entries(localMixer).filter(([, v]) => v.soloed).map(([k]) => k))

  function handleVolume(trackId, vol) {
    setLocalMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], volume: vol } }))
    setTrackVolume(trackId, vol)
  }

  function handlePan(trackId, pan) {
    setLocalMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], pan } }))
    setTrackPan(trackId, pan)
  }

  function handleMute(trackId) {
    setLocalMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], muted: !prev[trackId].muted } }))
  }

  function handleSolo(trackId) {
    setLocalMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], soloed: !prev[trackId].soloed } }))
  }

  function handleMuteAll() {
    setLocalMixer(prev => {
      const next = { ...prev }
      const anyUnmuted = Object.values(prev).some(v => !v.muted)
      Object.keys(next).forEach(k => { next[k] = { ...next[k], muted: anyUnmuted } })
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 320,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 820,
        background: '#0d0d18', border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none', borderRadius: '14px 14px 0 0',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #111118', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>Audio Track Mixer</div>
          <div style={{ fontSize: 9.5, color: '#475569', marginLeft: 10 }}>
            {isPlaying ? '▶ Playing' : '⏸ Stopped'}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={handleMuteAll} style={{
            padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#f87171',
            fontSize: 9.5, cursor: 'pointer', fontFamily: 'inherit', marginRight: 8,
          }}>Mute All</button>
          <button onClick={() => setShowAudioMixer(false)} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: 16, fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* dB scale + channel strips */}
        <div style={{ display: 'flex', overflowX: 'auto', minHeight: 0 }}>
          {/* dB ruler */}
          <div style={{ width: 28, flexShrink: 0, padding: '10px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #111118' }}>
            {['+6', '0', '-6', '-12', '-18', '-∞'].map(l => (
              <span key={l} style={{ fontSize: 7, color: '#334155', fontFamily: 'monospace', textAlign: 'right', display: 'block' }}>{l}</span>
            ))}
          </div>

          {/* Tracks */}
          <div style={{ display: 'flex', flex: 1 }}>
            {AUDIO_TRACKS.map(track => (
              <ChannelStrip
                key={track.id}
                track={track}
                mixer={localMixer}
                isPlaying={isPlaying}
                onVolume={handleVolume}
                onPan={handlePan}
                onMute={handleMute}
                onSolo={handleSolo}
                soloedTracks={soloedTracks}
              />
            ))}
          </div>

          {/* Master bus */}
          <div style={{ width: 72, flexShrink: 0, borderLeft: '2px solid rgba(99,102,241,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', gap: 8, background: 'rgba(99,102,241,0.04)' }}>
            <div style={{ fontSize: 7.5, color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Master</div>
            <VUMeter level={masterVol} isPlaying={isPlaying} />
            <KnobPan value={masterPan} onChange={setMasterPan} />
            <Fader volume={masterVol} onChange={setMasterVol} />
            <span style={{ fontSize: 7.5, color: '#475569', fontFamily: 'monospace' }}>{masterVol}%</span>
          </div>
        </div>

        {/* Send / Bus row */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderTop: '1px solid #111118' }}>
          {['Reverb Send', 'Delay Send', 'EQ Bus', 'Compressor'].map(label => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 9, color: '#475569' }}>{label}</span>
              <input type="range" min={0} max={100} defaultValue={0} style={{ width: 50, accentColor: '#6366f1' }} />
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 8.5, color: '#334155', alignSelf: 'center' }}>
            Drag faders to adjust track levels
          </div>
        </div>
      </div>
    </div>
  )
}
