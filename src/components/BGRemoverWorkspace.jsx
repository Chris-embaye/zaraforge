import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Download, Scissors, RefreshCw, Mic, Layout, Rocket, Paintbrush, Eraser, Move, Sun, Sliders } from 'lucide-react'
import { useAssetLibraryStore } from '../store/assetLibraryStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function keyToLabel(key = '') {
  if (key.startsWith('fetch:session') || key.startsWith('load'))  return 'Downloading AI model…'
  if (key.startsWith('fetch:image'))                               return 'Loading image data…'
  if (key.startsWith('compute:inference'))                         return 'Running neural segmentation…'
  if (key.startsWith('compute:encode'))                            return 'Encoding transparency mask…'
  if (key.startsWith('fetch'))                                     return 'Fetching resources…'
  if (key.startsWith('compute'))                                   return 'Processing pixels…'
  return 'Analyzing image…'
}

function hexToRgb(hex = '#000000') {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
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

function computeFilter(shadow, relight) {
  const parts = []
  if (relight.enabled) {
    const { brightness, hueRotate, saturation } = analyzeAmbient(relight.bgColor)
    parts.push(`brightness(${brightness}) hue-rotate(${hueRotate}deg) saturate(${saturation})`)
  }
  if (shadow.enabled) {
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

// ── Sub-components ────────────────────────────────────────────────────────────

function PropSlider({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 10.5, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {step < 1 ? Number(value).toFixed(2) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }} />
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

// ── Main component ────────────────────────────────────────────────────────────

export default function BGRemoverWorkspace() {
  const [phase,        setPhase]        = useState('idle')
  const [originalUrl,  setOriginalUrl]  = useState(null)
  const [processedUrl, setProcessedUrl] = useState(null)
  const [fileName,     setFileName]     = useState('')
  const [stepLabel,    setStepLabel]    = useState('Preparing…')
  const [loadProgress, setLoadProgress] = useState(0)
  const [dragOver,     setDragOver]     = useState(false)
  const [sliderX,      setSliderX]      = useState(50)
  const [dragging,     setDragging]     = useState(false)

  // Brush
  const [brushMode,    setBrushMode]    = useState(null)   // null | 'restore' | 'erase'
  const [brushSize,    setBrushSize]    = useState(24)
  const [canvasEdited, setCanvasEdited] = useState(false)

  // Shadow
  const [shadow, setShadow] = useState({ enabled: false, x: 4, y: 8, blur: 16, opacity: 0.6, color: '#000000' })

  // Relight
  const [relight, setRelight] = useState({ enabled: false, bgColor: '#1a1a2e' })

  const { setPendingTransfer } = useAssetLibraryStore()
  const fileRef          = useRef(null)
  const sliderRef        = useRef(null)
  const displayCanvasRef = useRef(null)
  const origCanvasRef    = useRef(null)
  const isPainting       = useRef(false)

  // ── Init canvas pair when AI result arrives ────────────────────────────────
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

  // ── Brush helpers ──────────────────────────────────────────────────────────
  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return [
      (cx - rect.left) * (canvas.width  / rect.width),
      (cy - rect.top)  * (canvas.height / rect.height),
    ]
  }

  const paintAt = useCallback((x, y) => {
    const canvas = displayCanvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const r    = (brushSize / 2) * (canvas.width / rect.width)

    ctx.save()
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fill()
    } else if (brushMode === 'restore') {
      const orig = origCanvasRef.current
      if (!orig) { ctx.restore(); return }
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(orig, 0, 0)
    }
    ctx.restore()
    setCanvasEdited(true)
  }, [brushMode, brushSize])

  const handleCanvasPointerDown = useCallback((e) => {
    if (!brushMode) return
    e.preventDefault()
    isPainting.current = true
    const [x, y] = getCanvasCoords(e, displayCanvasRef.current)
    paintAt(x, y)
  }, [brushMode, paintAt])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!isPainting.current || !brushMode || !displayCanvasRef.current) return
    const [x, y] = getCanvasCoords(e, displayCanvasRef.current)
    paintAt(x, y)
  }, [brushMode, paintAt])

  const handleCanvasPointerUp = useCallback(() => { isPainting.current = false }, [])

  // ── File pipeline ──────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setOriginalUrl(prev  => { if (prev)  URL.revokeObjectURL(prev);  return null })
    setProcessedUrl(prev => { if (prev)  URL.revokeObjectURL(prev);  return null })

    const blobUrl = URL.createObjectURL(file)
    setOriginalUrl(blobUrl)
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    setPhase('processing')
    setLoadProgress(0)
    setStepLabel('Initializing AI engine…')
    setBrushMode(null)
    setCanvasEdited(false)

    runAIRemoval(blobUrl, (key, pct) => {
      setStepLabel(keyToLabel(key))
      setLoadProgress(pct)
    }).then(resultUrl => {
      setProcessedUrl(resultUrl)
      setLoadProgress(100)
      setStepLabel('Done!')
      setTimeout(() => setPhase('done'), 280)
    }).catch(err => {
      console.error('AI background removal failed:', err)
      setProcessedUrl(blobUrl)
      setPhase('done')
    })
  }, [])

  const handleDrop      = useCallback((e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }, [processFile])
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleFileInput = (e) => processFile(e.target.files[0])

  const handleReset = () => {
    setOriginalUrl(prev  => { if (prev)  URL.revokeObjectURL(prev);  return null })
    setProcessedUrl(prev => { if (prev)  URL.revokeObjectURL(prev);  return null })
    setFileName(''); setPhase('idle'); setSliderX(50)
    setLoadProgress(0); setStepLabel('Preparing…')
    setBrushMode(null); setCanvasEdited(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const getExportDataUrl = () => {
    if (canvasEdited && displayCanvasRef.current)
      return displayCanvasRef.current.toDataURL('image/png')
    return processedUrl
  }

  const handleDownload = (ext) => {
    const url = getExportDataUrl()
    if (!url) return
    const a = Object.assign(document.createElement('a'), {
      href: url, download: `${fileName || 'cutout'}-bg-removed.${ext}`,
    })
    a.click()
  }

  const sendToWorkspace = (destination) => {
    const url = getExportDataUrl() || originalUrl
    if (!url) return
    setPendingTransfer({
      dataUrl: url, destination,
      name:    fileName ? `${fileName} (BG Removed)` : 'Cutout Image',
      source:  'BG Remover',
    })
  }

  // ── Slider drag ────────────────────────────────────────────────────────────
  const startSliderDrag = useCallback((e) => {
    if (brushMode) return
    e.preventDefault()
    setDragging(true)
    const onMove = (ev) => {
      const x    = ev.touches ? ev.touches[0].clientX : ev.clientX
      const rect = sliderRef.current?.getBoundingClientRect()
      if (!rect) return
      setSliderX(Math.max(2, Math.min(98, ((x - rect.left) / rect.width) * 100)))
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend',  onUp)
  }, [brushMode])

  const cssFilter = computeFilter(shadow, relight)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: '#02020a' }}>

      {/* ── Main column ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: phase === 'done' ? 'flex-start' : 'center',
        padding: phase === 'done' ? '28px 36px' : 48,
        overflowY: 'auto', gap: 18,
      }}>

        {/* Idle dropzone */}
        {phase === 'idle' && (
          <div
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', maxWidth: 560, aspectRatio: '16/9',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
              borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
              border: `2px dashed ${dragOver ? '#00e5ff' : 'rgba(0,229,255,0.25)'}`,
              background: dragOver ? 'rgba(0,229,255,0.04)' : 'rgba(0,229,255,0.015)',
              boxShadow: dragOver ? '0 0 40px rgba(0,229,255,0.12), inset 0 0 60px rgba(0,229,255,0.04)' : 'none',
            }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={26} style={{ color: '#00e5ff' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                Drag & Drop Image Here
              </div>
              <div style={{ fontSize: 12.5, color: '#475569' }}>or click to browse files</div>
              <div style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>JPEG · PNG · WEBP · Max 20 MB</div>
            </div>
          </div>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            <div style={{
              width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden',
              position: 'relative', background: '#0a0a18', border: '1px solid #1e293b',
            }}>
              {originalUrl && (
                <img src={originalUrl} alt="source"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, display: 'block' }} />
              )}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, #00e5ff, #8b5cf6, transparent)',
                boxShadow: '0 0 18px rgba(0,229,255,0.8)',
                animation: 'bgr-scan 2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', top: 12, right: 14, padding: '4px 10px', borderRadius: 99,
                background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)',
                fontSize: 10, fontWeight: 700, color: '#a78bfa',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: 'bgr-pulse 1s ease-in-out infinite' }} />
                AI MODEL ACTIVE
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} style={{ color: '#00e5ff', animation: 'bgr-spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#00e5ff' }}>{stepLabel}</span>
              </div>
              <div style={{ width: '100%', maxWidth: 360, height: 4, borderRadius: 99, background: '#0c0c1a', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${loadProgress}%`,
                  background: 'linear-gradient(90deg, #00e5ff, #8b5cf6)', transition: 'width 0.25s ease',
                  boxShadow: '0 0 10px rgba(0,229,255,0.5)',
                }} />
              </div>
              <span style={{ fontSize: 11, color: '#475569' }}>{loadProgress}%</span>
              {loadProgress < 5 && (
                <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
                  First run downloads the AI segmentation model (~20 MB).<br />
                  Subsequent removals are instant from cache.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Done view */}
        {phase === 'done' && (
          <>
            {/* Brush toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', maxWidth: 720, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.08em', marginRight: 2 }}>TOOLS</span>
              {[
                { mode: null,      Icon: Move,       label: 'Compare',  activeColor: '#00e5ff', activeBg: 'rgba(0,229,255,0.14)',  activeBorder: 'rgba(0,229,255,0.45)'  },
                { mode: 'restore', Icon: Paintbrush, label: 'Restore',  activeColor: '#34d399', activeBg: 'rgba(52,211,153,0.14)', activeBorder: 'rgba(52,211,153,0.55)' },
                { mode: 'erase',   Icon: Eraser,     label: 'Erase',    activeColor: '#f87171', activeBg: 'rgba(239,68,68,0.14)',  activeBorder: 'rgba(239,68,68,0.55)'  },
              ].map(({ mode, Icon, label, activeColor, activeBg, activeBorder }) => {
                const active = brushMode === mode
                return (
                  <button key={String(mode)} onClick={() => setBrushMode(mode)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? activeBg       : 'rgba(255,255,255,0.04)',
                    border:     `1px solid ${active ? activeBorder : '#1e293b'}`,
                    color:      active ? activeColor    : '#475569',
                  }}>
                    <Icon size={12} /> {label}
                  </button>
                )
              })}

              {brushMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                  <span style={{ fontSize: 10.5, color: '#475569' }}>Size</span>
                  <input type="range" min={4} max={80} step={1} value={brushSize}
                    onChange={e => setBrushSize(parseInt(e.target.value))}
                    style={{ width: 80, accentColor: '#00e5ff', cursor: 'pointer' }} />
                  <span style={{ fontSize: 10.5, color: '#64748b', minWidth: 20, textAlign: 'right' }}>{brushSize}</span>
                </div>
              )}

              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#334155' }}>
                {brushMode === 'restore' ? '🖌️ Paint to restore pixels'
                  : brushMode === 'erase' ? '🧽 Paint to erase pixels'
                  : '↔ Drag slider to compare'}
              </span>
            </div>

            {/* Image view area — both always mounted, toggled via display */}
            <div style={{ width: '100%', maxWidth: 720 }}>

              {/* Before/After slider — hidden in brush mode */}
              <div style={{ display: brushMode ? 'none' : 'block' }}>
                <div
                  ref={sliderRef}
                  onMouseDown={startSliderDrag}
                  onTouchStart={startSliderDrag}
                  style={{
                    width: '100%', aspectRatio: '16/9', position: 'relative',
                    borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b',
                    background: '#0a0a12', cursor: dragging ? 'ew-resize' : 'col-resize',
                    userSelect: 'none', WebkitUserSelect: 'none',
                  }}>
                  {/* LEFT — original */}
                  <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - sliderX}% 0 0)` }}>
                    {originalUrl && (
                      <img src={originalUrl} alt="original"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                    <div style={{
                      position: 'absolute', top: 10, left: 14, padding: '3px 10px',
                      borderRadius: 99, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                      fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', pointerEvents: 'none',
                    }}>ORIGINAL</div>
                  </div>
                  {/* RIGHT — AI cutout on checkerboard */}
                  <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${sliderX}%)` }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1c 0% 50%)',
                      backgroundSize: '18px 18px',
                    }} />
                    {processedUrl && (
                      <img src={processedUrl} alt="cutout"
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'cover', display: 'block', filter: cssFilter,
                        }} />
                    )}
                    <div style={{
                      position: 'absolute', top: 10, right: 14, padding: '3px 10px',
                      borderRadius: 99, background: 'rgba(0,229,255,0.15)', backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0,229,255,0.3)',
                      fontSize: 10, fontWeight: 700, color: '#00e5ff', letterSpacing: '0.08em', pointerEvents: 'none',
                    }}>BG REMOVED</div>
                  </div>
                  {/* Drag handle */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1,
                    left: `${sliderX}%`, pointerEvents: 'none', zIndex: 10,
                    background: 'linear-gradient(180deg, transparent, #00e5ff 30%, #8b5cf6 70%, transparent)',
                    boxShadow: '0 0 14px rgba(0,229,255,0.55)',
                  }}>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00e5ff, #8b5cf6)',
                      boxShadow: '0 0 22px rgba(0,229,255,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'all', cursor: 'ew-resize', zIndex: 11,
                    }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <div style={{ width: 2, height: 14, background: 'rgba(0,0,0,0.55)', borderRadius: 1 }} />
                        <div style={{ width: 2, height: 14, background: 'rgba(0,0,0,0.55)', borderRadius: 1 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas edit mode — hidden when compare mode */}
              <div style={{ display: brushMode ? 'block' : 'none' }}>
                <div style={{
                  width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden',
                  position: 'relative',
                  border: `1px solid ${brushMode === 'erase' ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)'}`,
                  backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d1c 0% 50%)',
                  backgroundSize: '18px 18px',
                  cursor: brushMode === 'erase' ? 'cell' : 'crosshair',
                }}>
                  <canvas
                    ref={displayCanvasRef}
                    style={{ width: '100%', height: '100%', display: 'block', filter: cssFilter }}
                    onMouseDown={handleCanvasPointerDown}
                    onMouseMove={handleCanvasPointerMove}
                    onMouseUp={handleCanvasPointerUp}
                    onMouseLeave={handleCanvasPointerUp}
                    onTouchStart={handleCanvasPointerDown}
                    onTouchMove={handleCanvasPointerMove}
                    onTouchEnd={handleCanvasPointerUp}
                  />
                  <div style={{
                    position: 'absolute', top: 10, left: 14, padding: '3px 10px',
                    borderRadius: 99, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', pointerEvents: 'none',
                    color: brushMode === 'erase' ? '#f87171' : '#34d399',
                  }}>
                    {brushMode === 'erase' ? '🧽 ERASE MODE' : '🖌️ RESTORE MODE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden orig canvas for restore brush sampling */}
            <canvas ref={origCanvasRef} style={{ display: 'none' }} />

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 720 }}>
              <button onClick={handleReset} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', color: '#475569',
              }}>
                <Upload size={13} /> New Image
              </button>
              <button onClick={() => handleDownload('png')} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff',
                boxShadow: '0 0 16px rgba(0,229,255,0.14)',
              }}>
                <Download size={13} /> Download PNG
              </button>
              <button onClick={() => handleDownload('webp')} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa',
                boxShadow: '0 0 16px rgba(139,92,246,0.12)',
              }}>
                <Download size={13} /> Download WebP
              </button>
            </div>

            <span style={{ fontSize: 11, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Scissors size={11} style={{ color: '#475569' }} />
              {canvasEdited ? 'Brush edits are included in export and deploy' : 'Drag the slider to compare original vs. AI cutout'}
            </span>
          </>
        )}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
      </div>

      {/* ── Right properties panel (done state only) ──────────────────────── */}
      {phase === 'done' && (
        <div style={{
          width: 252, flexShrink: 0, borderLeft: '1px solid #0f172a',
          background: '#050508', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Shadow Effects */}
          <div style={{ padding: '16px 16px', borderBottom: '1px solid #0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: shadow.enabled ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={11} style={{ color: '#475569' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Shadow Effects
                </span>
              </div>
              <Toggle value={shadow.enabled} onChange={v => setShadow(s => ({ ...s, enabled: v }))} />
            </div>
            {shadow.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <PropSlider label="Offset X" value={shadow.x} min={-40} max={40} step={1} unit="px"
                  onChange={v => setShadow(s => ({ ...s, x: v }))} />
                <PropSlider label="Offset Y" value={shadow.y} min={-40} max={40} step={1} unit="px"
                  onChange={v => setShadow(s => ({ ...s, y: v }))} />
                <PropSlider label="Blur" value={shadow.blur} min={0} max={60} step={1} unit="px"
                  onChange={v => setShadow(s => ({ ...s, blur: v }))} />
                <PropSlider label="Opacity" value={shadow.opacity} min={0} max={1} step={0.01}
                  onChange={v => setShadow(s => ({ ...s, opacity: v }))} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={shadow.color}
                      onChange={e => setShadow(s => ({ ...s, color: e.target.value }))}
                      style={{ width: 28, height: 22, borderRadius: 4, border: '1px solid #1e293b', cursor: 'pointer', padding: 1, background: 'transparent' }} />
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{shadow.color.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ambient Relight */}
          <div style={{ padding: '16px 16px', borderBottom: '1px solid #0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: relight.enabled ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sun size={11} style={{ color: '#475569' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Ambient Relight
                </span>
              </div>
              <Toggle value={relight.enabled} onChange={v => setRelight(r => ({ ...r, enabled: v }))} />
            </div>
            {relight.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.55, margin: 0 }}>
                  Tints the foreground to match the luminance of your target background.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>Background Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={relight.bgColor}
                      onChange={e => setRelight(r => ({ ...r, bgColor: e.target.value }))}
                      style={{ width: 28, height: 22, borderRadius: 4, border: '1px solid #1e293b', cursor: 'pointer', padding: 1, background: 'transparent' }} />
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{relight.bgColor.toUpperCase()}</span>
                  </div>
                </div>
                {/* Computed adjustments preview */}
                {(() => {
                  const { brightness, hueRotate, saturation } = analyzeAmbient(relight.bgColor)
                  return (
                    <div style={{ padding: '8px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.025)', border: '1px solid #0f172a' }}>
                      {[
                        ['Brightness', `×${brightness}`],
                        ['Hue Shift',  `${hueRotate}°`],
                        ['Saturation', `×${saturation}`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: '#475569' }}>{k}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Quick Deploy */}
          <div style={{ padding: '16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Rocket size={11} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Quick Deploy
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => sendToWorkspace('studio')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: '100%',
                background: 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.38)',
                color: '#f472b6', boxShadow: '0 0 14px rgba(244,114,182,0.15)',
              }}>
                <Mic size={13} style={{ flexShrink: 0 }} />
                <div>
                  <div>Send to Studio</div>
                  <div style={{ fontSize: 9, opacity: 0.65, fontWeight: 500 }}>Album Cover · 1:1 crop</div>
                </div>
              </button>
              <button onClick={() => sendToWorkspace('builder')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: '100%',
                background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.32)',
                color: '#00e5ff', boxShadow: '0 0 14px rgba(0,229,255,0.12)',
              }}>
                <Layout size={13} style={{ flexShrink: 0 }} />
                <div>
                  <div>Send to Builder</div>
                  <div style={{ fontSize: 9, opacity: 0.65, fontWeight: 500 }}>Transparent PNG · no bounding box</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bgr-scan  { 0% { top: -2px; } 100% { top: calc(100% + 2px); } }
        @keyframes bgr-spin  { to { transform: rotate(360deg); } }
        @keyframes bgr-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  )
}
