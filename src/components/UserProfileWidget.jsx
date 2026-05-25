import { useState, useRef } from 'react'
import { Cloud, FolderOpen, LogOut, ChevronDown, Loader2 } from 'lucide-react'
import { useAuthStore }   from '../store/authStore'
import { useBuilderStore } from '../store/builderStore'
import { isAdminUser }    from '../admin/adminStore'

// ── Cloud sync pill ───────────────────────────────────────────────────────────
function CloudSyncPill({ status }) {
  const syncing = status === 'syncing'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 99, flexShrink: 0,
      background: syncing ? 'rgba(99,102,241,0.1)' : 'rgba(52,211,153,0.08)',
      border: syncing
        ? '1px solid rgba(99,102,241,0.3)'
        : '1px solid rgba(52,211,153,0.25)',
      transition: 'all 0.4s',
    }}>
      {syncing
        ? <Loader2 size={9} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 5px #34d399', flexShrink: 0, animation: 'cloudPulse 2.5s ease-in-out infinite' }} />
      }
      <span style={{
        fontSize: 9.5, fontWeight: 700,
        color: syncing ? '#a78bfa' : '#34d399',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        {syncing ? '✨ Cloud Syncing…' : '🟢 Saved to Cloud'}
      </span>
    </div>
  )
}

// ── User avatar circle ────────────────────────────────────────────────────────
function Avatar({ user, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: user.avatarBg ?? 'rgba(0,229,255,0.12)',
      border: `1.5px solid ${user.accentColor ?? '#00e5ff'}`,
      boxShadow: `0 0 8px ${user.accentColor ?? '#00e5ff'}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800,
      color: user.accentColor ?? '#00e5ff',
      userSelect: 'none',
    }}>
      {user.initials ?? user.name?.slice(0, 2).toUpperCase() ?? 'U'}
    </div>
  )
}

// ── Dropdown menu item ────────────────────────────────────────────────────────
function MenuItem({ icon: Icon, label, color, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '9px 14px', border: 'none',
        background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
        fontFamily: 'inherit',
      }}>
      <Icon size={13} style={{ color: hov ? (color ?? '#e2e8f0') : '#475569', transition: 'color 0.15s', flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: hov ? (color ?? '#e2e8f0') : '#64748b', transition: 'color 0.15s' }}>
        {label}
      </span>
    </button>
  )
}

// ── Admin command center entry ────────────────────────────────────────────────
function AdminMenuItem({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '9px 14px', border: 'none',
        background: hov ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.03)',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
        fontFamily: 'inherit',
        borderLeft: `2px solid ${hov ? '#f59e0b' : 'rgba(245,158,11,0.3)'}`,
      }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>👑</span>
      <div style={{ minWidth: 0 }}>
        <span style={{
          fontSize: 12, fontWeight: 800, display: 'block',
          color: hov ? '#f59e0b' : '#b45309', transition: 'color 0.15s',
          letterSpacing: '-0.01em',
        }}>
          Executive Command Center
        </span>
        <span style={{ fontSize: 9.5, color: '#78350f', fontWeight: 600 }}>God-Mode · Admin Only</span>
      </div>
    </button>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function UserProfileWidget() {
  const {
    user, isLoggedIn, cloudSync,
    setShowAuthModal, setShowProjectsDrawer, logout,
  } = useAuthStore()
  const { setAppMode } = useBuilderStore()
  const isAdmin = isAdminUser(user)

  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 56, right: 16 })

  const toggleMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  // ── Logged-out state: Sign In button ──────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <button
        onClick={() => setShowAuthModal(true, 'login')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8,
          fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          background: 'rgba(0,229,255,0.06)',
          border: '1px solid rgba(0,229,255,0.25)',
          color: '#00e5ff', transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0,229,255,0.12)'
          e.currentTarget.style.borderColor = 'rgba(0,229,255,0.45)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(0,229,255,0.06)'
          e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'
        }}>
        <Cloud size={12} />
        Sign In
      </button>
    )
  }

  // ── Logged-in state: avatar + cloud sync + dropdown ───────────────────────
  return (
    <>
      {/* Trigger row */}
      <button
        ref={btnRef}
        onClick={toggleMenu}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '4px 8px 4px 4px', borderRadius: 10,
          background: open ? 'rgba(255,255,255,0.05)' : 'transparent',
          border: open ? '1px solid #1e293b' : '1px solid transparent',
          cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
        }}>
        <Avatar user={user} size={28} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}
          className="hidden sm:flex">
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#e2e8f0',
            maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.name}
          </span>
          <CloudSyncPill status={cloudSync} />
        </div>
        <ChevronDown size={11} style={{ color: '#334155', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          className="hidden sm:block" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 58 }} />

          <div style={{
            position: 'fixed', top: pos.top, right: pos.right,
            zIndex: 59, width: 220,
            background: '#080814',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.05)',
          }}>
            {/* User info header */}
            <div style={{
              padding: '14px 14px 12px',
              borderBottom: '1px solid #111118',
              background: '#060610',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Avatar user={user} size={32} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </p>
                <p style={{ fontSize: 10, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
              </div>
            </div>

            {/* Cloud sync status row */}
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #111118' }}>
              <CloudSyncPill status={cloudSync} />
            </div>

            {/* Menu items */}
            <div style={{ paddingTop: 4, paddingBottom: 4 }}>
              <MenuItem
                icon={FolderOpen}
                label="My Projects"
                onClick={() => { setOpen(false); setShowProjectsDrawer(true) }}
              />
              <MenuItem
                icon={Cloud}
                label="Account & Billing"
                onClick={() => setOpen(false)}
              />
            </div>

            {isAdmin && (
              <>
                <div style={{ height: 1, background: '#111118', margin: '2px 0' }} />
                <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                  <AdminMenuItem onClick={() => { setOpen(false); setAppMode('admin') }} />
                </div>
              </>
            )}

            <div style={{ height: 1, background: '#111118', margin: '2px 0' }} />

            <div style={{ paddingTop: 4, paddingBottom: 8 }}>
              <MenuItem
                icon={LogOut}
                label="Sign Out"
                color="#f87171"
                onClick={() => { setOpen(false); logout() }}
              />
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes cloudPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </>
  )
}
