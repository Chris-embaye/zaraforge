import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'

const MONTHLY_PRICE = 29
const ANNUAL_PRICE  = 199  // ~$16.58/mo
const STRIPE_MONTHLY = 'https://buy.stripe.com/6oU3cwa6T5gK3NeeOD3ZK01'
const STRIPE_ANNUAL  = 'https://buy.stripe.com/6oU3cwa6T5gK3NeeOD3ZK01' // update when annual link is created

const PRO_PERKS = [
  { icon: '🤖', text: 'Unlimited AI generations' },
  { icon: '📱', text: 'Live Device Mirror — real phone preview' },
  { icon: '♾️', text: 'Studio — unlimited tracks & projects' },
  { icon: '🎨', text: 'Advanced AI vector & logo tools' },
  { icon: '👥', text: 'Multiplayer collaboration' },
  { icon: '🌐', text: 'Custom domain + priority hosting' },
  { icon: '🕐', text: 'Full version history & restore' },
  { icon: '⚡', text: 'Priority support' },
]

// reason: 'gen_limit' | 'phone_mirror' | 'feature'
export default function ProUpgradeGate({ reason = 'gen_limit', onClose }) {
  const [billing, setBilling] = useState('monthly')
  const { resetProGate } = useBuilderStore()

  const price  = billing === 'annual' ? ANNUAL_PRICE  : MONTHLY_PRICE
  const period = billing === 'annual' ? '/year'        : '/month'
  const perMo  = billing === 'annual' ? Math.round(ANNUAL_PRICE / 12) : MONTHLY_PRICE
  const stripe = billing === 'annual' ? STRIPE_ANNUAL : STRIPE_MONTHLY

  const headline = reason === 'gen_limit'
    ? "You've used your 3 free generations"
    : reason === 'phone_mirror'
    ? 'Live Device Mirror is a Pro feature'
    : 'This is a Pro feature'

  const sub = reason === 'gen_limit'
    ? 'Upgrade to Pro to keep building without limits.'
    : reason === 'phone_mirror'
    ? 'Preview your canvas on a real phone in real time — upgrade to unlock.'
    : 'Unlock the full ZaraForge suite with Pro.'

  const handleUpgrade = () => {
    window.open(stripe, '_blank')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,2,14,0.9)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        width: '90%', maxWidth: 520,
        background: '#07070f',
        border: '1px solid rgba(16,185,129,0.22)',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 40px 120px rgba(0,0,0,0.8)',
        position: 'relative',
      }}>
        {/* Green glow top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 200,
          background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Optional close (only for feature gates, not gen_limit) */}
        {reason !== 'gen_limit' && onClose && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#334155', fontSize: 18, lineHeight: 1, padding: 4, zIndex: 1,
          }}>✕</button>
        )}

        <div style={{ padding: '36px 36px 32px', position: 'relative' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 13px', borderRadius: 99, marginBottom: 20,
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)',
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: '#34d399',
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
            ZaraForge Pro
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.025em', marginBottom: 8, lineHeight: 1.2 }}>
            {headline}
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, marginBottom: 28 }}>
            {sub}
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: 3, marginBottom: 24, width: 'fit-content',
          }}>
            {['monthly', 'annual'].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: billing === b ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: billing === b ? '#34d399' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === 'annual' && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}>SAVE 43%</span>
                )}
              </button>
            ))}
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1 }}>
              ${price}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', paddingBottom: 6 }}>{period}</span>
            {billing === 'annual' && (
              <span style={{ fontSize: 12, color: '#34d399', paddingBottom: 6, marginLeft: 4 }}>
                (${perMo}/mo)
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginBottom: 24 }}>
            {billing === 'annual' ? 'Billed annually · cancel anytime' : '7-day free trial · cancel anytime'}
          </p>

          {/* Perks grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 28,
          }}>
            {PRO_PERKS.map(p => (
              <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{p.icon}</span>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{p.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={handleUpgrade} style={{
            width: '100%', padding: '15px 0', borderRadius: 13, fontSize: 15, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#fff', boxShadow: '0 8px 32px rgba(16,185,129,0.38)',
            transition: 'all 0.2s', letterSpacing: '-0.01em',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(16,185,129,0.52)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.38)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            {billing === 'annual' ? `Get Pro — $${ANNUAL_PRICE}/year →` : 'Start 7-day free trial →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.18)', marginTop: 12 }}>
            Secure checkout via Stripe · No hidden fees
          </p>
        </div>
      </div>
    </div>
  )
}
