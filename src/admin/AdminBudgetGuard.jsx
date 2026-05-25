import { useState } from 'react'
import { useCreditGuardStore, FEATURE_COSTS, SERVICE_LABELS } from '../store/creditGuardStore'

const GOLD   = '#f59e0b'
const PANEL2 = '#0d0d1a'
const BORDER = 'rgba(255,255,255,0.07)'

// ── Shared sub-components ─────────────────────────────────────────────────────
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

function Label({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ── Budget gauge ──────────────────────────────────────────────────────────────
function BudgetGauge({ spentUSD, capUSD }) {
  const pct     = Math.min((spentUSD / capUSD) * 100, 100)
  const safe    = pct < 60
  const warn    = pct >= 60 && pct < 85
  const danger  = pct >= 85
  const color   = danger ? '#ef4444' : warn ? '#f59e0b' : '#34d399'
  const label   = danger ? 'CRITICAL' : warn ? 'WARNING' : 'HEALTHY'

  return (
    <div style={{
      background: PANEL2, border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : warn ? 'rgba(245,158,11,0.25)' : BORDER}`,
      borderRadius: 16, padding: '22px 24px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            🛡️  Monthly Budget Gauge
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-0.03em' }}>
            ${spentUSD.toFixed(2)} <span style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>/ ${capUSD}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 99,
            color, background: `${color}18`, border: `1px solid ${color}44`,
            letterSpacing: '0.1em',
          }}>{label}</span>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
            {(100 - pct).toFixed(1)}% remaining
          </div>
        </div>
      </div>

      {/* Arc-style progress bar */}
      <div style={{ position: 'relative', height: 10, background: '#111120', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 99,
          background: danger
            ? 'linear-gradient(90deg, #dc2626, #ef4444)'
            : warn
            ? 'linear-gradient(90deg, #d97706, #f59e0b)'
            : 'linear-gradient(90deg, #059669, #34d399)',
          transition: 'width 0.6s ease',
          boxShadow: `0 0 8px ${color}66`,
        }} />
        {/* Threshold markers */}
        <div style={{ position: 'absolute', left: '60%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', left: '85%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#334155', marginTop: 5, fontWeight: 600 }}>
        <span>$0</span>
        <span style={{ position: 'relative', left: '-20%' }}>60% warn</span>
        <span style={{ position: 'relative', left: '-10%' }}>85% alert</span>
        <span>${capUSD}</span>
      </div>
    </div>
  )
}

// ── Service spend breakdown ───────────────────────────────────────────────────
function ServiceBreakdown({ spentByService, callsThisMonth }) {
  const total = Object.values(spentByService).reduce((a, b) => a + b, 0) || 1
  const SVC_COLOR = { claude: '#818cf8', diffusion: '#34d399', logoAI: GOLD, videoRender: '#f472b6' }

  return (
    <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Label>API Spend by Service</Label>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
          {callsThisMonth.toLocaleString()} calls this month
        </span>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 1, marginBottom: 16 }}>
        {Object.entries(spentByService).map(([svc, amt]) => (
          <div key={svc} style={{
            flex: amt / total,
            background: SVC_COLOR[svc] ?? '#475569',
            minWidth: amt > 0 ? 2 : 0,
            transition: 'flex 0.5s ease',
          }} />
        ))}
      </div>

      {/* Per-service rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(spentByService).map(([svc, amt]) => {
          const pct = ((amt / total) * 100).toFixed(1)
          const color = SVC_COLOR[svc] ?? '#475569'
          return (
            <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                boxShadow: `0 0 4px ${color}`,
              }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, flex: 1 }}>
                {SERVICE_LABELS[svc] ?? svc}
              </span>
              <div style={{ width: 80, height: 4, background: '#111120', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 42, textAlign: 'right' }}>
                ${amt.toFixed(2)}
              </span>
              <span style={{ fontSize: 10, color: '#334155', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mock mode + budget cap controls ──────────────────────────────────────────
function BudgetControls({ budget, resetMonthlyBudget, setBudgetCap, setMockMode }) {
  const [newCap, setNewCap] = useState(budget.capUSD)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

      {/* Mock mode card */}
      <div style={{
        background: budget.mockMode
          ? 'rgba(245,158,11,0.07)'
          : PANEL2,
        border: `1px solid ${budget.mockMode ? 'rgba(245,158,11,0.3)' : BORDER}`,
        borderRadius: 14, padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: budget.mockMode ? GOLD : '#94a3b8' }}>
              🎭  Mock Mode
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
              {budget.mockMode
                ? `Frozen since ${budget.frozenAt ? new Date(budget.frozenAt).toLocaleTimeString() : '—'}`
                : 'Real API calls active'}
            </div>
          </div>
          <div
            onClick={() => setMockMode(!budget.mockMode)}
            style={{
              width: 40, height: 22, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
              background: budget.mockMode ? GOLD : '#1e293b',
              border: `1px solid ${budget.mockMode ? GOLD : '#334155'}`,
              position: 'relative', transition: 'all 0.25s',
            }}>
            <div style={{
              position: 'absolute', top: 3, left: budget.mockMode ? 20 : 3,
              width: 14, height: 14, borderRadius: '50%',
              background: budget.mockMode ? '#04040d' : '#475569',
              transition: 'left 0.25s',
            }} />
          </div>
        </div>
        {budget.mockMode && (
          <div style={{ fontSize: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#92400e', fontWeight: 600 }}>
            All API calls return simulated responses. No charges incurred.
          </div>
        )}
      </div>

      {/* Budget cap card */}
      <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
        <Label>Monthly Cap (USD)</Label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: '#111120', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px' }}>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>$</span>
            <input
              type="number" min={1} value={newCap}
              onChange={e => setNewCap(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={() => setBudgetCap(newCap)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
              background: `${GOLD}18`, border: `1px solid ${GOLD}44`,
              color: GOLD, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Set
          </button>
        </div>
        <button
          onClick={resetMonthlyBudget}
          style={{
            width: '100%', padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          🔄  Reset Monthly Budget
        </button>
      </div>
    </div>
  )
}

// ── Per-user daily allowance table ────────────────────────────────────────────
function AllowanceTable({ dailyAllowance, freeDailyLimit, setFreeDailyLimit, resetUserAllowance }) {
  const entries = Object.entries(dailyAllowance)

  return (
    <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Label>Free-Tier Daily Allowance Table</Label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Global limit:</span>
          <input
            type="number" min={0} max={100} value={freeDailyLimit}
            onChange={e => setFreeDailyLimit(e.target.value)}
            style={{
              width: 56, padding: '4px 8px', borderRadius: 7,
              background: '#111120', border: `1px solid ${BORDER}`,
              color: '#e2e8f0', fontSize: 13, fontWeight: 800,
              fontFamily: 'inherit', outline: 'none', textAlign: 'center',
            }}
          />
          <span style={{ fontSize: 11, color: '#475569' }}>/ day</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: '#334155', fontSize: 12 }}>
          No active free-tier sessions yet today.
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#111120', borderBottom: `1px solid ${BORDER}` }}>
                {['Email', 'Used', 'Limit', 'Reset At', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(([email, a], i) => {
                const pct = a.limit > 0 ? (a.spent / a.limit) * 100 : 0
                const color = pct >= 100 ? '#ef4444' : pct >= 66 ? GOLD : '#34d399'
                return (
                  <tr key={email} style={{ borderBottom: i < entries.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11 }}>{email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 50, height: 4, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color }}>{a.spent}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>{a.limit}</td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: '#475569' }}>
                      {new Date(a.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => resetUserAllowance(email)}
                        style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: 'transparent', border: `1px solid ${BORDER}`,
                          color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.color = '#34d399' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#475569' }}>
                        Reset
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Stripe subscription status table ─────────────────────────────────────────
const STRIPE_EVENTS = [
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'subscription.canceled',
  'customer.subscription.deleted',
]

const STATUS_STYLE = {
  active:    { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', dot: '#34d399' },
  canceled:  { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  dot: '#ef4444' },
  past_due:  { color: GOLD,      bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', dot: GOLD      },
  unpaid:    { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  dot: '#ef4444' },
}

function StripeRow({ email, info, simulateWebhook, overrideStatus }) {
  const [evt, setEvt]       = useState(STRIPE_EVENTS[0])
  const [override, setOverride] = useState(info.status)
  const sty = STATUS_STYLE[info.status] ?? STATUS_STYLE.active

  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
      <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {email}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          color: sty.color, background: sty.bg, border: `1px solid ${sty.border}`,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {info.status}
        </span>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569', textTransform: 'capitalize' }}>
        {info.plan}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 10, color: '#334155' }}>
        {info.periodEnd ?? '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={evt}
            onChange={e => setEvt(e.target.value)}
            style={{
              background: '#111120', border: `1px solid ${BORDER}`,
              color: '#94a3b8', fontSize: 9.5, borderRadius: 6, padding: '3px 5px',
              cursor: 'pointer', fontFamily: 'inherit', maxWidth: 120,
            }}>
            {STRIPE_EVENTS.map(e => (
              <option key={e} value={e}>{e.replace('subscription.', 'sub.').replace('customer.', 'cust.')}</option>
            ))}
          </select>
          <button
            onClick={() => simulateWebhook(email, evt)}
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
            Fire
          </button>
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={override}
            onChange={e => setOverride(e.target.value)}
            style={{
              background: '#111120', border: `1px solid ${BORDER}`,
              color: '#94a3b8', fontSize: 9.5, borderRadius: 6, padding: '3px 5px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {['active', 'canceled', 'past_due', 'unpaid'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => overrideStatus(email, override)}
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: `${GOLD}12`, border: `1px solid ${GOLD}30`,
              color: GOLD, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Set
          </button>
        </div>
      </td>
    </tr>
  )
}

function StripeTable({ stripeStatuses, simulateWebhook, overrideStatus }) {
  const entries = Object.entries(stripeStatuses)

  return (
    <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px' }}>
      <Label>Stripe Subscription Status · Webhook Simulation</Label>
      <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#111120', borderBottom: `1px solid ${BORDER}` }}>
              {['Email', 'Status', 'Plan', 'Period End', 'Fire Webhook', 'Override'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([email, info]) => (
              <StripeRow
                key={email}
                email={email}
                info={info}
                simulateWebhook={simulateWebhook}
                overrideStatus={overrideStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Audit log ─────────────────────────────────────────────────────────────────
function AuditLog({ auditLog }) {
  if (auditLog.length === 0) return null

  const TYPE_COLOR = {
    gate_budget_cap:  '#818cf8',
    gate_stripe:      GOLD,
    gate_free_tier:   '#34d399',
    stripe_webhook:   '#f472b6',
    admin_override:   '#f97316',
  }

  return (
    <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
      <Label>Guard Decision Audit Log (last 20)</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
        {auditLog.map((entry, i) => {
          const color = TYPE_COLOR[entry.type] ?? '#475569'
          const isBlocked = entry.result === 'blocked'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: isBlocked ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)'}`,
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5,
                color, background: `${color}15`, border: `1px solid ${color}33`,
                flexShrink: 0, whiteSpace: 'nowrap', marginTop: 1,
              }}>{entry.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{entry.email}</span>
                  {entry.feature && <span style={{ fontSize: 10, color: '#475569' }}>· {entry.feature}</span>}
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                    color: isBlocked ? '#f87171' : '#34d399',
                    background: isBlocked ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
                  }}>{entry.result}</span>
                </div>
              </div>
              <span style={{ fontSize: 9, color: '#334155', flexShrink: 0, marginTop: 2 }}>
                {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdminBudgetGuard() {
  const {
    budget,
    resetMonthlyBudget, setBudgetCap, setMockMode,
    dailyAllowance, freeDailyLimit, setFreeDailyLimit, resetUserAllowance,
    stripeStatuses, simulateStripeWebhook, overrideStripeStatus,
    auditLog,
  } = useCreditGuardStore()

  return (
    <div>
      <SectionTitle sub="Real-time cost shield · budget cap · daily allowances · Stripe re-verification">
        Financial Defense & Budget Guard
      </SectionTitle>

      <BudgetGauge spentUSD={budget.spentUSD} capUSD={budget.capUSD} />

      <ServiceBreakdown spentByService={budget.spentByService} callsThisMonth={budget.callsThisMonth} />

      <BudgetControls
        budget={budget}
        resetMonthlyBudget={resetMonthlyBudget}
        setBudgetCap={setBudgetCap}
        setMockMode={setMockMode}
      />

      <AuditLog auditLog={auditLog} />

      <AllowanceTable
        dailyAllowance={dailyAllowance}
        freeDailyLimit={freeDailyLimit}
        setFreeDailyLimit={setFreeDailyLimit}
        resetUserAllowance={resetUserAllowance}
      />

      <StripeTable
        stripeStatuses={stripeStatuses}
        simulateWebhook={simulateStripeWebhook}
        overrideStatus={overrideStripeStatus}
      />
    </div>
  )
}
