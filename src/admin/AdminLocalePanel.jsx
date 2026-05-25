import { useEffect, useRef, useState } from 'react'
import { LANGUAGES } from '../i18n/languages'
import {
  getBaseDict, saveAdminOverride, resetAdminOverrides, exportLocaleJSON,
} from '../i18n'

const PANEL  = '#08080f'
const PANEL2 = '#0d0d1a'
const BORDER = 'rgba(255,255,255,0.07)'
const GOLD   = '#f59e0b'

// ── All known translation keys (union of en.json) ─────────────────────────────
function getAllKeys() {
  const en = getBaseDict('en')
  return Object.keys(en).sort()
}

// ── Single editable cell ──────────────────────────────────────────────────────
function Cell({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const ref = useRef(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        rows={2}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() } if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        style={{
          width: '100%', background: 'rgba(99,102,241,0.08)',
          border: '1.5px solid rgba(99,102,241,0.5)',
          borderRadius: 6, padding: '5px 7px',
          fontSize: 11, color: '#c7d2fe', resize: 'vertical',
          fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    )
  }
  return (
    <div
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
      style={{
        fontSize: 11, color: value ? '#94a3b8' : '#1e293b',
        cursor: 'text', padding: '4px 6px', borderRadius: 6,
        border: '1px solid transparent',
        lineHeight: 1.5, minHeight: 28,
        transition: 'border 0.15s',
        wordBreak: 'break-word',
      }}
      onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
    >
      {value || <span style={{ color: '#1e293b', fontStyle: 'italic' }}>—</span>}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminLocalePanel() {
  const [activeLang, setActiveLang] = useState('tg')
  const [search,     setSearch]     = useState('')
  const [overrides,  setOverrides]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('zf_locale_overrides') ?? '{}') } catch { return {} }
  })
  const [saved,      setSaved]      = useState(true)
  const [flash,      setFlash]      = useState(false)

  const keys = getAllKeys().filter(k => !search || k.includes(search.toLowerCase()))
  const enDict   = getBaseDict('en')
  const langDict = getBaseDict(activeLang)

  const getVal = (key) =>
    overrides[activeLang]?.[key] ?? langDict[key] ?? ''

  const handleEdit = (key, val) => {
    const next = {
      ...overrides,
      [activeLang]: { ...(overrides[activeLang] ?? {}), [key]: val },
    }
    setOverrides(next)
    saveAdminOverride(activeLang, key, val)
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 1800)
  }

  const handleReset = () => {
    if (!window.confirm('Reset ALL admin overrides across all languages?')) return
    resetAdminOverrides()
    setOverrides({})
    setSaved(true)
  }

  const hasOverride = (key) => !!overrides[activeLang]?.[key]

  const activeLangMeta = LANGUAGES.find(l => l.code === activeLang)

  return (
    <div style={{ color: '#e2e8f0' }}>
      {/* ── Panel header ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.02em' }}>
          🌐 Global Translation & Localization Matrix
        </h2>
        <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', fontWeight: 500 }}>
          Edit translation strings across all supported languages in real-time — no JSON file editing required
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search keys…"
            style={{
              width: '100%', padding: '7px 9px 7px 26px',
              background: PANEL2, border: `1px solid ${BORDER}`,
              borderRadius: 8, fontSize: 11, color: '#e2e8f0',
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
            background: flash ? 'rgba(52,211,153,0.15)' : saved ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.15)',
            border: flash ? '1px solid rgba(52,211,153,0.4)' : saved ? `1px solid ${BORDER}` : '1px solid rgba(99,102,241,0.4)',
            color: flash ? '#34d399' : saved ? '#475569' : '#a5b4fc',
            transition: 'all 0.2s',
          }}>
          {flash ? '✓ Saved' : saved ? 'No changes' : '💾 Save Changes'}
        </button>

        {/* Export */}
        <button
          onClick={() => exportLocaleJSON(activeLang)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
            background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.25)`,
            color: GOLD, transition: 'all 0.2s',
          }}>
          ↓ Export {activeLangMeta?.flag}
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', transition: 'all 0.2s',
          }}>
          ↺ Reset All
        </button>
      </div>

      {/* ── Language tab strip ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        background: PANEL2, borderRadius: 10, padding: 4,
        border: `1px solid ${BORDER}`, overflowX: 'auto',
      }}>
        {LANGUAGES.map(lang => {
          const isActive   = lang.code === activeLang
          const hasEdits   = !!overrides[lang.code] && Object.keys(overrides[lang.code]).length > 0
          return (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang.code)}
              style={{
                padding: '5px 10px', borderRadius: 7, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap', flexShrink: 0, position: 'relative',
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : '#475569',
                transition: 'all 0.15s',
              }}>
              {lang.flag} {lang.label}
              {hasEdits && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#f59e0b',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Key-value grid ── */}
      <div style={{
        background: PANEL2,
        border: `1px solid ${BORDER}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* Grid header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '220px 1fr 1fr',
          background: PANEL, borderBottom: `1px solid ${BORDER}`,
          padding: '8px 14px',
        }}>
          {['Key', `English (en)`, `${activeLangMeta?.flag ?? ''} ${activeLangMeta?.label ?? activeLang}`].map((h, i) => (
            <span key={i} style={{ fontSize: 9.5, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Grid rows */}
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {keys.map(key => (
            <div key={key} style={{
              display: 'grid', gridTemplateColumns: '220px 1fr 1fr',
              borderBottom: `1px solid ${BORDER}`,
              background: hasOverride(key) ? 'rgba(99,102,241,0.04)' : 'transparent',
              transition: 'background 0.15s',
            }}>
              {/* Key name */}
              <div style={{ padding: '6px 14px', borderRight: `1px solid ${BORDER}` }}>
                <code style={{
                  fontSize: 9.5, color: hasOverride(key) ? '#818cf8' : '#334155',
                  fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5,
                }}>
                  {hasOverride(key) && <span style={{ color: '#f59e0b', marginRight: 4 }}>*</span>}
                  {key}
                </code>
              </div>

              {/* English value (read-only reference) */}
              <div style={{ padding: '4px 10px', borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: '#475569', padding: '4px 6px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {enDict[key] ?? <span style={{ color: '#1e293b', fontStyle: 'italic' }}>—</span>}
                </div>
              </div>

              {/* Target language — editable */}
              <div style={{ padding: '4px 10px' }}>
                <Cell
                  value={getVal(key)}
                  onChange={val => handleEdit(key, val)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats footer */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 10.5, color: '#334155' }}>
        <span>{keys.length} keys shown</span>
        <span>
          {Object.keys(overrides[activeLang] ?? {}).length} admin overrides for {activeLangMeta?.flag} {activeLangMeta?.label}
        </span>
        <span>* = overridden value</span>
      </div>
    </div>
  )
}
