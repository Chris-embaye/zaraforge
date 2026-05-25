import { useState } from 'react'
import { X, Clock, RotateCcw, Database, GitCommit, Rocket, Tag, Plus, Check } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'

const VERSIONS_KEY = 'zf-versions'

const TYPE_META = {
  publish: { Icon: Rocket,    color: '#00e5ff', label: 'Published',  bg: 'rgba(0,229,255,0.12)',    border: 'rgba(0,229,255,0.25)'    },
  manual:  { Icon: Tag,       color: '#a78bfa', label: 'Checkpoint', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.25)'  },
  auto:    { Icon: GitCommit, color: '#475569', label: 'Auto-save',  bg: 'rgba(255,255,255,0.05)',  border: 'rgba(255,255,255,0.08)'  },
}

function relativeTime(ts) {
  try {
    const ms = Date.now() - new Date(ts).getTime()
    const m = Math.floor(ms / 60000)
    const h = Math.floor(ms / 3600000)
    const d = Math.floor(ms / 86400000)
    if (m < 1)  return 'Just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    if (d === 1) return 'Yesterday'
    const date = new Date(ts)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return ts }
}

export default function VersionHistory() {
  const { setShowVersionHistory, commitSnapshot } = useBuilderStore()

  const [versions, setVersions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]') } catch { return [] }
  })
  const [selected, setSelected]         = useState(null)
  const [label, setLabel]               = useState('')
  const [justSaved, setJustSaved]       = useState(false)
  const [restoring, setRestoring]       = useState(false)

  const sorted = [...versions].reverse()
  const active = selected ?? sorted[0] ?? null

  const refresh = () => {
    try { setVersions(JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]')) } catch {}
  }

  const handleCommit = () => {
    const name = label.trim() || 'Manual checkpoint'
    commitSnapshot(name, 'manual')
    setLabel('')
    setJustSaved(true)
    setTimeout(() => { setJustSaved(false); refresh() }, 900)
  }

  const restore = (ver) => {
    if (!ver.pages?.length) return
    if (!confirm(`Restore to "${ver.label}"?\nUnsaved work will be overwritten.`)) return
    setRestoring(true)
    setTimeout(() => {
      const activePage = ver.pages.find(p => p.id === ver.activePageId) ?? ver.pages[0]
      useBuilderStore.setState({
        pages:        ver.pages,
        activePageId: activePage.id,
        schema:       activePage.schema,
      })
      setShowVersionHistory(false)
    }, 320)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && setShowVersionHistory(false)}>

      {/* ── Modal shell ── */}
      <div style={{
        width: '100%', maxWidth: 780,
        maxHeight: '84vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(7,7,20,0.9)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 22,
        boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.08) inset, 0 0 80px rgba(109,40,217,0.08)',
        animation: 'glass-float-in 0.24s cubic-bezier(0.16,1,0.3,1) forwards',
        overflow: 'hidden',
        opacity: restoring ? 0 : 1,
        transition: 'opacity 0.3s',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.025)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={16} style={{ color: '#fbbf24' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', margin: 0, letterSpacing: '-0.01em' }}>
              Time Machine
            </h2>
            <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>
              {versions.length} snapshot{versions.length !== 1 ? 's' : ''} · auto-saves every 12 s while editing
            </p>
          </div>
          <button
            onClick={() => setShowVersionHistory(false)}
            style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#475569',
            }}>
            <X size={13} />
          </button>
        </div>

        {/* ── Commit strip ── */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.015)',
          flexShrink: 0,
        }}>
          <Tag size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCommit()}
            placeholder="Name this checkpoint - e.g. Hero section complete..."
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCommit}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              background:  justSaved ? 'rgba(52,211,153,0.15)' : 'rgba(167,139,250,0.13)',
              border:      justSaved ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(167,139,250,0.28)',
              color:       justSaved ? '#34d399' : '#a78bfa',
              transition: 'all 0.2s',
            }}>
            {justSaved ? <Check size={11} /> : <Plus size={11} />}
            {justSaved ? 'Saved!' : 'Save checkpoint'}
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

          {/* ── Left: git-log timeline ── */}
          <div style={{
            width: 272, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            overflowY: 'auto',
            paddingTop: 8, paddingBottom: 8,
          }}>
            {sorted.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Database size={28} style={{ color: '#1e293b', marginBottom: 10 }} />
                <p style={{ fontSize: 12, color: '#334155', margin: '0 0 4px' }}>No snapshots yet</p>
                <p style={{ fontSize: 10, color: '#1e293b', lineHeight: 1.5 }}>
                  Start editing — snapshots auto-save every 12 seconds.
                </p>
              </div>
            ) : sorted.map((ver, i) => {
              const meta    = TYPE_META[ver.type ?? 'auto']
              const isActive = active?.id === ver.id
              const isFirst  = i === 0

              return (
                <button
                  key={ver.id}
                  onClick={() => setSelected(ver)}
                  style={{
                    width: '100%', display: 'flex', gap: 0,
                    padding: '0 12px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>

                  {/* Graph line + node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                    <div style={{ width: 2, flex: 1, minHeight: 10, background: isFirst ? 'transparent' : 'rgba(255,255,255,0.07)' }} />
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? meta.color : 'rgba(255,255,255,0.12)',
                      border:     `2px solid ${isActive ? meta.color : 'rgba(255,255,255,0.08)'}`,
                      boxShadow:  isActive ? `0 0 10px ${meta.color}66` : 'none',
                      transition: 'all 0.18s',
                    }} />
                    <div style={{ width: 2, flex: 1, minHeight: 10, background: i === sorted.length - 1 ? 'transparent' : 'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* Entry content */}
                  <div style={{
                    flex: 1, padding: '7px 10px 7px 8px',
                    borderRadius: 10, marginBottom: 1,
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    {/* Badge row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{
                        padding: '1.5px 6px', borderRadius: 4,
                        fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                      }}>
                        {meta.label}
                      </span>
                      {isFirst && (
                        <span style={{
                          padding: '1.5px 6px', borderRadius: 4,
                          fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                          background: 'rgba(0,229,255,0.1)', color: '#00e5ff',
                          border: '1px solid rgba(0,229,255,0.2)',
                        }}>
                          HEAD
                        </span>
                      )}
                    </div>
                    {/* Label */}
                    <p style={{
                      fontSize: 11.5, fontWeight: 600, margin: 0, lineHeight: 1.35,
                      color: isActive ? '#e2e8f0' : '#94a3b8',
                    }}>
                      {ver.label ?? 'Auto-save'}
                    </p>
                    {/* Time */}
                    <p style={{ fontSize: 9.5, color: '#334155', margin: '2px 0 0' }}>
                      {relativeTime(ver.ts)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Right: detail panel ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 22, overflowY: 'auto', minWidth: 0 }}>
            {!active ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#334155', fontSize: 12 }}>Select a snapshot from the timeline</p>
              </div>
            ) : (
              <>
                {/* Commit hash header */}
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#e2e8f0', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    {active.label ?? 'Auto-save'}
                  </h3>
                  <p style={{ fontSize: 10, color: '#334155', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    commit {String(active.id).slice(0, 9)} · {new Date(active.ts).toLocaleString()}
                  </p>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {[
                    { label: 'Pages',       value: active.pageCount,       color: '#a78bfa' },
                    { label: 'Components',  value: active.componentCount,   color: '#34d399' },
                    { label: 'Active Page', value: active.activePage,       color: '#fbbf24' },
                    { label: 'Type',        value: TYPE_META[active.type ?? 'auto'].label, color: TYPE_META[active.type ?? 'auto'].color },
                  ].map(({ label: lbl, value, color }) => (
                    <div key={lbl} style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <p style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px', fontWeight: 700 }}>
                        {lbl}
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pages list */}
                {active.pages?.length > 0 && (
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px', fontWeight: 700 }}>
                      Pages in this snapshot
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {active.pages.map(pg => (
                        <div key={pg.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 13px', borderRadius: 11,
                          background: pg.id === active.activePageId
                            ? 'rgba(167,139,250,0.07)'
                            : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${pg.id === active.activePageId
                            ? 'rgba(167,139,250,0.2)'
                            : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {pg.id === active.activePageId && (
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{pg.name}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace',
                            color: '#334155',
                            background: 'rgba(255,255,255,0.04)',
                            padding: '2px 7px', borderRadius: 5,
                          }}>
                            {pg.schema?.components?.length ?? 0} blocks
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Restore button */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    onClick={() => restore(active)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '13px 20px', borderRadius: 13,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      background: 'rgba(251,191,36,0.09)',
                      border: '1px solid rgba(251,191,36,0.28)',
                      color: '#fbbf24',
                      transition: 'all 0.2s',
                      boxShadow: '0 0 0 0 rgba(251,191,36,0)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(251,191,36,0.16)'
                      e.currentTarget.style.boxShadow  = '0 0 24px rgba(251,191,36,0.15)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(251,191,36,0.09)'
                      e.currentTarget.style.boxShadow  = '0 0 0 0 rgba(251,191,36,0)'
                    }}>
                    <RotateCcw size={14} />
                    Restore to this snapshot
                  </button>
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#1e293b', marginTop: 8 }}>
                    Current unsaved changes will be overwritten
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
