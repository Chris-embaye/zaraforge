import { useState, useRef, useEffect } from 'react'
import { useAdminStore, DB_COLUMNS, DB_READONLY_COLS } from './adminStore'

// ── Shared palette ────────────────────────────────────────────────────────────
const GOLD   = '#f59e0b'
const BG     = '#04040d'
const PANEL  = '#08080f'
const PANEL2 = '#0d0d1a'
const BORDER = 'rgba(255,255,255,0.07)'

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.02em' }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. RAW DATABASE OVERLORD
// ═════════════════════════════════════════════════════════════════════════════

const TABLE_META = {
  users:          { label: '👤 Users',          icon: '👤' },
  subscriptions:  { label: '💳 Subscriptions',  icon: '💳' },
  video_projects: { label: '🎬 Video Projects',  icon: '🎬' },
  audio_tracks:   { label: '🎵 Audio Tracks',    icon: '🎵' },
  logos:          { label: '🎨 Logos',            icon: '🎨' },
}

function DBCell({ value, readOnly, isEditing, editValue, onDoubleClick, onChange, onCommit, onCancel }) {
  const inputRef = useRef(null)

  useEffect(() => { if (isEditing) inputRef.current?.select() }, [isEditing])

  const cellStyle = {
    padding: 0, position: 'relative', minWidth: 100, maxWidth: 200,
    whiteSpace: 'nowrap',
    borderRight: `1px solid ${BORDER}`,
  }

  if (isEditing) {
    return (
      <td style={cellStyle}>
        <input
          ref={inputRef}
          autoFocus
          value={editValue}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter')  { e.preventDefault(); onCommit() }
            if (e.key === 'Escape') { e.preventDefault(); onCancel() }
          }}
          onBlur={onCommit}
          style={{
            width: '100%', padding: '7px 10px', boxSizing: 'border-box',
            background: 'rgba(245,158,11,0.1)', border: 'none',
            outline: '2px solid #f59e0b',
            color: '#fbbf24', fontSize: 11, fontFamily: 'monospace',
            fontWeight: 600,
          }}
        />
      </td>
    )
  }

  return (
    <td
      onDoubleClick={readOnly ? undefined : onDoubleClick}
      title={readOnly ? undefined : 'Double-click to edit'}
      style={{
        ...cellStyle,
        padding: '7px 10px',
        fontSize: 11, color: readOnly ? '#334155' : '#94a3b8',
        fontFamily: 'monospace',
        cursor: readOnly ? 'default' : 'cell',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!readOnly) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      {String(value)}
    </td>
  )
}

export function DatabaseSection() {
  const {
    dbData, activeDbTable, editingCell, editValue,
    setActiveDbTable, startCellEdit, setEditValue, commitCellEdit, cancelCellEdit,
  } = useAdminStore()

  const rows    = dbData[activeDbTable] ?? []
  const columns = DB_COLUMNS[activeDbTable] ?? []

  return (
    <div>
      <SectionTitle sub="Double-click any editable cell to update in real time — no SQL required">
        🗄️ Raw Data Overlord
      </SectionTitle>

      {/* Table selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(TABLE_META).map(([key, meta]) => {
          const active = activeDbTable === key
          return (
            <button key={key} onClick={() => setActiveDbTable(key)} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              background: active ? `${GOLD}18` : PANEL2,
              border: `1px solid ${active ? GOLD : BORDER}`,
              color: active ? GOLD : '#475569',
            }}>
              {meta.label}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>
            {rows.length} rows
          </span>
          {editingCell && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: GOLD,
              background: `${GOLD}18`, padding: '3px 8px', borderRadius: 99,
              border: `1px solid ${GOLD}44`,
              animation: 'editPulse 1.2s ease-in-out infinite',
            }}>
              ✏️ Editing…
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div style={{
        borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
              {columns.map(col => (
                <th key={col} style={{
                  padding: '9px 10px', textAlign: 'left',
                  fontSize: 9.5, fontWeight: 700, color: DB_READONLY_COLS.has(col) ? '#1e293b' : '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  borderRight: `1px solid ${BORDER}`,
                  background: DB_READONLY_COLS.has(col) ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}>
                  {DB_READONLY_COLS.has(col) ? `🔒 ${col}` : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id} style={{ borderBottom: ri < rows.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                {columns.map(col => {
                  const isEditing = editingCell?.tableId === activeDbTable &&
                                    editingCell?.rowId === row.id &&
                                    editingCell?.colKey === col
                  return (
                    <DBCell
                      key={col}
                      value={row[col] ?? ''}
                      readOnly={DB_READONLY_COLS.has(col)}
                      isEditing={isEditing}
                      editValue={editValue}
                      onDoubleClick={() => startCellEdit(activeDbTable, row.id, col)}
                      onChange={setEditValue}
                      onCommit={commitCellEdit}
                      onCancel={cancelCellEdit}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: '#1e293b', fontWeight: 600 }}>
        🔒 Locked columns (id, userId, duration, created) are read-only system fields.  ·  All other cells are live-editable.
      </div>

      <style>{`
        @keyframes editPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. AI GATEWAY SENTRY
// ═════════════════════════════════════════════════════════════════════════════

function UsageBar({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#34d399'
  return (
    <div style={{ height: 8, borderRadius: 99, background: '#111120', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 99,
        background: `linear-gradient(90deg, ${color}aa, ${color})`,
        transition: 'width 0.5s ease',
        boxShadow: pct > 85 ? `0 0 8px ${color}88` : 'none',
      }} />
    </div>
  )
}

function ServiceCard({ id, svc, onLimitChange }) {
  const pct  = Math.min((svc.used / svc.limit) * 100, 100)
  const cost = ((svc.used / 1000) * svc.costPerK).toFixed(2)
  const statusColor = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#34d399'

  return (
    <div style={{
      background: PANEL2, borderRadius: 14, padding: '18px 20px',
      border: `1px solid ${pct > 85 ? 'rgba(239,68,68,0.3)' : BORDER}`,
      boxShadow: pct > 85 ? '0 0 20px rgba(239,68,68,0.08)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{svc.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{svc.name}</div>
            <div style={{ fontSize: 10, color: '#334155', fontWeight: 600, marginTop: 1 }}>
              {svc.callsToday.toLocaleString()} {svc.unit} today
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: statusColor }}>${cost}</div>
          <div style={{ fontSize: 9, color: '#334155', fontWeight: 600 }}>cost accrued</div>
        </div>
      </div>

      <UsageBar used={svc.used} limit={svc.limit} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: '#334155' }}>
          {svc.used.toLocaleString()} / {svc.limit.toLocaleString()} {svc.unit}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{pct.toFixed(1)}%</span>
      </div>

      {/* Limit slider */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Monthly Limit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={1000} max={500000} step={1000}
            value={svc.limit}
            onChange={e => onLimitChange(id, e.target.value)}
            style={{ flex: 1, accentColor: statusColor, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', minWidth: 48, textAlign: 'right' }}>
            {(svc.limit / 1000).toFixed(0)}K
          </span>
        </div>
      </div>
    </div>
  )
}

export function GatewaySection() {
  const { apiServices, freeUserCreditCap, setFreeUserCreditCap, setServiceLimit } = useAdminStore()

  const totalCost = Object.values(apiServices).reduce((sum, s) => sum + (s.used / 1000) * s.costPerK, 0)
  const capColor  = freeUserCreditCap > 50 ? '#34d399' : freeUserCreditCap > 15 ? GOLD : '#f87171'

  return (
    <div>
      <SectionTitle sub="Monitor token usage, control per-service limits, and throttle free tier access">
        🤖 AI Gateway Sentry
      </SectionTitle>

      {/* Total cost banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
        background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: 12, marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Total AI Spend This Cycle
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#34d399', letterSpacing: '-0.03em' }}>
            ${totalCost.toFixed(2)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>Projected Monthly</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#64748b' }}>${(totalCost * 1.8).toFixed(2)}</div>
        </div>
        <button style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontFamily: 'inherit',
        }}>
          🔒 Emergency Lock All
        </button>
      </div>

      {/* Service cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
        {Object.entries(apiServices).map(([id, svc]) => (
          <ServiceCard key={id} id={id} svc={svc} onLimitChange={setServiceLimit} />
        ))}
      </div>

      {/* Global free credit cap — the big slider */}
      <div style={{
        background: PANEL2, border: `1px solid ${capColor}33`,
        borderRadius: 16, padding: '24px 24px',
        boxShadow: `0 0 30px ${capColor}0a`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#e2e8f0' }}>Global Free User Credit Cap</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontWeight: 500 }}>
              Max AI generations per free-tier account per day · Drag to restrict or expand
            </div>
          </div>
          <div style={{
            fontSize: 40, fontWeight: 900, color: capColor, letterSpacing: '-0.04em',
            minWidth: 80, textAlign: 'right', lineHeight: 1,
          }}>
            {freeUserCreditCap}
          </div>
        </div>

        <input
          type="range" min={0} max={100} step={1}
          value={freeUserCreditCap}
          onChange={e => setFreeUserCreditCap(e.target.value)}
          style={{ width: '100%', height: 6, accentColor: capColor, cursor: 'pointer', marginBottom: 12 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1e293b', fontWeight: 700 }}>
          <span>0 — Fully Locked</span>
          <span style={{ color: freeUserCreditCap === 0 ? '#ef4444' : freeUserCreditCap < 15 ? GOLD : freeUserCreditCap < 50 ? '#34d399' : '#38bdf8' }}>
            {freeUserCreditCap === 0   ? '🔴 Free tier fully restricted' :
             freeUserCreditCap < 15   ? '🟡 Heavily throttled'          :
             freeUserCreditCap < 50   ? '🟢 Standard access'            :
                                        '🔵 Open / generous access'}
          </span>
          <span>100 — Unlimited</span>
        </div>
      </div>
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════════
// 3. PLATFORM PROTECTION MATRIX
// ═════════════════════════════════════════════════════════════════════════════

const FREEZE_SERVICES = [
  { key: 'payments',       label: 'Payment Processor',   desc: 'Stripe, wire, all billing flows'   },
  { key: 'ai_generation',  label: 'AI Generation Routes', desc: 'All Claude / Diffusion API calls'   },
  { key: 'new_signups',    label: 'New Registrations',    desc: 'Block new account creation'         },
  { key: 'video_export',   label: 'Video Export Jobs',    desc: 'Pause all render queue jobs'        },
  { key: 'api_access',     label: 'External API Access',  desc: 'Public API keys and webhooks'       },
  { key: 'cloud_sync',     label: 'Cloud Sync',           desc: 'Project saves and asset uploads'    },
]

export function ProtectionSection() {
  const {
    maintenanceMode, maintenanceSince, maintenanceMessage,
    frozenServices, toggleMaintenanceMode, setMaintenanceMessage, toggleFrozenService,
  } = useAdminStore()

  const [confirmOpen, setConfirmOpen] = useState(false)  // activate confirm
  const [deconfirmOpen, setDeconfirmOpen] = useState(false)  // deactivate confirm

  const elapsedMin = maintenanceSince
    ? Math.floor((Date.now() - new Date(maintenanceSince).getTime()) / 60000)
    : 0

  const handleToggle = () => {
    if (!maintenanceMode) setConfirmOpen(true)
    else                  setDeconfirmOpen(true)
  }

  return (
    <div>
      <SectionTitle sub="Instantly freeze all public traffic routes while preserving full admin access">
        ⚠️ Platform Protection Matrix
      </SectionTitle>

      {/* ── Main kill-switch card ── */}
      <div style={{
        borderRadius: 18, padding: '28px 28px',
        background: maintenanceMode
          ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))'
          : PANEL2,
        border: maintenanceMode
          ? '1.5px solid rgba(239,68,68,0.4)'
          : `1.5px solid ${BORDER}`,
        boxShadow: maintenanceMode ? '0 0 40px rgba(239,68,68,0.1)' : 'none',
        marginBottom: 20,
        transition: 'all 0.4s ease',
        position: 'relative',
      }}>
        {maintenanceMode && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)',
            backgroundSize: '200% 100%',
            animation: 'maintSlide 2s linear infinite',
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Status icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
            background: maintenanceMode ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.08)',
            border: maintenanceMode ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid rgba(52,211,153,0.2)',
            animation: maintenanceMode ? 'shieldPulse 2s ease-in-out infinite' : 'none',
          }}>
            {maintenanceMode ? '🛑' : '🛡️'}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 15, fontWeight: 900,
                color: maintenanceMode ? '#f87171' : '#34d399',
              }}>
                {maintenanceMode ? 'MAINTENANCE MODE ACTIVE' : 'Platform is LIVE'}
              </span>
              {maintenanceMode && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(239,68,68,0.15)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  animation: 'editPulse 1.5s ease-in-out infinite',
                }}>
                  ● LIVE
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
              {maintenanceMode
                ? `Active for ${elapsedMin}m — ${frozenServices.length} service${frozenServices.length !== 1 ? 's' : ''} frozen · Admin-only access enforced`
                : 'All systems operational · Public traffic flowing normally'}
            </div>
          </div>

          {/* Big toggle */}
          <div
            onClick={handleToggle}
            style={{
              width: 72, height: 36, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
              background: maintenanceMode ? '#ef4444' : '#1e293b',
              border: `2px solid ${maintenanceMode ? '#dc2626' : '#334155'}`,
              position: 'relative', transition: 'all 0.35s',
              boxShadow: maintenanceMode ? '0 0 20px rgba(239,68,68,0.4)' : 'none',
            }}>
            <div style={{
              position: 'absolute', top: 3, left: maintenanceMode ? 36 : 4,
              width: 26, height: 26, borderRadius: '50%',
              background: maintenanceMode ? '#fff' : '#475569',
              transition: 'left 0.35s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }} />
          </div>
        </div>

      </div>

      {/* ── Activate confirm (fixed modal — never clipped) ── */}
      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(4,4,13,0.85)', backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: '#080814', border: '1.5px solid rgba(239,68,68,0.4)',
            borderRadius: 18, padding: '36px 40px', maxWidth: 400, width: '90%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(239,68,68,0.1)',
          }}>
            <div style={{ fontSize: 40 }}>🚨</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#f87171', marginBottom: 8 }}>
                Activate Maintenance Mode?
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                This will immediately freeze all incoming public traffic,
                payment processing, and AI generation routes.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setConfirmOpen(false)} style={{
                padding: '10px 22px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${BORDER}`, color: '#64748b', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button onClick={() => { toggleMaintenanceMode(); setConfirmOpen(false) }} style={{
                padding: '10px 22px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.45)',
                color: '#f87171', fontFamily: 'inherit',
              }}>
                Yes, Activate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate confirm (fixed modal) ── */}
      {deconfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(4,4,13,0.85)', backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: '#080814', border: '1.5px solid rgba(52,211,153,0.35)',
            borderRadius: 18, padding: '36px 40px', maxWidth: 400, width: '90%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(52,211,153,0.07)',
          }}>
            <div style={{ fontSize: 40 }}>🟢</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#34d399', marginBottom: 8 }}>
                Deactivate Maintenance Mode?
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                Public traffic, payments, and AI generation will resume immediately.
                All frozen services will be restored.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setDeconfirmOpen(false)} style={{
                padding: '10px 22px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${BORDER}`, color: '#64748b', fontFamily: 'inherit',
              }}>
                Keep Active
              </button>
              <button onClick={() => { toggleMaintenanceMode(); setDeconfirmOpen(false) }} style={{
                padding: '10px 22px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)',
                color: '#34d399', fontFamily: 'inherit',
              }}>
                Yes, Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Service freeze matrix */}
        <div style={{ background: PANEL2, borderRadius: 14, padding: '18px 18px', border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 14 }}>
            🧊 Service Freeze Matrix
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FREEZE_SERVICES.map(svc => {
              const frozen = frozenServices.includes(svc.key)
              return (
                <div key={svc.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 10,
                  background: frozen ? 'rgba(239,68,68,0.06)' : 'transparent',
                  border: `1px solid ${frozen ? 'rgba(239,68,68,0.2)' : BORDER}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }} onClick={() => toggleFrozenService(svc.key)}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: frozen ? '#ef4444' : 'transparent',
                    border: `2px solid ${frozen ? '#ef4444' : '#334155'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff',
                  }}>
                    {frozen ? '✕' : ''}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: frozen ? '#f87171' : '#64748b' }}>
                      {svc.label}
                    </div>
                    <div style={{ fontSize: 9.5, color: '#1e293b' }}>{svc.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Maintenance message + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: PANEL2, borderRadius: 14, padding: '18px 18px', border: `1px solid ${BORDER}`, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
              📢 User-Facing Message
            </div>
            <textarea
              rows={4}
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111120', border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '10px 12px', resize: 'none',
                color: '#94a3b8', fontSize: 12, fontFamily: 'inherit',
                outline: 'none', lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ background: PANEL2, borderRadius: 14, padding: '16px 18px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
              ⚡ Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '🔄 Force Full Platform Restart', color: '#818cf8' },
                { label: '🗑️ Purge CDN & Edge Cache',      color: GOLD       },
                { label: '🔑 Rotate All API Keys',          color: '#f472b6'  },
                { label: '📊 Export Incident Report',       color: '#34d399'  },
              ].map(a => (
                <button key={a.label} style={{
                  padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: '#475569', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = a.color; e.currentTarget.style.borderColor = a.color + '55' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = BORDER }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes maintSlide { from{background-position:0% 0%} to{background-position:200% 0%} }
        @keyframes shieldPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.2)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes editPulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════════
// 4. LIVE COMMUNICATIONS HUB
// ═════════════════════════════════════════════════════════════════════════════

const PRIORITY_STYLE = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)'  },
  low:    { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)'  },
}

const STATUS_STYLE = {
  open:    { color: '#38bdf8', label: '● Open'    },
  replied: { color: '#34d399', label: '✓ Replied'  },
  closed:  { color: '#334155', label: '— Closed'  },
}

function TicketRow({ ticket, isExpanded, onExpand, onSend, onClose, replyDraft, onDraftChange }) {
  const pri = PRIORITY_STYLE[ticket.priority] ?? PRIORITY_STYLE.low
  const sta = STATUS_STYLE[ticket.status]  ?? STATUS_STYLE.open

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.1)' : BORDER}`,
      background: isExpanded ? PANEL2 : 'transparent',
      transition: 'all 0.2s',
      marginBottom: 8,
    }}>
      {/* Row header */}
      <div
        onClick={onExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '13px 16px', cursor: 'pointer',
        }}>
        {/* Priority badge */}
        <span style={{
          fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '3px 8px', borderRadius: 99, flexShrink: 0,
          color: pri.color, background: pri.bg, border: `1px solid ${pri.border}`,
        }}>
          {ticket.priority}
        </span>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${ticket.user.charCodeAt(0) * 12 % 360}, 45%, 18%)`,
            border: `1.5px solid hsl(${ticket.user.charCodeAt(0) * 12 % 360}, 45%, 35%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800,
            color: `hsl(${ticket.user.charCodeAt(0) * 12 % 360}, 55%, 65%)`,
          }}>
            {ticket.user.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{ticket.user}</div>
            <div style={{ fontSize: 9.5, color: '#334155' }}>{ticket.email}</div>
          </div>
        </div>

        {/* Subject */}
        <div style={{ flex: 1, fontSize: 12, color: '#94a3b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ticket.subject}
        </div>

        {/* Status + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: sta.color }}>{sta.label}</span>
          <span style={{ fontSize: 10, color: '#1e293b' }}>{ticket.createdAt}</span>
          <span style={{ fontSize: 10, color: '#334155', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 16px 16px' }}>
          {/* Original message */}
          <div style={{
            background: '#111120', borderRadius: 10, padding: '12px 14px',
            fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14,
            borderLeft: `3px solid ${pri.color}`,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {ticket.user} · {ticket.createdAt}
            </div>
            {ticket.message}
          </div>

          {/* Reply thread */}
          {ticket.replies?.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'flex-end', marginBottom: 10,
            }}>
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: `1px solid ${GOLD}33`,
                borderRadius: 10, padding: '10px 14px',
                maxWidth: '75%',
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#b45309', marginBottom: 5 }}>
                  👑 Admin Reply · {r.time}
                </div>
                <div style={{ fontSize: 12, color: '#d4a83a', lineHeight: 1.5 }}>{r.text}</div>
              </div>
            </div>
          ))}

          {/* Reply input */}
          {ticket.status !== 'closed' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <input
                placeholder="Type your reply… (Enter to send)"
                value={replyDraft ?? ''}
                onChange={e => onDraftChange(ticket.id, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(ticket.id) } }}
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 9,
                  background: '#111120', border: `1px solid ${BORDER}`,
                  color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={() => onSend(ticket.id)}
                disabled={!replyDraft?.trim()}
                style={{
                  padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 800,
                  cursor: replyDraft?.trim() ? 'pointer' : 'not-allowed',
                  background: replyDraft?.trim() ? `${GOLD}22` : 'transparent',
                  border: `1px solid ${replyDraft?.trim() ? GOLD : BORDER}`,
                  color: replyDraft?.trim() ? GOLD : '#334155',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                Send ↑
              </button>
              <button onClick={() => onClose(ticket.id)} style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: '#334155', fontFamily: 'inherit',
              }}>
                Close
              </button>
            </div>
          )}
          {ticket.status === 'closed' && (
            <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600, textAlign: 'center', padding: '8px 0' }}>
              Ticket closed
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CommsSection() {
  const {
    tickets, expandedTicketId, ticketReplyDraft,
    expandTicket, setReplyDraft, sendReply, closeTicket,
  } = useAdminStore()

  const openCount    = tickets.filter(t => t.status === 'open').length
  const repliedCount = tickets.filter(t => t.status === 'replied').length
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  return (
    <div>
      <SectionTitle sub="Respond to user tickets directly from the admin panel — replies push to user notification drawers">
        💬 Live Communications Hub
      </SectionTitle>

      {/* Stats + filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all',     label: `All (${tickets.length})` },
            { key: 'open',    label: `🔴 Open (${openCount})` },
            { key: 'replied', label: `✅ Replied (${repliedCount})` },
            { key: 'closed',  label: 'Closed' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: filter === f.key ? `${GOLD}18` : 'transparent',
              border: `1px solid ${filter === f.key ? GOLD : BORDER}`,
              color: filter === f.key ? GOLD : '#475569',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
        {openCount > 0 && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: '#f87171',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 5px #f87171', display: 'inline-block', animation: 'editPulse 1.5s ease-in-out infinite' }} />
            {openCount} ticket{openCount !== 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

      {/* Ticket list */}
      <div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#334155', fontSize: 13 }}>
            No tickets in this category.
          </div>
        )}
        {filtered.map(ticket => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            isExpanded={expandedTicketId === ticket.id}
            onExpand={() => expandTicket(ticket.id)}
            onSend={sendReply}
            onClose={closeTicket}
            replyDraft={ticketReplyDraft[ticket.id]}
            onDraftChange={setReplyDraft}
          />
        ))}
      </div>

      <style>{`@keyframes editPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  )
}
