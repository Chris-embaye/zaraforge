import { useRef, useEffect, useState } from 'react'
import { useVideoStore } from '../store/videoStore'

// ── Waveform Monitor (0–100 IRE luminance) ────────────────────────────────────
function WaveformScope({ currentTime, isPlaying }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#080810'
    ctx.fillRect(0, 0, W, H)

    // IRE grid lines
    for (let ire = 0; ire <= 100; ire += 20) {
      const y = H - (ire / 100) * (H - 6) - 3
      ctx.strokeStyle = ire === 0 ? '#1a1a2e' : ire === 100 ? '#2d2d4a' : '#111118'
      ctx.lineWidth = ire % 100 === 0 ? 1.5 : 1
      ctx.setLineDash(ire % 100 === 0 ? [] : [2, 3])
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#1e3a5f'
      ctx.font = '7px monospace'
      ctx.fillText(`${ire}`, 2, y - 2)
    }

    // 90 IRE broadcast legal line
    const y90 = H - (90 / 100) * (H - 6) - 3
    ctx.strokeStyle = 'rgba(248,113,113,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(0, y90); ctx.lineTo(W, y90); ctx.stroke()
    ctx.setLineDash([])

    // Waveform plot — use pseudo-random based on currentTime for animated look
    const seed = currentTime * 31.7
    const numCols = W
    for (let x = 0; x < numCols; x++) {
      const t = x / numCols
      // Simulate luminance distribution: brighter in center, darker at edges
      const base = 0.55 + Math.sin(t * Math.PI * 2 + seed * 0.3) * 0.15
        + Math.sin(t * Math.PI * 5 + seed * 0.7) * 0.08
        + ((((x * 137 + seed * 41) % 100) / 100) - 0.5) * 0.06

      const luma = Math.max(0.02, Math.min(0.95, base))

      // Draw vertical column of dots representing luminance spread
      const spread = 0.12 + Math.sin(t * Math.PI * 3 + seed * 0.5) * 0.06
      const centerY = H - luma * (H - 6) - 3

      for (let j = 0; j < 8; j++) {
        const offset = (j - 3.5) * spread * H * 0.35
        const py = centerY + offset
        if (py < 0 || py > H) continue
        const alpha = 0.8 - Math.abs(j - 3.5) * 0.12
        ctx.fillStyle = `rgba(0,229,255,${alpha * 0.7})`
        ctx.fillRect(x, Math.round(py), 1, 1)
      }
    }

    // Labels
    ctx.fillStyle = '#1e3a5f'
    ctx.font = '7px monospace'
    ctx.fillText('WAVEFORM', 2, 9)
  }, [currentTime, isPlaying])

  return <canvas ref={canvasRef} width={176} height={88} style={{ width: '100%', height: 88, borderRadius: 6, display: 'block' }} />
}

// ── Vectorscope (circular hue/saturation) ─────────────────────────────────────
function VectorscopeScope({ currentTime }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const R  = Math.min(W, H) / 2 - 4

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#080810'
    ctx.fillRect(0, 0, W, H)

    // Concentric rings (saturation markers)
    for (let pct of [0.33, 0.67, 1.0]) {
      ctx.strokeStyle = pct === 1 ? '#1e3a5f' : '#111118'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, R * pct, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Color vector targets (R/G/B/Cy/Mg/Ye at 75% saturation)
    const targets = [
      { angle: 105, label: 'R', color: '#f87171' },
      { angle: 225, label: 'G', color: '#34d399' },
      { angle: 345, label: 'B', color: '#60a5fa' },
      { angle: 165, label: 'Cy',color: '#22d3ee' },
      { angle: 285, label: 'Mg',color: '#e879f9' },
      { angle: 45,  label: 'Ye', color: '#facc15' },
    ]
    targets.forEach(({ angle, label, color }) => {
      const rad = (angle - 90) * Math.PI / 180
      const tx = cx + Math.cos(rad) * R * 0.75
      const ty = cy + Math.sin(rad) * R * 0.75
      ctx.strokeStyle = color + '55'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke()
      ctx.strokeStyle = color + '88'
      ctx.lineWidth = 1
      ctx.strokeRect(tx - 3, ty - 3, 6, 6)
      ctx.fillStyle = color + '99'
      ctx.font = '7px monospace'
      ctx.fillText(label, tx + 5, ty + 3)
    })

    // Crosshair
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 3])
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke()
    ctx.setLineDash([])

    // Plot scatter points (simulated signal)
    const seed = currentTime * 19.3
    const numPoints = 280
    for (let i = 0; i < numPoints; i++) {
      const angle = ((i * 137.508 + seed * 11) % 360) * Math.PI / 180
      const sat = 0.05 + ((((i * 73 + seed * 41) % 100) / 100) * 0.55)
      const px = cx + Math.cos(angle) * R * sat
      const py = cy + Math.sin(angle) * R * sat
      const alpha = 0.15 + (sat * 0.4)
      // Color based on angle
      const hue = Math.round((angle * 180 / Math.PI + 90) % 360)
      ctx.fillStyle = `hsla(${hue},80%,60%,${alpha})`
      ctx.fillRect(px, py, 1.5, 1.5)
    }

    ctx.fillStyle = '#1e3a5f'
    ctx.font = '7px monospace'
    ctx.fillText('VECTORSCOPE', 2, 9)
  }, [currentTime])

  return <canvas ref={canvasRef} width={88} height={88} style={{ width: 88, height: 88, borderRadius: 6, display: 'block', flexShrink: 0 }} />
}

// ── RGB Parade ────────────────────────────────────────────────────────────────
function RGBParadeScope({ currentTime }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#080810'
    ctx.fillRect(0, 0, W, H)

    const channels = [
      { label: 'R', color: '#f87171', offset: 0 },
      { label: 'G', color: '#34d399', offset: 1 },
      { label: 'B', color: '#60a5fa', offset: 2 },
    ]

    const panelW = Math.floor(W / 3)
    const seed   = currentTime * 23.1

    channels.forEach(({ label, color, offset }) => {
      const ox = offset * panelW
      const pH = H - 10

      // Panel background
      ctx.fillStyle = 'rgba(255,255,255,0.012)'
      ctx.fillRect(ox, 0, panelW - 2, H)

      // Divider
      if (offset > 0) {
        ctx.strokeStyle = '#111118'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke()
      }

      // Grid lines per channel
      for (let ire = 0; ire <= 100; ire += 50) {
        const y = H - 5 - (ire / 100) * pH
        ctx.strokeStyle = '#1a1a2e'
        ctx.lineWidth = 0.5
        ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + panelW - 2, y); ctx.stroke()
        ctx.setLineDash([])
      }

      // Plot waveform for this channel
      const colW = panelW - 2
      for (let x = 0; x < colW; x++) {
        const t = x / colW
        const phaseOffset = offset * 1.5
        const val = 0.45 + Math.sin(t * Math.PI * 3 + seed * 0.4 + phaseOffset) * 0.25
          + Math.sin(t * Math.PI * 7 + seed * 0.8 + phaseOffset) * 0.1
          + ((((x * 97 + seed * 53 + offset * 31) % 100) / 100) - 0.5) * 0.07

        const level = Math.max(0.02, Math.min(0.95, val))
        const spread = 0.08 + Math.sin(t * Math.PI * 5 + seed * 0.6) * 0.04

        const centerY = H - 5 - level * pH
        for (let j = 0; j < 6; j++) {
          const off = (j - 2.5) * spread * pH * 0.3
          const py = centerY + off
          if (py < 0 || py > H) continue
          const alpha = 0.7 - Math.abs(j - 2.5) * 0.1
          ctx.fillStyle = color + Math.round(alpha * 180).toString(16).padStart(2, '0')
          ctx.fillRect(ox + x, Math.round(py), 1, 1)
        }
      }

      // Label
      ctx.fillStyle = color + 'cc'
      ctx.font = '8px monospace'
      ctx.fontWeight = 700
      ctx.fillText(label, ox + 3, H - 2)
    })

    ctx.fillStyle = '#1e3a5f'
    ctx.font = '7px monospace'
    ctx.fillText('RGB PARADE', 2, 9)
  }, [currentTime])

  return <canvas ref={canvasRef} width={176} height={88} style={{ width: '100%', height: 88, borderRadius: 6, display: 'block' }} />
}

// ── Main VideoScopes panel ────────────────────────────────────────────────────
export default function VideoScopes() {
  const { currentTime, isPlaying } = useVideoStore()
  const [activeScope, setActiveScope] = useState('all')

  const SCOPE_TABS = [
    { id: 'all',       label: 'All'       },
    { id: 'waveform',  label: 'Waveform'  },
    { id: 'vector',    label: 'Vector'    },
    { id: 'parade',    label: 'Parade'    },
  ]

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)', background: '#080810', padding: '6px 8px 8px' }}>
      {/* Scope tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {SCOPE_TABS.map(t => {
          const active = activeScope === t.id
          return (
            <button key={t.id} onClick={() => setActiveScope(t.id)} style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: active ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: active ? '#00e5ff' : '#475569',
            }}>{t.label}</button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 8.5, color: '#1e3a5f', alignSelf: 'center' }}>
          {isPlaying ? '● LIVE' : '◉ PAUSED'}
        </span>
      </div>

      {/* Scope renders */}
      {(activeScope === 'all' || activeScope === 'waveform') && (
        <div style={{ marginBottom: 4 }}>
          <WaveformScope currentTime={currentTime} isPlaying={isPlaying} />
        </div>
      )}

      {(activeScope === 'all') && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <RGBParadeScope currentTime={currentTime} />
          </div>
          <VectorscopeScope currentTime={currentTime} />
        </div>
      )}

      {activeScope === 'vector' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <VectorscopeScope currentTime={currentTime} />
        </div>
      )}

      {activeScope === 'parade' && (
        <div style={{ marginBottom: 4 }}>
          <RGBParadeScope currentTime={currentTime} />
        </div>
      )}
    </div>
  )
}
