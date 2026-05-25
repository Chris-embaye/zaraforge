import { useState, useRef, useEffect } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { getOwnerEmail } from '../admin/adminStore'

// ── Inline brand SVG icons (lucide has no OAuth logos) ────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

// ── Neon input field ─────────────────────────────────────────────────────────
function NeonInput({ icon: Icon, type = 'text', placeholder, value, onChange, rightEl }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      borderRadius: 10,
      background: '#0c0c1a',
      border: `1px solid ${focused ? 'rgba(0,229,255,0.45)' : '#1e293b'}`,
      boxShadow: focused ? '0 0 0 3px rgba(0,229,255,0.07)' : 'none',
      transition: 'all 0.2s',
    }}>
      {Icon && (
        <Icon size={13} style={{
          position: 'absolute', left: 12,
          color: focused ? '#00e5ff' : '#334155',
          transition: 'color 0.2s', flexShrink: 0,
        }} />
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: Icon ? '11px 12px 11px 34px' : '11px 12px',
          paddingRight: rightEl ? 40 : 12,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      />
      {rightEl && (
        <div style={{ position: 'absolute', right: 10 }}>
          {rightEl}
        </div>
      )}
    </div>
  )
}

// ── OAuth provider button ─────────────────────────────────────────────────────
function OAuthBtn({ icon, label, onClick, style: extraStyle }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '10px 16px', borderRadius: 10,
        background: hov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: hov ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.09)',
        cursor: 'pointer', transition: 'all 0.18s',
        fontSize: 13, fontWeight: 600, color: '#e2e8f0',
        fontFamily: 'inherit',
        ...extraStyle,
      }}>
      {icon}
      {label}
    </button>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', border: 'none', transition: 'all 0.2s',
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#e2e8f0' : '#475569',
        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
      }}>
      {label}
    </button>
  )
}

// ── Divider "or" ──────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
      <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>or</span>
      <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
    </div>
  )
}

// ── Mock user profiles for each OAuth provider ────────────────────────────────
const OAUTH_USERS = {
  google: {
    name: 'Chris Embaye', email: 'chris@zaraforge.app',
    initials: 'CE', accentColor: '#00e5ff', avatarBg: 'rgba(0,229,255,0.12)',
  },
  github: {
    name: 'Chris_E', email: 'chris@github.dev',
    initials: 'CE', accentColor: '#a78bfa', avatarBg: 'rgba(167,139,250,0.12)',
  },
}

// ── Main AuthModal ────────────────────────────────────────────────────────────
export default function AuthModal() {
  const { authTab, setAuthTab, setShowAuthModal, login } = useAuthStore()

  const [name,        setName]       = useState('')
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [confirm,     setConfirm]    = useState('')
  const [showPw,      setShowPw]     = useState(false)
  const [loading,     setLoading]    = useState(false)
  const [loadLabel,   setLoadLabel]  = useState('')
  const [error,       setError]      = useState('')
  const [step,        setStep]       = useState('auth')   // 'auth' | 'roleChoice'
  const [pendingUser, setPendingUser] = useState(null)

  const isLogin  = authTab === 'login'
  const modalRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowAuthModal(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setShowAuthModal])

  const simulateAuth = async (provider, userData) => {
    setError('')
    setLoading(true)
    setLoadLabel(`Authenticating with ${provider}…`)
    await new Promise(r => setTimeout(r, 1400))
    setLoadLabel('Fetching your workspace…')
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)

    if (userData.email === getOwnerEmail()) {
      setPendingUser(userData)
      setStep('roleChoice')
    } else {
      login(userData)
    }
  }

  const handleRoleChoice = (asAdmin) => {
    login(asAdmin ? { ...pendingUser, isAdmin: true } : pendingUser)
  }

  const handleOAuth = (provider) => {
    simulateAuth(provider, OAUTH_USERS[provider])
  }

  const handleEmailSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    if (!isLogin && password !== confirm)  { setError('Passwords do not match.'); return }
    const displayName = isLogin ? (email.split('@')[0]) : (name.trim() || email.split('@')[0])
    const initials = displayName.split(/[\s_-]/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    simulateAuth('Email', {
      name: displayName, email: email.trim(), initials,
      accentColor: '#00ff88', avatarBg: 'rgba(0,255,136,0.12)',
    })
  }

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPw(v => !v)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 2 }}>
      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
    </button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,2,10,0.88)',
      backdropFilter: 'blur(8px)',
      padding: 16,
    }}
      onClick={e => { if (e.target === e.currentTarget) setShowAuthModal(false) }}>

      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: 420,
          background: '#080814',
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid rgba(0,229,255,0.14)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 0 80px rgba(0,229,255,0.07), 0 40px 80px rgba(0,0,0,0.8)',
        }}>

        {/* ── Header ── */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid #111118',
          background: '#060610',
          position: 'relative',
        }}>
          {/* Close */}
          <button
            onClick={() => setShowAuthModal(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#334155', padding: 4, borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
            <X size={16} />
          </button>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.22)',
              boxShadow: '0 0 16px rgba(0,229,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src="/zaraforge-logo.png" alt="ZaraForge"
                style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{
                fontSize: 15, fontWeight: 800,
                background: 'linear-gradient(90deg, #ffffff 0%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                ZaraForge Passport
              </p>
              <p style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>
                Your universal creative workspace account
              </p>
            </div>
          </div>

          {/* Tab switcher — hidden on role choice step */}
          {step === 'auth' && (
            <div style={{
              display: 'flex', gap: 4, padding: 4, borderRadius: 10,
              background: '#0c0c1a', border: '1px solid #1a1a2e',
            }}>
              <Tab label="Welcome Back"    active={isLogin}   onClick={() => { setAuthTab('login');  setError('') }} />
              <Tab label="Create Account"  active={!isLogin}  onClick={() => { setAuthTab('signup'); setError('') }} />
            </div>
          )}
        </div>

        {/* ── Role choice step (owner only) ── */}
        {step === 'roleChoice' && (
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👑</div>
              <p style={{
                fontSize: 16, fontWeight: 800, margin: '0 0 6px',
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Owner Account Detected
              </p>
              <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                Welcome back, {pendingUser?.name?.split(' ')[0]}. How would you like to continue?
              </p>
            </div>

            <button
              onClick={() => handleRoleChoice(true)}
              style={{
                padding: '16px 20px', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)',
                background: 'rgba(245,158,11,0.07)', fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.14)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.65)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.07)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', marginBottom: 3 }}>
                👑 Continue as Admin
              </div>
              <div style={{ fontSize: 11, color: '#78350f', fontWeight: 500 }}>
                Access the Executive Command Center
              </div>
            </button>

            <button
              onClick={() => handleRoleChoice(false)}
              style={{
                padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)',
                fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                Continue as Regular User
              </div>
              <div style={{ fontSize: 11, color: '#334155', fontWeight: 500, marginTop: 2 }}>
                Use ZaraForge like any other creator
              </div>
            </button>

            <button
              onClick={() => { setStep('auth'); setPendingUser(null) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#334155',
                fontSize: 11, fontFamily: 'inherit', marginTop: 4, textAlign: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Body ── */}
        {step === 'auth' && <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OAuthBtn
              icon={<GoogleIcon />}
              label={`Continue with Google`}
              onClick={() => handleOAuth('google')}
            />
            <OAuthBtn
              icon={<GitHubIcon />}
              label={`Continue with GitHub`}
              onClick={() => handleOAuth('github')}
            />
          </div>

          <OrDivider />

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isLogin && (
              <NeonInput
                icon={User}
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            )}

            <NeonInput
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <NeonInput
              icon={Lock}
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              rightEl={eyeBtn}
            />

            {!isLogin && (
              <NeonInput
                icon={Lock}
                type={showPw ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            )}

            {isLogin && (
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: '#475569', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#00e5ff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <p style={{
                fontSize: 12, color: '#f87171',
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                fontSize: 13, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                border: 'none', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1 0%, #00e5ff 100%)',
                color: '#ffffff',
                boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.4)',
                opacity: loading ? 0.8 : 1,
              }}>
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{loadLabel}</>
                : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={14} /></>
              }
            </button>
          </form>

          {/* Switch tab hint */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#334155' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setAuthTab(isLogin ? 'signup' : 'login'); setError('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#00e5ff', fontWeight: 700, fontFamily: 'inherit',
              }}>
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {/* Terms (signup only) */}
          {!isLogin && (
            <p style={{ textAlign: 'center', fontSize: 10.5, color: '#1e293b', lineHeight: 1.5 }}>
              By creating an account you agree to ZaraForge's{' '}
              <span style={{ color: '#334155' }}>Terms of Service</span> and{' '}
              <span style={{ color: '#334155' }}>Privacy Policy</span>.
            </p>
          )}
        </div>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
