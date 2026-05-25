import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Download, Palette, RefreshCw, ImageIcon, Mic, Layout, Rocket,
         AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react'
import { useAssetLibraryStore } from '../store/assetLibraryStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const STYLES = ['Minimalist', 'Mascot', 'Neon Tech', 'Traditional Emblem', 'Wordmark', 'Geometric']

const SWATCHES = [
  ['#00e5ff', '#8b5cf6', '#07070f'],
  ['#f59e0b', '#ef4444', '#100600'],
  ['#10b981', '#06b6d4', '#020e0c'],
  ['#f472b6', '#a78bfa', '#0c0010'],
  ['#fb923c', '#f59e0b', '#0d0600'],
]

const LOGO_PLACEHOLDERS = [
  { icon: '⬡', label: 'Hexagon Mark' },
  { icon: '◈', label: 'Diamond Grid' },
  { icon: '⌘', label: 'Command Form' },
  { icon: '◎', label: 'Ring Pulse'   },
]

const GOOGLE_FONTS = ['Inter', 'Montserrat', 'Poppins', 'Raleway', 'Space Grotesk']

const LAYOUT_OPTIONS = [
  { id: 'icon-top',  label: 'Icon Top',   desc: 'Icon · Text' },
  { id: 'icon-left', label: 'Icon Left',  desc: 'Split row'   },
  { id: 'icon-only', label: 'Icon Only',  desc: 'Mark only'   },
  { id: 'text-only', label: 'Text Only',  desc: 'Wordmark'    },
]

// ── Layout position config ────────────────────────────────────────────────────

function getLayoutConfig(layout, typography) {
  const { align } = typography
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
  const tx     = align === 'left' ? 44 : align === 'right' ? 468 : 256

  const configs = {
    'icon-top': {
      icon:     { x: 256, y: 196, size: 194 },
      wordmark: { x: tx,  y: 374, anchor,    size: 44 },
      tagline:  { x: tx,  y: 432, anchor,    size: 18 },
    },
    'icon-left': {
      icon:     { x: 130, y: 256, size: 162 },
      wordmark: { x: 340, y: 228, anchor: 'middle', size: 40 },
      tagline:  { x: 340, y: 290, anchor: 'middle', size: 17 },
    },
    'icon-only': {
      icon:     { x: 256, y: 256, size: 260 },
      wordmark: null,
      tagline:  null,
    },
    'text-only': {
      icon:     null,
      wordmark: { x: tx,  y: 224, anchor, size: 54 },
      tagline:  { x: tx,  y: 312, anchor, size: 22 },
    },
  }
  return configs[layout] ?? configs['icon-top']
}

// Approximate selection-indicator rect per layout × layer  [x, y, w, h]
const SELECTION_BOXES = {
  'icon-top':  { icon: [66,90,380,212], wordmark: [48,342,416,60], tagline: [98,412,316,38] },
  'icon-left': { icon: [26,148,210,216], wordmark: [240,196,256,64], tagline: [240,260,256,44] },
  'icon-only': { icon: [42,42,428,428] },
  'text-only': { wordmark: [32,182,448,88], tagline: [84,284,344,48] },
}

// ── SVG icon JSX renderer ─────────────────────────────────────────────────────

function IconSVGJSX({ symbol, lc, c1 }) {
  if (!lc?.icon) return null
  const { x, y, size } = lc.icon
  const r = size * 0.45

  if (symbol === '⬡') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`
    }).join(' ')
    return <polygon points={pts} fill="url(#lm-g1)" />
  }

  if (symbol === '◈') {
    const d = r * 0.84, di = r * 0.42
    return (
      <>
        <polygon
          points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`}
          fill={c1} fillOpacity="0.18" stroke={c1} strokeWidth="2" strokeOpacity="0.45" />
        <polygon
          points={`${x},${y - di} ${x + di},${y} ${x},${y + di} ${x - di},${y}`}
          fill="url(#lm-g1)" />
      </>
    )
  }

  if (symbol === '◎') {
    return (
      <>
        <circle cx={x} cy={y} r={r}           fill="none"        stroke="url(#lm-g1)" strokeWidth={size * 0.05} />
        <circle cx={x} cy={y} r={r * 0.48}    fill={c1}          fillOpacity="0.18" />
        <circle cx={x} cy={y} r={r * 0.18}    fill="url(#lm-g1)" />
      </>
    )
  }

  // '⌘' and default — unicode text (still infinitely scalable in SVG)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
      fontSize={size * 0.86} fill="url(#lm-g1)">{symbol}</text>
  )
}

// ── SVG string builder (for vector download) ──────────────────────────────────

function buildSVGString({ symbol, palette, wordmark, tagline, layout, typography }) {
  const [c1, c2, bg] = palette
  const { fontFamily, letterSpacing } = typography
  const lc  = getLayoutConfig(layout, typography)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Vector icon markup (string version)
  let iconMark = ''
  if (lc.icon) {
    const { x, y, size } = lc.icon
    const r = size * 0.45
    if (symbol === '⬡') {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6
        return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`
      }).join(' ')
      iconMark = `<polygon points="${pts}" fill="url(#g1)"/>`
    } else if (symbol === '◈') {
      const d = (r * 0.84).toFixed(2), di = (r * 0.42).toFixed(2)
      iconMark = `<polygon points="${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}" fill="${c1}" fill-opacity="0.18" stroke="${c1}" stroke-width="2" stroke-opacity="0.45"/>
  <polygon points="${x},${y - di} ${x + di},${y} ${x},${y + di} ${x - di},${y}" fill="url(#g1)"/>`
    } else if (symbol === '◎') {
      iconMark = `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="none" stroke="url(#g1)" stroke-width="${(size * 0.05).toFixed(2)}"/>
  <circle cx="${x}" cy="${y}" r="${(r * 0.48).toFixed(2)}" fill="${c1}" fill-opacity="0.18"/>
  <circle cx="${x}" cy="${y}" r="${(r * 0.18).toFixed(2)}" fill="url(#g1)"/>`
    } else {
      iconMark = `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${(size * 0.86).toFixed(1)}" fill="url(#g1)">${esc(symbol)}</text>`
    }
  }

  const wmMark = lc.wordmark && wordmark
    ? `<text x="${lc.wordmark.x}" y="${lc.wordmark.y}" text-anchor="${lc.wordmark.anchor}" dominant-baseline="middle" font-family="'${fontFamily}', Inter, sans-serif" font-size="${lc.wordmark.size}" font-weight="800" fill="url(#g1)" letter-spacing="${letterSpacing}">${esc(wordmark)}</text>`
    : ''

  const tlMark = lc.tagline && tagline
    ? `<text x="${lc.tagline.x}" y="${lc.tagline.y}" text-anchor="${lc.tagline.anchor}" dominant-baseline="middle" font-family="'${fontFamily}', Inter, sans-serif" font-size="${lc.tagline.size}" font-weight="600" fill="${c1}" fill-opacity="0.6" letter-spacing="${Math.max(letterSpacing, 4)}">${esc(tagline.toUpperCase())}</text>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700;800&amp;display=swap');</style>
    <linearGradient id="g1" x1="20%" y1="0%" x2="80%" y2="0%">
      <stop offset="0%"   stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="g2" cx="50%" cy="50%" r="70%">
      <stop offset="0%"   stop-color="${c1}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0.03"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="${bg}"/>
  <rect width="512" height="512" fill="url(#g2)"/>
  ${iconMark}
  ${wmMark}
  ${tlMark}
</svg>`
}

// ── PNG export from SVG ────────────────────────────────────────────────────────

function svgToPngDataUrl(svgStr) {
  return new Promise((resolve) => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 512
      canvas.getContext('2d').drawImage(img, 0, 0, 512, 512)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ── PropSlider sub-component ──────────────────────────────────────────────────

function PropSlider({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 10.5, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {step < 1 ? Number(value).toFixed(1) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#f472b6', cursor: 'pointer' }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogoMakerWorkspace() {
  const [prompt,       setPrompt]      = useState('')
  const [style,        setStyle]       = useState('Minimalist')
  const [palette,      setPalette]     = useState(SWATCHES[0])
  const [generating,   setGenerating]  = useState(false)
  const [generated,    setGenerated]   = useState(false)
  const [activeVariant, setVariant]    = useState(0)
  const [customColor,  setCustomColor] = useState('#00e5ff')

  // SVG layer state
  const [wordmark,      setWordmark]      = useState('ZaraBrand')
  const [tagline,       setTagline]       = useState('Minimalist')
  const [selectedLayer, setSelectedLayer] = useState(null)   // null | 'icon' | 'wordmark' | 'tagline'
  const [layout,        setLayout]        = useState('icon-top')
  const [typography,    setTypography]    = useState({ fontFamily: 'Inter', letterSpacing: 0, align: 'center' })

  const { setPendingTransfer } = useAssetLibraryStore()
  const exportCanvasRef = useRef(null)

  // ── Load Google Fonts ──────────────────────────────────────────────────────
  useEffect(() => {
    const families = GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:wght@400;700;800`).join('&')
    const link = Object.assign(document.createElement('link'), {
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?${families}&display=swap`,
    })
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch (_) {} }
  }, [])

  // ── Sync text layers when a new logo is generated ─────────────────────────
  useEffect(() => {
    if (generated) {
      setWordmark(prompt.split(' ').slice(0, 2).join('') || 'ZaraBrand')
      setTagline(style)
      setSelectedLayer(null)
    }
  }, [generated]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    if (generating) return
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 2800)
  }

  // ── Downloads ─────────────────────────────────────────────────────────────
  const getSVGStr = () => buildSVGString({
    symbol: LOGO_PLACEHOLDERS[activeVariant].icon,
    palette, wordmark, tagline, layout, typography,
  })

  const handleDownloadSVG = () => {
    const str  = getSVGStr()
    const blob = new Blob([str], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `${wordmark || 'logo'}-logo.svg`,
    })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const handleDownloadPNG = async () => {
    const pngUrl = await svgToPngDataUrl(getSVGStr())
    if (!pngUrl) return
    const a = Object.assign(document.createElement('a'), {
      href: pngUrl, download: `${wordmark || 'logo'}-logo.png`,
    })
    a.click()
  }

  // ── Quick Deploy ───────────────────────────────────────────────────────────
  const sendToWorkspace = useCallback(async (destination) => {
    if (!generated) return
    const pngUrl = await svgToPngDataUrl(getSVGStr())
    if (!pngUrl) return
    setPendingTransfer({
      dataUrl: pngUrl, destination,
      name: `${wordmark || 'ZaraBrand'} Logo`,
      source: 'Logo Maker',
    })
  }, [generated, wordmark, palette, layout, typography, activeVariant, style]) // eslint-disable-line

  const [c1, c2] = palette
  const symbol   = LOGO_PLACEHOLDERS[activeVariant].icon
  const lc       = getLayoutConfig(layout, typography)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: '#02020a' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#060610', borderRight: '1px solid #111118', overflowY: 'auto',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #111118' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Brand Prompt
          </span>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Prompt textarea */}
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Describe your brand… e.g. a futuristic AI startup with electric cyan energy"
            style={{
              width: '100%', minHeight: 88, padding: 11, resize: 'vertical',
              background: '#0c0c1a', border: '1px solid #1e293b', borderRadius: 8,
              color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.6,
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }} />

          {/* Style */}
          <div>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Logo Style
            </label>
            <select value={style} onChange={e => setStyle(e.target.value)} style={{
              width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12.5,
              background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0',
              outline: 'none', cursor: 'pointer',
            }}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Color palette */}
          <div>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Color Palette
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SWATCHES.map((sw, i) => {
                const active = JSON.stringify(palette) === JSON.stringify(sw)
                return (
                  <button key={i} onClick={() => setPalette(sw)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
                    background: active ? 'rgba(244,114,182,0.07)' : 'transparent',
                    border: active ? '1px solid rgba(244,114,182,0.25)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    {sw.map((c, j) => (
                      <div key={j} style={{ width: 18, height: 18, borderRadius: 3, background: c, flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }} />
                    ))}
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                      {['Electric', 'Ember', 'Ocean', 'Violet', 'Amber'][i]}
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <input type="color" value={customColor}
                onChange={e => { setCustomColor(e.target.value); setPalette([e.target.value, palette[1], palette[2]]) }}
                style={{ width: 28, height: 28, border: 'none', borderRadius: 5, cursor: 'pointer', background: 'none', padding: 0 }} />
              <span style={{ fontSize: 11, color: '#475569' }}>Custom accent</span>
            </div>
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={generating} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: generating ? 'default' : 'pointer',
            background: generating
              ? 'rgba(244,114,182,0.04)'
              : 'linear-gradient(135deg, rgba(244,114,182,0.16) 0%, rgba(139,92,246,0.16) 100%)',
            border: `1px solid ${generating ? 'rgba(244,114,182,0.1)' : 'rgba(244,114,182,0.35)'}`,
            color: generating ? '#334155' : '#f472b6',
            boxShadow: generating ? 'none' : '0 0 20px rgba(244,114,182,0.18)',
            transition: 'all 0.2s',
          }}>
            {generating
              ? <><RefreshCw size={14} style={{ animation: 'lm-spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={14} /> Generate Logo</>}
          </button>
        </div>
      </div>

      {/* ── Central SVG canvas ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 36, gap: 16,
      }}>

        <div onClick={() => setSelectedLayer(null)} style={{
          width: 420, height: 420, borderRadius: 20, overflow: 'hidden',
          background: '#070711', border: `1px solid ${generated ? '#1e293b' : '#111118'}`,
          boxShadow: generated ? `0 0 60px rgba(244,114,182,0.1), 0 0 120px rgba(139,92,246,0.06)` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'box-shadow 0.6s', cursor: 'default', position: 'relative',
        }}>

          {/* Idle */}
          {!generating && !generated && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <ImageIcon size={40} style={{ color: '#1e293b' }} />
              <span style={{ color: '#334155', fontSize: 13, fontWeight: 500 }}>Your logo will appear here</span>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, #070711 0%, rgba(244,114,182,0.04) 50%, #070711 100%)',
                animation: 'lm-shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 120, height: 120, borderRadius: 24, background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.15)', animation: 'lm-pulse 1.2s ease-in-out infinite' }} />
                <div style={{ width: 160, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'lm-pulse 1.2s ease-in-out 0.2s infinite' }} />
                <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>Vectorizing layers…</span>
              </div>
            </>
          )}

          {/* ── Inline SVG logo canvas ── */}
          {generated && (
            <svg
              viewBox="0 0 512 512"
              style={{ width: '100%', height: '100%', display: 'block' }}
              onClick={e => e.stopPropagation()}>

              <defs>
                <linearGradient id="lm-g1" x1="20%" y1="0%" x2="80%" y2="0%">
                  <stop offset="0%"   stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
                <radialGradient id="lm-g2" cx="50%" cy="50%" r="70%">
                  <stop offset="0%"   stopColor={c1} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={c2} stopOpacity="0.03" />
                </radialGradient>
              </defs>

              {/* Background */}
              <rect width="512" height="512" fill={palette[2]} />
              <rect width="512" height="512" fill="url(#lm-g2)" />

              {/* Icon layer */}
              {lc.icon && (
                <g onClick={e => { e.stopPropagation(); setSelectedLayer('icon') }}
                  style={{ cursor: 'pointer' }}>
                  <IconSVGJSX symbol={symbol} lc={lc} c1={c1} />
                  {selectedLayer === 'icon' && SELECTION_BOXES[layout]?.icon && (() => {
                    const [bx, by, bw, bh] = SELECTION_BOXES[layout].icon
                    return <rect x={bx} y={by} width={bw} height={bh} fill="none"
                      stroke="#f472b6" strokeWidth="1.5" strokeDasharray="5 3" rx="5" opacity="0.75"
                      style={{ pointerEvents: 'none' }} />
                  })()}
                </g>
              )}

              {/* Wordmark layer */}
              {lc.wordmark && wordmark && (
                <g onClick={e => { e.stopPropagation(); setSelectedLayer('wordmark') }}
                  style={{ cursor: 'text' }}>
                  <text x={lc.wordmark.x} y={lc.wordmark.y}
                    textAnchor={lc.wordmark.anchor} dominantBaseline="middle"
                    fontFamily={`'${typography.fontFamily}', Inter, sans-serif`}
                    fontSize={lc.wordmark.size} fontWeight="800"
                    fill="url(#lm-g1)" letterSpacing={typography.letterSpacing}>
                    {wordmark}
                  </text>
                  {selectedLayer === 'wordmark' && SELECTION_BOXES[layout]?.wordmark && (() => {
                    const [bx, by, bw, bh] = SELECTION_BOXES[layout].wordmark
                    return <rect x={bx} y={by} width={bw} height={bh} fill="none"
                      stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="5 3" rx="4" opacity="0.8"
                      style={{ pointerEvents: 'none' }} />
                  })()}
                </g>
              )}

              {/* Tagline layer */}
              {lc.tagline && tagline && (
                <g onClick={e => { e.stopPropagation(); setSelectedLayer('tagline') }}
                  style={{ cursor: 'text' }}>
                  <text x={lc.tagline.x} y={lc.tagline.y}
                    textAnchor={lc.tagline.anchor} dominantBaseline="middle"
                    fontFamily={`'${typography.fontFamily}', Inter, sans-serif`}
                    fontSize={lc.tagline.size} fontWeight="600"
                    fill={c1} fillOpacity="0.62"
                    letterSpacing={Math.max(typography.letterSpacing, 4)}>
                    {tagline.toUpperCase()}
                  </text>
                  {selectedLayer === 'tagline' && SELECTION_BOXES[layout]?.tagline && (() => {
                    const [bx, by, bw, bh] = SELECTION_BOXES[layout].tagline
                    return <rect x={bx} y={by} width={bw} height={bh} fill="none"
                      stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 3" rx="4" opacity="0.8"
                      style={{ pointerEvents: 'none' }} />
                  })()}
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Layer hint */}
        {generated && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {selectedLayer
              ? <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Type size={11} style={{ color: '#64748b' }} />
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                    {selectedLayer === 'icon' ? 'Icon' : selectedLayer === 'wordmark' ? 'Wordmark' : 'Tagline'}
                  </span>
                  layer selected — edit in the Typography panel →
                </span>
              : <span style={{ fontSize: 11, color: '#334155' }}>Click a layer on the canvas to select &amp; edit it</span>
            }
          </div>
        )}
      </div>

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#060610', borderLeft: '1px solid #111118', overflowY: 'auto',
      }}>

        {/* Variations */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #111118' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Variations
          </span>
        </div>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LOGO_PLACEHOLDERS.map((lp, i) => {
            const active = activeVariant === i
            return (
              <button key={i} onClick={() => setVariant(i)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: 10, borderRadius: 9, cursor: 'pointer',
                background: active ? 'rgba(244,114,182,0.07)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(244,114,182,0.28)' : '1px solid #111118',
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: 7,
                  background: generated ? `linear-gradient(135deg, ${c1}18, ${c2}18)` : 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {generated
                    ? <span style={{ fontSize: 28, background: `linear-gradient(135deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{lp.icon}</span>
                    : <div style={{ width: 28, height: 28, borderRadius: 5, background: 'rgba(255,255,255,0.03)' }} />
                  }
                </div>
                <span style={{ fontSize: 9.5, color: active ? '#94a3b8' : '#334155', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                  {lp.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Layout Matrix */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #111118' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Layout Matrix
          </span>
        </div>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {LAYOUT_OPTIONS.map(opt => {
            const active = layout === opt.id
            return (
              <button key={opt.id} onClick={() => setLayout(opt.id)} style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                background: active ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(139,92,246,0.35)' : '1px solid #111118',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#a78bfa' : '#475569' }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 9.5, color: active ? '#7c3aed88' : '#1e293b', fontWeight: 500 }}>
                  {opt.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* Typography Adjustments */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #111118', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Typography
          </span>
          {selectedLayer && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: selectedLayer === 'wordmark' ? 'rgba(0,229,255,0.12)' : selectedLayer === 'tagline' ? 'rgba(167,139,250,0.12)' : 'rgba(244,114,182,0.12)',
              color: selectedLayer === 'wordmark' ? '#00e5ff' : selectedLayer === 'tagline' ? '#a78bfa' : '#f472b6',
              border: `1px solid ${selectedLayer === 'wordmark' ? 'rgba(0,229,255,0.25)' : selectedLayer === 'tagline' ? 'rgba(167,139,250,0.25)' : 'rgba(244,114,182,0.25)'}`,
            }}>
              {selectedLayer.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!generated ? (
            <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.55, margin: 0 }}>
              Generate a logo first, then click any text layer on the canvas to edit it here.
            </p>
          ) : (
            <>
              {/* Layer selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>Active Layer</span>
                <select value={selectedLayer ?? ''} onChange={e => setSelectedLayer(e.target.value || null)} style={{
                  width: '100%', padding: '6px 9px', borderRadius: 7, fontSize: 12,
                  background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0',
                  outline: 'none', cursor: 'pointer',
                }}>
                  <option value="">— click canvas layer —</option>
                  <option value="wordmark">Wordmark</option>
                  <option value="tagline">Tagline</option>
                </select>
              </div>

              {/* Text content editing — only for text layers */}
              {(selectedLayer === 'wordmark' || selectedLayer === 'tagline') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>
                    {selectedLayer === 'wordmark' ? 'Wordmark Text' : 'Tagline Text'}
                  </span>
                  <input
                    value={selectedLayer === 'wordmark' ? wordmark : tagline}
                    onChange={e => selectedLayer === 'wordmark' ? setWordmark(e.target.value) : setTagline(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 9px', borderRadius: 7, fontSize: 12,
                      background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0',
                      outline: 'none', boxSizing: 'border-box',
                    }} />
                </div>
              )}

              {/* Font family */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>Font Family</span>
                <select
                  value={typography.fontFamily}
                  onChange={e => setTypography(t => ({ ...t, fontFamily: e.target.value }))}
                  style={{
                    width: '100%', padding: '6px 9px', borderRadius: 7, fontSize: 12,
                    background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0',
                    outline: 'none', cursor: 'pointer',
                  }}>
                  {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Letter spacing */}
              <PropSlider label="Letter Spacing" value={typography.letterSpacing} min={-2} max={20} step={0.5} unit="px"
                onChange={v => setTypography(t => ({ ...t, letterSpacing: v }))} />

              {/* Alignment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>Alignment</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { val: 'left',   Icon: AlignLeft   },
                    { val: 'center', Icon: AlignCenter  },
                    { val: 'right',  Icon: AlignRight   },
                  ].map(({ val, Icon }) => {
                    const active = typography.align === val
                    return (
                      <button key={val} onClick={() => setTypography(t => ({ ...t, align: val }))} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '6px 0', borderRadius: 6, cursor: 'pointer',
                        background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                        border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid #1e293b',
                      }}>
                        <Icon size={13} style={{ color: active ? '#a78bfa' : '#475569' }} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Downloads */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={handleDownloadPNG} disabled={!generated} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: generated ? 'rgba(0,229,255,0.1)'      : 'rgba(255,255,255,0.02)',
            border:     generated ? '1px solid rgba(0,229,255,0.3)' : '1px solid #111118',
            color:      generated ? '#00e5ff'                   : '#1e293b',
            cursor:     generated ? 'pointer'                   : 'default', transition: 'all 0.2s',
          }}>
            <Download size={12} /> Download PNG
          </button>
          <button onClick={handleDownloadSVG} disabled={!generated} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: generated ? 'rgba(139,92,246,0.1)'          : 'rgba(255,255,255,0.02)',
            border:     generated ? '1px solid rgba(139,92,246,0.3)' : '1px solid #111118',
            color:      generated ? '#a78bfa'                        : '#1e293b',
            cursor:     generated ? 'pointer'                        : 'default', transition: 'all 0.2s',
          }}>
            <Download size={12} /> Export Vector SVG
          </button>
        </div>

        {/* Quick Deploy */}
        <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Rocket size={11} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Quick Deployment
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button onClick={() => sendToWorkspace('studio')} disabled={!generated} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
              borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: generated ? 'pointer' : 'default', textAlign: 'left',
              background: generated ? 'rgba(244,114,182,0.08)' : 'rgba(255,255,255,0.02)',
              border:     generated ? '1px solid rgba(244,114,182,0.35)' : '1px solid #111118',
              color:      generated ? '#f472b6'                : '#1e293b',
              boxShadow:  generated ? '0 0 12px rgba(244,114,182,0.15)' : 'none',
              transition: 'all 0.2s',
            }}>
              <Mic size={11} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>Send to Studio</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>Album Cover · 1:1 crop</div>
              </div>
            </button>
            <button onClick={() => sendToWorkspace('builder')} disabled={!generated} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
              borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: generated ? 'pointer' : 'default', textAlign: 'left',
              background: generated ? 'rgba(0,229,255,0.07)'       : 'rgba(255,255,255,0.02)',
              border:     generated ? '1px solid rgba(0,229,255,0.3)' : '1px solid #111118',
              color:      generated ? '#00e5ff'                    : '#1e293b',
              boxShadow:  generated ? '0 0 12px rgba(0,229,255,0.12)' : 'none',
              transition: 'all 0.2s',
            }}>
              <Layout size={11} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>Send to Builder</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>As Site Logo / Asset</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden export canvas (legacy fallback) */}
      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes lm-spin    { to { transform: rotate(360deg); } }
        @keyframes lm-shimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
        @keyframes lm-pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
