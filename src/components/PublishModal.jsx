import { useState, useEffect, useCallback } from 'react'
import {
  X, Globe, Copy, Check, Share2,
  Music, Play, ExternalLink, Zap,
} from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore }   from '../store/toastStore'

// ── Slug derivation ────────────────────────────────────────────────────────────
function deriveSlug(schema) {
  const comps  = schema.components || []
  const navbar = comps.find(c => c.type === 'Navbar')
  const vocal  = comps.find(c => c.type === 'VocalStudio')
  const hero   = comps.find(c => c.type === 'Hero')
  const footer = comps.find(c => c.type === 'Footer')
  const raw =
    navbar?.props?.brand ||
    vocal?.props?.title  ||
    hero?.props?.headline?.split(/\s+/).slice(0, 4).join(' ') ||
    footer?.props?.brand ||
    'my project'
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'my-project'
}

// ── Release card waveform ──────────────────────────────────────────────────────
function ReleaseWave({ accent }) {
  const W = 300, H = 38, bw = 2, gap = 1
  const bars = []
  for (let x = 0; x < W; x += bw + gap) {
    const t = x / W
    const amp =
      Math.abs(Math.sin(t * Math.PI * 11 + 0.3)) * 0.58 +
      Math.abs(Math.sin(t * Math.PI * 27 + 1.5)) * 0.27 +
      Math.abs(Math.sin(t * Math.PI *  6 + 2.1)) * 0.15
    const h = amp * H * 0.9
    bars.push(
      <rect key={x} x={x} y={(H - h) / 2} width={bw} height={h}
        fill={accent} opacity={0.75} rx={1} />
    )
  }
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {bars}
    </svg>
  )
}

// ── Deploy steps ───────────────────────────────────────────────────────────────
const STEPS = [
  'Compiling design assets',
  'Generating optimised HTML & CSS',
  'Processing media components',
  'Deploying to global edge network',
  'Configuring live subdomain',
]

// ── Sub-views ──────────────────────────────────────────────────────────────────
function DeployingView({ doneCount }) {
  const pct = Math.round((doneCount / STEPS.length) * 100)
  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400 font-medium">Deploying…</span>
          <span className="text-xs font-bold font-mono"
            style={{ color: '#00e5ff' }}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #00e5ff, #00ff88)',
              boxShadow: '0 0 10px rgba(0,229,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <ul className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done    = i < doneCount
          const active  = i === doneCount
          return (
            <li key={step} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                done   ? 'bg-emerald-500'
                : active ? 'border-2 border-cyan-400 animate-pulse'
                : 'border border-gray-700'
              }`}>
                {done && <Check size={11} className="text-white" />}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                done ? 'text-gray-400 line-through decoration-gray-600'
                : active ? 'text-white font-medium' : 'text-gray-600'
              }`}>{step}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SuccessView({ url, copied, onCopy, onTwitter, onWhatsApp, onBio, hasVocal, trackTitle, artistName, accent }) {
  return (
    <div className="space-y-5">

      {/* Success badge */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', boxShadow: '0 0 24px rgba(0,255,136,0.15)' }}>
          <Check size={26} style={{ color: '#00ff88' }} />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">Your project is live!</p>
          <p className="text-xs text-gray-500 mt-0.5">Published to the ZaraForge global edge network</p>
        </div>
      </div>

      {/* URL row */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl min-w-0">
          <Globe size={13} className="text-gray-500 flex-shrink-0" />
          <span className="text-sm font-mono text-cyan-300 truncate">{url}</span>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
          style={{
            background: copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,229,255,0.12)',
            border: copied ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(0,229,255,0.3)',
            color: copied ? '#00ff88' : '#00e5ff',
          }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={`https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Social share */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">Share</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onTwitter}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-sky-500/40 hover:bg-sky-950/30 transition-all group">
            <span className="text-lg">𝕏</span>
            <span className="text-[10px] font-semibold text-gray-500 group-hover:text-sky-400 transition-colors">Twitter / X</span>
          </button>
          <button
            onClick={onWhatsApp}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500/40 hover:bg-emerald-950/30 transition-all group">
            <span className="text-lg">💬</span>
            <span className="text-[10px] font-semibold text-gray-500 group-hover:text-emerald-400 transition-colors">WhatsApp</span>
          </button>
          <button
            onClick={onBio}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-pink-500/40 hover:bg-pink-950/30 transition-all group">
            <span className="text-lg">📲</span>
            <span className="text-[10px] font-semibold text-gray-500 group-hover:text-pink-400 transition-colors">Bio Link</span>
          </button>
        </div>
      </div>

      {/* Audio Release Card — only shown when schema has VocalStudio */}
      {hasVocal && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
            Audio Release Card
          </p>
          <div className="rounded-2xl overflow-hidden border border-gray-700/50"
            style={{ background: 'linear-gradient(135deg, #07070d 0%, #0d0d1a 60%, ' + accent + '15 100%)' }}>

            {/* Card header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: accent + '22', border: `1px solid ${accent}44` }}>
                  <Zap size={10} style={{ color: accent }} />
                </div>
                <span className="text-[10px] font-bold tracking-widest"
                  style={{ color: accent + 'aa' }}>ZARAFORGE</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">{new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
            </div>

            {/* Waveform */}
            <div className="px-4 py-2">
              <ReleaseWave accent={accent} />
            </div>

            {/* Track info + play */}
            <div className="flex items-center gap-3 px-4 pb-4">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                style={{ background: accent, boxShadow: `0 0 16px ${accent}55` }}>
                <Play size={14} fill="currentColor" className="text-black ml-0.5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{trackTitle}</p>
                <p className="text-[11px] text-gray-500 truncate">{artistName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-semibold" style={{ color: accent + '99' }}>NEW RELEASE</p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Music size={9} style={{ color: accent + '66' }} />
                  <span className="text-[9px] text-gray-600">zaraforge.app</span>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="px-4 py-2 border-t flex items-center justify-between"
              style={{ borderColor: accent + '15' }}>
              <span className="text-[9px] font-mono text-gray-700 truncate">{url}</span>
              <button
                onClick={onCopy}
                className="text-[9px] font-bold ml-2 flex-shrink-0 flex items-center gap-1 transition-colors"
                style={{ color: accent + '88' }}>
                <Share2 size={9} /> Share
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Screenshot this card to share on Instagram, TikTok, or anywhere
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function PublishModal() {
  const { schema, setShowPublish } = useBuilderStore()
  const { showToast }              = useToastStore()

  const [phase,     setPhase]     = useState('deploying')
  const [doneCount, setDoneCount] = useState(0)
  const [copied,    setCopied]    = useState(false)

  const slug   = deriveSlug(schema)
  const url    = `zaraforge.app/release/${slug}`

  const comps      = schema.components || []
  const hasVocal   = comps.some(c => c.type === 'VocalStudio')
  const vocalComp  = comps.find(c => c.type === 'VocalStudio')
  const navbarComp = comps.find(c => c.type === 'Navbar')
  const accent     = vocalComp?.props?.accentColor || schema.theme?.primaryColor || '#6366f1'
  const trackTitle = vocalComp?.props?.title || 'Untitled Track'
  const artistName = navbarComp?.props?.brand || 'Artist'

  // Tick through deploy steps
  useEffect(() => {
    if (phase !== 'deploying') return
    let n = 0
    const tick = () => {
      n++
      setDoneCount(n)
      if (n < STEPS.length) setTimeout(tick, 450)
      else setTimeout(() => setPhase('success'), 400)
    }
    const t = setTimeout(tick, 350)
    return () => clearTimeout(t)
  }, [phase])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://${url}`).catch(() => {})
    setCopied(true)
    showToast({ title: '🔗 Link copied!', body: `https://${url}`, type: 'success' })
    setTimeout(() => setCopied(false), 2500)
  }, [url, showToast])

  const shareTwitter = () => {
    const text = encodeURIComponent(`Just published with ZaraForge 🚀 Check it out:`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://' + url)}`, '_blank')
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my project on ZaraForge! 🚀 https://${url}`)}`, '_blank')
  }

  const copyForBio = () => {
    const text = hasVocal
      ? `🎵 New release: ${trackTitle}\n🔗 https://${url}\nMade with ZaraForge`
      : `✨ Check out my new site: https://${url}\nBuilt with ZaraForge`
    navigator.clipboard.writeText(text).catch(() => {})
    showToast({ title: '📋 Bio text copied!', body: 'Paste it into your Instagram or TikTok bio', type: 'success' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(0,229,255,0.06), 0 32px 64px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', boxShadow: '0 0 14px rgba(0,229,255,0.12)' }}>
            <Globe size={17} style={{ color: '#00e5ff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">Publish to Web</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {phase === 'deploying' ? 'Deploying to ZaraForge Cloud…' : `Live at ${url}`}
            </p>
          </div>
          <button
            onClick={() => setShowPublish(false)}
            className="text-gray-600 hover:text-white transition-colors p-1 flex-shrink-0">
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'deploying'
            ? <DeployingView doneCount={doneCount} />
            : <SuccessView
                url={url}
                copied={copied}
                onCopy={copyLink}
                onTwitter={shareTwitter}
                onWhatsApp={shareWhatsApp}
                onBio={copyForBio}
                hasVocal={hasVocal}
                trackTitle={trackTitle}
                artistName={artistName}
                accent={accent}
              />
          }
        </div>

        {/* Footer */}
        {phase === 'success' && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-800 flex-shrink-0">
            <button
              onClick={() => setShowPublish(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
