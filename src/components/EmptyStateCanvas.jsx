import { useState } from 'react'
import { Sparkles, Zap, Loader2, ArrowRight } from 'lucide-react'
import { useVibeStore }    from '../store/vibeStore'
import { useBuilderStore } from '../store/builderStore'
import { useTranslation }  from '../i18n'

// ── Blueprint definitions ─────────────────────────────────────────────────────
const BLUEPRINTS = [
  {
    id:       'artist',
    emoji:    '🎵',
    title:    'Artist Portfolio & Beat Store',
    subtitle: 'Stream, sell beats, grow your fanbase',
    accent:   '#9b5de5',
    glow:     'rgba(155,93,229,0.28)',
    tags:     ['Audio', 'Beats', 'Stripe'],
    features: [
      'Streaming audio player',
      'Beat listing & licensing tiers',
      'Stripe checkout integration',
      'Fan newsletter & community',
    ],
    prompt: 'Dark music artist portfolio and beat store for a DJ with audio players, track listings, and Stripe checkout',
  },
  {
    id:       'saas',
    emoji:    '📊',
    title:    'SaaS Analytics Cockpit',
    subtitle: 'KPI dashboards, user tables, pricing',
    accent:   '#6366f1',
    glow:     'rgba(99,102,241,0.28)',
    tags:     ['Dashboard', 'Analytics', 'Users'],
    features: [
      'KPI metrics overview grid',
      'Live user management table',
      'Subscription pricing tiers',
      'Activity feed & audit log',
    ],
    prompt: 'SaaS startup analytics dashboard with pricing, data tables, KPI metrics overview, and user management',
  },
  {
    id:       'ecommerce',
    emoji:    '🛍️',
    title:    'E-Commerce Hub',
    subtitle: 'Products, filters, checkout flows',
    accent:   '#ec4899',
    glow:     'rgba(236,72,153,0.28)',
    tags:     ['Shop', 'Cart', 'Checkout'],
    features: [
      'Product showcase grid',
      'Category & filter menus',
      'Checkout & order tracking',
      'Reviews & ratings system',
    ],
    prompt: 'Fashion ecommerce boutique store with product showcase grid, category filters, and interactive checkout',
  },
  {
    id:       'blog',
    emoji:    '✍️',
    title:    'Multi-User Blog & CMS',
    subtitle: 'Articles, authors, comment system',
    accent:   '#f59e0b',
    glow:     'rgba(245,158,11,0.28)',
    tags:     ['Blog', 'CMS', 'Authors'],
    features: [
      'Article content grid',
      'Author profile cards',
      'Comment & reply threads',
      'Tag & category taxonomy',
    ],
    prompt: 'Multi-user blog and content management system with article grids, author profiles, and comment sections',
  },
]

// ── Example quick-prompts shown below the grid ────────────────────────────────
const QUICK_PROMPTS = [
  "A restaurant booking site for Aria's Kitchen",
  'Dark music portfolio for DJ Zara',
  'Health & wellness clinic with booking',
]

// ── Single blueprint card ─────────────────────────────────────────────────────
function BlueprintCard({ card, onLaunch, launchingId }) {
  const [hovered, setHovered] = useState(false)
  const isLaunching = launchingId === card.id
  const isBlocked   = launchingId !== null && !isLaunching

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !launchingId && onLaunch(card)}
      style={{
        position: 'relative', textAlign: 'left',
        borderRadius: 14, overflow: 'hidden',
        background: isLaunching
          ? `linear-gradient(145deg, ${card.accent}1a 0%, #0c0c1a 100%)`
          : '#0c0c1a',
        border: `1px solid ${
          isLaunching ? `${card.accent}88`
          : hovered   ? `${card.accent}55`
          : '#1a1a2e'
        }`,
        boxShadow: isLaunching
          ? `0 0 32px ${card.glow}, 0 12px 40px rgba(0,0,0,0.5)`
          : hovered
            ? `0 0 20px ${card.glow}, 0 8px 24px rgba(0,0,0,0.4)`
            : '0 2px 8px rgba(0,0,0,0.3)',
        cursor: launchingId ? (isLaunching ? 'wait' : 'not-allowed') : 'pointer',
        opacity: isBlocked ? 0.45 : 1,
        transform: hovered && !launchingId ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        fontFamily: 'inherit',
        width: '100%',
      }}>

      {/* Coloured top stripe */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${card.accent} 0%, ${card.accent}33 100%)`,
      }} />

      {/* Radial glow overlay on hover */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: hovered || isLaunching
          ? `radial-gradient(ellipse at 50% -10%, ${card.accent}0f 0%, transparent 65%)`
          : 'transparent',
        transition: 'background 0.3s',
      }} />

      <div style={{ padding: '16px 18px 15px', position: 'relative' }}>

        {/* Emoji + title block */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 26, display: 'block', marginBottom: 8, lineHeight: 1,
            filter: isLaunching ? `drop-shadow(0 0 8px ${card.accent})` : 'none',
            transition: 'filter 0.3s',
          }}>
            {card.emoji}
          </span>
          <p style={{
            fontSize: 13, fontWeight: 800, color: isLaunching ? card.accent : '#e2e8f0',
            marginBottom: 3, lineHeight: 1.3, transition: 'color 0.2s',
          }}>
            {card.title}
          </p>
          <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
            {card.subtitle}
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {card.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                background: card.accent, opacity: hovered || isLaunching ? 0.8 : 0.4,
                transition: 'opacity 0.2s',
              }} />
              <span style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.3 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Footer: tags + deploy badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          {/* Tag chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {card.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                background: `${card.accent}14`,
                color: card.accent,
                border: `1px solid ${card.accent}2e`,
                letterSpacing: '0.04em',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Quick Deploy badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            fontSize: 10, fontWeight: 800,
            background: isLaunching ? card.accent : `${card.accent}1a`,
            border: `1px solid ${isLaunching ? card.accent : `${card.accent}44`}`,
            color: isLaunching ? '#ffffff' : card.accent,
            opacity: hovered || isLaunching ? 1 : 0,
            transform: hovered || isLaunching ? 'scale(1)' : 'scale(0.85)',
            transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: isLaunching ? `0 0 14px ${card.accent}66` : 'none',
          }}>
            {isLaunching
              ? <><Loader2 size={9} style={{ animation: 'esBlueprintSpin 1s linear infinite' }} /> Launching…</>
              : <><Sparkles size={9} /> Quick Deploy</>
            }
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmptyStateCanvas() {
  const { sendMessage, setChatMode } = useVibeStore()
  const { setSchema }                = useBuilderStore()
  const { t }                        = useTranslation()
  const [launchingId, setLaunchingId] = useState(null)
  const [quickInput,  setQuickInput]  = useState('')

  const handleLaunch = (card) => {
    if (launchingId) return
    setLaunchingId(card.id)
    setChatMode('build')
    // brief pause so the card launch animation is visible before the AI sidebar engages
    setTimeout(() => {
      sendMessage(card.prompt, { setSchema })
      // clear launching state after thinking starts (vibeStore drives it from here)
      setTimeout(() => setLaunchingId(null), 500)
    }, 350)
  }

  const handleQuickPrompt = (prompt) => {
    setChatMode('build')
    sendMessage(prompt, { setSchema })
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px 48px',
      // subtle dot-grid texture
      backgroundImage: 'radial-gradient(circle, #1a1a2e 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Background radial spotlight */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Heading section ── */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', maxWidth: 560 }}>

        {/* START HERE chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 99, marginBottom: 16,
          background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
          fontSize: 10, fontWeight: 800, color: '#00e5ff',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          animation: 'esBlueprintFadeUp 0.5s ease both',
        }}>
          <Zap size={9} />
          {t('canvas_forge_chip')}
        </div>

        {/* Main heading */}
        <h2 style={{
          fontSize: 26, fontWeight: 900, lineHeight: 1.15, marginBottom: 12,
          background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #67e8f9 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'esBlueprintFadeUp 0.55s 0.05s ease both',
        }}>
          {t('canvas_forge_title')}
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 13, color: '#475569', lineHeight: 1.6,
          animation: 'esBlueprintFadeUp 0.55s 0.1s ease both',
        }}>
          {t('canvas_forge_sub')}
        </p>
      </div>

      {/* ── 2×2 Blueprint grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
        width: '100%', maxWidth: 720,
        marginBottom: 32,
        animation: 'esBlueprintFadeUp 0.6s 0.15s ease both',
      }}>
        {BLUEPRINTS.map(card => (
          <BlueprintCard
            key={card.id}
            card={card}
            onLaunch={handleLaunch}
            launchingId={launchingId}
          />
        ))}
      </div>

      {/* ── "or" divider ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        width: '100%', maxWidth: 720, marginBottom: 20,
        animation: 'esBlueprintFadeUp 0.6s 0.2s ease both',
      }}>
        <div style={{ flex: 1, height: 1, background: '#111118' }} />
        <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>{t('canvas_forge_or')}</span>
        <div style={{ flex: 1, height: 1, background: '#111118' }} />
      </div>

      {/* ── Quick prompt chips ── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 720,
        animation: 'esBlueprintFadeUp 0.6s 0.25s ease both',
      }}>
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => handleQuickPrompt(prompt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 99, fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', border: '1px solid #1e293b',
              background: 'rgba(255,255,255,0.02)', color: '#475569',
              fontFamily: 'inherit', transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
              e.currentTarget.style.color = '#a5b4fc'
              e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1e293b'
              e.currentTarget.style.color = '#475569'
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            }}>
            <Sparkles size={10} style={{ opacity: 0.6 }} />
            {prompt}
            <ArrowRight size={10} style={{ opacity: 0.4 }} />
          </button>
        ))}
      </div>

      <style>{`
        @keyframes esBlueprintFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes esBlueprintSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
