import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import { LANGUAGES } from '../i18n/languages'

const ANCHORED  = LANGUAGES.filter(l => l.anchor)
const SECONDARY = LANGUAGES.filter(l => !l.anchor)

export default function LocaleSelector() {
  const { locale, setLocale, t } = useTranslation()
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const [pos,    setPos]    = useState({ top: 52, right: 12 })
  const btnRef   = useRef(null)
  const inputRef = useRef(null)

  const active = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[1]

  const toggle = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
    setSearch('')
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const q = search.toLowerCase()
  const filtered = SECONDARY.filter(
    l =>
      l.label.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.includes(q)
  )
  const anchoredFiltered = ANCHORED.filter(
    l =>
      !q ||
      l.label.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q)
  )

  const select = (code) => {
    setLocale(code)
    setOpen(false)
  }

  return (
    <>
      {/* ── Trigger ── */}
      <button
        ref={btnRef}
        onClick={toggle}
        title={t('i18n_label')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
          background: open ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
          color: open ? '#a5b4fc' : '#64748b',
          fontSize: 12, fontWeight: 600,
          transition: 'all 0.18s',
          flexShrink: 0,
        }}>
        {/* Globe SVG */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="hidden sm:block" style={{ maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.flag}&nbsp;{active.native}
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 98 }} />

          <div style={{
            position: 'fixed', top: pos.top, right: pos.right,
            zIndex: 99, width: 268,
            background: '#07070f',
            border: '1px solid rgba(99,102,241,0.22)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
            animation: 'lsSlideIn 0.2s cubic-bezier(0.34,1.3,0.64,1)',
          }}>

            {/* Header */}
            <div style={{
              padding: '10px 12px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(99,102,241,0.04)',
            }}>
              <p style={{ fontSize: 9.5, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                🌐 {t('i18n_label')}
              </p>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="#475569" strokeWidth="2.5"
                  style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('i18n_search')}
                  style={{
                    width: '100%', padding: '6px 8px 6px 26px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 7, fontSize: 11, color: '#e2e8f0',
                    outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
              {/* Anchored group */}
              {anchoredFiltered.length > 0 && (
                <>
                  <p style={{ fontSize: 8.5, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px 3px' }}>
                    ⭐ {t('i18n_anchored')}
                  </p>
                  {anchoredFiltered.map(lang => (
                    <LangRow key={lang.code} lang={lang} active={locale === lang.code} onClick={() => select(lang.code)} />
                  ))}
                  {!search && (
                    <div style={{ margin: '5px 12px', height: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }} />
                  )}
                  {!search && (
                    <p style={{ fontSize: 8.5, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px 3px' }}>
                      {t('i18n_all')}
                    </p>
                  )}
                </>
              )}

              {/* Secondary group */}
              {filtered.map(lang => (
                <LangRow key={lang.code} lang={lang} active={locale === lang.code} onClick={() => select(lang.code)} />
              ))}

              {filtered.length === 0 && anchoredFiltered.length === 0 && (
                <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 12px' }}>
                  No results
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes lsSlideIn {
          from { opacity:0; transform: translateY(-8px) scale(0.97) }
          to   { opacity:1; transform: translateY(0)     scale(1)    }
        }
      `}</style>
    </>
  )
}

function LangRow({ lang, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: active
          ? 'rgba(99,102,241,0.12)'
          : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.12s',
      }}>
      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{lang.flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#a5b4fc' : '#c4c9d4', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lang.native}
        </p>
        {lang.label !== lang.native && (
          <p style={{ fontSize: 9.5, color: '#334155', margin: 0 }}>{lang.label}</p>
        )}
      </div>
      {active && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}
