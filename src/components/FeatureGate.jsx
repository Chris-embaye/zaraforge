import { Zap, Lock } from 'lucide-react'
import { useHeartbeatStore, FEATURES } from '../lib/security/heartbeat'

// ── FeatureGate ───────────────────────────────────────────────────────────────
// Wraps any premium component. If the server heartbeat hasn't granted the
// feature, shows a locked overlay instead of the real UI.
//
// Usage:
//   <FeatureGate feature={FEATURES.AI_MORPH}>
//     <GenreMorphModal />
//   </FeatureGate>

export default function FeatureGate({ feature, children, inline = false }) {
  const { hasFeature, status, plan } = useHeartbeatStore()

  // Dev bypass — when VITE_DEV_HEARTBEAT=bypass, all gates open
  if (import.meta.env.VITE_DEV_HEARTBEAT === 'bypass') return children

  const checking = status === 'checking' || status === 'idle'
  const granted  = hasFeature(feature)
  const locked   = status === 'locked'

  if (checking) {
    return inline
      ? <span style={{ opacity: 0.4, fontSize: 11, color: '#475569' }}>Verifying subscription…</span>
      : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: 80, gap: 8, color: '#334155', fontSize: 12,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%',
            border: '2px solid #1e293b', borderTopColor: '#6366f1',
            animation: 'fgSpin 0.8s linear infinite' }} />
          Verifying subscription…
          <style>{`@keyframes fgSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )
  }

  if (granted) return children

  // ── Locked overlay ────────────────────────────────────────────────────────
  const planLabel = plan === 'free' || !plan ? 'Pro' : 'Enterprise'
  const reason    = locked
    ? 'Subscription check failed. Check your connection.'
    : `Requires ${planLabel} plan.`

  if (inline) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: '#475569', cursor: 'not-allowed',
      }}>
        <Lock size={11} /> {reason}
      </span>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: 80 }}>
      {/* Blurred ghost of children */}
      <div style={{ filter: 'blur(5px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: 20,
        background: 'rgba(3,3,12,0.75)',
        backdropFilter: 'blur(4px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(99,102,241,0.12)',
          border: '1.5px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {locked ? <Lock size={18} style={{ color: '#ef4444' }} /> : <Zap size={18} style={{ color: '#6366f1' }} />}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', margin: '0 0 4px' }}>
            {locked ? 'Subscription Verification Failed' : `Upgrade to ${planLabel}`}
          </p>
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{reason}</p>
        </div>
        {!locked && (
          <a
            href="https://zaraforge.app/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}>
            View Plans →
          </a>
        )}
      </div>
    </div>
  )
}

export { FEATURES }
