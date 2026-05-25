import { useState } from 'react'

// ── Supported languages ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en',    label: 'English',    native: 'English'    },
  { code: 'ti',    label: 'Tigrinya',   native: 'ትግርኛ'       },
  { code: 'am',    label: 'Amharic',    native: 'አማርኛ'       },
  { code: 'ar',    label: 'Arabic',     native: 'العربية'    },
  { code: 'fr',    label: 'French',     native: 'Français'   },
  { code: 'de',    label: 'German',     native: 'Deutsch'    },
  { code: 'es',    label: 'Spanish',    native: 'Español'    },
  { code: 'pt',    label: 'Portuguese', native: 'Português'  },
  { code: 'zh',    label: 'Chinese',    native: '中文'        },
  { code: 'ja',    label: 'Japanese',   native: '日本語'      },
  { code: 'ko',    label: 'Korean',     native: '한국어'      },
  { code: 'ru',    label: 'Russian',    native: 'Русский'    },
  { code: 'it',    label: 'Italian',    native: 'Italiano'   },
  { code: 'nl',    label: 'Dutch',      native: 'Nederlands' },
]

// ── Persist to electron-store (desktop) or localStorage (web fallback) ────────
function savePrefs(prefs) {
  const isDesktop = typeof window !== 'undefined' && window.zaraforge?.prefs
  if (isDesktop) {
    window.zaraforge.prefs.set('firstBootComplete', true)
    window.zaraforge.prefs.set('lang',    prefs.lang)
    window.zaraforge.prefs.set('hwAccel', prefs.hwAccel)
  } else {
    localStorage.setItem('zf-first-boot-complete', 'true')
    localStorage.setItem('zf-lang',     prefs.lang)
    localStorage.setItem('zf-hw-accel', String(prefs.hwAccel))
  }
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 52, height: 28, borderRadius: 99, flexShrink: 0,
        background: on ? 'linear-gradient(135deg, #00e5ff, #6366f1)' : '#1e293b',
        border: `2px solid ${on ? 'rgba(0,229,255,0.5)' : '#334155'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: on ? '0 0 16px rgba(0,229,255,0.35)' : 'none',
      }}>
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 24 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: on ? '#fff' : '#475569',
        transition: 'left 0.3s, background 0.3s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ active, done }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: done ? '#00e5ff' : active ? '#6366f1' : '#1e293b',
      border: active ? '2px solid rgba(99,102,241,0.5)' : '2px solid transparent',
      transition: 'all 0.3s',
      boxShadow: done ? '0 0 8px rgba(0,229,255,0.6)' : 'none',
    }} />
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function FirstBootSetup({ onComplete }) {
  const [step,     setStep]     = useState(0)  // 0 = lang, 1 = hardware, 2 = launching
  const [lang,     setLang]     = useState('en')
  const [hwAccel,  setHwAccel]  = useState(true)
  const [launching,setLaunching] = useState(false)

  const isDesktop = typeof window !== 'undefined' && !!window.zaraforge
  const platform  = window.zaraforge?.platform?.os ?? 'web'

  function handleLaunch() {
    setLaunching(true)
    setStep(2)
    const prefs = { lang, hwAccel }
    savePrefs(prefs)
    // Small delay for the animation, then hand off to App
    setTimeout(() => onComplete(prefs), 1800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(99,102,241,0.12) 0%, transparent 60%), #02020a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 80% at center, black 40%, transparent 100%)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 480,
        margin: '0 20px',
        borderRadius: 24, overflow: 'hidden',
        background: 'rgba(8,8,20,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.06)',
        animation: 'fbFadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #00e5ff, #6366f1, #8b5cf6)',
        }} />

        {/* Header */}
        <div style={{ padding: '32px 36px 0' }}>
          <img
            src="/zaraforge-logo.png"
            alt="ZaraForge"
            style={{ height: 36, marginBottom: 24 }}
          />

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {[0, 1].map(i => (
              <StepDot key={i} active={step === i} done={step > i} />
            ))}
          </div>

          {/* Step title */}
          {step < 2 && (
            <>
              <h1 style={{
                fontSize: 24, fontWeight: 900, color: '#e2e8f0',
                margin: '0 0 6px', letterSpacing: '-0.02em',
              }}>
                {step === 0 ? 'Choose your language' : 'Hardware preferences'}
              </h1>
              <p style={{ fontSize: 13, color: '#475569', margin: '0 0 28px', lineHeight: 1.6 }}>
                {step === 0
                  ? 'ZaraForge will use this throughout the app. You can change it later in Settings.'
                  : 'Tune performance to match your hardware. These settings are saved to your machine.'}
              </p>
            </>
          )}
        </div>

        {/* ── Step 0: Language selection ──────────────────────────────────── */}
        {step === 0 && (
          <div style={{ padding: '0 36px 32px' }}>
            <div style={{
              position: 'relative',
              background: '#0c0c1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <select
                value={lang}
                onChange={e => setLang(e.target.value)}
                style={{
                  width: '100%', padding: '14px 40px 14px 16px',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#e2e8f0', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', appearance: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} style={{ background: '#0c0c1a', color: '#e2e8f0' }}>
                    {l.label} — {l.native}
                  </option>
                ))}
              </select>
              {/* chevron */}
              <div style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#475569', pointerEvents: 'none', fontSize: 14,
              }}>
                ›
              </div>
            </div>

            {/* Language preview chip */}
            <div style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <span style={{ fontSize: 16 }}>🌐</span>
              <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>
                {LANGUAGES.find(l => l.code === lang)?.native ?? 'English'} selected
              </span>
            </div>

            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%', marginTop: 24, padding: '13px 0',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontSize: 14, fontWeight: 800,
                fontFamily: 'inherit',
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 1: Hardware preferences ────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: '0 36px 32px' }}>

            {/* GPU acceleration toggle */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              background: hwAccel ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${hwAccel ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
              marginBottom: 12,
              transition: 'all 0.3s',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>
                    Hardware Acceleration
                  </span>
                  {hwAccel && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: '#00e5ff',
                      background: 'rgba(0,229,255,0.1)', padding: '2px 6px',
                      borderRadius: 4, textTransform: 'uppercase',
                    }}>Recommended</span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.55 }}>
                  Uses your dedicated GPU for AI model inference, video rendering, and real-time
                  effects. Disable only if you experience visual glitches.
                </p>
                {hwAccel && platform === 'darwin' && (
                  <p style={{ fontSize: 11, color: '#00e5ff', margin: '6px 0 0', fontWeight: 700 }}>
                    Metal API enabled · Apple GPU optimised
                  </p>
                )}
                {hwAccel && platform === 'win32' && (
                  <p style={{ fontSize: 11, color: '#a78bfa', margin: '6px 0 0', fontWeight: 700 }}>
                    DirectX 11 · DXVA2 acceleration active
                  </p>
                )}
              </div>
              <Toggle on={hwAccel} onChange={setHwAccel} />
            </div>

            {/* Platform note */}
            {isDesktop && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                fontSize: 11, color: '#334155', lineHeight: 1.5,
              }}>
                🖥️ Detected:{' '}
                <span style={{ color: '#475569', fontWeight: 700 }}>
                  {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform}
                  {' · '}
                  {window.zaraforge?.platform?.arch ?? 'x64'}
                  {' · '}
                  {window.zaraforge?.platform?.locale ?? 'en-US'}
                </span>
              </div>
            )}

            {/* Footer note */}
            <p style={{ fontSize: 11, color: '#1e293b', margin: '0 0 16px', lineHeight: 1.5 }}>
              These preferences are saved to your machine via electron-store and applied on every boot.
              You can change them at any time in Settings → Hardware.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(0)}
                style={{
                  padding: '12px 20px', borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#475569', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                ← Back
              </button>
              <button
                onClick={handleLaunch}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 800,
                  background: 'linear-gradient(135deg, #00e5ff, #6366f1)',
                  color: '#02020a', fontFamily: 'inherit',
                  boxShadow: '0 8px 24px rgba(0,229,255,0.3)',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Launch ZaraForge →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Launching ────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{
            padding: '20px 36px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            {/* Spinner */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid #111118',
              borderTopColor: '#00e5ff',
              animation: 'fbSpin 0.9s linear infinite',
            }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', margin: '0 0 6px' }}>
                Setting up your workspace…
              </p>
              <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                Applying your preferences and loading ZaraForge
              </p>
            </div>
            {/* Pref summary */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {[
                { icon: '🌐', label: LANGUAGES.find(l => l.code === lang)?.label ?? 'English' },
                { icon: '⚡', label: hwAccel ? 'GPU Acceleration ON' : 'Software rendering' },
              ].map(p => (
                <span key={p.label} style={{
                  fontSize: 11, fontWeight: 700, color: '#475569',
                  padding: '4px 10px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fbFadeIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px) }
          to   { opacity: 1; transform: scale(1)    translateY(0)     }
        }
        @keyframes fbSpin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}
