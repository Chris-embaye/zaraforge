import { useState, useEffect } from 'react'
import { UserPlus, Copy, Check, Trash2, Clock, X, Shield } from 'lucide-react'
import { useAdminStore }    from './adminStore'
import { useAuthStore }     from '../store/authStore'
import { buildInviteURL, tokenTimeLeft } from '../lib/security/adminGateway'

// ── InviteCrewModal ───────────────────────────────────────────────────────────
// Generates single-use crew_<32hex> invite tokens (24 h TTL).
// Tokens are stored in adminStore.inviteTokens keyed by token string.

export default function InviteCrewModal({ onClose }) {
  const { user }       = useAuthStore()
  const { inviteTokens, addInviteToken, revokeInviteToken } = useAdminStore()
  const [copiedToken, setCopiedToken] = useState(null)
  const [tick, setTick]               = useState(0)

  // Refresh countdowns every 30 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  function handleGenerate() {
    addInviteToken(user)
  }

  function handleCopy(token) {
    const url = buildInviteURL(token)
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const tokenList = Object.values(inviteTokens).sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: 520, maxHeight: '80vh',
        background: '#080814',
        border: '1px solid rgba(167,139,250,0.22)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid #111118',
          background: '#060610',
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={14} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
              Invite Crew to Admin
            </p>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
              Single-use tokens · 24 h expiry · still requires TOTP
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '11px 0', borderRadius: 10, marginBottom: 20,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(167,139,250,0.18))',
              border: '1px solid rgba(167,139,250,0.35)',
              color: '#a78bfa', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(167,139,250,0.28))'
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.55)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(167,139,250,0.18))'
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'
            }}>
            <UserPlus size={14} />
            Generate Invite Token
          </button>

          {/* Token list */}
          {tokenList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 0', color: '#334155', fontSize: 13,
            }}>
              No tokens yet. Generate one above to invite a crew member.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tokenList.map(entry => {
                const expired  = Date.now() > entry.expiresAt
                const timeLeft = tokenTimeLeft(entry.expiresAt)
                const isCopied = copiedToken === entry.token

                return (
                  <div key={entry.token} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: expired || entry.used
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(167,139,250,0.04)',
                    border: `1px solid ${expired || entry.used ? '#111118' : 'rgba(167,139,250,0.15)'}`,
                    opacity: expired || entry.used ? 0.45 : 1,
                  }}>
                    {/* Token value */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <code style={{
                        flex: 1, fontSize: 10.5, color: '#a78bfa',
                        fontFamily: 'monospace', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.token}
                      </code>

                      {/* Status badge */}
                      {entry.used ? (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#6b7280',
                          background: '#111118', padding: '2px 6px', borderRadius: 4,
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>Used</span>
                      ) : expired ? (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#ef4444',
                          background: 'rgba(239,68,68,0.08)', padding: '2px 6px', borderRadius: 4,
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>Expired</span>
                      ) : (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#34d399',
                          background: 'rgba(52,211,153,0.08)', padding: '2px 6px', borderRadius: 4,
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>Active</span>
                      )}
                    </div>

                    {/* Meta + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={10} style={{ color: '#334155', flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, color: '#334155', flex: 1 }}>
                        {expired || entry.used ? 'Expired' : `Expires in ${timeLeft}`}
                        {' · '}by {entry.createdBy}
                      </span>

                      {/* Copy link */}
                      {!entry.used && !expired && (
                        <button
                          onClick={() => handleCopy(entry.token)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                            background: isCopied ? 'rgba(52,211,153,0.1)' : 'rgba(167,139,250,0.08)',
                            border: isCopied ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(167,139,250,0.2)',
                            color: isCopied ? '#34d399' : '#a78bfa',
                          }}>
                          {isCopied ? <Check size={9} /> : <Copy size={9} />}
                          {isCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                      )}

                      {/* Revoke */}
                      {!entry.used && !expired && (
                        <button
                          onClick={() => revokeInviteToken(entry.token, user)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                            background: 'transparent',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444',
                          }}>
                          <Trash2 size={9} />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid #111118',
          background: '#060610', flexShrink: 0,
        }}>
          <p style={{ fontSize: 10.5, color: '#334155', margin: 0, lineHeight: 1.5 }}>
            Invite links grant admin access for 24 h. Recipients still must pass TOTP verification.
            Tokens are single-use and invalidated after first access.
          </p>
        </div>
      </div>
    </div>
  )
}
