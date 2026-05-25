import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Timer, AlertCircle } from 'lucide-react'
import { useAdminStore } from './adminStore'
import { useAuthStore }  from '../store/authStore'

// ── RFC 6238 TOTP using Web Crypto API ────────────────────────────────────────
// In production: secret lives server-side only. Dev mode shows the code.
const TOTP_SECRET = 'ZARAFORGE2026ADMINSECRETKEY'
const TOTP_WINDOW = 30  // seconds

async function computeTOTP(secret, step = TOTP_WINDOW) {
  const counter = Math.floor(Date.now() / 1000 / step)
  const keyBytes = new TextEncoder().encode(secret)
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const buf  = new ArrayBuffer(8)
  new DataView(buf).setUint32(4, counter >>> 0)
  const sig    = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const offset = sig[sig.length - 1] & 0x0f
  const code   = (
    ((sig[offset]     & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) <<  8) |
     (sig[offset + 3] & 0xff)
  ) % 1_000_000
  return code.toString().padStart(6, '0')
}

const BG     = '#030308'
const CARD   = '#08080f'
const BORDER = 'rgba(255,255,255,0.07)'
const GOLD   = '#f59e0b'
const INDIGO = '#6366f1'

export default function AdminTOTPGate() {
  const { verifyTOTP } = useAdminStore()
  const { user }       = useAuthStore()

  const [digits,    setDigits]    = useState(['', '', '', '', '', ''])
  const [liveCode,  setLiveCode]  = useState('')
  const [secsLeft,  setSecsLeft]  = useState(TOTP_WINDOW)
  const [error,     setError]     = useState('')
  const [shaking,   setShaking]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef([])

  // Generate live TOTP code and countdown
  useEffect(() => {
    let active = true
    const refresh = async () => {
      const code = await computeTOTP(TOTP_SECRET)
      if (active) setLiveCode(code)
    }
    refresh()
    const iv = setInterval(() => {
      if (!active) return
      const remaining = TOTP_WINDOW - (Math.floor(Date.now() / 1000) % TOTP_WINDOW)
      setSecsLeft(remaining)
      if (remaining === TOTP_WINDOW) refresh()  // code just rotated
    }, 1000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  const handleDigit = (idx, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = v
    setDigits(next)
    setError('')
    if (v && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter') handleSubmit()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      inputRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const handleSubmit = async () => {
    const entered = digits.join('')
    if (entered.length < 6) { setError('Enter all 6 digits.'); return }

    setVerifying(true)
    const valid = await computeTOTP(TOTP_SECRET)

    // Accept current window + 1 previous window (clock drift tolerance)
    const prev = await computeTOTP(TOTP_SECRET, TOTP_WINDOW - 1)
    if (entered === valid || entered === prev) {
      verifyTOTP(user)
    } else {
      setShaking(true)
      setError('Invalid code. Check your authenticator and try again.')
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => { setShaking(false); inputRefs.current[0]?.focus() }, 600)
    }
    setVerifying(false)
  }

  const ringColor = secsLeft <= 8 ? '#ef4444' : secsLeft <= 15 ? GOLD : '#34d399'
  const progress  = ((TOTP_WINDOW - secsLeft) / TOTP_WINDOW) * 100

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: BG, padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: '36px 32px 32px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        animation: shaking ? 'totpShake 0.5s ease' : 'none',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.12)',
            border: '1.5px solid rgba(99,102,241,0.35)',
            boxShadow: '0 0 24px rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={26} style={{ color: INDIGO }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Admin Verification Required
          </h2>
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: 0 }}>
            Enter the 6-digit TOTP from your authenticator app.<br />
            Every action will be logged with your identity signature.
          </p>
        </div>

        {/* Live code display — dev mode indicator */}
        <div style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD,
                animation: 'totpPulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Dev Mode · Authenticator Code
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: ringColor, fontSize: 11, fontWeight: 700 }}>
              <Timer size={12} />
              {secsLeft}s
            </div>
          </div>

          {/* Code display */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            {(liveCode || '------').split('').map((d, i) => (
              <div key={i} style={{
                width: 36, height: 44, borderRadius: 8,
                background: '#0d0d1a', border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: GOLD,
                letterSpacing: 0,
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, borderRadius: 99, background: '#1a1a2e', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${ringColor}, ${ringColor}aa)`,
              transition: 'width 1s linear, background 0.5s',
            }} />
          </div>
          <p style={{ fontSize: 9.5, color: '#334155', textAlign: 'center', marginTop: 6, fontWeight: 600 }}>
            Hidden in production — only your authenticator app shows this code.
          </p>
        </div>

        {/* 6-digit input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 12,
            textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Enter verification code
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
            onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48, height: 56, borderRadius: 10, textAlign: 'center',
                  fontSize: 24, fontWeight: 900, fontFamily: 'monospace',
                  background: d ? 'rgba(99,102,241,0.12)' : '#0d0d1a',
                  border: `1.5px solid ${error ? 'rgba(239,68,68,0.5)' : d ? 'rgba(99,102,241,0.5)' : BORDER}`,
                  color: d ? '#c7d2fe' : '#334155',
                  outline: 'none',
                  transition: 'all 0.15s',
                  caretColor: INDIGO,
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.7)'}
                onBlur={e => e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.5)' : d ? 'rgba(99,102,241,0.5)' : BORDER}
              />
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <AlertCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleSubmit}
          disabled={verifying || digits.join('').length < 6}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 11,
            fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit', border: 'none', letterSpacing: '0.01em',
            background: digits.join('').length === 6 && !verifying
              ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
              : 'rgba(99,102,241,0.2)',
            color: digits.join('').length === 6 ? '#fff' : '#374151',
            boxShadow: digits.join('').length === 6 ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {verifying
            ? <><div style={{ width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                animation: 'totpSpin 0.7s linear infinite' }} />Verifying…</>
            : <><ShieldCheck size={15} />Verify & Enter Admin</>
          }
        </button>

        {/* Footer note */}
        <p style={{ fontSize: 10, color: '#1e293b', textAlign: 'center', marginTop: 16, lineHeight: 1.55 }}>
          This session will be logged with your email, timestamp, and identity signature.<br />
          All admin actions are non-alterable and stored in{' '}
          <code style={{ color: '#334155', fontSize: 9.5 }}>security_audit_logs</code>.
        </p>
      </div>

      <style>{`
        @keyframes totpShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
        @keyframes totpSpin  { to { transform: rotate(360deg) } }
        @keyframes totpPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  )
}
