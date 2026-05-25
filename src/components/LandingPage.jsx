import { useState, useEffect, useRef } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useMarketingStore } from '../store/marketingStore'
import { useTranslation } from '../i18n'

// ── Pre-computed data (stable across renders) ─────────────────────────────────
const MATRIX_CELLS = Array.from({ length: 40 }, (_, i) => ({
  char:  '01アイウ⬡◈△▷◁ᐊᐅᖃ'.charAt(i % 12),
  alpha: (0.06 + (i * 17 % 9) * 0.08).toFixed(2),
  dur:   (0.4 + (i * 13 % 10) * 0.18).toFixed(2),
  delay: ((i * 7 % 20) * 0.11).toFixed(2),
}))

const SPEC_H = [38, 72, 55, 85, 48, 68, 42, 90, 62, 78, 51, 88, 35, 65, 80, 45]

const TL_CLIPS = [
  { s: 0,  w: 36, c: '#7c3aed', t: 0 }, { s: 38, w: 30, c: '#5b21b6', t: 0 }, { s: 70, w: 28, c: '#4c1d95', t: 0 },
  { s: 0,  w: 60, c: '#dc2626', t: 1 }, { s: 62, w: 35, c: '#b91c1c', t: 1 },
  { s: 0,  w: 94, c: '#065f46', t: 2 },
]

const INFRA_TASKS = [
  { text: 'Wrote login / signup flows',               sub: 'email · password · google_oauth · session_tokens' },
  { text: 'Created user database',                    sub: 'users · bookings · menu_items · reviews · staff'  },
  { text: 'Active Automations: New submission alerts', sub: 'on_booking_created · daily_digest · sms_reminders', live: true },
]

const FREE_F = ['AI Builder — 25 daily generations', 'Studio DAW with 4 tracks', 'Logo Maker — 10 exports / month', 'BG Remover — browser-native ML', 'Auth & basic database', 'Built-in hosting on zaraforge.app']
const PRO_F  = ['Unlimited AI generation credits', 'Studio — unlimited tracks & projects', 'Advanced AI vector & logo tools', 'Multiplayer collaboration', 'Priority cloud hosting & custom domains', 'Full version history & restore']

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Arrow({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-in'); io.unobserve(e.target) } }),
      { threshold: 0.07 }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ── Card accent visuals ───────────────────────────────────────────────────────
function AudioSpectrum() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 68, padding: '0 2px' }}>
      {SPEC_H.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0',
          background: 'linear-gradient(to top, rgba(59,130,246,0.95), rgba(147,197,253,0.5))',
          boxShadow: '0 0 5px rgba(59,130,246,0.45)',
          transformOrigin: 'bottom',
          animation: `specBar${i % 5} ${(0.45 + (i % 4) * 0.14).toFixed(2)}s ease-in-out infinite alternate`,
          animationDelay: `${(i * 0.055).toFixed(2)}s`,
        }} />
      ))}
    </div>
  )
}

function MatrixGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, padding: '2px' }}>
      {MATRIX_CELLS.map((c, i) => (
        <span key={i} style={{
          fontSize: 10, fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.7,
          color: `rgba(16,185,129,${c.alpha})`,
          animation: `matCell ${c.dur}s ease-in-out ${c.delay}s infinite alternate`,
        }}>{c.char}</span>
      ))}
    </div>
  )
}

function TimelineViz() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', paddingBottom: 2 }}>
      {[0, 1, 2].map(t => (
        <div key={t} style={{ position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.02)', borderRadius: 3 }} />
          {TL_CLIPS.filter(c => c.t === t).map((c, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${c.s}%`, width: `${c.w}%`, height: '100%',
              background: c.c, borderRadius: 3, boxShadow: `0 0 6px ${c.c}88`,
            }} />
          ))}
        </div>
      ))}
      <div style={{
        position: 'absolute', left: '41%', top: -2, bottom: -2, width: 1.5,
        background: '#ef4444', boxShadow: '0 0 8px #ef4444, 0 0 2px #ef4444', borderRadius: 1,
      }} />
    </div>
  )
}

function BezierSVG() {
  return (
    <svg viewBox="0 0 220 110" style={{ width: '100%', opacity: 0.75 }}>
      <defs>
        <linearGradient id="bezG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#d97706" />
          <stop offset="50%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M20 90 C 70 10, 150 10, 200 90" stroke="url(#bezG)" fill="none" strokeWidth="1.5" />
      <path d="M10 55 C 55 5, 100 100, 145 55 S 190 5, 210 55" stroke="rgba(251,191,36,0.35)" fill="none" strokeWidth="1" />
      <path d="M30 80 C 80 30, 140 80, 190 30" stroke="rgba(251,191,36,0.2)" fill="none" strokeWidth="0.8" strokeDasharray="4 3" />
      {[[20,90],[200,90],[110,15],[70,10],[150,10]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={i<2?3:2} fill={i<2?'#f59e0b':'rgba(251,191,36,0.5)'} />
      ))}
    </svg>
  )
}

function ProductPreview() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden', height: '100%', minHeight: 300,
      boxShadow: '0 0 40px rgba(16,185,129,0.08), 0 0 0 1px rgba(16,185,129,0.1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        {[['🎨 Canvas', true], ['⚙️ Props', false], ['📦 Assets', false]].map(([label, active]) => (
          <div key={label} style={{
            padding: '9px 16px', fontSize: 10.5, fontWeight: 700,
            color: active ? '#34d399' : 'rgba(255,255,255,0.2)',
            borderBottom: active ? '1.5px solid #34d399' : '1.5px solid transparent',
            cursor: 'pointer',
          }}>{label}</div>
        ))}
      </div>
      {/* Fake canvas */}
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Mock component blocks */}
        {[
          { w: '80%', h: 10, bg: 'rgba(99,102,241,0.25)', glow: '#6366f1' },
          { w: '55%', h: 6,  bg: 'rgba(16,185,129,0.2)',  glow: '#10b981' },
          { w: '90%', h: 40, bg: 'rgba(255,255,255,0.03)', glow: null      },
          { w: '45%', h: 8,  bg: 'rgba(245,158,11,0.2)',  glow: '#f59e0b' },
          { w: '70%', h: 6,  bg: 'rgba(59,130,246,0.2)',  glow: '#3b82f6' },
        ].map((b, i) => (
          <div key={i} style={{
            width: b.w, height: b.h, borderRadius: 4,
            background: b.bg,
            boxShadow: b.glow ? `0 0 8px ${b.glow}44` : 'none',
            border: b.glow ? `1px solid ${b.glow}33` : '1px solid rgba(255,255,255,0.04)',
          }} />
        ))}
        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {[['4', 'Modules'], ['∞', 'Potential'], ['1', 'Workspace']].map(([n, l]) => (
            <div key={l} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10, textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#f59e0b' }}>{n}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CSS string ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lp-root {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #090A0F;
  color: #e2e8f0;
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Scroll reveal */
.lp-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.75s ease, transform 0.75s ease; }
.lp-reveal.lp-in { opacity: 1; transform: translateY(0); }
.lp-d1 { transition-delay: 0.12s; }
.lp-d2 { transition-delay: 0.24s; }
.lp-d3 { transition-delay: 0.36s; }

/* Metallic shimmer headline */
.lp-metal {
  background: linear-gradient(120deg, #94a3b8 0%, #f8fafc 25%, #f59e0b 48%, #fbbf24 56%, #f8fafc 72%, #94a3b8 100%);
  background-size: 220% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lpMetalSweep 5.5s linear infinite;
  text-shadow: none;
  filter: drop-shadow(0 0 32px rgba(245,158,11,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.6));
}
@keyframes lpMetalSweep {
  from { background-position: 0% center; }
  to   { background-position: 220% center; }
}

/* Gold accent text */
.lp-gold {
  background: linear-gradient(120deg, #b45309 0%, #f59e0b 40%, #fbbf24 60%, #b45309 100%);
  background-size: 220% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lpGoldSweep 4s linear infinite;
}
@keyframes lpGoldSweep {
  from { background-position: 0% center; }
  to   { background-position: 220% center; }
}

/* Animated gradient border wrapper */
.lp-grad-border {
  background: linear-gradient(90deg, #10b981, #dc2626, #3b82f6, #10b981);
  background-size: 300% auto;
  animation: lpBorderCycle 3s linear infinite;
  padding: 1.5px;
  border-radius: 14px;
  display: inline-flex;
}
@keyframes lpBorderCycle {
  from { background-position: 0% center; }
  to   { background-position: 100% center; }
}

/* Blobs */
@keyframes lpBlob1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%  { transform: translate(80px,-55px) scale(1.15); }
  66%  { transform: translate(-40px,60px) scale(0.88); }
}
@keyframes lpBlob2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%  { transform: translate(-75px,45px) scale(1.12); }
  66%  { transform: translate(55px,-65px) scale(0.9); }
}
@keyframes lpBlob3 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%  { transform: translate(65px,90px) scale(1.08); }
  66%  { transform: translate(-55px,-45px) scale(0.93); }
}

/* Spectrum bars */
@keyframes specBar0 { from{transform:scaleY(0.32)} to{transform:scaleY(1)} }
@keyframes specBar1 { from{transform:scaleY(0.55)} to{transform:scaleY(1)} }
@keyframes specBar2 { from{transform:scaleY(0.22)} to{transform:scaleY(1)} }
@keyframes specBar3 { from{transform:scaleY(0.6)}  to{transform:scaleY(1)} }
@keyframes specBar4 { from{transform:scaleY(0.38)} to{transform:scaleY(1)} }

/* Matrix */
@keyframes matCell { from{opacity:0.04} to{opacity:1} }

/* Terminal tasks */
@keyframes termIn { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
.lp-t0 { animation: termIn 0.45s ease 0.4s  forwards; opacity: 0; }
.lp-t1 { animation: termIn 0.45s ease 1.1s  forwards; opacity: 0; }
.lp-t2 { animation: termIn 0.45s ease 1.8s  forwards; opacity: 0; }

/* Cursor */
@keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }

/* Live pulse */
@keyframes lpLive { 0%,100%{opacity:1;box-shadow:0 0 7px #10b981} 50%{opacity:0.35;box-shadow:0 0 2px #10b981} }

/* Flag gradient glow */
@keyframes lpFlagGlow { 0%,100%{opacity:0.75} 50%{opacity:1} }

/* Nav hover */
.lp-nav-btn { transition: background 0.15s, color 0.15s; }
.lp-nav-btn:hover { background: rgba(255,255,255,0.07) !important; color: #e2e8f0 !important; }

/* Card hovers */
.lp-c-studio:hover  { border-color: rgba(59,130,246,0.5)  !important; box-shadow: 0 0 36px rgba(59,130,246,0.2),  0 8px 32px rgba(0,0,0,0.4) !important; }
.lp-c-builder:hover { border-color: rgba(16,185,129,0.5)  !important; box-shadow: 0 0 36px rgba(16,185,129,0.2), 0 8px 32px rgba(0,0,0,0.4) !important; }
.lp-c-video:hover   { border-color: rgba(220,38,38,0.5)   !important; box-shadow: 0 0 36px rgba(220,38,38,0.2),  0 8px 32px rgba(0,0,0,0.4) !important; }
.lp-c-logo:hover    { border-color: rgba(245,158,11,0.5)  !important; box-shadow: 0 0 36px rgba(245,158,11,0.2), 0 8px 32px rgba(0,0,0,0.4) !important; }
.lp-c-bgr:hover     { border-color: rgba(245,158,11,0.45) !important; box-shadow: 0 0 36px rgba(245,158,11,0.15),0 8px 32px rgba(0,0,0,0.4) !important; }
.lp-hero-inner:hover  { background: #15161f !important; }
.lp-cta-pill:hover    { background: #1a1a2e !important; transform: translateY(-2px); box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important; }
.lp-sec-btn:hover     { border-color: rgba(255,255,255,0.22) !important; color: #e2e8f0 !important; }
.lp-flink:hover       { color: #e2e8f0 !important; }
.lp-pfree:hover       { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.2) !important; }
.lp-ppro:hover        { box-shadow: 0 12px 36px rgba(16,185,129,0.55) !important; transform: translateY(-1px); }

/* Responsive */
@media (max-width: 960px) {
  .lp-suite-grid { grid-template-columns: 1fr 1fr !important; }
  .lp-suite-grid .lp-c-builder { grid-column: 1 / 3 !important; }
  .lp-infra-grid, .lp-about-grid { grid-template-columns: 1fr !important; }
  .lp-nav-center { display: none !important; }
}
@media (max-width: 600px) {
  .lp-suite-grid { grid-template-columns: 1fr !important; }
  .lp-suite-grid .lp-c-builder { grid-column: 1 !important; }
  .lp-pricing-grid { grid-template-columns: 1fr !important; }
  .lp-cta-card { padding: 44px 28px !important; }
  .lp-hero-btns { flex-direction: column !important; align-items: stretch !important; }
}
`

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { enterApp } = useBuilderStore()
  const { landingCopy, marketingPricing } = useMarketingStore()
  const { t } = useTranslation()
  const [navScrolled, setNavScrolled] = useState(false)
  const containerRef = useRef(null)

  useReveal()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const fn = () => setNavScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [])

  const launch  = (mode) => enterApp(mode)
  const scrollTo = (id)  => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Glass card base style
  const glass = {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
    borderRadius: 24,
    transition: 'all 0.3s ease',
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-root" ref={containerRef} style={{ height: '100vh', overflowY: 'auto', scrollBehavior: 'smooth' }}>

        {/* ━━━━━━━━━━━━━━  NAV  ━━━━━━━━━━━━━━ */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: navScrolled ? 'rgba(9,10,15,0.88)' : 'rgba(9,10,15,0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${navScrolled ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
          transition: 'all 0.25s',
        }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 36 }}>
            <img src="/zaraforge-logo.png" alt="ZaraForge" style={{ height: 32, width: 'auto', objectFit: 'contain', cursor: 'pointer', filter: 'brightness(1.1)' }} onClick={() => scrollTo('lp-hero')} />

            <div className="lp-nav-center" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {[['Features', 'lp-suite'], ['Platform', 'lp-infra'], ['About', 'lp-about'], ['Pricing', 'lp-pricing']].map(([label, id]) => (
                <button key={id} className="lp-nav-btn" onClick={() => scrollTo(id)} style={{
                  fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.55)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 13px', borderRadius: 9, fontFamily: 'inherit',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              <button className="lp-nav-btn" onClick={() => launch('builder')} style={{
                fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
                background: 'none', border: '1px solid transparent', cursor: 'pointer',
                padding: '8px 16px', borderRadius: 10, fontFamily: 'inherit',
              }}>{t('auth_sign_in')}</button>
              <div className="lp-grad-border">
                <button className="lp-hero-inner" onClick={() => launch('builder')} style={{
                  fontSize: 13.5, fontWeight: 700, color: '#e2e8f0',
                  background: '#0d0e16', border: 'none', cursor: 'pointer',
                  padding: '9px 20px', borderRadius: 12.5, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  transition: 'background 0.2s',
                }}>
                  {t('cta_start')} <Arrow size={12} />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ━━━━━━━━━━━━━━  HERO  ━━━━━━━━━━━━━━ */}
        <section id="lp-hero" style={{ position: 'relative', padding: '136px 32px 160px', textAlign: 'center', overflow: 'hidden', background: '#090A0F' }}>

          {/* Floating blobs */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-18%', left: '-12%',
              width: '55%', height: '75%', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 68%)',
              animation: 'lpBlob1 9s ease-in-out infinite',
              filter: 'blur(2px)',
            }} />
            <div style={{
              position: 'absolute', top: '-15%', right: '-18%',
              width: '52%', height: '70%', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(59,130,246,0.16) 0%, transparent 65%)',
              animation: 'lpBlob2 11s ease-in-out infinite',
              filter: 'blur(2px)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-28%', left: '18%',
              width: '48%', height: '65%', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(220,38,38,0.13) 0%, transparent 62%)',
              animation: 'lpBlob3 13s ease-in-out infinite',
              filter: 'blur(2px)',
            }} />
            {/* Noise overlay */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.03,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }} />
          </div>

          <div className="lp-reveal" style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              marginBottom: 40, backdropFilter: 'blur(10px)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'lpLive 2s ease-in-out infinite' }} />
              Powered by AI &nbsp;·&nbsp; Now in early access
            </div>

            {/* Headline */}
            <h1 className="lp-metal" style={{
              fontSize: 'clamp(52px, 9.5vw, 104px)',
              fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.038em',
              marginBottom: 30, whiteSpace: 'pre-line',
            }}>
              {t('hero_title') || landingCopy.heroHeadline}
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 'clamp(15px, 1.9vw, 19px)', fontWeight: 400,
              color: 'rgba(255,255,255,0.45)', lineHeight: 1.75,
              maxWidth: 620, margin: '0 auto 52px',
            }}>
              {t('hero_sub') || landingCopy.heroSubheadline}
            </p>

            {/* Buttons */}
            <div className="lp-hero-btns" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              {/* Glowing gradient border CTA */}
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <div style={{
                  position: 'absolute', inset: -14, borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(16,185,129,0.28) 0%, transparent 72%)',
                  pointerEvents: 'none', animation: 'lpFlagGlow 2.5s ease-in-out infinite',
                }} />
                <div className="lp-grad-border" style={{ position: 'relative' }}>
                  <button className="lp-hero-inner" onClick={() => launch('builder')} style={{
                    fontSize: 15.5, fontWeight: 800, color: '#f1f5f9',
                    background: '#0d0e18', border: 'none', cursor: 'pointer',
                    padding: '16px 34px', borderRadius: 12.5, fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.2s', letterSpacing: '-0.01em',
                  }}>
                    {t('cta_start')} <Arrow />
                  </button>
                </div>
              </div>

              <button className="lp-sec-btn" onClick={() => scrollTo('lp-suite')} style={{
                fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                padding: '15px 30px', borderRadius: 13, fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 9,
                transition: 'all 0.2s', backdropFilter: 'blur(10px)',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none"/></svg>
                {t('cta_demo')}
              </button>
            </div>

            {/* Social proof */}
            <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
              {[['⚡', 'No code required'], ['🔐', 'Auth included'], ['🌍', 'Deploy in seconds'], ['🎵', 'Studio + Builder + Logo']].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  01/02 SUITE DECK  ━━━━━━━━━━━━━━ */}
        <section id="lp-suite" style={{ padding: '130px 32px', background: '#090A0F', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>

            {/* Section tag */}
            <div className="lp-reveal" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span className="lp-gold" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                01 / 02 &nbsp; The Complete Creative Suite
              </span>
              <div style={{ flex: '0 0 36px', height: 1, background: 'rgba(245,158,11,0.3)' }} />
            </div>

            <h2 className="lp-reveal lp-d1" style={{
              fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900,
              letterSpacing: '-0.025em', color: '#f1f5f9', lineHeight: 1.1, marginBottom: 64,
              maxWidth: 520,
            }}>
              Four powerful tools.<br />One unified workspace.
            </h2>

            {/* Asymmetric 3-col grid */}
            <div className="lp-suite-grid lp-reveal lp-d2" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 14,
            }}>

              {/* BUILDER — spans 2 cols */}
              <div className="lp-glass lp-c-builder" style={{ ...glass, gridColumn: '1 / 3', padding: 32, cursor: 'pointer' }} onClick={() => launch('builder')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 26 }}>📐</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>Builder — Conversational App Engine</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{landingCopy.builderSub}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {['AI Codegen', 'Live Deploy', 'Auto DB'].map(t => (
                      <span key={t} style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                {/* Green matrix */}
                <div style={{ background: 'rgba(16,185,129,0.03)', borderRadius: 14, padding: 14, border: '1px solid rgba(16,185,129,0.08)', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'lpLive 1.8s ease-in-out infinite' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(16,185,129,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Engine · Active</span>
                  </div>
                  <MatrixGrid />
                </div>
              </div>

              {/* STUDIO — right col, spans 2 rows */}
              <div className="lp-glass lp-c-studio" style={{ ...glass, padding: 28, gridColumn: '3', gridRow: '1 / 3', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => launch('studio')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>🎤</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Studio</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{landingCopy.studioSub}</div>
                  </div>
                </div>
                {/* Blue spectrum */}
                <div style={{ flex: 1, background: 'rgba(59,130,246,0.04)', borderRadius: 12, padding: 14, border: '1px solid rgba(59,130,246,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <AudioSpectrum />
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    {['80 Hz', '500 Hz', '2 kHz', '12 kHz'].map(f => (
                      <span key={f} style={{ fontSize: 8.5, color: 'rgba(59,130,246,0.5)', fontFamily: 'monospace' }}>{f}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Web Audio API', 'Pitch Correction', 'WAV Export'].map(t => (
                    <span key={t} style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* VIDEO EDITOR */}
              <div className="lp-glass lp-c-video" style={{ ...glass, padding: 28, cursor: 'pointer' }} onClick={() => launch('video')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>🎬</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Video Editor</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{landingCopy.videoSub}</div>
                  </div>
                </div>
                {/* Red timeline */}
                <div style={{ background: 'rgba(220,38,38,0.04)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(220,38,38,0.1)' }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(220,38,38,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Timeline — 00:30</div>
                  <TimelineViz />
                </div>
              </div>

              {/* LOGO MAKER */}
              <div className="lp-glass lp-c-logo" style={{ ...glass, padding: 28, cursor: 'pointer' }} onClick={() => launch('logo')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>🎨</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Logo Maker</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{landingCopy.logoSub}</div>
                  </div>
                </div>
                <BezierSVG />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {['SVG Export', 'Brand Kit'].map(t => (
                    <span key={t} style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* BG REMOVER */}
              <div className="lp-glass lp-c-bgr" style={{ ...glass, padding: 28, cursor: 'pointer' }} onClick={() => launch('bgremover')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>✂️</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>BG Remover</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{landingCopy.bgrSub}</div>
                  </div>
                </div>
                {/* Cutout grid art */}
                <div style={{
                  borderRadius: 10, overflow: 'hidden', aspectRatio: '2/1',
                  backgroundImage: 'linear-gradient(rgba(245,158,11,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.06) 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                  border: '1px solid rgba(245,158,11,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1.5px dashed rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✂️</div>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>On-Device ML</span>
              </div>

            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  02/02 BACKEND ENGINE  ━━━━━━━━━━━━━━ */}
        <section id="lp-infra" style={{ padding: '130px 32px', background: '#090A0F', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>

            <div className="lp-reveal" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span className="lp-gold" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                02 / 02 &nbsp; Backend? Already done.
              </span>
              <div style={{ flex: '0 0 36px', height: 1, background: 'rgba(245,158,11,0.3)' }} />
            </div>

            <div className="lp-infra-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

              {/* Left copy */}
              <div className="lp-reveal">
                <h2 style={{ fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 900, letterSpacing: '-0.025em', color: '#f1f5f9', lineHeight: 1.1, marginBottom: 18 }}>
                  Your entire backend,<br />built automatically.
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, marginBottom: 44 }}>
                  User login, data storage, and automated background agents — all built in, no extra setup needed. ZaraForge scaffolds your full-stack infrastructure the moment you describe your app.
                </p>
                {[
                  ['🔐', 'Authentication & Sessions', 'Complete login, signup, and OAuth flows generated on demand.', '#3b82f6'],
                  ['🗄️', 'Auto-Generated Database', 'Relational schema created directly from your natural language prompt.', '#10b981'],
                  ['⚡', 'Live Automations', 'Triggers, alerts, and scheduled background agents — active immediately.', '#f59e0b'],
                ].map(([icon, title, desc, accent]) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${accent}14`, border: `1px solid ${accent}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                    }}>{icon}</div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{title}</h4>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Glass terminal */}
              <div className="lp-reveal lp-d1">
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 32px 80px rgba(0,0,0,0.5)',
                }}>
                  {/* Traffic lights */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                      ZaraForge · Infrastructure Agent
                    </span>
                  </div>

                  <div style={{ padding: 24 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', marginBottom: 18, fontFamily: 'monospace' }}>
                      // Generated for: "Booking app for Aria's Kitchen"
                    </p>

                    {INFRA_TASKS.map((task, i) => (
                      <div key={i} className={`lp-t${i}`} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px', borderRadius: 12, marginBottom: 10,
                        background: task.live ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${task.live ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: task.live ? 'rgba(99,102,241,0.14)' : 'rgba(16,185,129,0.12)',
                          border: `1.5px solid ${task.live ? 'rgba(99,102,241,0.38)' : 'rgba(16,185,129,0.35)'}`,
                          fontSize: 9, color: task.live ? '#a5b4fc' : '#34d399', fontWeight: 900,
                        }}>✓</div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3, marginBottom: 4 }}>{task.text}</p>
                          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{task.sub}</p>
                        </div>
                      </div>
                    ))}

                    {/* Cursor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, paddingLeft: 4 }}>
                      <span style={{ fontSize: 12, color: 'rgba(16,185,129,0.6)', fontFamily: 'monospace', fontWeight: 700 }}>→</span>
                      <span style={{ width: 7, height: 15, background: '#10b981', borderRadius: 1, display: 'inline-block', animation: 'termBlink 1.1s step-end infinite', opacity: 0.7 }} />
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '7px 14px', borderRadius: 99, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'lpLive 1.9s ease-in-out infinite' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.04em' }}>Infrastructure agent · live</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  ABOUT  ━━━━━━━━━━━━━━ */}
        <section id="lp-about" style={{ padding: '130px 32px', background: '#090A0F', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>

            <div className="lp-reveal" style={{ marginBottom: 72, textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 900, letterSpacing: '-0.028em', lineHeight: 1.08 }}>
                <span className="lp-gold">Forged for Creators,</span><br />
                <span style={{ color: '#f1f5f9' }}>by Creators</span>
              </h2>
            </div>

            <div className="lp-about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'stretch' }}>

              {/* Bio card */}
              <div className="lp-glass lp-reveal" style={{ ...glass, padding: 44 }}>
                <img src="/zaraforge-logo.png" alt="ZaraForge" style={{ height: 34, width: 'auto', objectFit: 'contain', marginBottom: 32, opacity: 0.8 }} />
                <h3 style={{ fontSize: 21, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.015em', marginBottom: 22, lineHeight: 1.3 }}>
                  A platform built from passion and purpose
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.85, marginBottom: 18 }}>
                  ZaraForge was born from a conviction that elite modern technology should be accessible to every creator on the planet — regardless of technical background, geography, or resources.
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.85, marginBottom: 18 }}>
                  Rooted in a heritage of craftsmanship — proudly drawing from an Eritrean engineering lineage built on resilience and ingenuity — and driven by the belief that the gap between idea and execution should not exist, we built a unified workspace that dissolves technical barriers for artists, producers, and developers everywhere.
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.85 }}>
                  From independent artists producing their first track, to startups launching production apps, to designers crafting brand identities — ZaraForge is engineered for the ambitious and the limitless.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
                  {['AI-First Platform', 'No-Code to Pro-Code', 'Global Creators', 'Built with Heritage', 'Privacy-First'].map(tag => (
                    <span key={tag} style={{
                      padding: '5px 13px', borderRadius: 99, fontSize: 11.5, fontWeight: 600,
                      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Product preview card */}
              <div className="lp-glass lp-reveal lp-d1" style={{
                ...glass,
                padding: 28,
                boxShadow: '0 0 0 1px rgba(16,185,129,0.1), 0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                  Founder Workspace Preview
                </div>
                <div style={{ flex: 1 }}>
                  <ProductPreview />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  PRICING  ━━━━━━━━━━━━━━ */}
        <section id="lp-pricing" style={{ padding: '130px 32px', background: '#090A0F', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
              <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 900, letterSpacing: '-0.028em', color: '#f1f5f9', marginBottom: 16 }}>
                Pricing plans for every need
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.35)', maxWidth: 400, margin: '0 auto', lineHeight: 1.65 }}>
                Scale as you grow with plans designed to match your ambition.
              </p>
            </div>

            <div className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 860, margin: '0 auto' }}>

              {/* Free */}
              <div className="lp-glass lp-reveal" style={{ ...glass, padding: 40 }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Starter</p>
                <p style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1, color: '#f1f5f9', marginBottom: 6 }}>Free</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 30 }}>Forever. No card required.</p>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
                  {FREE_F.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ width: 19, height: 19, borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, fontWeight: 900 }}>✓</div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="lp-pfree" onClick={() => launch('builder')} style={{
                  width: '100%', padding: 15, borderRadius: 13, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                  transition: 'all 0.2s',
                }}>
                  Start building →
                </button>
              </div>

              {/* Pro */}
              <div className="lp-reveal lp-d1" style={{
                ...glass,
                padding: 40, position: 'relative', overflow: 'hidden',
                border: '1px solid rgba(16,185,129,0.25)',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.1), 0 28px 70px rgba(0,0,0,0.4)',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.1) 0%, transparent 100%)', pointerEvents: 'none' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, marginBottom: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', position: 'relative' }}>⚡ Most Popular</div>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10, position: 'relative' }}>Pro</p>
                <p style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1, color: '#f1f5f9', marginBottom: 6, position: 'relative' }}>${marketingPricing.pro.monthly}<span style={{ fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>/mo</span></p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 30, position: 'relative' }}>From ${marketingPricing.pro.monthly} / month · cancel anytime</p>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28, position: 'relative' }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36, position: 'relative' }}>
                  {PRO_F.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
                      <div style={{ width: 19, height: 19, borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, fontWeight: 900 }}>✓</div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="lp-ppro" onClick={() => window.open('https://buy.stripe.com/28E6oI92PeRk1F66173ZK00', '_blank')} style={{
                  width: '100%', padding: 15, borderRadius: 13, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#fff', position: 'relative',
                  transition: 'all 0.2s', boxShadow: '0 6px 24px rgba(16,185,129,0.35)',
                }}>
                  Get Pro access →
                </button>
              </div>

            </div>

            <p style={{ textAlign: 'center', marginTop: 36, fontSize: 13.5, color: 'rgba(255,255,255,0.25)' }}>
              Looking for enterprise solutions?{' '}
              <a href="mailto:hello@zaraforge.app" style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 1 }}>Contact sales →</a>
            </p>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  FINAL CTA  ━━━━━━━━━━━━━━ */}
        <section style={{ padding: '0 0 0 0', position: 'relative', overflow: 'hidden' }}>
          {/* Flag gradient block */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, rgba(5,150,105,0.55) 0%, rgba(220,38,38,0.45) 45%, rgba(37,99,235,0.5) 100%)',
            animation: 'lpFlagGlow 5s ease-in-out infinite',
          }} />
          {/* Deep dark base */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, #090A0F 100%)' }} />
          {/* Dot texture */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='1' cy='1' r='1.2' fill='white'/%3E%3C/svg%3E\")",
            backgroundSize: '36px 36px',
          }} />

          <div className="lp-reveal lp-cta-card" style={{
            position: 'relative', zIndex: 1,
            maxWidth: 580, margin: '0 auto',
            padding: '120px 32px',
            textAlign: 'center',
          }}>
            {/* White glass capsule */}
            <div style={{
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 28,
              padding: '68px 64px',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 48px 100px rgba(0,0,0,0.45), 0 16px 40px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
            }}>
              <h2 style={{
                fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 900,
                letterSpacing: '-0.028em', color: '#09090b',
                lineHeight: 1.1, marginBottom: 16,
              }}>
                So, what are we<br />building?
              </h2>
              <p style={{ fontSize: 15, color: '#71717a', marginBottom: 44, lineHeight: 1.65 }}>
                Join the creators who've stopped waiting<br />and started shipping.
              </p>
              <button className="lp-cta-pill" onClick={() => launch('builder')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '18px 40px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                background: '#09090b', color: '#fff', letterSpacing: '-0.01em',
                transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              }}>
                Get started <Arrow />
              </button>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━  FOOTER  ━━━━━━━━━━━━━━ */}
        <footer style={{ padding: '36px 32px', background: '#090A0F', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <img src="/zaraforge-logo.png" alt="ZaraForge" style={{ height: 26, width: 'auto', opacity: 0.35, cursor: 'pointer' }} onClick={() => scrollTo('lp-hero')} />
            <div style={{ display: 'flex', gap: 28 }}>
              {[['Features', 'lp-suite'], ['Platform', 'lp-infra'], ['About', 'lp-about'], ['Pricing', 'lp-pricing']].map(([label, id]) => (
                <button key={id} className="lp-flink" onClick={() => scrollTo(id)} style={{
                  fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.22)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'color 0.15s',
                }}>{label}</button>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>© 2026 ZaraForge. Built for limitless creators.</p>
          </div>
        </footer>

      </div>
    </>
  )
}
