import { create } from 'zustand'
import { promptToSchema } from '../lib/promptEngine'
import { useCVStore }     from './codeViewStore'
import { useDeviceStore } from './deviceStore'

function uid() { return Math.random().toString(36).slice(2, 9) }

const THINKING_STEPS = [
  'Parsing your requirements...',
  'Generating backend infrastructure...',
  'Spinning up database tables...',
  'Building page architecture...',
  'Connecting form endpoints...',
  'Applying brand styles & theme...',
  'Compiling full-stack app...',
]

// ─── Industry DB tables ───────────────────────────────────────────────────────
const DB_TABLES = {
  restaurant: {
    name: 'reservations',
    columns: ['id', 'guest_name', 'email', 'party_size', 'date', 'time', 'status', 'notes'],
    rows: [
      { id: 1, guest_name: 'Sarah Mitchell', email: 'sarah@email.com',  party_size: 4, date: '2026-05-18', time: '7:00 PM', status: 'Confirmed', notes: 'Anniversary dinner' },
      { id: 2, guest_name: 'James Rodriguez', email: 'james@email.com', party_size: 2, date: '2026-05-18', time: '8:30 PM', status: 'Pending',   notes: '' },
      { id: 3, guest_name: 'Emily Chen',      email: 'emily@email.com', party_size: 6, date: '2026-05-19', time: '6:00 PM', status: 'Confirmed', notes: 'Birthday celebration' },
      { id: 4, guest_name: 'Marcus T.',        email: 'marcus@email.com',party_size: 3, date: '2026-05-20', time: '7:30 PM', status: 'Cancelled', notes: '' },
    ],
    storageMb: 2.4,
  },
  startup: {
    name: 'users',
    columns: ['id', 'name', 'email', 'plan', 'mrr', 'signup_date', 'status', 'last_login'],
    rows: [
      { id: 1, name: 'Alex Turner',   email: 'alex@techco.io',       plan: 'Pro',      mrr: 29,  signup_date: '2026-04-12', status: 'Active', last_login: '2026-05-17' },
      { id: 2, name: 'Priya Sharma',  email: 'priya@startup.com',    plan: 'Starter',  mrr: 0,   signup_date: '2026-05-01', status: 'Active', last_login: '2026-05-16' },
      { id: 3, name: 'Tom Bradley',   email: 'tom@venture.co',       plan: 'Business', mrr: 99,  signup_date: '2026-03-20', status: 'Active', last_login: '2026-05-17' },
      { id: 4, name: 'Lisa Park',     email: 'lisa@design.studio',   plan: 'Pro',      mrr: 29,  signup_date: '2026-05-10', status: 'Trial',  last_login: '2026-05-15' },
    ],
    storageMb: 8.7,
  },
  ecommerce: {
    name: 'orders',
    columns: ['id', 'customer', 'email', 'product', 'qty', 'total', 'status', 'order_date'],
    rows: [
      { id: 1, customer: 'Sarah J.',  email: 'sarah@email.com', product: 'Summer Dress',    qty: 1, total: '$89.99',  status: 'Shipped',    order_date: '2026-05-16' },
      { id: 2, customer: 'Mike R.',   email: 'mike@email.com',  product: 'Denim Jacket',    qty: 2, total: '$248.00', status: 'Processing', order_date: '2026-05-17' },
      { id: 3, customer: 'Emma W.',   email: 'emma@email.com',  product: 'Canvas Sneakers', qty: 1, total: '$129.00', status: 'Delivered',  order_date: '2026-05-14' },
      { id: 4, customer: 'James C.',  email: 'james@email.com', product: 'Silk Blouse',     qty: 3, total: '$357.00', status: 'Pending',    order_date: '2026-05-17' },
    ],
    storageMb: 15.2,
  },
  health: {
    name: 'appointments',
    columns: ['id', 'patient', 'email', 'service', 'coach', 'date', 'time', 'status'],
    rows: [
      { id: 1, patient: 'Anna Smith',   email: 'anna@email.com',   service: 'Personal Training', coach: 'Dr. Kim',   date: '2026-05-18', time: '9:00 AM',  status: 'Scheduled' },
      { id: 2, patient: 'Bob Johnson',  email: 'bob@email.com',    service: 'Nutrition Consult', coach: 'Dr. Lee',   date: '2026-05-18', time: '11:00 AM', status: 'Confirmed' },
      { id: 3, patient: 'Carol Davis',  email: 'carol@email.com',  service: 'Yoga Session',      coach: 'Ms. Patel', date: '2026-05-19', time: '8:00 AM',  status: 'Scheduled' },
      { id: 4, patient: 'David Wilson', email: 'david@email.com',  service: 'Sleep Assessment',  coach: 'Dr. Kim',   date: '2026-05-20', time: '2:00 PM',  status: 'Pending' },
    ],
    storageMb: 3.8,
  },
  music: {
    name: 'fan_signups',
    columns: ['id', 'name', 'email', 'city', 'newsletter', 'merch_interest', 'signed_up'],
    rows: [
      { id: 1, name: 'Jordan Lee',   email: 'jordan@email.com', city: 'New York',    newsletter: true,  merch_interest: 'Vinyl',   signed_up: '2026-05-15' },
      { id: 2, name: 'Maya Patel',   email: 'maya@email.com',   city: 'Los Angeles', newsletter: true,  merch_interest: 'T-Shirt', signed_up: '2026-05-16' },
      { id: 3, name: 'Tyler Woods',  email: 'tyler@email.com',  city: 'Chicago',     newsletter: false, merch_interest: 'Hoodie',  signed_up: '2026-05-17' },
      { id: 4, name: 'Sofia Reyes',  email: 'sofia@email.com',  city: 'Miami',       newsletter: true,  merch_interest: 'Vinyl',   signed_up: '2026-05-17' },
    ],
    storageMb: 1.2,
  },
  portfolio: {
    name: 'project_inquiries',
    columns: ['id', 'name', 'email', 'company', 'budget', 'service', 'status', 'received'],
    rows: [
      { id: 1, name: 'Rachel Kim',   email: 'rachel@brand.co',  company: 'Brand Co',  budget: '$5k–$10k', service: 'Brand Design', status: 'In Review', received: '2026-05-16' },
      { id: 2, name: 'Sam Torres',   email: 'sam@startup.io',   company: 'Startup IO',budget: '$10k+',    service: 'Web Dev',      status: 'Scheduled', received: '2026-05-17' },
      { id: 3, name: 'Nadia Hassan', email: 'nadia@agency.com', company: 'Agency',    budget: '$2k–$5k',  service: 'UI/UX',        status: 'Pending',   received: '2026-05-17' },
      { id: 4, name: 'Chris Evans',  email: 'chris@tech.io',    company: 'Tech IO',   budget: '$5k–$10k', service: 'App Dev',      status: 'Won',       received: '2026-05-14' },
    ],
    storageMb: 0.8,
  },
  real_estate: {
    name: 'property_leads',
    columns: ['id', 'name', 'email', 'phone', 'property_type', 'budget', 'timeline', 'status'],
    rows: [
      { id: 1, name: 'David Park',  email: 'david@email.com', phone: '555-0101', property_type: 'Condo',     budget: '$450k', timeline: '3 months', status: 'Hot Lead'  },
      { id: 2, name: 'Lisa Chang',  email: 'lisa@email.com',  phone: '555-0102', property_type: 'House',     budget: '$750k', timeline: '6 months', status: 'Warm'      },
      { id: 3, name: 'Mike Brown',  email: 'mike@email.com',  phone: '555-0103', property_type: 'Apartment', budget: '$300k', timeline: '1 month',  status: 'Closed'    },
      { id: 4, name: 'Anna White',  email: 'anna@email.com',  phone: '555-0104', property_type: 'Townhouse', budget: '$550k', timeline: '4 months', status: 'Nurturing' },
    ],
    storageMb: 5.1,
  },
  event: {
    name: 'registrations',
    columns: ['id', 'attendee', 'email', 'ticket_type', 'qty', 'total', 'event_date', 'status'],
    rows: [
      { id: 1, attendee: 'Jordan Smith', email: 'jordan@email.com', ticket_type: 'VIP',       qty: 2, total: '$600', event_date: '2026-06-15', status: 'Confirmed' },
      { id: 2, attendee: 'Mia Davis',    email: 'mia@email.com',    ticket_type: 'General',   qty: 4, total: '$240', event_date: '2026-06-15', status: 'Confirmed' },
      { id: 3, attendee: 'Noah Wilson',  email: 'noah@email.com',   ticket_type: 'Early Bird',qty: 1, total: '$49',  event_date: '2026-06-15', status: 'Refunded'  },
      { id: 4, attendee: 'Ava Martinez', email: 'ava@email.com',    ticket_type: 'VIP',       qty: 1, total: '$300', event_date: '2026-06-15', status: 'Pending'   },
    ],
    storageMb: 4.3,
  },
}

const DEFAULT_TABLE = {
  name: 'submissions',
  columns: ['id', 'name', 'email', 'message', 'source', 'status', 'created_at'],
  rows: [
    { id: 1, name: 'Alex Johnson', email: 'alex@email.com',  message: 'Interested in services', source: 'Landing Page', status: 'New',     created_at: '2026-05-17' },
    { id: 2, name: 'Maria Garcia', email: 'maria@email.com', message: 'Partnership inquiry',    source: 'Contact Form', status: 'Read',    created_at: '2026-05-16' },
    { id: 3, name: 'Chris Lee',    email: 'chris@email.com', message: 'Pricing question',       source: 'Pricing Page', status: 'Replied', created_at: '2026-05-15' },
    { id: 4, name: 'Sam Wilson',   email: 'sam@email.com',   message: 'Feature request',        source: 'Landing Page', status: 'New',     created_at: '2026-05-17' },
  ],
  storageMb: 1.1,
}

function getDbTable(industry) {
  return DB_TABLES[industry] || DEFAULT_TABLE
}

// ─── Plan generators ──────────────────────────────────────────────────────────
function generatePlan(industry, name) {
  const plans = {
    restaurant: [
      `Initialize **${name}** project & assign subdomain`,
      'Create `reservations` table *(guest_name, date, party_size, status)*',
      'Build full-page layout with hero & booking CTA',
      'Connect reservation form → database endpoint',
      'Enable staff auth layer *(email + password)*',
      'Apply restaurant theme, typography & brand colors',
      'Deploy to **zaraforge.app**',
    ],
    startup: [
      `Scaffold **${name}** SaaS project structure`,
      'Create `users` table *(email, plan, mrr, created_at)*',
      'Build marketing landing page with pricing tiers',
      'Add authentication *(signup, login, magic link)*',
      'Wire Stripe billing to plan tier upgrades',
      'Add analytics dashboard with KPI widgets',
      'Deploy with custom subdomain',
    ],
    ecommerce: [
      `Bootstrap **${name}** store project`,
      'Create `products` & `orders` tables *(sku, price, inventory)*',
      'Build shop homepage with featured products',
      'Add cart & checkout flow components',
      'Enable Stripe payment processing',
      'Set up order status automation triggers',
      'Deploy storefront to **zaraforge.app**',
    ],
    health: [
      `Set up **${name}** wellness platform`,
      'Create `appointments` table *(patient, service, coach, date)*',
      'Build services landing page with booking CTA',
      'Connect booking form → scheduling engine',
      'Add patient auth & profile management',
      'Enable reminder automation *(email triggers)*',
      'Deploy to **zaraforge.app**',
    ],
    music: [
      `Create **${name}** artist platform`,
      'Create `fan_signups` & `releases` tables',
      'Build artist landing page with audio embeds',
      'Connect newsletter signup → email list',
      'Add merch store integration',
      'Enable tour date automation updates',
      'Deploy to **zaraforge.app**',
    ],
    portfolio: [
      `Initialize **${name}** portfolio site`,
      'Create `project_inquiries` table *(name, budget, service)*',
      'Build portfolio landing page with case studies',
      'Connect contact form → inquiry tracker',
      'Add client auth for project status portal',
      'Apply custom brand & typography system',
      'Deploy to **zaraforge.app**',
    ],
  }
  return plans[industry] || [
    `Create **${name}** full-stack project`,
    'Auto-generate database schema from requirements',
    'Design page layout from prompt keywords',
    'Connect submission forms → database',
    'Enable user authentication layer',
    'Apply brand color theme & styling',
    'Deploy live to **zaraforge.app**',
  ]
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useVibeStore = create((set, get) => ({
  // ── Chat ─────────────────────────────────────────────────────────────────────
  messages: [
    {
      id:   uid(),
      role: 'assistant',
      text: "Hi! I'm your **ZaraForge AI**. Describe the full-stack app you want to build and I'll generate the frontend, database, auth, and backend logic instantly.\n\nTry: *\"A restaurant booking site for Aria's Kitchen\"* or *\"SaaS dashboard for a project management tool\"*",
      ts:   new Date().toISOString(),
    },
  ],
  isThinking:   false,
  thinkingStep: '',
  planMode:     false,
  pendingPlan:  null, // { prompt, industry, name }

  setPlanMode: (v) => set({ planMode: v }),

  // ── Canvas mode ───────────────────────────────────────────────────────────────
  canvasMode:    'design',
  setCanvasMode: (m) => set({ canvasMode: m }),

  // ── Database ──────────────────────────────────────────────────────────────────
  dbTable:     null,
  dbStorageMb: 0,

  // ── Auth ─────────────────────────────────────────────────────────────────────
  authEnabled:    false,
  setAuthEnabled: (v) => set({ authEnabled: v }),

  // ── Automations ───────────────────────────────────────────────────────────────
  automations: [
    { id: 1, name: 'New Submission Alert', trigger: 'form.submit',  status: 'active'   },
    { id: 2, name: 'Auto-Tag New Entries', trigger: 'db.insert',    status: 'inactive' },
    { id: 3, name: 'Weekly Report Email',  trigger: 'cron.weekly',  status: 'active'   },
  ],
  toggleAutomation: (id) => set(s => ({
    automations: s.automations.map(a =>
      a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a
    ),
  })),

  // ── Deploy ────────────────────────────────────────────────────────────────────
  showDeploy:      false,
  setShowDeploy:   (v) => set({ showDeploy: v }),
  deployPublic:    true,
  setDeployPublic: (v) => set({ deployPublic: v }),
  deploySlug:      '',
  setDeploySlug:   (s) => set({ deploySlug: s }),

  // ── Chat mode (Build vs Discuss) ──────────────────────────────────────────────
  chatMode:    'build', // 'build' | 'discuss'
  setChatMode: (m) => set({ chatMode: m }),

  // ── AI Agents ─────────────────────────────────────────────────────────────────
  agents:     [],
  addAgent:   (agent) => set(s => ({ agents: [agent, ...s.agents] })),
  removeAgent: (id)   => set(s => ({ agents: s.agents.filter(a => a.id !== id) })),
  toggleAgentStatus: (id) => set(s => ({
    agents: s.agents.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a),
  })),

  // ── Remix Gallery ─────────────────────────────────────────────────────────────
  remixPublic:    false,
  setRemixPublic: (v) => set({ remixPublic: v }),

  // ── Security audit ────────────────────────────────────────────────────────────
  showSecurityAudit:   false,
  setShowSecurityAudit: (v) => set({ showSecurityAudit: v }),

  // ── Discuss Mode response generator ──────────────────────────────────────────
  _discuss: (text) => {
    const lower = text.toLowerCase()
    const map = {
      restaurant:  { audience: 'Local foodies (25–45), office lunch crowd, event planners, tourists', features: ["Real-time table reservation & availability", "QR digital menu with dietary filters", "Loyalty points & birthday rewards", "Chef's special push notifications", "Private event booking portal"], monetize: 'Freemium: reservations free, event hosting fee ($49/event), marketing tools subscription ($29/mo)', risk: 'Competing with OpenTable & Resy — differentiate on lower commissions and deeper kitchen automation.', roadmap: '**v1** reservation + menu → **v2** loyalty system → **v3** delivery integration' },
      startup:     { audience: 'Startup founders, SMB owners, remote teams of 5–50', features: ['Team workspace with role permissions', 'Project milestone & sprint tracker', 'AI task prioritization assistant', 'Third-party integrations (Slack, GitHub)', 'Usage analytics dashboard'], monetize: 'SaaS tiers: Free (3 users) → Pro ($29/mo) → Business ($99/mo). API access as addon.', risk: 'Versus Notion, Linear, Asana — win on AI-native UX and sub-5-minute onboarding.', roadmap: '**v1** core tasks → **v2** AI suggestions → **v3** integration marketplace' },
      ecommerce:   { audience: 'Fashion enthusiasts 18–35, deal-seekers, gift buyers, brand loyalists', features: ['AI-powered style recommendations', 'Size finder quiz', 'One-click checkout', 'Wishlist & price drop alerts', 'Loyalty points + VIP tier system'], monetize: 'Product margins (40–60%), affiliate partnerships, VIP membership ($9.99/mo), exclusive drop access', risk: 'Competing with Shopify stores & Depop — win with curation, exclusivity, and fast mobile checkout.', roadmap: '**v1** hero products → **v2** AI recommendations → **v3** creator affiliate program' },
      health:      { audience: 'Health-conscious adults 28–55, new-year resolution crowd, chronic condition managers', features: ['1:1 session booking & calendar sync', 'Progress tracking dashboard', 'Nutrition macro logger', 'AI meal plan generator', 'Community challenges & leaderboards'], monetize: 'Session packages ($150–500), monthly membership ($39/mo), premium content library, certified coach marketplace', risk: 'Versus Noom, MyFitnessPal — win on personalization + live human coaching.', roadmap: '**v1** booking + tracking → **v2** coach marketplace → **v3** community' },
      music:       { audience: 'Fans aged 16–35, playlist curators, vinyl collectors, live event attendees', features: ['Streaming integrations (Spotify / Apple Music)', 'Tour date calendar with RSVP', 'Merch drop marketplace', 'Fan club exclusive content vault', 'Behind-the-scenes documentary series'], monetize: 'Merch margins (60–70%), VIP fan club ($7/mo), ticket pre-sale fees, limited NFT collectibles', risk: 'Versus Bandcamp, Patreon — win with artist-first branding and integrated tour + merch.', roadmap: '**v1** artist profile → **v2** fan signup + merch → **v3** exclusive vault' },
      portfolio:   { audience: 'Hiring managers, startup founders, creative agencies, product teams', features: ['Case study viewer with before/after', 'Live project demos', 'Client testimonial video wall', 'Services & pricing calculator', 'Booking calendar for discovery calls'], monetize: 'Retainer packages ($2k–8k/mo), project-based pricing ($5k–25k), digital product sales', risk: 'Saturated market — differentiate on niche expertise and measurable ROI framing.', roadmap: '**v1** portfolio + contact → **v2** testimonials + booking → **v3** digital products' },
    }
    const key = Object.keys(map).find(k => lower.includes(k))
    const t   = key ? map[key] : null
    if (!t) {
      return `**Discuss Mode — Product Strategy**\n\n**Target Audience Hypothesis:**\nEarly adopters motivated by efficiency gains or status signaling. Start with one tight persona before expanding.\n\n**Top Feature Ideas:**\n- Your core "killer" value-delivery feature\n- Onboarding that hits "aha" in under 2 minutes\n- Progress visualization dashboard\n- Social sharing mechanic for organic growth\n- Power-user customization layer\n\n**Monetization:**\nFreemium with a clear upgrade trigger tied to your most valuable feature.\n\n**Key Risk:**\nTrying to serve too many user types in v1 is the #1 startup killer — pick one persona.\n\n*Refine your concept and I'll tailor the strategy. Switch to **Build Mode** when ready to generate.*`
    }
    return `**Discuss Mode — Product Strategy Analysis**\n\n**Target Audience:**\n${t.audience}\n\n**Recommended Features:**\n${t.features.map(f => `- ${f}`).join('\n')}\n\n**Monetization Strategy:**\n${t.monetize}\n\n**Competitive Landscape:**\n${t.risk}\n\n**Suggested Roadmap:**\n${t.roadmap}\n\n*Ready to build? Switch to **Build Mode** or type **"Build it"** to generate the full app.*`
  },

  // ── Send a chat message ───────────────────────────────────────────────────────
  sendMessage: async (text, { setSchema } = {}) => {
    const { chatMode } = get()
    const userMsg = { id: uid(), role: 'user', text, ts: new Date().toISOString() }
    set(s => ({ messages: [...s.messages, userMsg] }))

    // ── Discuss Mode: PM brainstorm, no canvas changes ──────────────────────────
    if (chatMode === 'discuss') {
      set({ isThinking: true, thinkingStep: 'Analyzing your concept...' })
      await new Promise(r => setTimeout(r, 900 + Math.random() * 500))
      set({ isThinking: false, thinkingStep: '' })
      const reply = get()._discuss(text)
      set(s => ({
        messages: [...s.messages, { id: uid(), role: 'assistant', text: reply, ts: new Date().toISOString() }],
      }))
      return
    }

    const lower = text.toLowerCase().trim()

    // Plan confirmation shortcut
    if (lower === 'build it' || lower === 'confirm' || lower === 'yes' || lower === 'proceed') {
      const pending = get().pendingPlan
      if (pending) {
        set({ pendingPlan: null })
        get()._executeBuild(pending.prompt, pending.industry, pending.name, { setSchema })
        return
      }
    }

    // Parse prompt → industry + name
    let schema = null, meta = { industry: 'default', name: 'My App', count: 0 }
    try {
      const result = promptToSchema(text)
      schema = result.schema
      meta   = result.meta
    } catch { /* keep defaults */ }

    if (get().planMode) {
      const steps    = generatePlan(meta.industry, meta.name)
      const planText =
        `**Development Plan for "${meta.name}"**\n\n` +
        `Here's what I'll build:\n\n` +
        steps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
        `\n\n*Reply **"Build it"** to confirm and generate the full app, or describe changes.*`
      const planMsg = { id: uid(), role: 'assistant', text: planText, ts: new Date().toISOString(), isPlan: true }
      set(s => ({
        messages:    [...s.messages, planMsg],
        pendingPlan: { prompt: text, industry: meta.industry, name: meta.name },
      }))
      return
    }

    // Direct build
    get()._executeBuild(text, meta.industry, meta.name, { setSchema, prebuilt: schema })
  },

  confirmPlan: ({ setSchema } = {}) => {
    const p = get().pendingPlan
    if (!p) return
    set({ pendingPlan: null })
    get()._executeBuild(p.prompt, p.industry, p.name, { setSchema })
  },

  cancelPlan: () => {
    set({ pendingPlan: null })
    set(s => ({
      messages: [...s.messages, {
        id: uid(), role: 'assistant',
        text: "Plan cancelled. Describe what you want to build and I'll start fresh.",
        ts: new Date().toISOString(),
      }],
    }))
  },

  // ── Internal build executor ───────────────────────────────────────────────────
  _executeBuild: async (prompt, industry, name, { setSchema, prebuilt } = {}) => {
    set({ isThinking: true, thinkingStep: THINKING_STEPS[0] })

    let step = 0
    const tick = () => {
      step++
      if (step < THINKING_STEPS.length) {
        set({ thinkingStep: THINKING_STEPS[step] })
        setTimeout(tick, 460 + Math.random() * 200)
      }
    }
    setTimeout(tick, 460 + Math.random() * 200)

    await new Promise(r => setTimeout(r, THINKING_STEPS.length * 490 + 300))

    let finalSchema = prebuilt
    if (!finalSchema) {
      try { finalSchema = promptToSchema(prompt).schema } catch { /* noop */ }
    }
    if (finalSchema && setSchema) setSchema(finalSchema)

    const table  = getDbTable(industry)
    const comps  = finalSchema?.components?.length ?? 0
    const slug   = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'my-app'

    const successMsg = {
      id:   uid(),
      role: 'assistant',
      text:
        `✅ **${name}** is ready!\n\n` +
        `- **${comps} components** generated\n` +
        `- **\`${table.name}\`** table created *(${table.rows.length} sample rows)*\n` +
        `- Auth system: *configured, disabled by default*\n` +
        `- 3 automations: *standing by*\n\n` +
        `Switch to **Data Mode** above the canvas to explore your live database. Hit **Publish App** to go live.`,
      ts: new Date().toISOString(),
    }

    set(s => ({
      messages:     [...s.messages, successMsg],
      isThinking:   false,
      thinkingStep: '',
      dbTable:      { ...table },
      dbStorageMb:  table.storageMb,
      deploySlug:   slug,
    }))

    // ── Trigger Pro Dev Engine code reveal animation ──────────────────────────
    const schemaJson = JSON.stringify({ table: table.name, columns: table.columns, rows: table.rows }, null, 2)
    useCVStore.getState().revealCode('DatabaseSchema.json', schemaJson)

    // ── Push hot-reload event to any connected mobile device ──────────────────
    const ds = useDeviceStore.getState()
    if (ds.connected) ds.pushEvent('reload', `App rebuilt: "${name}" — hot-reloaded on ${ds.deviceName}`)
  },
}))
