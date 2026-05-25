import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { useVideoStore } from '../store/videoStore'
import VideoVFXPanel from './VideoVFXPanel'

// ── Industry LUTs ─────────────────────────────────────────────────────────────
const CINEMA_LUTS = [
  { id: 'None',               label: 'None (Linear)',            color: '#334155' },
  { id: 'LogToRec709',        label: 'Log-to-Rec709',           color: '#60a5fa' },
  { id: 'TealOrange',         label: 'Teal & Orange Blockbuster',color: '#fb923c' },
  { id: 'VintageKodachrome',  label: 'Vintage Kodachrome',       color: '#f472b6' },
  { id: 'BleachBypass',       label: 'Bleach Bypass',            color: '#94a3b8' },
  { id: 'CyberpunkNeon',      label: 'Cyberpunk Neon',           color: '#a78bfa' },
]

// ── FX Presets ────────────────────────────────────────────────────────────────
const FX_PRESETS = [
  {
    id: 'glitch', label: 'Glitch Shift', desc: 'RGB split + digital tear', accent: '#f87171',
    preview: (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#ff003c22,transparent,#00ffc822)', animation: 'fxGlitch 0.35s steps(2) infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, opacity: 0.7 }}>⚡</span>
        </div>
      </div>
    ),
  },
  {
    id: 'zoom', label: 'Cinematic Zoom Blur', desc: 'Radial zoom on beat', accent: '#818cf8',
    preview: (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', animation: 'fxZoom 1.2s ease-in-out infinite' }} />
        <span style={{ fontSize: 18, opacity: 0.7 }}>🔍</span>
      </div>
    ),
  },
  {
    id: 'shake', label: 'Vintage Film Shake', desc: 'Grain, vignette, jitter', accent: '#fbbf24',
    preview: (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)', animation: 'fxShake 0.2s ease-in-out infinite' }} />
        <span style={{ fontSize: 18, opacity: 0.7, position: 'relative' }}>🎞</span>
      </div>
    ),
  },
  {
    id: 'neon', label: 'Phasing Neon Glow', desc: 'Chromatic neon pulse', accent: '#a78bfa',
    preview: (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 20px rgba(99,102,241,0.4), inset 0 0 40px rgba(0,229,255,0.2)', animation: 'fxNeon 1.5s ease-in-out infinite' }} />
        <span style={{ fontSize: 18, opacity: 0.9, filter: 'drop-shadow(0 0 6px #00e5ff)' }}>💜</span>
      </div>
    ),
  },
]

const BLENDS = ['Normal', 'Multiply', 'Screen', 'Overlay', 'Soft Light', 'Hard Light', 'Color Dodge', 'Color Burn', 'Darken', 'Lighten', 'Difference', 'Exclusion', 'Hue', 'Saturation', 'Color', 'Luminosity']

const TRANSITIONS = [
  { id: 'cut',      label: 'Hard Cut',      emoji: '✂️' },
  { id: 'dissolve', label: 'Cross Dissolve', emoji: '🌊' },
  { id: 'push',     label: 'Push Slide',    emoji: '➡️' },
  { id: 'zoom',     label: 'Zoom In/Out',   emoji: '🔍' },
  { id: 'wipe',     label: 'Wipe',          emoji: '📐' },
  { id: 'dip',      label: 'Dip to Black',  emoji: '⬛' },
]

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #111118' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: accent ?? '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {title}
        </span>
        <span style={{ fontSize: 9, color: '#1e3a5f', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  )
}

function FxCard({ preset, activeFX, onApply }) {
  const active = activeFX === preset.id
  return (
    <div
      onClick={() => onApply(active ? null : preset.id)}
      style={{
        borderRadius: 8,
        border: `1px solid ${active ? `${preset.accent}55` : 'rgba(255,255,255,0.06)'}`,
        background: active ? `${preset.accent}12` : 'rgba(255,255,255,0.02)',
        overflow: 'hidden', cursor: 'pointer', marginBottom: 6,
        transition: 'all 0.18s',
        boxShadow: active ? `0 0 12px ${preset.accent}22` : 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
    >
      <div style={{ height: 44, position: 'relative', background: '#000', overflow: 'hidden' }}>
        {preset.preview}
      </div>
      <div style={{ padding: '5px 8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: active ? preset.accent : '#475569' }}>{preset.label}</div>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>{preset.desc}</div>
        </div>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          background: active ? preset.accent : 'rgba(255,255,255,0.07)',
          border: `1px solid ${active ? preset.accent : 'rgba(255,255,255,0.1)'}`,
          boxShadow: active ? `0 0 8px ${preset.accent}` : 'none',
          transition: 'all 0.18s',
        }} />
      </div>
    </div>
  )
}

// ── AI Color Palette Extractor ────────────────────────────────────────────────
function ColorPaletteSection() {
  const { colorSwatches, setColorSwatches, colorHarmonyEnabled, setColorHarmonyEnabled } = useVideoStore()
  const [dragOver, setDragOver] = useState(false)
  const [imgThumb, setImgThumb] = useState(null)
  const fileRef = useRef(null)

  function extractColors(file) {
    const url = URL.createObjectURL(file)
    setImgThumb(url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 60; canvas.height = 60
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 60, 60)
      const pts = [[8,8],[52,8],[30,30],[8,52],[52,52]]
      const swatches = pts.map(([x, y]) => {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
      })
      setColorSwatches(swatches)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setColorSwatches(['#1a1a2e','#4338ca','#7c3aed','#db2777','#f59e0b'])
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) extractColors(file)
  }

  return (
    <div style={{ padding: '4px 12px 12px' }}>
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.4, marginBottom: 10 }}>
        Drop any landscape, film still, or mood board to extract its dominant color palette.
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          height: 70, borderRadius: 8, cursor: 'pointer', overflow: 'hidden',
          border: `1.5px dashed ${dragOver ? 'rgba(244,114,182,0.8)' : 'rgba(244,114,182,0.3)'}`,
          background: imgThumb
            ? `url(${imgThumb}) center/cover no-repeat`
            : dragOver ? 'rgba(244,114,182,0.1)' : 'rgba(244,114,182,0.04)',
          transition: 'all 0.18s', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={e => { if (e.target.files[0]) extractColors(e.target.files[0]); e.target.value='' }} style={{ display:'none' }} />
        {!imgThumb && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>🖼️</div>
            <div style={{ fontSize: 8.5, color: '#475569', fontWeight: 700 }}>Drop reference image</div>
          </div>
        )}
        {imgThumb && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, color:'#e2e8f0', fontWeight:800 }}>🎨 Palette extracted</span>
          </div>
        )}
      </div>

      {/* Swatches */}
      {colorSwatches.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Extracted Palette
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {colorSwatches.map((hex, i) => (
              <div key={i} title={hex} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: 28, borderRadius: 6,
                  background: hex, border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: `0 0 8px ${hex}55`,
                  cursor: 'pointer', transition: 'transform 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scaleY(1.15)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
                />
                <span style={{ fontSize: 7.5, fontFamily: 'monospace', color: '#334155' }}>{hex}</span>
              </div>
            ))}
          </div>

          {/* Apply toggle */}
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 9px', borderRadius: 7,
            background: colorHarmonyEnabled ? 'rgba(244,114,182,0.08)' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${colorHarmonyEnabled ? 'rgba(244,114,182,0.3)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.2s',
          }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: colorHarmonyEnabled ? '#f472b6' : '#475569' }}>
                Apply Color Harmony
              </div>
              <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>Blends LUT matrix over project</div>
            </div>
            <div onClick={() => setColorHarmonyEnabled(!colorHarmonyEnabled)} style={{
              width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
              background: colorHarmonyEnabled ? 'rgba(244,114,182,0.4)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${colorHarmonyEnabled ? 'rgba(244,114,182,0.6)' : 'rgba(255,255,255,0.1)'}`,
              position: 'relative', transition: 'all 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
                background: colorHarmonyEnabled ? '#f472b6' : '#334155',
                left: colorHarmonyEnabled ? 16 : 2, transition: 'all 0.2s',
                boxShadow: colorHarmonyEnabled ? '0 0 8px rgba(244,114,182,0.8)' : 'none',
              }} />
            </div>
          </div>

          {colorHarmonyEnabled && (
            <div style={{
              marginTop: 6, padding: '6px 9px', borderRadius: 7,
              background: 'linear-gradient(90deg,' + colorSwatches.map(c => c + '22').join(',') + ')',
              border: '1px solid rgba(244,114,182,0.2)',
              fontSize: 9, color: '#f472b6', fontWeight: 700,
            }}>
              🎨 Custom LUT blend matrix active — applied to all video layers
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AI Face Mosaic Section ────────────────────────────────────────────────────
function FaceMosaicSection() {
  const { faceMosaicEnabled, setFaceMosaicEnabled, faceMosaicStyle, setFaceMosaicStyle, faceMosaicStrength, setFaceMosaicStrength } = useVideoStore()

  const STYLES = [
    { id: 'pixel', label: '⬛ Pixelate', desc: 'Digital grid' },
    { id: 'blur',  label: '🌫️ Gaussian', desc: 'Soft circle' },
    { id: 'bar',   label: '▬ Privacy Bar', desc: 'Cinematic black' },
  ]

  return (
    <div style={{ padding: '4px 12px 12px' }}>
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.4, marginBottom: 10 }}>
        Detects faces via AI and renders a privacy overlay tracking each subject's movement across the timeline.
      </div>

      {/* Main toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 8, marginBottom: 10,
        background: faceMosaicEnabled ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${faceMosaicEnabled ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: faceMosaicEnabled ? '#818cf8' : '#475569' }}>
            Intelligent Face Detection Blur
          </div>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>
            {faceMosaicEnabled ? 'Active — tracking on Program Monitor' : 'Inactive'}
          </div>
        </div>
        <div onClick={() => setFaceMosaicEnabled(!faceMosaicEnabled)} style={{
          width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
          background: faceMosaicEnabled ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${faceMosaicEnabled ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
            background: faceMosaicEnabled ? '#818cf8' : '#334155',
            left: faceMosaicEnabled ? 16 : 2, transition: 'all 0.2s',
            boxShadow: faceMosaicEnabled ? '0 0 8px rgba(129,140,248,0.8)' : 'none',
          }} />
        </div>
      </div>

      {faceMosaicEnabled && (
        <>
          {/* Style selector */}
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Blur Style
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {STYLES.map(s => (
              <div
                key={s.id}
                onClick={() => setFaceMosaicStyle(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                  background: faceMosaicStyle === s.id ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${faceMosaicStyle === s.id ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s',
                }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: faceMosaicStyle === s.id ? '#818cf8' : '#475569' }}>{s.label}</div>
                  <div style={{ fontSize: 8, color: '#334155' }}>{s.desc}</div>
                </div>
                {faceMosaicStyle === s.id && (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(129,140,248,0.2)', border: '1.5px solid #818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#818cf8' }}>✓</div>
                )}
              </div>
            ))}
          </div>

          {/* Strength slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9.5, color: '#475569' }}>Blur Strength</span>
              <span style={{ fontSize: 9.5, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>{faceMosaicStrength}%</span>
            </div>
            <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 99, width: `${faceMosaicStrength}%`, background: 'linear-gradient(90deg,#818cf866,#818cf8)' }} />
              <input
                type="range" min={10} max={100} step={5} value={faceMosaicStrength}
                onChange={e => setFaceMosaicStrength(+e.target.value)}
                style={{ position:'absolute', inset:0, width:'100%', opacity:0, cursor:'pointer', height:'100%', margin:0 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontSize: 8, color: '#1e3a5f' }}>Subtle</span>
              <span style={{ fontSize: 8, color: '#1e3a5f' }}>Maximum</span>
            </div>
          </div>

          {/* Status */}
          <div style={{
            marginTop: 10, padding: '6px 9px', borderRadius: 7,
            background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', animation: 'facePulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 8.5, color: '#94a3b8', lineHeight: 1.4 }}>
              AI bounding box rendered on Program Monitor · {faceMosaicStrength > 70 ? 'Heavy' : faceMosaicStrength > 40 ? 'Medium' : 'Light'} {STYLES.find(s => s.id === faceMosaicStyle)?.desc} active
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Color slider with track & label ──────────────────────────────────────────
function ColorSlider({ label, value, min, max, step = 1, unit = '', accent = '#6366f1', onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  const sign = value > 0 ? '+' : ''
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9.5, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 9.5, color: value !== 0 ? accent : '#334155', fontFamily: 'monospace', fontWeight: 700 }}>
          {sign}{value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${accent}66, ${accent})`,
          transition: 'width 0.05s',
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
          left: `${pct}%`,
          width: 10, height: 10, borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 6px ${accent}99`,
          pointerEvents: 'none',
          transition: 'left 0.05s',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', margin: 0 }}
        />
      </div>
    </div>
  )
}

// ── Three-way color wheel (HSL polar picker) ──────────────────────────────────
function ColorWheel({ label, value, onChange }) {
  const SIZE = 58
  const cx   = SIZE / 2
  const R    = cx - 4
  const divRef     = useRef(null)
  const isDragging = useRef(false)
  const cbRef      = useRef(onChange)
  cbRef.current    = onChange

  const compute = useCallback((e) => {
    if (!divRef.current) return
    const rect  = divRef.current.getBoundingClientRect()
    const x     = e.clientX - rect.left - cx
    const y     = e.clientY - rect.top  - cx
    const angle = Math.atan2(y, x) * (180 / Math.PI)
    const dist  = Math.min(Math.sqrt(x * x + y * y) / R, 1)
    cbRef.current({ angle, dist })
  }, [cx, R])

  useEffect(() => {
    const onMove = (e) => { if (isDragging.current) compute(e) }
    const onUp   = ()  => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [compute])

  const dotX = cx + Math.cos(value.angle * Math.PI / 180) * value.dist * R
  const dotY = cx + Math.sin(value.angle * Math.PI / 180) * value.dist * R

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        ref={divRef}
        onMouseDown={(e) => { isDragging.current = true; compute(e) }}
        style={{
          width: SIZE, height: SIZE, borderRadius: '50%', position: 'relative',
          cursor: 'crosshair', userSelect: 'none', flexShrink: 0,
          background: 'conic-gradient(red 0deg, yellow 60deg, lime 120deg, cyan 180deg, blue 240deg, magenta 300deg, red 360deg)',
          boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.12), 0 3px 10px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, transparent 52%, rgba(0,0,0,0.28) 100%)', pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', left: dotX - 5, top: dotY - 5,
          width: 10, height: 10, borderRadius: '50%',
          background: 'white', border: '1.5px solid rgba(0,0,0,0.55)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }} />
      </div>
      <span style={{ fontSize: 8.5, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
    </div>
  )
}

// ── Cinematic Color Grading Panel (Lumetri-style) ─────────────────────────────
function LumetriPanel() {
  const { activeLUT, setActiveLUT, colorGrade, setColorGrade, colorWheels, setColorWheel } = useVideoStore()

  const activeLUTObj = CINEMA_LUTS.find(l => l.id === activeLUT) ?? CINEMA_LUTS[0]

  return (
    <div style={{ padding: '0 12px 8px' }}>

      {/* LUT dropdown */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>LUT Preset</div>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: activeLUTObj.color,
            boxShadow: `0 0 5px ${activeLUTObj.color}`,
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', zIndex: 1,
          }} />
          <select
            value={activeLUT}
            onChange={e => setActiveLUT(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px 6px 26px', borderRadius: 7,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeLUT !== 'None' ? `${activeLUTObj.color}44` : 'rgba(255,255,255,0.08)'}`,
              color: activeLUT !== 'None' ? activeLUTObj.color : '#64748b',
              fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              appearance: 'none',
            }}>
            {CINEMA_LUTS.map(l => <option key={l.id} value={l.id} style={{ background: '#0c0c15' }}>{l.label}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: 9, pointerEvents: 'none' }}>▾</span>
        </div>
      </div>

      {/* Micro-adjustment sliders */}
      <div style={{ borderTop: '1px solid #111118', paddingTop: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Exposure & Tone</div>
        <ColorSlider label="Exposure"     value={colorGrade.exposure}    min={-30} max={30} step={1} unit=" EV"  accent="#fde68a" onChange={v => setColorGrade('exposure', v)} />
        <ColorSlider label="Highlights"   value={colorGrade.highlights}  min={-100} max={100}        unit=""    accent="#e2e8f0" onChange={v => setColorGrade('highlights', v)} />
        <ColorSlider label="Shadows"      value={colorGrade.shadows}     min={-100} max={100}        unit=""    accent="#818cf8" onChange={v => setColorGrade('shadows', v)} />
      </div>

      <div style={{ borderTop: '1px solid #111118', paddingTop: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>White Balance</div>
        <ColorSlider label="Temperature"  value={colorGrade.temperature} min={-100} max={100}        unit="K"   accent="#fb923c" onChange={v => setColorGrade('temperature', v)} />
        <ColorSlider label="Tint"         value={colorGrade.tint}        min={-100} max={100}        unit=""    accent="#f472b6" onChange={v => setColorGrade('tint', v)} />
      </div>

      {/* Three-way color wheels */}
      <div style={{ borderTop: '1px solid #111118', paddingTop: 10 }}>
        <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Three-Way Color Wheels</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {['shadows', 'midtones', 'highlights'].map(w => (
            <ColorWheel
              key={w}
              label={w}
              value={colorWheels[w]}
              onChange={data => setColorWheel(w, data)}
            />
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <button
            onClick={() => {
              ['shadows','midtones','highlights'].forEach(w =>
                setColorWheel(w, { angle: 0, dist: 0 })
              )
              ['exposure','highlights','shadows','temperature','tint'].forEach(k =>
                setColorGrade(k, 0)
              )
              setActiveLUT('None')
            }}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)', color: '#475569', fontFamily: 'inherit',
            }}>
            Reset All
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Advanced Chroma Key (Ultra Key) Panel ─────────────────────────────────────
function ChromaKeyPanel() {
  const { chromaKey, setChromaKey } = useVideoStore()

  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Enable toggle + color swatch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Eyedropper */}
          <button
            onClick={() => setChromaKey('eyedropperActive', !chromaKey.eyedropperActive)}
            title="Sample background color from monitor"
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: chromaKey.eyedropperActive ? 'rgba(0,229,255,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${chromaKey.eyedropperActive ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: 'all 0.15s',
            }}>
            🔍
          </button>
          {/* Color swatch */}
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: chromaKey.color,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 10px ${chromaKey.color}66`,
            position: 'relative', overflow: 'hidden', cursor: 'pointer',
          }}>
            <input
              type="color" value={chromaKey.color}
              onChange={e => setChromaKey('color', e.target.value)}
              style={{ position: 'absolute', inset: '-4px', opacity: 0, cursor: 'pointer', width: '200%', height: '200%' }}
            />
          </div>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace' }}>{chromaKey.color.toUpperCase()}</span>
        </div>
        {/* Enable toggle */}
        <div
          onClick={() => setChromaKey('enabled', !chromaKey.enabled)}
          style={{
            width: 34, height: 18, borderRadius: 99, cursor: 'pointer',
            background: chromaKey.enabled ? 'rgba(0,229,255,0.28)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${chromaKey.enabled ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
            position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          }}>
          <div style={{
            position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
            background: chromaKey.enabled ? '#00e5ff' : '#334155',
            left: chromaKey.enabled ? 18 : 2, transition: 'all 0.2s',
            boxShadow: chromaKey.enabled ? '0 0 6px rgba(0,229,255,0.7)' : 'none',
          }} />
        </div>
      </div>

      {chromaKey.eyedropperActive && (
        <div style={{
          padding: '6px 8px', borderRadius: 6, marginBottom: 10,
          background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
          fontSize: 9, color: '#00e5ff', textAlign: 'center',
        }}>
          Click a pixel on the Program Monitor to sample
        </div>
      )}

      {/* Matte Generation */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Matte Generation</div>
      <ColorSlider label="Pedestal"  value={chromaKey.pedestal}  min={0} max={100} accent="#34d399" onChange={v => setChromaKey('pedestal', v)} />
      <ColorSlider label="Tolerance" value={chromaKey.tolerance} min={0} max={100} accent="#34d399" onChange={v => setChromaKey('tolerance', v)} />

      {/* Matte Cleanup */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, marginTop: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Matte Cleanup</div>
      <ColorSlider label="Choke"  value={chromaKey.choke}  min={0} max={100} accent="#f472b6" onChange={v => setChromaKey('choke', v)} />
      <ColorSlider label="Soften" value={chromaKey.soften} min={0} max={100} accent="#f472b6" onChange={v => setChromaKey('soften', v)} />

      {/* Spill Suppression */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, marginTop: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Spill Suppression</div>
      <ColorSlider label="Suppression" value={chromaKey.spillSuppression} min={0} max={100} accent="#fb923c" onChange={v => setChromaKey('spillSuppression', v)} />

      {/* Status */}
      {chromaKey.enabled && (
        <div style={{
          marginTop: 8, padding: '5px 8px', borderRadius: 6,
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          fontSize: 9.5, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'chromaPulse 1.2s ease-in-out infinite' }} />
          Ultra Key Active — Subject Isolated
        </div>
      )}
    </div>
  )
}

// ── Motion Tracker Panel (in right sidebar) ───────────────────────────────────
function MotionTrackerPanel() {
  const { motionTracker, setMotionTracker, startMotionTracking } = useVideoStore()

  const BIND_EFFECTS = [
    { id: null,   label: 'None',          icon: '—'  },
    { id: 'blur', label: 'Privacy Blur',  icon: '🔲' },
    { id: 'glow', label: 'Neon Glow',     icon: '✨' },
    { id: 'text', label: 'Text Layer',    icon: '🔤' },
  ]

  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Status */}
      <div style={{
        padding: '7px 9px', borderRadius: 7, marginBottom: 10,
        background: motionTracker.active ? 'rgba(0,229,255,0.07)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${motionTracker.active ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
        fontSize: 9.5, color: motionTracker.active ? '#00e5ff' : '#334155',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 12 }}>{motionTracker.active ? '🎯' : '⬜'}</span>
        {motionTracker.tracking
          ? `Analyzing... ${Math.round(motionTracker.progress * 100)}%`
          : motionTracker.active
            ? 'Track active — Subject #1 locked'
            : 'Draw bbox on Program Monitor, then Analyze'}
      </div>

      {/* Progress bar when tracking */}
      {motionTracker.tracking && (
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginBottom: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'linear-gradient(90deg, #00e5ff, #6366f1)',
            width: `${motionTracker.progress * 100}%`, transition: 'width 0.1s linear',
          }} />
        </div>
      )}

      {/* Analyze button */}
      {!motionTracker.active && (
        <button
          onClick={startMotionTracking}
          disabled={motionTracker.tracking}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 10,
            cursor: motionTracker.tracking ? 'default' : 'pointer',
            fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
            background: motionTracker.tracking ? 'rgba(0,229,255,0.05)' : 'linear-gradient(90deg, rgba(0,229,255,0.18), rgba(99,102,241,0.18))',
            color: motionTracker.tracking ? '#334155' : '#00e5ff',
            border: `1px solid ${motionTracker.tracking ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.25)'}`,
          }}>
          {motionTracker.tracking ? '⌛ Analyzing Frames…' : '🎯 Analyze & Track'}
        </button>
      )}

      {/* Bind effect selector */}
      {motionTracker.active && (
        <>
          <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bind Effect to Path</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            {BIND_EFFECTS.map(be => {
              const active = motionTracker.bindEffect === be.id
              return (
                <button key={String(be.id)} onClick={() => setMotionTracker('bindEffect', be.id)} style={{
                  padding: '6px 4px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#a5b4fc' : '#334155',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 13 }}>{be.icon}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700 }}>{be.label}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setMotionTracker('active', false)}
            style={{
              width: '100%', padding: '5px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
              cursor: 'pointer', border: '1px solid rgba(248,113,113,0.2)',
              background: 'rgba(248,113,113,0.07)', color: '#f87171', fontFamily: 'inherit',
            }}>
            Clear Tracker
          </button>
        </>
      )}
    </div>
  )
}

// ── Dolby Audio Mastering Panel ───────────────────────────────────────────────
function AudioMasterPanel() {
  const { audioMaster, setAudioMaster } = useVideoStore()

  const compBands = [
    { key: 'compLow',  label: 'LOW',  accent: '#34d399' },
    { key: 'compMid',  label: 'MID',  accent: '#60a5fa' },
    { key: 'compHigh', label: 'HIGH', accent: '#f87171' },
  ]

  return (
    <div style={{ padding: '0 12px 10px' }}>

      {/* De-Esser */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vocal Processing</div>
      <ColorSlider label="De-Esser (Sibilance Reduction)" value={audioMaster.deEsser} min={0} max={100} unit="%" accent="#fbbf24" onChange={v => setAudioMaster('deEsser', v)} />

      {/* Dialogue Enhancer toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 9px', borderRadius: 7, marginBottom: 10,
        background: audioMaster.dialogueEnhancer ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${audioMaster.dialogueEnhancer ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: audioMaster.dialogueEnhancer ? '#a5b4fc' : '#64748b' }}>
            Dialogue Enhancer
          </div>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>Boost 1kHz–3kHz for crisp speech</div>
        </div>
        <div
          onClick={() => setAudioMaster('dialogueEnhancer', !audioMaster.dialogueEnhancer)}
          style={{
            width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
            background: audioMaster.dialogueEnhancer ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${audioMaster.dialogueEnhancer ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
            position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          }}>
          <div style={{
            position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
            background: audioMaster.dialogueEnhancer ? '#a5b4fc' : '#334155',
            left: audioMaster.dialogueEnhancer ? 16 : 2, transition: 'all 0.2s',
          }} />
        </div>
      </div>

      {/* Studio Reverb */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Spatial</div>
      <ColorSlider label="Studio Ambience Reverb" value={audioMaster.reverb} min={0} max={100} unit="%" accent="#818cf8" onChange={v => setAudioMaster('reverb', v)} />

      {/* Multiband compressor */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 10, marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Multiband Compressor</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'flex-end', height: 80, padding: '0 2px', marginBottom: 6 }}>
        {compBands.map(band => {
          const val = audioMaster[band.key]
          const h   = Math.round((val / 100) * 64)
          return (
            <div key={band.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {/* Vertical fader track */}
              <div style={{ position: 'relative', width: '100%', height: 64, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 6, height: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', bottom: 0, width: '100%', borderRadius: 99,
                    height: `${val}%`,
                    background: `linear-gradient(to top, ${band.accent}cc, ${band.accent}44)`,
                    transition: 'height 0.08s',
                  }} />
                </div>
                <input
                  type="range" min={0} max={100} value={val} orient="vertical"
                  onChange={e => setAudioMaster(band.key, +e.target.value)}
                  style={{
                    position: 'absolute', inset: 0, opacity: 0, cursor: 'ns-resize',
                    writingMode: 'vertical-lr', width: '100%', height: '100%',
                    WebkitAppearance: 'slider-vertical',
                  }}
                />
              </div>
              <span style={{ fontSize: 8.5, color: band.accent, fontWeight: 800, letterSpacing: '0.04em' }}>{band.label}</span>
              <span style={{ fontSize: 8, color: '#334155', fontFamily: 'monospace' }}>{val}%</span>
            </div>
          )
        })}
      </div>

      {/* Glue readout */}
      <div style={{
        padding: '6px 8px', borderRadius: 6,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        fontSize: 9, color: '#818cf8',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>LUFS Master</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-14.2 LUFS</span>
      </div>
    </div>
  )
}

// ── Full Transform Panel ──────────────────────────────────────────────────────
function RotationDial({ value, onChange }) {
  const size = 44
  const cx   = size / 2
  const cy   = cx
  const R    = cx - 5
  const rad  = (value - 90) * Math.PI / 180
  const dotX = cx + Math.cos(rad) * R
  const dotY = cy + Math.sin(rad) * R

  const divRef = useRef(null)
  const drag   = useRef(false)

  const compute = useCallback((e) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left - cx
    const y    = e.clientY - rect.top  - cx
    const deg  = Math.round(Math.atan2(y, x) * (180 / Math.PI) + 90 + 360) % 360
    onChange(deg)
  }, [cx, onChange])

  useEffect(() => {
    const onMove = (e) => { if (drag.current) compute(e) }
    const onUp   = ()  => { drag.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [compute])

  return (
    <svg
      ref={divRef}
      width={size} height={size}
      style={{ cursor: 'crosshair', flexShrink: 0 }}
      onMouseDown={(e) => { drag.current = true; compute(e) }}
    >
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.2)" />
      <line x1={cx} y1={cy} x2={dotX} y2={dotY} stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={dotX} cy={dotY} r={3.5} fill="#a78bfa" />
    </svg>
  )
}

const TRANSFORM_PROPS = [
  { key: 'posX',    label: 'Position X', unit: 'px', min: -500, max: 500, accent: '#60a5fa' },
  { key: 'posY',    label: 'Position Y', unit: 'px', min: -500, max: 500, accent: '#60a5fa' },
  { key: 'scale',   label: 'Scale',      unit: '%',  min: 0,    max: 400, accent: '#34d399', hasLock: true },
  { key: 'anchorX', label: 'Anchor X',   unit: '%',  min: 0,    max: 100, accent: '#fb923c' },
  { key: 'anchorY', label: 'Anchor Y',   unit: '%',  min: 0,    max: 100, accent: '#fb923c' },
  { key: 'opacity', label: 'Opacity',    unit: '%',  min: 0,    max: 100, accent: '#94a3b8' },
]

function TransformPanel() {
  const {
    activeClipId, clips,
    clipTransforms, setClipTransform,
    clipKeyframes, addKeyframe,
    keyframeRecordingFor, setKeyframeRecordingFor,
  } = useVideoStore()

  const activeClip = activeClipId
    ? Object.values(clips).flat().find(c => c.id === activeClipId)
    : null

  const DEFAULT_T = { posX: 0, posY: 0, scale: 100, lockScale: true, rotation: 0, anchorX: 50, anchorY: 50, opacity: 100 }
  const transform  = (activeClipId && clipTransforms[activeClipId]) ? clipTransforms[activeClipId] : DEFAULT_T
  const isRecording = keyframeRecordingFor === activeClipId
  const hasKF = (prop) => (clipKeyframes[activeClipId]?.[prop]?.length ?? 0) > 0

  if (!activeClip) {
    return (
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ fontSize: 9.5, color: '#1e3a5f', textAlign: 'center', padding: '8px 0' }}>
          Select a clip to edit transform
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Clip name */}
      <div style={{ fontSize: 9.5, color: '#00e5ff', fontWeight: 700, marginBottom: 8, padding: '4px 7px', borderRadius: 5, background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)' }}>
        {activeClip.label}
      </div>

      {/* Keyframe record toggle */}
      <button onClick={() => setKeyframeRecordingFor(isRecording ? null : activeClipId)} style={{
        width: '100%', padding: '5px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
        background: isRecording ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isRecording ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
        color: isRecording ? '#f87171' : '#475569',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 10, ...(isRecording ? { animation: 'kfBlink 1s ease-in-out infinite' } : {}) }}>◆</span>
        {isRecording ? 'Recording Keyframes' : 'Activate Keyframe Recording'}
      </button>

      {/* Position X/Y */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Position</div>
      {['posX', 'posY'].map(key => {
        const p = TRANSFORM_PROPS.find(p => p.key === key)
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <button onClick={() => isRecording && addKeyframe(activeClipId, key)} title="Add keyframe" style={{
              width: 14, height: 14, borderRadius: 2, border: 'none', cursor: isRecording ? 'pointer' : 'default',
              background: hasKF(key) ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)',
              color: hasKF(key) ? '#a5b4fc' : '#475569', fontSize: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
            }}>◆</button>
            <span style={{ fontSize: 9.5, color: '#475569', width: 58, flexShrink: 0 }}>{p.label}</span>
            <input type="number" value={transform[key]} onChange={e => setClipTransform(activeClipId, key, +e.target.value)} style={{
              flex: 1, padding: '3px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: p.accent, fontSize: 9.5, fontFamily: 'monospace', outline: 'none', textAlign: 'right',
            }} />
            <span style={{ fontSize: 9, color: '#334155', width: 14, flexShrink: 0 }}>px</span>
          </div>
        )
      })}

      {/* Scale + lock */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 6, marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Scale</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <button onClick={() => isRecording && addKeyframe(activeClipId, 'scale')} title="Add keyframe" style={{
          width: 14, height: 14, borderRadius: 2, border: 'none', cursor: isRecording ? 'pointer' : 'default',
          background: hasKF('scale') ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)',
          color: hasKF('scale') ? '#a5b4fc' : '#475569', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
        }}>◆</button>
        <span style={{ fontSize: 9.5, color: '#475569', width: 58, flexShrink: 0 }}>Scale</span>
        <input type="number" min={0} max={400} value={transform.scale} onChange={e => setClipTransform(activeClipId, 'scale', +e.target.value)} style={{
          flex: 1, padding: '3px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#34d399', fontSize: 9.5, fontFamily: 'monospace', outline: 'none', textAlign: 'right',
        }} />
        <span style={{ fontSize: 9, color: '#334155', width: 14, flexShrink: 0 }}>%</span>
        <button onClick={() => setClipTransform(activeClipId, 'lockScale', !transform.lockScale)} title={transform.lockScale ? 'Uniform scale (click to unlock)' : 'Non-uniform scale (click to lock)'} style={{
          width: 16, height: 16, borderRadius: 3, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: transform.lockScale ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)',
          color: transform.lockScale ? '#34d399' : '#475569', fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
        }}>{transform.lockScale ? '🔒' : '🔓'}</button>
      </div>

      {/* Rotation */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 6, marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rotation</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button onClick={() => isRecording && addKeyframe(activeClipId, 'rotation')} title="Add keyframe" style={{
          width: 14, height: 14, borderRadius: 2, border: 'none', cursor: isRecording ? 'pointer' : 'default',
          background: hasKF('rotation') ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)',
          color: hasKF('rotation') ? '#a5b4fc' : '#475569', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
        }}>◆</button>
        <RotationDial value={transform.rotation} onChange={v => setClipTransform(activeClipId, 'rotation', v)} />
        <div style={{ flex: 1 }}>
          <input type="number" min={0} max={360} value={transform.rotation} onChange={e => setClipTransform(activeClipId, 'rotation', +e.target.value % 360)} style={{
            width: '100%', padding: '3px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#a78bfa', fontSize: 9.5, fontFamily: 'monospace', outline: 'none', textAlign: 'right',
          }} />
          <span style={{ fontSize: 8, color: '#334155', display: 'block', textAlign: 'right', marginTop: 1 }}>degrees</span>
        </div>
      </div>

      {/* Anchor Point */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Anchor Point</div>
      {['anchorX', 'anchorY'].map(key => {
        const p = TRANSFORM_PROPS.find(p => p.key === key)
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, color: '#475569', width: 58, flexShrink: 0 }}>{p.label}</span>
            <input type="number" min={0} max={100} value={transform[key]} onChange={e => setClipTransform(activeClipId, key, +e.target.value)} style={{
              flex: 1, padding: '3px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: p.accent, fontSize: 9.5, fontFamily: 'monospace', outline: 'none', textAlign: 'right',
            }} />
            <span style={{ fontSize: 9, color: '#334155', width: 14, flexShrink: 0 }}>%</span>
          </div>
        )
      })}

      {/* Opacity */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 6, marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Opacity</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <button onClick={() => isRecording && addKeyframe(activeClipId, 'opacity')} title="Add keyframe" style={{
          width: 14, height: 14, borderRadius: 2, border: 'none', cursor: isRecording ? 'pointer' : 'default',
          background: hasKF('opacity') ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)',
          color: hasKF('opacity') ? '#a5b4fc' : '#475569', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
        }}>◆</button>
        <span style={{ fontSize: 9.5, color: '#475569', width: 58, flexShrink: 0 }}>Opacity</span>
        <div style={{ flex: 1, position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${transform.opacity}%`, borderRadius: 99, background: `linear-gradient(90deg, #94a3b866, #94a3b8)` }} />
          <input type="range" min={0} max={100} value={transform.opacity} onChange={e => setClipTransform(activeClipId, 'opacity', +e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', margin: 0 }} />
        </div>
        <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'monospace', width: 28, textAlign: 'right' }}>{transform.opacity}%</span>
      </div>

      {/* Reset */}
      <button onClick={() => setClipTransform(activeClipId, '__reset__', null)} style={{
        width: '100%', marginTop: 6, padding: '5px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
        cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)', color: '#475569', fontFamily: 'inherit',
      }}>Reset Transform</button>

      <style>{`
        @keyframes kfBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

// ── Layer Compositing Panel ───────────────────────────────────────────────────
function LayerCompositingPanel() {
  const {
    blendMode, setBlendMode,
    activeClipId, clipMasks, clearMask,
    addAdjustmentLayer, adjustmentLayers, removeAdjustmentLayer,
  } = useVideoStore()

  const hasMask = activeClipId && !!clipMasks[activeClipId]

  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Blend mode selector (full AE set) */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Blend Mode</div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <select value={blendMode} onChange={e => setBlendMode(e.target.value)} style={{
          width: '100%', padding: '6px 8px', borderRadius: 6,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: blendMode !== 'Normal' ? '#a78bfa' : '#64748b',
          fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', appearance: 'none',
        }}>
          {BLENDS.map(b => <option key={b} value={b} style={{ background: '#0c0c15' }}>{b}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: 9, pointerEvents: 'none' }}>▾</span>
      </div>

      {/* Mask indicator + clear */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mask</div>
      <div style={{ padding: '6px 8px', borderRadius: 6, marginBottom: 10, background: hasMask ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${hasMask ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9.5, color: hasMask ? '#00e5ff' : '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11 }}>{hasMask ? '✂' : '✕'}</span>
          {hasMask ? `Mask: ${clipMasks[activeClipId]?.length ?? 0} points` : 'No mask — use Pen Tool'}
        </div>
        {hasMask && (
          <button onClick={() => clearMask(activeClipId)} style={{
            fontSize: 9, cursor: 'pointer', padding: '2px 7px', borderRadius: 4, border: 'none', fontFamily: 'inherit',
            background: 'rgba(248,113,113,0.12)', color: '#f87171',
          }}>Clear</button>
        )}
      </div>

      {/* Adjustment Layers */}
      <div style={{ fontSize: 9, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Adjustment Layers</div>
      <button onClick={addAdjustmentLayer} style={{
        width: '100%', padding: '6px 0', borderRadius: 6, fontSize: 9.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', marginBottom: 6,
      }}>+ Add Adjustment Layer</button>
      {adjustmentLayers.map(adj => (
        <div key={adj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, color: '#fbbf24' }}>⬡ {adj.label}</span>
          <button onClick={() => removeAdjustmentLayer(adj.id)} style={{ fontSize: 10, cursor: 'pointer', background: 'none', border: 'none', color: '#f87171' }}>✕</button>
        </div>
      ))}
      {adjustmentLayers.length === 0 && <div style={{ fontSize: 9, color: '#1e3a5f', textAlign: 'center' }}>No adjustment layers</div>}
    </div>
  )
}

// ── Curve editor (per-channel) ────────────────────────────────────────────────
function CurveEditor({ channel, points, onChange, color }) {
  const SIZE = 120
  const svgRef = useRef(null)
  const [pts, setPts] = useState(points)

  useEffect(() => { setPts(points) }, [points])

  function toSVG(p) { return { x: p[0] * SIZE, y: (1 - p[1]) * SIZE } }

  function handleClick(e) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / SIZE
    const y = 1 - (e.clientY - rect.top) / SIZE
    const newPts = [...pts, [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]].sort((a, b) => a[0] - b[0])
    setPts(newPts); onChange(newPts)
  }

  function handleDrag(i, e) {
    e.stopPropagation()
    if (!svgRef.current) return
    const startX = e.clientX, startY = e.clientY
    const origPt = [...pts[i]]
    function onMove(me) {
      const rect = svgRef.current.getBoundingClientRect()
      const nx = Math.max(0, Math.min(1, origPt[0] + (me.clientX - startX) / SIZE))
      const ny = Math.max(0, Math.min(1, origPt[1] - (me.clientY - startY) / SIZE))
      const newPts = pts.map((p, idx) => idx === i ? [nx, ny] : p).sort((a, b) => a[0] - b[0])
      setPts(newPts); onChange(newPts)
    }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const svgPts = pts.map(toSVG)
  let d = `M ${svgPts[0].x},${svgPts[0].y}`
  for (let i = 1; i < svgPts.length; i++) {
    const p = svgPts[i - 1], c = svgPts[i]
    d += ` C ${p.x + (c.x - p.x) * 0.4},${p.y} ${c.x - (c.x - p.x) * 0.4},${c.y} ${c.x},${c.y}`
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{ fontSize: 8.5, color, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{channel}</div>
      <svg ref={svgRef} width={SIZE} height={SIZE} onClick={handleClick}
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, cursor: 'crosshair', display: 'block' }}>
        {/* Diagonal guide */}
        <line x1={0} y1={SIZE} x2={SIZE} y2={0} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        {/* Grid */}
        {[1,2,3].map(i => (<>
          <line key={`h${i}`} x1={0} y1={i * SIZE / 4} x2={SIZE} y2={i * SIZE / 4} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <line key={`v${i}`} x1={i * SIZE / 4} y1={0} x2={i * SIZE / 4} y2={SIZE} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </>))}
        {/* Curve */}
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Points */}
        {svgPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1"
            style={{ cursor: 'grab' }}
            onMouseDown={e => handleDrag(i, e)} onClick={e => e.stopPropagation()} />
        ))}
      </svg>
      <button onClick={() => { const def = [[0,0],[1,1]]; setPts(def); onChange(def) }}
        style={{ position: 'absolute', top: 16, right: 2, fontSize: 7.5, color: '#334155', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
    </div>
  )
}

// ── Lumetri Curves Panel ──────────────────────────────────────────────────────
function LumetriCurvesPanel() {
  const { lumetriAdvanced, setLumetriCurve } = useVideoStore()
  const channels = [
    { id: 'master', label: 'Master', color: '#e2e8f0' },
    { id: 'red',    label: 'Red',    color: '#f87171' },
    { id: 'green',  label: 'Green',  color: '#4ade80' },
    { id: 'blue',   label: 'Blue',   color: '#60a5fa' },
  ]
  const [active, setActive] = useState('master')
  const ch = channels.find(c => c.id === active)
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {channels.map(c => (
          <button key={c.id} onClick={() => setActive(c.id)} style={{
            flex: 1, padding: '4px 0', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: active === c.id ? `${c.color}22` : 'rgba(255,255,255,0.03)',
            color: active === c.id ? c.color : '#334155',
            fontSize: 8.5, fontWeight: 800,
            boxShadow: active === c.id ? `0 0 0 1px ${c.color}44` : 'none',
          }}>{c.label}</button>
        ))}
      </div>
      <CurveEditor
        channel={ch.label} color={ch.color}
        points={lumetriAdvanced.curves[active]}
        onChange={pts => setLumetriCurve(active, pts)}
      />
    </div>
  )
}

// ── HSL Secondary Panel ────────────────────────────────────────────────────────
function HSLSecondaryPanel() {
  const { lumetriAdvanced, setLumetriAdvanced } = useVideoStore()
  const la = lumetriAdvanced
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, color: '#475569', fontWeight: 700 }}>HSL Secondary Isolation</span>
        <div onClick={() => setLumetriAdvanced('hslEnabled', !la.hslEnabled)} style={{
          width: 28, height: 16, borderRadius: 99, cursor: 'pointer',
          background: la.hslEnabled ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${la.hslEnabled ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', top: 1, borderRadius: '50%', width: 12, height: 12,
            background: la.hslEnabled ? '#fbbf24' : '#334155', left: la.hslEnabled ? 13 : 1, transition: 'all 0.2s' }} />
        </div>
      </div>
      {la.hslEnabled && (
        <>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', marginBottom: 6, fontWeight: 700 }}>COLOR RANGE SELECTION</div>
          {[
            { key: 'hueShift',  label: 'Hue Shift',   min: -180, max: 180, accent: '#fbbf24' },
            { key: 'satShift',  label: 'Sat Shift',   min: -100, max: 100, accent: '#f472b6' },
            { key: 'lumShift',  label: 'Lum Shift',   min: -100, max: 100, accent: '#94a3b8' },
          ].map(row => (
            <ColorSlider key={row.key} label={row.label} value={la[row.key]} min={row.min} max={row.max} accent={row.accent}
              onChange={v => setLumetriAdvanced(row.key, v)} />
          ))}
        </>
      )}
    </div>
  )
}

// ── Vignette, Film Grain, Sharpen/Clarity/Vibrance Panel ─────────────────────
function CreativeLookPanel() {
  const { lumetriAdvanced, setLumetriAdvanced } = useVideoStore()
  const la = lumetriAdvanced
  const rows = [
    { key: 'vignetteAmount',  label: 'Vignette Amount',   min: -100, max: 100, accent: '#1e3a5f'  },
    { key: 'vignetteMidpoint', label: 'Vignette Midpoint', min: 0,   max: 100, accent: '#475569'  },
    { key: 'grainAmount',    label: 'Film Grain',         min: 0,   max: 100, accent: '#a78bfa'   },
    { key: 'grainSize',      label: 'Grain Size',         min: 0,   max: 100, accent: '#a78bfa'   },
    { key: 'sharpen',        label: 'Sharpen',            min: 0,   max: 100, accent: '#60a5fa'   },
    { key: 'clarity',        label: 'Clarity',            min: -100,max: 100, accent: '#34d399'   },
    { key: 'vibrance',       label: 'Vibrance',           min: -100,max: 100, accent: '#f472b6'   },
    { key: 'saturation',     label: 'Saturation',         min: -100,max: 100, accent: '#fb923c'   },
    { key: 'fade',           label: 'Fade Film',          min: 0,   max: 100, accent: '#94a3b8'   },
  ]
  return (
    <div style={{ padding: '0 12px 10px' }}>
      {rows.map(r => (
        <ColorSlider key={r.key} label={r.label} value={la[r.key]} min={r.min} max={r.max} accent={r.accent}
          onChange={v => setLumetriAdvanced(r.key, v)} />
      ))}
    </div>
  )
}

// ── Warp Stabilizer Panel ────────────────────────────────────────────────────
function WarpStabilizerPanel() {
  const { warpStabilizer, setWarpStabilizer, analyzeWarpStabilizer, activeClipId } = useVideoStore()
  const ws = warpStabilizer
  const METHODS = [
    { id: 'position',          label: 'Position' },
    { id: 'position-rotation', label: 'Pos + Rot' },
    { id: 'subspace-warp',     label: 'Subspace Warp' },
  ]
  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Status */}
      <div style={{ padding: '6px 8px', borderRadius: 7, marginBottom: 10,
        background: ws.result === 'stable' ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${ws.result === 'stable' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
        fontSize: 9.5, color: ws.result === 'stable' ? '#34d399' : '#334155',
      }}>
        {ws.analyzing ? `Analyzing… ${ws.progress}%`
          : ws.result === 'stable' ? '✓ Stabilization complete — Smooth'
          : 'Select a clip and Analyze to stabilize'}
      </div>
      {ws.analyzing && (
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#34d399,#6366f1)', width: `${ws.progress}%`, transition: 'width 0.1s' }} />
        </div>
      )}
      <button onClick={analyzeWarpStabilizer} disabled={ws.analyzing || !activeClipId} style={{
        width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 10,
        cursor: (ws.analyzing || !activeClipId) ? 'default' : 'pointer',
        fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
        background: ws.analyzing ? 'rgba(52,211,153,0.05)' : 'linear-gradient(90deg,rgba(52,211,153,0.18),rgba(99,102,241,0.18))',
        color: ws.analyzing ? '#334155' : '#34d399',
        border: `1px solid ${ws.analyzing ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.3)'}`,
      }}>
        {ws.analyzing ? '⌛ Analyzing Frames…' : '🎬 Analyze & Stabilize'}
      </button>
      <ColorSlider label="Smoothness" value={ws.smoothness} min={0} max={100} accent="#34d399"
        onChange={v => setWarpStabilizer('smoothness', v)} />
      <div style={{ fontSize: 8.5, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, marginTop: 4 }}>METHOD</div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
        {METHODS.map(m => (
          <button key={m.id} onClick={() => setWarpStabilizer('method', m.id)} style={{
            flex: 1, padding: '4px 2px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: ws.method === m.id ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.03)',
            color: ws.method === m.id ? '#34d399' : '#334155',
            fontSize: 8, fontWeight: 700, textAlign: 'center',
          }}>{m.label}</button>
        ))}
      </div>
    </div>
  )
}

// ── Noise Reduction Panel ─────────────────────────────────────────────────────
function NoiseReductionPanel() {
  const { noiseReduction, setNoiseReduction, runNoiseReduction } = useVideoStore()
  const nr = noiseReduction
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <button onClick={runNoiseReduction} disabled={nr.analyzing} style={{
        width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 10,
        cursor: nr.analyzing ? 'default' : 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
        background: nr.done ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.14)',
        color: nr.done ? '#34d399' : '#a5b4fc',
        border: `1px solid ${nr.done ? 'rgba(52,211,153,0.25)' : 'rgba(99,102,241,0.25)'}`,
      }}>
        {nr.analyzing ? '⌛ Analyzing Noise…' : nr.done ? '✓ Noise Reduced' : '🔊 Analyze & Reduce Noise'}
      </button>
      <ColorSlider label="Reduction Amount" value={nr.amount} min={0} max={100} accent="#a5b4fc"
        onChange={v => setNoiseReduction('amount', v)} />
      <div style={{ fontSize: 8.5, color: '#1e3a5f', marginBottom: 5, fontWeight: 700, marginTop: 4 }}>METHOD</div>
      {['temporal', 'spatial', 'both'].map(m => (
        <div key={m} onClick={() => setNoiseReduction('method', m)} style={{
          padding: '5px 8px', borderRadius: 5, marginBottom: 3, cursor: 'pointer',
          background: nr.method === m ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${nr.method === m ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
          fontSize: 9, color: nr.method === m ? '#818cf8' : '#475569', fontWeight: 600,
        }}>
          {m.charAt(0).toUpperCase() + m.slice(1)} Noise Reduction
        </div>
      ))}
    </div>
  )
}

// ── Rolling Shutter Repair Panel ──────────────────────────────────────────────
function RollingShutterPanel() {
  const { rollingShutter, setRollingShutter } = useVideoStore()
  const rs = rollingShutter
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, color: '#475569', fontWeight: 700 }}>Rolling Shutter Repair</span>
        <div onClick={() => setRollingShutter('enabled', !rs.enabled)} style={{
          width: 28, height: 16, borderRadius: 99, cursor: 'pointer',
          background: rs.enabled ? 'rgba(251,146,60,0.4)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${rs.enabled ? 'rgba(251,146,60,0.6)' : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s',
        }}>
          <div style={{ position: 'absolute', top: 1, borderRadius: '50%', width: 12, height: 12,
            background: rs.enabled ? '#fb923c' : '#334155', left: rs.enabled ? 13 : 1, transition: 'all 0.2s' }} />
        </div>
      </div>
      {rs.enabled && (
        <ColorSlider label="Ripple Amount" value={rs.amount} min={0} max={100} accent="#fb923c"
          onChange={v => setRollingShutter('amount', v)} />
      )}
    </div>
  )
}

// ── Frame Hold Panel ──────────────────────────────────────────────────────────
function FrameHoldPanel() {
  const { activeClipId, frameHolds, setFrameHold, currentTime } = useVideoStore()
  const hold = frameHolds[activeClipId] ?? null
  if (!activeClipId) return (
    <div style={{ padding: '0 12px 8px', fontSize: 9.5, color: '#1e3a5f', textAlign: 'center' }}>Select a clip</div>
  )
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ fontSize: 9.5, color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>
        Freezes a single frame for the clip's entire duration.
      </div>
      <button onClick={() => setFrameHold(activeClipId, !hold?.enabled, currentTime)} style={{
        width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 8,
        cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
        background: hold?.enabled ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
        color: hold?.enabled ? '#fbbf24' : '#475569',
        border: `1px solid ${hold?.enabled ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`,
      }}>
        {hold?.enabled ? '⏸ Frame Hold Active' : '⏸ Insert Frame Hold at Playhead'}
      </button>
      {hold?.enabled && (
        <div style={{ fontSize: 9, color: '#fbbf24', fontFamily: 'monospace', textAlign: 'center' }}>
          Frozen at {String(Math.floor(hold.holdTime / 60)).padStart(2,'0')}:{String(Math.floor(hold.holdTime % 60)).padStart(2,'0')}:{String(Math.floor((hold.holdTime % 1) * 30)).padStart(2,'0')}
        </div>
      )}
    </div>
  )
}

// ── Clip Speed / Duration Panel ────────────────────────────────────────────────
function ClipSpeedPanel() {
  const { activeClipId, clipSpeeds, setClipSpeed } = useVideoStore()
  const spd  = clipSpeeds[activeClipId] ?? { speed: 1.0, reverse: false }
  const [val, setVal] = useState(String(spd.speed * 100))
  useEffect(() => { setVal(String(spd.speed * 100)) }, [activeClipId, spd.speed])
  if (!activeClipId) return (
    <div style={{ padding: '0 12px 8px', fontSize: 9.5, color: '#1e3a5f', textAlign: 'center' }}>Select a clip</div>
  )
  const PRESETS = [25, 50, 100, 150, 200, 400]
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <input type="number" min={10} max={1000} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => setClipSpeed(activeClipId, Math.max(0.1, Math.min(10, parseFloat(val) / 100 || 1)), spd.reverse)}
          style={{ flex: 1, padding: '5px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fbbf24', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, outline: 'none', textAlign: 'right' }} />
        <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800 }}>%</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {PRESETS.map(p => (
          <button key={p} onClick={() => { setVal(String(p)); setClipSpeed(activeClipId, p / 100, spd.reverse) }} style={{
            flex: 1, minWidth: 36, padding: '4px 2px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: Math.round(spd.speed * 100) === p ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
            color: Math.round(spd.speed * 100) === p ? '#fbbf24' : '#475569',
            fontSize: 9, fontWeight: 700,
          }}>{p}%</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 9px', borderRadius: 7,
        background: spd.reverse ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${spd.reverse ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <span style={{ fontSize: 9.5, color: spd.reverse ? '#f87171' : '#475569', fontWeight: 700 }}>Reverse Clip</span>
        <div onClick={() => setClipSpeed(activeClipId, spd.speed, !spd.reverse)} style={{
          width: 28, height: 16, borderRadius: 99, cursor: 'pointer',
          background: spd.reverse ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${spd.reverse ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s',
        }}>
          <div style={{ position: 'absolute', top: 1, borderRadius: '50%', width: 12, height: 12,
            background: spd.reverse ? '#f87171' : '#334155', left: spd.reverse ? 13 : 1, transition: 'all 0.2s' }} />
        </div>
      </div>
    </div>
  )
}

// ── Color Match Panel ──────────────────────────────────────────────────────────
function ColorMatchPanel() {
  const { colorMatchState, colorMatchEnabled, runColorMatch } = useVideoStore()
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
        Matches the color grade of the active clip to a reference frame in the Source Monitor.
      </div>
      <button onClick={runColorMatch} disabled={colorMatchState === 'analyzing'} style={{
        width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 8,
        cursor: colorMatchState === 'analyzing' ? 'default' : 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
        background: colorMatchEnabled ? 'rgba(244,114,182,0.1)' : 'rgba(244,114,182,0.14)',
        color: colorMatchEnabled ? '#f472b6' : '#f472b6',
        border: '1px solid rgba(244,114,182,0.3)',
      }}>
        {colorMatchState === 'analyzing' ? '⌛ Analyzing Reference…'
          : colorMatchEnabled ? '✓ Color Matched — Apply Again'
          : '🎨 Apply Color Match'}
      </button>
    </div>
  )
}

// ── Super Resolution Panel ────────────────────────────────────────────────────
function SuperResolutionPanel() {
  const { superResolution, setSuperResolution, runSuperResolution } = useVideoStore()
  const sr = superResolution
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
        AI-powered upscaling. Doubles or quadruples resolution while preserving detail.
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['2×','4×'].map(s => (
          <button key={s} onClick={() => setSuperResolution('scale', s)} style={{
            flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: sr.scale === s ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            color: sr.scale === s ? '#a5b4fc' : '#475569', fontSize: 10, fontWeight: 800,
          }}>{s} Upscale</button>
        ))}
      </div>
      <button onClick={runSuperResolution} disabled={sr.analyzing} style={{
        width: '100%', padding: '7px 0', borderRadius: 7,
        cursor: sr.analyzing ? 'default' : 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'inherit',
        background: sr.enabled ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.14)',
        color: sr.enabled ? '#818cf8' : '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)',
      }}>
        {sr.analyzing ? '⌛ Upscaling…' : sr.enabled ? `✓ ${sr.scale} Applied` : `⬆ Apply ${sr.scale} Super Resolution`}
      </button>
    </div>
  )
}

// ── Effect Controls Panel (Applied Effects) ────────────────────────────────────
const EFFECTS_CATALOG = [
  { id: 'blur',        name: 'Gaussian Blur',      category: 'video', icon: '🌫️', defaultParams: { amount: 5 } },
  { id: 'sharpen',     name: 'Unsharp Mask',        category: 'video', icon: '🔪', defaultParams: { amount: 50, radius: 2 } },
  { id: 'glow',        name: 'Cinematic Glow',      category: 'video', icon: '✨', defaultParams: { threshold: 70, intensity: 40 } },
  { id: 'chromaber',   name: 'Chromatic Aberration',category: 'video', icon: '🎨', defaultParams: { shift: 3 } },
  { id: 'vr_defish',   name: 'VR Defish / Lens Correct', category: 'video', icon: '🎯', defaultParams: { amount: 50 } },
  { id: 'brightness',  name: 'Brightness & Contrast', category: 'video', icon: '☀️', defaultParams: { brightness: 0, contrast: 0 } },
  { id: 'eq',          name: 'Parametric EQ',       category: 'audio', icon: '🎛️', defaultParams: { low: 0, mid: 0, high: 0 } },
  { id: 'compressor',  name: 'Dynamics Compressor', category: 'audio', icon: '🔊', defaultParams: { threshold: -18, ratio: 4 } },
  { id: 'reverb',      name: 'Convolution Reverb',  category: 'audio', icon: '🏛️', defaultParams: { wet: 30, size: 50 } },
  { id: 'pitch',       name: 'Pitch Shifter',        category: 'audio', icon: '🎵', defaultParams: { semitones: 0 } },
]

function EffectControlsPanel() {
  const { activeClipId, appliedEffects, addEffect, removeEffect, updateEffectParam } = useVideoStore()
  const [search, setSearch] = useState('')
  const effects = appliedEffects[activeClipId] ?? []
  const filtered = EFFECTS_CATALOG.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.includes(search.toLowerCase())
  )
  if (!activeClipId) return (
    <div style={{ padding: '0 12px 8px', fontSize: 9.5, color: '#1e3a5f', textAlign: 'center' }}>Select a clip to apply effects</div>
  )
  return (
    <div style={{ padding: '0 12px 10px' }}>
      {/* Applied effects */}
      {effects.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>Applied</div>
          {effects.map(eff => {
            const cat = EFFECTS_CATALOG.find(e => e.id === eff.id)
            return (
              <div key={eff.instanceId} style={{ padding: '6px 8px', borderRadius: 6, marginBottom: 4, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, color: '#a5b4fc', fontWeight: 700 }}>{cat?.icon} {eff.name}</span>
                  <button onClick={() => removeEffect(activeClipId, eff.instanceId)} style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
                {Object.entries(eff.params).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 8.5, color: '#475569', width: 60, flexShrink: 0 }}>{k}</span>
                    <input type="range" min={typeof v === 'number' && v < 0 ? -100 : 0} max={typeof v === 'number' ? (v > 100 ? 200 : 100) : 100}
                      value={typeof v === 'number' ? v : 0}
                      onChange={e => updateEffectParam(activeClipId, eff.instanceId, k, +e.target.value)}
                      style={{ flex: 1, accentColor: '#6366f1', height: 3 }} />
                    <span style={{ fontSize: 8.5, color: '#818cf8', fontFamily: 'monospace', width: 24, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Search & add */}
      <div style={{ marginBottom: 6, position: 'relative' }}>
        <input placeholder="Search effects…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 9.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.slice(0, 8).map(eff => (
          <button key={eff.id} onClick={() => addEffect(activeClipId, eff)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.02)', textAlign: 'left',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            <span style={{ fontSize: 12 }}>{eff.icon}</span>
            <div>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>{eff.name}</div>
              <div style={{ fontSize: 8, color: '#334155' }}>{eff.category}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VideoRightSidebar() {
  const {
    activeFX, setActiveFX,
    activeTransition, setActiveTransition,
    activeClipId,
    reframeEnabled, setReframeEnabled,
  } = useVideoStore()

  return (
    <div style={{
      width: 200, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(8,8,20,0.72)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      overflowY: 'auto',
    }}>

      {/* ── Motion Transform ── */}
      <Section title="🎬 Motion & Transform" defaultOpen={true} accent="#60a5fa">
        <TransformPanel />
      </Section>

      {/* ── Layer Compositing (Blend Mode + Masks + Adjustment) ── */}
      <Section title="🔲 Layer Compositing" defaultOpen={false} accent="#a78bfa">
        <LayerCompositingPanel />
      </Section>

      {/* ── Hollywood Color LUT Engine ── */}
      <Section title="🎨 Cinematic Color Grading" defaultOpen={false} accent="#fbbf24">
        <LumetriPanel />
      </Section>

      {/* ── AI Color Palette Extractor ── */}
      <Section title="🎨 AI Color Palette" defaultOpen={false} accent="#f472b6">
        <ColorPaletteSection />
      </Section>

      {/* ── Hollywood VFX Rack ── */}
      <Section title="🎭 VFX Rack" defaultOpen={false} accent="#f87171">
        <VideoVFXPanel clipId={activeClipId} />
      </Section>

      {/* ── AI Face Mosaic ── */}
      <Section title="🤖 AI Face Mosaic" defaultOpen={false} accent="#818cf8">
        <FaceMosaicSection />
      </Section>

      {/* ── FX Presets ── */}
      <Section title="⚡ FX Presets" defaultOpen={false} accent="#818cf8">
        <div style={{ padding: '0 10px' }}>
          {FX_PRESETS.map(p => (
            <FxCard key={p.id} preset={p} activeFX={activeFX} onApply={setActiveFX} />
          ))}
        </div>
      </Section>

      {/* ── Advanced Chroma Key ── */}
      <Section title="🟩 Chroma Key (Ultra Key)" defaultOpen={false} accent="#34d399">
        <ChromaKeyPanel />
      </Section>

      {/* ── Motion Tracker ── */}
      <Section title="🎯 Motion Tracker" defaultOpen={false} accent="#00e5ff">
        <MotionTrackerPanel />
      </Section>

      {/* ── Transitions ── */}
      <Section title="🔀 Transitions" defaultOpen={false}>
        <div style={{ padding: '0 12px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {TRANSITIONS.map(tr => {
            const active = activeTransition === tr.id
            return (
              <button key={tr.id} onClick={() => setActiveTransition(active ? null : tr.id)} style={{
                padding: '6px 4px', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'inherit',
                background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                color: active ? '#a5b4fc' : '#334155',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 13 }}>{tr.emoji}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{tr.label}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Smart Reframe ── */}
      <Section title="🤖 AI Smart Reframe" defaultOpen={false} accent="#c084fc">
        <div style={{ padding: '4px 12px 10px' }}>
          <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
            Auto-converts 16:9 to 9:16 vertical. Face-tracks the speaker to keep them centered for TikTok · Reels · Shorts.
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: 8,
            background: reframeEnabled ? 'rgba(192,132,252,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${reframeEnabled ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.07)'}`,
            transition: 'all 0.2s', marginBottom: 8,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: reframeEnabled ? '#c084fc' : '#475569' }}>
                16:9 → 9:16 Reframe
              </div>
              <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>
                {reframeEnabled ? 'Active — face-tracking on' : 'Inactive'}
              </div>
            </div>
            <div onClick={() => setReframeEnabled(!reframeEnabled)} style={{
              width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
              background: reframeEnabled ? 'rgba(192,132,252,0.35)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${reframeEnabled ? 'rgba(192,132,252,0.6)' : 'rgba(255,255,255,0.1)'}`,
              position: 'relative', transition: 'all 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
                background: reframeEnabled ? '#c084fc' : '#334155',
                left: reframeEnabled ? 16 : 2, transition: 'all 0.2s',
                boxShadow: reframeEnabled ? '0 0 8px rgba(192,132,252,0.8)' : 'none',
              }} />
            </div>
          </div>

          {reframeEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'Face Detect Confidence', val: '94%', color: '#c084fc' },
                { label: 'Crop Mode', val: '9:16 Portrait', color: '#c084fc' },
                { label: 'Tracking Smoothness', val: 'High', color: '#c084fc' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', borderRadius: 6,
                  background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.12)',
                }}>
                  <span style={{ fontSize: 9, color: '#475569' }}>{row.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: row.color, fontFamily: 'monospace' }}>{row.val}</span>
                </div>
              ))}
              <div style={{
                marginTop: 4, padding: '6px 8px', borderRadius: 7,
                background: 'linear-gradient(90deg, rgba(192,132,252,0.08), rgba(0,229,255,0.06))',
                border: '1px solid rgba(192,132,252,0.2)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 12, animation: 'reframePulse 1.5s ease-in-out infinite' }}>👤</span>
                <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4 }}>
                  Speaker locked · Crop offset adjusting live
                </span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Dolby Audio Mastering ── */}
      <Section title="🔊 Dolby Audio Master" defaultOpen={false} accent="#34d399">
        <AudioMasterPanel />
      </Section>

      {/* ── Effect Controls ── */}
      <Section title="🎛 Effect Controls" defaultOpen={false} accent="#818cf8">
        <EffectControlsPanel />
      </Section>

      {/* ── Lumetri Curves ── */}
      <Section title="📈 Lumetri Curves" defaultOpen={false} accent="#60a5fa">
        <LumetriCurvesPanel />
      </Section>

      {/* ── HSL Secondary ── */}
      <Section title="🎨 HSL Secondary" defaultOpen={false} accent="#fbbf24">
        <HSLSecondaryPanel />
      </Section>

      {/* ── Creative Look (Vignette, Grain, Sharpen) ── */}
      <Section title="🎞 Creative Look" defaultOpen={false} accent="#a78bfa">
        <CreativeLookPanel />
      </Section>

      {/* ── Warp Stabilizer ── */}
      <Section title="🎬 Warp Stabilizer" defaultOpen={false} accent="#34d399">
        <WarpStabilizerPanel />
      </Section>

      {/* ── Noise Reduction ── */}
      <Section title="🔇 Noise Reduction" defaultOpen={false} accent="#818cf8">
        <NoiseReductionPanel />
      </Section>

      {/* ── Rolling Shutter Repair ── */}
      <Section title="📽 Rolling Shutter" defaultOpen={false} accent="#fb923c">
        <RollingShutterPanel />
      </Section>

      {/* ── Frame Hold ── */}
      <Section title="⏸ Frame Hold" defaultOpen={false} accent="#fbbf24">
        <FrameHoldPanel />
      </Section>

      {/* ── Clip Speed / Duration ── */}
      <Section title="⏱ Speed / Duration" defaultOpen={false} accent="#fbbf24">
        <ClipSpeedPanel />
      </Section>

      {/* ── Color Match ── */}
      <Section title="🎨 Color Match" defaultOpen={false} accent="#f472b6">
        <ColorMatchPanel />
      </Section>

      {/* ── Super Resolution ── */}
      <Section title="⬆ Super Resolution" defaultOpen={false} accent="#a5b4fc">
        <SuperResolutionPanel />
      </Section>

      <style>{`
        @keyframes fxGlitch   { 0%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 100%{transform:translateX(-3px)} }
        @keyframes fxZoom     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes fxShake    { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-1px,1px)} 75%{transform:translate(1px,-1px)} }
        @keyframes fxNeon     { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes chromaPulse{ 0%,100%{opacity:1;box-shadow:0 0 4px #34d399} 50%{opacity:0.4;box-shadow:none} }
        @keyframes reframePulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes facePulse   { 0%,100%{opacity:1;box-shadow:0 0 5px rgba(129,140,248,0.8)} 50%{opacity:0.4;box-shadow:none} }
      `}</style>
    </div>
  )
}
