import { useRef, useEffect, useMemo, useState } from 'react'
import { Code2, FileJson, FileText, Zap, RefreshCw, Copy, Check } from 'lucide-react'
import { useCVStore } from '../store/codeViewStore'

const FILES = ['App.jsx', 'styles.css', 'DatabaseSchema.json', 'ServerlessFunctions.js']

const LANG_MAP = {
  'App.jsx':                'jsx',
  'styles.css':             'css',
  'DatabaseSchema.json':    'json',
  'ServerlessFunctions.js': 'js',
}

const FILE_ICONS = {
  'App.jsx':                Code2,
  'styles.css':             FileText,
  'DatabaseSchema.json':    FileJson,
  'ServerlessFunctions.js': Zap,
}

const FILE_COLORS = {
  'App.jsx':                '#61dafb',
  'styles.css':             '#38bdf8',
  'DatabaseSchema.json':    '#f59e0b',
  'ServerlessFunctions.js': '#a78bfa',
}

// ── Syntax highlighter ────────────────────────────────────────────────────────
function highlight(code, lang) {
  if (!code) return ''
  const stash = []

  function stashItem(type, val) {
    const i = stash.length
    stash.push([type, val])
    return `__ZF${i}ZF__`
  }

  let s = code

  if (lang === 'jsx' || lang === 'js') {
    s = s.replace(/\/\/[^\n]*/g,           m => stashItem('comment', m))
    s = s.replace(/\/\*[\s\S]*?\*\//g,     m => stashItem('comment', m))
    s = s.replace(/`(?:[^`\\]|\\.)*`/g,    m => stashItem('string',  m))
    s = s.replace(/'(?:[^'\\]|\\.)*'/g,    m => stashItem('string',  m))
    s = s.replace(/"(?:[^"\\]|\\.)*"/g,    m => stashItem('string',  m))
  } else if (lang === 'css') {
    s = s.replace(/\/\*[\s\S]*?\*\//g,     m => stashItem('comment', m))
    s = s.replace(/'(?:[^'\\]|\\.)*'/g,    m => stashItem('string',  m))
    s = s.replace(/"(?:[^"\\]|\\.)*"/g,    m => stashItem('string',  m))
  }

  // HTML escape (stash tokens use only \w chars — survive escaping)
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (lang === 'jsx' || lang === 'js') {
    const KW = 'import|export|from|default|const|let|var|function|async|await|return|if|else|for|while|of|in|class|extends|new|this|typeof|instanceof|null|undefined|true|false|try|catch|finally|throw|switch|case|break|continue|yield|void|delete'
    s = s.replace(new RegExp(`\\b(${KW})\\b`, 'g'), '<b class="hl-kw">$1</b>')
    s = s.replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, '<b class="hl-num">$1</b>')
    // JSX components (uppercase)
    s = s.replace(/(&lt;\/?)([A-Z][\w.]*)/g, '$1<b class="hl-cmp">$2</b>')
    // Function calls (after keywords to avoid re-wrapping)
    s = s.replace(/([a-zA-Z_$][\w$]*)(?=\s*\()/g, (m, n) => `<b class="hl-fn">${n}</b>`)
  } else if (lang === 'css') {
    // Selectors (line starts before {)
    s = s.replace(/^([^{\n][^{\n]*)(?=\s*\{)/gm, '<b class="hl-sel">$1</b>')
    // CSS custom props and regular props (word before :, not inside a value)
    s = s.replace(/(--[\w-]+|[\w-]+)(\s*:(?!:))/g, '<b class="hl-prop">$1</b>$2')
    // hex colors
    s = s.replace(/#([0-9a-fA-F]{3,8})\b/g, '<b class="hl-hex">#$1</b>')
    // Numbers + units
    s = s.replace(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|lh|svh|dvh)?\b/g,
      (m, n, u) => u
        ? `<b class="hl-num">${n}</b><b class="hl-unit">${u}</b>`
        : `<b class="hl-num">${n}</b>`)
  } else if (lang === 'json') {
    s = s.replace(/"([^"\\]*)"\s*:/g,          '<b class="hl-key">"$1"</b>:')
    s = s.replace(/:\s*"([^"\\]*)"/g,           ': <b class="hl-str">"$1"</b>')
    s = s.replace(/:\s*(-?\d+(?:\.\d+)?)/g,     ': <b class="hl-num">$1</b>')
    s = s.replace(/\b(true|false|null)\b/g,      '<b class="hl-kw">$1</b>')
  }

  // Restore stash
  s = s.replace(/__ZF(\d+)ZF__/g, (_, idx) => {
    const [type, val] = stash[+idx]
    const esc = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return type === 'comment'
      ? `<b class="hl-comment">${esc}</b>`
      : `<b class="hl-str">${esc}</b>`
  })

  return s
}

// ── Editor CSS ─────────────────────────────────────────────────────────────────
const EDITOR_CSS = `
  .zf-code-editor b { font-weight: inherit; font-style: inherit; }
  .hl-kw      { color: #a78bfa; }
  .hl-fn      { color: #38bdf8; }
  .hl-cmp     { color: #f472b6; }
  .hl-str     { color: #86efac; }
  .hl-num     { color: #fb923c; }
  .hl-unit    { color: #fdba74; }
  .hl-hex     { color: #f472b6; }
  .hl-comment { color: #475569; font-style: italic; }
  .hl-prop    { color: #38bdf8; }
  .hl-sel     { color: #f59e0b; }
  .hl-key     { color: #38bdf8; }
`

// ── Component ──────────────────────────────────────────────────────────────────
export default function CodeEditorPanel() {
  const { activeFile, files, updateFile, setActiveFile, isRevealing } = useCVStore()

  const [copied, setCopied] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, col: 1 })

  const preRef  = useRef(null)
  const taRef   = useRef(null)

  const content = files[activeFile] ?? ''
  const lang    = LANG_MAP[activeFile]
  const lines   = content.split('\n')

  const highlighted = useMemo(() => highlight(content, lang), [content, lang])

  // Keep textarea height in sync with pre so the overlay covers all content
  useEffect(() => {
    if (preRef.current && taRef.current) {
      taRef.current.style.height = Math.max(preRef.current.scrollHeight, 300) + 'px'
    }
  }, [content])
  // Note: DatabaseSchema.json is updated by vibeStore._executeBuild via revealCode() —
  // no separate dbTable sync needed here (would conflict with the typing animation).

  const handleChange = (e) => {
    updateFile(activeFile, e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta  = e.target
      const s   = ta.selectionStart
      const end = ta.selectionEnd
      const val = ta.value
      updateFile(activeFile, val.slice(0, s) + '  ' + val.slice(end))
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.selectionStart = taRef.current.selectionEnd = s + 2
      })
    }
  }

  const handleSelect = (e) => {
    const ta  = e.target
    const pos = ta.selectionStart
    const pre = ta.value.slice(0, pos)
    const ln  = pre.split('\n').length
    const col = pre.slice(pre.lastIndexOf('\n') + 1).length + 1
    setCursor({ line: ln, col })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const activeColor = FILE_COLORS[activeFile] ?? '#00e5ff'

  return (
    <div className="zf-code-editor flex flex-col flex-1 min-h-0"
      style={{ background: '#070711', borderLeft: '1px solid #111118' }}>

      <style>{EDITOR_CSS}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderBottom: '1px solid #111118', background: '#060610',
      }}>
        <Code2 size={13} style={{ color: '#00e5ff' }} />
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>Pro Developer Engine</span>
        <span style={{
          marginLeft: 4, padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff',
        }}>v1.0</span>

        <div style={{ flex: 1 }} />

        {isRevealing && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>
            <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
            AI syncing...
          </span>
        )}

        <button onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b',
            color: copied ? '#86efac' : '#64748b', transition: 'all 0.2s',
          }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* ── File tabs ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #111118', background: '#060610',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {FILES.map(f => {
          const Icon    = FILE_ICONS[f]
          const color   = FILE_COLORS[f]
          const isActive = activeFile === f
          return (
            <button key={f} onClick={() => setActiveFile(f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                fontSize: 12, fontWeight: 500, background: 'transparent', outline: 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                color: isActive ? '#e2e8f0' : '#475569',
                transition: 'all 0.15s',
              }}>
              <Icon size={11} style={{ color: isActive ? color : '#334155', flexShrink: 0 }} />
              {f}
              {isRevealing && activeFile === f && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', background: '#a78bfa',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Editor area ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'auto', position: 'relative' }}>

        {/* Line numbers gutter */}
        <div style={{
          position: 'sticky', left: 0, zIndex: 2, flexShrink: 0,
          width: 50, padding: '16px 8px 16px 0', textAlign: 'right',
          background: '#070711', borderRight: '1px solid #0d0d1a',
          fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
          fontSize: 12.5, lineHeight: '1.65', color: '#1e293b', userSelect: 'none',
        }}>
          {lines.map((_, i) => (
            <div key={i} style={{ color: cursor.line === i + 1 ? '#334155' : '#1e293b' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code + textarea overlay */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <pre
            ref={preRef}
            style={{
              margin: 0, padding: 16, minHeight: '100%',
              fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
              fontSize: 12.5, lineHeight: '1.65', color: '#94a3b8',
              tabSize: 2, whiteSpace: 'pre', overflowX: 'visible',
              pointerEvents: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <textarea
            ref={taRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', minHeight: '100%',
              margin: 0, padding: 16, resize: 'none', border: 'none', outline: 'none',
              fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
              fontSize: 12.5, lineHeight: '1.65',
              background: 'transparent', color: 'transparent',
              caretColor: activeColor,
              tabSize: 2, whiteSpace: 'pre', overflow: 'hidden',
            }}
          />
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        padding: '3px 14px', borderTop: '1px solid #111118', background: '#060610',
        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
        fontSize: 11, color: '#334155',
      }}>
        <span style={{ color: activeColor, fontWeight: 700 }}>{lang?.toUpperCase()}</span>
        <span>Ln {cursor.line}, Col {cursor.col}</span>
        <span>{lines.length} lines</span>
        <span>{content.length} chars</span>
        {activeFile === 'DatabaseSchema.json' && (
          <span style={{ color: '#f59e0b' }}>↔ Live DB Sync</span>
        )}
        {activeFile === 'ServerlessFunctions.js' && (
          <span style={{ color: '#a78bfa' }}>⚡ Edge Runtime</span>
        )}
        <div style={{ flex: 1 }} />
        <span>ZaraForge Pro Engine</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
