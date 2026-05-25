import { useState } from 'react'
import { useVideoStore } from '../store/videoStore'

const SCAN_STEPS = [
  'Loading video index…',
  'Analyzing audio energy peaks…',
  'Detecting scene cuts & motion bursts…',
  'Scoring hook potential with ML model…',
  'Ranking viral clip candidates…',
  '✓ Analysis complete!',
]

const MOCK_CLIPS = [
  { id: 'vc1', start: '0:02', end: '0:32', score: 94, hook: 'High Hook Potential', emoji: '🔥', color: '#f87171' },
  { id: 'vc2', start: '1:15', end: '1:45', score: 88, hook: 'Strong Emotional Peak', emoji: '⚡', color: '#fb923c' },
  { id: 'vc3', start: '2:44', end: '3:14', score: 83, hook: 'Clear Value Statement', emoji: '💡', color: '#fbbf24' },
  { id: 'vc4', start: '4:01', end: '4:31', score: 79, hook: 'Audience Engagement Spike', emoji: '🎯', color: '#a3e635' },
  { id: 'vc5', start: '5:30', end: '6:00', score: 72, hook: 'Curiosity Gap Detected', emoji: '🤔', color: '#34d399' },
  { id: 'vc6', start: '7:12', end: '7:42', score: 68, hook: 'Relatable Moment', emoji: '😂', color: '#60a5fa' },
]

function ScoreBar({ score }) {
  const color = score >= 90 ? '#f87171' : score >= 80 ? '#fbbf24' : score >= 70 ? '#34d399' : '#60a5fa'
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 4 }}>
      <div style={{
        height: '100%', borderRadius: 99,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        width: `${score}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

export default function ViralClipSlicer() {
  const { setViralSlicerOpen } = useVideoStore()
  const [phase, setPhase] = useState('idle')
  const [scanStep, setScanStep] = useState(0)
  const [exported, setExported] = useState(new Set())

  function startScan() {
    setPhase('scanning')
    setScanStep(0)
    let i = 0
    const tick = () => {
      i++
      setScanStep(i)
      if (i < SCAN_STEPS.length - 1) {
        setTimeout(tick, 500 + Math.random() * 600)
      } else {
        setPhase('done')
      }
    }
    setTimeout(tick, 400)
  }

  function handleExport(clipId) {
    const clip = MOCK_CLIPS.find(c => c.id === clipId)
    if (!clip) return
    const content = [
      `# ZaraForge Viral Short Export`,
      `# Clip: ${clipId}`,
      `# Range: ${clip.start} – ${clip.end}`,
      `# AI Virality Score: ${clip.score}%`,
      `# Hook Type: ${clip.hook}`,
      `# Format: 9:16 Vertical (1080x1920)`,
      `# Platform: TikTok · Reels · Shorts ready`,
      `# Generated: ${new Date().toISOString()}`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `viral-short-${clipId}.txt` })
    a.click()
    URL.revokeObjectURL(url)
    setExported(prev => new Set([...prev, clipId]))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(2,2,10,0.88)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) setViralSlicerOpen(false) }}>

      <div style={{
        width: 520, maxHeight: '80vh',
        background: '#0c0c15',
        border: '1px solid rgba(251,146,60,0.25)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 0 60px rgba(251,146,60,0.08)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px 12px',
          background: 'linear-gradient(90deg, rgba(251,146,60,0.08), rgba(239,68,68,0.06))',
          borderBottom: '1px solid rgba(251,146,60,0.12)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🎬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>AI Viral Clip Slicer</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
              Detects high-energy moments for TikTok · Reels · Shorts
            </div>
          </div>
          <button onClick={() => setViralSlicerOpen(false)} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', color: '#475569', fontSize: 14, fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {phase === 'idle' && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🎯</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>
                Find Your Viral Moments
              </div>
              <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.6, marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
                Our ML model scans your video for audio energy peaks, scene changes, and emotional intensity to find the 30-second clips most likely to go viral.
              </div>
              <button onClick={startScan} style={{
                padding: '11px 28px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                background: 'linear-gradient(90deg, rgba(251,146,60,0.3), rgba(239,68,68,0.25))',
                border: '1px solid rgba(251,146,60,0.4)',
                color: '#fb923c',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                Scan for Viral Clips
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <div style={{ padding: '20px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 10, animation: 'slicerSpin 2s linear infinite', display: 'inline-block' }}>⚙️</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fb923c' }}>Analyzing your video…</div>
              </div>

              {/* Fake waveform visualizer */}
              <div style={{
                height: 48, display: 'flex', alignItems: 'center', gap: 2,
                padding: '0 4px', marginBottom: 16, overflow: 'hidden',
              }}>
                {Array.from({ length: 60 }, (_, i) => {
                  const h = 20 + Math.sin(i * 0.4) * 18 + Math.sin(i * 1.1) * 12 + (i % 7 === 0 ? 16 : 0)
                  return (
                    <div key={i} style={{
                      flex: 1, borderRadius: 2, minWidth: 0,
                      background: i % 7 === 0 ? '#fb923c' : 'rgba(251,146,60,0.35)',
                      height: `${Math.min(100, Math.max(10, h))}%`,
                      animation: `slicerBar 0.8s ${i * 0.04}s ease-in-out infinite alternate`,
                    }} />
                  )
                })}
              </div>

              {/* Step log */}
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {SCAN_STEPS.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4,
                    opacity: i <= scanStep ? 1 : 0.2, transition: 'opacity 0.3s',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: i < scanStep ? '#34d399' : i === scanStep ? '#fb923c' : 'rgba(255,255,255,0.1)',
                      boxShadow: i === scanStep ? '0 0 8px rgba(251,146,60,0.8)' : 'none',
                    }} />
                    <span style={{
                      fontSize: 9, fontFamily: 'monospace',
                      color: i === scanStep ? '#fb923c' : i < scanStep ? '#34d399' : '#334155',
                    }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>
                    🔥 {MOCK_CLIPS.length} Viral Short Ideas Found
                  </div>
                  <div style={{ fontSize: 9.5, color: '#475569', marginTop: 2 }}>
                    Ranked by AI Virality Score · 30-sec clips
                  </div>
                </div>
                <button onClick={startScan} style={{
                  padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#475569', fontSize: 9,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Re-Analyze
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_CLIPS.map((clip, idx) => (
                  <div key={clip.id} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${exported.has(clip.id) ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Rank */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: idx === 0 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${idx === 0 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: idx === 0 ? 14 : 10, fontWeight: 800,
                        color: idx === 0 ? '#f87171' : '#475569',
                      }}>
                        {idx === 0 ? '🏆' : `#${idx + 1}`}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Score badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800,
                            background: `${clip.color}22`, border: `1px solid ${clip.color}44`,
                            color: clip.color, padding: '1px 6px', borderRadius: 5,
                          }}>
                            {clip.emoji} {clip.score}% Score
                          </span>
                          <span style={{ fontSize: 9, color: '#334155' }}>·</span>
                          <span style={{ fontSize: 9, color: '#475569' }}>{clip.hook}</span>
                        </div>

                        {/* Time range */}
                        <div style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#64748b', marginBottom: 3 }}>
                          {clip.start} → {clip.end} · 30 sec
                        </div>

                        <ScoreBar score={clip.score} />
                      </div>

                      {/* Export button */}
                      <button onClick={() => handleExport(clip.id)} style={{
                        padding: '5px 10px', borderRadius: 7, flexShrink: 0,
                        border: `1px solid ${exported.has(clip.id) ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.1)'}`,
                        background: exported.has(clip.id) ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                        color: exported.has(clip.id) ? '#34d399' : '#94a3b8',
                        fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {exported.has(clip.id) ? '✓ Exported' : '⬇ Export Short'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Platform targets */}
              <div style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(251,146,60,0.07), rgba(239,68,68,0.05))',
                border: '1px solid rgba(251,146,60,0.2)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>📱</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#fb923c' }}>
                    9:16 Vertical · TikTok · Reels · Shorts
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                    Each clip auto-reframed to portrait format with AI Smart Reframe
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slicerSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slicerBar { from{opacity:0.4} to{opacity:1} }
      `}</style>
    </div>
  )
}
