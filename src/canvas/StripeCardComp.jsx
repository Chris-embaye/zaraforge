import { CreditCard, Check, Zap } from 'lucide-react'

export default function StripeCardComp({ props: p }) {
  const bg     = p.bgColor     || '#0f172a'
  const accent = p.accentColor || '#6366f1'

  return (
    <section style={{ background: bg, padding: '64px 24px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{
          background:   p.highlighted ? `linear-gradient(135deg, ${accent}22, ${accent}08)` : 'rgba(255,255,255,0.04)',
          border:       `2px solid ${p.highlighted ? accent : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 20,
          padding:      32,
          position:     'relative',
          overflow:     'hidden',
          boxShadow:    p.highlighted ? `0 0 40px ${accent}20` : 'none',
        }}>
          {p.highlighted && (
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: accent, color: '#000', borderRadius: 20,
              fontSize: 10, fontWeight: 700, padding: '3px 10px', letterSpacing: '0.06em',
            }}>FEATURED</div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={16} color={accent} />
            </div>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>{p.productName || 'Pro Plan'}</p>
              <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{p.billingPeriod === 'one-time' ? 'One-time payment' : `Billed ${p.billingPeriod || 'monthly'}`}</p>
            </div>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
            <span style={{ color: '#f1f5f9', fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em' }}>{p.price || '$29'}</span>
            <span style={{ color: '#64748b', fontSize: 13 }}>/{p.billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
          </div>

          {/* Stripe badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.18)' }}>
            <Zap size={11} color="#a5b4fc" />
            <span style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 600 }}>AI-managed Stripe • webhooks auto-wired • PCI DSS compliant</span>
          </div>

          {/* CTA */}
          <button style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            color: '#fff', fontWeight: 700, fontSize: 14,
            boxShadow: `0 4px 20px ${accent}40`,
          }}>
            {p.ctaText || 'Get Started'}
          </button>

          {/* Stripe meta */}
          {p.stripeProductId && (
            <p style={{ textAlign: 'center', color: '#334155', fontSize: 9, marginTop: 12, fontFamily: 'monospace' }}>
              stripe:// {p.stripeProductId.slice(0, 20)}…
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
