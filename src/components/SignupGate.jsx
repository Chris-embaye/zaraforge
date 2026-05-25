import { useState, useEffect } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useAuthStore }    from '../store/authStore'
import { useTranslation }  from '../i18n'

// ── Blurred app preview mockup ────────────────────────────────────────────────
function AppPreviewMockup() {
  return (
    <div style={{
      position: 'relative', flex: 1, overflow: 'hidden',
      borderRadius: 16, background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Blurred layout skeleton */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(3px)', opacity: 0.45, padding: 16 }}>
        {/* Navbar */}
        <div style={{ height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.4)', marginBottom: 12 }} />
        {/* Hero */}
        <div style={{ height: 90, borderRadius: 10, background: 'rgba(139,92,246,0.3)', marginBottom: 10 }} />
        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 60, borderRadius: 8, background: 'rgba(99,102,241,0.2)' }} />
          ))}
        </div>
        {/* Pricing row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[1,2].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 8, background: 'rgba(168,85,247,0.2)' }} />
          ))}
        </div>
        {/* CTA bar */}
        <div style={{ height: 44, borderRadius: 8, background: 'rgba(99,102,241,0.35)' }} />
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(4,4,20,0.72) 0%, rgba(8,8,30,0.85) 100%)',
        backdropFilter: 'blur(2px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 28, textAlign: 'center',
      }}>
        {/* Pulsing lock */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', marginBottom: 20,
          background: 'rgba(99,102,241,0.15)',
          border: '1.5px solid rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sgPulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 22 }}>🔒</span>
        </div>

        <p style={{
          fontSize: 14, fontWeight: 800, color: '#e2e8f0',
          letterSpacing: '0.01em', marginBottom: 10, lineHeight: 1.35,
        }}>
          Your app is 40% assembled
        </p>
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, marginBottom: 24, maxWidth: 220,
        }}>
          AI is currently setting up your database and server scripts… Complete registration to unlock.
        </p>

        {/* Pending task pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 260 }}>
          {[
            { icon: '🗄️', label: 'PostgreSQL schema layers', idx: 3 },
            { icon: '⚙️', label: 'Microservice functions', idx: 4 },
            { icon: '🚀', label: 'CDN deployment', idx: 5 },
          ].map((t) => (
            <div key={t.idx} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 11px', borderRadius: 9,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid rgba(99,102,241,0.4)',
                background: 'rgba(99,102,241,0.1)',
              }} />
              <span style={{ fontSize: 10, color: 'rgba(167,139,250,0.75)' }}>
                {t.icon} {t.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar — frozen at 40% */}
        <div style={{ width: '100%', maxWidth: 260, marginTop: 20 }}>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: '40%',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 8px rgba(99,102,241,0.5)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 9, color: '#334155' }}>2 of 5 milestones</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1' }}>40%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main SignupGate ───────────────────────────────────────────────────────────
export default function SignupGate() {
  const { resumeAfterSignup, onboardingStep } = useBuilderStore()
  const { user, login } = useAuthStore()
  const { t } = useTranslation()

  const [mode,     setMode]     = useState('signup')  // 'signup' | 'login'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [visible,  setVisible]  = useState(false)

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  // If user is already logged in when gate appears, skip it automatically
  useEffect(() => {
    if (user && onboardingStep === 'signup_gate') {
      resumeAfterSignup()
    }
  }, [user, onboardingStep, resumeAfterSignup])

  if (user && onboardingStep === 'signup_gate') return null

  const validate = () => {
    if (!email.trim()) { setError('Email is required.'); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return false }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return false }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return false }
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!validate() || loading) return
    setLoading(true)
    setTimeout(() => {
      const userData = {
        name:        mode === 'signup' ? name.trim() : email.split('@')[0],
        email:       email.trim(),
        initials:    (name.trim() || email)[0]?.toUpperCase() ?? 'U',
        avatarBg:    'rgba(99,102,241,0.15)',
        accentColor: '#6366f1',
        plan:        'Starter',
      }
      login(userData)
      setLoading(false)
      resumeAfterSignup()
    }, 1100)
  }

  const handleGoogle = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => {
      const userData = {
        name:        'Google User',
        email:       'user@gmail.com',
        initials:    'G',
        avatarBg:    'rgba(99,102,241,0.15)',
        accentColor: '#6366f1',
        plan:        'Starter',
      }
      login(userData)
      setLoading(false)
      resumeAfterSignup()
    }, 900)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,2,14,0.88)',
      backdropFilter: 'blur(18px)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>

      {/* Card */}
      <div style={{
        display: 'flex', width: '90%', maxWidth: 920, height: '86vh', maxHeight: 620,
        borderRadius: 22, overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.75)',
        border: '1px solid rgba(255,255,255,0.08)',
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(16px)',
        transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ── LEFT COLUMN — Form ── */}
        <div style={{
          flex: '0 0 420px', display: 'flex', flexDirection: 'column',
          background: '#07070f',
          padding: '36px 36px 28px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
        }}>

          {/* Logo + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#fff',
            }}>Z</div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>ZaraForge</span>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 6 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {mode === 'signup' ? t('signup_title') : t('login_title')}
            </p>
          </div>

          {/* Sub-badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 99, marginBottom: 24,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            width: 'fit-content',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
              animation: 'sgPulse 1.4s ease-in-out infinite', display: 'block', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: '#818cf8', fontWeight: 600, lineHeight: 1.3 }}>
              {mode === 'signup' ? t('signup_sub') : t('login_sub')}
            </span>
          </div>

          {/* Google OAuth button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 11, marginBottom: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
            {loading ? (
              <div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', animation: 'sgSpin 0.7s linear infinite' }} />
            ) : (
              <svg width="17" height="17" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.2-2.7-.5-4z" fill="#FFC107"/>
                <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.5 0-14 4.1-17.7 10.2-.7 1.1-1.3 2.3-1.7 3.5H6.3z" fill="#FF3D00"/>
                <path d="M24 45c5.5 0 10.5-1.9 14.3-5.1L31.7 34c-2.1 1.6-4.8 2.5-7.7 2.5-6 0-11.1-3.9-13-9.3l-7 5.4C7.5 40.7 15.3 45 24 45z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-.9 2.8-2.8 5.1-5.2 6.7l6.6 5.1C41.5 37 45 31.1 45 24c0-1.4-.2-2.7-.5-4z" fill="#1976D2"/>
              </svg>
            )}
            {t('signup_google')}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 10.5, color: '#374151', fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                  {t('signup_name')}
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="Alex Johnson"
                  style={{
                    width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                {t('signup_email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                {t('signup_password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Min. 6 characters"
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: 11, color: '#f87171', marginTop: -4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚠</span> {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 11, marginTop: 4,
                fontSize: 13.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', border: 'none',
                background: loading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'sgSpin 0.7s linear infinite' }} /> {t('common_loading')}</>
                : mode === 'signup' ? t('signup_cta_full') : t('login_cta_full')
              }
            </button>
          </form>

          {/* Mode toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button
              onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError('') }}
              style={{
                fontSize: 11, color: '#6366f1', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>
              {mode === 'signup' ? t('signup_to_login2') : t('signup_to_reg2')}
            </button>
          </div>

          {/* Terms */}
          {mode === 'signup' && (
            <p style={{ fontSize: 9.5, color: '#334155', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" target="_blank" style={{ color: '#6366f1', textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" style={{ color: '#6366f1', textDecoration: 'none' }}>Privacy Policy</a>.
            </p>
          )}
        </div>

        {/* ── RIGHT COLUMN — Preview ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(160deg, #050516 0%, #060620 50%, #04041a 100%)',
          padding: 24, gap: 0,
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Aurora gradient orbs */}
          <div style={{ position: 'absolute', top: -60, right: -40, width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16, position: 'relative' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b',
              animation: 'sgPulse 1.2s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Build paused at 40% — awaiting authentication
            </span>
          </div>

          <AppPreviewMockup />

          {/* Bottom note */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12 }}>🔐</span>
            <span style={{ fontSize: 10, color: '#475569', lineHeight: 1.5 }}>
              Your build is saved. Complete sign-up to resume Tasks 3–5 and receive your live deployment link.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sgSpin  { to { transform: rotate(360deg) } }
        @keyframes sgPulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
      `}</style>
    </div>
  )
}
