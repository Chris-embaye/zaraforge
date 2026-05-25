import { useEffect, useRef, useState } from 'react'
import { Smartphone, X, Pointer, FileText, ChevronsDown, Wifi, RefreshCw } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'

const TYPE_CONFIG = {
  connect: { icon: Wifi,         color: '#34d399', bg: 'rgba(52,211,153,0.1)',   bd: 'rgba(52,211,153,0.25)' },
  tap:     { icon: Pointer,      color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',    bd: 'rgba(0,229,255,0.25)'  },
  form:    { icon: FileText,     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  bd: 'rgba(167,139,250,0.25)'},
  scroll:  { icon: ChevronsDown, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   bd: 'rgba(56,189,248,0.25)' },
  reload:  { icon: RefreshCw,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   bd: 'rgba(245,158,11,0.25)' },
}

export default function MobileEventToast() {
  const { events, connected } = useDeviceStore()

  const [visible,  setVisible]  = useState(false)
  const [current,  setCurrent]  = useState(null)
  const [exiting,  setExiting]  = useState(false)
  const timerRef = useRef(null)

  const latest = events[0]

  useEffect(() => {
    if (!latest) return

    // Don't show toast for "connect" event — that's shown in the widget itself
    if (latest.type === 'connect') return

    clearTimeout(timerRef.current)
    setCurrent(latest)
    setExiting(false)
    setVisible(true)

    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => setVisible(false), 400)
    }, 4500)

    return () => clearTimeout(timerRef.current)
  }, [latest?.id])

  const dismiss = () => {
    clearTimeout(timerRef.current)
    setExiting(true)
    setTimeout(() => setVisible(false), 300)
  }

  if (!visible || !current || !connected) return null

  const cfg  = TYPE_CONFIG[current.type] ?? TYPE_CONFIG.tap
  const Icon = cfg.icon

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px 10px 10px',
      background: '#08081a',
      border: `1px solid ${cfg.bd}`,
      borderRadius: 12,
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${cfg.bg}`,
      maxWidth: 320,
      transform:  exiting ? 'translateX(110%)' : 'translateX(0)',
      opacity:    exiting ? 0 : 1,
      transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
      animation:  exiting ? 'none' : 'slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>

      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.bd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <Smartphone size={10} style={{ color: cfg.color, flexShrink: 0 }} />
          <span style={{ color: cfg.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Mobile Event
          </span>
        </div>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 500, color: '#cbd5e1',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {current.message}
        </p>
      </div>

      {/* Close */}
      <button onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 2, flexShrink: 0 }}>
        <X size={13} />
      </button>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
