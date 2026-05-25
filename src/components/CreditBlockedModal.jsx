import { useCreditGuardStore } from '../store/creditGuardStore'

const GOLD  = '#f59e0b'
const GOLD2 = '#fbbf24'

function GradientBorderBtn({ children, onClick, disabled }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: disabled
        ? 'transparent'
        : `linear-gradient(90deg, #10b981, #3b82f6, #6366f1, #10b981)`,
      backgroundSize: '300% auto',
      animation: disabled ? 'none' : 'cbBorderCycle 3s linear infinite',
      padding: 1.5, borderRadius: 12,
    }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '11px 28px', borderRadius: 11,
          fontSize: 13, fontWeight: 900, cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#1e293b' : '#04040d',
          border: 'none', color: disabled ? '#334155' : '#e2e8f0',
          fontFamily: 'inherit', letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}>
        {children}
      </button>
    </div>
  )
}

function ModalShell({ children, onDismiss }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onDismiss()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2,2,10,0.82)', backdropFilter: 'blur(14px)',
        animation: 'cbFadeIn 0.25s ease',
      }}>
      <div style={{
        width: 440, maxWidth: 'calc(100vw - 32px)',
        background: 'rgba(8,8,20,0.97)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 22,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        overflow: 'hidden',
        animation: 'cbSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes cbFadeIn    { from{opacity:0}                         to{opacity:1} }
        @keyframes cbSlideUp   { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cbBorderCycle { 0%{background-position:0%} 100%{background-position:300%} }
      `}</style>
    </div>
  )
}

// ── Daily limit reached ───────────────────────────────────────────────────────
function DailyLimitContent({ blocked, onDismiss }) {
  const pct = blocked.limit > 0 ? Math.min((blocked.spent / blocked.limit) * 100, 100) : 100
  const resetTime = blocked.resetAt ? new Date(blocked.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'midnight UTC'

  return (
    <>
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD}, #f97316, #dc2626)` }} />

      <div style={{ padding: '32px 32px 28px' }}>
        {/* Icon */}
        <div style={{
          width: 58, height: 58, borderRadius: 16, marginBottom: 20,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>⚡</div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Daily Limit Reached
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
          You've used all <strong style={{ color: '#94a3b8' }}>{blocked.limit} free generations</strong> for today.
          Your allowance resets at <strong style={{ color: '#94a3b8' }}>{resetTime}</strong>.
        </p>

        {/* Usage bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Daily Usage
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: GOLD }}>
              {blocked.spent} / {blocked.limit} used
            </span>
          </div>
          <div style={{ height: 6, background: '#111120', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${pct}%`,
              background: `linear-gradient(90deg, ${GOLD}, #ef4444)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Pro upsell card */}
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14, padding: '16px 18px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#818cf8', marginBottom: 6 }}>
            ⚡  Upgrade to Pro — Unlimited Generations
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['Unlimited daily AI generations', 'Priority render queue', 'All premium templates', 'Advanced video export'].map(item => (
              <li key={item} style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#34d399', fontSize: 10 }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: '#818cf8' }}>
            From $29/mo
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Maybe Later
          </button>
          <GradientBorderBtn onClick={onDismiss}>
            Upgrade to Pro →
          </GradientBorderBtn>
        </div>
      </div>
    </>
  )
}

// ── Stripe canceled ───────────────────────────────────────────────────────────
function StripeCanceledContent({ blocked, onDismiss }) {
  return (
    <>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #ef4444, #b91c1c)' }} />
      <div style={{ padding: '32px 32px 28px' }}>
        <div style={{
          width: 58, height: 58, borderRadius: 16, marginBottom: 20,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>🚫</div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Subscription Canceled
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
          Your <strong style={{ color: '#94a3b8' }}>{blocked.feature?.replace(/_/g, ' ')}</strong> access requires
          an active subscription. Your plan has been canceled and this feature is now locked.
        </p>

        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171' }}>What happened?</div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 }}>
            Your subscription was canceled. You can reactivate it at any time to regain full access.
            Your projects and data are safely preserved.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Dismiss
          </button>
          <GradientBorderBtn onClick={onDismiss}>
            Reactivate Subscription →
          </GradientBorderBtn>
        </div>
      </div>
    </>
  )
}

// ── Stripe past due ───────────────────────────────────────────────────────────
function StripePastDueContent({ blocked, onDismiss }) {
  return (
    <>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
      <div style={{ padding: '32px 32px 28px' }}>
        <div style={{
          width: 58, height: 58, borderRadius: 16, marginBottom: 20,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>⚠️</div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Payment Failed
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
          Your last payment for <strong style={{ color: '#94a3b8' }}>ZaraForge Pro</strong> didn't go through.
          Access to <strong style={{ color: '#94a3b8' }}>{blocked.feature?.replace(/_/g, ' ')}</strong> is
          temporarily suspended until your balance is cleared.
        </p>

        <div style={{
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: GOLD }}>Payment Status</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 700 }}>
              PAST DUE
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Update your payment method to restore access immediately. No data will be lost.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Dismiss
          </button>
          <GradientBorderBtn onClick={onDismiss}>
            Update Payment Method →
          </GradientBorderBtn>
        </div>
      </div>
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CreditBlockedModal() {
  const { blocked, dismissBlocked } = useCreditGuardStore()

  if (!blocked) return null

  return (
    <ModalShell onDismiss={dismissBlocked}>
      {blocked.reason === 'daily_limit'    && <DailyLimitContent    blocked={blocked} onDismiss={dismissBlocked} />}
      {blocked.reason === 'stripe_invalid' && <StripeCanceledContent blocked={blocked} onDismiss={dismissBlocked} />}
      {blocked.reason === 'stripe_past_due'&& <StripePastDueContent  blocked={blocked} onDismiss={dismissBlocked} />}
    </ModalShell>
  )
}
