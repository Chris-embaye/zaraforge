import { useState, useRef, useCallback } from 'react'
import { useVideoStore } from '../store/videoStore'

// ── Shared mini-components ────────────────────────────────────────────────────
function VFXSlider({ label, value, min, max, step = 1, unit = '', accent = '#818cf8', onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9.5, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 9.5, color: accent, fontFamily: 'monospace', fontWeight: 700 }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${accent}66, ${accent})` }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}99`, pointerEvents: 'none' }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', margin: 0 }} />
      </div>
    </div>
  )
}

function Toggle({ label, value, accent = '#818cf8', onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
      <span style={{ fontSize: 9.5, color: value ? accent : '#475569' }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 32, height: 17, borderRadius: 99, cursor: 'pointer',
        background: value ? `${accent}44` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${value ? `${accent}66` : 'rgba(255,255,255,0.1)'}`,
        position: 'relative', transition: 'all 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 11, height: 11, borderRadius: '50%',
          background: value ? accent : '#334155',
          left: value ? 17 : 2, transition: 'all 0.2s',
          boxShadow: value ? `0 0 6px ${accent}` : 'none',
        }} />
      </div>
    </div>
  )
}

function VFXHeader({ emoji, title, enabled, accent, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, color: enabled ? accent : '#334155', letterSpacing: '0.04em' }}>
        {emoji} {title}
      </span>
      <div onClick={onToggle} style={{
        width: 34, height: 18, borderRadius: 99, cursor: 'pointer',
        background: enabled ? `${accent}33` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${enabled ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
        position: 'relative', transition: 'all 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%',
          background: enabled ? accent : '#1e293b',
          left: enabled ? 18 : 2, transition: 'all 0.2s',
          boxShadow: enabled ? `0 0 8px ${accent}` : 'none',
        }} />
      </div>
    </div>
  )
}

function Panel({ children, bg = 'rgba(255,255,255,0.02)', border = 'rgba(255,255,255,0.06)' }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 9, background: bg, border: `1px solid ${border}`, marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ── Default VFX state per-effect ──────────────────────────────────────────────
const DEFAULTS = {
  motionBlur: { enabled: false, strength: 30, angle: 0,   samples: 8  },
  matteKeyer: { enabled: false, lumaThreshold: 128, invertLuma: false, alphaEnabled: false, alphaThreshold: 128 },
  glitch:     { enabled: false, displacement: 30, rgbShift: 20, noise: 20, frequency: 40 },
  lens:       { enabled: false, barrel: 0, mirrorH: false, mirrorV: false },
  cornerPin:  { enabled: false, tl: { x: 0, y: 0 }, tr: { x: 100, y: 0 }, bl: { x: 0, y: 100 }, br: { x: 100, y: 100 } },
}

function useVFX(clipId, effect) {
  const clipVFX = useVideoStore(s => s.clipVFX)
  const setClipVFX = useVideoStore(s => s.setClipVFX)
  const data = { ...DEFAULTS[effect], ...(clipVFX[clipId]?.[effect] ?? {}) }
  const set = (key, val) => setClipVFX(clipId, effect, key, val)
  return [data, set]
}

// ── 1. Optical Motion Blur ────────────────────────────────────────────────────
function MotionBlurPanel({ clipId }) {
  const [vfx, set] = useVFX(clipId, 'motionBlur')
  const DIRECTIONS = [
    { angle: 0, label: '→' }, { angle: 45, label: '↗' }, { angle: 90, label: '↑' }, { angle: 135, label: '↖' },
    { angle: 180, label: '←' }, { angle: 225, label: '↙' }, { angle: 270, label: '↓' }, { angle: 315, label: '↘' },
  ]
  return (
    <Panel bg={vfx.enabled ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.02)'} border={vfx.enabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}>
      <VFXHeader emoji="💨" title="Optical Motion Blur" enabled={vfx.enabled} accent="#818cf8" onToggle={() => set('enabled', !vfx.enabled)} />
      {vfx.enabled && (
        <>
          <VFXSlider label="Blur Strength" value={vfx.strength} min={0} max={100} unit="%" accent="#818cf8" onChange={v => set('strength', v)} />
          <VFXSlider label="Samples"       value={vfx.samples}  min={4} max={32}  unit="" accent="#818cf8" onChange={v => set('samples', v)} />
          <div style={{ marginBottom: 3 }}>
            <span style={{ fontSize: 9.5, color: '#475569', display: 'block', marginBottom: 5 }}>Direction</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2 }}>
              {DIRECTIONS.map(d => (
                <button key={d.angle} onClick={() => set('angle', d.angle)} style={{
                  padding: '4px 0', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  background: vfx.angle === d.angle ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${vfx.angle === d.angle ? 'rgba(129,140,248,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  color: vfx.angle === d.angle ? '#a5b4fc' : '#475569',
                }}>{d.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 6, padding: '5px 8px', borderRadius: 6, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', fontSize: 9, color: '#818cf8' }}>
            CSS filter: blur({Math.round(vfx.strength * 0.12)}px) rotate({vfx.angle}deg)
          </div>
        </>
      )}
    </Panel>
  )
}

// ── 2. Luma & Alpha Matte Keyer ──────────────────────────────────────────────
function MatteKeyerPanel({ clipId }) {
  const [vfx, set] = useVFX(clipId, 'matteKeyer')
  return (
    <Panel bg={vfx.enabled ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)'} border={vfx.enabled ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}>
      <VFXHeader emoji="🦹" title="Luma & Alpha Matte Keyer" enabled={vfx.enabled} accent="#34d399" onToggle={() => set('enabled', !vfx.enabled)} />
      {vfx.enabled && (
        <>
          <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Luminance Matte</div>
          <VFXSlider label="Luma Threshold" value={vfx.lumaThreshold} min={0} max={255} unit="" accent="#34d399" onChange={v => set('lumaThreshold', v)} />
          <Toggle label="Invert Luma Key" value={vfx.invertLuma} accent="#34d399" onChange={v => set('invertLuma', v)} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Alpha Channel</div>
            <Toggle label="Enable Alpha Matte" value={vfx.alphaEnabled} accent="#34d399" onChange={v => set('alphaEnabled', v)} />
            {vfx.alphaEnabled && (
              <VFXSlider label="Alpha Threshold" value={vfx.alphaThreshold} min={0} max={255} unit="" accent="#34d399" onChange={v => set('alphaThreshold', v)} />
            )}
          </div>
          <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', fontSize: 9, color: '#34d399' }}>
            Pixels below luma={vfx.lumaThreshold} → transparent
          </div>
        </>
      )}
    </Panel>
  )
}

// ── 3. Bad TV / VHS Glitch Art ───────────────────────────────────────────────
function GlitchPanel({ clipId }) {
  const [vfx, set] = useVFX(clipId, 'glitch')
  return (
    <Panel bg={vfx.enabled ? 'rgba(248,113,113,0.04)' : 'rgba(255,255,255,0.02)'} border={vfx.enabled ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}>
      <VFXHeader emoji="📺" title="Bad TV / VHS Glitch" enabled={vfx.enabled} accent="#f87171" onToggle={() => set('enabled', !vfx.enabled)} />
      {vfx.enabled && (
        <>
          <VFXSlider label="Horizontal Displacement" value={vfx.displacement} min={0} max={100} unit="%" accent="#f87171" onChange={v => set('displacement', v)} />
          <VFXSlider label="RGB Channel Shift"       value={vfx.rgbShift}     min={0} max={100} unit="%" accent="#f472b6" onChange={v => set('rgbShift', v)} />
          <VFXSlider label="Static Noise"            value={vfx.noise}        min={0} max={100} unit="%" accent="#fbbf24" onChange={v => set('noise', v)} />
          <VFXSlider label="Glitch Frequency"        value={vfx.frequency}    min={0} max={100} unit="%" accent="#f87171" onChange={v => set('frequency', v)} />
          <div style={{ height: 28, borderRadius: 5, background: '#000', overflow: 'hidden', position: 'relative', marginTop: 4 }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(255,0,60,${vfx.rgbShift/400}) 0%, transparent 30%, rgba(0,255,200,${vfx.rgbShift/400}) 70%, transparent 100%)`, animation: 'vfxGlitch 0.3s steps(2) infinite' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)', opacity: vfx.noise / 100 }} />
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#f87171', fontWeight: 700 }}>VHS PREVIEW</span>
          </div>
        </>
      )}
    </Panel>
  )
}

// ── 4. Lens Distortion & Mirror ───────────────────────────────────────────────
function LensPanel({ clipId }) {
  const [vfx, set] = useVFX(clipId, 'lens')
  return (
    <Panel bg={vfx.enabled ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.02)'} border={vfx.enabled ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}>
      <VFXHeader emoji="🪞" title="Lens Distortion & Mirror" enabled={vfx.enabled} accent="#fbbf24" onToggle={() => set('enabled', !vfx.enabled)} />
      {vfx.enabled && (
        <>
          <VFXSlider label="Barrel / Pincushion" value={vfx.barrel} min={-100} max={100} unit="" accent="#fbbf24" onChange={v => set('barrel', v)} />
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            {[
              { key: 'mirrorH', label: '↔ Mirror H' },
              { key: 'mirrorV', label: '↕ Mirror V' },
            ].map(m => (
              <button key={m.key} onClick={() => set(m.key, !vfx[m.key])} style={{
                flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 9.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: vfx[m.key] ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${vfx[m.key] ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: vfx[m.key] ? '#fbbf24' : '#475569',
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{ marginTop: 7, padding: '5px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 9, color: '#fbbf24' }}>
            {vfx.barrel > 0 ? `Barrel distortion +${vfx.barrel}` : vfx.barrel < 0 ? `Pincushion ${vfx.barrel}` : 'No distortion'}
            {(vfx.mirrorH || vfx.mirrorV) && ` · mirror ${vfx.mirrorH ? 'H' : ''}${vfx.mirrorV ? 'V' : ''}`}
          </div>
        </>
      )}
    </Panel>
  )
}

// ── 5. Corner Pinning (4-handle perspective warp) ─────────────────────────────
const CORNERS = [
  { key: 'tl', label: 'TL', stylePos: { top: 2, left: 2 }   },
  { key: 'tr', label: 'TR', stylePos: { top: 2, right: 2 }  },
  { key: 'bl', label: 'BL', stylePos: { bottom: 2, left: 2 }  },
  { key: 'br', label: 'BR', stylePos: { bottom: 2, right: 2 } },
]

function CornerPinPanel({ clipId }) {
  const [vfx, set] = useVFX(clipId, 'cornerPin')
  const previewRef = useRef(null)
  const dragging   = useRef(null)

  const handleMouseDown = useCallback((e, cornerKey) => {
    e.preventDefault()
    dragging.current = cornerKey
    const onMove = (mv) => {
      if (!dragging.current || !previewRef.current) return
      const rect = previewRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((mv.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((mv.clientY - rect.top) / rect.height) * 100))
      set(dragging.current, { x: Math.round(x), y: Math.round(y) })
    }
    const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [set])

  const corners = {
    tl: { ...DEFAULTS.cornerPin.tl, ...(vfx.tl ?? {}) },
    tr: { ...DEFAULTS.cornerPin.tr, ...(vfx.tr ?? {}) },
    bl: { ...DEFAULTS.cornerPin.bl, ...(vfx.bl ?? {}) },
    br: { ...DEFAULTS.cornerPin.br, ...(vfx.br ?? {}) },
  }

  return (
    <Panel bg={vfx.enabled ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.02)'} border={vfx.enabled ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}>
      <VFXHeader emoji="🎭" title="Corner Pinning" enabled={vfx.enabled} accent="#00e5ff" onToggle={() => set('enabled', !vfx.enabled)} />
      {vfx.enabled && (
        <>
          {/* Interactive preview */}
          <div ref={previewRef} style={{ height: 80, borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', marginBottom: 8, userSelect: 'none' }}>
            {/* Quad lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
              <polygon
                points={`${corners.tl.x}%,${corners.tl.y}% ${corners.tr.x}%,${corners.tr.y}% ${corners.br.x}%,${corners.br.y}% ${corners.bl.x}%,${corners.bl.y}%`}
                fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.5)" strokeWidth="1" strokeDasharray="3 2" />
            </svg>
            {/* Corner handles */}
            {CORNERS.map(c => {
              const corner = corners[c.key]
              return (
                <div key={c.key}
                  onMouseDown={e => handleMouseDown(e, c.key)}
                  style={{
                    position: 'absolute',
                    left: `${corner.x}%`, top: `${corner.y}%`,
                    transform: 'translate(-50%,-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#00e5ff', border: '2px solid #fff',
                    cursor: 'grab', zIndex: 2, boxShadow: '0 0 8px rgba(0,229,255,0.8)',
                  }}>
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 800, color: '#00e5ff', whiteSpace: 'nowrap' }}>{c.label}</div>
                </div>
              )
            })}
          </div>
          {/* Numeric readout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {CORNERS.map(c => {
              const corner = corners[c.key]
              return (
                <div key={c.key} style={{ padding: '3px 6px', borderRadius: 5, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', fontSize: 8.5, fontFamily: 'monospace', color: '#00e5ff' }}>
                  {c.label} {corner.x},{corner.y}
                </div>
              )
            })}
          </div>
          <button onClick={() => {
            set('tl', { x: 0, y: 0 }); set('tr', { x: 100, y: 0 })
            set('bl', { x: 0, y: 100 }); set('br', { x: 100, y: 100 })
          }} style={{
            width: '100%', marginTop: 7, padding: '5px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
            cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', color: '#475569', fontFamily: 'inherit',
          }}>Reset to Corners</button>
        </>
      )}
    </Panel>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VideoVFXPanel({ clipId }) {
  if (!clipId) {
    return (
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ fontSize: 9.5, color: '#1e3a5f', textAlign: 'center', padding: '10px 0' }}>
          Select a clip to apply VFX
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 10px 8px' }}>
      <MotionBlurPanel clipId={clipId} />
      <MatteKeyerPanel clipId={clipId} />
      <GlitchPanel     clipId={clipId} />
      <LensPanel       clipId={clipId} />
      <CornerPinPanel  clipId={clipId} />
      <style>{`
        @keyframes vfxGlitch { 0%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 100%{transform:translateX(-3px)} }
      `}</style>
    </div>
  )
}
