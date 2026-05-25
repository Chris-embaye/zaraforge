import { useState, useEffect, useCallback } from 'react'
import { X, Globe, Copy, Check, ExternalLink, ToggleLeft, ToggleRight, Lock, Unlock, Rocket, Share2 } from 'lucide-react'
import { useVibeStore }    from '../store/vibeStore'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore }   from '../store/toastStore'
import MobileDeployHub     from './MobileDeployHub'

// ─── Derive slug from schema if no slug set in vibeStore ──────────────────────
function deriveSlug(schema) {
  const comps  = schema?.components || []
  const nb     = comps.find(c => c.type === 'Navbar')
  const hero   = comps.find(c => c.type === 'Hero')
  const footer = comps.find(c => c.type === 'Footer')
  const raw =
    nb?.props?.brand ||
    hero?.props?.headline?.split(/\s+/).slice(0, 4).join(' ') ||
    footer?.props?.brand ||
    'my-project'
  return raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 32) || 'my-project'
}

// ─── Deploy step list ─────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Compiling frontend assets',           icon: '🎨' },
  { label: 'Bundling backend logic & API routes',  icon: '⚙️' },
  { label: 'Provisioning database schema',         icon: '🗄️' },
  { label: 'Configuring auth & access rules',      icon: '🔒' },
  { label: 'Deploying to global edge network',     icon: '🌍' },
  { label: 'Assigning live subdomain',             icon: '🔗' },
]

function DeployingView({ doneCount }) {
  const pct = Math.round((doneCount / STEPS.length) * 100)
  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400 font-medium">Deploying to ZaraForge Cloud…</span>
          <span className="text-xs font-bold font-mono" style={{ color: '#00e5ff' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#111118' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:     `${pct}%`,
              background:'linear-gradient(90deg, #00e5ff, #8b5cf6, #00ff88)',
              boxShadow: '0 0 12px rgba(0,229,255,0.45)',
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <ul className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done   = i < doneCount
          const active = i === doneCount
          return (
            <li key={step.label} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 text-sm
                ${done   ? 'bg-emerald-500/20 border border-emerald-500/40'
                : active ? 'border-2 border-cyan-400 animate-pulse bg-cyan-400/10'
                : 'border border-gray-800 bg-transparent'}`}>
                {done ? <Check size={12} className="text-emerald-400" /> : <span className="text-[11px]">{step.icon}</span>}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                done   ? 'text-gray-600 line-through decoration-gray-700'
                : active ? 'text-white font-medium'
                : 'text-gray-700'}`}>
                {step.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SuccessView({ url, copied, onCopy, deployPublic, setDeployPublic, remixPublic, setRemixPublic }) {
  return (
    <div className="space-y-5">
      {/* Badge */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(0,255,136,0.08)',
            border:     '1px solid rgba(0,255,136,0.22)',
            boxShadow:  '0 0 32px rgba(0,255,136,0.12)',
          }}>
          <Rocket size={28} style={{ color: '#00ff88' }} />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">App is live!</p>
          <p className="text-xs text-gray-500 mt-0.5">Published to the ZaraForge global edge network</p>
        </div>
      </div>

      {/* Live URL */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-0"
          style={{ background: '#0c0c1a', border: '1px solid rgba(0,229,255,0.2)' }}>
          <Globe size={12} className="text-gray-500 flex-shrink-0" />
          <span className="text-sm font-mono truncate" style={{ color: '#00e5ff' }}>https://{url}</span>
        </div>
        <button onClick={onCopy}
          className="flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex-shrink-0"
          style={{
            background: copied ? 'rgba(0,255,136,0.12)' : 'rgba(0,229,255,0.1)',
            border:     copied ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(0,229,255,0.25)',
            color:      copied ? '#00ff88' : '#00e5ff',
          }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center w-10 rounded-xl transition-colors"
          style={{ background: '#0c0c1a', border: '1px solid #1a1a2e', color: '#6b7280' }}>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Public / Private toggle */}
      <div className="rounded-xl p-4"
        style={{ background: '#0c0c1a', border: '1px solid #1a1a2e' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Visibility</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDeployPublic(true)}
            className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all"
            style={{
              background:  deployPublic ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
              border:      deployPublic ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
            <Unlock size={15} style={{ color: deployPublic ? '#00e5ff' : '#4b5563' }} />
            <div className="text-center">
              <p className="text-[11px] font-bold" style={{ color: deployPublic ? '#00e5ff' : '#6b7280' }}>Public</p>
              <p className="text-[9px] text-gray-600">Anyone can access</p>
            </div>
          </button>
          <button
            onClick={() => setDeployPublic(false)}
            className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all"
            style={{
              background:  !deployPublic ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
              border:      !deployPublic ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
            <Lock size={15} style={{ color: !deployPublic ? '#f59e0b' : '#4b5563' }} />
            <div className="text-center">
              <p className="text-[11px] font-bold" style={{ color: !deployPublic ? '#f59e0b' : '#6b7280' }}>Private</p>
              <p className="text-[9px] text-gray-600">Team members only</p>
            </div>
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-3">
          {deployPublic
            ? '🌍 Your app is publicly accessible to anyone with the link'
            : '🔒 Only authenticated team members can view this deployment'}
        </p>
      </div>

      {/* ── Remix Gallery toggle ─────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden"
        style={{
          background: remixPublic ? 'rgba(0,229,255,0.04)' : '#0c0c1a',
          border: remixPublic ? '1px solid rgba(0,229,255,0.22)' : '1px solid #1a1a2e',
          transition: 'all 0.25s',
        }}>
        <div className="flex items-center gap-3 p-4">
          {/* icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: remixPublic ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
              border:     remixPublic ? '1px solid rgba(0,229,255,0.3)' : '1px solid #1e293b',
            }}>
            <Share2 size={15} style={{ color: remixPublic ? '#00e5ff' : '#475569', transition: 'color 0.2s' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold transition-colors duration-200"
              style={{ color: remixPublic ? '#e2e8f0' : '#64748b' }}>
              🚀 Share to Remix Gallery
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">
              Let creators clone your layout &amp; audio FX profile
            </p>
          </div>

          <button onClick={() => setRemixPublic(!remixPublic)} className="flex-shrink-0">
            {remixPublic
              ? <ToggleRight size={22} style={{ color: '#00e5ff' }} />
              : <ToggleLeft  size={22} style={{ color: '#374151' }} />}
          </button>
        </div>

        {/* expanded confirmation strip */}
        {remixPublic && (
          <div className="flex items-center gap-2 px-4 pb-3">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)' }}>
              <span style={{ fontSize: 11 }}>✦</span>
              <p className="text-[10.5px] font-semibold" style={{ color: '#00e5ff' }}>
                Listed in Remix Gallery — anyone can fork this template
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Edge Nodes', value: '214', color: '#00e5ff' },
          { label: 'Avg Latency', value: '18ms', color: '#00ff88' },
          { label: 'Uptime SLA', value: '99.9%', color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="text-center py-2.5 rounded-xl"
            style={{ background: '#0c0c1a', border: '1px solid #1a1a2e' }}>
            <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main DeployModal ─────────────────────────────────────────────────────────
export default function DeployModal() {
  const { setShowDeploy, deployPublic, setDeployPublic, deploySlug, remixPublic, setRemixPublic } = useVibeStore()
  const { schema } = useBuilderStore()
  const { showToast } = useToastStore()

  const [phase,     setPhase]     = useState('deploying')
  const [doneCount, setDoneCount] = useState(0)
  const [copied,    setCopied]    = useState(false)

  const slug = deploySlug || deriveSlug(schema)
  const url  = `${slug}.zaraforge.app`

  // Tick through deploy steps
  useEffect(() => {
    if (phase !== 'deploying') return
    let n = 0
    const tick = () => {
      n++
      setDoneCount(n)
      if (n < STEPS.length) setTimeout(tick, 500)
      else setTimeout(() => setPhase('success'), 450)
    }
    const t = setTimeout(tick, 380)
    return () => clearTimeout(t)
  }, [phase])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://${url}`).catch(() => {})
    setCopied(true)
    showToast({ title: '🔗 Link copied!', body: `https://${url}`, type: 'success' })
    setTimeout(() => setCopied(false), 2500)
  }, [url, showToast])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md flex flex-col max-h-[92vh] overflow-hidden rounded-2xl"
        style={{
          background: '#08080f',
          border:     '1px solid rgba(0,229,255,0.12)',
          boxShadow:  '0 0 0 1px rgba(99,102,241,0.06), 0 0 60px rgba(0,229,255,0.08), 0 32px 64px rgba(0,0,0,0.7)',
        }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #111118' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(0,229,255,0.07)',
              border:     '1px solid rgba(0,229,255,0.2)',
              boxShadow:  '0 0 20px rgba(0,229,255,0.12)',
            }}>
            <Globe size={18} style={{ color: '#00e5ff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">
              {phase === 'deploying' ? 'Publishing Your App…' : 'App Published'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
              {phase === 'deploying' ? 'Deploying to ZaraForge Cloud' : `https://${url}`}
            </p>
          </div>
          <button onClick={() => setShowDeploy(false)} className="p-1 text-gray-600 hover:text-white transition-colors flex-shrink-0">
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'deploying'
            ? <DeployingView doneCount={doneCount} />
            : <>
                <SuccessView
                  url={url}
                  copied={copied}
                  onCopy={copyLink}
                  deployPublic={deployPublic}
                  setDeployPublic={setDeployPublic}
                  remixPublic={remixPublic}
                  setRemixPublic={setRemixPublic}
                />
                <MobileDeployHub />
              </>
          }
        </div>

        {/* Footer */}
        {phase === 'success' && (
          <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid #111118' }}>
            <button
              onClick={() => setShowDeploy(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a2e' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
