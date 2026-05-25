import { create } from 'zustand'

const DEFAULT_APP_JSX = `import { useBuilderStore } from './store/builderStore'
import { useVibeStore }    from './store/vibeStore'
import { ThemeProvider }   from './context/ThemeContext'
import TopBar              from './components/TopBar'
import Canvas              from './components/Canvas'
import RightSidebar        from './components/RightSidebar'
import ChatAssistant       from './components/ChatAssistant'
import DeployModal         from './components/DeployModal'
import SecurityAuditModal  from './components/SecurityAuditModal'
import Toast               from './components/Toast'

export default function App() {
  const { previewMode, appMode } = useBuilderStore()
  const { showDeploy, showSecurityAudit } = useVibeStore()
  const isStudio = appMode === 'studio'

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden"
        style={{ background: '#02020a', color: '#e2e8f0' }}>

        <TopBar />

        {!isStudio && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {!previewMode && <ChatAssistant />}
            <Canvas />
            {!previewMode && <RightSidebar />}
          </div>
        )}

        {showDeploy         && <DeployModal />}
        {showSecurityAudit  && <SecurityAuditModal />}
        <Toast />
      </div>
    </ThemeProvider>
  )
}`

const DEFAULT_STYLES_CSS = `/* ZaraForge — Global Styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg:        #02020a;
  --surface:   #060610;
  --border:    #111118;
  --accent:    #00e5ff;
  --purple:    #8b5cf6;
  --green:     #00ff88;
  --font:      'Inter', system-ui, sans-serif;
  --radius:    0.5rem;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  font-family:  var(--font);
  background:   var(--bg);
  color:        #e2e8f0;
  margin:       0;
  line-height:  1.5;
}

/* ── Buttons ─────────────────────────────────────────── */
.btn {
  display:       inline-flex;
  align-items:   center;
  gap:           0.5rem;
  padding:       0.625rem 1.25rem;
  border-radius: var(--radius);
  font-weight:   600;
  font-size:     0.875rem;
  cursor:        pointer;
  transition:    all 0.2s;
  border:        none;
}

.btn-primary {
  background: var(--accent);
  color:      #000;
  box-shadow: 0 0 18px rgba(0, 229, 255, 0.35);
}
.btn-primary:hover {
  box-shadow: 0 0 28px rgba(0, 229, 255, 0.55);
  opacity:    0.9;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color:      #e2e8f0;
  border:     1px solid rgba(255, 255, 255, 0.1);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ── Cards ───────────────────────────────────────────── */
.card {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: calc(var(--radius) * 1.5);
  padding:       1.5rem;
}

/* ── Form inputs ─────────────────────────────────────── */
input, textarea, select {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius);
  color:         #e2e8f0;
  padding:       0.625rem 0.875rem;
  font-size:     0.875rem;
  outline:       none;
  transition:    border-color 0.2s;
  width:         100%;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--accent);
  box-shadow:   0 0 0 3px rgba(0, 229, 255, 0.12);
}

/* ── Utilities ───────────────────────────────────────── */
.text-accent  { color: var(--accent); }
.text-purple  { color: var(--purple); }
.text-green   { color: var(--green);  }
.glow-accent  { box-shadow: 0 0 20px rgba(0, 229, 255, 0.3); }
.glow-purple  { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }`

const DEFAULT_SCHEMA_JSON = JSON.stringify({
  table:   'submissions',
  columns: ['id', 'name', 'email', 'message', 'source', 'status', 'created_at'],
  rows: [
    { id: 1, name: 'Alex Johnson', email: 'alex@email.com',  message: 'Interested in services', source: 'Landing Page', status: 'New',     created_at: '2026-05-17' },
    { id: 2, name: 'Maria Garcia', email: 'maria@email.com', message: 'Partnership inquiry',    source: 'Contact Form', status: 'Read',    created_at: '2026-05-16' },
    { id: 3, name: 'Chris Lee',    email: 'chris@email.com', message: 'Pricing question',       source: 'Pricing Page', status: 'Replied', created_at: '2026-05-15' },
    { id: 4, name: 'Sam Wilson',   email: 'sam@email.com',   message: 'Feature request',        source: 'Landing Page', status: 'New',     created_at: '2026-05-17' },
  ],
}, null, 2)

const DEFAULT_SERVERLESS_JS = `// ZaraForge Serverless Functions
// Auto-deployed to 214 edge nodes on Publish — zero config required.

// ── Payment webhook (Stripe) ──────────────────────────────────────────────────
export async function onStripeWebhook(req) {
  const event = req.body

  if (event.type === 'checkout.session.completed') {
    const { customer, amount_total, metadata } = event.data.object
    await db.insert('orders', {
      customerId: customer,
      userId:     metadata.userId,
      amount:     amount_total / 100,
      status:     'paid',
      createdAt:  new Date().toISOString(),
    })
    await email.send(customer, 'receipt', { amount: amount_total / 100 })
  }

  if (event.type === 'customer.subscription.deleted') {
    const { customer } = event.data.object
    await db.update('users', { where: { stripeId: customer }, data: { plan: 'free' } })
  }

  return { status: 200, received: true }
}

// ── Data transform pipeline ───────────────────────────────────────────────────
export async function transformData(records) {
  return records
    .filter(r => r.status === 'active')
    .map(r => ({
      ...r,
      displayName: r.name.trim(),
      initials:    r.name.split(' ').map(w => w[0]).join('').toUpperCase(),
      avatarUrl:   \`https://api.dicebear.com/8.x/initials/svg?seed=\${encodeURIComponent(r.name)}\`,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// ── REST API proxy (avoids CORS issues) ──────────────────────────────────────
export async function proxyRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'X-Powered-By':  'ZaraForge',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(\`Proxy error: \${res.status} \${res.statusText}\`)
  return res.json()
}

// ── Analytics aggregator ──────────────────────────────────────────────────────
export async function aggregateAnalytics(userId, dateRange) {
  const events = await db.query('analytics_events', {
    where: { userId, createdAt: { gte: dateRange.from, lte: dateRange.to } },
    orderBy: { createdAt: 'asc' },
  })

  const grouped = events.reduce((acc, e) => {
    const key = e.page || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return {
    totalEvents:    events.length,
    uniqueSessions: new Set(events.map(e => e.sessionId)).size,
    topPages:       Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5),
    conversionRate: events.length
      ? (events.filter(e => e.type === 'conversion').length / events.length * 100).toFixed(1) + '%'
      : '0%',
  }
}

// ── Scheduled job: weekly digest ──────────────────────────────────────────────
export async function sendWeeklyDigest() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const rows  = await db.query('submissions', { where: { createdAt: { gte: since } } })

  const admins = await db.query('users', { where: { role: 'admin' } })
  for (const admin of admins) {
    await email.send(admin.email, 'weekly-digest', {
      count:    rows.length,
      topItems: rows.slice(0, 5),
      period:   'last 7 days',
    })
  }
}`

export const useCVStore = create((set, get) => ({
  viewMode:    'ai',   // 'ai' | 'code'
  activeFile:  'App.jsx',
  isRevealing: false,

  files: {
    'App.jsx':                DEFAULT_APP_JSX,
    'styles.css':             DEFAULT_STYLES_CSS,
    'DatabaseSchema.json':    DEFAULT_SCHEMA_JSON,
    'ServerlessFunctions.js': DEFAULT_SERVERLESS_JS,
  },

  setViewMode:   (m) => set({ viewMode: m }),
  setActiveFile: (f) => set({ activeFile: f }),

  updateFile: (name, content) => set(s => ({
    files: { ...s.files, [name]: content },
  })),

  revealCode: (filename, newContent) => {
    set({ activeFile: filename, viewMode: 'code', isRevealing: true })
    const chars        = newContent.split('')
    const charsPerTick = Math.max(4, Math.ceil(chars.length / 100))
    let i = 0

    set(s => ({ files: { ...s.files, [filename]: '' } }))

    const iv = setInterval(() => {
      i += charsPerTick
      const slice = chars.slice(0, Math.min(i, chars.length)).join('')
      set(s => ({ files: { ...s.files, [filename]: slice } }))
      if (i >= chars.length) {
        clearInterval(iv)
        set(s => ({ files: { ...s.files, [filename]: newContent }, isRevealing: false }))
      }
    }, 16)
  },
}))
