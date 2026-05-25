import { useVideoStore } from '../store/videoStore'

const PRESETS = [
  { id: 'h264-1080p',   label: 'H.264 — 1080p',         format: 'H.264',   width: 1920, height: 1080, fps: 29.97, bitrate: 8000,  audioBitrate: 320 },
  { id: 'h265-1080p',   label: 'H.265 / HEVC — 1080p',  format: 'H.265',   width: 1920, height: 1080, fps: 29.97, bitrate: 5000,  audioBitrate: 256 },
  { id: 'h264-4k',      label: 'H.264 — 4K UHD',        format: 'H.264',   width: 3840, height: 2160, fps: 29.97, bitrate: 40000, audioBitrate: 320 },
  { id: 'prores422',    label: 'ProRes 422 HQ',          format: 'ProRes',  width: 1920, height: 1080, fps: 29.97, bitrate: 220000,audioBitrate: 320 },
  { id: 'dnxhd',        label: 'DNxHD 185x',             format: 'DNxHD',   width: 1920, height: 1080, fps: 29.97, bitrate: 185000,audioBitrate: 320 },
  { id: 'yt-1080p',     label: 'YouTube 1080p',          format: 'H.264',   width: 1920, height: 1080, fps: 29.97, bitrate: 8000,  audioBitrate: 320 },
  { id: 'reels-9-16',   label: 'Instagram Reels 9:16',   format: 'H.264',   width: 1080, height: 1920, fps: 30,    bitrate: 6000,  audioBitrate: 256 },
  { id: 'tiktok',       label: 'TikTok Vertical',        format: 'H.264',   width: 1080, height: 1920, fps: 30,    bitrate: 6000,  audioBitrate: 256 },
  { id: 'twitter',      label: 'Twitter / X',            format: 'H.264',   width: 1280, height: 720,  fps: 30,    bitrate: 4000,  audioBitrate: 192 },
  { id: 'vimeo-4k',     label: 'Vimeo 4K',              format: 'H.264',   width: 3840, height: 2160, fps: 23.976,bitrate: 30000, audioBitrate: 320 },
  { id: 'gif',          label: 'Animated GIF',           format: 'GIF',     width: 960,  height: 540,  fps: 15,    bitrate: 0,     audioBitrate: 0 },
  { id: 'mp3',          label: 'Audio Only — MP3',       format: 'MP3',     width: 0,    height: 0,    fps: 0,     bitrate: 0,     audioBitrate: 320 },
]

function Label({ children, style }) {
  return <div style={{ fontSize: 8.5, color: '#1e3a5f', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, ...style }}>{children}</div>
}

function Row({ label, value, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 9.5, color: '#475569', width: 80, flexShrink: 0 }}>{label}</span>
      {children ?? <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'monospace' }}>{value}</span>}
    </div>
  )
}

export default function VideoExportPanel() {
  const {
    exportSettings, setExportSetting,
    exportState, exportProgress, startExport, resetExport,
    setShowExportPanel,
    duration,
  } = useVideoStore()

  const es = exportSettings

  function applyPreset(preset) {
    setExportSetting('preset',       preset.id)
    setExportSetting('format',       preset.format)
    setExportSetting('width',        preset.width)
    setExportSetting('height',       preset.height)
    setExportSetting('fps',          preset.fps)
    setExportSetting('bitrate',      preset.bitrate)
    setExportSetting('audioBitrate', preset.audioBitrate)
  }

  const isRendering = exportState === 'rendering'
  const isDone      = exportState === 'done'

  const estSizeMB = es.format === 'MP3'
    ? ((es.audioBitrate * duration) / 8 / 1024).toFixed(1)
    : (((es.bitrate + es.audioBitrate) * duration) / 8 / 1024).toFixed(1)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 620, maxHeight: '88vh', overflowY: 'auto',
        background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #111118', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>Export Settings</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Adobe Media Encoder — style export queue</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowExportPanel(false)} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: 16, fontFamily: 'inherit',
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Presets */}
          <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #111118', padding: '12px 0', overflowY: 'auto' }}>
            <div style={{ padding: '0 12px', marginBottom: 8, fontSize: 8.5, color: '#1e3a5f', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>FORMAT PRESETS</div>
            {PRESETS.map(p => {
              const active = es.preset === p.id
              return (
                <div key={p.id} onClick={() => applyPreset(p)} style={{
                  padding: '7px 14px', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                  background: active ? 'rgba(99,102,241,0.1)' : 'none',
                  color: active ? '#a5b4fc' : '#475569',
                  borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
                >
                  {p.label}
                </div>
              )
            })}
          </div>

          {/* Right: Settings */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
            {/* Output name */}
            <Label>Output File</Label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input value={es.filename} onChange={e => setExportSetting('filename', e.target.value)}
                style={{ flex: 1, padding: '6px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
              <span style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#475569', fontSize: 10, alignSelf: 'center' }}>
                .{es.format === 'H.264' || es.format === 'H.265' ? 'mp4' : es.format === 'ProRes' || es.format === 'DNxHD' ? 'mov' : es.format === 'GIF' ? 'gif' : 'mp3'}
              </span>
            </div>

            {/* Video settings */}
            {es.format !== 'MP3' && (
              <>
                <Label>Video</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 14 }}>
                  <Row label="Format">
                    <span style={{ fontSize: 9.5, color: '#a5b4fc', fontWeight: 700 }}>{es.format}</span>
                  </Row>
                  <Row label="Resolution">
                    <span style={{ fontSize: 9.5, color: '#a5b4fc', fontWeight: 700 }}>{es.width}×{es.height}</span>
                  </Row>
                  <Row label="Frame Rate">
                    <span style={{ fontSize: 9.5, color: '#a5b4fc', fontWeight: 700 }}>{es.fps} fps</span>
                  </Row>
                  <Row label="Bitrate">
                    <span style={{ fontSize: 9.5, color: '#a5b4fc', fontWeight: 700 }}>{es.bitrate >= 1000 ? `${(es.bitrate / 1000).toFixed(0)} Mbps` : `${es.bitrate} kbps`}</span>
                  </Row>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9.5, color: '#475569' }}>Video Bitrate</span>
                    <span style={{ fontSize: 9.5, color: '#a5b4fc', fontFamily: 'monospace' }}>{es.bitrate} kbps</span>
                  </div>
                  <input type="range" min={500} max={80000} step={500} value={es.bitrate}
                    onChange={e => setExportSetting('bitrate', +e.target.value)}
                    style={{ width: '100%', accentColor: '#6366f1' }} />
                </div>
              </>
            )}

            {/* Audio settings */}
            {es.audioBitrate > 0 && (
              <>
                <Label>Audio</Label>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9.5, color: '#475569' }}>Audio Bitrate</span>
                    <span style={{ fontSize: 9.5, color: '#34d399', fontFamily: 'monospace' }}>{es.audioBitrate} kbps</span>
                  </div>
                  <input type="range" min={64} max={320} step={32} value={es.audioBitrate}
                    onChange={e => setExportSetting('audioBitrate', +e.target.value)}
                    style={{ width: '100%', accentColor: '#34d399' }} />
                </div>
              </>
            )}

            {/* Summary */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#475569' }}>Estimated File Size</span>
                <span style={{ fontSize: 9.5, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>~{estSizeMB} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: '#475569' }}>Duration</span>
                <span style={{ fontSize: 9.5, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>
                  {String(Math.floor(duration / 60)).padStart(2,'0')}:{String(Math.floor(duration % 60)).padStart(2,'0')}
                </span>
              </div>
            </div>

            {/* Progress bar when rendering */}
            {(isRendering || isDone) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9.5, color: isDone ? '#34d399' : '#a5b4fc', fontWeight: 700 }}>
                    {isDone ? '✓ Render Complete' : `Rendering… ${exportProgress}%`}
                  </span>
                  {isDone && (
                    <button onClick={resetExport} style={{ fontSize: 9, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
                  )}
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: isDone ? 'linear-gradient(90deg,#34d399,#6366f1)' : 'linear-gradient(90deg,#6366f1,#00e5ff)',
                    width: `${exportProgress}%`, transition: 'width 0.2s',
                  }} />
                </div>
              </div>
            )}

            {/* Export / Cancel button */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={isRendering ? undefined : isDone ? resetExport : startExport}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: isRendering ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                  background: isDone ? 'rgba(52,211,153,0.15)'
                    : isRendering ? 'rgba(99,102,241,0.1)'
                    : 'linear-gradient(90deg,rgba(99,102,241,0.35),rgba(0,229,255,0.2))',
                  color: isDone ? '#34d399' : isRendering ? '#a5b4fc' : '#e2e8f0',
                  border: `1px solid ${isDone ? 'rgba(52,211,153,0.3)' : isRendering ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.4)'}`,
                  transition: 'all 0.18s',
                }}>
                {isDone ? '✓ Render Complete — Export Again?'
                  : isRendering ? `⌛ Rendering ${exportProgress}%…`
                  : '⬆ Start Export / Add to Queue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
