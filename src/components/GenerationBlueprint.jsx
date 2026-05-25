import { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useTranslation } from '../i18n'

const TASK_DEFS = [
  { icon: '🎨', key: 'todo_1' },
  { icon: '🔐', key: 'todo_2' },
  { icon: '🗄️', key: 'todo_3' },
  { icon: '⚙️', key: 'todo_4' },
  { icon: '🚀', key: 'todo_5' },
]

function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.22, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.75)
  } catch {}
}

export default function GenerationBlueprint() {
  const { genPhase, genTaskIdx, resetGeneration, onboardingStep } = useBuilderStore()
  const { t } = useTranslation()
  const TASKS = TASK_DEFS.map(({ icon, key }) => ({ icon, label: t(key) }))
  const isPaused = onboardingStep === 'signup_gate'
  const [bannerVisible, setBannerVisible] = useState(false)
  const prevPhaseRef = useRef('idle')

  useEffect(() => {
    if (prevPhaseRef.current !== 'done' && genPhase === 'done') {
      playPing()
      const t = setTimeout(() => setBannerVisible(true), 250)
      return () => clearTimeout(t)
    }
    prevPhaseRef.current = genPhase
  }, [genPhase])

  useEffect(() => {
    if (genPhase === 'idle') setBannerVisible(false)
  }, [genPhase])

  const isDone    = genPhase === 'done'
  const isRunning = genPhase === 'running' && !isPaused

  // Idle state — placeholder card
  if (genPhase === 'idle') {
    return (
      <div style={{ padding: '14px 12px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '24px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>🛠️</div>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 6, letterSpacing: '0.01em' }}>
              {t('todo_title')}
            </p>
            <p style={{ fontSize: 10, color: '#334155', lineHeight: 1.6 }}>
              {t('blueprint_idle_desc')}
            </p>
          </div>

          {/* Preview task list (faded) */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {TASKS.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                opacity: 0.45,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.1)', flexShrink: 0,
                }} />
                <span style={{ fontSize: 9.5, color: '#475569' }}>{t.icon} {t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const completedCount = isDone ? TASKS.length : genTaskIdx
  const pct = isDone ? 100 : Math.round((completedCount / TASKS.length) * 100)

  return (
    <div style={{ padding: '12px 12px', overflowY: 'auto' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        marginBottom: 10,
      }}>

        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: isDone
            ? 'linear-gradient(90deg, rgba(16,185,129,0.06), transparent)'
            : 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent)',
        }}>
          <span style={{ fontSize: 18 }}>🛠️</span>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.015em',
              background: isDone
                ? 'linear-gradient(90deg, #34d399, #10b981)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {t('todo_title')}
            </p>
            <p style={{ fontSize: 9.5, color: isDone ? '#34d399' : isPaused ? '#f59e0b' : '#f59e0b', marginTop: 2, fontWeight: 600 }}>
              {isDone  ? t('blueprint_done_status')
               : isPaused ? `⏸ ${t('blueprint_paused')}`
               : `⚡ ${t('blueprint_running', { pct })}`}
            </p>
          </div>

          {/* Live pulse dot */}
          {isRunning && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#6366f1',
              animation: 'bpPulse 1.2s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Task rows */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {TASKS.map((task, i) => {
            const done    = isDone || genTaskIdx > i
            const active  = !isDone && genTaskIdx === i
            const pending = !isDone && genTaskIdx < i

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 11px', borderRadius: 10,
                background: active  ? 'rgba(99,102,241,0.09)'
                          : done    ? 'rgba(16,185,129,0.06)'
                                    : 'rgba(255,255,255,0.015)',
                border: `1px solid ${
                  active  ? 'rgba(99,102,241,0.25)'
                : done    ? 'rgba(52,211,153,0.18)'
                          : 'rgba(255,255,255,0.04)'
                }`,
                transition: 'all 0.4s ease',
              }}>

                {/* Status icon */}
                <div style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done ? (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(16,185,129,0.18)',
                      border: '1.5px solid #34d399',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'bpCheckIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                      <span style={{ fontSize: 9, color: '#34d399', fontWeight: 900, lineHeight: 1 }}>✓</span>
                    </div>
                  ) : active && isPaused ? (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(245,158,11,0.15)',
                      border: '1.5px solid rgba(245,158,11,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9,
                    }}>🔒</div>
                  ) : active ? (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2.5px solid rgba(99,102,241,0.2)',
                      borderTopColor: '#818cf8',
                      borderRightColor: '#818cf8',
                      animation: 'bpSpin 0.65s linear infinite',
                    }} />
                  ) : (
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }} />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 10.5, lineHeight: 1.45,
                    fontWeight: active ? 700 : done ? 600 : 400,
                    color: done    ? 'rgba(52,211,153,0.7)'
                         : active  ? '#c7d2fe'
                                   : '#374151',
                    transition: 'color 0.35s',
                  }}>
                    {task.icon}&nbsp; {task.label}
                  </p>

                  {/* Bouncing dots when active */}
                  {active && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                      {[0, 1, 2].map(d => (
                        <div key={d} style={{
                          width: 3.5, height: 3.5, borderRadius: '50%',
                          background: '#818cf8',
                          animation: `bpDot 1.1s ease-in-out ${d * 0.18}s infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Done timestamp pill */}
                {done && (
                  <div style={{
                    fontSize: 8, fontWeight: 700,
                    color: '#34d399', flexShrink: 0, paddingTop: 2,
                    opacity: 0.7,
                  }}>
                    ✓
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 12px 14px' }}>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: isDone
                ? 'linear-gradient(90deg, #34d399, #10b981)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              width: `${pct}%`,
              transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1), background 0.4s',
              boxShadow: isDone ? '0 0 8px rgba(52,211,153,0.5)' : '0 0 8px rgba(99,102,241,0.5)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 9, color: '#334155' }}>
              {isDone ? `${TASKS.length} of ${TASKS.length} milestones complete` : `Milestone ${Math.min(genTaskIdx + 1, TASKS.length)} of ${TASKS.length}`}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800,
              color: isDone ? '#34d399' : '#818cf8',
            }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Success banner ── */}
      {isDone && bannerVisible && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.08))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(52,211,153,0.28)',
          borderRadius: 14, padding: '16px',
          animation: 'bpSlideIn 0.55s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: '#34d399', lineHeight: 1.3 }}>
              {t('blueprint_done_title')}
            </p>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(52,211,153,0.65)', lineHeight: 1.6, marginBottom: 12 }}>
            {t('blueprint_done_sub')}
          </p>

          {/* Fake CDN URL pill */}
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '7px 10px',
            border: '1px solid rgba(52,211,153,0.15)', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0,
              animation: 'bpPulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 9.5, color: '#34d399', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
              zaraforge.app/preview/{Math.random().toString(36).slice(2, 8)}
            </span>
          </div>

          <button
            onClick={() => { resetGeneration() }}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 9,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399', fontSize: 10.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.12)'}>
            ↩ &nbsp;{t('blueprint_new_project')}
          </button>
        </div>
      )}

      <style>{`
        @keyframes bpSpin    { to { transform: rotate(360deg) } }
        @keyframes bpPulse   { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.35)} }
        @keyframes bpDot     { 0%,80%,100%{opacity:0.2;transform:scale(0.75)} 40%{opacity:1;transform:scale(1)} }
        @keyframes bpSlideIn { from{opacity:0;transform:translateY(14px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes bpCheckIn { from{opacity:0;transform:scale(0.4)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}
