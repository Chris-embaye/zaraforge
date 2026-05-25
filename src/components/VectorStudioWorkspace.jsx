import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles, Download, Palette, RefreshCw, ImageIcon, Mic, Layout, Rocket,
  AlignLeft, AlignCenter, AlignRight, Upload, Scissors, Paintbrush, Eraser,
  Move, Sun, Sliders, ChevronDown, ChevronUp, Zap, Package, FileJson,
  Smartphone, Layers, Cpu,
} from 'lucide-react'
import { useAssetLibraryStore } from '../store/assetLibraryStore'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

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
  { id: 'icon-top',  label: 'Icon Top',  desc: 'Icon · Text' },
  { id: 'icon-left', label: 'Icon Left', desc: 'Split row'   },
  { id: 'icon-only', label: 'Icon Only', desc: 'Mark only'   },
  { id: 'text-only', label: 'Text Only', desc: 'Wordmark'    },
]

// ─────────────────────────────────────────────────────────────────────────────
// LOGO LAYOUT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getLayoutConfig(layout, typography) {
  const { align } = typography
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
  const tx     = align === 'left' ? 44 : align === 'right' ? 468 : 256
  const configs = {
    'icon-top':  { icon: { x: 256, y: 196, size: 194 }, wordmark: { x: tx, y: 374, anchor, size: 44 }, tagline: { x: tx, y: 432, anchor, size: 18 } },
    'icon-left': { icon: { x: 130, y: 256, size: 162 }, wordmark: { x: 340, y: 228, anchor: 'middle', size: 40 }, tagline: { x: 340, y: 290, anchor: 'middle', size: 17 } },
    'icon-only': { icon: { x: 256, y: 256, size: 260 }, wordmark: null, tagline: null },
    'text-only': { icon: null, wordmark: { x: tx, y: 224, anchor, size: 54 }, tagline: { x: tx, y: 312, anchor, size: 22 } },
  }
  return configs[layout] ?? configs['icon-top']
}

const SELECTION_BOXES = {
  'icon-top':  { icon: [66,90,380,212],   wordmark: [48,342,416,60],  tagline: [98,412,316,38]  },
  'icon-left': { icon: [26,148,210,216],  wordmark: [240,196,256,64], tagline: [240,260,256,44] },
  'icon-only': { icon: [42,42,428,428] },
  'text-only': { wordmark: [32,182,448,88], tagline: [84,284,344,48] },
}

function IconSVGJSX({ symbol, lc, c1 }) {
  if (!lc?.icon) return null
  const { x, y, size } = lc.icon
  const r = size * 0.45
  if (symbol === '⬡') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`
    }).join(' ')
    return <polygon points={pts} fill="url(#vs-g1)" />
  }
  if (symbol === '◈') {
    const d = r * 0.84, di = r * 0.42
    return (
      <>
        <polygon points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`}
          fill={c1} fillOpacity="0.18" stroke={c1} strokeWidth="2" strokeOpacity="0.45" />
        <polygon points={`${x},${y - di} ${x + di},${y} ${x},${y + di} ${x - di},${y}`}
          fill="url(#vs-g1)" />
      </>
    )
  }
  if (symbol === '◎') {
    return (
      <>
        <circle cx={x} cy={y} r={r}        fill="none"        stroke="url(#vs-g1)" strokeWidth={size * 0.05} />
        <circle cx={x} cy={y} r={r * 0.48} fill={c1}          fillOpacity="0.18" />
        <circle cx={x} cy={y} r={r * 0.18} fill="url(#vs-g1)" />
      </>
    )
  }
  return <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.86} fill="url(#vs-g1)">{symbol}</text>
}

function buildSVGString({ symbol, palette, wordmark, tagline, layout, typography, transparent = false }) {
  const [c1, c2, bg] = palette
  const { fontFamily, letterSpacing } = typography
  const lc  = getLayoutConfig(layout, typography)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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
    ? `<text x="${lc.wordmark.x}" y="${lc.wordmark.y}" text-anchor="${lc.wordmark.anchor}" dominant-baseline="middle" font-family="'${fontFamily}', Inter, sans-serif" font-size="${lc.wordmark.size}" font-weight="800" fill="url(#g1)" letter-spacing="${letterSpacing}">${esc(wordmark)}</text>` : ''
  const tlMark = lc.tagline && tagline
    ? `<text x="${lc.tagline.x}" y="${lc.tagline.y}" text-anchor="${lc.tagline.anchor}" dominant-baseline="middle" font-family="'${fontFamily}', Inter, sans-serif" font-size="${lc.tagline.size}" font-weight="600" fill="${c1}" fill-opacity="0.6" letter-spacing="${Math.max(letterSpacing, 4)}">${esc(tagline.toUpperCase())}</text>` : ''

  const bgRect = transparent ? '' : `<rect width="512" height="512" fill="${bg}"/>
  <rect width="512" height="512" fill="url(#g2)"/>`

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
  ${bgRect}
  ${iconMark}
  ${wmMark}
  ${tlMark}
</svg>`
}

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

// ─────────────────────────────────────────────────────────────────────────────
// BG REMOVER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function keyToLabel(key = '') {
  if (key.startsWith('fetch:session') || key.startsWith('load')) return 'Downloading AI model…'
  if (key.startsWith('fetch:image'))                             return 'Loading image data…'
  if (key.startsWith('compute:inference'))                       return 'Running neural segmentation…'
  if (key.startsWith('compute:encode'))                          return 'Encoding transparency mask…'
  if (key.startsWith('fetch'))                                   return 'Fetching resources…'
  if (key.startsWith('compute'))                                 return 'Processing pixels…'
  return 'Analyzing image…'
}

function hexToRgb(hex = '#000000') {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}

function analyzeAmbient(hex = '#000000') {
  const { r, g, b } = hexToRgb(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const brightness = lum < 0.25 ? 0.88 : lum > 0.75 ? 1.08 : 1.0
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue = 0
  if (max !== min) {
    const d = max - min
    if (max === r)      hue = ((g - b) / d) * 60
    else if (max === g) hue = (2 + (b - r) / d) * 60
    else                hue = (4 + (r - g) / d) * 60
    if (hue < 0) hue += 360
  }
  const saturation = (max - min) > 80 ? 1.12 : 0.95
  return { brightness, hueRotate: Math.round(hue / 8), saturation }
}

function computeFilter({ edgeFeathering = 0, colorSpill = 0, haloThreshold = 0, shadow, relight }) {
  const parts = []
  if (haloThreshold > 0)  parts.push(`contrast(${(1 - haloThreshold * 0.04).toFixed(3)})`)
  if (haloThreshold < 0)  parts.push(`contrast(${(1 + Math.abs(haloThreshold) * 0.04).toFixed(3)})`)
  if (edgeFeathering > 0) parts.push(`blur(${(edgeFeathering * 0.18).toFixed(2)}px)`)
  if (colorSpill > 0)     parts.push(`hue-rotate(${Math.round(colorSpill * -0.7)}deg) saturate(${(1 - colorSpill * 0.003).toFixed(3)})`)
  if (relight?.enabled) {
    const { brightness, hueRotate, saturation } = analyzeAmbient(relight.bgColor)
    parts.push(`brightness(${brightness}) hue-rotate(${hueRotate}deg) saturate(${saturation})`)
  }
  if (shadow?.enabled) {
    const { r, g, b } = hexToRgb(shadow.color)
    parts.push(`drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px rgba(${r},${g},${b},${shadow.opacity}))`)
  }
  return parts.join(' ') || 'none'
}

async function runAIRemoval(blobUrl, onProgress) {
  const { removeBackground } = await import('@imgly/background-removal')
  const resultBlob = await removeBackground(blobUrl, {
    progress: (key, current, total) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0
      onProgress(key, pct)
    },
  })
  return URL.createObjectURL(resultBlob)
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND KIT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

async function generateIconSizes(svgStr, sizes) {
  const results = []
  for (const size of sizes) {
    const dataUrl = await new Promise((resolve) => {
      const blob = new Blob([svgStr], { type: 'image/svg+xml' })
      const url  = URL.createObjectURL(blob)
      const img  = new window.Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = c.height = size
        c.getContext('2d').drawImage(img, 0, 0, size, size)
        URL.revokeObjectURL(url)
        resolve(c.toDataURL('image/png'))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      img.src = url
    })
    if (dataUrl) results.push({ size, dataUrl })
  }
  return results
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

async function exportBrandKit({ wordmark, palette, svgStr, transparentSvgStr }) {
  const IOS_SIZES = [20, 29, 40, 57, 58, 60, 76, 80, 87, 114, 120, 152, 167, 180, 1024]
  const AND_SIZES = [36, 48, 72, 96, 144, 192]

  const paletteJson = JSON.stringify({
    primary:    { hex: palette[0] },
    secondary:  { hex: palette[1] },
    background: { hex: palette[2] },
    name: wordmark || 'Brand',
    generated: new Date().toISOString().slice(0, 10),
  }, null, 2)

  try {
    const JSZip = (await import('jszip')).default
    const zip   = new JSZip()

    // Transparent PNG
    const pngDataUrl = await svgToPngDataUrl(transparentSvgStr || svgStr)
    if (pngDataUrl) zip.file('logo_transparent.png', dataUrlToBlob(pngDataUrl))

    // Vector SVG
    zip.file('logo_vector.svg', transparentSvgStr || svgStr)

    // Palette JSON
    zip.file('brand_palette.json', paletteJson)

    // App icon pack (inner zip)
    const iconZip  = new JSZip()
    const iosPack  = iconZip.folder('ios')
    const andPack  = iconZip.folder('android')
    const iosIcons = await generateIconSizes(transparentSvgStr || svgStr, IOS_SIZES)
    const andIcons = await generateIconSizes(transparentSvgStr || svgStr, AND_SIZES)
    for (const { size, dataUrl } of iosIcons) iosPack.file(`icon_${size}x${size}.png`, dataUrlToBlob(dataUrl))
    for (const { size, dataUrl } of andIcons) andPack.file(`icon_${size}dp.png`,        dataUrlToBlob(dataUrl))
    const iconBlob = await iconZip.generateAsync({ type: 'blob' })
    zip.file('app_icon_pack.zip', iconBlob)

    const finalBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url = URL.createObjectURL(finalBlob)
    const a   = Object.assign(document.createElement('a'), {
      href: url, download: `${(wordmark || 'brand').replace(/\s+/g, '-').toLowerCase()}-brand-kit.zip`,
    })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 8000)
    return true
  } catch {
    // jszip not available — download individual files
    const pngDataUrl = await svgToPngDataUrl(transparentSvgStr || svgStr)
    if (pngDataUrl) {
      const a = Object.assign(document.createElement('a'), { href: pngDataUrl, download: 'logo_transparent.png' })
      a.click()
    }
    await new Promise(r => setTimeout(r, 400))
    const svgBlob = new Blob([transparentSvgStr || svgStr], { type: 'image/svg+xml' })
    const svgUrl  = URL.createObjectURL(svgBlob)
    const b = Object.assign(document.createElement('a'), { href: svgUrl, download: 'logo_vector.svg' })
    b.click(); setTimeout(() => URL.revokeObjectURL(svgUrl), 4000)
    await new Promise(r => setTimeout(r, 400))
    const palBlob = new Blob([paletteJson], { type: 'application/json' })
    const palUrl  = URL.createObjectURL(palBlob)
    const c = Object.assign(document.createElement('a'), { href: palUrl, download: 'brand_palette.json' })
    c.click(); setTimeout(() => URL.revokeObjectURL(palUrl), 4000)
    return true
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PropSlider({ label, value, min, max, step = 1, onChange, unit = '', accent = '#00e5ff' }) {
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
        style={{ width: '100%', accentColor: accent, cursor: 'pointer' }} />
    </div>
  )
}

function Toggle({ value, onChange, accentColor = '#00e5ff' }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', flexShrink: 0,
      background: value ? accentColor : '#1e293b', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid #111118' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  )
}

// ── Mockup components ──────────────────────────────────────────────────────────

function MockupTshirt({ svgDataUrl, c1, c2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 140, height: 130 }}>
        {/* Shirt body */}
        <svg viewBox="0 0 140 130" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="shirt-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111118" />
              <stop offset="100%" stopColor="#0a0a12" />
            </linearGradient>
          </defs>
          {/* Collar */}
          <path d="M50,8 Q70,22 90,8" fill="none" stroke="#1e293b" strokeWidth="2" />
          {/* Sleeves */}
          <path d="M20,10 L0,38 L22,42 L28,28 L50,22" fill="url(#shirt-g)" stroke="#1e293b" strokeWidth="1" />
          <path d="M120,10 L140,38 L118,42 L112,28 L90,22" fill="url(#shirt-g)" stroke="#1e293b" strokeWidth="1" />
          {/* Body */}
          <path d="M28,28 L22,42 L18,130 L122,130 L118,42 L112,28 L90,22 Q70,34 50,22 Z" fill="url(#shirt-g)" stroke="#1e293b" strokeWidth="1" />
          {/* Sheen */}
          <path d="M36,50 Q42,46 48,50 Q42,56 36,50 Z" fill="rgba(255,255,255,0.04)" />
        </svg>
        {/* Logo placement */}
        {svgDataUrl && (
          <img src={svgDataUrl} alt="logo"
            style={{
              position: 'absolute', left: '50%', top: '52%',
              transform: 'translate(-50%, -50%)',
              width: 50, height: 50, objectFit: 'contain',
              filter: `drop-shadow(0 0 6px ${c1}66)`,
            }} />
        )}
      </div>
      <span style={{ fontSize: 9.5, color: '#334155', fontWeight: 600 }}>Premium Apparel</span>
    </div>
  )
}

function MockupPhone({ svgDataUrl, c1 }) {
  const icons = Array.from({ length: 9 }, (_, i) => i)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 110, height: 140, borderRadius: 18, background: '#0a0a12',
        border: '2px solid #1e293b', padding: '16px 10px 10px',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Notch */}
        <div style={{ width: 30, height: 4, borderRadius: 2, background: '#1e293b', margin: '-12px auto 4px' }} />
        {/* Icon grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {icons.map(i => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 8,
              background: i === 4 ? 'transparent' : 'rgba(255,255,255,0.04)',
              border: i === 4 ? 'none' : '1px solid #111118',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {i === 4 && svgDataUrl ? (
                <img src={svgDataUrl} alt="app icon"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: 2, background: `${c1}22` }} />
              )}
            </div>
          ))}
        </div>
        {/* Home bar */}
        <div style={{ width: 32, height: 3, borderRadius: 2, background: '#1e293b', margin: '2px auto 0' }} />
      </div>
      <span style={{ fontSize: 9.5, color: '#334155', fontWeight: 600 }}>App Icon Grid</span>
    </div>
  )
}

function MockupGlassDoor({ svgDataUrl, c1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 100, height: 140, borderRadius: 6, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,229,255,0.04) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Glass reflection */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: '60%', bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
        }} />
        {/* Handle */}
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          width: 4, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.15)',
        }} />
        {/* Logo etching */}
        {svgDataUrl && (
          <img src={svgDataUrl} alt="door logo"
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 52, height: 52, objectFit: 'contain',
              opacity: 0.65,
              filter: `brightness(2) drop-shadow(0 0 8px ${c1}44)`,
              mixBlendMode: 'screen',
            }} />
        )}
        {/* Bottom text */}
        <div style={{
          position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
          fontSize: 5.5, fontWeight: 700, letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
        }}>PUSH</div>
      </div>
      <span style={{ fontSize: 9.5, color: '#334155', fontWeight: 600 }}>Glass Door Engraving</span>
    </div>
  )
}

function MockupTruck({ svgDataUrl, c1, c2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 180, height: 90 }}>
        <svg viewBox="0 0 180 90" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="truck-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0e1116" />
              <stop offset="100%" stopColor="#070a0d" />
            </linearGradient>
            <linearGradient id="truck-cab" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#111520" />
              <stop offset="100%" stopColor="#0a0e18" />
            </linearGradient>
          </defs>
          {/* Trailer body */}
          <rect x="52" y="12" width="124" height="62" rx="3" fill="url(#truck-body)" stroke="#1e293b" strokeWidth="1" />
          {/* Cab */}
          <path d="M10,18 L52,18 L52,74 L10,74 Q4,74 2,68 L2,34 Q2,18 10,18 Z" fill="url(#truck-cab)" stroke="#1e293b" strokeWidth="1" />
          {/* Windshield */}
          <path d="M12,22 L50,22 L50,48 L12,48 Q8,48 6,44 L6,26 Q8,22 12,22 Z" fill="rgba(99,102,241,0.12)" stroke="#1e293b" strokeWidth="0.5" />
          {/* Wheels */}
          <circle cx="30"  cy="78" r="10" fill="#050508" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="30"  cy="78" r="5"  fill="#0a0a14" stroke="#111118" strokeWidth="1" />
          <circle cx="98"  cy="78" r="10" fill="#050508" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="98"  cy="78" r="5"  fill="#0a0a14" stroke="#111118" strokeWidth="1" />
          <circle cx="152" cy="78" r="10" fill="#050508" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="152" cy="78" r="5"  fill="#0a0a14" stroke="#111118" strokeWidth="1" />
          {/* Side stripe */}
          <rect x="52" y="68" width="124" height="3" fill={`${c1}44`} />
          {/* Exhaust */}
          <rect x="3" y="14" width="4" height="14" rx="2" fill="#1e293b" />
          <rect x="3" y="10" width="4" height="6"  rx="2" fill="#111118" />
          {/* Headlight */}
          <rect x="2" y="46" width="8" height="6" rx="1" fill={`${c1}88`} />
        </svg>
        {/* Logo on trailer door */}
        {svgDataUrl && (
          <img src={svgDataUrl} alt="truck logo"
            style={{
              position: 'absolute',
              left: 90, top: 14, width: 72, height: 60,
              objectFit: 'contain',
              filter: `drop-shadow(0 0 5px ${c1}55)`,
            }} />
        )}
      </div>
      <span style={{ fontSize: 9.5, color: '#334155', fontWeight: 600 }}>Truck Livery</span>
    </div>
  )
}

function BrandMockupVault({ svgDataUrl, c1, c2, open, onToggle }) {
  return (
    <div style={{ borderTop: '1px solid #111118', background: '#050508' }}>
      {/* Header toggle */}
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'transparent',
        fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>👕</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>
            Real-World Brand Mockup Vault
          </span>
          {svgDataUrl && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'vs-pulse 2s ease-in-out infinite' }} />
          )}
        </div>
        {open ? <ChevronDown size={14} color="#334155" /> : <ChevronUp size={14} color="#334155" />}
      </button>

      {open && (
        <div style={{
          padding: '4px 20px 20px',
          display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'vs-slideDown 0.25s ease',
        }}>
          {!svgDataUrl ? (
            <p style={{ fontSize: 11, color: '#1e293b', textAlign: 'center', width: '100%', padding: '12px 0' }}>
              Generate a logo to preview it across real-world surfaces.
            </p>
          ) : (
            <>
              <MockupTshirt  svgDataUrl={svgDataUrl} c1={c1} c2={c2} />
              <MockupPhone   svgDataUrl={svgDataUrl} c1={c1} />
              <MockupGlassDoor svgDataUrl={svgDataUrl} c1={c1} />
              <MockupTruck   svgDataUrl={svgDataUrl} c1={c1} c2={c2} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

export default function VectorStudioWorkspace() {
  // ── Tool mode ───────────────────────────────────────────────────────────────
  const [studioMode, setStudioMode] = useState('logo')

  // ── Logo state ──────────────────────────────────────────────────────────────
  const [prompt,        setPrompt]       = useState('')
  const [style,         setStyle]        = useState('Minimalist')
  const [palette,       setPalette]      = useState(SWATCHES[0])
  const [generating,    setGenerating]   = useState(false)
  const [generated,     setGenerated]    = useState(false)
  const [activeVariant, setVariant]      = useState(0)
  const [customColor,   setCustomColor]  = useState('#00e5ff')
  const [wordmark,      setWordmark]     = useState('ZaraBrand')
  const [tagline,       setTagline]      = useState('Minimalist')
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [layout,        setLayout]       = useState('icon-top')
  const [typography,    setTypography]   = useState({ fontFamily: 'Inter', letterSpacing: 0, align: 'center' })

  // ── AI Transparency Layer ───────────────────────────────────────────────────
  const [aiTransparency, setAiTransparency] = useState(false)

  // ── Precision refinement ────────────────────────────────────────────────────
  const [edgeFeathering, setEdgeFeathering] = useState(0)
  const [colorSpill,     setColorSpill]     = useState(0)
  const [haloThreshold,  setHaloThreshold]  = useState(0)

  // ── Vectorizer ──────────────────────────────────────────────────────────────
  const [vectorized,  setVectorized]  = useState(false)
  const [vectorizing, setVectorizing] = useState(false)

  // ── Mockup vault ────────────────────────────────────────────────────────────
  const [mockupOpen,     setMockupOpen]     = useState(false)
  const [mockupDataUrl,  setMockupDataUrl]  = useState(null)

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportOpen,  setExportOpen]  = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [exportDone,  setExportDone]  = useState(false)

  // ── BG Remover state ────────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState('idle')
  const [originalUrl,  setOriginalUrl]  = useState(null)
  const [processedUrl, setProcessedUrl] = useState(null)
  const [fileName,     setFileName]     = useState('')
  const [stepLabel,    setStepLabel]    = useState('Preparing…')
  const [loadProgress, setLoadProgress] = useState(0)
  const [dragOver,     setDragOver]     = useState(false)
  const [sliderX,      setSliderX]      = useState(50)
  const [dragging,     setDragging]     = useState(false)
  const [brushMode,    setBrushMode]    = useState(null)
  const [brushSize,    setBrushSize]    = useState(24)
  const [canvasEdited, setCanvasEdited] = useState(false)
  const [shadow,  setShadow]  = useState({ enabled: false, x: 4, y: 8, blur: 16, opacity: 0.6, color: '#000000' })
  const [relight, setRelight] = useState({ enabled: false, bgColor: '#1a1a2e' })

  const { setPendingTransfer } = useAssetLibraryStore()
  const fileRef          = useRef(null)
  const sliderRef        = useRef(null)
  const displayCanvasRef = useRef(null)
  const origCanvasRef    = useRef(null)
  const isPainting       = useRef(false)
  const exportBtnRef     = useRef(null)
  const [exportPos, setExportPos] = useState({ bottom: 56, right: 16 })

  // ── Google Fonts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const families = GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:wght@400;700;800`).join('&')
    const link = Object.assign(document.createElement('link'), {
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?${families}&display=swap`,
    })
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [])

  // ── BG canvas init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!processedUrl) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      for (const ref of [displayCanvasRef, origCanvasRef]) {
        if (!ref.current) continue
        ref.current.width  = w
        ref.current.height = h
        const ctx = ref.current.getContext('2d')
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0)
      }
      setCanvasEdited(false)
    }
    img.src = processedUrl
  }, [processedUrl])

  // ── Sync text after generation ───────────────────────────────────────────────
  useEffect(() => {
    if (generated) {
      setWordmark(prompt.split(' ').slice(0, 2).join('') || 'ZaraBrand')
      setTagline(style)
      setSelectedLayer(null)
      setVectorized(false)
      // Build mockup preview data URL
      const svgStr = buildSVGString({
        symbol: LOGO_PLACEHOLDERS[activeVariant].icon,
        palette, wordmark: prompt.split(' ').slice(0, 2).join('') || 'ZaraBrand',
        tagline: style, layout, typography, transparent: true,
      })
      svgToPngDataUrl(svgStr).then(url => { if (url) setMockupDataUrl(url) })
    }
  }, [generated]) // eslint-disable-line

  // ── Logo generation ──────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (generating) return
    setGenerating(true); setGenerated(false); setVectorized(false); setMockupDataUrl(null)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 2800)
  }

  // ── SVG getters ──────────────────────────────────────────────────────────────
  const getSVGStr = (transparent = false) => buildSVGString({
    symbol: LOGO_PLACEHOLDERS[activeVariant].icon,
    palette, wordmark, tagline, layout, typography, transparent,
  })

  const handleDownloadSVG = () => {
    const str  = getSVGStr(aiTransparency)
    const blob = new Blob([str], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `${wordmark || 'logo'}-vector.svg` }).click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const handleDownloadPNG = async () => {
    const pngUrl = await svgToPngDataUrl(getSVGStr(aiTransparency))
    if (!pngUrl) return
    Object.assign(document.createElement('a'), { href: pngUrl, download: `${wordmark || 'logo'}-transparent.png` }).click()
  }

  // ── Vectorizer ───────────────────────────────────────────────────────────────
  const handleVectorize = async () => {
    if (vectorizing || (!generated && studioMode === 'logo') || (!processedUrl && studioMode === 'bgremover')) return
    setVectorizing(true)
    await new Promise(r => setTimeout(r, 2200))
    setVectorizing(false)
    setVectorized(true)
  }

  // ── Mockup update when wordmark or palette changes ───────────────────────────
  const refreshMockup = useCallback(() => {
    if (!generated) return
    const svgStr = getSVGStr(true)
    svgToPngDataUrl(svgStr).then(url => { if (url) setMockupDataUrl(url) })
  }, [generated, wordmark, palette, layout, typography, activeVariant]) // eslint-disable-line
  useEffect(() => { refreshMockup() }, [wordmark, palette, activeVariant, layout]) // eslint-disable-line

  // ── Brand Kit export ─────────────────────────────────────────────────────────
  const handleExportKit = async () => {
    if (exporting) return
    setExportOpen(false); setExporting(true); setExportDone(false)
    try {
      await exportBrandKit({ wordmark, palette, svgStr: getSVGStr(false), transparentSvgStr: getSVGStr(true) })
    } finally {
      setExporting(false); setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    }
  }

  // ── BG Remover brush ─────────────────────────────────────────────────────────
  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return [(cx - rect.left) * (canvas.width / rect.width), (cy - rect.top) * (canvas.height / rect.height)]
  }

  const paintAt = useCallback((x, y) => {
    const canvas = displayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const r    = (brushSize / 2) * (canvas.width / rect.width)
    ctx.save()
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
    } else if (brushMode === 'restore') {
      const orig = origCanvasRef.current
      if (!orig) { ctx.restore(); return }
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.clip(); ctx.drawImage(orig, 0, 0)
    }
    ctx.restore()
    setCanvasEdited(true)
  }, [brushMode, brushSize])

  const handleCanvasPointerDown = useCallback((e) => {
    if (!brushMode) return; e.preventDefault(); isPainting.current = true
    const [x, y] = getCanvasCoords(e, displayCanvasRef.current); paintAt(x, y)
  }, [brushMode, paintAt])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!isPainting.current || !brushMode || !displayCanvasRef.current) return
    const [x, y] = getCanvasCoords(e, displayCanvasRef.current); paintAt(x, y)
  }, [brushMode, paintAt])

  const handleCanvasPointerUp = useCallback(() => { isPainting.current = false }, [])

  // ── BG file pipeline ─────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setOriginalUrl(prev  => { if (prev)  URL.revokeObjectURL(prev);  return null })
    setProcessedUrl(prev => { if (prev)  URL.revokeObjectURL(prev);  return null })
    const blobUrl = URL.createObjectURL(file)
    setOriginalUrl(blobUrl); setFileName(file.name.replace(/\.[^.]+$/, ''))
    setPhase('processing'); setLoadProgress(0); setStepLabel('Initializing AI engine…')
    setBrushMode(null); setCanvasEdited(false)
    runAIRemoval(blobUrl, (key, pct) => { setStepLabel(keyToLabel(key)); setLoadProgress(pct) })
      .then(resultUrl => { setProcessedUrl(resultUrl); setLoadProgress(100); setStepLabel('Done!'); setTimeout(() => setPhase('done'), 280) })
      .catch(err => { console.error(err); setProcessedUrl(blobUrl); setPhase('done') })
  }, [])

  const handleDrop      = useCallback((e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }, [processFile])
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleFileInput = (e) => processFile(e.target.files[0])

  const handleBGRReset = () => {
    setOriginalUrl(p => { if (p) URL.revokeObjectURL(p); return null })
    setProcessedUrl(p => { if (p) URL.revokeObjectURL(p); return null })
    setFileName(''); setPhase('idle'); setSliderX(50)
    setLoadProgress(0); setStepLabel('Preparing…')
    setBrushMode(null); setCanvasEdited(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const getBGRExportUrl = () =>
    canvasEdited && displayCanvasRef.current ? displayCanvasRef.current.toDataURL('image/png') : processedUrl

  const handleBGRDownload = (ext) => {
    const url = getBGRExportUrl(); if (!url) return
    Object.assign(document.createElement('a'), { href: url, download: `${fileName || 'cutout'}-bg-removed.${ext}` }).click()
  }

  // ── Slider drag ──────────────────────────────────────────────────────────────
  const startSliderDrag = useCallback((e) => {
    if (brushMode) return; e.preventDefault(); setDragging(true)
    const onMove = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX
      const rect = sliderRef.current?.getBoundingClientRect()
      if (!rect) return
      setSliderX(Math.max(2, Math.min(98, ((x - rect.left) / rect.width) * 100)))
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp)
  }, [brushMode])

  const cssFilter = computeFilter({ edgeFeathering, colorSpill, haloThreshold, shadow, relight })
  const [c1, c2]  = palette
  const symbol    = LOGO_PLACEHOLDERS[activeVariant].icon
  const lc        = getLayoutConfig(layout, typography)
  const canVectorize = (studioMode === 'logo' && generated) || (studioMode === 'bgremover' && phase === 'done')

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: 'column', background: '#02020a' }}>

      {/* ── Inner layout row ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ════════════ LEFT SIDEBAR ════════════ */}
        <div style={{
          width: 278, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#060610', borderRight: '1px solid #111118', overflowY: 'auto',
        }}>

          {/* Mode toggle */}
          <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid #111118' }}>
            <div style={{
              display: 'flex', borderRadius: 9, overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)', border: '1px solid #111118',
            }}>
              {[
                { id: 'logo',      label: '✦ Logo Generator', color: '#f472b6' },
                { id: 'bgremover', label: '✂ BG Remover',     color: '#34d399' },
              ].map(({ id, label, color }) => {
                const active = studioMode === id
                return (
                  <button key={id} onClick={() => setStudioMode(id)} style={{
                    flex: 1, padding: '7px 6px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                    background: active ? `${color}18` : 'transparent',
                    border: 'none', color: active ? color : '#334155',
                    transition: 'all 0.18s', borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                  }}>{label}</button>
                )
              })}
            </div>
          </div>

          {/* ── LOGO GENERATOR CONTROLS ── */}
          {studioMode === 'logo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Prompt */}
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe your brand… e.g. a futuristic AI startup with electric cyan energy"
                  style={{
                    width: '100%', minHeight: 82, padding: 10, resize: 'vertical',
                    background: '#0c0c1a', border: '1px solid #1e293b', borderRadius: 8,
                    color: '#e2e8f0', fontSize: 12, lineHeight: 1.6,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }} />

                {/* Style */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#334155', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logo Style</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} style={{
                    width: '100%', padding: '6px 9px', borderRadius: 7, fontSize: 12,
                    background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0', outline: 'none', cursor: 'pointer',
                  }}>
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Palette */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Color Palette</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {SWATCHES.map((sw, i) => {
                      const active = JSON.stringify(palette) === JSON.stringify(sw)
                      return (
                        <button key={i} onClick={() => setPalette(sw)} style={{
                          display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 7, cursor: 'pointer',
                          background: active ? 'rgba(244,114,182,0.07)' : 'transparent',
                          border: active ? '1px solid rgba(244,114,182,0.25)' : '1px solid transparent',
                          transition: 'all 0.15s',
                        }}>
                          {sw.map((c, j) => <div key={j} style={{ width: 16, height: 16, borderRadius: 3, background: c, flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }} />)}
                          <span style={{ fontSize: 10.5, color: '#475569', fontWeight: 500 }}>
                            {['Electric', 'Ember', 'Ocean', 'Violet', 'Amber'][i]}
                          </span>
                        </button>
                      )
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 4 }}>
                      <input type="color" value={customColor}
                        onChange={e => { setCustomColor(e.target.value); setPalette([e.target.value, palette[1], palette[2]]) }}
                        style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }} />
                      <span style={{ fontSize: 10.5, color: '#334155' }}>Custom accent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🤖 AI Smart-Transparency Layer */}
              <div style={{
                margin: '0 12px 10px', borderRadius: 10,
                background: aiTransparency ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${aiTransparency ? 'rgba(0,229,255,0.25)' : '#1e293b'}`,
                padding: '10px 12px', transition: 'all 0.25s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiTransparency ? 8 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={11} style={{ color: aiTransparency ? '#00e5ff' : '#334155' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: aiTransparency ? '#00e5ff' : '#475569' }}>
                      🤖 AI Smart-Transparency
                    </span>
                  </div>
                  <Toggle value={aiTransparency} onChange={setAiTransparency} accentColor="#00e5ff" />
                </div>
                {aiTransparency && (
                  <p style={{ fontSize: 10, color: '#0891b2', lineHeight: 1.55, margin: 0 }}>
                    Logo renders with zero background — pure isolated mark on checkerboard canvas. Auto-pipes through BG removal engine on export.
                  </p>
                )}
              </div>

              {/* Generate button */}
              <div style={{ padding: '0 12px 12px' }}>
                <button onClick={handleGenerate} disabled={generating} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '11px 0', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  cursor: generating ? 'default' : 'pointer',
                  background: generating ? 'rgba(244,114,182,0.04)' : 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(139,92,246,0.18))',
                  border: `1px solid ${generating ? 'rgba(244,114,182,0.1)' : 'rgba(244,114,182,0.38)'}`,
                  color: generating ? '#334155' : '#f472b6',
                  boxShadow: generating ? 'none' : '0 0 22px rgba(244,114,182,0.2)',
                  transition: 'all 0.2s',
                }}>
                  {generating
                    ? <><RefreshCw size={13} style={{ animation: 'vs-spin 1s linear infinite' }} /> Generating…</>
                    : <><Sparkles size={13} /> Generate Logo</>}
                </button>
              </div>

              {/* Layout Matrix */}
              <SectionHeader label="Layout Matrix" />
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #111118', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {LAYOUT_OPTIONS.map(opt => {
                  const active = layout === opt.id
                  return (
                    <button key={opt.id} onClick={() => setLayout(opt.id)} style={{
                      display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 9px',
                      borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                      background: active ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                      border: active ? '1px solid rgba(139,92,246,0.35)' : '1px solid #111118',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? '#a78bfa' : '#475569' }}>{opt.label}</span>
                      <span style={{ fontSize: 9, color: active ? '#7c3aed88' : '#1e293b', fontWeight: 500 }}>{opt.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── BG REMOVER CONTROLS (left sidebar) ── */}
          {studioMode === 'bgremover' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                borderRadius: 10, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)',
                padding: '10px 12px',
              }}>
                <p style={{ fontSize: 10.5, color: '#34d399', fontWeight: 700, marginBottom: 5 }}>How to use</p>
                <ol style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.7, paddingLeft: 14, margin: 0 }}>
                  <li>Drop any image into the canvas</li>
                  <li>AI removes the background instantly</li>
                  <li>Refine edges with the brush tools</li>
                  <li>Adjust precision sliders in the right panel</li>
                </ol>
              </div>
              {phase === 'done' && (
                <button onClick={handleBGRReset} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', color: '#475569',
                }}>
                  <Upload size={12} /> New Image
                </button>
              )}
            </div>
          )}
        </div>

        {/* ════════════ MAIN CANVAS ════════════ */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          justifyContent: (studioMode === 'bgremover' && phase === 'done') ? 'flex-start' : 'center',
          padding: (studioMode === 'bgremover' && phase === 'done') ? '24px 36px' : 36,
          overflowY: 'auto', gap: 16,
        }}>

          {/* ── LOGO CANVAS ── */}
          {studioMode === 'logo' && (
            <>
              <div onClick={() => setSelectedLayer(null)} style={{
                width: 400, height: 400, borderRadius: 18, overflow: 'hidden',
                background: aiTransparency && generated
                  ? 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1c 0% 50%)'
                  : '#070711',
                backgroundSize: '18px 18px',
                border: `1px solid ${generated ? '#1e293b' : '#111118'}`,
                boxShadow: generated ? `0 0 60px rgba(244,114,182,0.1), 0 0 120px rgba(139,92,246,0.06)` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'box-shadow 0.6s', cursor: 'default', position: 'relative',
                filter: cssFilter,
              }}>
                {!generating && !generated && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <ImageIcon size={38} style={{ color: '#1e293b' }} />
                    <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 500 }}>Your logo will appear here</span>
                  </div>
                )}
                {generating && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #070711 0%, rgba(244,114,182,0.04) 50%, #070711 100%)', animation: 'vs-shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 110, height: 110, borderRadius: 22, background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.15)', animation: 'vs-pulse 1.2s ease-in-out infinite' }} />
                      <div style={{ width: 150, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.04)', animation: 'vs-pulse 1.2s ease-in-out 0.2s infinite' }} />
                      <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>
                        {aiTransparency ? 'Vectorizing & isolating layers…' : 'Vectorizing layers…'}
                      </span>
                    </div>
                  </>
                )}
                {generated && (
                  <svg viewBox="0 0 512 512" style={{ width: '100%', height: '100%', display: 'block' }} onClick={e => e.stopPropagation()}>
                    <defs>
                      <linearGradient id="vs-g1" x1="20%" y1="0%" x2="80%" y2="0%">
                        <stop offset="0%" stopColor={c1} />
                        <stop offset="100%" stopColor={c2} />
                      </linearGradient>
                      <radialGradient id="vs-g2" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stopColor={c1} stopOpacity="0.16" />
                        <stop offset="100%" stopColor={c2} stopOpacity="0.03" />
                      </radialGradient>
                    </defs>
                    {!aiTransparency && <><rect width="512" height="512" fill={palette[2]} /><rect width="512" height="512" fill="url(#vs-g2)" /></>}
                    {lc.icon && (
                      <g onClick={e => { e.stopPropagation(); setSelectedLayer('icon') }} style={{ cursor: 'pointer' }}>
                        <IconSVGJSX symbol={symbol} lc={lc} c1={c1} />
                        {selectedLayer === 'icon' && SELECTION_BOXES[layout]?.icon && (() => {
                          const [bx, by, bw, bh] = SELECTION_BOXES[layout].icon
                          return <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="5 3" rx="5" opacity="0.75" style={{ pointerEvents: 'none' }} />
                        })()}
                      </g>
                    )}
                    {lc.wordmark && wordmark && (
                      <g onClick={e => { e.stopPropagation(); setSelectedLayer('wordmark') }} style={{ cursor: 'text' }}>
                        <text x={lc.wordmark.x} y={lc.wordmark.y} textAnchor={lc.wordmark.anchor} dominantBaseline="middle"
                          fontFamily={`'${typography.fontFamily}', Inter, sans-serif`} fontSize={lc.wordmark.size}
                          fontWeight="800" fill="url(#vs-g1)" letterSpacing={typography.letterSpacing}>{wordmark}</text>
                        {selectedLayer === 'wordmark' && SELECTION_BOXES[layout]?.wordmark && (() => {
                          const [bx, by, bw, bh] = SELECTION_BOXES[layout].wordmark
                          return <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="5 3" rx="4" opacity="0.8" style={{ pointerEvents: 'none' }} />
                        })()}
                      </g>
                    )}
                    {lc.tagline && tagline && (
                      <g onClick={e => { e.stopPropagation(); setSelectedLayer('tagline') }} style={{ cursor: 'text' }}>
                        <text x={lc.tagline.x} y={lc.tagline.y} textAnchor={lc.tagline.anchor} dominantBaseline="middle"
                          fontFamily={`'${typography.fontFamily}', Inter, sans-serif`} fontSize={lc.tagline.size}
                          fontWeight="600" fill={c1} fillOpacity="0.62" letterSpacing={Math.max(typography.letterSpacing, 4)}>
                          {tagline.toUpperCase()}
                        </text>
                        {selectedLayer === 'tagline' && SELECTION_BOXES[layout]?.tagline && (() => {
                          const [bx, by, bw, bh] = SELECTION_BOXES[layout].tagline
                          return <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 3" rx="4" opacity="0.8" style={{ pointerEvents: 'none' }} />
                        })()}
                      </g>
                    )}
                  </svg>
                )}
              </div>

              {generated && <span style={{ fontSize: 11, color: '#334155' }}>Click any layer to select &amp; edit it →</span>}

              {/* ⚡ Vectorize button */}
              <button onClick={handleVectorize} disabled={!generated || vectorizing} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 10, fontSize: 12.5, fontWeight: 800,
                cursor: generated && !vectorizing ? 'pointer' : 'default',
                background: vectorized
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.14), rgba(16,185,129,0.08))'
                  : generated
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))'
                    : 'rgba(255,255,255,0.03)',
                border: vectorized
                  ? '1px solid rgba(52,211,153,0.4)'
                  : generated ? '1px solid rgba(245,158,11,0.4)' : '1px solid #111118',
                color: vectorized ? '#34d399' : generated ? '#fbbf24' : '#1e293b',
                boxShadow: vectorized ? '0 0 18px rgba(52,211,153,0.2)' : generated ? '0 0 18px rgba(245,158,11,0.14)' : 'none',
                transition: 'all 0.25s',
              }}>
                {vectorizing
                  ? <><RefreshCw size={13} style={{ animation: 'vs-spin 1s linear infinite' }} /> Tracing geometry…</>
                  : vectorized
                    ? <><Zap size={13} /> Infinite SVG Ready ✓</>
                    : <><Zap size={13} /> Convert to Infinite AI Vector (SVG)</>}
              </button>
            </>
          )}

          {/* ── BG REMOVER CANVAS ── */}
          {studioMode === 'bgremover' && (
            <>
              {phase === 'idle' && (
                <div
                  onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', maxWidth: 560, aspectRatio: '16/9',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
                    borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                    border: `2px dashed ${dragOver ? '#34d399' : 'rgba(52,211,153,0.25)'}`,
                    background: dragOver ? 'rgba(52,211,153,0.04)' : 'rgba(52,211,153,0.015)',
                    boxShadow: dragOver ? '0 0 40px rgba(52,211,153,0.1), inset 0 0 60px rgba(52,211,153,0.04)' : 'none',
                  }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={26} style={{ color: '#34d399' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Drag & Drop Image Here</div>
                    <div style={{ fontSize: 12.5, color: '#475569' }}>or click to browse files</div>
                    <div style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>JPEG · PNG · WEBP · Max 20 MB</div>
                  </div>
                </div>
              )}

              {phase === 'processing' && (
                <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#0a0a18', border: '1px solid #1e293b' }}>
                    {originalUrl && <img src={originalUrl} alt="source" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, display: 'block' }} />}
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #34d399, #8b5cf6, transparent)', boxShadow: '0 0 18px rgba(52,211,153,0.8)', animation: 'vs-scan 2s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', top: 12, right: 14, padding: '4px 10px', borderRadius: 99, background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.4)', fontSize: 10, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'vs-pulse 1s ease-in-out infinite' }} /> AI MODEL ACTIVE
                    </div>
                  </div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={14} style={{ color: '#34d399', animation: 'vs-spin 1s linear infinite' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{stepLabel}</span>
                    </div>
                    <div style={{ width: '100%', maxWidth: 360, height: 4, borderRadius: 99, background: '#0c0c1a', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${loadProgress}%`, background: 'linear-gradient(90deg, #34d399, #8b5cf6)', transition: 'width 0.25s ease', boxShadow: '0 0 10px rgba(52,211,153,0.5)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#475569' }}>{loadProgress}%</span>
                  </div>
                </div>
              )}

              {phase === 'done' && (
                <>
                  {/* Brush toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', maxWidth: 720, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.08em', marginRight: 2 }}>TOOLS</span>
                    {[
                      { mode: null,      Icon: Move,       label: 'Compare',  ac: '#00e5ff', ab: 'rgba(0,229,255,0.14)',  abo: 'rgba(0,229,255,0.45)'  },
                      { mode: 'restore', Icon: Paintbrush, label: 'Restore',  ac: '#34d399', ab: 'rgba(52,211,153,0.14)', abo: 'rgba(52,211,153,0.55)' },
                      { mode: 'erase',   Icon: Eraser,     label: 'Erase',    ac: '#f87171', ab: 'rgba(239,68,68,0.14)',  abo: 'rgba(239,68,68,0.55)'  },
                    ].map(({ mode, Icon, label, ac, ab, abo }) => {
                      const active = brushMode === mode
                      return (
                        <button key={String(mode)} onClick={() => setBrushMode(mode)} style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
                          borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          background: active ? ab : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? abo : '#1e293b'}`, color: active ? ac : '#475569',
                        }}>
                          <Icon size={12} /> {label}
                        </button>
                      )
                    })}
                    {brushMode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                        <span style={{ fontSize: 10.5, color: '#475569' }}>Size</span>
                        <input type="range" min={4} max={80} value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ width: 80, accentColor: '#00e5ff', cursor: 'pointer' }} />
                        <span style={{ fontSize: 10.5, color: '#64748b', minWidth: 20 }}>{brushSize}</span>
                      </div>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#334155' }}>
                      {brushMode === 'restore' ? '🖌️ Paint to restore' : brushMode === 'erase' ? '🧽 Paint to erase' : '↔ Drag to compare'}
                    </span>
                  </div>

                  {/* Image views */}
                  <div style={{ width: '100%', maxWidth: 720 }}>
                    <div style={{ display: brushMode ? 'none' : 'block' }}>
                      <div ref={sliderRef} onMouseDown={startSliderDrag} onTouchStart={startSliderDrag}
                        style={{ width: '100%', aspectRatio: '16/9', position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', background: '#0a0a12', cursor: dragging ? 'ew-resize' : 'col-resize', userSelect: 'none', WebkitUserSelect: 'none' }}>
                        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - sliderX}% 0 0)` }}>
                          {originalUrl && <img src={originalUrl} alt="original" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                          <div style={{ position: 'absolute', top: 10, left: 14, padding: '3px 10px', borderRadius: 99, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', pointerEvents: 'none' }}>ORIGINAL</div>
                        </div>
                        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${sliderX}%)` }}>
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1c 0% 50%)', backgroundSize: '18px 18px' }} />
                          {processedUrl && <img src={processedUrl} alt="cutout" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: cssFilter }} />}
                          <div style={{ position: 'absolute', top: 10, right: 14, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(52,211,153,0.3)', fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', pointerEvents: 'none' }}>BG REMOVED</div>
                        </div>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, left: `${sliderX}%`, pointerEvents: 'none', zIndex: 10, background: 'linear-gradient(180deg, transparent, #34d399 30%, #8b5cf6 70%, transparent)', boxShadow: '0 0 14px rgba(52,211,153,0.55)' }}>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #34d399, #8b5cf6)', boxShadow: '0 0 20px rgba(52,211,153,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all', cursor: 'ew-resize', zIndex: 11 }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <div style={{ width: 2, height: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 1 }} />
                              <div style={{ width: 2, height: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 1 }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: brushMode ? 'block' : 'none' }}>
                      <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', position: 'relative', border: `1px solid ${brushMode === 'erase' ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)'}`, backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1c 0% 50%)', backgroundSize: '18px 18px', cursor: brushMode === 'erase' ? 'cell' : 'crosshair' }}>
                        <canvas ref={displayCanvasRef} style={{ width: '100%', height: '100%', display: 'block', filter: cssFilter }}
                          onMouseDown={handleCanvasPointerDown} onMouseMove={handleCanvasPointerMove}
                          onMouseUp={handleCanvasPointerUp} onMouseLeave={handleCanvasPointerUp}
                          onTouchStart={handleCanvasPointerDown} onTouchMove={handleCanvasPointerMove} onTouchEnd={handleCanvasPointerUp} />
                        <div style={{ position: 'absolute', top: 10, left: 14, padding: '3px 10px', borderRadius: 99, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', pointerEvents: 'none', color: brushMode === 'erase' ? '#f87171' : '#34d399' }}>
                          {brushMode === 'erase' ? '🧽 ERASE MODE' : '🖌️ RESTORE MODE'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <canvas ref={origCanvasRef} style={{ display: 'none' }} />

                  {/* BG Remover download buttons */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 720 }}>
                    <button onClick={() => handleBGRDownload('png')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', boxShadow: '0 0 16px rgba(52,211,153,0.14)' }}>
                      <Download size={13} /> Download PNG
                    </button>
                    <button onClick={() => handleBGRDownload('webp')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', boxShadow: '0 0 16px rgba(139,92,246,0.12)' }}>
                      <Download size={13} /> Download WebP
                    </button>
                  </div>

                  {/* ⚡ Vectorize button */}
                  <button onClick={handleVectorize} disabled={vectorizing} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10,
                    fontSize: 12.5, fontWeight: 800, cursor: vectorizing ? 'default' : 'pointer',
                    background: vectorized ? 'linear-gradient(135deg, rgba(52,211,153,0.14), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
                    border: vectorized ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(245,158,11,0.4)',
                    color: vectorized ? '#34d399' : '#fbbf24',
                    boxShadow: vectorized ? '0 0 18px rgba(52,211,153,0.2)' : '0 0 18px rgba(245,158,11,0.14)',
                    transition: 'all 0.25s',
                  }}>
                    {vectorizing ? <><RefreshCw size={13} style={{ animation: 'vs-spin 1s linear infinite' }} /> Tracing paths…</> : vectorized ? <><Zap size={13} /> Infinite SVG Ready ✓</> : <><Zap size={13} /> Convert to Infinite AI Vector (SVG)</>}
                  </button>
                  <span style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Scissors size={11} style={{ color: '#475569' }} />
                    {canvasEdited ? 'Brush edits included in export' : 'Drag slider to compare original vs. AI cutout'}
                  </span>
                </>
              )}

              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
            </>
          )}
        </div>

        {/* ════════════ RIGHT SIDEBAR ════════════ */}
        <div style={{
          width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#060610', borderLeft: '1px solid #111118', overflowY: 'auto',
        }}>

          {/* Logo typography panel (logo mode only) */}
          {studioMode === 'logo' && (
            <>
              <SectionHeader label="Variations" />
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #111118', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {LOGO_PLACEHOLDERS.map((lp, i) => {
                  const active = activeVariant === i
                  return (
                    <button key={i} onClick={() => setVariant(i)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 9, borderRadius: 8, cursor: 'pointer',
                      background: active ? 'rgba(244,114,182,0.07)' : 'rgba(255,255,255,0.02)',
                      border: active ? '1px solid rgba(244,114,182,0.28)' : '1px solid #111118', transition: 'all 0.15s',
                    }}>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: generated ? `linear-gradient(135deg, ${c1}18, ${c2}18)` : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {generated ? <span style={{ fontSize: 26, background: `linear-gradient(135deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{lp.icon}</span> : <div style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />}
                      </div>
                      <span style={{ fontSize: 9, color: active ? '#94a3b8' : '#334155', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{lp.label}</span>
                    </button>
                  )
                })}
              </div>

              <SectionHeader label="Typography" />
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {!generated ? (
                  <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.55, margin: 0 }}>Generate a logo first, then click any text layer to edit it here.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Wordmark Text</span>
                      <input value={wordmark} onChange={e => setWordmark(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 7, fontSize: 12, background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Tagline</span>
                      <input value={tagline} onChange={e => setTagline(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 7, fontSize: 12, background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Font Family</span>
                      <select value={typography.fontFamily} onChange={e => setTypography(t => ({ ...t, fontFamily: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: 7, fontSize: 12, background: '#0c0c1a', border: '1px solid #1e293b', color: '#e2e8f0', outline: 'none', cursor: 'pointer' }}>
                        {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <PropSlider label="Letter Spacing" value={typography.letterSpacing} min={-2} max={20} step={0.5} unit="px" accent="#f472b6"
                      onChange={v => setTypography(t => ({ ...t, letterSpacing: v }))} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Alignment</span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[{ val: 'left', Icon: AlignLeft }, { val: 'center', Icon: AlignCenter }, { val: 'right', Icon: AlignRight }].map(({ val, Icon }) => {
                          const active = typography.align === val
                          return (
                            <button key={val} onClick={() => setTypography(t => ({ ...t, align: val }))} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', borderRadius: 6, cursor: 'pointer', background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid #1e293b' }}>
                              <Icon size={12} style={{ color: active ? '#a78bfa' : '#475569' }} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Download SVG/PNG (logo mode) */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #111118', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={handleDownloadPNG} disabled={!generated} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, background: generated ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.02)', border: generated ? '1px solid rgba(0,229,255,0.3)' : '1px solid #111118', color: generated ? '#00e5ff' : '#1e293b', cursor: generated ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                  <Download size={11} /> Download PNG{aiTransparency ? ' (transparent)' : ''}
                </button>
                <button onClick={handleDownloadSVG} disabled={!generated} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, background: generated ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)', border: generated ? '1px solid rgba(139,92,246,0.3)' : '1px solid #111118', color: generated ? '#a78bfa' : '#1e293b', cursor: generated ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                  <Download size={11} /> Export Vector SVG
                </button>
              </div>
            </>
          )}

          {/* ── Precision BG Refinement (shared, always visible) ── */}
          <SectionHeader label="Precision Refinement" />
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111118', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PropSlider label="🎚️ Edge Feathering" value={edgeFeathering} min={0} max={20} step={1} unit="px" accent="#a78bfa"
              onChange={setEdgeFeathering} />
            <PropSlider label="🎚️ Color Spill Correction" value={colorSpill} min={0} max={100} step={1} unit="%" accent="#f472b6"
              onChange={setColorSpill} />
            <PropSlider label="📐 Halo Threshold Gate" value={haloThreshold} min={-10} max={10} step={1} unit="px" accent="#fbbf24"
              onChange={setHaloThreshold} />
            {(edgeFeathering > 0 || colorSpill > 0 || haloThreshold !== 0) && (
              <button onClick={() => { setEdgeFeathering(0); setColorSpill(0); setHaloThreshold(0) }} style={{
                padding: '5px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b', color: '#334155',
              }}>↩ Reset sliders</button>
            )}
          </div>

          {/* Shadow Effects */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111118' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: shadow.enabled ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={11} style={{ color: '#475569' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Shadow Effects</span>
              </div>
              <Toggle value={shadow.enabled} onChange={v => setShadow(s => ({ ...s, enabled: v }))} />
            </div>
            {shadow.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <PropSlider label="Offset X" value={shadow.x}    min={-40} max={40} step={1} unit="px" onChange={v => setShadow(s => ({ ...s, x: v }))} />
                <PropSlider label="Offset Y" value={shadow.y}    min={-40} max={40} step={1} unit="px" onChange={v => setShadow(s => ({ ...s, y: v }))} />
                <PropSlider label="Blur"     value={shadow.blur} min={0}   max={60} step={1} unit="px" onChange={v => setShadow(s => ({ ...s, blur: v }))} />
                <PropSlider label="Opacity"  value={shadow.opacity} min={0} max={1} step={0.01} onChange={v => setShadow(s => ({ ...s, opacity: v }))} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>Color</span>
                  <input type="color" value={shadow.color} onChange={e => setShadow(s => ({ ...s, color: e.target.value }))} style={{ width: 26, height: 20, borderRadius: 4, border: '1px solid #1e293b', cursor: 'pointer', padding: 1, background: 'transparent' }} />
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{shadow.color.toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Ambient Relight */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111118' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: relight.enabled ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sun size={11} style={{ color: '#475569' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ambient Relight</span>
              </div>
              <Toggle value={relight.enabled} onChange={v => setRelight(r => ({ ...r, enabled: v }))} />
            </div>
            {relight.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.55, margin: 0 }}>Tints foreground to match your target background luminance.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={relight.bgColor} onChange={e => setRelight(r => ({ ...r, bgColor: e.target.value }))} style={{ width: 26, height: 20, borderRadius: 4, border: '1px solid #1e293b', cursor: 'pointer', padding: 1, background: 'transparent' }} />
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{relight.bgColor.toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Deploy */}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Rocket size={11} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Deploy</span>
            </div>
            {[
              { dest: 'studio',  label: 'Send to Studio',  sub: 'Album Cover · 1:1 crop', color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.35)', Icon: Mic },
              { dest: 'builder', label: 'Send to Builder', sub: 'Transparent PNG · asset', color: '#00e5ff', bg: 'rgba(0,229,255,0.07)', border: 'rgba(0,229,255,0.3)', Icon: Layout },
            ].map(({ dest, label, sub, color, bg, border, Icon }) => {
              const canDeploy = (studioMode === 'logo' && generated) || (studioMode === 'bgremover' && phase === 'done')
              return (
                <button key={dest} onClick={async () => {
                  if (!canDeploy) return
                  let dataUrl
                  if (studioMode === 'logo') dataUrl = await svgToPngDataUrl(getSVGStr(aiTransparency))
                  else dataUrl = getBGRExportUrl() || originalUrl
                  if (!dataUrl) return
                  setPendingTransfer({ dataUrl, destination: dest, name: `${wordmark || fileName || 'Asset'}`, source: 'Vector Studio' })
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, cursor: canDeploy ? 'pointer' : 'default', textAlign: 'left', width: '100%', marginBottom: 7,
                  background: canDeploy ? bg : 'rgba(255,255,255,0.02)',
                  border: canDeploy ? `1px solid ${border}` : '1px solid #111118',
                  color: canDeploy ? color : '#1e293b', boxShadow: canDeploy ? `0 0 12px ${color}22` : 'none', transition: 'all 0.2s',
                }}>
                  <Icon size={11} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 9, opacity: 0.65 }}>{sub}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 🚀 Export Brand Assets Kit */}
          <div style={{ padding: '0 14px 14px', position: 'relative' }}>
            <button
              ref={exportBtnRef}
              onClick={async () => {
                if (exporting) return
                const canExport = (studioMode === 'logo' && generated) || (studioMode === 'bgremover' && phase === 'done')
                if (!canExport) return
                await handleExportKit()
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '11px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                background: exportDone
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))'
                  : exporting
                    ? 'rgba(245,158,11,0.08)'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.1))',
                border: exportDone ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(245,158,11,0.45)',
                color: exportDone ? '#34d399' : exporting ? '#94a3b8' : '#fbbf24',
                boxShadow: exportDone ? '0 0 22px rgba(52,211,153,0.25)' : '0 0 22px rgba(245,158,11,0.18)',
                transition: 'all 0.3s',
              }}>
              {exporting
                ? <><RefreshCw size={13} style={{ animation: 'vs-spin 1s linear infinite' }} /> Packaging brand kit…</>
                : exportDone
                  ? <><Package size={13} /> Brand Kit Downloaded ✓</>
                  : <><Package size={13} /> 🚀 Export Complete Brand Assets Kit</>}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 7 }}>
              {[
                { icon: '🖼', label: 'logo_transparent.png',  sub: 'Alpha-stripped HD raster' },
                { icon: '∞',  label: 'logo_vector.svg',       sub: 'Infinite-scale math vector' },
                { icon: '🎨', label: 'brand_palette.json',    sub: 'Dominant HEX color codes' },
                { icon: '📱', label: 'app_icon_pack.zip',     sub: 'iOS + Android all sizes' },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.01)' }}>
                  <span style={{ fontSize: 11, flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                    <p style={{ fontSize: 8.5, color: '#1e293b', margin: 0 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ BRAND MOCKUP VAULT (bottom panel) ════════════ */}
      <BrandMockupVault
        svgDataUrl={mockupDataUrl}
        c1={c1} c2={c2}
        open={mockupOpen}
        onToggle={() => setMockupOpen(v => !v)}
      />

      <style>{`
        @keyframes vs-spin     { to { transform: rotate(360deg); } }
        @keyframes vs-shimmer  { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes vs-pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.2)} }
        @keyframes vs-scan     { 0%{top:-2px} 100%{top:calc(100% + 2px)} }
        @keyframes vs-slideDown{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
