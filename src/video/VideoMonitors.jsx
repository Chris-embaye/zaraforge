import { useRef, useState, useCallback, useEffect } from 'react'
import { useVideoStore } from '../store/videoStore'
import VideoScopes from './VideoScopes'

function fmt(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(Math.floor(s % 60)).padStart(2, '0')
  const ff = String(Math.floor((s % 1) * 30)).padStart(2, '0')
  return `${mm}:${ss}:${ff}`
}

// ── Resolve which user clip (if any) is active at a given time on a track ─────
function activeUserClip(clips, trackId, currentTime) {
  const track = clips[trackId] ?? []
  const userClips = track.filter(c => c.isUser && c.url)
  if (!userClips.length) return null
  // Exact match first
  const exact = userClips.find(c => c.start <= currentTime && c.end > currentTime)
  if (exact) return exact
  // Fallback: return whichever user clip is closest to currentTime
  // (handles clips with wrong stored duration)
  return userClips.reduce((best, c) => {
    const d = Math.min(Math.abs(c.start - currentTime), Math.abs(c.end - currentTime))
    const bd = best
      ? Math.min(Math.abs(best.start - currentTime), Math.abs(best.end - currentTime))
      : Infinity
    return d < bd ? c : best
  }, null)
}

// ── Real video element synced to timeline ─────────────────────────────────────
function ProgramVideoPlayer({ clips, currentTime, isPlaying, activeCamAngle }) {
  const videoRef  = useRef(null)
  const loadedRef = useRef(false)
  const [videoError, setVideoError] = useState(null)

  const trackId = activeCamAngle === 1 ? 'cam1' : activeCamAngle === 2 ? 'cam2' : 'cam3'
  const clip    = activeUserClip(clips, trackId, currentTime)
  const hasVid  = !!clip
  const url     = clip?.url ?? null
  const offset  = hasVid ? Math.max(0, currentTime - (clip.start ?? 0)) : 0

  // ── Load when URL changes ─────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    loadedRef.current = false
    setVideoError(null)

    if (!vid || !url) {
      if (vid) { vid.pause(); vid.removeAttribute('src') }
      return
    }

    vid.pause()
    vid.src = url
    vid.load()

    const onMeta = () => {
      loadedRef.current = true
      const t = Math.max(0, currentTime - (clip?.start ?? 0))
      if (isFinite(t)) vid.currentTime = t
    }
    const onErr = () => {
      const code = vid.error?.code
      setVideoError(code === 4 ? 'Unsupported codec (try H.264 MP4)' : `Video error (code ${code})`)
    }

    vid.addEventListener('loadedmetadata', onMeta, { once: true })
    vid.addEventListener('error',           onErr,  { once: true })
    return () => {
      vid.removeEventListener('loadedmetadata', onMeta)
      vid.removeEventListener('error',           onErr)
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scrub while paused ───────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !hasVid || !url || isPlaying || !loadedRef.current) return
    if (Math.abs(vid.currentTime - offset) > 0.15) vid.currentTime = offset
  }, [offset, hasVid, url, isPlaying])

  // ── Play / pause sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (isPlaying && hasVid && url) {
      const doPlay = () => {
        if (Math.abs(vid.currentTime - offset) > 0.3) vid.currentTime = offset
        vid.play().catch(() => {})
      }
      if (vid.readyState >= 2) doPlay()
      else vid.addEventListener('canplay', doPlay, { once: true })
    } else {
      vid.pause()
    }
  }, [isPlaying, hasVid, url]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'contain', zIndex: 2,
          display: hasVid && !videoError ? 'block' : 'none',
        }}
      />
      {videoError && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(0,0,0,0.7)',
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171' }}>{videoError}</span>
          <span style={{ fontSize: 10, color: '#64748b', textAlign: 'center', padding: '0 20px' }}>
            Convert your video to H.264 MP4 using HandBrake (free) and re-import.
          </span>
        </div>
      )}
    </>
  )
}

// ── Hidden audio player synced to timeline ────────────────────────────────────
function HiddenAudioPlayer({ clips, currentTime, isPlaying }) {
  const audioRef   = useRef(null)
  const lastUrlRef = useRef(null)

  const clip   = activeUserClip(clips, 'audio', currentTime)
  const hasAud = !!clip

  useEffect(() => {
    const aud = audioRef.current
    if (!aud) return
    const newUrl = clip?.url ?? ''
    if (newUrl !== lastUrlRef.current) {
      aud.src          = newUrl
      lastUrlRef.current = newUrl
    }
  }, [clip?.url])

  useEffect(() => {
    const aud = audioRef.current
    if (!aud || !hasAud) return
    if (isPlaying) {
      const target = Math.max(0, currentTime - (clip?.start ?? 0))
      if (Math.abs(aud.currentTime - target) > 0.25) aud.currentTime = target
      aud.play().catch(() => {})
    } else {
      aud.pause()
    }
  }, [isPlaying, hasAud]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const aud = audioRef.current
    if (!aud || !hasAud || isPlaying) return
    const target = Math.max(0, currentTime - (clip?.start ?? 0))
    if (Math.abs(aud.currentTime - target) > 0.2) aud.currentTime = target
  }, [currentTime, hasAud, isPlaying, clip?.start])

  return <audio ref={audioRef} style={{ display: 'none' }} />
}

// ── Playback control bar ──────────────────────────────────────────────────────
function ControlBar({ isPlaying, currentTime, duration, onPlay, onPause, onStepFrame, onSeek }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      <CtrlBtn title="Frame Back" onClick={() => onStepFrame(-1)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
      </CtrlBtn>
      <button onClick={isPlaying ? onPause : onPlay} title={isPlaying ? 'Pause' : 'Play'} style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: isPlaying ? 'rgba(239,68,68,0.18)' : 'rgba(0,229,255,0.14)',
        color: isPlaying ? '#f87171' : '#00e5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s', flexShrink: 0,
        boxShadow: isPlaying ? '0 0 14px rgba(239,68,68,0.25)' : '0 0 14px rgba(0,229,255,0.2)',
      }}>
        {isPlaying
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        }
      </button>
      <CtrlBtn title="Frame Forward" onClick={() => onStepFrame(1)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </CtrlBtn>
      <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#00e5ff', letterSpacing: '0.06em', marginLeft: 4 }}>
        {fmt(currentTime)}
      </span>
      <div style={{ flex: 1, position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', cursor: 'pointer', marginLeft: 4 }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          onSeek(((e.clientX - rect.left) / rect.width) * duration)
        }}>
        <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#00e5ff)', width: `${(currentTime / duration) * 100}%`, transition: 'width 0.1s linear' }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', marginLeft: 4 }}>
        {fmt(duration)}
      </span>
      <CtrlBtn title="Fullscreen">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </CtrlBtn>
    </div>
  )
}

function CtrlBtn({ children, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
      background: 'rgba(255,255,255,0.05)', color: '#64748b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', flexShrink: 0,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b' }}>
      {children}
    </button>
  )
}

// ── Motion-tracking bounding box overlay ──────────────────────────────────────
function MotionTrackerOverlay({ motionTracker, activeTool, onDrawBbox }) {
  const divRef   = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [draft,   setDraft]   = useState(null)

  const handleMouseDown = useCallback((e) => {
    if (activeTool !== 'tracker' || motionTracker.active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setDrawing(true)
    setDraft({ x, y, w: 0, h: 0, ox: x, oy: y })
  }, [activeTool, motionTracker.active])

  const handleMouseMove = useCallback((e) => {
    if (!drawing || !draft) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top)  / rect.height) * 100
    setDraft(d => ({ ...d, x: Math.min(cx, d.ox), y: Math.min(cy, d.oy), w: Math.abs(cx - d.ox), h: Math.abs(cy - d.oy) }))
  }, [drawing, draft])

  const handleMouseUp = useCallback(() => {
    if (!drawing || !draft) return
    if (draft.w > 3 && draft.h > 3) onDrawBbox(draft)
    setDrawing(false); setDraft(null)
  }, [drawing, draft, onDrawBbox])

  const { active, bbox, bindEffect } = motionTracker
  const bboxColor = { blur: '#60a5fa', glow: '#a78bfa', text: '#fbbf24' }[bindEffect] ?? '#00e5ff'

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ position: 'absolute', inset: 0, zIndex: 5 }}
    >
      {drawing && draft && draft.w > 2 && (
        <div style={{
          position: 'absolute', left: `${draft.x}%`, top: `${draft.y}%`,
          width: `${draft.w}%`, height: `${draft.h}%`,
          border: '1.5px dashed rgba(0,229,255,0.7)',
          background: 'rgba(0,229,255,0.06)', pointerEvents: 'none',
        }} />
      )}
      {active && (
        <div style={{
          position: 'absolute', left: `${bbox.x}%`, top: `${bbox.y}%`,
          width: `${bbox.w}%`, height: `${bbox.h}%`,
          border: `1.5px solid ${bboxColor}`,
          boxShadow: `0 0 10px ${bboxColor}44, inset 0 0 10px ${bboxColor}11`,
          borderRadius: 2, animation: 'trackerPulse 2s ease-in-out infinite', pointerEvents: 'none',
        }}>
          {[
            { top: -1, left: -1, borderTop: `2px solid ${bboxColor}`, borderLeft: `2px solid ${bboxColor}` },
            { top: -1, right: -1, borderTop: `2px solid ${bboxColor}`, borderRight: `2px solid ${bboxColor}` },
            { bottom: -1, left: -1, borderBottom: `2px solid ${bboxColor}`, borderLeft: `2px solid ${bboxColor}` },
            { bottom: -1, right: -1, borderBottom: `2px solid ${bboxColor}`, borderRight: `2px solid ${bboxColor}` },
          ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...s }} />)}
          <div style={{
            position: 'absolute', top: -22, left: 0, fontSize: 9, fontWeight: 800,
            color: bboxColor, whiteSpace: 'nowrap',
            background: `${bboxColor}18`, padding: '2px 7px', borderRadius: 4,
            border: `1px solid ${bboxColor}33`,
          }}>
            🎯 Subject #1{bindEffect ? ` — ${bindEffect.toUpperCase()} BOUND` : ''}
          </div>
          {bindEffect === 'blur' && <div style={{ position: 'absolute', inset: 4, background: 'rgba(96,165,250,0.18)', backdropFilter: 'blur(3px)', borderRadius: 2 }} />}
          {bindEffect === 'glow' && <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 20px ${bboxColor}55, 0 0 20px ${bboxColor}33`, borderRadius: 2 }} />}
          <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, borderRadius: '50%', background: bboxColor, animation: 'trackerDot 1s ease-in-out infinite', boxShadow: `0 0 6px ${bboxColor}` }} />
        </div>
      )}
      {activeTool === 'tracker' && !active && !motionTracker.tracking && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9.5, fontWeight: 700, color: '#00e5ff',
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
          padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          Click & drag to draw tracking bounding box
        </div>
      )}
    </div>
  )
}

// ── Multi-cam mini feed ───────────────────────────────────────────────────────
const CAM_CONFIGS = [
  { n: 1, label: 'CAM A', sub: 'Close Up — Master', bg: (t) => `linear-gradient(${150+t*4}deg,#0a0018 0%,#1a0028 40%,#000a14 100%)`, accent: '#a78bfa' },
  { n: 2, label: 'CAM B', sub: 'Medium Frame',       bg: (t) => `linear-gradient(${200+t*3}deg,#00080a 0%,#001a12 50%,#080010 100%)`, accent: '#34d399' },
  { n: 3, label: 'CAM C', sub: 'Wide Shot',           bg: (t) => `linear-gradient(${240+t*2}deg,#0a0810 0%,#100018 50%,#080810 100%)`, accent: '#818cf8' },
]

function MultiCamFeed({ cam, activeCamAngle, isPlaying, currentTime, clips, onSwitch }) {
  const videoRef  = useRef(null)
  const isActive  = activeCamAngle === cam.n
  const trackId   = cam.n === 1 ? 'cam1' : cam.n === 2 ? 'cam2' : 'cam3'
  const userClip  = activeUserClip(clips, trackId, currentTime)

  // Sync video for this cam feed when it has a real clip
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !userClip) return
    if (vid.src !== userClip.url) {
      vid.src = userClip.url
      vid.load()
      vid.addEventListener('loadedmetadata', () => { vid.currentTime = 0 }, { once: true })
    }
  }, [userClip?.url])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !userClip) return
    if (isPlaying && isActive) vid.play().catch(() => {})
    else vid.pause()
  }, [isPlaying, isActive, !!userClip]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !userClip || (isPlaying && isActive)) return
    const t = Math.max(0, currentTime - (userClip.start ?? 0))
    if (Math.abs(vid.currentTime - t) > 0.2) vid.currentTime = t
  }, [currentTime, !!userClip, isPlaying, isActive, userClip?.start])

  return (
    <div onClick={() => onSwitch(cam.n)} style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      border: `2px solid ${isActive ? `${cam.accent}88` : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: isActive ? `0 0 18px ${cam.accent}33` : 'none',
      position: 'relative',
    }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: cam.bg(currentTime), transition: isPlaying ? 'background 0.5s' : 'none' }}>
        {/* Real video element */}
        {userClip && (
          <video ref={videoRef} playsInline muted={!isActive}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '30px 22px', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,0.2) 2px,rgba(0,0,0,0.2) 3px)', zIndex: 2 }} />
        {isActive && isPlaying && (
          <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 3, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'liveRecDot 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 8, fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em' }}>LIVE ON AIR</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 6, left: 8, zIndex: 3 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: isActive ? cam.accent : '#475569', letterSpacing: '0.06em' }}>{cam.label}</div>
          <div style={{ fontSize: 8, color: '#1e3a5f' }}>{userClip ? userClip.label : cam.sub}</div>
        </div>
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3, fontFamily: 'monospace', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>{fmt(currentTime)}</div>
        {isActive && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${cam.accent}`, borderRadius: 6, pointerEvents: 'none', zIndex: 4 }} />}
      </div>
    </div>
  )
}

// ── Multi-cam panel ───────────────────────────────────────────────────────────
function MultiCamPanel({ isPlaying, currentTime, activeCamAngle, setActiveCamAngle, camSyncState, syncCamAudio, camSyncProgress, clips, activeFX, activeLUT, motionTracker, activeTool, setMotionTracker, startMotionTracking }) {
  const isSyncing = camSyncState === 'analyzing'
  const isSynced  = camSyncState === 'synced'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', flexShrink: 0, background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em' }}>⬡ MULTI-CAM INTERVIEW ENGINE</span>
        <div style={{ flex: 1 }} />
        {isSyncing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#00e5ff,#6366f1)', width: `${camSyncProgress * 100}%`, transition: 'width 0.1s' }} />
            </div>
            <span style={{ fontSize: 9, color: '#00e5ff', fontWeight: 700 }}>{Math.round(camSyncProgress * 100)}%</span>
          </div>
        )}
        {isSynced && <span style={{ fontSize: 9.5, color: '#34d399', fontWeight: 700 }}>✓ Audio aligned</span>}
        <button onClick={syncCamAudio} disabled={isSyncing} style={{
          padding: '5px 12px', borderRadius: 7, fontSize: 10, fontWeight: 800,
          cursor: isSyncing ? 'default' : 'pointer', fontFamily: 'inherit',
          background: isSynced ? 'rgba(52,211,153,0.12)' : isSyncing ? 'rgba(0,229,255,0.06)' : 'rgba(0,229,255,0.14)',
          color: isSynced ? '#34d399' : '#00e5ff',
          border: `1px solid ${isSynced ? 'rgba(52,211,153,0.25)' : isSyncing ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, animation: isSyncing ? 'mcSpin 0.8s linear infinite' : 'none', display: 'inline-block' }}>🔊</span>
          {isSynced ? 'Re-Sync' : isSyncing ? 'Analyzing…' : 'Auto-Sync via Audio Waveform'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 8, padding: '10px', minHeight: 0 }}>
        {CAM_CONFIGS.map(cam => (
          <MultiCamFeed key={cam.n} cam={cam} activeCamAngle={activeCamAngle} isPlaying={isPlaying} currentTime={currentTime} clips={clips} onSwitch={setActiveCamAngle} />
        ))}
      </div>

      <div style={{ padding: '5px 12px 8px', fontSize: 9, color: '#1e3a5f', textAlign: 'center', flexShrink: 0 }}>
        Click any camera to switch the master sequence cut
        {isPlaying && <span style={{ color: '#fbbf24', fontWeight: 700 }}> — Live switching active</span>}
      </div>
    </div>
  )
}

// ── Single monitor frame ──────────────────────────────────────────────────────
function PenMaskOverlay({ penToolActive, penPoints, addPenPoint, activeClipId }) {
  const handleClick = useCallback((e) => {
    if (!penToolActive || !activeClipId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    addPenPoint({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }, [penToolActive, activeClipId, addPenPoint])

  if (!penToolActive) return null

  return (
    <div onClick={handleClick} style={{ position: 'absolute', inset: 0, zIndex: 7, cursor: 'crosshair' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
        {penPoints.length >= 2 && (
          <polyline
            points={penPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
            fill={penPoints.length >= 3 ? 'rgba(0,229,255,0.1)' : 'none'}
            stroke="rgba(0,229,255,0.8)" strokeWidth="1.5" strokeDasharray="4 2"
          />
        )}
        {penPoints.map((pt, i) => (
          <circle key={i} cx={`${pt.x}%`} cy={`${pt.y}%`} r={i === 0 ? 5 : 3}
            fill={i === 0 ? 'rgba(0,229,255,0.4)' : '#00e5ff'}
            stroke="rgba(0,229,255,0.9)" strokeWidth="1" />
        ))}
      </svg>
      {penPoints.length === 0 && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9.5, fontWeight: 700, color: '#00e5ff',
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
          padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          ✒ Click to place mask points
        </div>
      )}
    </div>
  )
}

// ── Safe Zones overlay (action-safe + title-safe) ─────────────────────────────
function SafeZonesOverlay({ enabled }) {
  if (!enabled) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 }}>
      {/* Action-safe zone: 5% inset */}
      <div style={{
        position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%',
        border: '1px solid rgba(0,229,255,0.35)',
      }}>
        <div style={{ position: 'absolute', top: -10, left: 3, fontSize: 7, color: 'rgba(0,229,255,0.6)', fontFamily: 'monospace', fontWeight: 700 }}>ACTION SAFE</div>
      </div>
      {/* Title-safe zone: 10% inset */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
        border: '1px solid rgba(251,191,36,0.35)',
      }}>
        <div style={{ position: 'absolute', top: -10, left: 3, fontSize: 7, color: 'rgba(251,191,36,0.6)', fontFamily: 'monospace', fontWeight: 700 }}>TITLE SAFE</div>
      </div>
      {/* Center crosshair */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

// ── Comparison view (split before/after) ──────────────────────────────────────
function ComparisonOverlay({ enabled, split }) {
  if (!enabled) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {/* Right half — "before" dimmed */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, right: 0, background: 'rgba(0,0,0,0.45)', borderLeft: '1.5px solid rgba(255,255,255,0.5)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: `${split}%`, transform: 'translate(-50%,-50%)',
        fontSize: 8, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)',
        padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', fontFamily: 'monospace',
      }}>AFTER │ BEFORE</div>
    </div>
  )
}

// ── LUFS loudness meter ────────────────────────────────────────────────────────
function LUFSMeter({ isPlaying }) {
  const [lufs, setLufs] = useState(-24)
  useEffect(() => {
    if (!isPlaying) { setLufs(-24); return }
    const id = setInterval(() => {
      setLufs(-14 + (Math.random() * 6 - 3))
    }, 180)
    return () => clearInterval(id)
  }, [isPlaying])

  const norm = Math.min(1, Math.max(0, (lufs + 40) / 40))
  const color = lufs > -9 ? '#f87171' : lufs > -14 ? '#fbbf24' : '#34d399'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', background: 'rgba(0,0,0,0.3)', height: 22, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 8, color: '#475569', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>LUFS</span>
      <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${norm * 100}%`, background: `linear-gradient(90deg, #34d399, ${color})`, transition: 'width 0.15s, background 0.15s' }} />
      </div>
      <span style={{ fontSize: 8.5, color, fontFamily: 'monospace', fontWeight: 800, minWidth: 40, textAlign: 'right' }}>{lufs.toFixed(1)}</span>
      <span style={{ fontSize: 7.5, color: '#334155', fontFamily: 'monospace' }}>LUFS-I</span>
      <span style={{ fontSize: 7.5, color: '#1e3a5f' }}>Target: -14</span>
    </div>
  )
}

// ── Smart Short Clip 9:16 crop overlay ───────────────────────────────────────
function ShortClipCropOverlay() {
  const { shortClipEnabled } = useVideoStore()
  if (!shortClipEnabled) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
      {/* Pillarbox darken — left */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '34.2%', background: 'rgba(0,0,0,0.62)' }} />
      {/* Pillarbox darken — right */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '34.2%', background: 'rgba(0,0,0,0.62)' }} />
      {/* Crop frame */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: '34.2%', right: '34.2%',
        border: '1.5px solid rgba(251,146,60,0.7)',
        boxShadow: 'inset 0 0 0 1px rgba(251,146,60,0.15)',
      }}>
        {/* Phone notch */}
        <div style={{
          position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
          width: 24, height: 5, borderRadius: 99, background: 'rgba(251,146,60,0.5)',
        }} />
        {/* Label */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, fontWeight: 800, color: '#fb923c', fontFamily: 'monospace',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4,
          border: '1px solid rgba(251,146,60,0.3)',
        }}>
          9:16 · SHORTS READY
        </div>
      </div>
    </div>
  )
}

// ── Face mosaic overlay ───────────────────────────────────────────────────────
function FaceMosaicOverlay({ currentTime }) {
  const { faceMosaicEnabled, faceMosaicStyle, faceMosaicStrength } = useVideoStore()
  if (!faceMosaicEnabled) return null

  const drift = Math.sin(currentTime * 0.25) * 5
  const faceLeft = `${38 + drift}%`
  const faceTop  = '16%'
  const alpha    = faceMosaicStrength / 100

  const innerStyle = {
    pixel: { background: `repeating-conic-gradient(rgba(0,0,0,${alpha}) 0% 25%, rgba(30,30,30,${alpha}) 0% 50%) 0/8px 8px` },
    blur:  { backdropFilter: `blur(${(faceMosaicStrength / 100) * 20}px)`, background: `rgba(0,0,0,${alpha * 0.4})`, borderRadius: '50%' },
    bar:   { background: `rgba(0,0,0,${alpha})`, borderRadius: 2, top: '35%', height: '30%', left: '-10%', right: '-10%', position: 'absolute' },
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}>
      {/* Bounding box */}
      <div style={{
        position: 'absolute',
        left: faceLeft, top: faceTop,
        width: '14%', height: '26%',
        border: '1.5px solid #818cf8',
        borderRadius: 4,
        boxShadow: '0 0 10px rgba(129,140,248,0.55)',
        animation: 'faceMosaicPulse 1.6s ease-in-out infinite',
      }}>
        {/* AI badge */}
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          fontSize: 7.5, fontWeight: 800, color: '#818cf8', fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.75)', padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
          border: '1px solid rgba(129,140,248,0.35)',
        }}>[ AI ]</div>

        {/* Blur/mosaic fill */}
        {faceMosaicStyle === 'bar' ? (
          <div style={{ position:'absolute', top:'30%', bottom:'30%', left:'-8%', right:'-8%', background:`rgba(0,0,0,${alpha})`, borderRadius:2 }} />
        ) : (
          <div style={{ position:'absolute', inset: 0, ...innerStyle[faceMosaicStyle], borderRadius: faceMosaicStyle === 'blur' ? '50%' : 3 }} />
        )}
      </div>
    </div>
  )
}

// ── Kinetic Captions Engine — phrase-level word-by-word pop overlay ───────────
function CaptionOverlay({ currentTime }) {
  const { captionsEnabled, captionStyle, captionWords } = useVideoStore()
  if (!captionsEnabled || !captionWords.length) return null

  const activeIdx = captionWords.findIndex(w => w.t <= currentTime && w.end > currentTime)
  if (activeIdx === -1) return null

  // Show a phrase window: up to 2 words before active + active + up to 2 after
  const BEFORE = 2, AFTER = 2
  const lo = Math.max(0, activeIdx - BEFORE)
  const hi = Math.min(captionWords.length - 1, activeIdx + AFTER)
  const phrase = captionWords.slice(lo, hi + 1)

  // Style configs per preset
  const CONFIG = {
    hormozi: {
      wrap: { background: 'transparent' },
      active: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 22, fontWeight: 900, color: '#FFD600',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000',
        animation: 'capPop 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'inline-block', padding: '0 4px',
      },
      inactive: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '0.03em',
        textShadow: '1px 1px 0 #000, -1px -1px 0 #000',
        display: 'inline-block', padding: '0 3px',
      },
    },
    minimal: {
      wrap: { background: 'rgba(0,0,0,0.62)', borderRadius: 8, padding: '5px 14px' },
      active: {
        fontFamily: 'Inter, Helvetica, sans-serif',
        fontSize: 16, fontWeight: 700, color: '#ffffff',
        textShadow: '0 1px 12px rgba(0,0,0,0.9)',
        animation: 'capPop 0.15s ease',
        display: 'inline-block', padding: '0 3px',
      },
      inactive: {
        fontFamily: 'Inter, Helvetica, sans-serif',
        fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
        display: 'inline-block', padding: '0 3px',
      },
    },
    cyber: {
      wrap: { background: 'transparent' },
      active: {
        fontFamily: 'monospace',
        fontSize: 18, fontWeight: 900, color: '#FFD600',
        textShadow: '0 0 12px #FFD600, 0 0 30px #ff6b00',
        letterSpacing: '0.1em',
        animation: 'capPop 0.15s ease',
        display: 'inline-block', padding: '0 4px',
      },
      inactive: {
        fontFamily: 'monospace',
        fontSize: 13, fontWeight: 700, color: 'rgba(0,229,255,0.45)',
        letterSpacing: '0.08em',
        textShadow: '0 0 6px rgba(0,229,255,0.3)',
        display: 'inline-block', padding: '0 3px',
      },
    },
  }

  const cfg = CONFIG[captionStyle] ?? CONFIG.minimal

  return (
    <div style={{
      position: 'absolute', bottom: 22, left: 0, right: 0,
      textAlign: 'center', zIndex: 10, pointerEvents: 'none',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 2, ...cfg.wrap }}>
        {phrase.map((w, i) => {
          const isActive = (lo + i) === activeIdx
          return (
            <span key={w.t} style={isActive ? cfg.active : cfg.inactive}>
              {captionStyle === 'hormozi' || captionStyle === 'cyber' ? w.word.toUpperCase() : w.word}
            </span>
          )
        })}
      </span>
    </div>
  )
}

// ── Smart Reframe overlay ──────────────────────────────────────────────────────
function ReframeOverlay({ currentTime }) {
  const { reframeEnabled } = useVideoStore()
  if (!reframeEnabled) return null

  const faceX = 42 + Math.sin(currentTime * 0.3) * 6
  const faceY = 22

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9,
    }}>
      {/* Vertical crop guides */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: '12.5%', right: '12.5%',
        border: '1px solid rgba(192,132,252,0.5)',
        boxShadow: 'inset 0 0 0 1px rgba(192,132,252,0.1)',
      }} />
      {/* Darkened pillarboxes */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '12.5%', background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '12.5%', background: 'rgba(0,0,0,0.5)' }} />
      {/* Face bounding box */}
      <div style={{
        position: 'absolute',
        left: `${faceX}%`, top: `${faceY}%`,
        width: '16%', height: '28%',
        border: '1.5px solid #c084fc',
        borderRadius: 4,
        boxShadow: '0 0 8px rgba(192,132,252,0.5)',
        animation: 'trackerPulse 1.4s ease-in-out infinite',
      }}>
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, color: '#c084fc', fontWeight: 800, fontFamily: 'monospace',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.7)', padding: '1px 4px', borderRadius: 3,
        }}>👤 LOCKED</div>
      </div>
      {/* Label */}
      <div style={{
        position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
        fontSize: 8, fontWeight: 800, color: '#c084fc',
        background: 'rgba(0,0,0,0.6)', padding: '2px 7px', borderRadius: 4,
        fontFamily: 'monospace', letterSpacing: '0.06em', whiteSpace: 'nowrap',
        border: '1px solid rgba(192,132,252,0.3)',
      }}>
        9:16 REFRAME ACTIVE
      </div>
    </div>
  )
}

function Monitor({ title, badge, isProgram, isPlaying, currentTime, activeFX, activeLUT, motionTracker, activeTool, setMotionTracker, startMotionTracking, clips, activeCamAngle, penToolActive, penPoints, addPenPoint, activeClipId, safeZonesEnabled, comparisonView, comparisonSplit }) {
  const { colorSwatches, colorHarmonyEnabled } = useVideoStore()

  const handleDrawBbox = useCallback((bbox) => {
    setMotionTracker('bbox', { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h })
    startMotionTracking()
  }, [setMotionTracker, startMotionTracking])

  // Check if we have a real video clip active right now (for the program monitor)
  const trackId  = activeCamAngle === 1 ? 'cam1' : activeCamAngle === 2 ? 'cam2' : 'cam3'
  const userClip = isProgram ? activeUserClip(clips ?? {}, trackId, currentTime) : null
  const hasVideo = !!userClip

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(8,8,18,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', flexShrink: 0, background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1 }}>{title}</span>
        {motionTracker?.active && isProgram && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#00e5ff', letterSpacing: '0.05em' }}>🎯 TRACKING</span>}
        {hasVideo && isProgram && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#34d399', letterSpacing: '0.05em' }}>▶ LIVE</span>}
        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: isProgram ? 'rgba(0,229,255,0.1)' : 'rgba(139,92,246,0.1)', color: isProgram ? '#00e5ff' : '#a78bfa', border: `1px solid ${isProgram ? 'rgba(0,229,255,0.2)' : 'rgba(139,92,246,0.2)'}` }}>{badge}</span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000', minHeight: 0 }}>
        {/* Background gradient (visible when no real video) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: isProgram
            ? `linear-gradient(${160 + currentTime * 3}deg, #0a0010 0%, #12001a 40%, #001a12 70%, #000a1a 100%)`
            : `linear-gradient(${200 + currentTime * 2}deg, #050005 0%, #0a0008 50%, #000508 100%)`,
          transition: isPlaying ? 'background 0.4s' : 'none',
        }} />

        {/* Real video overlay on Program Monitor */}
        {isProgram && clips && (
          <ProgramVideoPlayer clips={clips} currentTime={currentTime} isPlaying={isPlaying} activeCamAngle={activeCamAngle} />
        )}

        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 45px', opacity: hasVideo ? 0.4 : 1 }} />

        {/* Scanlines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)', opacity: isPlaying ? 0.04 : 0.02 }} />

        {/* FX overlays */}
        {isProgram && activeFX === 'glitch' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, background: 'linear-gradient(90deg, rgba(255,0,60,0.08) 0%, transparent 30%, rgba(0,255,200,0.08) 70%, transparent 100%)', animation: 'glitchShift 0.4s steps(2) infinite' }} />
        )}
        {isProgram && activeFX === 'neon' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, boxShadow: 'inset 0 0 60px rgba(99,102,241,0.25), inset 0 0 120px rgba(0,229,255,0.12)', animation: 'neonPulse 1.5s ease-in-out infinite' }} />
        )}
        {isProgram && activeLUT !== 'None' && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
            background:
              activeLUT === 'TealOrange'        ? 'linear-gradient(0deg,rgba(255,120,0,0.1) 0%,rgba(0,180,180,0.1) 100%)'
            : activeLUT === 'VintageKodachrome' ? 'linear-gradient(0deg,rgba(200,80,40,0.1) 0%,rgba(255,220,140,0.06) 100%)'
            : activeLUT === 'BleachBypass'      ? 'linear-gradient(0deg,rgba(0,0,0,0.15) 0%,rgba(200,200,200,0.06) 100%)'
            : activeLUT === 'CyberpunkNeon'     ? 'linear-gradient(0deg,rgba(20,0,20,0.16) 0%,rgba(100,0,80,0.06) 100%)'
            : activeLUT === 'LogToRec709'       ? 'linear-gradient(0deg,rgba(0,40,120,0.1) 0%,rgba(80,100,180,0.05) 100%)'
            : 'none',
          }} />
        )}

        {/* 9:16 Short Clip overlay */}
        {isProgram && <ShortClipCropOverlay />}

        {/* Face Mosaic overlay */}
        {isProgram && <FaceMosaicOverlay currentTime={currentTime} />}

        {/* Caption overlay */}
        {isProgram && <CaptionOverlay currentTime={currentTime} />}

        {/* Smart Reframe overlay */}
        {isProgram && <ReframeOverlay currentTime={currentTime} />}

        {/* Safe zones */}
        {isProgram && <SafeZonesOverlay enabled={safeZonesEnabled} />}

        {/* Comparison view */}
        {isProgram && <ComparisonOverlay enabled={comparisonView} split={comparisonSplit} />}

        {/* Color harmony tint */}
        {isProgram && colorHarmonyEnabled && colorSwatches.length > 0 && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
            background: `linear-gradient(135deg, ${colorSwatches[0]}18, ${colorSwatches[2] ?? colorSwatches[0]}12, ${colorSwatches[4] ?? colorSwatches[0]}18)`,
            mixBlendMode: 'color',
          }} />
        )}

        {/* Centre placeholder — only when no real video */}
        {!hasVideo && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {isProgram ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Program Output</div>
                {isPlaying && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'videoRecDot 1s ease-in-out infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em' }}>PLAYING</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.1)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Source Monitor</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.07)' }}>Drop a clip to preview</div>
              </>
            )}
          </div>
        )}

        {/* Timecode */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 6, fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, color: hasVideo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
          {fmt(currentTime)}
        </div>

        {/* File name badge when real video is playing */}
        {hasVideo && isProgram && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 6, fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(0,0,0,0.55)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(52,211,153,0.25)' }}>
            {userClip.label}
          </div>
        )}

        {/* Safe-zone corners */}
        {[0,1,2,3].map(ci => (
          <div key={ci} style={{ position: 'absolute', top: ci<2?12:'auto', bottom: ci>=2?12:'auto', left: ci%2===0?12:'auto', right: ci%2===1?12:'auto', width: 12, height: 12, zIndex: 6, pointerEvents: 'none', borderTop: ci<2?'1.5px solid rgba(255,255,255,0.18)':'none', borderBottom: ci>=2?'1.5px solid rgba(255,255,255,0.18)':'none', borderLeft: ci%2===0?'1.5px solid rgba(255,255,255,0.18)':'none', borderRight: ci%2===1?'1.5px solid rgba(255,255,255,0.18)':'none' }} />
        ))}

        {/* Motion tracker overlay */}
        {isProgram && motionTracker && (
          <MotionTrackerOverlay motionTracker={motionTracker} activeTool={activeTool} onDrawBbox={handleDrawBbox} />
        )}

        {/* Pen mask overlay */}
        {isProgram && (
          <PenMaskOverlay penToolActive={penToolActive} penPoints={penPoints} addPenPoint={addPenPoint} activeClipId={activeClipId} />
        )}
      </div>
    </div>
  )
}

// ── Main VideoMonitors component ──────────────────────────────────────────────
export default function VideoMonitors() {
  const {
    isPlaying, currentTime, duration,
    activeFX, activeLUT, play, pause, seek, stepFrame,
    multiCamMode, setMultiCamMode,
    activeCamAngle, setActiveCamAngle,
    camSyncState, syncCamAudio, camSyncProgress,
    motionTracker, setMotionTracker, startMotionTracking,
    activeTool,
    clips,
    scopesEnabled, setScopesEnabled,
    penToolActive, setPenToolActive, penPoints, addPenPoint, finalizeMask, clearPenPoints,
    activeClipId,
    faceMosaicEnabled, faceMosaicStyle, faceMosaicStrength,
    shortClipEnabled,
    colorSwatches, colorHarmonyEnabled,
    safeZonesEnabled, setSafeZonesEnabled,
    playbackResolution, setPlaybackResolution,
    comparisonView, comparisonSplit, setComparisonView, setComparisonSplit,
    guidesEnabled, setGuidesEnabled,
  } = useVideoStore()

  return (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', height: '42%', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,16,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>

      {/* Mode toggle strip */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)' }}>
        {[{ id: false, label: 'Dual Monitor', icon: '⬛' }, { id: true, label: 'Multi-Cam Switcher', icon: '📹' }].map(({ id, label, icon }) => {
          const active = multiCamMode === id
          return (
            <button key={String(id)} onClick={() => setMultiCamMode(id)} style={{
              padding: '6px 14px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: active ? 'rgba(255,255,255,0.05)' : 'none', border: 'none',
              borderBottom: active ? '2px solid rgba(0,229,255,0.5)' : '2px solid transparent',
              color: active ? '#00e5ff' : '#334155', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 12 }}>{icon}</span>{label}
            </button>
          )
        })}

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

        {/* Scopes toggle */}
        <button onClick={() => setScopesEnabled(!scopesEnabled)} style={{
          padding: '6px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: scopesEnabled ? 'rgba(255,255,255,0.05)' : 'none', border: 'none',
          borderBottom: scopesEnabled ? '2px solid rgba(52,211,153,0.5)' : '2px solid transparent',
          color: scopesEnabled ? '#34d399' : '#334155', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>📊</span>Scopes
        </button>

        {/* Pen tool toggle */}
        <button onClick={() => { setPenToolActive(!penToolActive); clearPenPoints() }} style={{
          padding: '6px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: penToolActive ? 'rgba(255,255,255,0.05)' : 'none', border: 'none',
          borderBottom: penToolActive ? '2px solid rgba(0,229,255,0.5)' : '2px solid transparent',
          color: penToolActive ? '#00e5ff' : '#334155', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>✒</span>Pen Mask
        </button>

        {penToolActive && activeClipId && (
          <button onClick={() => finalizeMask(activeClipId)} style={{
            marginLeft: 4, padding: '4px 10px', borderRadius: 6, fontSize: 9.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff',
          }}>Commit Mask</button>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

        {/* Safe zones toggle */}
        <button onClick={() => setSafeZonesEnabled(!safeZonesEnabled)} style={{
          padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: safeZonesEnabled ? 'rgba(255,255,255,0.05)' : 'none', border: 'none',
          borderBottom: safeZonesEnabled ? '2px solid rgba(251,191,36,0.5)' : '2px solid transparent',
          color: safeZonesEnabled ? '#fbbf24' : '#334155', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ fontSize: 11 }}>⊞</span>Safe Zones
        </button>

        {/* Comparison view toggle */}
        <button onClick={() => setComparisonView(!comparisonView)} style={{
          padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          background: comparisonView ? 'rgba(255,255,255,0.05)' : 'none', border: 'none',
          borderBottom: comparisonView ? '2px solid rgba(129,140,248,0.5)' : '2px solid transparent',
          color: comparisonView ? '#818cf8' : '#334155', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ fontSize: 11 }}>⬛⬜</span>Compare
        </button>

        {/* Playback resolution */}
        <select value={playbackResolution} onChange={e => setPlaybackResolution(e.target.value)} style={{
          marginLeft: 4, padding: '3px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: 9.5, fontFamily: 'inherit',
          cursor: 'pointer', outline: 'none',
        }}>
          <option value="full">Full</option>
          <option value="1/2">1/2</option>
          <option value="1/4">1/4</option>
          <option value="1/8">1/8</option>
        </select>

        <div style={{ flex: 1 }} />
      </div>

      {/* Monitor content */}
      {multiCamMode ? (
        <MultiCamPanel
          isPlaying={isPlaying} currentTime={currentTime}
          activeCamAngle={activeCamAngle} setActiveCamAngle={setActiveCamAngle}
          camSyncState={camSyncState} syncCamAudio={syncCamAudio} camSyncProgress={camSyncProgress}
          clips={clips}
          activeFX={activeFX} activeLUT={activeLUT}
          motionTracker={motionTracker} activeTool={activeTool}
          setMotionTracker={setMotionTracker} startMotionTracking={startMotionTracking}
        />
      ) : (
        <>
          <div style={{ flex: 1, display: 'flex', gap: 10, padding: '10px 10px 6px', minHeight: 0 }}>
            <Monitor title="Source Monitor" badge="SRC" isProgram={false}
              isPlaying={isPlaying} currentTime={currentTime} activeFX={null} activeLUT="None"
              motionTracker={null} activeTool={activeTool}
              setMotionTracker={setMotionTracker} startMotionTracking={startMotionTracking}
              clips={clips} activeCamAngle={activeCamAngle}
              penToolActive={false} penPoints={[]} addPenPoint={addPenPoint} activeClipId={null}
              safeZonesEnabled={false} comparisonView={false} comparisonSplit={50}
            />
            <Monitor title="Program Monitor" badge="PGM" isProgram
              isPlaying={isPlaying} currentTime={currentTime} activeFX={activeFX} activeLUT={activeLUT}
              motionTracker={motionTracker} activeTool={activeTool}
              setMotionTracker={setMotionTracker} startMotionTracking={startMotionTracking}
              clips={clips} activeCamAngle={activeCamAngle}
              penToolActive={penToolActive} penPoints={penPoints} addPenPoint={addPenPoint} activeClipId={activeClipId}
              safeZonesEnabled={safeZonesEnabled} comparisonView={comparisonView} comparisonSplit={comparisonSplit}
            />
          </div>
          <ControlBar isPlaying={isPlaying} currentTime={currentTime} duration={duration} onPlay={play} onPause={pause} onSeek={seek} onStepFrame={stepFrame} />
        </>
      )}

      {multiCamMode && (
        <ControlBar isPlaying={isPlaying} currentTime={currentTime} duration={duration} onPlay={play} onPause={pause} onSeek={seek} onStepFrame={stepFrame} />
      )}

      {/* Hidden audio player — always mounted, plays user audio clips */}
      <HiddenAudioPlayer clips={clips} currentTime={currentTime} isPlaying={isPlaying} />

      {/* Signal Scopes Panel */}
      {scopesEnabled && <VideoScopes />}

      {/* LUFS Loudness Meter */}
      <LUFSMeter isPlaying={isPlaying} />

      <style>{`
        @keyframes glitchShift { 0%{transform:translateX(-2px)} 50%{transform:translateX(2px)} 100%{transform:translateX(-2px)} }
        @keyframes neonPulse    { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes videoRecDot  { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes liveRecDot   { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes trackerPulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes trackerDot   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @keyframes mcSpin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes capPop        { from{transform:scale(1.2)} to{transform:scale(1)} }
        @keyframes cyberShift    { 0%{color:#00e5ff;text-shadow:0 0 10px #00e5ff} 50%{color:#c084fc;text-shadow:0 0 10px #c084fc} 100%{color:#00e5ff;text-shadow:0 0 10px #00e5ff} }
        @keyframes faceMosaicPulse { 0%,100%{border-color:#818cf8;box-shadow:0 0 10px rgba(129,140,248,0.55)} 50%{border-color:#a5b4fc;box-shadow:0 0 18px rgba(129,140,248,0.9)} }
      `}</style>
    </div>
  )
}
