import { useState, useRef, useCallback, useEffect } from 'react'
import { useVideoStore, fmtDuration, fmtBytes } from '../store/videoStore'
import CaptionsPanel from './CaptionsPanel'
import AICreativePanel from './AICreativePanel'

// ── File metadata extraction ──────────────────────────────────────────────────

function extractVideoMeta(file, url) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted   = true
    video.src     = url

    const finish = (thumbnail) => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0
      video.src = ''
      resolve({ duration: dur, thumbnail })
    }

    video.onloadedmetadata = () => {
      const seekTo = Math.min(Math.max(video.duration * 0.08, 0.5), video.duration - 0.1)
      if (isNaN(seekTo) || seekTo < 0) { finish(null); return }
      video.currentTime = seekTo
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = 128
        canvas.height = 72
        canvas.getContext('2d').drawImage(video, 0, 0, 128, 72)
        finish(canvas.toDataURL('image/jpeg', 0.82))
      } catch {
        finish(null)
      }
    }

    video.onerror = () => finish(null)
    setTimeout(() => finish(null), 10_000)
  })
}

async function extractAudioMeta(file, url) {
  // 1. Duration via <audio>
  const duration = await new Promise((resolve) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src     = url
    audio.onloadedmetadata = () => resolve(isFinite(audio.duration) ? audio.duration : 0)
    audio.onerror = () => resolve(0)
    setTimeout(() => resolve(audio.duration || 0), 6_000)
  })

  // 2. Waveform via Web Audio API (skip for files > 300 MB to avoid OOM)
  const NUM_BARS = 64
  let waveform = null

  if (file.size < 300 * 1024 * 1024) {
    try {
      const buf     = await file.arrayBuffer()
      const ctx     = new (window.AudioContext || window.webkitAudioContext)()
      const decoded = await ctx.decodeAudioData(buf)
      ctx.close()

      const raw       = decoded.getChannelData(0)
      const blockSize = Math.floor(raw.length / NUM_BARS)
      const peaks     = []
      for (let i = 0; i < NUM_BARS; i++) {
        let peak = 0
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(raw[i * blockSize + j])
          if (v > peak) peak = v
        }
        peaks.push(peak)
      }
      const maxPeak = Math.max(...peaks) || 1
      waveform = peaks.map(p => p / maxPeak)
    } catch { /* fall through to synthetic */ }
  }

  if (!waveform) {
    // Synthetic waveform that looks musical
    waveform = Array.from({ length: NUM_BARS }, (_, i) => {
      const base = 0.35
        + Math.sin(i * 0.28) * 0.22
        + Math.sin(i * 0.71) * 0.16
        + Math.sin(i * 1.43) * 0.08
      return Math.max(0.04, Math.min(1, base + (((i * 37 + 13) % 17) / 17) * 0.14))
    })
  }

  return { duration, waveform }
}

// ── Process dropped / selected files ─────────────────────────────────────────

async function processFiles(files, addAsset, onStart, onDone) {
  const supported = files.filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'))
  if (!supported.length) return

  onStart(supported.length)

  for (const file of supported) {
    const url  = URL.createObjectURL(file)
    const id   = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const name = file.name.replace(/\.[^.]+$/, '')

    try {
      if (file.type.startsWith('video/')) {
        const { duration, thumbnail } = await extractVideoMeta(file, url)
        addAsset({
          id, name, fileName: file.name,
          url, type: 'video',
          duration: fmtDuration(duration),
          durationRaw: duration,
          thumbnail,
          size: fmtBytes(file.size),
        })
      } else {
        const { duration, waveform } = await extractAudioMeta(file, url)
        addAsset({
          id, name, fileName: file.name,
          url, type: 'audio',
          duration: fmtDuration(duration),
          durationRaw: duration,
          waveform,
          size: fmtBytes(file.size),
        })
      }
    } catch {
      URL.revokeObjectURL(url)
    }
  }

  onDone()
}

// ── Media drop-zone ───────────────────────────────────────────────────────────

function MediaDropzone({ onFiles }) {
  const fileInputRef   = useRef(null)
  const dragCounterRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCounterRef.current++
    setIsDragging(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragging(false) }
  }
  const handleDragOver  = (e) => { e.preventDefault() }
  const handleDrop      = (e) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    onFiles(Array.from(e.dataTransfer.files))
  }
  const handleChange    = (e) => {
    onFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        margin: '8px 8px 6px',
        borderRadius: 10,
        border: `1.5px dashed ${isDragging ? 'rgba(0,229,255,0.8)' : 'rgba(255,255,255,0.12)'}`,
        background: isDragging
          ? 'rgba(0,229,255,0.07)'
          : 'rgba(255,255,255,0.02)',
        padding: '11px 8px',
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        boxShadow: isDragging ? '0 0 20px rgba(0,229,255,0.12), inset 0 0 12px rgba(0,229,255,0.04)' : 'none',
        userSelect: 'none',
      }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <span style={{ fontSize: 20 }}>{isDragging ? '✨' : '📥'}</span>
      <span style={{
        fontSize: 10.5, fontWeight: 800,
        color: isDragging ? '#00e5ff' : '#475569',
        letterSpacing: '0.03em', textAlign: 'center',
      }}>
        {isDragging ? 'Drop to Import' : 'Import Media'}
      </span>
      <span style={{ fontSize: 9, color: '#1e3a5f', textAlign: 'center', lineHeight: 1.4 }}>
        {isDragging ? 'Release to add to library' : 'Drag & drop or click\nVideo · Audio · Music'}
      </span>
    </div>
  )
}

// ── Import progress indicator ─────────────────────────────────────────────────

function ImportProgress({ count }) {
  return (
    <div style={{
      margin: '0 8px 6px',
      padding: '8px 10px',
      borderRadius: 8,
      background: 'rgba(0,229,255,0.05)',
      border: '1px solid rgba(0,229,255,0.2)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14, animation: 'lsSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#00e5ff' }}>Processing {count} file{count !== 1 ? 's' : ''}…</div>
        <div style={{ fontSize: 9, color: '#334155', marginTop: 1 }}>Extracting metadata & thumbnails</div>
      </div>
    </div>
  )
}

// ── Video asset card ──────────────────────────────────────────────────────────

function VideoAssetCard({ asset, onAdd, onRemove }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        padding: '5px 8px',
        borderRadius: 8,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 5,
        transition: 'background 0.15s',
        cursor: 'default',
        overflow: 'hidden',
      }}>

      {/* Thumbnail */}
      <div style={{
        width: 58, height: 33, borderRadius: 5, flexShrink: 0,
        background: asset.thumbnail ? `url(${asset.thumbnail}) center/cover no-repeat` : 'linear-gradient(135deg, #6d28d966, #4c1d9566)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!asset.thumbnail && <span style={{ fontSize: 14, opacity: 0.6 }}>🎬</span>}
        {/* Play icon overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>

      {/* Metadata */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 8, paddingRight: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {asset.name}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 8.5, color: '#334155', fontFamily: 'monospace' }}>{asset.duration}</span>
          <span style={{ width: 2, height: 2, borderRadius: '50%', background: '#1e3a5f', flexShrink: 0 }} />
          <span style={{ fontSize: 8.5, color: '#1e3a5f' }}>{asset.size}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center', flexShrink: 0 }}>
        <button
          onClick={() => onAdd(asset)}
          title="Add to Timeline (CAM A track)"
          style={{
            width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
            background: hovered ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)',
            color: '#a5b4fc', fontSize: 13, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.4)'}
          onMouseLeave={e => e.currentTarget.style.background = hovered ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)'}
        >
          +
        </button>
        <button
          onClick={() => onRemove(asset.id, 'video')}
          title="Remove from library"
          style={{
            width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: hovered ? '#f87171' : '#1e3a5f',
            fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Audio asset card ──────────────────────────────────────────────────────────

function AudioAssetCard({ asset, onAdd, onRemove }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 8px',
        borderRadius: 8,
        background: hovered ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
        marginBottom: 5,
        transition: 'all 0.15s',
      }}>

      {/* Waveform display */}
      <div style={{
        height: 28, display: 'flex', alignItems: 'center', gap: 1.5,
        marginBottom: 5, overflow: 'hidden',
      }}>
        {(asset.waveform ?? []).map((v, i) => (
          <div key={i} style={{
            width: 2, borderRadius: 1, flexShrink: 0,
            background: hovered ? '#34d399' : '#1e4035',
            height: `${Math.max(v * 100, 6)}%`,
            transition: 'background 0.15s',
          }} />
        ))}
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <span style={{ fontSize: 12, marginRight: 6 }}>🎵</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, color: '#94a3b8',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {asset.name}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 1 }}>
            <span style={{ fontSize: 8.5, color: '#334155', fontFamily: 'monospace' }}>{asset.duration}</span>
            <span style={{ fontSize: 8.5, color: '#1e3a5f' }}>{asset.size}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
          <button
            onClick={() => onAdd(asset)}
            title="Add to Master Audio Track"
            style={{
              width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
              background: hovered ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.1)',
              color: '#34d399', fontSize: 13, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
            +
          </button>
          <button
            onClick={() => onRemove(asset.id, 'audio')}
            title="Remove from library"
            style={{
              width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: hovered ? '#f87171' : '#1e3a5f',
              fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Demo static clip card (placeholder until user imports) ────────────────────

const DEMO_CLIPS = [
  { id: 'a1', label: 'Main Intro.mp4',     dur: '0:10', color: '#6d28d9' },
  { id: 'a2', label: 'B-Roll — City',      dur: '0:08', color: '#4338ca' },
  { id: 'a3', label: 'B-Roll — Crowd',     dur: '0:08', color: '#3730a3' },
  { id: 'a4', label: 'Main Scene 2.mp4',   dur: '0:11', color: '#7c3aed' },
  { id: 'a5', label: 'Outro.mp4',          dur: '0:07', color: '#5b21b6' },
  { id: 'a6', label: 'Master Beat Track',  dur: '0:30', color: '#065f46' },
]

function DemoAssetItem({ clip }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px', borderRadius: 7,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      cursor: 'default', marginBottom: 4, opacity: 0.55,
    }}>
      <div style={{
        width: 34, height: 22, borderRadius: 4, flexShrink: 0,
        background: `linear-gradient(135deg, ${clip.color}aa, ${clip.color}44)`,
        border: `1px solid ${clip.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, color: '#475569',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{clip.label}</div>
        <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>{clip.dur} — demo</div>
      </div>
    </div>
  )
}

// ── Beat Sync Engine ──────────────────────────────────────────────────────────

function BeatSyncPanel() {
  const { analyzeBeats, isAnalyzing, analyzeProgress, beatMarkers, beatSyncOn, setBeatSyncOn } = useVideoStore()
  const beatCount = beatMarkers.length
  const pct = Math.round(analyzeProgress * 100)

  return (
    <div style={{
      margin: '0 8px 10px',
      borderRadius: 10,
      border: '1px solid rgba(0,229,255,0.18)',
      background: 'linear-gradient(160deg, rgba(0,229,255,0.05) 0%, rgba(99,102,241,0.05) 100%)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '9px 12px 7px',
        borderBottom: '1px solid rgba(0,229,255,0.1)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 11 }}>✨</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#00e5ff', letterSpacing: '0.04em' }}>
          AI Beat Sync Engine
        </span>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 9.5, color: '#334155', marginBottom: 10, lineHeight: 1.5 }}>
          {beatCount > 0
            ? `${beatCount} beats detected at 128 BPM`
            : 'Parses drum transients & sub-bass drops to lock cuts to the groove.'}
        </div>

        <button
          onClick={analyzeBeats}
          disabled={isAnalyzing}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 8,
            cursor: isAnalyzing ? 'default' : 'pointer',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'inherit',
            background: isAnalyzing
              ? 'rgba(0,229,255,0.08)'
              : 'linear-gradient(90deg, rgba(0,229,255,0.2), rgba(99,102,241,0.2))',
            color: isAnalyzing ? '#334155' : '#00e5ff',
            border: `1px solid ${isAnalyzing ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.25)'}`,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          {isAnalyzing ? (
            <>
              <span style={{ animation: 'lsSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span>
              Analyzing… {pct}%
            </>
          ) : (
            <>{beatCount > 0 ? 'Re-Analyze Beats' : 'Analyze Track Beats'}</>
          )}
        </button>

        {isAnalyzing && (
          <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #00e5ff, #6366f1)', width: `${pct}%`, transition: 'width 0.1s linear' }} />
          </div>
        )}

        {beatCount > 0 && !isAnalyzing && (
          <div style={{ marginTop: 8, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {Array.from({ length: Math.min(beatCount, 28) }, (_, i) => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: '#00e5ff',
                opacity: 0.5 + (i % 4 === 0 ? 0.5 : 0),
                boxShadow: i % 4 === 0 ? '0 0 4px rgba(0,229,255,0.8)' : 'none',
              }} />
            ))}
            {beatCount > 28 && <span style={{ fontSize: 9, color: '#334155', alignSelf: 'center' }}>+{beatCount - 28}</span>}
          </div>
        )}

        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 9px', borderRadius: 7,
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>Auto-Snap Cuts to Beat</div>
            <div style={{ fontSize: 8.5, color: '#1e293b', marginTop: 1 }}>Stretches / snaps cuts to markers</div>
          </div>
          <div onClick={() => setBeatSyncOn(!beatSyncOn)} style={{
            width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
            background: beatSyncOn ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${beatSyncOn ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
            position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
              background: beatSyncOn ? '#00e5ff' : '#334155',
              left: beatSyncOn ? 16 : 2, transition: 'all 0.2s',
              boxShadow: beatSyncOn ? '0 0 6px rgba(0,229,255,0.7)' : 'none',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent = '#1e3a5f' }) {
  return (
    <div style={{
      padding: '6px 10px 4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 9.5, fontWeight: 800, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {count != null && (
        <span style={{
          fontSize: 9, fontWeight: 800, color: accent,
          background: `${accent}20`, padding: '1px 6px', borderRadius: 99,
          border: `1px solid ${accent}33`,
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── B-Roll suggestion panel ───────────────────────────────────────────────────

const BROLL_KEYWORDS = [
  { keyword: 'money',     clips: ['Cash close-up', 'Stock ticker', 'Gold bars'] },
  { keyword: 'crypto',    clips: ['Bitcoin logo zoom', 'Chart surge', 'Digital wallet'] },
  { keyword: 'running',   clips: ['Athlete slow-mo', 'City marathon', 'Track sprint'] },
  { keyword: 'city life', clips: ['NYC skyline', 'Rush hour commute', 'Street market'] },
  { keyword: 'success',   clips: ['Handshake', 'Trophy raise', 'Laptop celebration'] },
]

function BRollPanel() {
  const { brollEnabled, setBrollEnabled, brollKeywords, setBrollKeywords } = useVideoStore()
  const [detected, setDetected] = useState(false)
  const [scanning, setScanning] = useState(false)

  function detectKeywords() {
    setScanning(true)
    setTimeout(() => {
      setBrollKeywords(['money', 'city life', 'success'])
      setBrollEnabled(true)
      setDetected(true)
      setScanning(false)
    }, 1800)
  }

  const matched = BROLL_KEYWORDS.filter(b => brollKeywords.includes(b.keyword))

  return (
    <div style={{ padding: '10px 8px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
        🔍 AI Auto B-Roll Layer
      </div>
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
        Scans your transcript for keywords and drops matching B-roll onto Video Track 2.
      </div>

      <button onClick={detectKeywords} disabled={scanning} style={{
        width: '100%', padding: '9px 0', borderRadius: 8, marginBottom: 12,
        fontSize: 10, fontWeight: 800, cursor: scanning ? 'default' : 'pointer',
        fontFamily: 'inherit',
        background: scanning ? 'rgba(0,229,255,0.06)' : detected ? 'linear-gradient(90deg,rgba(52,211,153,0.2),rgba(0,229,255,0.15))' : 'linear-gradient(90deg,rgba(0,229,255,0.18),rgba(99,102,241,0.18))',
        border: `1px solid ${scanning ? 'rgba(0,229,255,0.15)' : detected ? 'rgba(52,211,153,0.35)' : 'rgba(0,229,255,0.3)'}`,
        color: scanning ? '#334155' : detected ? '#34d399' : '#00e5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        transition: 'all 0.2s',
      }}>
        {scanning
          ? <><span style={{ animation: 'lsSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span> Scanning transcript…</>
          : detected ? '✓ Re-Scan Keywords' : '🔍 Detect & Infuse B-Roll'}
      </button>

      {detected && matched.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Matched Keywords
          </div>
          {matched.map(b => (
            <div key={b.keyword} style={{
              marginBottom: 8, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#00e5ff', marginBottom: 5 }}>
                "{b.keyword}"
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {b.clips.map(clip => (
                  <div key={clip} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 7px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ width: 22, height: 13, borderRadius: 3, flexShrink: 0, background: 'linear-gradient(135deg,#6366f155,#4338ca44)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{clip}</span>
                    <div style={{ marginLeft: 'auto', fontSize: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', padding: '1px 4px', borderRadius: 4, color: '#34d399', fontWeight: 700 }}>
                      Track 2
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            padding: '7px 9px', borderRadius: 7,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: brollEnabled ? '#00e5ff' : '#475569' }}>
                B-Roll Overlay Active
              </div>
              <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>Shows on Video Track 2</div>
            </div>
            <div onClick={() => setBrollEnabled(!brollEnabled)} style={{
              width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
              background: brollEnabled ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${brollEnabled ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              position: 'relative', transition: 'all 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
                background: brollEnabled ? '#00e5ff' : '#334155',
                left: brollEnabled ? 16 : 2, transition: 'all 0.2s',
                boxShadow: brollEnabled ? '0 0 6px rgba(0,229,255,0.7)' : 'none',
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab nav ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'media',    label: '📁 Media' },
  { id: 'captions', label: '🔤 Captions' },
  { id: 'broll',    label: '🔍 B-Roll' },
  { id: 'ai',       label: '🤖 AI' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function VideoLeftSidebar() {
  const { videoAssets, audioAssets, addAsset, removeAsset, addClipFromAsset, generateProxies, setGenerateProxies } = useVideoStore()
  const [processing, setProcessing] = useState(false)
  const [processingCount, setProcessingCount] = useState(0)
  const [activeTab, setActiveTab] = useState('media')

  const handleFiles = useCallback(async (files) => {
    await processFiles(
      files,
      addAsset,
      (count) => { setProcessing(true); setProcessingCount(count) },
      ()      => { setProcessing(false); setProcessingCount(0) },
    )
  }, [addAsset])

  const hasUserAssets = videoAssets.length > 0 || audioAssets.length > 0

  return (
    <div style={{
      width: 200, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(8,8,20,0.72)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #1a1a2e', flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 2px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 8.5, fontWeight: 800,
              background: activeTab === tab.id ? 'rgba(0,229,255,0.07)' : 'transparent',
              color: activeTab === tab.id ? '#00e5ff' : '#334155',
              borderBottom: `2px solid ${activeTab === tab.id ? '#00e5ff' : 'transparent'}`,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Media tab ── */}
      {activeTab === 'media' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Proxy Tools */}
          <div style={{ margin: '8px 8px 0', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: generateProxies ? '#a5b4fc' : '#475569' }}>
                  Generate Proxies on Import
                </div>
                <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>4K → 720p proxy for editing</div>
              </div>
              <div onClick={() => setGenerateProxies(!generateProxies)} style={{
                width: 32, height: 17, borderRadius: 99, cursor: 'pointer',
                background: generateProxies ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${generateProxies ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                position: 'relative', transition: 'all 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 2, borderRadius: '50%', width: 11, height: 11,
                  background: generateProxies ? '#a5b4fc' : '#334155',
                  left: generateProxies ? 17 : 2, transition: 'all 0.2s',
                  boxShadow: generateProxies ? '0 0 6px rgba(99,102,241,0.7)' : 'none',
                }} />
              </div>
            </div>
            {generateProxies && (
              <div style={{ marginTop: 6, padding: '4px 6px', borderRadius: 5, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 8.5, color: '#818cf8' }}>
                ⚡ Proxy active — swap to full-res on export
              </div>
            )}
          </div>

          <MediaDropzone onFiles={handleFiles} />
          {processing && <ImportProgress count={processingCount} />}

          {videoAssets.length > 0 && (
            <div style={{ borderBottom: '1px solid #111118', paddingBottom: 6 }}>
              <SectionHeader label="Your Videos" count={videoAssets.length} accent="#a78bfa" />
              <div style={{ padding: '0 8px' }}>
                {videoAssets.map(asset => (
                  <VideoAssetCard key={asset.id} asset={asset} onAdd={addClipFromAsset} onRemove={removeAsset} />
                ))}
              </div>
            </div>
          )}

          {audioAssets.length > 0 && (
            <div style={{ borderBottom: '1px solid #111118', paddingBottom: 6 }}>
              <SectionHeader label="Your Audio" count={audioAssets.length} accent="#34d399" />
              <div style={{ padding: '0 8px' }}>
                {audioAssets.map(asset => (
                  <AudioAssetCard key={asset.id} asset={asset} onAdd={addClipFromAsset} onRemove={removeAsset} />
                ))}
              </div>
            </div>
          )}

          {!hasUserAssets && (
            <div style={{ borderBottom: '1px solid #111118', paddingBottom: 6 }}>
              <SectionHeader label="Demo Assets" />
              <div style={{ padding: '0 8px' }}>
                {DEMO_CLIPS.map(c => <DemoAssetItem key={c.id} clip={c} />)}
              </div>
              <div style={{
                margin: '4px 10px 0', padding: '6px 8px', borderRadius: 7,
                border: '1px dashed rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                color: '#1e3a5f', fontSize: 9.5, fontWeight: 700, opacity: 0.7,
              }}>
                <span style={{ fontSize: 11 }}>☝</span>
                Import your own files above
              </div>
            </div>
          )}

          <div style={{ paddingTop: 10, flexShrink: 0 }}>
            <SectionHeader label="Beat Sync Engine" accent="#00e5ff" />
            <BeatSyncPanel />
          </div>
        </div>
      )}

      {/* ── Captions tab ── */}
      {activeTab === 'captions' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <CaptionsPanel />
        </div>
      )}

      {/* ── B-Roll tab ── */}
      {activeTab === 'broll' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <BRollPanel />
        </div>
      )}

      {/* ── AI Creative Engine tab ── */}
      {activeTab === 'ai' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AICreativePanel />
        </div>
      )}

      <style>{`
        @keyframes lsSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
