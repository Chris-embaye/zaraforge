import { useState, useEffect } from 'react'
import { useAssetLibraryStore } from '../store/assetLibraryStore'

// Phases: 'crop' → 'commit' → done
export default function AssetTransferOverlay() {
  const { pendingTransfer, clearPendingTransfer, setStudioAlbumCover, addBuilderAsset } = useAssetLibraryStore()
  const [phase, setPhase] = useState('crop')   // 'crop' | 'commit' | 'done'
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!pendingTransfer) return
    setPhase('crop')
    setProgress(0)

    // Phase 1 — crop animation (1.4s)
    const t1 = setTimeout(() => {
      setPhase('commit')
      let p = 0
      const iv = setInterval(() => {
        p += 12
        setProgress(Math.min(p, 100))
        if (p >= 100) {
          clearInterval(iv)
          // Commit to store
          if (pendingTransfer.destination === 'studio') {
            setStudioAlbumCover({ dataUrl: pendingTransfer.dataUrl, name: pendingTransfer.name, source: pendingTransfer.source })
          } else {
            addBuilderAsset({ dataUrl: pendingTransfer.dataUrl, name: pendingTransfer.name, source: pendingTransfer.source })
          }
          setPhase('done')
          setTimeout(() => clearPendingTransfer(), 900)
        }
      }, 50)
    }, 1400)

    return () => clearTimeout(t1)
  }, [pendingTransfer?.dataUrl, pendingTransfer?.destination])

  if (!pendingTransfer) return null

  const isStudio  = pendingTransfer.destination === 'studio'
  const accentCol = isStudio ? '#f472b6' : '#00e5ff'
  const label     = isStudio ? 'Studio — Album Cover · 1:1' : 'Builder — Asset Library · Transparent'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,2,10,0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'ato-fade-in 0.25s ease',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        padding: '40px 48px', borderRadius: 20,
        background: '#07071180', border: `1px solid ${accentCol}25`,
        boxShadow: `0 0 60px ${accentCol}18`,
        minWidth: 360,
      }}>

        {/* Label */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: accentCol,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            {phase === 'done' ? '✓ Transfer Complete' : phase === 'commit' ? 'Injecting…' : 'Framing asset'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</div>
        </div>

        {/* Preview frame */}
        <div style={{ position: 'relative', width: 240, height: 240 }}>

          {/* Checkerboard background (always) — shows transparency for Builder */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #0d0d18 0% 50%)',
            backgroundSize: '16px 16px',
            borderRadius: 12, overflow: 'hidden',
            opacity: isStudio ? 0 : 1,
            transition: 'opacity 0.5s',
          }} />

          {/* Image */}
          <img
            src={pendingTransfer.dataUrl}
            alt="asset"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: 12, display: 'block',
              filter: isStudio ? 'none' : 'saturate(1.2)',
            }}
          />

          {/* Crop guides — animate in from outside */}
          {isStudio && (
            <>
              {/* Top guide */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: accentCol,
                boxShadow: `0 0 8px ${accentCol}`,
                top: phase === 'crop' ? '50%' : 0,
                transition: 'top 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
              {/* Bottom guide */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: accentCol,
                boxShadow: `0 0 8px ${accentCol}`,
                bottom: phase === 'crop' ? '50%' : 0,
                transition: 'bottom 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
              {/* Left guide */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 2,
                background: accentCol,
                boxShadow: `0 0 8px ${accentCol}`,
                left: phase === 'crop' ? '50%' : 0,
                transition: 'left 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
              {/* Right guide */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 2,
                background: accentCol,
                boxShadow: `0 0 8px ${accentCol}`,
                right: phase === 'crop' ? '50%' : 0,
                transition: 'right 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
              {/* Corner brackets */}
              {[['0','0'], ['0','auto'], ['auto','0'], ['auto','auto']].map(([t,b], i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: t === 'auto' ? undefined : -2,
                  bottom: t === 'auto' ? -2 : undefined,
                  left: b === 'auto' ? undefined : -2,
                  right: b === 'auto' ? -2 : undefined,
                  width: 14, height: 14,
                  borderTop:    (i < 2) ? `2px solid ${accentCol}` : undefined,
                  borderBottom: (i >= 2) ? `2px solid ${accentCol}` : undefined,
                  borderLeft:   (i === 0 || i === 2) ? `2px solid ${accentCol}` : undefined,
                  borderRight:  (i === 1 || i === 3) ? `2px solid ${accentCol}` : undefined,
                }} />
              ))}
            </>
          )}

          {/* Builder: scanning overlay */}
          {!isStudio && phase !== 'done' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${accentCol}, transparent)`,
              boxShadow: `0 0 12px ${accentCol}`,
              animation: 'ato-scan 1.4s ease-in-out infinite',
              top: 0,
            }} />
          )}

          {/* Done overlay flash */}
          {phase === 'done' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: `${accentCol}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ato-fade-in 0.3s ease',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${accentCol}22`, border: `2px solid ${accentCol}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>✓</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {phase === 'commit' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 3, borderRadius: 99, background: '#0c0c1a', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accentCol}, ${isStudio ? '#a78bfa' : '#8b5cf6'})`,
                transition: 'width 0.05s linear',
                boxShadow: `0 0 8px ${accentCol}66`,
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
              {isStudio ? 'Cropping to 1:1 · encoding album cover…' : 'Preserving alpha channel · indexing into library…'}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ fontSize: 12, fontWeight: 700, color: accentCol, textAlign: 'center' }}>
            {isStudio
              ? 'Album cover set in Vocal Studio'
              : 'Asset added to Builder library'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ato-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ato-scan    { 0% { top: -2px; } 100% { top: calc(100% + 2px); } }
      `}</style>
    </div>
  )
}
