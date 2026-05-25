import { useState } from 'react'
import { useMarketingStore, DEFAULT_COPY } from '../store/marketingStore'

const GOLD   = '#f59e0b'
const PANEL2 = '#0d0d1a'
const BORDER = 'rgba(255,255,255,0.07)'
const GREEN  = '#10b981'

// ── Shared primitives ─────────────────────────────────────────────────────────
function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </span>
      {hint && <span style={{ fontSize: 10, color: '#1e3a2a', fontWeight: 500 }}>{hint}</span>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, rows }) {
  const style = {
    width: '100%', boxSizing: 'border-box',
    background: '#0a0a14', border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: '9px 14px',
    color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', lineHeight: 1.55,
    transition: 'border-color 0.15s',
    resize: rows ? 'vertical' : undefined,
  }

  if (rows) {
    return (
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
        onFocus={e => { e.currentTarget.style.borderColor = `${GOLD}66` }}
        onBlur={e =>  { e.currentTarget.style.borderColor = BORDER }}
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
      onFocus={e => { e.currentTarget.style.borderColor = `${GOLD}66` }}
      onBlur={e =>  { e.currentTarget.style.borderColor = BORDER }}
    />
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.02em' }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

function GlowBtn({ children, onClick, disabled, color = GREEN }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '11px 26px', borderRadius: 10, fontSize: 12.5, fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        border: 'none',
        background: disabled
          ? '#1e293b'
          : hov
          ? `linear-gradient(135deg, ${color}, ${color}cc)`
          : `linear-gradient(135deg, ${color}dd, ${color}aa)`,
        color: disabled ? '#334155' : '#fff',
        boxShadow: !disabled && hov ? `0 6px 24px ${color}55` : 'none',
        transition: 'all 0.2s',
        letterSpacing: '0.02em',
      }}>
      {children}
    </button>
  )
}

function StatusPill({ children, color = GREEN }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
      color, background: `${color}15`, border: `1px solid ${color}33`,
    }}>
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  PANEL 1 — Front-End Copy & Assets Overlord
// ─────────────────────────────────────────────────────────────────────────────
const COPY_FIELDS = [
  { key: 'heroHeadline',    label: 'Hero Headline',           rows: 2,  placeholder: 'e.g. Consider yourself\nlimitless.' },
  { key: 'heroSubheadline', label: 'Hero Subheadline',        rows: 3,  placeholder: 'Supporting paragraph below the headline…' },
  { key: 'builderSub',      label: 'Builder Card — Subtitle', rows: 1,  placeholder: 'e.g. Describe it. Ship it.' },
  { key: 'studioSub',       label: 'Studio Card — Subtitle',  rows: 1,  placeholder: 'e.g. AI-Powered DAW' },
  { key: 'videoSub',        label: 'Video Editor — Subtitle', rows: 1,  placeholder: 'e.g. Hollywood-grade NLE' },
  { key: 'logoSub',         label: 'Logo Maker — Subtitle',   rows: 1,  placeholder: 'e.g. SVG Vector Studio' },
  { key: 'bgrSub',          label: 'BG Remover — Subtitle',   rows: 1,  placeholder: 'e.g. ML Segmentation' },
]

export function CopySection() {
  const {
    copyDraft, setCopyDraft, publishCopy, revertCopy,
    copyDirty, copyPublishedAt,
  } = useMarketingStore()

  return (
    <div>
      <SectionTitle sub="Edit all public-facing landing page text and push live instantly — no code changes required">
        🖥️ Front-End Copy & Assets Overlord
      </SectionTitle>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        padding: '12px 16px', borderRadius: 12,
        background: copyDirty ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.05)',
        border: `1px solid ${copyDirty ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)'}`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: copyDirty ? GOLD : GREEN, boxShadow: `0 0 5px ${copyDirty ? GOLD : GREEN}`, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: copyDirty ? GOLD : '#34d399', flex: 1 }}>
          {copyDirty
            ? 'Unpublished changes — hit "Publish" to push live'
            : copyPublishedAt
            ? `Live copy · published ${new Date(copyPublishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Live copy · showing defaults'}
        </span>
        {copyDirty && (
          <button
            onClick={revertCopy}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 7,
              background: 'transparent', border: `1px solid ${BORDER}`,
              color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Revert
          </button>
        )}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
        {COPY_FIELDS.map(({ key, label, rows, placeholder }) => (
          <div key={key}>
            <FieldLabel hint={key === 'heroHeadline' ? 'Use \\n for a line break' : undefined}>
              {label}
            </FieldLabel>
            <TextInput
              rows={rows}
              value={copyDraft[key]}
              onChange={v => setCopyDraft(key, v)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      {/* Diff preview strip */}
      {copyDirty && (
        <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Changed fields
          </div>
          {COPY_FIELDS.filter(f => copyDraft[f.key] !== DEFAULT_COPY[f.key]).map(f => (
            <div key={f.key} style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: GOLD, fontWeight: 700, minWidth: 160 }}>{f.label}</span>
              <span style={{ color: '#334155' }}>{copyDraft[f.key].slice(0, 60)}{copyDraft[f.key].length > 60 ? '…' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Publish button */}
      <div style={{
        background: copyDirty
          ? `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.04))`
          : 'transparent',
        border: `1px solid ${copyDirty ? 'rgba(16,185,129,0.2)' : BORDER}`,
        borderRadius: 14, padding: '20px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: copyDirty ? '#e2e8f0' : '#475569', marginBottom: 3 }}>
            {copyDirty ? 'Ready to publish changes' : 'Copy is up to date'}
          </div>
          <div style={{ fontSize: 11, color: '#334155' }}>
            Changes reflect on the public landing page immediately — no deploy required.
          </div>
        </div>
        <GlowBtn onClick={publishCopy} disabled={!copyDirty} color={GREEN}>
          ✦ Publish Live Copy Changes
        </GlowBtn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  PANEL 2 — Revenue & Monetization Architect
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_META = {
  free:       { emoji: '🆓', accent: '#475569', label: 'Free Starter' },
  pro:        { emoji: '⚡', accent: '#6366f1', label: 'Pro'          },
  enterprise: { emoji: '👑', accent: GOLD,       label: 'Enterprise'   },
}

function PriceCard({ tier, draft, setPricingDraft }) {
  const meta = PLAN_META[tier]
  return (
    <div style={{
      background: PANEL2, border: `1px solid ${meta.accent}28`,
      borderRadius: 14, padding: '20px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${meta.accent}15`, border: `1px solid ${meta.accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        }}>{meta.emoji}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: meta.accent }}>{meta.label}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[['monthly', 'Monthly (USD)'], ['annual', 'Annual / mo (USD)']].map(([field, lbl]) => (
          <div key={field}>
            <FieldLabel>{lbl}</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0a0a14', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 12px' }}>
              <span style={{ fontSize: 15, color: '#475569', fontWeight: 700 }}>$</span>
              <input
                type="number" min={0}
                value={draft[field]}
                onChange={e => setPricingDraft(tier, field, e.target.value)}
                disabled={tier === 'free'}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: tier === 'free' ? '#334155' : '#e2e8f0',
                  fontSize: 16, fontWeight: 900, fontFamily: 'inherit',
                  cursor: tier === 'free' ? 'not-allowed' : 'text',
                }}
              />
              <span style={{ fontSize: 10, color: '#334155' }}>/mo</span>
            </div>
          </div>
        ))}

        {tier !== 'free' && draft.monthly > 0 && draft.annual > 0 && (
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
            Annual discount: {Math.round((1 - draft.annual / draft.monthly) * 100)}% off
          </div>
        )}
      </div>
    </div>
  )
}

function CouponRow({ coupon, toggleCoupon, revokeCoupon }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          fontSize: 11, fontWeight: 900, fontFamily: 'monospace',
          color: coupon.active ? '#34d399' : '#475569',
          letterSpacing: '0.06em',
        }}>{coupon.code}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          fontSize: 12, fontWeight: 800,
          color: coupon.active ? GOLD : '#334155',
        }}>{coupon.pct}% OFF</span>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 10, color: '#334155' }}>{coupon.created}</td>
      <td style={{ padding: '10px 14px' }}>
        <div
          onClick={() => toggleCoupon(coupon.id)}
          style={{
            width: 36, height: 19, borderRadius: 99, cursor: 'pointer',
            background: coupon.active ? GREEN : '#1e293b',
            border: `1px solid ${coupon.active ? GREEN : '#334155'}`,
            position: 'relative', transition: 'all 0.2s',
          }}>
          <div style={{
            position: 'absolute', top: 2, left: coupon.active ? 18 : 2,
            width: 13, height: 13, borderRadius: '50%',
            background: coupon.active ? '#fff' : '#475569',
            transition: 'left 0.2s',
          }} />
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        {confirmRevoke ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => revokeCoupon(coupon.id)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
              }}>Confirm</button>
            <button
              onClick={() => setConfirmRevoke(false)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRevoke(true)}
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'transparent', border: `1px solid ${BORDER}`,
              color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
            }}
            title="Revoke coupon"
          >🗑</button>
        )}
      </td>
    </tr>
  )
}

export function RevenueSection() {
  const {
    pricingDraft, setPricingDraft, publishPricing, revertPricing,
    pricingDirty, pricingPublishedAt, marketingPricing,
    coupons, couponDraft, setCouponDraft, mintCoupon, toggleCoupon, revokeCoupon,
  } = useMarketingStore()

  const [couponErr, setCouponErr] = useState('')

  const handleMint = () => {
    if (!couponDraft.code.trim()) { setCouponErr('Coupon code cannot be empty.'); return }
    if (couponDraft.pct < 1 || couponDraft.pct > 100) { setCouponErr('Discount must be between 1–100%.'); return }
    if (coupons.find(c => c.code.toUpperCase() === couponDraft.code.trim().toUpperCase())) {
      setCouponErr('A coupon with that code already exists.')
      return
    }
    setCouponErr('')
    mintCoupon()
  }

  const activeCoupons = coupons.filter(c => c.active).length

  return (
    <div>
      <SectionTitle sub="Live pricing that syncs to the landing page and checkout sessions · build and manage discount codes">
        💰 Revenue & Monetization Architect
      </SectionTitle>

      {/* ── PRICING ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Subscription Pricing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pricingPublishedAt && !pricingDirty && (
              <StatusPill color={GREEN}>
                Synced {new Date(pricingPublishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </StatusPill>
            )}
            {pricingDirty && <StatusPill color={GOLD}>Unsaved changes</StatusPill>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {Object.keys(pricingDraft).map(tier => (
            <PriceCard
              key={tier}
              tier={tier}
              draft={pricingDraft[tier]}
              setPricingDraft={setPricingDraft}
            />
          ))}
        </div>

        <div style={{
          background: PANEL2, border: `1px solid ${pricingDirty ? 'rgba(16,185,129,0.2)' : BORDER}`,
          borderRadius: 12, padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          marginBottom: 36,
        }}>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
            Pricing changes push to the <strong style={{ color: '#64748b' }}>landing page</strong> and{' '}
            <strong style={{ color: '#64748b' }}>Stripe checkout</strong> on publish.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {pricingDirty && (
              <button
                onClick={revertPricing}
                style={{
                  padding: '9px 18px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Revert
              </button>
            )}
            <GlowBtn onClick={publishPricing} disabled={!pricingDirty} color={GREEN}>
              ✦ Sync to Landing Page & Stripe
            </GlowBtn>
          </div>
        </div>

        {/* ── COUPONS ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Discount Code Minting Engine
            </div>
            <StatusPill color={activeCoupons > 0 ? GREEN : '#475569'}>
              {activeCoupons} active coupon{activeCoupons !== 1 ? 's' : ''}
            </StatusPill>
          </div>

          {/* Mint form */}
          <div style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <FieldLabel>Coupon Code</FieldLabel>
                <TextInput
                  value={couponDraft.code}
                  onChange={v => { setCouponDraft('code', v.toUpperCase()); setCouponErr('') }}
                  placeholder="ERITREA20"
                />
              </div>
              <div style={{ minWidth: 90 }}>
                <FieldLabel>Discount %</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0a0a14', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '9px 12px' }}>
                  <input
                    type="number" min={1} max={100}
                    value={couponDraft.pct}
                    onChange={e => setCouponDraft('pct', e.target.value)}
                    style={{
                      width: 40, background: 'transparent', border: 'none', outline: 'none',
                      color: '#e2e8f0', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#475569' }}>%</span>
                </div>
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#0a0a14', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <div
                    onClick={() => setCouponDraft('active', !couponDraft.active)}
                    style={{
                      width: 32, height: 17, borderRadius: 99, cursor: 'pointer',
                      background: couponDraft.active ? GREEN : '#1e293b',
                      border: `1px solid ${couponDraft.active ? GREEN : '#334155'}`,
                      position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                    }}>
                    <div style={{
                      position: 'absolute', top: 2, left: couponDraft.active ? 15 : 2,
                      width: 11, height: 11, borderRadius: '50%',
                      background: couponDraft.active ? '#fff' : '#475569',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: couponDraft.active ? '#34d399' : '#475569', whiteSpace: 'nowrap' }}>
                    {couponDraft.active ? 'Active' : 'Draft'}
                  </span>
                </div>
              </div>
              <GlowBtn onClick={handleMint} color={GOLD}>
                Mint ✦
              </GlowBtn>
            </div>
            {couponErr && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#f87171', fontWeight: 600 }}>
                ⚠ {couponErr}
              </div>
            )}
          </div>

          {/* Coupon table */}
          <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#111120', borderBottom: `1px solid ${BORDER}` }}>
                  {['Code', 'Discount', 'Created', 'Status', 'Revoke'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
                      No coupons yet. Mint your first one above.
                    </td>
                  </tr>
                )}
                {coupons.map(c => (
                  <CouponRow
                    key={c.id}
                    coupon={c}
                    toggleCoupon={toggleCoupon}
                    revokeCoupon={revokeCoupon}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
              💡  Checkout router validates codes via <code style={{ background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 10.5 }}>validateCoupon(code, coupons)</code> from <code style={{ background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 10.5 }}>marketingStore</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  PANEL 3 — Marketing Pixels & Meta Tag Header
// ─────────────────────────────────────────────────────────────────────────────
const PIXEL_TEMPLATES = [
  {
    label: 'Google Analytics 4',
    icon: '📊',
    code: `<!-- Google Analytics 4 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`,
  },
  {
    label: 'Meta Pixel',
    icon: '🔵',
    code: `<!-- Meta Pixel -->\n<script>\n  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n  n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\n  n.queue=[];t=b.createElement(e);t.async=!0;\n  t.src=v;s=b.getElementsByTagName(e)[0];\n  s.parentNode.insertBefore(t,s)}(window,document,'script',\n  'https://connect.facebook.net/en_US/fbevents.js');\n  fbq('init', 'YOUR_PIXEL_ID');\n  fbq('track', 'PageView');\n</script>`,
  },
  {
    label: 'TikTok Pixel',
    icon: '🎵',
    code: `<!-- TikTok Pixel -->\n<script>\n  !function (w, d, t) {\n    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];\n    ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];\n    ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};\n    for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);\n    ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};\n    ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";\n    ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};\n    ttq._t[e]=+new Date;ttq._o=ttq._o||{};\n    ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";\n    o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;\n    var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};\n    ttq.load('YOUR_PIXEL_ID');\n    ttq.page();\n  }(window, document, 'ttq');\n</script>`,
  },
]

function detectScriptTags(raw) {
  if (!raw.trim()) return []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<html><head>${raw}</head></html>`, 'text/html')
    return Array.from(doc.querySelectorAll('script')).map(s => ({
      src:    s.src || null,
      inline: !s.src && s.textContent.trim().slice(0, 60),
    }))
  } catch {
    return []
  }
}

export function PixelSection() {
  const {
    trackingScripts, scriptDraft, scriptDirty, scriptInjectedAt,
    setScriptDraft, injectScripts, clearScripts,
  } = useMarketingStore()

  const detectedTags = detectScriptTags(scriptDraft)
  const liveTagCount = detectScriptTags(trackingScripts).length

  const appendTemplate = (code) => {
    setScriptDraft((scriptDraft ? scriptDraft + '\n\n' : '') + code)
  }

  return (
    <div>
      <SectionTitle sub="Paste tracking pixels and advertising scripts — they are sanitized and injected into the live landing page &lt;head&gt;">
        📈 Marketing Pixels & Meta Tag Header
      </SectionTitle>

      {/* Live status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        padding: '12px 16px', borderRadius: 12,
        background: liveTagCount > 0 ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${liveTagCount > 0 ? 'rgba(16,185,129,0.2)' : BORDER}`,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: liveTagCount > 0 ? GREEN : '#334155',
          boxShadow: liveTagCount > 0 ? `0 0 6px ${GREEN}` : 'none',
          flexShrink: 0,
          animation: liveTagCount > 0 ? 'pixelLive 2s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: liveTagCount > 0 ? '#34d399' : '#334155', flex: 1 }}>
          {liveTagCount > 0
            ? `${liveTagCount} script tag${liveTagCount !== 1 ? 's' : ''} currently injected into <head>`
            : 'No scripts currently active'}
          {scriptInjectedAt && liveTagCount > 0 && (
            <span style={{ fontWeight: 500, color: '#475569', marginLeft: 10 }}>
              · pushed {new Date(scriptInjectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </span>
        {liveTagCount > 0 && (
          <button
            onClick={clearScripts}
            style={{
              padding: '4px 12px', borderRadius: 7, fontSize: 10, fontWeight: 700,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Clear All Pixels
          </button>
        )}
      </div>

      {/* Quick-insert templates */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Quick-insert templates
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PIXEL_TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => appendTemplate(t.code)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
                color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = '#94a3b8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#64748b' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main textarea */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel hint="Only &lt;script&gt; tags are extracted and injected — all other HTML is ignored">
          Custom Advertising & Tracking Header Scripts
        </FieldLabel>
        <textarea
          rows={14}
          value={scriptDraft}
          onChange={e => setScriptDraft(e.target.value)}
          placeholder={`Paste your tracking tags here, e.g.\n\n<!-- Google Analytics 4 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  ...\n</script>\n\n<!-- Meta Pixel -->\n<script>...</script>`}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#070710', border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: '14px 16px',
            color: '#34d399', fontSize: 11.5, fontFamily: '"Fira Code", "Courier New", monospace',
            outline: 'none', lineHeight: 1.65, resize: 'vertical',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)' }}
          onBlur={e =>  { e.currentTarget.style.borderColor = BORDER }}
        />
      </div>

      {/* Detection preview */}
      {scriptDraft.trim() && (
        <div style={{
          marginBottom: 20, padding: '14px 16px',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Sanitizer preview — {detectedTags.length} script tag{detectedTags.length !== 1 ? 's' : ''} detected
          </div>
          {detectedTags.length === 0 ? (
            <div style={{ fontSize: 11, color: '#334155' }}>No valid &lt;script&gt; tags found in the input.</div>
          ) : (
            detectedTags.map((tag, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                fontSize: 11, fontFamily: 'monospace',
              }}>
                <span style={{ color: GREEN, fontWeight: 700, fontSize: 10 }}>✓</span>
                <span style={{ color: '#475569' }}>
                  {tag.src
                    ? <><span style={{ color: '#818cf8' }}>src=</span><span style={{ color: '#94a3b8' }}>{tag.src.slice(0, 80)}{tag.src.length > 80 ? '…' : ''}</span></>
                    : <><span style={{ color: '#818cf8' }}>inline</span> <span style={{ color: '#334155' }}>{tag.inline}…</span></>
                  }
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sanitization notice */}
      <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
          🛡️  Sanitizer: only <code style={{ background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: 4 }}>&lt;script&gt;</code> tags with valid <code style={{ background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: 4 }}>src</code> or text content are extracted and injected via the DOM API. Arbitrary HTML is silently discarded.
        </span>
      </div>

      {/* Inject button row */}
      <div style={{
        background: PANEL2, border: `1px solid ${scriptDirty ? 'rgba(16,185,129,0.2)' : BORDER}`,
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>
            Inject scripts into <code style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 5 }}>&lt;head&gt;</code>
          </div>
          <div style={{ fontSize: 11, color: '#334155' }}>
            Takes effect on the landing page immediately — no page reload required.
          </div>
        </div>
        <GlowBtn
          onClick={injectScripts}
          disabled={!scriptDirty && !!trackingScripts || (!scriptDraft.trim())}
          color={GREEN}>
          ✦ Inject Into &lt;head&gt;
        </GlowBtn>
      </div>

      <style>{`
        @keyframes pixelLive { 0%,100%{opacity:1;box-shadow:0 0 6px #10b981} 50%{opacity:0.4;box-shadow:0 0 2px #10b981} }
      `}</style>
    </div>
  )
}
