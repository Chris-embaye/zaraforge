import { useMemo, useEffect } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useVibeStore }    from '../store/vibeStore'
import { useTheme }        from '../context/ThemeContext'
import { Share2 }          from 'lucide-react'
import ComponentWrapper    from '../canvas/ComponentWrapper'
import { compileProject }  from '../lib/compiler'
import PageManager         from './PageManager'
import { Layout, Database, ChevronRight } from 'lucide-react'
import EmptyStateCanvas from './EmptyStateCanvas'
import { useTranslation } from '../i18n'

const VIEWPORT_WIDTHS = {
  desktop: null,
  tablet:  '768px',
  mobile:  '390px',
}

// ─── Status badge colours for the DataTable ───────────────────────────────────
const STATUS_COLORS = {
  Confirmed:   { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  Active:      { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  Scheduled:   { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  Shipped:     { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  Delivered:   { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  Won:         { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  'Hot Lead':  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)'   },
  Pending:     { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  Processing:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  'In Review': { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  Warm:        { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  Trial:       { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  Nurturing:   { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.25)'  },
  'In Review2':{ bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.25)'  },
  Cancelled:   { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', border: 'rgba(107,114,128,0.25)' },
  Refunded:    { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', border: 'rgba(107,114,128,0.25)' },
  Closed:      { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', border: 'rgba(107,114,128,0.25)' },
  Read:        { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.25)'  },
  Replied:     { bg: 'rgba(0,229,255,0.1)',    text: '#00e5ff', border: 'rgba(0,229,255,0.25)'   },
  New:         { bg: 'rgba(0,229,255,0.1)',    text: '#00e5ff', border: 'rgba(0,229,255,0.25)'   },
}

function statusStyle(val) {
  return STATUS_COLORS[val] || { bg: 'rgba(255,255,255,0.04)', text: '#9ca3af', border: 'rgba(255,255,255,0.08)' }
}

function cellValue(val) {
  if (val === true)  return <span className="text-emerald-400 font-mono text-xs">true</span>
  if (val === false) return <span className="text-gray-600 font-mono text-xs">false</span>
  return String(val ?? '—')
}

// ─── Live DataTable ───────────────────────────────────────────────────────────
function DataTable({ table }) {
  const STATUS_COLS = new Set(['status', 'state'])
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #111118' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>
            <Database size={13} style={{ color: '#00e5ff' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-mono">{table.name}</p>
            <p className="text-[10px] text-gray-500">{table.rows.length} rows · {table.columns.length} columns · live data</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 600 }}>
          <thead className="sticky top-0 z-10" style={{ background: '#08080f' }}>
            <tr>
              {table.columns.map(col => (
                <th key={col}
                  className="text-left px-4 py-3 font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: '#4b5563', fontSize: '9px', borderBottom: '1px solid #111118' }}>
                  {col}
                  <ChevronRight size={9} className="inline ml-1 opacity-30" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={row.id ?? ri}
                className="group transition-colors cursor-pointer"
                style={{ borderBottom: '1px solid #0b0b15' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {table.columns.map(col => {
                  const val = row[col]
                  const isStatus = STATUS_COLS.has(col) || (typeof val === 'string' && STATUS_COLORS[val])
                  const isId = col === 'id'
                  const isBool = typeof val === 'boolean'
                  return (
                    <td key={col} className="px-4 py-3 whitespace-nowrap">
                      {isId ? (
                        <span className="font-mono text-[10px] text-gray-600"># {val}</span>
                      ) : isStatus && STATUS_COLORS[val] ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: statusStyle(val).bg,
                            color:      statusStyle(val).text,
                            border:     `1px solid ${statusStyle(val).border}`,
                          }}>
                          {val}
                        </span>
                      ) : isBool ? (
                        <span>{cellValue(val)}</span>
                      ) : (
                        <span className="text-gray-400">{cellValue(val)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0 text-[10px] text-gray-600"
        style={{ borderTop: '1px solid #111118' }}>
        <span>Showing {table.rows.length} of {table.rows.length} rows</span>
        <span className="font-mono">zaraforge://db/{table.name}</span>
      </div>
    </div>
  )
}

// ─── Mode toggle bar ──────────────────────────────────────────────────────────
function ModeToggle({ canvasMode, setCanvasMode, hasDb }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
      style={{ background: '#06060f', borderBottom: '1px solid #111118' }}>
      <div className="flex items-center rounded-lg p-0.5" style={{ background: '#0c0c1a', border: '1px solid #1a1a2e' }}>
        <button
          onClick={() => setCanvasMode('design')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all"
          style={{
            background: canvasMode === 'design' ? '#1e293b' : 'transparent',
            color:      canvasMode === 'design' ? '#e2e8f0' : '#475569',
          }}>
          <Layout size={11} />
          {t('canvas_design_mode')}
        </button>
        <button
          onClick={() => setCanvasMode('data')}
          disabled={!hasDb}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: canvasMode === 'data' ? '#1e293b' : 'transparent',
            color:      canvasMode === 'data' ? '#00e5ff' : '#475569',
          }}>
          <Database size={11} />
          {t('canvas_data_mode')}
          {hasDb && canvasMode !== 'data' && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>
      </div>
      {canvasMode === 'data' && (
        <span className="text-[10px] text-gray-600">Auto-generated relational schema · editable rows</span>
      )}
    </div>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function Canvas() {
  const {
    schema, pages, deselectAll, previewMode, viewport,
    addFormSubmission, setActivePage,
  } = useBuilderStore()
  const { canvasMode, setCanvasMode, dbTable, remixPublic } = useVibeStore()
  const theme = useTheme()
  const components = schema.components

  const previewHtml = useMemo(
    () => (previewMode && components.length > 0) ? compileProject(pages) : '',
    [pages, previewMode, components.length]
  )

  useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'FORM_SUBMIT') {
        addFormSubmission({
          page:     e.data.page     ?? '',
          endpoint: e.data.endpoint ?? '',
          data:     e.data.data     ?? {},
          ts:       e.data.ts       ?? new Date().toISOString(),
        })
      }
      if (e.data.type === 'NAV_PAGE' && e.data.page) setActivePage(e.data.page)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [addFormSubmission, setActivePage])

  const themeVars = {
    '--theme-primary':   theme.primaryColor,
    '--theme-secondary': theme.secondaryColor,
    '--theme-font':      theme.fontFamily,
    '--theme-radius':    theme.borderRadius,
    '--theme-heading':   theme.headingColor,
    '--theme-body':      theme.bodyColor,
    '--theme-bg':        theme.pageBg,
    '--theme-dark-bg':   theme.darkBg,
    fontFamily:          theme.fontFamily,
  }

  const viewportWidth = VIEWPORT_WIDTHS[viewport]
  const isConstrained = viewport !== 'desktop'
  const frameStyle    = isConstrained
    ? { width: viewportWidth, maxWidth: '100%', boxShadow: '0 0 0 1px #374151, 0 32px 64px -16px rgba(0,0,0,0.7)', borderRadius: viewport === 'mobile' ? '2rem' : '1rem', overflow: 'hidden', flexShrink: 0 }
    : { width: '100%' }

  // ── Preview mode ────────────────────────────────────────────────────────────
  if (previewMode) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className="flex-1 overflow-auto flex flex-col items-center bg-gray-950"
          style={{ padding: isConstrained ? '1.5rem' : '0' }}>
          {components.length === 0
            ? <EmptyStateCanvas />
            : (
              <div style={frameStyle} className="transition-all duration-300 ease-in-out h-full">
                <iframe srcDoc={previewHtml} className="w-full border-0 block" style={{ height: '100%' }}
                  title="Site Preview" sandbox="allow-scripts allow-same-origin allow-forms" />
              </div>
            )
          }
        </main>
      </div>
    )
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Design / Data toggle */}
      <ModeToggle canvasMode={canvasMode} setCanvasMode={setCanvasMode} hasDb={!!dbTable} />

      {/* Data Mode */}
      {canvasMode === 'data' && dbTable && (
        <div className="flex-1 min-h-0 overflow-hidden" style={{ background: '#06060f' }}>
          <DataTable table={dbTable} />
        </div>
      )}

      {canvasMode === 'data' && !dbTable && (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#06060f' }}>
          <div className="text-center">
            <Database size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold text-sm">No database yet</p>
            <p className="text-gray-700 text-xs mt-1">Generate an app from the chat panel to auto-create a database schema</p>
          </div>
        </div>
      )}

      {/* Design Mode */}
      {canvasMode === 'design' && (
        <>
          {/* Remix Gallery badge — appears when template is made public */}
          {remixPublic && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '6px 16px', flexShrink: 0,
              background: 'linear-gradient(90deg, rgba(0,229,255,0.07) 0%, rgba(139,92,246,0.09) 50%, rgba(0,229,255,0.07) 100%)',
              borderBottom: '1px solid rgba(0,229,255,0.18)',
              animation: 'remixBannerPulse 3s ease-in-out infinite',
            }}>
              <Share2 size={11} style={{ color: '#00e5ff', flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: '#00e5ff', letterSpacing: '0.01em' }}>
                Template Public &amp; Remixable
              </p>
              <span style={{
                padding: '1px 7px', borderRadius: 99, fontSize: 9, fontWeight: 800,
                background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)',
                color: '#00e5ff', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Listed in Remix Gallery
              </span>
            </div>
          )}
          <style>{`
            @keyframes remixBannerPulse {
              0%,100% { opacity: 1; }
              50%      { opacity: 0.75; }
            }
          `}</style>

          <PageManager />
          <main
            className="flex-1 overflow-y-auto bg-gray-950 flex flex-col"
            style={{ alignItems: isConstrained ? 'center' : 'stretch' }}
            onClick={deselectAll}>
            {components.length === 0
              ? <EmptyStateCanvas />
              : (
                <div
                  className="transition-all duration-300 ease-in-out"
                  style={{ ...frameStyle, ...(isConstrained ? { margin: '1.5rem 0' } : {}) }}>
                  <div data-canvas-scope="true" style={themeVars}>
                    {components.map((comp, index) => (
                      <ComponentWrapper key={comp.id} component={comp}
                        isFirst={index === 0} isLast={index === components.length - 1} />
                    ))}
                  </div>
                </div>
              )
            }
          </main>
        </>
      )}
    </div>
  )
}

