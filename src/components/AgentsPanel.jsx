import { useState } from 'react'
import { Zap, Plus, Trash2, Play, Pause, Bot, ChevronDown, ChevronUp } from 'lucide-react'
import { useVibeStore } from '../store/vibeStore'

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─── Parse a natural-language agent description into trigger + actions ─────────
function parseAgentDesc(desc) {
  const lower = desc.toLowerCase()

  let trigger = { icon: '⚡', label: 'Custom Trigger',      color: '#6366f1', type: 'custom'       }
  if (lower.includes('sign up') || lower.includes('signup') || lower.includes('register'))
    trigger = { icon: '👤', label: 'New User Signup',       color: '#00e5ff', type: 'auth.signup'   }
  else if (lower.includes('submit') || lower.includes('form'))
    trigger = { icon: '📝', label: 'Form Submitted',        color: '#8b5cf6', type: 'form.submit'   }
  else if (lower.includes('purchase') || lower.includes('buy') || lower.includes('payment') || lower.includes('order'))
    trigger = { icon: '💳', label: 'Payment Received',      color: '#10b981', type: 'payment.success'}
  else if (lower.includes('new row') || lower.includes('row created') || lower.includes('database insert'))
    trigger = { icon: '🗄️', label: 'DB Row Created',        color: '#f59e0b', type: 'db.insert'     }
  else if (lower.includes('click') || lower.includes('button'))
    trigger = { icon: '🖱️', label: 'Button Clicked',        color: '#ec4899', type: 'ui.click'      }
  else if (lower.includes('every day') || lower.includes('daily') || lower.includes('schedule'))
    trigger = { icon: '🕐', label: 'Scheduled (Daily)',      color: '#06b6d4', type: 'cron.daily'    }

  const actions = []
  if (lower.includes('email') || lower.includes('welcome email') || lower.includes('send email'))
    actions.push({ icon: '📧', label: 'Send Email',            color: '#00e5ff' })
  if (lower.includes('save') || lower.includes('store') || lower.includes('add to') || lower.includes('log'))
    actions.push({ icon: '🗄️', label: 'Save to Database',      color: '#8b5cf6' })
  if (lower.includes('slack') || lower.includes('notify') || lower.includes('notification') || lower.includes('alert'))
    actions.push({ icon: '🔔', label: 'Send Notification',      color: '#f59e0b' })
  if (lower.includes('webhook') || lower.includes('api call') || lower.includes('http'))
    actions.push({ icon: '🔗', label: 'Trigger Webhook',        color: '#10b981' })
  if (lower.includes('sms') || lower.includes('text message'))
    actions.push({ icon: '💬', label: 'Send SMS',               color: '#ec4899' })
  if (lower.includes('invoice') || lower.includes('receipt') || lower.includes('billing'))
    actions.push({ icon: '🧾', label: 'Generate Invoice',       color: '#06b6d4' })
  if (lower.includes('crm') || lower.includes('contact') || lower.includes('hubspot'))
    actions.push({ icon: '📋', label: 'Update CRM Record',      color: '#a78bfa' })

  if (actions.length === 0) actions.push({ icon: '⚡', label: 'Execute Action', color: '#6366f1' })

  return { trigger, actions }
}

// ─── Single node pill ─────────────────────────────────────────────────────────
function FlowNode({ icon, label, color, type = 'default', small = false }) {
  const bg = `${color}12`
  const border = `${color}30`
  return (
    <div
      className="flex items-center gap-2 rounded-xl select-none"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        padding: small ? '6px 12px' : '10px 16px',
        minWidth: small ? 100 : 140,
        maxWidth: 200,
      }}>
      <span style={{ fontSize: small ? 14 : 18 }}>{icon}</span>
      <div>
        {type === 'trigger' && (
          <p style={{ fontSize: 8, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
            TRIGGER
          </p>
        )}
        {type === 'action' && (
          <p style={{ fontSize: 8, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
            ACTION
          </p>
        )}
        <p style={{ fontSize: small ? 10 : 11, color: '#e2e8f0', fontWeight: 600, marginTop: 1 }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Vertical connector ───────────────────────────────────────────────────────
function VConn({ color = '#1e293b', h = 28 }) {
  return (
    <div className="flex justify-center" style={{ height: h }}>
      <div style={{ width: 2, background: `linear-gradient(180deg, ${color}60 0%, ${color}20 100%)`, borderRadius: 1 }} />
    </div>
  )
}

// ─── Flowchart for an agent ───────────────────────────────────────────────────
function FlowChart({ trigger, actions }) {
  const aiNode = { icon: '🤖', label: 'ZaraForge AI', color: '#6366f1' }
  const hasMany = actions.length > 1

  return (
    <div className="flex flex-col items-center py-3 px-2">
      {/* Trigger */}
      <FlowNode {...trigger} type="trigger" />
      <VConn color={trigger.color} />

      {/* AI processor */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.22)',
          boxShadow: '0 0 12px rgba(99,102,241,0.12)',
        }}>
        <Bot size={14} className="text-indigo-400" />
        <p className="text-[11px] font-bold text-indigo-300">ZaraForge AI Agent</p>
      </div>
      <VConn color="#6366f1" />

      {/* Actions row */}
      {hasMany ? (
        <div className="relative flex items-start justify-center gap-4 w-full">
          {/* Horizontal bridge line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex justify-center" style={{ width: '80%', height: 2 }}>
            <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
          </div>
          {actions.map((a, i) => (
            <div key={i} className="flex flex-col items-center">
              <VConn color={a.color} h={20} />
              <FlowNode {...a} type="action" small />
            </div>
          ))}
        </div>
      ) : (
        <>
          <VConn color={actions[0].color} />
          <FlowNode {...actions[0]} type="action" />
        </>
      )}
    </div>
  )
}

// ─── Agent list card ──────────────────────────────────────────────────────────
function AgentCard({ agent, onRemove, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: agent.status === 'active' ? '#34d399' : '#4b5563' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-200 truncate">{agent.trigger.icon} {agent.trigger.label}</p>
          <p className="text-[9px] text-gray-600 truncate">{agent.actions.map(a => a.label).join(' → ')}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onToggle(agent.id)} title={agent.status === 'active' ? 'Pause' : 'Resume'}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]">
            {agent.status === 'active'
              ? <Pause  size={11} className="text-amber-400" />
              : <Play   size={11} className="text-emerald-400" />}
          </button>
          <button onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06] text-gray-600">
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button onClick={() => onRemove(agent.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-red-900/30 text-gray-700 hover:text-red-400">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Flowchart (expanded) */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
          <FlowChart trigger={agent.trigger} actions={agent.actions} />
          <div className="px-3 pb-2 text-center">
            <span className="text-[9px] font-mono text-gray-700">
              Runs: {agent.runCount} · Created {new Date(agent.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main AgentsPanel ─────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  'When a user signs up, send them a welcome email and save to database',
  'Every time a form is submitted, notify me on Slack and log to CRM',
  'When a payment is received, generate an invoice and send email receipt',
  'Daily at midnight, export database rows and send summary email',
]

export default function AgentsPanel() {
  const { agents, addAgent, removeAgent, toggleAgentStatus } = useVibeStore()
  const [prompt,   setPrompt]   = useState('')
  const [creating, setCreating] = useState(false)
  const [preview,  setPreview]  = useState(null) // parsed agent preview

  const handlePromptChange = (v) => {
    setPrompt(v)
    if (v.trim().length > 8) {
      setPreview(parseAgentDesc(v))
    } else {
      setPreview(null)
    }
  }

  const createAgent = () => {
    if (!prompt.trim() || creating) return
    setCreating(true)
    const parsed = parseAgentDesc(prompt.trim())
    setTimeout(() => {
      addAgent({
        id:        uid(),
        description: prompt.trim(),
        trigger:   parsed.trigger,
        actions:   parsed.actions,
        status:    'active',
        runCount:  0,
        createdAt: new Date().toISOString(),
      })
      setPrompt('')
      setPreview(null)
      setCreating(false)
    }, 800)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={13} className="text-indigo-400" />
          <p className="text-[11px] font-bold text-gray-200">SuperAgent Maker</p>
          {agents.filter(a => a.status === 'active').length > 0 && (
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
              {agents.filter(a => a.status === 'active').length} active
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Describe what should happen automatically — the AI will wire it up.
        </p>
      </div>

      {/* Creation form */}
      <div className="px-3 pb-3 flex-shrink-0 space-y-2">
        <textarea
          value={prompt}
          rows={3}
          onChange={e => handlePromptChange(e.target.value)}
          placeholder={'e.g. "When a user signs up, send a welcome email and save to my database"'}
          className="w-full resize-none text-[11px] rounded-xl px-3 py-2.5 text-gray-200 placeholder-gray-600 outline-none"
          style={{ background: '#0c0c1a', border: '1px solid #1a1a2e', lineHeight: 1.5 }}
          disabled={creating}
        />

        {/* Example chips */}
        <div className="flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS.slice(0, 2).map(ex => (
            <button key={ex} onClick={() => handlePromptChange(ex)}
              className="text-[9px] px-2 py-1 rounded-lg text-gray-500 hover:text-indigo-400 transition-colors"
              style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
              {ex.slice(0, 36)}…
            </button>
          ))}
        </div>

        <button
          onClick={createAgent}
          disabled={!prompt.trim() || creating}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: creating ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow:  prompt.trim() && !creating ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
            color:      '#fff',
          }}>
          {creating
            ? <><Zap size={12} className="animate-pulse" /> Wiring automation...</>
            : <><Plus size={12} /> Create Agent</>}
        </button>
      </div>

      {/* Live preview flowchart */}
      {preview && !creating && (
        <div className="mx-3 mb-3 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: '#06060f', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 px-3 pt-2">Preview</p>
          <FlowChart trigger={preview.trigger} actions={preview.actions} />
        </div>
      )}

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {agents.length === 0 && (
          <div className="text-center py-8">
            <Bot size={24} className="text-gray-700 mx-auto mb-2" />
            <p className="text-[11px] text-gray-600">No agents yet</p>
            <p className="text-[10px] text-gray-700 mt-0.5">Describe an automation above to create your first agent</p>
          </div>
        )}
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onRemove={removeAgent}
            onToggle={toggleAgentStatus}
          />
        ))}
      </div>
    </div>
  )
}
