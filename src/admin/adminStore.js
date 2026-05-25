import { create } from 'zustand'
import { buildAuditEntry, AUDIT_ACTIONS } from '../lib/security/auditLogger'
import { generateInviteToken } from '../lib/security/adminGateway'

export const OWNER_EMAIL = 'embayechris@gmail.com'

export function getOwnerEmail() {
  return localStorage.getItem('zf-owner-email') || OWNER_EMAIL
}

export function isAdminUser(user) {
  return user?.isAdmin === true || user?.email === getOwnerEmail()
}

// ── Mock user roster (shared by users panel + db table) ───────────────────────
const MOCK_USERS = [
  { id: 'u-001', name: 'Zara Fontaine',   email: 'zara@zaradesign.io',    tier: 'enterprise', status: 'active', lastSeen: '2m ago',  sessions: 3, monthlyRev: 299 },
  { id: 'u-002', name: 'Marcus Bell',     email: 'marcus@bellstudio.co',  tier: 'pro',        status: 'active', lastSeen: '7m ago',  sessions: 1, monthlyRev: 49  },
  { id: 'u-003', name: 'Leila Okonkwo',  email: 'leila@luminary.ai',     tier: 'pro',        status: 'active', lastSeen: '12m ago', sessions: 2, monthlyRev: 49  },
  { id: 'u-004', name: 'Dev Patel',       email: 'dev@thinkmvp.in',       tier: 'free',       status: 'active', lastSeen: '1h ago',  sessions: 1, monthlyRev: 0   },
  { id: 'u-005', name: 'Sofia Andersson', email: 'sofia@pixelcraft.se',   tier: 'pro',        status: 'frozen', lastSeen: '3d ago',  sessions: 0, monthlyRev: 49  },
  { id: 'u-006', name: 'James Thornton', email: 'james@apexmedia.uk',    tier: 'enterprise', status: 'active', lastSeen: '34m ago', sessions: 4, monthlyRev: 299 },
  { id: 'u-007', name: 'Aiko Tanaka',    email: 'aiko@studiofly.jp',     tier: 'free',       status: 'active', lastSeen: '2h ago',  sessions: 1, monthlyRev: 0   },
  { id: 'u-008', name: 'Rafael Moura',   email: 'rafael@vibelab.br',     tier: 'pro',        status: 'active', lastSeen: '5m ago',  sessions: 2, monthlyRev: 49  },
  { id: 'u-009', name: 'Nadia Petrov',   email: 'nadia@creativelabs.ru', tier: 'enterprise', status: 'active', lastSeen: '18m ago', sessions: 2, monthlyRev: 299 },
  { id: 'u-010', name: 'Omar Khalid',    email: 'omar@buildfast.ae',     tier: 'free',       status: 'active', lastSeen: '4h ago',  sessions: 1, monthlyRev: 0   },
]

// ── Mock database tables ──────────────────────────────────────────────────────
const MOCK_DB = {
  users: [
    { id: 'u-001', name: 'Zara Fontaine',   email: 'zara@zaradesign.io',    tier: 'enterprise', status: 'active', country: 'FR', joined: '2024-01-15' },
    { id: 'u-002', name: 'Marcus Bell',     email: 'marcus@bellstudio.co',  tier: 'pro',        status: 'active', country: 'UK', joined: '2024-03-02' },
    { id: 'u-003', name: 'Leila Okonkwo',  email: 'leila@luminary.ai',     tier: 'pro',        status: 'active', country: 'NG', joined: '2024-05-19' },
    { id: 'u-004', name: 'Dev Patel',       email: 'dev@thinkmvp.in',       tier: 'free',       status: 'active', country: 'IN', joined: '2025-01-08' },
    { id: 'u-005', name: 'Sofia Andersson', email: 'sofia@pixelcraft.se',   tier: 'pro',        status: 'frozen', country: 'SE', joined: '2024-07-22' },
    { id: 'u-006', name: 'James Thornton', email: 'james@apexmedia.uk',    tier: 'enterprise', status: 'active', country: 'UK', joined: '2023-11-30' },
    { id: 'u-007', name: 'Aiko Tanaka',    email: 'aiko@studiofly.jp',     tier: 'free',       status: 'active', country: 'JP', joined: '2025-02-14' },
    { id: 'u-008', name: 'Rafael Moura',   email: 'rafael@vibelab.br',     tier: 'pro',        status: 'active', country: 'BR', joined: '2024-09-03' },
    { id: 'u-009', name: 'Nadia Petrov',   email: 'nadia@creativelabs.ru', tier: 'enterprise', status: 'active', country: 'RU', joined: '2024-02-27' },
    { id: 'u-010', name: 'Omar Khalid',    email: 'omar@buildfast.ae',     tier: 'free',       status: 'active', country: 'AE', joined: '2025-04-10' },
  ],
  subscriptions: [
    { id: 'sub-001', userId: 'u-001', plan: 'enterprise', amount: '$299/mo', status: 'active', nextBilling: '2026-06-18', method: 'Visa ···4242' },
    { id: 'sub-002', userId: 'u-002', plan: 'pro',        amount: '$49/mo',  status: 'active', nextBilling: '2026-06-07', method: 'Stripe ···8810' },
    { id: 'sub-003', userId: 'u-003', plan: 'pro',        amount: '$49/mo',  status: 'active', nextBilling: '2026-06-19', method: 'PayPal' },
    { id: 'sub-004', userId: 'u-005', plan: 'pro',        amount: '$49/mo',  status: 'paused', nextBilling: '—',          method: 'Visa ···7731' },
    { id: 'sub-005', userId: 'u-006', plan: 'enterprise', amount: '$299/mo', status: 'active', nextBilling: '2026-06-30', method: 'Wire Transfer' },
    { id: 'sub-006', userId: 'u-008', plan: 'pro',        amount: '$49/mo',  status: 'active', nextBilling: '2026-06-03', method: 'Visa ···5519' },
    { id: 'sub-007', userId: 'u-009', plan: 'enterprise', amount: '$299/mo', status: 'active', nextBilling: '2026-06-27', method: 'Mastercard ···2208' },
  ],
  video_projects: [
    { id: 'vp-001', userId: 'u-001', title: 'Brand Launch 2026',       duration: '2:34', resolution: '4K UHD',  status: 'exported',    created: '2026-05-12' },
    { id: 'vp-002', userId: 'u-002', title: 'Studio Reel — Spring',    duration: '4:10', resolution: '1080p',   status: 'in_progress', created: '2026-05-16' },
    { id: 'vp-003', userId: 'u-003', title: 'Luminary Product Spot',   duration: '0:30', resolution: '4K UHD',  status: 'exported',    created: '2026-05-10' },
    { id: 'vp-004', userId: 'u-006', title: 'Apex Global Campaign',    duration: '1:45', resolution: '8K RAW',  status: 'rendering',   created: '2026-05-17' },
    { id: 'vp-005', userId: 'u-008', title: 'VibeSync Music Video',    duration: '3:22', resolution: '1080p',   status: 'draft',       created: '2026-05-14' },
    { id: 'vp-006', userId: 'u-009', title: 'Creativelabs Showreel',   duration: '5:00', resolution: '4K UHD',  status: 'exported',    created: '2026-05-09' },
  ],
  audio_tracks: [
    { id: 'at-001', userId: 'u-002', title: 'Summer Vibes Beat',     bpm: '128', duration: '3:45', genre: 'Electronic', created: '2026-05-10' },
    { id: 'at-002', userId: 'u-003', title: 'Neon City Lo-fi',       bpm: '90',  duration: '4:12', genre: 'Lo-fi HipHop', created: '2026-05-08' },
    { id: 'at-003', userId: 'u-006', title: 'Corporate Pulse',        bpm: '110', duration: '2:30', genre: 'Cinematic',  created: '2026-05-13' },
    { id: 'at-004', userId: 'u-008', title: 'Saudade Dreams',         bpm: '75',  duration: '5:20', genre: 'Ambient',    created: '2026-05-11' },
    { id: 'at-005', userId: 'u-009', title: 'Dark Synthwave Rise',   bpm: '140', duration: '3:58', genre: 'Synthwave',  created: '2026-05-15' },
  ],
  logos: [
    { id: 'lg-001', userId: 'u-003', brand: 'Luminary AI',    style: 'Minimalist',  format: 'SVG', prompt: 'Clean tech startup logo', created: '2026-05-11' },
    { id: 'lg-002', userId: 'u-004', brand: 'ThinkMVP',       style: 'Bold & Flat', format: 'PNG', prompt: 'Bold startup shield logo', created: '2026-05-09' },
    { id: 'lg-003', userId: 'u-007', brand: 'StudioFly',      style: 'Gradient',    format: 'SVG', prompt: 'Creative studio with wings motif', created: '2026-05-14' },
    { id: 'lg-004', userId: 'u-001', brand: 'ZaraDesign Co.', style: 'Wordmark',    format: 'SVG', prompt: 'Elegant fashion wordmark', created: '2026-05-07' },
    { id: 'lg-005', userId: 'u-010', brand: 'BuildFast AE',   style: 'Geometric',   format: 'PNG', prompt: 'Geometric construction logo', created: '2026-05-16' },
  ],
}

export const DB_COLUMNS = {
  users:          ['id', 'name', 'email', 'tier', 'status', 'country', 'joined'],
  subscriptions:  ['id', 'userId', 'plan', 'amount', 'status', 'nextBilling', 'method'],
  video_projects: ['id', 'userId', 'title', 'duration', 'resolution', 'status', 'created'],
  audio_tracks:   ['id', 'userId', 'title', 'bpm', 'duration', 'genre', 'created'],
  logos:          ['id', 'userId', 'brand', 'style', 'format', 'prompt', 'created'],
}

export const DB_READONLY_COLS = new Set(['id', 'userId', 'duration', 'created'])

// ── Feature flags ─────────────────────────────────────────────────────────────
const DEFAULT_FEATURES = {
  aiBuilder:      { label: 'AI Builder',       enabled: true,  description: 'GPT-powered component generation'     },
  videoEditor:    { label: 'Video Editor',     enabled: true,  description: 'Hollywood-grade post-production suite' },
  bgRemover:      { label: 'BG Remover',       enabled: true,  description: 'One-click AI background removal'       },
  logoMaker:      { label: 'Logo Maker',       enabled: true,  description: 'AI brand identity generator'           },
  studioMode:     { label: 'Studio / DAW',     enabled: true,  description: 'Full music production workspace'       },
  multiCam:       { label: 'Multi-Cam',        enabled: true,  description: 'Multi-camera sequence switching'       },
  motionTracking: { label: 'Motion Tracking',  enabled: true,  description: 'AI object tracking & masking'         },
  beatSync:       { label: 'Beat Sync',        enabled: true,  description: 'Audio-driven timeline sync'            },
  chromaKey:      { label: 'Chroma Key',       enabled: true,  description: 'Advanced ultra key compositing'        },
  projectsCloud:  { label: 'Cloud Projects',   enabled: true,  description: 'Cloud project storage & sync'          },
  versionHistory: { label: 'Version History',  enabled: true,  description: 'Unlimited project version snapshots'   },
  exportPWA:      { label: 'PWA Export',       enabled: true,  description: 'Export as Progressive Web App'         },
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const DEFAULT_PRICING = {
  free:       { name: 'Free',       monthly: 0,   annual: 0   },
  pro:        { name: 'Pro',        monthly: 49,  annual: 39  },
  enterprise: { name: 'Enterprise', monthly: 299, annual: 249 },
}

// ── Support tickets ───────────────────────────────────────────────────────────
const MOCK_TICKETS = [
  { id: 't-001', userId: 'u-002', user: 'Marcus Bell',     email: 'marcus@bellstudio.co',  subject: 'Video export failed — 4K timeout',         message: "My 4K export keeps timing out after ~2 minutes. File is 18 GB. Tried 3 times, same result every time. Already cleared cache.", status: 'open',    priority: 'high',   createdAt: '2h ago',  replies: [] },
  { id: 't-002', userId: 'u-004', user: 'Dev Patel',       email: 'dev@thinkmvp.in',       subject: 'Pro features still locked after upgrade',    message: "I upgraded to Pro 30 mins ago — payment went through (got receipt) — but still seeing Free tier everywhere. AI Builder shows 5/5 generation limit.", status: 'open', priority: 'high', createdAt: '4h ago', replies: [] },
  { id: 't-003', userId: 'u-007', user: 'Aiko Tanaka',    email: 'aiko@studiofly.jp',     subject: 'BG Remover artifacts on PNG transparency',  message: "Transparent PNGs come back with harsh white pixel fringing after background removal. JPEGs process perfectly. Happens on all PNG sizes.", status: 'open', priority: 'medium', createdAt: '6h ago', replies: [] },
  { id: 't-004', userId: 'u-010', user: 'Omar Khalid',    email: 'omar@buildfast.ae',     subject: 'Feature request: Arabic RTL support',       message: "Would love proper RTL text direction support in the canvas builder. My clients are primarily Arabic-speaking and require this for their sites.", status: 'open', priority: 'low', createdAt: '1d ago', replies: [] },
  { id: 't-005', userId: 'u-008', user: 'Rafael Moura',   email: 'rafael@vibelab.br',     subject: 'Logo file gone from cloud projects',         message: "I generated a logo yesterday (brand: VibeSync) but it disappeared from my Projects drawer after I refreshed the page. Logo credit was used.", status: 'replied', priority: 'medium', createdAt: '2d ago', replies: [{ from: 'admin', text: 'Investigating now — there was a cloud sync issue on 05/16. Your file should reappear within 24h. We will credit the generation back. Sorry for the trouble!', time: '1d ago' }] },
  { id: 't-006', userId: 'u-003', user: 'Leila Okonkwo',  email: 'leila@luminary.ai',     subject: 'Billing charged twice this month',           message: "I see two charges of $49 on May 3rd and May 4th on my Stripe statement. Please refund the duplicate.", status: 'open', priority: 'high', createdAt: '3d ago', replies: [] },
]

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAdminStore = create((set, get) => ({

  // ── Live metrics ───────────────────────────────────────────────────────────
  metrics: {
    activeCreators: 2847,
    activeSessions: 1293,
    mrr:            48610,
    arr:            583320,
    infraHealth:    99.7,
    uptimeDays:     142,
    storageUsedGB:  18.4,
    apiCallsToday:  142800,
  },

  // ── User roster ───────────────────────────────────────────────────────────
  users:    MOCK_USERS,
  userSearch: '',
  setUserSearch: (q) => set({ userSearch: q }),

  changeTier: (userId, tier, actor) => {
    const target = get().users.find(u => u.id === userId)
    const entry  = buildAuditEntry(AUDIT_ACTIONS.TIER_CHANGE, actor, { userId, oldTier: target?.tier, newTier: tier })
    set(s => ({
      users:            s.users.map(u => u.id === userId ? { ...u, tier } : u),
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  freezeAccount: (userId, actor) => {
    const entry = buildAuditEntry(AUDIT_ACTIONS.ACCOUNT_FREEZE, actor, { userId })
    set(s => ({
      users:            s.users.map(u => u.id === userId ? { ...u, status: 'frozen', sessions: 0 } : u),
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  unfreezeAccount: (userId, actor) => {
    const entry = buildAuditEntry(AUDIT_ACTIONS.ACCOUNT_UNFREEZE, actor, { userId })
    set(s => ({
      users:            s.users.map(u => u.id === userId ? { ...u, status: 'active' } : u),
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  impersonating:    null,
  impersonateUser:  (userId, actor) => {
    const target = get().users.find(u => u.id === userId) ?? null
    const entry  = buildAuditEntry(AUDIT_ACTIONS.IMPERSONATE_START, actor, { targetUserId: userId, targetEmail: target?.email })
    set(s => ({ impersonating: target, securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200) }))
  },
  stopImpersonating: (actor) => {
    const entry = buildAuditEntry(AUDIT_ACTIONS.IMPERSONATE_STOP, actor, { targetEmail: get().impersonating?.email })
    set(s => ({ impersonating: null, securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200) }))
  },

  // ── Database Overlord ─────────────────────────────────────────────────────
  dbData:       MOCK_DB,
  activeDbTable: 'users',
  editingCell:   null,  // { tableId, rowId, colKey } | null
  editValue:     '',

  setActiveDbTable: (t) => set({ activeDbTable: t, editingCell: null }),

  startCellEdit: (tableId, rowId, colKey) => {
    const row = get().dbData[tableId]?.find(r => r.id === rowId)
    set({ editingCell: { tableId, rowId, colKey }, editValue: String(row?.[colKey] ?? '') })
  },

  setEditValue: (v) => set({ editValue: v }),

  commitCellEdit: () => {
    const { editingCell, editValue, dbData } = get()
    if (!editingCell) return
    const { tableId, rowId, colKey } = editingCell
    set({
      dbData: {
        ...dbData,
        [tableId]: dbData[tableId].map(r => r.id === rowId ? { ...r, [colKey]: editValue } : r),
      },
      editingCell: null,
      editValue: '',
    })
  },

  cancelCellEdit: () => set({ editingCell: null, editValue: '' }),

  // ── AI Gateway Sentry ─────────────────────────────────────────────────────
  apiServices: {
    claude:      { name: 'Claude AI',       icon: '🧠', used: 84200, limit: 200000, costPerK: 0.003, callsToday: 1847, unit: 'tokens' },
    diffusion:   { name: 'BG Remover AI',   icon: '✂️', used: 12400, limit: 50000,  costPerK: 0.02,  callsToday: 341,  unit: 'calls'  },
    logoAI:      { name: 'Logo Vector AI',  icon: '🎨', used: 3200,  limit: 20000,  costPerK: 0.05,  callsToday: 89,   unit: 'calls'  },
    videoRender: { name: 'Video Renderer',  icon: '🎬', used: 560,   limit: 5000,   costPerK: 0.15,  callsToday: 23,   unit: 'jobs'   },
  },
  freeUserCreditCap: 25,
  setFreeUserCreditCap: (v)          => set({ freeUserCreditCap: Number(v) }),
  setServiceLimit:     (id, limit)   => set(s => ({
    apiServices: { ...s.apiServices, [id]: { ...s.apiServices[id], limit: Number(limit) } },
  })),
  setServiceUsed: (id, used)         => set(s => ({
    apiServices: { ...s.apiServices, [id]: { ...s.apiServices[id], used: Number(used) } },
  })),

  // ── Platform Protection Matrix ────────────────────────────────────────────
  maintenanceMode:    false,
  maintenanceSince:   null,
  maintenanceMessage: 'We are performing scheduled maintenance to improve your experience. We will be back online shortly.',
  frozenServices:     [],

  toggleMaintenanceMode: () => set(s => ({
    maintenanceMode:  !s.maintenanceMode,
    maintenanceSince: !s.maintenanceMode ? new Date().toISOString() : null,
    frozenServices:   !s.maintenanceMode ? ['payments', 'ai_generation'] : [],
  })),

  setMaintenanceMessage: (msg) => set({ maintenanceMessage: msg }),

  toggleFrozenService: (svc) => set(s => ({
    frozenServices: s.frozenServices.includes(svc)
      ? s.frozenServices.filter(x => x !== svc)
      : [...s.frozenServices, svc],
  })),

  // ── Support Tickets / Comms Hub ───────────────────────────────────────────
  tickets:         MOCK_TICKETS,
  expandedTicketId: null,
  ticketReplyDraft: {},

  expandTicket:   (id)          => set(s => ({ expandedTicketId: s.expandedTicketId === id ? null : id })),
  setReplyDraft:  (ticketId, v) => set(s => ({ ticketReplyDraft: { ...s.ticketReplyDraft, [ticketId]: v } })),
  closeTicket:    (ticketId)    => set(s => ({ tickets: s.tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t) })),

  sendReply: (ticketId) => {
    const { ticketReplyDraft, tickets } = get()
    const draft = ticketReplyDraft[ticketId]?.trim()
    if (!draft) return
    set({
      tickets: tickets.map(t => t.id === ticketId
        ? { ...t, status: 'replied', replies: [...(t.replies ?? []), { from: 'admin', text: draft, time: 'Just now' }] }
        : t
      ),
      ticketReplyDraft: { ...ticketReplyDraft, [ticketId]: '' },
    })
  },

  // ── Feature flags ─────────────────────────────────────────────────────────
  features: DEFAULT_FEATURES,
  toggleFeature: (key, actor) => {
    const current = get().features[key]
    const entry = buildAuditEntry(AUDIT_ACTIONS.FEATURE_TOGGLE, actor, { flag: key, newValue: !current?.enabled })
    set(s => ({
      features:         { ...s.features, [key]: { ...s.features[key], enabled: !s.features[key].enabled } },
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  pricing: DEFAULT_PRICING,
  updatePrice: (tier, field, val, actor) => {
    const oldVal = get().pricing[tier]?.[field]
    const entry  = buildAuditEntry(AUDIT_ACTIONS.PRICE_UPDATE, actor, { tier, field, oldVal, newVal: Number(val) })
    set(s => ({
      pricing:          { ...s.pricing, [tier]: { ...s.pricing[tier], [field]: Number(val) } },
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  // ── Global broadcast ──────────────────────────────────────────────────────
  activeBroadcast: null,
  broadcastDraft:  { message: '', severity: 'info', duration: 30 },

  setBroadcastDraft: (field, val) => set(s => ({ broadcastDraft: { ...s.broadcastDraft, [field]: val } })),

  triggerBroadcast: (actor) => {
    const { broadcastDraft } = get()
    if (!broadcastDraft.message.trim()) return
    const broadcast = {
      message:  broadcastDraft.message.trim(),
      severity: broadcastDraft.severity,
      sentAt:   new Date().toISOString(),
      duration: broadcastDraft.duration,
    }
    const entry = buildAuditEntry(AUDIT_ACTIONS.BROADCAST_FIRE, actor, broadcast)
    set(s => ({
      activeBroadcast:  broadcast,
      securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200),
    }))
  },

  clearBroadcast: (actor) => {
    const entry = buildAuditEntry(AUDIT_ACTIONS.BROADCAST_CLEAR, actor, {})
    set(s => ({ activeBroadcast: null, securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200) }))
  },

  // ── Nav section ───────────────────────────────────────────────────────────
  adminSection:    'metrics',
  setAdminSection: (s) => set({ adminSection: s }),

  // ── Security: Invite tokens ───────────────────────────────────────────────
  inviteTokens: {},  // { [token]: InviteTokenEntry }

  addInviteToken: (actor) => {
    const entry = generateInviteToken(actor)
    const action = AUDIT_ACTIONS.INVITE_GENERATE ?? 'admin.invite_generate'
    const auditEntry = buildAuditEntry(action, actor, { token: entry.token.slice(0, 12) + '…' })
    set(s => ({
      inviteTokens:     { ...s.inviteTokens, [entry.token]: entry },
      securityAuditLog: [auditEntry, ...s.securityAuditLog].slice(0, 200),
    }))
    return entry
  },

  consumeInviteToken: (token) => {
    set(s => ({
      inviteTokens: {
        ...s.inviteTokens,
        [token]: s.inviteTokens[token]
          ? { ...s.inviteTokens[token], used: true }
          : s.inviteTokens[token],
      },
    }))
  },

  revokeInviteToken: (token, actor) => {
    const action = AUDIT_ACTIONS.INVITE_REVOKE ?? 'admin.invite_revoke'
    const entry  = buildAuditEntry(action, actor, { token: token.slice(0, 12) + '…' })
    set(s => {
      const next = { ...s.inviteTokens }
      delete next[token]
      return { inviteTokens: next, securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200) }
    })
  },

  // ── Security: TOTP gate ───────────────────────────────────────────────────
  totpVerified: false,

  verifyTOTP: (actor) => {
    const entry = buildAuditEntry(AUDIT_ACTIONS.TOTP_VERIFIED, actor, { method: 'TOTP-RFC6238' })
    set(s => ({
      totpVerified:     true,
      securityAuditLog: [entry, ...s.securityAuditLog],
    }))
  },

  resetTOTP: () => set({ totpVerified: false }),

  // ── Security: Immutable audit log ─────────────────────────────────────────
  securityAuditLog: [],

  logAdminAction: (action, actor, details = {}) => {
    const entry = buildAuditEntry(action, actor, details)
    set(s => ({ securityAuditLog: [entry, ...s.securityAuditLog].slice(0, 200) }))
    return entry
  },
}))
