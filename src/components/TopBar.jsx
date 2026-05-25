import { useState, useRef, useCallback } from 'react'
import {
  Download, Mic, Layout, Clock, Rocket, ShieldCheck,
  Code2, Sparkles, Layers, Film, Bot,
  Users, X, Copy, Check,
} from 'lucide-react'
import { useBuilderStore }     from '../store/builderStore'
import { useVibeStore }        from '../store/vibeStore'
import { useDawStore }         from '../store/dawStore'
import { useCVStore }          from '../store/codeViewStore'
import { SCALES }              from '../lib/pitchEngine'
import { mixAndDownload }      from '../lib/pitchEngine'
import DeviceConnectWidget     from './DeviceConnectWidget'
import UserProfileWidget      from './UserProfileWidget'
import LocaleSelector         from './LocaleSelector'

const SCALE_NAMES = Object.keys(SCALES)

// ── Static collaborator list ───────────────────────────────────────────────────
const COLLABS = [
  { initials: 'DS', name: 'DJ_Selam', status: 'Editing…', color: '#a78bfa', dot: '#7c3aed' },
  { initials: 'RT', name: 'Rob_T',    status: 'Viewing',   color: '#34d399', dot: '#059669' },
]

// ── Invite Crew popup widget ───────────────────────────────────────────────────
function InviteCrewWidget() {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)
  const btnRef = useRef(null)
  const [pos,    setPos]    = useState({ top: 56, right: 16 })

  const workspaceId = 'workspace-7k3f'
  const inviteLink  = `zaraforge.app/join/${workspaceId}`

  const toggle = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  const copy = useCallback(() => {
    navigator.clipboard.writeText(`https://${inviteLink}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [inviteLink])

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        ref={btnRef}
        onClick={toggle}
        title="Invite collaborators to this workspace"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 8,
          fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          background: open ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.08)',
          border: `1px solid ${open ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.28)'}`,
          color: '#a78bfa', transition: 'all 0.2s',
        }}>
        <Users size={12} />
        <span className="hidden sm:block">Invite Crew</span>
        {/* live pulse dot */}
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#a78bfa',
          boxShadow: '0 0 7px rgba(167,139,250,0.8)',
          animation: 'icPulse 2s ease-in-out infinite',
        }} />
      </button>

      {/* ── Panel ── */}
      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 48 }} />

          <div style={{
            position: 'fixed', top: pos.top, right: pos.right,
            zIndex: 49, width: 292,
            background: 'rgba(8,8,22,0.82)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 40px rgba(109,40,217,0.12), 0 1px 0 rgba(255,255,255,0.06) inset',
            animation: 'glass-float-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
          }}>

            {/* header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <Users size={13} style={{ color: '#a78bfa' }} />
              <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, flex: 1 }}>
                Invite Crew
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ padding: '14px' }}>

              {/* link section */}
              <p style={{
                fontSize: 9.5, fontWeight: 700, color: '#334155',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Workspace Invite Link
              </p>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {/* link pill */}
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  padding: '7px 10px', borderRadius: 8, minWidth: 0,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(167,139,250,0.18)',
                }}>
                  <span style={{
                    fontSize: 10.5, fontFamily: 'monospace',
                    color: '#a78bfa',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {inviteLink}
                  </span>
                </div>

                {/* copy button */}
                <button
                  onClick={copy}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(167,139,250,0.1)',
                    border: copied
                      ? '1px solid rgba(52,211,153,0.35)'
                      : '1px solid rgba(167,139,250,0.3)',
                    color: copied ? '#34d399' : '#a78bfa',
                  }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* collaborators */}
              <p style={{
                fontSize: 9.5, fontWeight: 700, color: '#334155',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Active Now — {COLLABS.length} Collaborators
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {COLLABS.map(c => (
                  <div key={c.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {/* avatar */}
                    <div style={{
                      position: 'relative',
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: `${c.color}1a`,
                      border: `1.5px solid ${c.color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: c.color,
                    }}>
                      {c.initials}
                      {/* online dot */}
                      <span style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 9, height: 9, borderRadius: '50%',
                        background: c.dot,
                        border: '1.5px solid #080814',
                      }} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                        {c.name}
                      </p>
                      <p style={{ fontSize: 10, color: c.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.status === 'Editing…' && (
                          <span style={{
                            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                            background: c.color, animation: 'icPulse 1.4s ease-in-out infinite',
                          }} />
                        )}
                        {c.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* invite more dashed cta */}
              <button
                style={{
                  width: '100%', marginTop: 12, padding: '8px 0', borderRadius: 8,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: '1px dashed rgba(167,139,250,0.25)',
                  color: '#334155', background: 'transparent', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#a78bfa'
                  e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'
                  e.currentTarget.style.background = 'rgba(167,139,250,0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#334155'
                  e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)'
                  e.currentTarget.style.background = 'transparent'
                }}>
                + Invite More People
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes icPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────
export default function TopBar() {
  const { setShowVersionHistory, appMode, setAppMode, commitSnapshot } = useBuilderStore()
  const { setShowDeploy, setShowSecurityAudit }                        = useVibeStore()
  const { tracks, bpm, projectKey, isPlaying, setBpm, setKey } = useDawStore()
  const { viewMode, setViewMode }                      = useCVStore()
  const isStudio   = appMode === 'studio'
  const isBuilder  = appMode === 'builder'
  const isLogo     = appMode === 'logo'

  const hasAudio = tracks.some(t => t.audioBuffer)

  const handleExport = async () => {
    const vocal   = tracks.find(t => t.id === 'vocal')
    const backing = tracks.find(t => t.id === 'backing')
    await mixAndDownload({
      vocalBuffer:   vocal?.audioBuffer,
      backingBuffer: backing?.audioBuffer,
      vocalGain:     vocal?.muted   ? 0 : (vocal?.volume   ?? 0.8),
      backingGain:   backing?.muted ? 0 : (backing?.volume ?? 0.6),
    })
  }

  return (
    <header
      className="flex items-center px-4 gap-4 flex-shrink-0 z-30"
      style={{
        height: 48,
        background: 'rgba(6,6,18,0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
      }}>

      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-shrink-0">
        <img
          src="/zaraforge-logo.png"
          alt="ZaraForge"
          style={{ height: 36, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* ── Mode switcher ───────────────────────────────────────────────────── */}
      <div className="flex items-center rounded-lg p-0.5 flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        {[
          { mode: 'studio',  Icon: Mic,    label: 'Studio',        activeColor: '#e2e8f0',  glowColor: 'rgba(255,255,255,0.12)' },
          { mode: 'builder', Icon: Layout, label: 'Builder',       activeColor: '#a78bfa',  glowColor: 'rgba(167,139,250,0.15)' },
          { mode: 'logo',    Icon: Layers, label: 'Vector Studio', activeColor: '#f472b6',  glowColor: 'rgba(244,114,182,0.15)' },
          { mode: 'video',   Icon: Film,   label: 'Video Editor',  activeColor: '#f87171',  glowColor: 'rgba(248,113,113,0.15)' },
          { mode: 'hadas',   Icon: Bot,    label: 'Hadas AI',      activeColor: '#34d399',  glowColor: 'rgba(52,211,153,0.15)'  },
        ].map(({ mode, Icon, label, activeColor, glowColor }) => {
          const active = appMode === mode
          return (
            <button key={mode}
              onClick={() => setAppMode(mode)}
              title={label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all"
              style={{
                background: active ? glowColor : 'transparent',
                color:      active ? activeColor : '#475569',
                boxShadow:  active ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 12px ${glowColor}` : 'none',
                border:     active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
              }}>
              <Icon size={11} />
              {label}
            </button>
          )
        })}
      </div>

      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Studio controls ─────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 flex-shrink-0 ${isStudio ? '' : 'hidden'}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">BPM</span>
          <input
            type="number" min={40} max={300} value={bpm}
            onChange={e => setBpm(Math.max(40, Math.min(300, +e.target.value)))}
            className="w-12 text-center text-xs font-bold font-mono bg-transparent border border-gray-800 rounded-md py-0.5 outline-none focus:border-indigo-700 text-gray-300 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Key</span>
          <select
            value={projectKey}
            onChange={e => setKey(e.target.value)}
            className="text-xs font-semibold rounded-md px-2 py-0.5 outline-none cursor-pointer border border-gray-800 focus:border-indigo-700 transition-colors"
            style={{ background: '#0c0c1a', color: '#a5b4fc' }}>
            {SCALE_NAMES.map(s => (
              <option key={s} value={s} style={{ background: '#0c0c1a' }}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Builder view mode toggle ────────────────────────────────────────── */}
      {isBuilder && (
        <div className="flex items-center rounded-lg p-0.5 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,229,255,0.15)',
          }}>
          <button
            onClick={() => setViewMode('ai')}
            title="AI Prompt View — conversational canvas building"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'ai' ? 'rgba(0,229,255,0.1)' : 'transparent',
              color:      viewMode === 'ai' ? '#00e5ff' : '#475569',
              boxShadow:  viewMode === 'ai' ? '0 0 10px rgba(0,229,255,0.15)' : 'none',
            }}>
            <Sparkles size={11} />
            AI View
          </button>
          <button
            onClick={() => setViewMode('code')}
            title="Developer Code View — direct file editing"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'code' ? 'rgba(139,92,246,0.1)' : 'transparent',
              color:      viewMode === 'code' ? '#a78bfa' : '#475569',
              boxShadow:  viewMode === 'code' ? '0 0 10px rgba(139,92,246,0.15)' : 'none',
            }}>
            <Code2 size={11} />
            Code View
          </button>
        </div>
      )}

      {/* ── Live playback indicator ──────────────────────────────────────────── */}
      {isPlaying && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: '#052e16', border: '1px solid #14532d' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-bold text-green-400">LIVE</span>
        </div>
      )}

      <div className="flex-1" />

      {/* ── Right actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Invite Crew — always visible */}
        <InviteCrewWidget />

        {isBuilder && (
          <button
            onClick={() => setShowVersionHistory(true)}
            title="Version history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'rgba(217,119,6,0.08)',
              border:     '1px solid rgba(217,119,6,0.22)',
              color:      '#f59e0b',
            }}>
            <Clock size={13} />
            <span className="hidden sm:block">History</span>
          </button>
        )}

        {isStudio && (
          <button
            onClick={handleExport}
            disabled={!hasAudio}
            title="Render and download the mix as WAV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(5,150,105,0.12)',
              border:     '1px solid rgba(5,150,105,0.3)',
              color:      '#34d399',
            }}>
            <Download size={13} />
            <span className="hidden sm:block">Export WAV</span>
          </button>
        )}

        {isBuilder && (
          <button
            onClick={() => setShowSecurityAudit(true)}
            title="Run security & health audit on your app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'rgba(0,255,136,0.07)',
              border:     '1px solid rgba(0,255,136,0.2)',
              color:      '#34d399',
            }}>
            <ShieldCheck size={13} />
            <span className="hidden sm:block">Security</span>
          </button>
        )}

        {isBuilder && <DeviceConnectWidget />}

        {/* Publish App */}
        <button
          onClick={() => {
            commitSnapshot('🚀 Published to ZaraForge Cloud', 'publish')
            setShowDeploy(true)
          }}
          title="Publish and deploy your app to ZaraForge Cloud"
          className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black transition-all overflow-hidden"
          style={{
            background:     'linear-gradient(90deg, #00e5ff 0%, #8b5cf6 50%, #00ff88 100%)',
            backgroundSize: '200% 100%',
            boxShadow:      '0 0 18px rgba(0,229,255,0.45), 0 0 36px rgba(0,229,255,0.18), 0 0 6px rgba(139,92,246,0.4)',
            animation:      'publishGlow 3s ease-in-out infinite alternate',
          }}>
          <Rocket size={13} />
          <span>Publish App</span>
        </button>

        {/* Language selector */}
        <LocaleSelector />

        {/* Vertical divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* User Profile / Sign In */}
        <UserProfileWidget />
      </div>

      <style>{`
        @keyframes publishGlow {
          0%   { box-shadow: 0 0 14px rgba(0,229,255,0.5), 0 0 28px rgba(0,229,255,0.2); background-position: 0% 50%; }
          100% { box-shadow: 0 0 22px rgba(139,92,246,0.6), 0 0 44px rgba(0,255,136,0.2); background-position: 100% 50%; }
        }
      `}</style>
    </header>
  )
}
