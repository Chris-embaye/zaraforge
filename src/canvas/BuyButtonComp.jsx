import { ShoppingCart, Zap, Lock } from 'lucide-react'

export default function BuyButtonComp({ props: p }) {
  const accent = p.accentColor || '#6366f1'
  const bg     = p.bgColor     || '#0f172a'

  return (
    <section style={{ background: bg, padding: '48px 24px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>

        {p.productName && (
          <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.productName}</p>
        )}

        {p.price && (
          <p style={{ color: '#f1f5f9', fontSize: 32, fontWeight: 900, marginBottom: 20, letterSpacing: '-0.02em' }}>
            {p.price}
            {p.currency && <span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>{p.currency}</span>}
          </p>
        )}

        {/* Buy button */}
        <button style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          color: '#fff', fontWeight: 700, fontSize: 15,
          boxShadow: `0 0 24px ${accent}50, 0 4px 20px rgba(0,0,0,0.3)`,
        }}>
          <ShoppingCart size={16} />
          {p.buttonText || 'Buy Now'}
        </button>

        {/* Trust badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Lock size={11} color="#475569" />
            <span style={{ color: '#475569', fontSize: 10 }}>Secure checkout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={11} color="#475569" />
            <span style={{ color: '#475569', fontSize: 10 }}>Powered by Stripe</span>
          </div>
        </div>

        {p.stripeProductId && (
          <p style={{ color: '#1e293b', fontSize: 9, marginTop: 10, fontFamily: 'monospace' }}>
            stripe:// {p.stripeProductId.slice(0, 24)}…
          </p>
        )}
      </div>
    </section>
  )
}
