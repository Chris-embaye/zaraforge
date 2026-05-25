import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, Sparkles, MessageSquare, Layers,
  Database, Shield, Zap, Plus, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle,
  BarChart3, Terminal, Cpu, Hammer, MessageCircle, ImageIcon, Trash2, Mic, ClipboardList,
} from 'lucide-react'
import GenerationBlueprint from './GenerationBlueprint'
import { useAssetLibraryStore } from '../store/assetLibraryStore'
import { useVibeStore }    from '../store/vibeStore'
import { useBuilderStore } from '../store/builderStore'
import { COMPONENT_LIBRARY } from '../lib/componentDefs'
import AgentsPanel from './AgentsPanel'
import { useTranslation } from '../i18n'

// ─── Simple inline markdown renderer ─────────────────────────────────────────
function MsgText({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (!line) return <div key={i} className="h-1" />
        const isBullet = line.startsWith('- ')
        const content  = isBullet ? line.slice(2) : line
        const parts    = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
        const nodes    = parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**'))
            return <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>
          if (p.startsWith('*')  && p.endsWith('*'))
            return <em key={j} className="text-gray-300 italic">{p.slice(1, -1)}</em>
          if (p.startsWith('`')  && p.endsWith('`'))
            return <code key={j} className="bg-gray-900 px-1.5 py-0.5 rounded text-cyan-300 text-[11px] font-mono border border-gray-700">{p.slice(1, -1)}</code>
          return <span key={j}>{p}</span>
        })
        return (
          <p key={i} className={isBullet ? 'flex gap-2 items-start' : ''}>
            {isBullet && <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>}
            <span>{nodes}</span>
          </p>
        )
      })}
    </div>
  )
}

// ─── Thinking terminal strip ──────────────────────────────────────────────────
function ThinkingBar({ step }) {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 420)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <Terminal size={13} className="text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Building</p>
        <p className="text-xs text-gray-300 font-mono truncate">{step}{dots}</p>
      </div>
    </div>
  )
}

// ─── Plan confirm/cancel buttons ──────────────────────────────────────────────
function PlanActions({ onConfirm, onCancel }) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={onConfirm}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
        style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)', color: '#00e5ff' }}>
        <CheckCircle size={12} /> Confirm &amp; Build
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-white transition-all"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <XCircle size={12} /> Cancel
      </button>
    </div>
  )
}

// ─── Infrastructure panel ────────────────────────────────────────────────────
function InfraPanel() {
  const { authEnabled, setAuthEnabled, automations, toggleAutomation, dbTable, dbStorageMb, setCanvasMode } = useVibeStore()
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  const totalStorage = dbStorageMb || 0
  const pct = Math.min(100, (totalStorage / 100) * 100)

  return (
    <div className="border-t flex-shrink-0" style={{ borderColor: '#111118' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('infra_title')}</span>
        </div>
        {open ? <ChevronUp size={11} className="text-gray-600" /> : <ChevronDown size={11} className="text-gray-600" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5">

          {/* Auth */}
          <div className="flex items-center justify-between py-2 px-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Shield size={12} className={authEnabled ? 'text-emerald-400' : 'text-gray-600'} />
              <div>
                <p className="text-[11px] font-semibold text-gray-300">{t('infra_auth')}</p>
                <p className="text-[9px] text-gray-600">{authEnabled ? t('infra_auth_enabled') : t('infra_auth_disabled')}</p>
              </div>
            </div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className="flex-shrink-0">
              {authEnabled
                ? <ToggleRight size={20} className="text-emerald-400" />
                : <ToggleLeft size={20} className="text-gray-600" />}
            </button>
          </div>

          {/* Database */}
          <div className="py-2 px-2.5 rounded-lg cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onClick={() => dbTable && setCanvasMode('data')}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Database size={12} className={dbTable ? 'text-cyan-400' : 'text-gray-600'} />
                <p className="text-[11px] font-semibold text-gray-300">{t('infra_db')}</p>
              </div>
              {dbTable && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.25)' }}>
                  Active
                </span>
              )}
            </div>
            {dbTable ? (
              <>
                <p className="text-[10px] text-gray-500 font-mono mb-1.5">`{dbTable.name}` · {dbTable.rows.length} rows</p>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      background: 'linear-gradient(90deg, #00e5ff, #6366f1)',
                    }} />
                </div>
                <p className="text-[9px] text-gray-600 mt-1">{totalStorage.toFixed(1)} MB used · click to view data</p>
              </>
            ) : (
              <p className="text-[10px] text-gray-600">{t('infra_db_empty')}</p>
            )}
          </div>

          {/* Automations */}
          <div className="py-2 px-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-amber-400" />
              <p className="text-[11px] font-semibold text-gray-300">{t('infra_automations')}</p>
              <span className="ml-auto text-[9px] text-amber-400 font-bold">{automations.filter(a => a.status === 'active').length} active</span>
            </div>
            <div className="space-y-1.5">
              {automations.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.status === 'active' ? 'bg-amber-400' : 'bg-gray-700'}`} />
                    <p className="text-[10px] text-gray-400 truncate">{a.name}</p>
                  </div>
                  <button onClick={() => toggleAutomation(a.id)} className="flex-shrink-0">
                    {a.status === 'active'
                      ? <ToggleRight size={15} className="text-amber-400" />
                      : <ToggleLeft  size={15} className="text-gray-700" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component library panel ──────────────────────────────────────────────────
function ComponentsTab() {
  const { addComponent, formSubmissions, setShowFormAnalytics } = useBuilderStore()
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {COMPONENT_LIBRARY.map(cat => (
          <div key={cat.category}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-2 mb-1.5">{cat.category}</p>
            <div className="space-y-0.5">
              {cat.items.map(item => (
                <button key={item.type} onClick={() => addComponent(item.type)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-gray-800 group transition-colors">
                  <item.icon size={13} className="text-gray-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors truncate">{item.label}</p>
                    <p className="text-[9px] text-gray-600 truncate">{item.description}</p>
                  </div>
                  <Plus size={11} className="text-gray-700 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 px-2 py-2 border-t" style={{ borderColor: '#111118' }}>
        <button onClick={() => setShowFormAnalytics(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-gray-800 group transition-colors">
          <BarChart3 size={13} className="text-gray-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          <span className="flex-1 text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors">Form Data</span>
          {formSubmissions.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600/30 text-indigo-400">
              {formSubmissions.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Builder Asset Library tab ───────────────────────────────────────────────
function BuilderAssetsTab() {
  const { builderAssets, removeBuilderAsset } = useAssetLibraryStore()

  if (!builderAssets.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, flex: 1, padding: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ImageIcon size={22} style={{ color: '#1e293b' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>No assets yet</p>
          <p style={{ fontSize: 10.5, color: '#1e293b', lineHeight: 1.5 }}>
            Use "Send to Builder" from<br />Logo Maker or BG Remover
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 10, color: '#475569', fontWeight: 600, paddingLeft: 2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {builderAssets.length} asset{builderAssets.length !== 1 ? 's' : ''} — click to copy URL
      </p>
      {builderAssets.map(asset => (
        <div key={asset.id} style={{
          borderRadius: 10, overflow: 'hidden',
          background: '#0c0c1a', border: '1px solid #111118',
          transition: 'border-color 0.15s',
        }}>
          {/* Preview */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '1',
            backgroundImage: 'repeating-conic-gradient(#111118 0% 25%, #0c0c1a 0% 50%)',
            backgroundSize: '12px 12px',
          }}>
            <img
              src={asset.dataUrl}
              alt={asset.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          {/* Meta + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset.name}
              </p>
              <p style={{ fontSize: 9, color: '#334155' }}>{asset.source}</p>
            </div>
            <button
              onClick={() => removeBuilderAsset(asset.id)}
              title="Remove asset"
              style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: 'transparent', border: '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#334155',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ChatAssistant panel ─────────────────────────────────────────────────
const EXAMPLES = [
  "A restaurant booking site for Aria's Kitchen",
  'SaaS startup homepage with pricing and users',
  'Dark music portfolio for DJ named Zara',
  'Health & wellness clinic with appointment booking',
  'E-commerce fashion brand with bold hero',
]

export default function ChatAssistant() {
  const {
    messages, isThinking, thinkingStep, planMode, setPlanMode,
    pendingPlan, confirmPlan, cancelPlan, sendMessage,
    chatMode, setChatMode,
  } = useVibeStore()
  const { setSchema, startGeneration, genPhase, onboardingStep } = useBuilderStore()

  const { t: tr } = useTranslation()
  const [tab,         setTab]         = useState('chat')
  const { builderAssets } = useAssetLibraryStore()
  const [input,       setInput]       = useState('')
  const [showChips,   setShowChips]   = useState(false)
  const [isListening, setIsListening] = useState(false)
  const listenTimerRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const toggleVoice = useCallback(() => {
    if (isListening) {
      setIsListening(false)
      clearTimeout(listenTimerRef.current)
      return
    }
    setIsListening(true)
    setShowChips(false)
    // auto-stop after 6 s (simulated listening window)
    listenTimerRef.current = setTimeout(() => setIsListening(false), 6000)
  }, [isListening])

  useEffect(() => () => clearTimeout(listenTimerRef.current), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const submit = () => {
    const t = input.trim()
    if (!t || isThinking) return
    setInput('')
    setShowChips(false)
    startGeneration()
    setTab('blueprint')
    sendMessage(t, { setSchema })
  }

  // Auto-switch to blueprint when generation is running or resumes after signup
  useEffect(() => {
    if (genPhase === 'running' || onboardingStep === 'running_tasks') setTab('blueprint')
  }, [genPhase, onboardingStep])

  return (
    <aside
      className="w-72 flex flex-col overflow-hidden flex-shrink-0"
      style={{
        background: 'rgba(6,6,18,0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}>

      {/* ── Tab bar ── */}
      <div className="flex items-center px-2 pt-2 pb-0 gap-1 flex-shrink-0">
        {[
          { id: 'chat',       icon: MessageSquare,  label: tr('chat_tab_aichat')      },
          { id: 'agents',     icon: Cpu,            label: tr('chat_tab_agents')      },
          { id: 'components', icon: Layers,         label: tr('chat_tab_components')  },
          { id: 'assets',     icon: ImageIcon,      label: tr('chat_tab_assets'), badge: builderAssets.length || null },
          { id: 'blueprint',  icon: ClipboardList,  label: tr('chat_tab_blueprint'),
            badge: genPhase === 'running' ? '⚡' : genPhase === 'done' ? '✓' : null,
            badgeColor: genPhase === 'done' ? '#34d399' : '#818cf8' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-xs font-semibold transition-all"
            style={{
              background:  tab === t.id ? '#0c0c1a' : 'transparent',
              color:       tab === t.id ? '#e2e8f0' : '#475569',
              borderTop:   tab === t.id ? '1px solid #1a1a2e' : 'none',
              borderLeft:  tab === t.id ? '1px solid #1a1a2e' : 'none',
              borderRight: tab === t.id ? '1px solid #1a1a2e' : 'none',
            }}>
            <t.icon size={10} />
            {t.label}
            {t.badge ? (
              <span style={{
                fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 99, lineHeight: 1,
                background: t.badgeColor ? `${t.badgeColor}22` : 'rgba(0,229,255,0.2)',
                color: t.badgeColor ?? '#00e5ff',
                border: `1px solid ${t.badgeColor ? `${t.badgeColor}44` : 'transparent'}`,
              }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="h-px flex-shrink-0" style={{ background: '#1a1a2e' }} />

      {/* ── Agents tab ── */}
      {tab === 'agents' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentsPanel />
          </div>
        </div>
      )}

      {/* ── Components tab ── */}
      {tab === 'components' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            <ComponentsTab />
          </div>
          <InfraPanel />
        </div>
      )}

      {/* ── Assets tab ── */}
      {tab === 'assets' && (
        <div className="flex flex-col flex-1 min-h-0">
          <BuilderAssetsTab />
        </div>
      )}

      {/* ── Blueprint tab ── */}
      {tab === 'blueprint' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <GenerationBlueprint />
        </div>
      )}

      {/* ── Chat tab ── */}
      {tab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">

          {/* Mode controls row */}
          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid #0f0f1a' }}>

            {/* Build / Discuss mode switcher */}
            <div className="flex items-center rounded-lg p-0.5 flex-1"
              style={{ background: '#0c0c1a', border: '1px solid #1a1a2e' }}>
              <button
                onClick={() => setChatMode('build')}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all flex-1 justify-center"
                style={{
                  background: chatMode === 'build' ? '#1e293b' : 'transparent',
                  color:      chatMode === 'build' ? '#00e5ff' : '#374151',
                }}>
                <Hammer size={9} />
                {tr('chat_mode_build')}
              </button>
              <button
                onClick={() => setChatMode('discuss')}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all flex-1 justify-center"
                style={{
                  background: chatMode === 'discuss' ? '#1e293b' : 'transparent',
                  color:      chatMode === 'discuss' ? '#a78bfa' : '#374151',
                }}>
                <MessageCircle size={9} />
                {tr('chat_mode_discuss')}
              </button>
            </div>

            {/* Plan Mode pill (build mode only) */}
            {chatMode === 'build' && (
              <button
                onClick={() => setPlanMode(!planMode)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0"
                style={{
                  background: planMode ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                  border:     planMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid #1a1a2e',
                  color:      planMode ? '#f59e0b' : '#374151',
                }}>
                <AlertCircle size={9} />
                {tr('chat_mode_plan')}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={msg.role === 'assistant'
                    ? { background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)' }
                    : { background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)' }}>
                  {msg.role === 'assistant'
                    ? <Bot size={11} className="text-indigo-400" />
                    : <Sparkles size={11} style={{ color: '#00e5ff' }} />}
                </div>

                {/* Bubble */}
                <div
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-xs text-gray-300"
                  style={msg.role === 'user'
                    ? { background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <MsgText text={msg.text} />
                  {msg.isPlan && pendingPlan && (
                    <PlanActions
                      onConfirm={() => confirmPlan({ setSchema })}
                      onCancel={cancelPlan}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Thinking animation */}
            {isThinking && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <Bot size={11} className="text-indigo-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <ThinkingBar step={thinkingStep} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-3 py-3 space-y-2"
            style={{ borderTop: '1px solid #0f0f1a' }}>

            {/* Example chips */}
            {showChips && (
              <div className="rounded-xl overflow-hidden"
                style={{ background: '#0c0c1a', border: '1px solid #1a1a2e' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-3 pt-2 pb-1">Examples</p>
                {EXAMPLES.map(ex => (
                  <button key={ex} onMouseDown={() => { setInput(ex); setShowChips(false); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2">
                    <Sparkles size={9} className="text-indigo-400 flex-shrink-0" />
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {/* ── Textarea + wave overlay wrapper ── */}
            <div style={{ position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                rows={2}
                onChange={e => setInput(e.target.value)}
                onFocus={() => !isListening && setShowChips(true)}
                onBlur={() => setTimeout(() => setShowChips(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                }}
                placeholder={
                  isListening        ? ''
                  : chatMode === 'discuss' ? "Tell me your idea — I'll brainstorm it with you…"
                  : planMode         ? 'Describe your app — I\'ll plan first…'
                  : 'Describe your full-stack app…'
                }
                className="w-full resize-none text-[11px] rounded-xl px-3 py-2.5 text-gray-200 placeholder-gray-600 outline-none transition-all"
                style={{
                  background: isListening ? 'rgba(99,102,241,0.06)' : '#0c0c1a',
                  border:     isListening ? '1px solid rgba(99,102,241,0.45)' : '1px solid #1a1a2e',
                  lineHeight: '1.5',
                  transition: 'all 0.3s',
                }}
                disabled={isThinking || isListening}
              />

              {/* Sound-wave listening overlay */}
              {isListening && (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: 12, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '0 16px',
                  pointerEvents: 'none',
                }}>
                  {/* mic label */}
                  <span style={{
                    position: 'absolute', top: 7, left: 12,
                    fontSize: 9, fontWeight: 700, color: '#a78bfa',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#ef4444',
                      animation: 'vpRecDot 1s ease-in-out infinite',
                    }} />
                    Listening…
                  </span>

                  {/* Waveform bars */}
                  {[0.55, 0.8, 1, 0.65, 0.9, 0.5, 0.75, 1, 0.6, 0.85, 0.45, 0.7, 0.95].map((baseH, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      width: 3, borderRadius: 99,
                      background: `linear-gradient(180deg, #a78bfa, #6366f1)`,
                      animationName: 'vpWave',
                      animationDuration: `${0.6 + (i % 5) * 0.12}s`,
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDirection: 'alternate',
                      animationDelay: `${i * 0.055}s`,
                      height: `${baseH * 28}px`,
                      opacity: 0.85,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Send row (mic + send) ── */}
            <div className="flex gap-2">
              {/* Voice Prompter mic button */}
              <div style={{ position: 'relative' }} className="group">
                <button
                  onClick={toggleVoice}
                  title="Voice Command (Vibe Prompting)"
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: isListening
                      ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
                      : 'rgba(99,102,241,0.08)',
                    border: isListening
                      ? '1px solid rgba(139,92,246,0.6)'
                      : '1px solid rgba(99,102,241,0.22)',
                    boxShadow: isListening
                      ? '0 0 14px rgba(139,92,246,0.55), 0 0 28px rgba(99,102,241,0.2)'
                      : 'none',
                    animation: isListening ? 'vpMicPulse 1.4s ease-in-out infinite' : 'none',
                  }}>
                  <Mic size={13} style={{
                    color: isListening ? '#ffffff' : '#6366f1',
                    transition: 'color 0.2s',
                  }} />
                </button>

                {/* tooltip */}
                <div style={{
                  position: 'absolute', bottom: '110%', left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  padding: '4px 8px', borderRadius: 6,
                  background: '#0c0c1a', border: '1px solid #1a1a2e',
                  fontSize: 10, fontWeight: 600, color: '#94a3b8',
                  pointerEvents: 'none',
                  opacity: 0, transition: 'opacity 0.15s',
                }}
                  className="group-hover:!opacity-100">
                  Voice Command (Vibe Prompting)
                </div>
              </div>

              {/* spacer pushes send to the right */}
              <div style={{ flex: 1 }} />

              {/* Send button */}
              <button
                onClick={submit}
                disabled={!input.trim() || isThinking || isListening}
                className="self-end w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow:  input.trim() && !isListening ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                }}>
                <Send size={14} className="text-white" />
              </button>
            </div>

            <p className="text-[9px] text-gray-700 text-center">
              {isListening
                ? '🎙 Vibe Prompting — speak your idea, I\'ll transcribe it'
                : chatMode === 'discuss'
                  ? '💬 Discuss Mode — I\'ll brainstorm without touching the canvas'
                  : planMode ? '⚠ Plan Mode — I\'ll outline a dev plan before building'
                  : 'Enter ↵ to send · Shift+Enter for new line'}
            </p>

            <style>{`
              @keyframes vpWave {
                from { transform: scaleY(0.3); opacity: 0.5; }
                to   { transform: scaleY(1);   opacity: 1;   }
              }
              @keyframes vpMicPulse {
                0%,100% { box-shadow: 0 0 14px rgba(139,92,246,0.55), 0 0 28px rgba(99,102,241,0.2); }
                50%     { box-shadow: 0 0 22px rgba(139,92,246,0.8),  0 0 44px rgba(99,102,241,0.35); }
              }
              @keyframes vpRecDot {
                0%,100% { opacity: 1; }
                50%     { opacity: 0.2; }
              }
            `}</style>
          </div>

          {/* Infrastructure panel at bottom of chat */}
          <InfraPanel />
        </div>
      )}
    </aside>
  )
}
