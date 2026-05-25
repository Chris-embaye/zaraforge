import { useAdminStore } from '../admin/adminStore'

const SEVERITY_STYLE = {
  info:        { bg: 'rgba(59,130,246,0.95)',  border: '#3b82f6', icon: 'ℹ️'  },
  warning:     { bg: 'rgba(245,158,11,0.95)', border: '#f59e0b', icon: '⚠️'  },
  danger:      { bg: 'rgba(239,68,68,0.95)',  border: '#ef4444', icon: '🚨'  },
  success:     { bg: 'rgba(16,185,129,0.95)', border: '#10b981', icon: '✅'  },
  maintenance: { bg: 'rgba(127,29,29,0.97)',  border: '#7f1d1d', icon: '🛑'  },
}

export default function GlobalBroadcastBanner() {
  const { activeBroadcast, clearBroadcast, maintenanceMode, maintenanceMessage } = useAdminStore()

  // Maintenance mode takes precedence over any broadcast
  if (maintenanceMode) {
    const sev = SEVERITY_STYLE.maintenance
    return (
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '9px 20px',
        background: sev.bg,
        borderBottom: `1px solid ${sev.border}`,
        animation: 'bcSlideDown 0.3s ease',
        zIndex: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0, animation: 'maintPulse 1.5s ease-in-out infinite' }}>{sev.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', lineHeight: 1.4 }}>
            🔧 Scheduled Maintenance — {maintenanceMessage}
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(252,165,165,0.6)', fontWeight: 700, flexShrink: 0 }}>
          SYSTEM MAINTENANCE
        </span>
        <style>{`
          @keyframes bcSlideDown  { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
          @keyframes maintPulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
    )
  }

  if (!activeBroadcast) return null

  const sev = SEVERITY_STYLE[activeBroadcast.severity] ?? SEVERITY_STYLE.info

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '9px 20px',
      background: sev.bg,
      borderBottom: `1px solid ${sev.border}`,
      animation: 'bcSlideDown 0.3s ease',
      zIndex: 60,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{sev.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          {activeBroadcast.message}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          ADMIN BROADCAST · {new Date(activeBroadcast.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={clearBroadcast}
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', borderRadius: 6, padding: '3px 10px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
          Dismiss
        </button>
      </div>

      <style>{`
        @keyframes bcSlideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
