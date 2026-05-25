import { useState } from 'react'
import {
  X, Plus, Layout, Mic, Palette, Clock, Trash2,
  MoreHorizontal, FolderOpen, Edit2, Search,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useZaraForgeSession } from '../hooks/useZaraForgeSession'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtAge(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)     return 'Just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const TYPE_META = {
  builder: { Icon: Layout, label: 'Builder', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  studio:  { Icon: Mic,    label: 'Studio',  color: '#9b5de5', bg: 'rgba(155,93,229,0.12)' },
  logo:    { Icon: Palette,label: 'Logo',    color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
}

const FILTERS = ['All', 'Builder', 'Studio', 'Logo']

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onOpen, onRename, onDelete }) {
  const meta = TYPE_META[project.type] ?? TYPE_META.builder
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameVal,  setNameVal]  = useState(project.name)

  const commitRename = () => {
    if (nameVal.trim() && nameVal.trim() !== project.name) onRename(nameVal.trim())
    setRenaming(false)
  }

  return (
    <div style={{
      borderRadius: 12, overflow: 'visible', position: 'relative',
      background: '#0c0c1a', border: '1px solid #1a1a2e',
      transition: 'border-color 0.18s, box-shadow 0.18s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${project.accent}55`
        e.currentTarget.style.boxShadow = `0 0 20px ${project.accent}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1a1a2e'
        e.currentTarget.style.boxShadow = 'none'
      }}>

      {/* Colour header strip */}
      <div style={{
        height: 56, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${project.accent}22 0%, ${project.accent}08 100%)`,
        borderBottom: `1px solid ${project.accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
        onClick={() => onOpen(project)}>
        <meta.Icon size={22} style={{ color: project.accent, opacity: 0.7 }} />

        {/* Type badge */}
        <span style={{
          position: 'absolute', top: 7, left: 8,
          padding: '2px 7px', borderRadius: 99, fontSize: 9, fontWeight: 800,
          background: meta.bg, color: meta.color, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 10px' }}>
        {/* Name */}
        {renaming ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            style={{
              width: '100%', background: '#111118', border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: 6, padding: '4px 8px', color: '#e2e8f0', fontSize: 12,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        ) : (
          <p
            onClick={() => onOpen(project)}
            style={{
              fontSize: 12, fontWeight: 700, color: '#e2e8f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 4, cursor: 'pointer',
            }}>
            {project.name}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={9} style={{ color: '#334155' }} />
            <span style={{ fontSize: 10, color: '#334155' }}>{fmtAge(project.lastModified)}</span>
          </div>

          {/* Stat pill */}
          <span style={{ fontSize: 10, color: '#475569' }}>
            {project.components  ? `${project.components} sections` :
             project.tracks      ? `${project.tracks} tracks`       : ''}
            {project.pages > 1   ? ` · ${project.pages}p`           : ''}
          </span>

          {/* Context menu trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#334155', padding: '2px 3px', borderRadius: 5,
                display: 'flex', alignItems: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = 'none' }}>
              <MoreHorizontal size={13} />
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
                <div style={{
                  position: 'absolute', bottom: '115%', right: 0, zIndex: 71, width: 148,
                  background: '#0c0c1a', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                }}>
                  {[
                    { icon: FolderOpen, label: 'Open', action: () => { setMenuOpen(false); onOpen(project) }, color: '#e2e8f0' },
                    { icon: Edit2,      label: 'Rename', action: () => { setMenuOpen(false); setRenaming(true) }, color: '#e2e8f0' },
                    { icon: Trash2,     label: 'Delete', action: () => { setMenuOpen(false); onDelete() }, color: '#f87171' },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '9px 12px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 600, color: item.color, transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <item.icon size={12} style={{ color: item.color }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ProjectsDrawer ───────────────────────────────────────────────────────
export default function ProjectsDrawer() {
  const {
    user, projects, showProjectsDrawer,
    setShowProjectsDrawer, deleteProject, renameProject,
  } = useAuthStore()

  const { openProject } = useZaraForgeSession()

  const [filter,  setFilter]  = useState('All')
  const [search,  setSearch]  = useState('')

  if (!showProjectsDrawer) return null

  const filtered = projects.filter(p => {
    const matchType   = filter === 'All' || p.type === filter.toLowerCase()
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowProjectsDrawer(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 54,
          background: 'rgba(2,2,10,0.7)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 55,
        width: 420, display: 'flex', flexDirection: 'column',
        background: '#08080f',
        borderLeft: '1px solid rgba(0,229,255,0.12)',
        boxShadow: '-20px 0 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,229,255,0.05)',
        animation: 'drawerSlideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', flexShrink: 0,
          borderBottom: '1px solid #111118', background: '#060610',
        }}>
          <FolderOpen size={16} style={{ color: '#00e5ff' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>My Projects</p>
            <p style={{ fontSize: 10.5, color: '#334155', marginTop: 1 }}>
              {user?.name} · {projects.length} saved
            </p>
          </div>
          <button
            onClick={() => setShowProjectsDrawer(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', padding: 4, borderRadius: 6, flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            <X size={16} />
          </button>
        </div>

        {/* ── Search + New Project row ── */}
        <div style={{ padding: '12px 20px', flexShrink: 0, display: 'flex', gap: 8, borderBottom: '1px solid #111118' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            background: '#0c0c1a', border: '1px solid #1e293b',
          }}>
            <Search size={11} style={{ color: '#334155', flexShrink: 0 }} />
            <input
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit',
              }}
            />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', border: '1px solid rgba(0,229,255,0.25)',
            background: 'rgba(0,229,255,0.06)', color: '#00e5ff', flexShrink: 0,
            fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)' }}>
            <Plus size={12} /> New
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{
          display: 'flex', gap: 4, padding: '10px 20px', flexShrink: 0,
          borderBottom: '1px solid #111118',
        }}>
          {FILTERS.map(f => {
            const active = filter === f
            const meta   = f !== 'All' ? TYPE_META[f.toLowerCase()] : null
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit',
                background: active ? (meta?.bg ?? 'rgba(255,255,255,0.07)') : 'transparent',
                color: active ? (meta?.color ?? '#e2e8f0') : '#475569',
              }}>
                {meta && <meta.Icon size={10} />}
                {f}
                {f !== 'All' && (
                  <span style={{ fontSize: 9, opacity: 0.7 }}>
                    {projects.filter(p => p.type === f.toLowerCase()).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Project grid ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, height: 200, color: '#334155',
            }}>
              <FolderOpen size={32} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No projects found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {filtered.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={openProject}
                  onRename={(name) => renameProject(p.id, name)}
                  onDelete={() => deleteProject(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px', flexShrink: 0,
          borderTop: '1px solid #111118', background: '#060610',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10.5, color: '#1e293b' }}>
            {filtered.length} of {projects.length} projects
          </span>
          <span style={{
            fontSize: 10, color: '#1e293b', fontFamily: 'monospace',
          }}>
            zaraforge://cloud/{user?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'user'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
