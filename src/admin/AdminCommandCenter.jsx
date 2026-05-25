import { useState } from 'react'
import { useAdminStore, isAdminUser, getOwnerEmail }           from './adminStore'
import { useAuthStore }                                        from '../store/authStore'
import { useBuilderStore }                                     from '../store/builderStore'
import { DatabaseSection, GatewaySection, ProtectionSection, CommsSection } from './AdminPanelsExtra'
import AdminBudgetGuard  from './AdminBudgetGuard'
import AdminTOTPGate     from './AdminTOTPGate'
import { CopySection, RevenueSection, PixelSection } from './AdminMarketingOps'
import AdminLocalePanel  from './AdminLocalePanel'
import InviteCrewModal  from './InviteCrewModal'

// ── Palette ───────────────────────────────────────────────────────────────────
const GOLD   = '#f59e0b'
const GOLD2  = '#fbbf24'
const BG     = '#04040d'
const PANEL  = '#08080f'
const PANEL2 = '#0d0d1a'
const BORDER = 'rgba(255,255,255,0.07)'

// ── Nav sections ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'metrics',    label: 'Metrics',     emoji: '📊' },
  { id: 'protection', label: 'Protection',  emoji: '⚠️' },
  { id: 'database',   label: 'Database',    emoji: '🗄️' },
  { id: 'gateway',    label: 'AI Gateway',  emoji: '🤖' },
  { id: 'comms',      label: 'Comms Hub',   emoji: '💬' },
  { id: 'users',      label: 'Users',       emoji: '👥' },
  { id: 'features',   label: 'Features',    emoji: '⚡' },
  { id: 'pricing',    label: 'Pricing',     emoji: '💰' },
  { id: 'broadcast',  label: 'Broadcast',   emoji: '📢' },
  { id: 'budget',     label: 'Budget Guard',emoji: '🛡️' },
  { id: 'copy',       label: 'Copy Editor', emoji: '🖥️' },
  { id: 'monetize',   label: 'Monetization',emoji: '🏷️' },
  { id: 'pixels',     label: 'Pixel Tags',  emoji: '📈' },
  { id: 'locales',    label: 'Locales',     emoji: '🌐' },
  { id: 'auditlog',   label: 'Audit Log',   emoji: '🔒' },
  { id: 'account',   label: 'My Account',  emoji: '🔑' },
]

// ── Small sub-components ──────────────────────────────────────────────────────
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.02em' }}>
        {children}
      </h2>
      {sub && <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

function StatCard({ emoji, label, value, sub, trend, color = GOLD }) {
  return (
    <div style={{
      background: PANEL2,
      border: `1px solid ${BORDER}`,
      borderRadius: 14, padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -16, right: -16,
        fontSize: 56, opacity: 0.06, userSelect: 'none', pointerEvents: 'none',
      }}>{emoji}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {emoji}  {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {trend && <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 6px', borderRadius: 99 }}>{trend}</span>}
        {sub   && <span style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>{sub}</span>}
      </div>
    </div>
  )
}

function MetricsSection({ metrics }) {
  const fmt = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
  return (
    <div>
      <SectionTitle sub="Platform vitals · live data pipeline">Real-Time Platform Metrics</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard emoji="🧑‍🎨" label="Active Creators"  value={metrics.activeCreators.toLocaleString()} sub="all-time registered" trend="↑ 12% 7d" color={GOLD} />
        <StatCard emoji="⚡"   label="Live Sessions"    value={metrics.activeSessions.toLocaleString()} sub="right now"           trend="↑ 8% 1h"  color="#a78bfa" />
        <StatCard emoji="💵"   label="Monthly Revenue"  value={fmt(metrics.mrr)}                        sub={`ARR ${fmt(metrics.arr)}`} trend="↑ 6% MoM" color="#34d399" />
        <StatCard emoji="🛡️"   label="Infra Health"     value={`${metrics.infraHealth}%`}               sub={`${metrics.uptimeDays} day uptime`} color="#38bdf8" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard emoji="💾" label="Storage Used"    value={`${metrics.storageUsedGB} GB`} sub="this billing cycle" color="#f472b6" />
        <StatCard emoji="📡" label="API Calls Today" value={metrics.apiCallsToday.toLocaleString()} sub="24h window" trend="↑ 3.2%"   color="#fb923c" />
        <StatCard emoji="🌐" label="Avg Session"     value="18m 40s" sub="per creator session" trend="↑ 45s" color="#a3e635" />
      </div>

      {/* Tier breakdown bar */}
      <div style={{ marginTop: 24, background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          👑  Revenue Distribution by Tier
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
          <div style={{ flex: 6.2,  background: '#f59e0b', borderRadius: '99px 0 0 99px' }} />
          <div style={{ flex: 3.2,  background: '#6366f1' }} />
          <div style={{ flex: 0.6,  background: '#334155', borderRadius: '0 99px 99px 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 11, fontWeight: 600, color: '#64748b' }}>
          <span><span style={{ color: GOLD }}  >■</span>  Enterprise 62%  ($30.1K)</span>
          <span><span style={{ color: '#6366f1' }}>■</span>  Pro  32%  ($15.6K)</span>
          <span><span style={{ color: '#334155' }}>■</span>  Free  6%  ($2.9K)</span>
        </div>
      </div>
    </div>
  )
}

// ── Tier badge ────────────────────────────────────────────────────────────────
const TIER_COLOR = { free: '#475569', pro: '#6366f1', enterprise: GOLD }
function TierBadge({ tier }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '2px 7px', borderRadius: 99,
      color: TIER_COLOR[tier] ?? '#475569',
      background: `${TIER_COLOR[tier] ?? '#475569'}18`,
      border: `1px solid ${TIER_COLOR[tier] ?? '#475569'}44`,
    }}>{tier}</span>
  )
}

function UserRow({ u, onTier, onFreeze, onImpersonate }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? 'rgba(255,255,255,0.025)' : 'transparent', transition: 'background 0.15s' }}>
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${u.name.charCodeAt(0) * 12 % 360}, 55%, 20%)`,
            border: `1.5px solid hsl(${u.name.charCodeAt(0) * 12 % 360}, 55%, 40%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
            color: `hsl(${u.name.charCodeAt(0) * 12 % 360}, 60%, 70%)`,
          }}>
            {u.name.split(' ').map(w => w[0]).join('').slice(0,2)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{u.name}</div>
            <div style={{ fontSize: 10, color: '#475569' }}>{u.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '11px 14px' }}><TierBadge tier={u.tier} /></td>
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: u.status === 'active' ? '#34d399' : '#ef4444',
            boxShadow: u.status === 'active' ? '0 0 5px #34d399' : 'none',
          }} />
          <span style={{ fontSize: 11, color: u.status === 'active' ? '#34d399' : '#ef4444', fontWeight: 600 }}>
            {u.status === 'active' ? 'Active' : 'Frozen'}
          </span>
        </div>
      </td>
      <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>{u.sessions}</td>
      <td style={{ padding: '11px 14px', fontSize: 12, color: '#34d399', fontWeight: 700, textAlign: 'right' }}>
        {u.monthlyRev > 0 ? `$${u.monthlyRev}/mo` : '—'}
      </td>
      <td style={{ padding: '11px 14px', fontSize: 11, color: '#475569' }}>{u.lastSeen}</td>
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={u.tier}
            onChange={e => onTier(u.id, e.target.value)}
            style={{
              background: '#111120', border: `1px solid ${BORDER}`,
              color: '#94a3b8', fontSize: 10, borderRadius: 6, padding: '3px 6px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <ActionBtn color="#818cf8" onClick={() => onImpersonate(u.id)}>View As</ActionBtn>
          <ActionBtn color={u.status === 'active' ? '#f87171' : '#34d399'}
            onClick={() => u.status === 'active' ? onFreeze(u.id) : onFreeze(u.id + '__unfreeze')}>
            {u.status === 'active' ? 'Freeze' : 'Unfreeze'}
          </ActionBtn>
        </div>
      </td>
    </tr>
  )
}

function ActionBtn({ children, color = '#64748b', onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
        background: hov ? `${color}22` : 'transparent',
        border: `1px solid ${hov ? color : BORDER}`,
        color: hov ? color : '#475569', transition: 'all 0.15s', fontFamily: 'inherit',
      }}>
      {children}
    </button>
  )
}

function UsersSection({ users, userSearch, setUserSearch, changeTier, freezeAccount, unfreezeAccount, impersonateUser, impersonating, stopImpersonating }) {
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const handleFreeze = (rawId) => {
    if (rawId.endsWith('__unfreeze')) unfreezeAccount(rawId.replace('__unfreeze', ''))
    else freezeAccount(rawId)
  }

  return (
    <div>
      <SectionTitle sub={`${users.length} registered accounts · ${users.filter(u => u.status === 'active').length} active`}>
        Live User Orchestration
      </SectionTitle>

      {impersonating && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
          background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.3)',
          borderRadius: 10, marginBottom: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8' }}>
            👁  Viewing as: {impersonating.name} · {impersonating.email}
          </span>
          <button onClick={stopImpersonating} style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.35)',
            color: '#818cf8', cursor: 'pointer', fontFamily: 'inherit',
          }}>Stop Viewing</button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="🔍  Search by name or email…"
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 10, boxSizing: 'border-box',
            background: PANEL2, border: `1px solid ${BORDER}`,
            color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: PANEL2, borderBottom: `1px solid ${BORDER}` }}>
              {['User', 'Tier', 'Status', 'Sessions', 'Revenue', 'Last Seen', 'Actions'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: i >= 3 && i <= 4 ? 'center' : 'left',
                  fontSize: 10, fontWeight: 700, color: '#334155',
                  textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id}>
                <td colSpan={7} style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <UserRow
                        u={u}
                        onTier={changeTier}
                        onFreeze={handleFreeze}
                        onImpersonate={impersonateUser}
                      />
                    </tbody>
                  </table>
                  {i < filtered.length - 1 && (
                    <div style={{ height: 1, background: BORDER, marginLeft: 14, marginRight: 14 }} />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ToggleSwitch({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 20, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
        background: on ? GOLD : '#1e293b',
        border: `1px solid ${on ? GOLD : '#334155'}`,
        position: 'relative', transition: 'all 0.25s',
      }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: on ? '#04040d' : '#475569',
        transition: 'left 0.25s',
      }} />
    </div>
  )
}

function FeaturesSection({ features, toggleFeature }) {
  const keys = Object.keys(features)
  return (
    <div>
      <SectionTitle sub="Toggle platform capabilities in real time">Feature Flags & Module Control</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {keys.map(key => {
          const f = features[key]
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: PANEL2, border: `1px solid ${f.enabled ? `${GOLD}22` : BORDER}`,
              borderRadius: 12, padding: '14px 16px',
              transition: 'border-color 0.25s',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: f.enabled ? '#e2e8f0' : '#475569', marginBottom: 3, transition: 'color 0.2s' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>{f.description}</div>
              </div>
              <ToggleSwitch on={f.enabled} onChange={() => toggleFeature(key)} />
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: `1px solid rgba(245,158,11,0.15)`, borderRadius: 10 }}>
        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
          ⚠️  Disabling a feature applies globally to all accounts on the next request cycle.
        </span>
      </div>
    </div>
  )
}

function PriceInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111120', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px' }}>
      <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>$</span>
      <input
        type="number" min={0} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          color: '#e2e8f0', fontSize: 14, fontWeight: 800, width: 70,
          fontFamily: 'inherit',
        }}
      />
      <span style={{ fontSize: 10, color: '#334155' }}>/mo</span>
    </div>
  )
}

const PLAN_ACCENT = { free: '#475569', pro: '#6366f1', enterprise: GOLD }

function PricingSection({ pricing, updatePrice }) {
  return (
    <div>
      <SectionTitle sub="Live pricing manager — changes propagate to billing on next cycle">Pricing Configuration</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {Object.entries(pricing).map(([tier, plan]) => {
          const accent = PLAN_ACCENT[tier] ?? '#475569'
          return (
            <div key={tier} style={{
              background: PANEL2, borderRadius: 14, padding: '22px 20px',
              border: `1px solid ${accent}33`,
              boxShadow: `0 0 0 1px ${accent}11`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${accent}18`, border: `1px solid ${accent}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {tier === 'free' ? '🆓' : tier === 'pro' ? '⚡' : '👑'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: accent }}>{plan.name}</div>
                  <div style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>Plan Tier</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Monthly Price
                  </div>
                  <PriceInput value={plan.monthly} onChange={v => updatePrice(tier, 'monthly', v)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Annual Price
                  </div>
                  <PriceInput value={plan.annual} onChange={v => updatePrice(tier, 'annual', v)} />
                </div>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, marginTop: 4 }}>
                  Annual saves {plan.monthly > 0 && plan.annual > 0 ? `${Math.round((1 - plan.annual / plan.monthly) * 100)}%` : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer',
          background: `linear-gradient(135deg, ${GOLD}, #d97706)`,
          border: 'none', color: '#04040d', fontFamily: 'inherit',
          boxShadow: `0 4px 20px ${GOLD}44`,
        }}>
          Push Pricing Update →
        </button>
      </div>
    </div>
  )
}

const SEVERITY_OPTIONS = [
  { value: 'info',    label: 'ℹ️  Info',    color: '#3b82f6' },
  { value: 'warning', label: '⚠️  Warning', color: '#f59e0b' },
  { value: 'danger',  label: '🚨  Danger',  color: '#ef4444' },
  { value: 'success', label: '✅  Success', color: '#10b981' },
]

function BroadcastSection({ draft, setDraft, trigger, activeBroadcast, clearBroadcast }) {
  const charLimit = 180

  return (
    <div>
      <SectionTitle sub="Push a platform-wide banner alert to all active sessions">Global Broadcast Alert</SectionTitle>

      {activeBroadcast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', marginBottom: 20,
          background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>
              🔴  LIVE BROADCAST
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{activeBroadcast.message}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
              Severity: {activeBroadcast.severity} · Sent at {new Date(activeBroadcast.sentAt).toLocaleTimeString()}
            </div>
          </div>
          <button onClick={clearBroadcast} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171', fontFamily: 'inherit',
          }}>
            Cancel Broadcast
          </button>
        </div>
      )}

      <div style={{ background: PANEL2, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '22px 20px' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
            Message
          </label>
          <textarea
            placeholder="Enter your platform-wide alert message…"
            maxLength={charLimit}
            value={draft.message}
            onChange={e => setDraft('message', e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#111120', border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: '10px 14px', resize: 'none',
              color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit',
              outline: 'none', lineHeight: 1.5,
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 10, color: '#334155', marginTop: 4 }}>
            {draft.message.length} / {charLimit}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
              Severity
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDraft('severity', opt.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: draft.severity === opt.value ? `${opt.color}22` : 'transparent',
                    border: `1px solid ${draft.severity === opt.value ? opt.color : BORDER}`,
                    color: draft.severity === opt.value ? opt.color : '#475569',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
              Auto-dismiss (minutes)
            </label>
            <input
              type="number" min={1} max={1440} value={draft.duration}
              onChange={e => setDraft('duration', e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
                background: '#111120', border: `1px solid ${BORDER}`,
                color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          onClick={trigger}
          disabled={!draft.message.trim()}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: draft.message.trim() ? 'pointer' : 'not-allowed',
            background: draft.message.trim()
              ? `linear-gradient(135deg, #dc2626, #b91c1c)`
              : '#1e293b',
            border: 'none',
            color: draft.message.trim() ? '#fff' : '#334155',
            fontFamily: 'inherit',
            boxShadow: draft.message.trim() ? '0 4px 24px rgba(220,38,38,0.4)' : 'none',
            transition: 'all 0.2s',
            letterSpacing: '0.03em',
          }}>
          📢  FIRE GLOBAL BROADCAST
        </button>
      </div>
    </div>
  )
}

// ── Security Audit Log Section ────────────────────────────────────────────────
const ACTION_COLORS = {
  'user.tier_change':          '#818cf8',
  'user.account_freeze':       '#ef4444',
  'user.account_unfreeze':     '#34d399',
  'user.impersonation_start':  '#f472b6',
  'user.impersonation_stop':   '#94a3b8',
  'billing.price_update':      '#f59e0b',
  'billing.coupon_mint':       '#34d399',
  'billing.budget_cap_set':    '#f59e0b',
  'platform.feature_flag_toggle': '#00e5ff',
  'platform.maintenance_toggle':  '#ef4444',
  'platform.broadcast_fire':      '#f472b6',
  'database.cell_edit':           '#818cf8',
  'security.totp_verified':       '#34d399',
  'security.totp_failed':         '#ef4444',
  'security.rls_violation':       '#ef4444',
  'security.ip_blocked':          '#ef4444',
}

function AuditLogSection({ log }) {
  if (log.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155', fontSize: 13 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        No admin actions recorded yet this session.
      </div>
    )
  }
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: '0 0 4px' }}>Security Audit Log</h2>
        <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
          Immutable record · {log.length} entries · non-alterable timestamps · identity-signed
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {log.map(entry => {
          const color = ACTION_COLORS[entry.action] ?? '#475569'
          return (
            <div key={entry.id} style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#08080f', border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: color,
                flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${color}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code style={{
                    fontSize: 10, fontWeight: 700, color, background: `${color}15`,
                    padding: '2px 7px', borderRadius: 5, border: `1px solid ${color}30`,
                  }}>{entry.action}</code>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{entry.actor}</span>
                  {Object.keys(entry.details).length > 0 && (
                    <span style={{ fontSize: 10, color: '#334155' }}>
                      {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: 9, color: '#1e293b', marginTop: 2 }}>
                  {entry.sessionId?.slice(0, 8)}…
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Account / Credentials Section ────────────────────────────────────────────
function AccountSection({ user, updateUser }) {
  const [newEmail,    setNewEmail]    = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')

  const handleSave = () => {
    setError('')
    if (newPassword && newPassword !== confirmPw) {
      setError('Passwords do not match.')
      return
    }
    if (newEmail && newEmail !== user?.email) {
      localStorage.setItem('zf-owner-email', newEmail)
      updateUser({ email: newEmail })
    }
    if (newPassword) {
      localStorage.setItem('zf-owner-password', newPassword)
    }
    setSaved(true)
    setNewPassword('')
    setConfirmPw('')
    setTimeout(() => setSaved(false), 3000)
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 10,
    background: '#111120', border: `1px solid rgba(255,255,255,0.07)`,
    color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    display: 'block', marginBottom: 8,
  }

  const savedPw = localStorage.getItem('zf-owner-password')

  return (
    <div>
      <SectionTitle sub="Update your owner login credentials — changes persist across sessions">My Account</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 720 }}>

        {/* Email card */}
        <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '22px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 18 }}>
            📧 Login Email
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Current Email</label>
            <div style={{
              padding: '10px 14px', borderRadius: 10, background: '#0c0c1a',
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: 13, color: '#475569', fontFamily: 'monospace',
            }}>
              {user?.email}
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Enter new email…"
              style={fieldStyle}
            />
          </div>
        </div>

        {/* Password card */}
        <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '22px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 18 }}>
            🔒 Password
          </div>
          {savedPw && (
            <div style={{
              fontSize: 11, color: '#34d399', marginBottom: 14,
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(52,211,153,0.07)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}>
              ✓ Password saved
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password…"
              style={fieldStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Confirm new password…"
              style={fieldStyle}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
            <span style={{ fontSize: 11, color: '#475569' }}>Show password</span>
          </label>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 10, maxWidth: 720,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontSize: 12, color: '#f87171',
        }}>{error}</div>
      )}

      {saved && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 10, maxWidth: 720,
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
          fontSize: 12, color: '#34d399', fontWeight: 700,
        }}>✓ Credentials saved — takes effect on next login</div>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={handleSave}
          style={{
            padding: '11px 28px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #d97706)`,
            border: 'none', color: '#04040d', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${GOLD}44`,
          }}>
          Save Credentials →
        </button>
      </div>
    </div>
  )
}

// ── Access denied screen ──────────────────────────────────────────────────────
function AccessDenied({ goBack }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, background: BG,
    }}>
      <div style={{ fontSize: 56 }}>🚫</div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', margin: '0 0 8px' }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          This area is restricted to platform administrators only.
        </p>
      </div>
      <button
        onClick={goBack}
        style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
          color: '#94a3b8', fontFamily: 'inherit',
        }}>
        ← Back to Builder
      </button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdminCommandCenter() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { user, updateUser } = useAuthStore()
  const { setAppMode } = useBuilderStore()
  const {
    metrics, users, userSearch, setUserSearch,
    changeTier, freezeAccount, unfreezeAccount, impersonateUser, impersonating, stopImpersonating,
    features, toggleFeature,
    pricing, updatePrice,
    broadcastDraft, setBroadcastDraft, triggerBroadcast, activeBroadcast, clearBroadcast,
    maintenanceMode, tickets,
    adminSection, setAdminSection,
    totpVerified, securityAuditLog,
  } = useAdminStore()

  if (!isAdminUser(user)) {
    return <AccessDenied goBack={() => setAppMode('builder')} />
  }

  if (!totpVerified) {
    return <AdminTOTPGate />
  }

  const openTicketCount = tickets.filter(t => t.status === 'open').length

  // Bind user (actor) into all audited actions so sections never accidentally
  // receive a click Event object as the actor argument.
  const a = {
    changeTier:      (id, tier)   => changeTier(id, tier, user),
    freezeAccount:   (id)         => freezeAccount(id, user),
    unfreezeAccount: (id)         => unfreezeAccount(id, user),
    impersonateUser: (id)         => impersonateUser(id, user),
    stopImpersonating:()          => stopImpersonating(user),
    toggleFeature:   (key)        => toggleFeature(key, user),
    updatePrice:     (t, f, v)    => updatePrice(t, f, v, user),
    triggerBroadcast:()           => triggerBroadcast(user),
    clearBroadcast:  ()           => clearBroadcast(user),
  }

  const sections = {
    metrics:    <MetricsSection metrics={metrics} />,
    protection: <ProtectionSection />,
    database:   <DatabaseSection />,
    gateway:    <GatewaySection />,
    comms:      <CommsSection />,
    users:      <UsersSection
                  users={users} userSearch={userSearch} setUserSearch={setUserSearch}
                  changeTier={a.changeTier} freezeAccount={a.freezeAccount} unfreezeAccount={a.unfreezeAccount}
                  impersonateUser={a.impersonateUser} impersonating={impersonating} stopImpersonating={a.stopImpersonating}
                />,
    features:   <FeaturesSection features={features} toggleFeature={a.toggleFeature} />,
    pricing:    <PricingSection pricing={pricing} updatePrice={a.updatePrice} />,
    broadcast:  <BroadcastSection
                  draft={broadcastDraft} setDraft={setBroadcastDraft}
                  trigger={a.triggerBroadcast} activeBroadcast={activeBroadcast} clearBroadcast={a.clearBroadcast}
                />,
    budget:     <AdminBudgetGuard />,
    copy:       <CopySection />,
    monetize:   <RevenueSection />,
    pixels:     <PixelSection />,
    locales:    <AdminLocalePanel />,
    auditlog:   <AuditLogSection log={securityAuditLog} />,
    account:    <AccountSection user={user} updateUser={updateUser} />,
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: BG, overflow: 'hidden' }}>

      {/* ── Left nav sidebar ────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: PANEL, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
        padding: '20px 12px',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24, paddingLeft: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>👑</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: '-0.01em' }}>
              Executive Command
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 600, paddingLeft: 26 }}>
            God-Mode Active
          </div>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => {
            const active = adminSection === n.id
            const hasDot = (n.id === 'protection' && maintenanceMode) ||
                           (n.id === 'comms' && openTicketCount > 0)
            const dotColor = n.id === 'protection' ? '#ef4444' : '#f87171'
            return (
              <button
                key={n.id}
                onClick={() => setAdminSection(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, border: 'none', textAlign: 'left',
                  background: active ? `${GOLD}18` : 'transparent',
                  color: active ? GOLD : '#475569',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
                  borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
                }}>
                <span style={{ fontSize: 14 }}>{n.emoji}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {hasDot && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: dotColor, boxShadow: `0 0 5px ${dotColor}`,
                    animation: 'navDotPulse 1.5s ease-in-out infinite',
                  }} />
                )}
                {n.id === 'comms' && openTicketCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, minWidth: 18, height: 18,
                    borderRadius: 99, background: '#ef4444', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {openTicketCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Spacer + actions */}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <div style={{ height: 1, background: BORDER, marginBottom: 12 }} />

          {/* Invite Crew */}
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
              background: 'rgba(167,139,250,0.07)',
              border: '1px solid rgba(167,139,250,0.18)',
              color: '#a78bfa',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 11,
              marginBottom: 6, transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(167,139,250,0.14)'
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(167,139,250,0.07)'
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.18)'
            }}>
            🔑 Invite Crew
          </button>

          <button
            onClick={() => setAppMode('builder')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
              background: 'transparent', color: '#334155',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 11,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
            ← Exit Command Center
          </button>
        </div>

        {/* Invite Crew Modal */}
        {showInviteModal && <InviteCrewModal onClose={() => setShowInviteModal(false)} />}
      </div>

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Maintenance mode alert bar */}
        {maintenanceMode && (
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px',
            background: 'rgba(239,68,68,0.1)',
            borderBottom: '1px solid rgba(239,68,68,0.25)',
          }}>
            <span style={{ fontSize: 12, animation: 'navDotPulse 1s ease-in-out infinite' }}>🛑</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#f87171' }}>
              MAINTENANCE MODE ACTIVE — All public routes frozen · Admin access only
            </span>
            <button
              onClick={() => setAdminSection('protection')}
              style={{
                marginLeft: 'auto', padding: '4px 12px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#f87171', fontFamily: 'inherit',
              }}>
              Manage →
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
          {sections[adminSection]}
        </div>
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        textarea::placeholder { color: #334155; }
        input::placeholder { color: #334155; }
        @keyframes navDotPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
