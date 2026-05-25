import { useRef, useEffect, useCallback, useState } from 'react'
import { useVideoStore, TRACKS, TRACK_STYLE, PPS, DURATION, waveH } from '../store/videoStore'
import VideoTranscriptPanel from './VideoTranscriptPanel'
import ViralClipSlicer from './ViralClipSlicer'

const EDGE_PX = 10  // px from clip edge that triggers trim cursor

const INTERP_OPTIONS = [
  { id: 'linear',  label: 'Linear',    icon: '↗' },
  { id: 'ease',    label: 'Ease',      icon: '∿' },
  { id: 'easeIn',  label: 'Ease In',   icon: '⌒' },
  { id: 'easeOut', label: 'Ease Out',  icon: '⌣' },
  { id: 'hold',    label: 'Hold',      icon: '⏸' },
]

const LABEL_W   = 158
const TRACK_H   = 54
const RULER_H   = 26
const TOOLBAR_H = 44

function fmtRuler(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(Math.floor(s % 60)).padStart(2, '0')
  return `${mm}:${ss}`
}

function fmtTC(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(Math.floor(s % 60)).padStart(2, '0')
  const ff = String(Math.floor((s % 1) * 30)).padStart(2, '0')
  return `${mm}:${ss}:${ff}`
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'select',     emoji: '↖',  label: 'Select'            },
  { id: 'razor',      emoji: '✂️',  label: 'Razor / Cut'       },
  { id: 'ripple',     emoji: '🗑️',  label: 'Ripple Delete'     },
  { id: 'transition', emoji: '🔀',  label: 'Transition Sync'   },
  { id: 'keyframe',   emoji: '💎',  label: 'Keyframe Marker'   },
  { id: 'tracker',    emoji: '🎯',  label: 'Motion Tracker'    },
]

function TimelineToolbar({ activeTool, setActiveTool, currentTime, camSyncState, syncCamAudio, multiCamMode, setMultiCamMode, velocityGraphOpen, setVelocityGraphOpen, transcriptOpen, setTranscriptOpen, viralSlicerOpen, setViralSlicerOpen, clearClips, zoomLevel, setZoomLevel, inPoint, outPoint, setInPoint, setOutPoint, clearInOut, snapEnabled, setSnapEnabled, addSequenceMarker, detectSceneEdits, sceneEditDetecting, undo, redo, setShowAudioMixer, setShowExportPanel }) {
  const syncing = camSyncState === 'analyzing'
  const synced  = camSyncState === 'synced'
  const [confirmClear, setConfirmClear] = useState(false)

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2500); return }
    clearClips()
    setConfirmClear(false)
  }

  return (
    <div style={{
      height: TOOLBAR_H, display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 12px', flexShrink: 0,
      background: 'rgba(6,6,18,0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Clear Project Slate */}
      <button
        onClick={handleClear}
        title="Clear all clips from the timeline"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          background: confirmClear ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
          color: confirmClear ? '#f87171' : '#475569',
          border: confirmClear ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
        <span style={{ fontSize: 13 }}>🗑️</span>
        <span className="tl-label">{confirmClear ? 'Confirm?' : 'Clear Slate'}</span>
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', marginRight: 2 }} />

      {TOOLS.map(t => {
        const active = activeTool === t.id
        return (
          <button key={t.id} onClick={() => setActiveTool(t.id)} title={t.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            color:  active ? '#a5b4fc' : '#475569',
            transition: 'all 0.15s',
            boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.35)' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>{t.emoji}</span>
            <span className="tl-label">{t.label}</span>
          </button>
        )
      })}

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', marginLeft: 2, marginRight: 2 }} />

      {/* Multi-cam mode toggle */}
      <button
        onClick={() => setMultiCamMode(!multiCamMode)}
        title="Multi-Cam Sequence Mode"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          background: multiCamMode ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.04)',
          color: multiCamMode ? '#fbbf24' : '#475569',
          border: multiCamMode ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 13 }}>📹</span>
        <span className="tl-label">Multi-Cam</span>
      </button>

      {/* Audio sync button */}
      <button
        onClick={syncCamAudio}
        disabled={syncing}
        title="Auto-Sync Cameras via Audio Waveform"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit',
          background: synced  ? 'rgba(52,211,153,0.12)'
            : syncing ? 'rgba(0,229,255,0.06)'
            : 'rgba(255,255,255,0.04)',
          color: synced  ? '#34d399'
            : syncing ? '#00e5ff'
            : '#475569',
          border: synced  ? '1px solid rgba(52,211,153,0.25)'
            : syncing ? '1px solid rgba(0,229,255,0.15)'
            : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 13, animation: syncing ? 'tlSpin 0.8s linear infinite' : 'none', display: 'inline-block' }}>
          {synced ? '✅' : '🔊'}
        </span>
        <span className="tl-label">{synced ? 'Cams Synced' : syncing ? 'Syncing…' : 'Sync Audio'}</span>
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', marginLeft: 2, marginRight: 2 }} />

      {/* Velocity Graph toggle */}
      <button
        onClick={() => setVelocityGraphOpen(!velocityGraphOpen)}
        title="Toggle Velocity Graph View"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          background: velocityGraphOpen ? 'rgba(129,140,248,0.14)' : 'rgba(255,255,255,0.04)',
          color: velocityGraphOpen ? '#818cf8' : '#475569',
          border: velocityGraphOpen ? '1px solid rgba(129,140,248,0.3)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 12 }}>💎</span>
        <span className="tl-label">Graph</span>
      </button>

      {/* Transcript toggle */}
      <button
        onClick={() => setTranscriptOpen(!transcriptOpen)}
        title="Toggle AI Transcript Panel"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          background: transcriptOpen ? 'rgba(196,181,253,0.14)' : 'rgba(255,255,255,0.04)',
          color: transcriptOpen ? '#c4b5fd' : '#475569',
          border: transcriptOpen ? '1px solid rgba(196,181,253,0.3)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 12 }}>🤖</span>
        <span className="tl-label">Transcript</span>
      </button>

      {/* Viral Clip Slicer */}
      <button
        onClick={() => setViralSlicerOpen(true)}
        title="AI Viral Clip Slicer — Find your best 30-second shorts"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          background: viralSlicerOpen ? 'rgba(251,146,60,0.18)' : 'rgba(255,255,255,0.04)',
          color: viralSlicerOpen ? '#fb923c' : '#475569',
          border: viralSlicerOpen ? '1px solid rgba(251,146,60,0.35)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
        <span style={{ fontSize: 12 }}>🎬</span>
        <span className="tl-label">Clip Slicer</span>
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', marginLeft: 2, marginRight: 2 }} />

      {/* Snap toggle */}
      <button onClick={() => setSnapEnabled(!snapEnabled)} title="Toggle Snap (S)" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        background: snapEnabled ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
        color: snapEnabled ? '#34d399' : '#475569',
        border: snapEnabled ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 12 }}>🧲</span>
        <span className="tl-label">Snap</span>
      </button>

      {/* Add Marker */}
      <button onClick={() => addSequenceMarker()} title="Add Marker (M)" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        background: 'rgba(255,255,255,0.04)', color: '#fbbf24',
        border: '1px solid transparent', transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 12 }}>📍</span>
        <span className="tl-label">Marker</span>
      </button>

      {/* Scene Edit Detection */}
      <button onClick={detectSceneEdits} disabled={sceneEditDetecting} title="Detect Scene Edits" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: sceneEditDetecting ? 'default' : 'pointer', fontFamily: 'inherit',
        background: sceneEditDetecting ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
        color: sceneEditDetecting ? '#34d399' : '#475569',
        border: '1px solid transparent', transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 12, animation: sceneEditDetecting ? 'tlSpin 0.8s linear infinite' : 'none', display: 'inline-block' }}>🔬</span>
        <span className="tl-label">{sceneEditDetecting ? 'Detecting…' : 'Scene Detect'}</span>
      </button>

      {/* Undo / Redo */}
      <button onClick={undo} title="Undo (Ctrl+Z)" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>↩</button>
      <button onClick={redo} title="Redo (Ctrl+Y)" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>↪</button>

      {/* Audio Mixer */}
      <button onClick={() => setShowAudioMixer(v => !v)} title="Audio Mixer" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        background: 'rgba(255,255,255,0.04)', color: '#34d399',
        border: '1px solid transparent', transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 12 }}>🎚️</span>
        <span className="tl-label">Mixer</span>
      </button>

      {/* Export */}
      <button onClick={() => setShowExportPanel(true)} title="Export" style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        background: 'rgba(99,102,241,0.14)', color: '#a5b4fc',
        border: '1px solid rgba(99,102,241,0.3)', transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 12 }}>⬆️</span>
        <span className="tl-label">Export</span>
      </button>

      <div style={{ flex: 1 }} />

      {/* In / Out points */}
      <button onClick={setInPoint} title="Set In Point (I)" style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8,
        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: inPoint != null ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.04)',
        color: inPoint != null ? '#fbbf24' : '#475569', border: '1px solid transparent',
      }}>
        <span style={{ fontSize: 11 }}>◁</span>
        <span className="tl-label">In</span>
      </button>
      <button onClick={setOutPoint} title="Set Out Point (O)" style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8,
        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: outPoint != null ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.04)',
        color: outPoint != null ? '#fbbf24' : '#475569', border: '1px solid transparent',
      }}>
        <span style={{ fontSize: 11 }}>▷</span>
        <span className="tl-label">Out</span>
      </button>
      {(inPoint != null || outPoint != null) && (
        <button onClick={clearInOut} title="Clear In/Out" style={{
          padding: '5px 6px', borderRadius: 8, fontSize: 10, cursor: 'pointer',
          background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid transparent', fontFamily: 'inherit',
        }}>✕</button>
      )}

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', marginLeft: 2, marginRight: 2 }} />

      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 8 }}>
        <button onClick={() => setZoomLevel(zoomLevel * 0.7)} title="Zoom Out (−)" style={{
          width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
        }}>−</button>
        <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', minWidth: 28, textAlign: 'center' }}>
          {zoomLevel.toFixed(1)}×
        </span>
        <button onClick={() => setZoomLevel(zoomLevel * 1.4)} title="Zoom In (+)" style={{
          width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
        }}>+</button>
      </div>

      {/* Timecode */}
      <div style={{
        fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#00e5ff',
        letterSpacing: '0.06em',
        background: 'rgba(0,229,255,0.07)', padding: '4px 12px',
        borderRadius: 7, border: '1px solid rgba(0,229,255,0.18)', flexShrink: 0,
      }}>
        {fmtTC(currentTime)}
      </div>
    </div>
  )
}

// ── Clip right-click context menu ─────────────────────────────────────────────
function ClipContextMenu({ menu, onClose, onTimeRamp, timeRamps, clipKeyframes, setKeyframeInterp, deleteClip, unlinkClip }) {
  const [interpOpen, setInterpOpen] = useState(false)
  if (!menu) return null
  const hasRamp = !!timeRamps[menu.clipId]
  const clip = menu.clip ?? null
  const isLinked = !!clip?.linkedGroupId

  // Gather all keyframe prop/index pairs for this clip for interp submenu
  const allKFs = []
  const kfMap = clipKeyframes[menu.clipId] ?? {}
  Object.entries(kfMap).forEach(([prop, kfs]) => {
    kfs.forEach((kf, idx) => allKFs.push({ prop, idx, kf }))
  })
  const hasKFs = allKFs.length > 0

  const items = [
    { icon: '⏱', label: hasRamp ? 'Remove Speed Ramp' : 'Time Remap (Speed Ramp)', action: () => onTimeRamp(menu.clipId) },
    { icon: '✂️', label: 'Razor at Playhead', action: () => {
      const { currentTime, splitClip: split } = useVideoStore.getState()
      split(menu.clipId, currentTime)
    }},
    { icon: '📋', label: 'Duplicate Clip', action: () => {
      const { duplicateClip: dup } = useVideoStore.getState()
      dup(menu.clipId)
    }},
    { icon: '🎨', label: 'Add FX…', action: null },
    ...(isLinked ? [{ icon: '🔗', label: 'Unlink Audio/Video', action: () => unlinkClip(menu.clipId) }] : []),
    { icon: '🗑️', label: 'Delete Clip', action: () => {
      const { clips: currentClips } = useVideoStore.getState()
      for (const [trackId, trackClips] of Object.entries(currentClips)) {
        if ((trackClips ?? []).find(c => c.id === menu.clipId)) {
          deleteClip(trackId, menu.clipId)
          break
        }
      }
    }, danger: true },
  ]

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose} />
      <div style={{
        position: 'fixed', left: menu.x, top: menu.y, zIndex: 201,
        background: '#13131c', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 9, boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden', minWidth: 200,
      }}>
        <div style={{ padding: '6px 10px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 9, color: '#1e3a5f', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Clip Options
          </span>
        </div>

        {/* Keyframe interpolation submenu */}
        {hasKFs && (
          <div>
            <button onClick={() => setInterpOpen(o => !o)} style={{
              width: '100%', padding: '8px 12px', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 9,
              background: interpOpen ? 'rgba(129,140,248,0.08)' : 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#818cf8', fontFamily: 'inherit',
              borderBottom: '1px solid rgba(255,255,255,0.03)', justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 13 }}>💎</span>
                Keyframe Interpolation
              </span>
              <span style={{ fontSize: 10 }}>{interpOpen ? '▲' : '▼'}</span>
            </button>
            {interpOpen && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(129,140,248,0.04)' }}>
                <div style={{ padding: '4px 12px 2px', fontSize: 8.5, color: '#334155', fontWeight: 700 }}>
                  Apply to all {allKFs.length} keyframe{allKFs.length > 1 ? 's' : ''}:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, padding: '4px 10px 8px' }}>
                  {INTERP_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => {
                      allKFs.forEach(({ prop, idx }) => setKeyframeInterp(menu.clipId, prop, idx, opt.id))
                    }} style={{
                      padding: '5px 2px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                      background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
                      color: '#818cf8', fontSize: 9, fontWeight: 700,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <span style={{ fontSize: 11 }}>{opt.icon}</span>
                      <span style={{ fontSize: 7.5 }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {items.map((item, i) => (
          <button key={i} onClick={() => { item.action?.(); onClose() }} style={{
            width: '100%', padding: '8px 12px', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: item.danger ? '#f87171' : item.label.includes('Remove') ? '#fbbf24' : '#94a3b8',
            fontFamily: 'inherit',
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
            transition: 'background 0.1s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
            {item.label}
            {item.label.includes('Speed Ramp') && !hasRamp && (
              <span style={{ marginLeft: 'auto', fontSize: 8.5, color: '#fbbf24', fontWeight: 800, letterSpacing: '0.05em' }}>
                NEW
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

// ── Speed ramp curve renderer (SVG inside clip) ───────────────────────────────
function SpeedRampOverlay({ keyframes, width }) {
  if (!keyframes || keyframes.length < 2) return null

  const H = TRACK_H - 10  // clip height minus top/bottom padding

  const speedToY = (speed) => {
    if (speed <= 1) return H * 0.82 - (speed / 1) * (H * 0.82 - H * 0.5)
    return H * 0.5  - ((speed - 1) / 3) * (H * 0.5 - H * 0.12)
  }

  const pts = keyframes.map(kf => ({
    x: kf.t * width,
    y: speedToY(kf.speed),
  }))

  // Build smooth cubic bezier path
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cp1x = prev.x + (curr.x - prev.x) * 0.4
    const cp2x = curr.x - (curr.x - prev.x) * 0.4
    d += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`
  }

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      preserveAspectRatio="none"
    >
      {/* Baseline at 1x speed */}
      <line x1={0} y1={speedToY(1)} x2={width} y2={speedToY(1)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />

      {/* Filled area under the curve */}
      <path
        d={`${d} L ${pts[pts.length-1].x},${H} L ${pts[0].x},${H} Z`}
        fill="rgba(251,191,36,0.08)"
      />

      {/* Main speed curve */}
      <path d={d} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Keyframe dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#fbbf24" stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
      ))}

      {/* Speed labels on extremes */}
      {keyframes.map((kf, i) => {
        if (kf.speed === 1) return null
        const p = pts[i]
        const label = kf.speed < 1 ? `${Math.round(kf.speed*100)}%` : `${kf.speed}×`
        return (
          <text key={i} x={p.x + 4} y={p.y - 3} fill="#fbbf24" fontSize="7" fontWeight="700" fontFamily="monospace">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Single clip block ─────────────────────────────────────────────────────────
function ClipBlock({ clip, trackId, trackType, activeClipId, onSelect, onContextMenu, onDragStart, timeRamps, clipKeyframes, effectivePPS, moveClipInTime, trimClip, activeTool }) {
  const style  = TRACK_STYLE[trackId] ?? { clip: '#374151', accent: '#6b7280', text: '#e2e8f0' }
  const left   = clip.start * effectivePPS
  const width  = Math.max((clip.end - clip.start) * effectivePPS - 3, 4)
  const active = activeClipId === clip.id
  const seed   = clip.id.charCodeAt(clip.id.length - 1)
  const hasRamp = !!timeRamps[clip.id]

  // Gather keyframe times for this clip across all props
  const kfTimes = []
  const kfMap = clipKeyframes[clip.id] ?? {}
  Object.values(kfMap).forEach(kfs => {
    kfs.forEach(kf => {
      const relT = kf.t - clip.start
      if (relT >= 0 && relT <= clip.end - clip.start) {
        const x = (relT / (clip.end - clip.start)) * width
        if (!kfTimes.find(k => Math.abs(k.x - x) < 3)) kfTimes.push({ x, t: kf.t, interp: kf.interp })
      }
    })
  })

  // Cursor depends on tool and hover position
  const [hoverMode, setHoverMode] = useState('move')

  function getMode(xInClip) {
    if (activeTool === 'razor')  return 'razor'
    if (activeTool === 'ripple') return 'ripple'
    if (xInClip < EDGE_PX)             return 'trim-left'
    if (xInClip > width - EDGE_PX)     return 'trim-right'
    return 'move'
  }

  function handleBodyMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()

    const startX    = e.clientX
    const origStart = clip.start
    const origEnd   = clip.end

    const rect    = e.currentTarget.getBoundingClientRect()
    const xInClip = e.clientX - rect.left
    const mode    = getMode(xInClip)

    // Razor: split on click, no drag needed
    if (mode === 'razor') {
      const clickTime = origStart + xInClip / effectivePPS
      useVideoStore.getState().splitClip(clip.id, clickTime)
      return
    }
    // Ripple: delete on click
    if (mode === 'ripple') {
      useVideoStore.getState().deleteClip(trackId, clip.id)
      return
    }

    let moved = false

    // Snap: find nearest clip edge or marker within 8px
    function snap(timeVal) {
      const { snapEnabled: se, snapToClips: sc, snapToMarkers: sm, clips: allClips, sequenceMarkers: markers } = useVideoStore.getState()
      if (!se) return timeVal
      const SNAP_SEC = 8 / effectivePPS
      let best = timeVal, bestDist = SNAP_SEC
      if (sc) {
        for (const trackClips of Object.values(allClips)) {
          for (const c of (trackClips ?? [])) {
            if (c.id === clip.id) continue
            for (const t of [c.start, c.end]) {
              const d = Math.abs(timeVal - t)
              if (d < bestDist) { bestDist = d; best = t }
            }
          }
        }
      }
      if (sm) {
        for (const m of markers) {
          const d = Math.abs(timeVal - m.time)
          if (d < bestDist) { bestDist = d; best = m.time }
        }
      }
      return best
    }

    function onMove(me) {
      const dx = me.clientX - startX
      const dt = dx / effectivePPS
      moved = true
      if (mode === 'move') {
        moveClipInTime(trackId, clip.id, snap(origStart + dt))
      } else if (mode === 'trim-left') {
        trimClip(trackId, clip.id, 'left', snap(origStart + dt))
      } else if (mode === 'trim-right') {
        trimClip(trackId, clip.id, 'right', snap(origEnd + dt))
      }
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!moved) onSelect(clip.id)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const cursorMap = { 'trim-left': 'w-resize', 'trim-right': 'e-resize', 'move': 'grab', 'razor': 'crosshair', 'ripple': 'cell' }

  return (
    <div
      onMouseDown={handleBodyMouseDown}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setHoverMode(getMode(e.clientX - rect.left))
      }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(clip.id, clip, e.clientX, e.clientY) }}
      style={{
        position: 'absolute', left, top: 5, width, height: TRACK_H - 10,
        borderRadius: 7,
        background: `linear-gradient(135deg, ${style.clip}dd 0%, ${style.clip}88 100%)`,
        border: `1.5px solid ${active ? '#fbbf24' : hasRamp ? '#fbbf2466' : `${style.clip}66`}`,
        boxShadow: active
          ? '0 0 0 1.5px #fbbf24, 0 0 15px rgba(251,191,36,0.5), 0 4px 14px rgba(0,0,0,0.4)'
          : hasRamp
            ? '0 0 0 1px rgba(251,191,36,0.3)'
            : 'none',
        overflow: 'hidden', cursor: cursorMap[hoverMode] ?? 'grab',
        transition: 'box-shadow 0.18s, border-color 0.18s',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        userSelect: 'none',
      }}>

      {/* Trim handle indicators */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE_PX, zIndex: 4, background: 'rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: EDGE_PX, zIndex: 4, background: 'rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.12)' }} />

      {/* Track-drag handle (between tracks) */}
      <div
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, clip.id, trackId) }}
        style={{
          position: 'absolute', left: EDGE_PX, top: 0, bottom: 0, width: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'ns-resize', zIndex: 5, background: 'rgba(0,0,0,0.18)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
        title="Drag to move to another track">
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', lineHeight: 1, userSelect: 'none' }}>⠿</span>
      </div>

      {/* Linked-audio chain badge */}
      {clip.linkedGroupId && (
        <div style={{
          position: 'absolute', top: 3, left: 17,
          fontSize: 7.5, color: '#34d399', fontWeight: 800,
          background: 'rgba(6,95,70,0.55)', padding: '1px 4px', borderRadius: 3,
          border: '1px solid rgba(52,211,153,0.3)', zIndex: 2, letterSpacing: '0.03em',
        }}>
          🔗
        </div>
      )}

      {/* Speed ramp overlay */}
      {hasRamp && <SpeedRampOverlay keyframes={timeRamps[clip.id]} width={width} />}

      {/* Keyframe diamond markers */}
      {kfTimes.map((kf, ki) => (
        <div key={ki} style={{
          position: 'absolute', bottom: 3, left: kf.x - 5, zIndex: 3,
          width: 10, height: 10,
          transform: 'rotate(45deg)',
          background: kf.interp === 'hold' ? '#fbbf24' : '#a5b4fc',
          border: '1.5px solid rgba(0,0,0,0.4)',
          boxShadow: `0 0 5px ${kf.interp === 'hold' ? '#fbbf2488' : '#818cf888'}`,
          cursor: 'pointer',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Clip name */}
      <div style={{
        paddingLeft: 8, paddingRight: 4,
        fontSize: 10.5, fontWeight: 700, color: style.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        zIndex: 1, position: 'relative',
      }}>
        {clip.label}
      </div>

      {/* Speed ramp badge */}
      {hasRamp && (
        <div style={{
          position: 'absolute', top: 3, right: 4,
          fontSize: 8, fontWeight: 800, color: '#fbbf24',
          background: 'rgba(251,191,36,0.15)', padding: '1px 4px', borderRadius: 3,
          border: '1px solid rgba(251,191,36,0.25)', zIndex: 2,
        }}>
          ⏱ RAMP
        </div>
      )}

      {/* Audio waveform */}
      {trackType === 'audio' && (
        <div style={{
          position: 'absolute', bottom: 3, left: 6, right: 6,
          height: 14, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden',
        }}>
          {Array.from({ length: Math.min(Math.floor(width / 3), 300) }, (_, i) => (
            <div key={i} style={{
              width: 1.5, borderRadius: 1,
              background: style.accent, opacity: 0.6,
              height: `${waveH(seed, i) * 13}px`, flexShrink: 0,
            }} />
          ))}
        </div>
      )}

      {/* Texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)',
      }} />
    </div>
  )
}

// ── Main VideoTimeline ────────────────────────────────────────────────────────
export default function VideoTimeline() {
  const {
    clips, currentTime, duration, isPlaying,
    play, pause,
    beatMarkers, beatSyncOn,
    activeTool, setActiveTool,
    activeClipId, setActiveClipId,
    seek, stepFrame,
    contextMenu, setContextMenu,
    toggleTimeRamp, timeRamps,
    multiCamMode, setMultiCamMode,
    camSyncState, syncCamAudio,
    activeCamAngle,
    clipKeyframes, setKeyframeInterp,
    velocityGraphOpen, setVelocityGraphOpen,
    adjustmentLayers, removeAdjustmentLayer,
    transcriptOpen, setTranscriptOpen,
    viralSlicerOpen, setViralSlicerOpen,
    clearClips, deleteClip, moveClipToTrack, unlinkClip,
    splitClip, duplicateClip, moveClipInTime, trimClip,
    mutedTracks, soledTracks, toggleMuteTrack, toggleSoloTrack,
    zoomLevel, setZoomLevel,
    inPoint, outPoint, setInPoint, setOutPoint, clearInOut,
    hiddenTracks, lockedTracks, trackHeights, toggleHideTrack, toggleLockTrack, setTrackHeight,
    sequenceMarkers, addSequenceMarker, removeSequenceMarker,
    snapEnabled, snapToClips, setSnapEnabled,
    sceneEdits, sceneEditDetecting, detectSceneEdits,
    undo, redo,
    showAudioMixer, setShowAudioMixer,
    showExportPanel, setShowExportPanel,
  } = useVideoStore()

  const effectivePPS = PPS * zoomLevel

  const scrollRef  = useRef(null)
  const totalWidth = duration * effectivePPS
  const dragRef    = useRef(null)
  const [dragHoverTrack, setDragHoverTrack] = useState(null)

  function startClipDrag(e, clipId, fromTrackId) {
    e.stopPropagation()
    dragRef.current = { clipId, fromTrackId, toTrackId: fromTrackId }
    setDragHoverTrack(fromTrackId)
    function onUp() {
      if (dragRef.current) {
        const { clipId: dId, fromTrackId: from, toTrackId: to } = dragRef.current
        if (to && to !== from) moveClipToTrack(dId, from, to)
        dragRef.current = null
      }
      setDragHoverTrack(null)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mouseup', onUp)
  }

  function handleTrackEnter(trackId) {
    if (!dragRef.current) return
    dragRef.current.toTrackId = trackId
    setDragHoverTrack(trackId)
  }

  // Global Backspace / Delete handler — removes the active clip with ripple
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      const { activeClipId: clipId, clips: currentClips } = useVideoStore.getState()
      if (!clipId) return
      e.preventDefault()
      for (const [trackId, trackClips] of Object.entries(currentClips)) {
        if ((trackClips ?? []).find(c => c.id === clipId)) {
          deleteClip(trackId, clipId)
          break
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteClip])

  // Keep playhead in view while playing
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return
    const x = currentTime * effectivePPS
    const { scrollLeft, clientWidth } = scrollRef.current
    if (x > scrollLeft + clientWidth - 80) {
      scrollRef.current.scrollLeft = x - clientWidth * 0.3
    }
  }, [isPlaying, currentTime, effectivePPS])

  // Keyboard shortcuts — Premiere Pro standard
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return

      const st = useVideoStore.getState()
      switch (e.key) {
        case ' ':
          e.preventDefault()
          st.isPlaying ? st.pause() : st.play()
          break
        case 'j': case 'J':
          e.preventDefault()
          st.pause(); st.stepFrame(-10)
          break
        case 'k': case 'K':
          e.preventDefault()
          st.pause()
          break
        case 'l': case 'L':
          e.preventDefault()
          st.pause(); st.stepFrame(10)
          break
        case 'ArrowLeft':
          e.preventDefault()
          st.stepFrame(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          st.stepFrame(1)
          break
        case 'i': case 'I':
          st.setInPoint()
          break
        case 'o': case 'O':
          st.setOutPoint()
          break
        case 'v': case 'V':
          st.setActiveTool('select')
          break
        case 'c': case 'C':
          st.setActiveTool('razor')
          break
        case 'q': case 'Q':
          st.setZoomLevel(st.zoomLevel * 1.4)
          break
        case 'a': case 'A':
          st.setZoomLevel(st.zoomLevel * 0.7)
          break
        case 'm': case 'M':
          st.addSequenceMarker()
          break
        case 's': case 'S':
          st.setSnapEnabled(!st.snapEnabled)
          break
        case 'z': case 'Z':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.shiftKey ? st.redo() : st.undo() }
          break
        case 'y': case 'Y':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); st.redo() }
          break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleContentClick = useCallback((e) => {
    if (!scrollRef.current) return
    const rect     = scrollRef.current.getBoundingClientRect()
    const x        = e.clientX - rect.left + scrollRef.current.scrollLeft
    const clickTime = x / effectivePPS

    setContextMenu(null)

    if (activeTool === 'razor') {
      // Split whichever clip is under the click
      for (const [, trackClips] of Object.entries(clips)) {
        const clip = (trackClips ?? []).find(c => c.start < clickTime && c.end > clickTime)
        if (clip) { splitClip(clip.id, clickTime); return }
      }
      return
    }

    if (activeTool === 'ripple') {
      for (const [trackId, trackClips] of Object.entries(clips)) {
        const clip = (trackClips ?? []).find(c => c.start <= clickTime && c.end > clickTime)
        if (clip) { deleteClip(trackId, clip.id); return }
      }
      return
    }

    seek(clickTime)
  }, [seek, setContextMenu, activeTool, clips, effectivePPS, splitClip, deleteClip])

  const handleContextMenu = useCallback((clipId, clip, x, y) => {
    setContextMenu({ clipId, clip, x, y })
  }, [setContextMenu])

  const playheadX = currentTime * effectivePPS

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#08080d', borderTop: '1px solid #111118',
      minHeight: 0, position: 'relative',
    }}>
      <TimelineToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        currentTime={currentTime}
        camSyncState={camSyncState}
        syncCamAudio={syncCamAudio}
        multiCamMode={multiCamMode}
        setMultiCamMode={setMultiCamMode}
        velocityGraphOpen={velocityGraphOpen}
        setVelocityGraphOpen={setVelocityGraphOpen}
        transcriptOpen={transcriptOpen}
        setTranscriptOpen={setTranscriptOpen}
        viralSlicerOpen={viralSlicerOpen}
        setViralSlicerOpen={setViralSlicerOpen}
        clearClips={clearClips}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        inPoint={inPoint}
        outPoint={outPoint}
        setInPoint={setInPoint}
        setOutPoint={setOutPoint}
        clearInOut={clearInOut}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        addSequenceMarker={addSequenceMarker}
        detectSceneEdits={detectSceneEdits}
        sceneEditDetecting={sceneEditDetecting}
        undo={undo}
        redo={redo}
        setShowAudioMixer={setShowAudioMixer}
        setShowExportPanel={setShowExportPanel}
      />

      {/* Multi-cam sync info bar */}
      {multiCamMode && (
        <div style={{
          height: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', flexShrink: 0,
          background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(251,191,36,0.12)',
        }}>
          <span style={{ fontSize: 9.5, color: '#fbbf24', fontWeight: 800, letterSpacing: '0.06em' }}>
            ⬡ MULTI-CAM SEQUENCE — ACTIVE
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            {[1, 2, 3].map(n => {
              const labels = { 1: 'CAM A', 2: 'CAM B', 3: 'CAM C' }
              const active = activeCamAngle === n
              return (
                <div key={n} style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                  background: active ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#fbbf24' : '#334155',
                }}>
                  {labels[n]}{active && ' ●'}
                </div>
              )
            })}
          </div>
          {camSyncState === 'synced' && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: '#34d399', fontWeight: 700 }}>
              ✓ Audio waveforms aligned
            </span>
          )}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── Track label column ── */}
        <div style={{
          width: LABEL_W, flexShrink: 0,
          background: 'rgba(6,6,18,0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ height: RULER_H, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }} />

          {adjustmentLayers.map(adj => (
            <div key={adj.id} style={{
              height: TRACK_H, flexShrink: 0,
              display: 'flex', alignItems: 'center',
              padding: '0 8px', gap: 7,
              borderBottom: '1px solid rgba(251,191,36,0.1)',
              background: 'rgba(251,191,36,0.02)',
              borderLeft: '3px solid rgba(251,191,36,0.35)',
            }}>
              <div style={{ width: 3, height: 28, borderRadius: 99, flexShrink: 0, background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.5)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ⬡ {adj.label}
              </span>
              <button onClick={() => removeAdjustmentLayer(adj.id)} style={{
                width: 16, height: 16, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 10, fontFamily: 'inherit',
              }}>✕</button>
            </div>
          ))}

          {TRACKS.map((track, ti) => {
            const style   = TRACK_STYLE[track.id]
            const isCam   = track.type === 'video'
            const camN    = track.id === 'cam1' ? 1 : track.id === 'cam2' ? 2 : track.id === 'cam3' ? 3 : 0
            const isActive  = isCam && multiCamMode && activeCamAngle === camN
            const isHidden  = !!hiddenTracks[track.id]
            const isLocked  = !!lockedTracks[track.id]
            const trackH    = trackHeights[track.id] ?? TRACK_H
            return (
              <div key={track.id} style={{
                height: trackH, flexShrink: 0,
                display: 'flex', alignItems: 'center',
                padding: '0 6px', gap: 4,
                borderBottom: '1px solid #111118',
                opacity: isHidden ? 0.38 : 1,
                background: isActive
                  ? 'rgba(251,191,36,0.05)'
                  : ti % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                transition: 'background 0.2s, opacity 0.2s',
              }}>
                <div style={{
                  width: 3, height: 28, borderRadius: 99, flexShrink: 0,
                  background: isActive ? '#fbbf24' : (style?.accent ?? '#4b5563'),
                  boxShadow: isActive ? '0 0 6px rgba(251,191,36,0.5)' : 'none',
                  transition: 'all 0.2s',
                }} />
                {/* Eye — toggle visibility */}
                <button onClick={e => { e.stopPropagation(); toggleHideTrack(track.id) }} title={isHidden ? 'Show track' : 'Hide track'} style={{
                  width: 14, height: 14, borderRadius: 3, border: 'none', cursor: 'pointer',
                  background: 'none', color: isHidden ? '#334155' : style?.accent ?? '#4b5563',
                  fontSize: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{isHidden ? '🙈' : '👁'}</button>
                {/* Lock */}
                <button onClick={e => { e.stopPropagation(); toggleLockTrack(track.id) }} title={isLocked ? 'Unlock track' : 'Lock track'} style={{
                  width: 14, height: 14, borderRadius: 3, border: 'none', cursor: 'pointer',
                  background: 'none', color: isLocked ? '#fbbf24' : '#1e3a5f',
                  fontSize: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{isLocked ? '🔒' : '🔓'}</button>
                <span style={{
                  fontSize: 9, fontWeight: 700, lineHeight: 1.3,
                  color: isActive ? '#fbbf24' : (style?.accent ?? '#4b5563'),
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'color 0.2s',
                }}>
                  {track.label}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={e => { e.stopPropagation(); toggleMuteTrack(track.id) }} title={mutedTracks[track.id] ? 'Unmute' : 'Mute'}
                    style={{ width: 15, height: 15, borderRadius: 3, border: 'none', fontSize: 7, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                      background: mutedTracks[track.id] ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.05)',
                      color: mutedTracks[track.id] ? '#f87171' : '#334155', transition: 'all 0.15s',
                    }}>M</button>
                  <button onClick={e => { e.stopPropagation(); toggleSoloTrack(track.id) }} title={soledTracks[track.id] ? 'Unsolo' : 'Solo'}
                    style={{ width: 15, height: 15, borderRadius: 3, border: 'none', fontSize: 7, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                      background: soledTracks[track.id] ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.05)',
                      color: soledTracks[track.id] ? '#fbbf24' : '#334155', transition: 'all 0.15s',
                    }}>S</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Scrollable content area ── */}
        <div
          ref={scrollRef}
          onClick={handleContentClick}
          style={{
            flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative',
            cursor: activeTool === 'razor'      ? 'crosshair'
              :     activeTool === 'ripple'     ? 'cell'
              :     activeTool === 'tracker'    ? 'crosshair'
              :     activeTool === 'transition' ? 'copy'
              :     'default',
          }}>
          <div style={{ width: totalWidth, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

            {/* ── Time ruler ── */}
            <div style={{
              height: RULER_H, position: 'relative', flexShrink: 0,
              background: 'rgba(6,6,18,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {/* In / Out point shading */}
              {inPoint != null && outPoint != null && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, zIndex: 1, pointerEvents: 'none',
                  left: inPoint * effectivePPS, width: (outPoint - inPoint) * effectivePPS,
                  background: 'rgba(251,191,36,0.12)',
                  borderLeft: '1.5px solid rgba(251,191,36,0.6)',
                  borderRight: '1.5px solid rgba(251,191,36,0.6)',
                }} />
              )}
              {inPoint != null && (
                <div style={{ position: 'absolute', top: 0, left: inPoint * effectivePPS, zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ width: 1.5, height: RULER_H, background: '#fbbf24' }} />
                  <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 8, fontWeight: 800, color: '#fbbf24', background: 'rgba(0,0,0,0.6)', padding: '1px 3px', borderRadius: 2 }}>IN</div>
                </div>
              )}
              {outPoint != null && (
                <div style={{ position: 'absolute', top: 0, left: outPoint * effectivePPS, zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ width: 1.5, height: RULER_H, background: '#fbbf24' }} />
                  <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 8, fontWeight: 800, color: '#fbbf24', background: 'rgba(0,0,0,0.6)', padding: '1px 3px', borderRadius: 2 }}>OUT</div>
                </div>
              )}
              {/* ── Sequence markers ── */}
              {sequenceMarkers.map(m => (
                <div key={m.id} style={{ position: 'absolute', top: 0, left: m.time * effectivePPS, zIndex: 3, cursor: 'pointer' }}
                  onContextMenu={e => { e.preventDefault(); removeSequenceMarker(m.id) }}
                  title={`${m.label} — right-click to delete`}>
                  <div style={{ width: 1.5, height: RULER_H, background: m.color }} />
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                    borderTop: `8px solid ${m.color}`,
                    transform: 'translateX(-2px)',
                  }} />
                  <div style={{
                    position: 'absolute', top: 8, left: 4, fontSize: 7.5, fontWeight: 800, color: m.color,
                    background: 'rgba(0,0,0,0.7)', padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap',
                  }}>{m.label}</div>
                </div>
              ))}
              {Array.from({ length: Math.min(Math.ceil(duration) + 1, 3601) }, (_, i) => {
                const x     = i * effectivePPS
                const major = i % Math.max(1, Math.round(5 / zoomLevel)) === 0
                return (
                  <div key={i} style={{ position: 'absolute', left: x, top: 0, height: '100%' }}>
                    <div style={{ width: 1, height: major ? 16 : 8, background: major ? '#2d2d4a' : '#1a1a2e', position: 'absolute', bottom: 0 }} />
                    {major && (
                      <span style={{ position: 'absolute', left: 4, top: 5, fontSize: 9, color: '#3d3d5c', fontFamily: 'monospace', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        {fmtRuler(i)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Track rows ── */}
            {TRACKS.map((track, ti) => {
              const isCam    = track.type === 'video'
              const camN     = track.id === 'cam1' ? 1 : track.id === 'cam2' ? 2 : track.id === 'cam3' ? 3 : 0
              const isActive = isCam && multiCamMode && activeCamAngle === camN
              const isHidden = !!hiddenTracks[track.id]
              const isLocked = !!lockedTracks[track.id]
              const trackH   = trackHeights[track.id] ?? TRACK_H
              return (
                <div key={track.id}
                  onMouseEnter={() => handleTrackEnter(track.id)}
                  style={{
                  height: trackH, flexShrink: 0, position: 'relative',
                  opacity: isHidden ? 0.25 : 1,
                  pointerEvents: isLocked ? 'none' : 'auto',
                  background: dragHoverTrack === track.id && dragRef.current && dragRef.current.fromTrackId !== track.id
                    ? 'rgba(99,102,241,0.12)'
                    : isActive
                      ? 'rgba(251,191,36,0.03)'
                      : ti % 2 === 0 ? '#09090e' : '#0b0b12',
                  borderBottom: '1px solid #111118',
                  borderLeft: dragHoverTrack === track.id && dragRef.current && dragRef.current.fromTrackId !== track.id
                    ? '2px solid rgba(99,102,241,0.7)'
                    : isActive ? '2px solid rgba(251,191,36,0.4)' : '2px solid transparent',
                  transition: 'background 0.12s, border-color 0.12s',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.02)' }} />

                  {(clips[track.id] ?? []).length === 0 ? (
                    <div style={{
                      position: 'absolute', left: 8, right: 8, top: 8, bottom: 8,
                      border: '1.5px dashed rgba(255,255,255,0.09)',
                      borderRadius: 8, display: 'flex', alignItems: 'center',
                      paddingLeft: 14, pointerEvents: 'none',
                    }}>
                      <span style={{ fontSize: 9.5, color: '#1e3a5f', fontStyle: 'italic', letterSpacing: '0.01em' }}>
                        Timeline empty — click ➕ on an asset or drop it here
                      </span>
                    </div>
                  ) : (clips[track.id] ?? []).map(clip => (
                    <ClipBlock
                      key={clip.id}
                      clip={clip}
                      trackId={track.id}
                      trackType={track.type}
                      activeClipId={activeClipId}
                      onSelect={setActiveClipId}
                      onContextMenu={handleContextMenu}
                      onDragStart={startClipDrag}
                      timeRamps={timeRamps}
                      clipKeyframes={clipKeyframes}
                      effectivePPS={effectivePPS}
                      moveClipInTime={moveClipInTime}
                      trimClip={trimClip}
                      activeTool={activeTool}
                    />
                  ))}
                </div>
              )
            })}

            {/* ── Adjustment Layer track rows ── */}
            {adjustmentLayers.map((adj, ai) => (
              <div key={adj.id} style={{
                height: TRACK_H, flexShrink: 0, position: 'relative',
                background: 'rgba(251,191,36,0.02)',
                borderBottom: '1px solid rgba(251,191,36,0.1)',
                borderLeft: '2px solid rgba(251,191,36,0.3)',
              }}>
                <div style={{
                  position: 'absolute',
                  left: adj.start * effectivePPS, top: 5,
                  width: Math.max((adj.end - adj.start) * effectivePPS - 3, 4), height: TRACK_H - 10,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,191,36,0.08))',
                  border: '1px dashed rgba(251,191,36,0.4)',
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    ⬡ {adj.label}
                  </span>
                </div>
              </div>
            ))}

            {/* ── Beat markers ── */}
            {beatMarkers.map((t, mi) => (
              <div key={mi} style={{
                position: 'absolute', left: t * effectivePPS, top: RULER_H, bottom: 0,
                width: 1.5, background: 'rgba(0,229,255,0.35)',
                pointerEvents: 'none', zIndex: 3,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#00e5ff', transform: 'translate(-3px, -2px)',
                  boxShadow: '0 0 6px rgba(0,229,255,0.8)',
                }} />
              </div>
            ))}

            {/* ── Scene edit detection markers ── */}
            {sceneEdits.map((t, i) => (
              <div key={i} style={{
                position: 'absolute', left: t * effectivePPS, top: RULER_H, bottom: 0,
                width: 1.5, background: 'rgba(52,211,153,0.5)',
                pointerEvents: 'none', zIndex: 3,
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 1, transform: 'translateX(-50%)',
                  fontSize: 7.5, fontWeight: 800, color: '#34d399',
                  background: 'rgba(6,95,70,0.7)', padding: '1px 3px', borderRadius: 2,
                  whiteSpace: 'nowrap', letterSpacing: '0.04em',
                }}>✂ SCENE</div>
              </div>
            ))}

            {/* ── Cam cut markers ── */}
            {useVideoStore.getState().camCutMarkers.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', left: m.time * effectivePPS, top: RULER_H, bottom: 0,
                width: 2, background: 'rgba(251,191,36,0.6)',
                pointerEvents: 'none', zIndex: 4,
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 1, transform: 'translateX(-50%)',
                  fontSize: 8, fontWeight: 800, color: '#fbbf24',
                  background: 'rgba(251,191,36,0.15)', padding: '1px 4px', borderRadius: 3,
                  whiteSpace: 'nowrap',
                }}>
                  ✂ CAM {m.camAngle === 1 ? 'A' : m.camAngle === 2 ? 'B' : 'C'}
                </div>
              </div>
            ))}

            {/* ── Playhead ── */}
            <div
              onMouseDown={e => {
                e.stopPropagation()
                const onMove = mv => {
                  if (!scrollRef.current) return
                  const rect = scrollRef.current.getBoundingClientRect()
                  seek((mv.clientX - rect.left + scrollRef.current.scrollLeft) / effectivePPS)
                }
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove)
                  window.removeEventListener('mouseup', onUp)
                }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
              style={{
                position: 'absolute', left: playheadX, top: 0, bottom: 0,
                width: 2, background: '#ff3b3b', zIndex: 10,
                cursor: 'ew-resize', boxShadow: '0 0 10px rgba(255,59,59,0.65)',
                pointerEvents: 'all',
              }}>
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                borderTop: '10px solid #ff3b3b',
                filter: 'drop-shadow(0 0 4px rgba(255,59,59,0.9))',
              }} />
            </div>

          </div>
        </div>

        {/* ── AI Transcript panel ── */}
        {transcriptOpen && <VideoTranscriptPanel />}

      </div>

      {/* ── Viral Clip Slicer modal ── */}
      {viralSlicerOpen && <ViralClipSlicer />}

      {/* ── Velocity Graph View ── */}
      {velocityGraphOpen && (
        <div style={{ flexShrink: 0, height: 72, borderTop: '1px solid rgba(129,140,248,0.2)', background: '#07070c', padding: '6px 8px', position: 'relative' }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
            Velocity Graph — Keyframe Speed Curves
          </div>
          <div style={{ height: 42, position: 'relative', background: 'rgba(129,140,248,0.03)', borderRadius: 4, border: '1px solid rgba(129,140,248,0.1)', overflow: 'hidden' }}>
            {/* Baseline */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(129,140,248,0.15)' }} />
            {Object.entries(clipKeyframes).map(([clipId, propMap]) =>
              Object.entries(propMap).map(([prop, kfs]) => {
                if (kfs.length < 2) return null
                return kfs.map((kf, ki) => {
                  if (ki === 0) return null
                  const prev = kfs[ki - 1]
                  const x1 = (prev.t / duration) * 100
                  const x2 = (kf.t / duration) * 100
                  return (
                    <div key={`${clipId}-${prop}-${ki}`} style={{
                      position: 'absolute',
                      left: `${x1}%`, width: `${x2 - x1}%`, top: '20%', height: '60%',
                      background: 'rgba(129,140,248,0.25)',
                      borderLeft: '1.5px solid #818cf8',
                      borderRight: '1.5px solid #818cf8',
                    }} />
                  )
                })
              })
            )}
            {Object.keys(clipKeyframes).length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#334155' }}>
                Add keyframes via Transform panel to see velocity curves
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
            {INTERP_OPTIONS.map(opt => (
              <div key={opt.id} style={{ fontSize: 8, color: '#334155', display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>{opt.icon}</span><span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clip context menu ── */}
      <ClipContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onTimeRamp={toggleTimeRamp}
        timeRamps={timeRamps}
        clipKeyframes={clipKeyframes}
        setKeyframeInterp={setKeyframeInterp}
        deleteClip={deleteClip}
        unlinkClip={unlinkClip}
      />

      <style>{`
        .tl-label { display: inline; }
        @media(max-width:1200px){ .tl-label { display: none; } }
        @keyframes tlSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        [data-trim-left]:hover { cursor: w-resize !important; }
        [data-trim-right]:hover { cursor: e-resize !important; }
      `}</style>

      {/* Keyboard shortcut hint bar */}
      <div style={{ height: 18, display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px', background: '#07070c', borderTop: '1px solid #0e0e18', flexShrink: 0, overflowX: 'auto' }}>
        {[
          ['Space', 'Play/Pause'],
          ['J/K/L', 'Rev/Stop/Fwd'],
          ['I/O', 'In/Out'],
          ['V', 'Select'],
          ['C', 'Razor'],
          ['Q/A', 'Zoom'],
          ['Del', 'Delete'],
          ['M', 'Marker'],
          ['S', 'Snap'],
          ['Ctrl+Z', 'Undo'],
          ['Ctrl+Y', 'Redo'],
        ].map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <kbd style={{ fontSize: 7.5, fontFamily: 'monospace', fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 3, padding: '1px 4px' }}>{key}</kbd>
            <span style={{ fontSize: 7.5, color: '#1e3a5f' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
