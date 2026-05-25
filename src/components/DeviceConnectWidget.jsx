import { useRef, useState, useEffect, useMemo } from 'react'
import { Smartphone, Wifi, WifiOff, X, Loader2, Zap, Activity, Trash2 } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'
import { useAuthStore }   from '../store/authStore'
import ProUpgradeGate     from './ProUpgradeGate'
import QRCodeLib from 'qrcode'

// ── Real QR code renderer ─────────────────────────────────────────────────────
// Uses the `qrcode` library to encode the actual URL into a proper QR matrix,
// then renders it as a crisp SVG on a white isolation pad so phone cameras
// can reliably decode it.
function QRCodeSVG({ value, size = 160 }) {
  const { data, dim } = useMemo(() => {
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' })
      return { data: Array.from(qr.modules.data), dim: qr.modules.size }
    } catch (e) {
      console.error('QR generation failed:', e)
      return { data: null, dim: 0 }
    }
  }, [value])

  const cell = dim > 0 ? size / dim : 0

  return (
    <div style={{
      background: '#ffffff',
      padding: 14,
      borderRadius: 12,
      display: 'inline-block',
      lineHeight: 0,
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    }}>
      {data ? (
        <svg width={size} height={size}
          style={{ display: 'block', shapeRendering: 'crispEdges' }}>
          {/* White background ensures quiet zone within the SVG itself */}
          <rect width={size} height={size} fill="#ffffff" />
          {data.map((val, i) => {
            if (!val) return null
            const x = i % dim
            const y = Math.floor(i / dim)
            return (
              <rect key={i}
                x={x * cell} y={y * cell}
                width={cell} height={cell}
                fill="#111827"
              />
            )
          })}
        </svg>
      ) : (
        <div style={{ width: size, height: size, background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#94a3b8' }}>
          QR error
        </div>
      )}
    </div>
  )
}

// ── Event type config ──────────────────────────────────────────────────────────
const EV_CONFIG = {
  connect: { color: '#34d399', label: 'connect' },
  tap:     { color: '#00e5ff', label: 'tap'     },
  form:    { color: '#a78bfa', label: 'form'    },
  scroll:  { color: '#38bdf8', label: 'scroll'  },
  reload:  { color: '#f59e0b', label: 'reload'  },
}

function fmtAge(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function DevicePanel({ pos, onClose }) {
  const {
    connected, connecting, deviceName, deviceOS, latencyMs,
    sessionId, events, unreadCount,
    connectDevice, disconnectDevice, clearEvents, clearUnread,
  } = useDeviceStore()

  useEffect(() => { clearUnread() }, [])

  const sessionUrl    = `https://zaraforge.com/?phoneSession=${sessionId}`
  const sessionShort  = `zaraforge.com/?phoneSession=${sessionId}`

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(iv)
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 48 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: pos.top, right: pos.right,
        zIndex: 49, width: 300,
        background: '#080814', border: '1px solid rgba(0,229,255,0.2)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,255,0.08)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid #111118', background: '#060610' }}>
          <Smartphone size={14} style={{ color: '#00e5ff' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, flex: 1 }}>Live Device Mirror</span>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* QR area */}
        <div style={{ padding: '20px 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <QRCodeSVG value={sessionUrl} size={156} />

          <p style={{ margin: 0, fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.4, padding: '0 16px' }}>
            Scan to open live sandbox<br />on your mobile device
          </p>

          <div style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
            color: '#00e5ff', fontFamily: 'monospace', letterSpacing: 0,
          }}>
            {sessionShort}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#111118', margin: '0 14px' }} />

        {/* Status */}
        <div style={{ padding: '12px 14px' }}>
          {!connected && !connecting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: '#64748b', fontSize: 12 }}>Waiting for device...</span>
              </div>
              <button onClick={connectDevice}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff',
                  background: 'rgba(0,229,255,0.08)', transition: 'all 0.2s',
                }}>
                ⚡ Simulate Device Connect
              </button>
            </div>
          )}

          {connecting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <Loader2 size={14} style={{ color: '#00e5ff', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#00e5ff', fontSize: 12, fontWeight: 600 }}>Establishing connection...</span>
            </div>
          )}

          {connected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Device info */}
              <div style={{
                padding: '8px 10px', borderRadius: 8,
                background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#34d399',
                    boxShadow: '0 0 6px #34d399', animation: 'pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ color: '#34d399', fontSize: 12, fontWeight: 700 }}>{deviceName}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, paddingLeft: 14 }}>
                  <span style={{ color: '#475569', fontSize: 11 }}>{deviceOS}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#00e5ff', fontSize: 11 }}>
                    <Activity size={10} />{latencyMs}ms
                  </span>
                  <span style={{ color: '#34d399', fontSize: 11 }}>Hot-reload ✓</span>
                </div>
              </div>

              {/* Recent events */}
              {events.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Recent Events
                    </span>
                    <button onClick={clearEvents}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 0 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 110, overflowY: 'auto' }}>
                    {events.slice(0, 6).map(ev => {
                      const cfg = EV_CONFIG[ev.type] ?? EV_CONFIG.tap
                      return (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                            background: `${cfg.color}18`, color: cfg.color, flexShrink: 0,
                          }}>{cfg.label}</span>
                          <span style={{ color: '#64748b', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.message}
                          </span>
                          <span style={{ color: '#1e293b', fontSize: 10, flexShrink: 0 }}>{fmtAge(ev.ts)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={disconnectDevice}
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid #1e293b', color: '#475569', background: 'transparent',
                }}>
                Disconnect
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin  { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        `}</style>
      </div>
    </>
  )
}

// ── Button (rendered in TopBar) ────────────────────────────────────────────────
export default function DeviceConnectWidget() {
  const { showPanel, setShowPanel, connected, connecting, unreadCount } = useDeviceStore()
  const { user } = useAuthStore()
  const isPro = user?.plan === 'Pro'
  const btnRef = useRef(null)
  const [panelPos, setPanelPos] = useState({ top: 56, right: 16 })
  const [showProGate, setShowProGate] = useState(false)

  const handleToggle = () => {
    if (!isPro) { setShowProGate(true); return }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setShowPanel(!showPanel)
  }

  const color    = connected ? '#34d399' : connecting ? '#00e5ff' : '#a78bfa'
  const bgColor  = connected ? 'rgba(52,211,153,0.08)' : connecting ? 'rgba(0,229,255,0.08)' : 'rgba(167,139,250,0.08)'
  const bdColor  = connected ? 'rgba(52,211,153,0.25)' : connecting ? 'rgba(0,229,255,0.25)' : 'rgba(167,139,250,0.25)'

  return (
    <>
      <button ref={btnRef} onClick={handleToggle}
        title="Connect a physical device for live preview"
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', border: `1px solid ${bdColor}`, color, background: bgColor,
          transition: 'all 0.2s', flexShrink: 0,
        }}>
        <Smartphone size={12} />
        <span className="hidden sm:block">
          {connecting ? 'Connecting...' : connected ? 'Device Live' : 'Connect Phone'}
        </span>
        {!isPro && (
          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', letterSpacing: '0.04em' }}>PRO</span>
        )}
        {connected && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#34d399',
            boxShadow: '0 0 6px #34d399', animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}
        {!connected && !connecting && unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 99, padding: '0 4px',
            background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && isPro && (
        <DevicePanel pos={panelPos} onClose={() => setShowPanel(false)} />
      )}

      {showProGate && (
        <ProUpgradeGate reason="phone_mirror" onClose={() => setShowProGate(false)} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </>
  )
}
