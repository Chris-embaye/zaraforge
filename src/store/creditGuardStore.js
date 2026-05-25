/**
 * ZaraForge Financial Defense & Cost-Mitigation Guardrail System
 *
 * Architecture:
 *  1. verifyUserCredits()  — call before ANY expensive API operation
 *  2. consumeCredit()      — call after a successful API response
 *  3. Global monthly budget cap with automatic mock-mode freeze
 *  4. Per-user daily allowance with UTC-midnight hard reset
 *  5. Stripe subscription re-verification before heavy operations
 */

import { create } from 'zustand'

// ── Cost table (USD per single call) ─────────────────────────────────────────
export const FEATURE_COSTS = {
  ai_builder:   { label: 'AI Builder Prompt',  service: 'claude',       costUSD: 0.0032 },
  logo_ai:      { label: 'Logo Generation',    service: 'logoAI',       costUSD: 0.048  },
  bg_remover:   { label: 'BG Removal',         service: 'diffusion',    costUSD: 0.018  },
  video_render: { label: 'Video Export/Render',service: 'videoRender',  costUSD: 0.145  },
  beat_sync:    { label: 'Beat Analysis',      service: 'claude',       costUSD: 0.007  },
  motion_track: { label: 'Motion Tracking',    service: 'videoRender',  costUSD: 0.022  },
  chroma_key:   { label: 'Chroma Key Frame',   service: 'diffusion',    costUSD: 0.009  },
  studio_mix:   { label: 'Studio AI Mix',      service: 'claude',       costUSD: 0.005  },
}

// ── Service labels for display ────────────────────────────────────────────────
export const SERVICE_LABELS = {
  claude:      'Claude AI',
  logoAI:      'Logo Vector AI',
  diffusion:   'BG Remover AI',
  videoRender: 'Video Renderer',
}

// ── Mock Stripe subscription statuses ────────────────────────────────────────
const INITIAL_STRIPE = {
  'zara@zaradesign.io':    { status: 'active',    plan: 'enterprise', periodEnd: '2026-06-18', lastChecked: new Date().toISOString() },
  'marcus@bellstudio.co':  { status: 'active',    plan: 'pro',        periodEnd: '2026-06-07', lastChecked: new Date().toISOString() },
  'leila@luminary.ai':     { status: 'active',    plan: 'pro',        periodEnd: '2026-06-19', lastChecked: new Date().toISOString() },
  'dev@thinkmvp.in':       { status: 'active',    plan: 'free',       periodEnd: null,         lastChecked: new Date().toISOString() },
  'sofia@pixelcraft.se':   { status: 'canceled',  plan: 'pro',        periodEnd: '2026-05-15', lastChecked: new Date().toISOString() },
  'james@apexmedia.uk':    { status: 'active',    plan: 'enterprise', periodEnd: '2026-06-30', lastChecked: new Date().toISOString() },
  'aiko@studiofly.jp':     { status: 'active',    plan: 'free',       periodEnd: null,         lastChecked: new Date().toISOString() },
  'rafael@vibelab.br':     { status: 'past_due',  plan: 'pro',        periodEnd: '2026-05-03', lastChecked: new Date().toISOString() },
  'nadia@creativelabs.ru': { status: 'active',    plan: 'enterprise', periodEnd: '2026-06-27', lastChecked: new Date().toISOString() },
  'omar@buildfast.ae':     { status: 'active',    plan: 'free',       periodEnd: null,         lastChecked: new Date().toISOString() },
}

// ── UTC time helpers ──────────────────────────────────────────────────────────
function nextUTCMidnight() {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d.toISOString()
}

function firstOfNextMonthUTC() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString()
}

function nowISO() { return new Date().toISOString() }

// ── Zustand store ─────────────────────────────────────────────────────────────
export const useCreditGuardStore = create((set, get) => ({

  // ── Per-user daily allowance ───────────────────────────────────────────────
  // Keyed by email. { spent: int, limit: int, resetAt: ISO string }
  dailyAllowance: {},

  // ── Free-tier daily generation limit (admin-configurable) ─────────────────
  freeDailyLimit: 3,
  setFreeDailyLimit: (n) => set({ freeDailyLimit: Math.max(0, Number(n)) }),

  // ── Stripe subscription statuses (webhook-synced) ─────────────────────────
  stripeStatuses: INITIAL_STRIPE,

  // ── Global monthly cost budget ────────────────────────────────────────────
  budget: {
    capUSD:     100,
    spentUSD:   12.47,  // realistic starting spend for demo
    spentByService: {
      claude:      5.82,
      diffusion:   3.06,
      logoAI:      1.44,
      videoRender: 2.15,
    },
    mockMode:   false,
    frozenAt:   null,
    resetAt:    firstOfNextMonthUTC(),
    callsThisMonth: 3892,
  },

  // ── Audit log (last 20 guard decisions) ───────────────────────────────────
  auditLog: [],

  // ── Blocked UI state ──────────────────────────────────────────────────────
  // null | { reason: 'daily_limit'|'stripe_invalid'|'stripe_past_due', feature, meta }
  blocked: null,
  dismissBlocked: () => set({ blocked: null }),

  // ── Admin actions ─────────────────────────────────────────────────────────
  resetMonthlyBudget: () => set(s => ({
    budget: {
      ...s.budget,
      spentUSD: 0,
      spentByService: { claude: 0, diffusion: 0, logoAI: 0, videoRender: 0 },
      mockMode: false,
      frozenAt: null,
      resetAt:  firstOfNextMonthUTC(),
      callsThisMonth: 0,
    },
    auditLog: [],
  })),

  setBudgetCap: (capUSD) => set(s => ({
    budget: { ...s.budget, capUSD: Math.max(1, Number(capUSD)) },
  })),

  setMockMode: (v) => set(s => ({
    budget: { ...s.budget, mockMode: Boolean(v), frozenAt: v ? nowISO() : null },
  })),

  resetUserAllowance: (email) => set(s => ({
    dailyAllowance: {
      ...s.dailyAllowance,
      [email]: { spent: 0, limit: s.freeDailyLimit, resetAt: nextUTCMidnight() },
    },
  })),

  // ── Stripe webhook simulation ─────────────────────────────────────────────
  simulateStripeWebhook: (email, event) => {
    const statusMap = {
      'subscription.canceled':       'canceled',
      'invoice.payment_failed':      'past_due',
      'invoice.payment_succeeded':   'active',
      'customer.subscription.deleted': 'canceled',
    }
    const newStatus = statusMap[event] ?? 'active'
    set(s => ({
      stripeStatuses: {
        ...s.stripeStatuses,
        [email]: {
          ...(s.stripeStatuses[email] ?? {}),
          status:      newStatus,
          lastChecked: nowISO(),
        },
      },
      auditLog: [
        { at: nowISO(), type: 'stripe_webhook', email, event, result: newStatus },
        ...s.auditLog.slice(0, 19),
      ],
    }))
  },

  overrideStripeStatus: (email, status) => set(s => ({
    stripeStatuses: {
      ...s.stripeStatuses,
      [email]: { ...(s.stripeStatuses[email] ?? {}), status, lastChecked: nowISO() },
    },
    auditLog: [
      { at: nowISO(), type: 'admin_override', email, result: status },
      ...s.auditLog.slice(0, 19),
    ],
  })),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  verifyUserCredits — call BEFORE any expensive API operation
//  Returns: { allowed: bool, mockMode: bool, reason: string | null }
// ─────────────────────────────────────────────────────────────────────────────
export function verifyUserCredits({ userEmail, userTier = 'free', feature = 'unknown', estimatedCostUSD = 0 }) {
  const s   = useCreditGuardStore.getState()
  const now = new Date()

  const log = (type, result, meta = {}) => {
    useCreditGuardStore.setState(st => ({
      auditLog: [
        { at: nowISO(), type, email: userEmail, feature, result, ...meta },
        ...st.auditLog.slice(0, 19),
      ],
    }))
  }

  // ── GATE 1: Global monthly budget cap ─────────────────────────────────────
  const { budget } = s

  // Auto-reset if we've crossed into a new month
  if (budget.resetAt && new Date(budget.resetAt) <= now && !budget.frozenAt) {
    useCreditGuardStore.getState().resetMonthlyBudget()
    // Re-read after reset
  }

  if (budget.mockMode) {
    log('gate_budget_cap', 'mock_mode')
    return { allowed: true, mockMode: true, reason: 'budget_cap' }
  }

  if (budget.spentUSD >= budget.capUSD) {
    // Freeze: switch to mock mode automatically
    useCreditGuardStore.setState(st => ({
      budget: { ...st.budget, mockMode: true, frozenAt: nowISO() },
    }))
    log('gate_budget_cap', 'freeze_triggered', { spentUSD: budget.spentUSD, capUSD: budget.capUSD })
    return { allowed: true, mockMode: true, reason: 'budget_cap' }
  }

  // ── GATE 2: Pro / Enterprise — re-verify Stripe subscription ──────────────
  if (userTier === 'pro' || userTier === 'enterprise') {
    const stripe = s.stripeStatuses[userEmail]

    if (stripe) {
      // Mark as re-checked
      useCreditGuardStore.setState(st => ({
        stripeStatuses: {
          ...st.stripeStatuses,
          [userEmail]: { ...stripe, lastChecked: nowISO() },
        },
      }))

      if (stripe.status === 'canceled') {
        useCreditGuardStore.setState({ blocked: { reason: 'stripe_invalid', feature, stripeStatus: 'canceled' } })
        log('gate_stripe', 'blocked', { stripeStatus: 'canceled' })
        return { allowed: false, mockMode: false, reason: 'stripe_canceled' }
      }

      if (stripe.status === 'past_due' || stripe.status === 'unpaid') {
        useCreditGuardStore.setState({ blocked: { reason: 'stripe_past_due', feature, stripeStatus: stripe.status } })
        log('gate_stripe', 'blocked', { stripeStatus: stripe.status })
        return { allowed: false, mockMode: false, reason: 'stripe_past_due' }
      }
    }

    log('gate_stripe', 'allowed')
    return { allowed: true, mockMode: false, reason: null }
  }

  // ── GATE 3: Free tier — daily allowance hard cap ──────────────────────────
  const key      = userEmail ?? 'anonymous'
  const existing = s.dailyAllowance[key]

  // Check if UTC midnight has passed → reset allowance
  const needsReset = !existing || new Date(existing.resetAt) <= now

  if (needsReset) {
    const fresh = { spent: 0, limit: s.freeDailyLimit, resetAt: nextUTCMidnight() }
    useCreditGuardStore.setState(st => ({
      dailyAllowance: { ...st.dailyAllowance, [key]: fresh },
    }))
    log('gate_free_tier', 'allowed', { allowanceReset: true })
    return { allowed: true, mockMode: false, reason: null }
  }

  if (existing.spent >= existing.limit) {
    useCreditGuardStore.setState({
      blocked: {
        reason:  'daily_limit',
        feature,
        spent:   existing.spent,
        limit:   existing.limit,
        resetAt: existing.resetAt,
      },
    })
    log('gate_free_tier', 'blocked', { spent: existing.spent, limit: existing.limit })
    return { allowed: false, mockMode: false, reason: 'daily_limit' }
  }

  log('gate_free_tier', 'allowed', { spent: existing.spent, limit: existing.limit })
  return { allowed: true, mockMode: false, reason: null }
}

// ─────────────────────────────────────────────────────────────────────────────
//  consumeCredit — call AFTER a successful (real or mock) API response
// ─────────────────────────────────────────────────────────────────────────────
export function consumeCredit({ userEmail, userTier = 'free', feature = 'unknown', actualCostUSD }) {
  const cost    = actualCostUSD ?? FEATURE_COSTS[feature]?.costUSD ?? 0
  const service = FEATURE_COSTS[feature]?.service ?? 'claude'

  useCreditGuardStore.setState(s => {
    // Increment daily allowance for free tier
    const key = userEmail ?? 'anonymous'
    let dailyAllowance = s.dailyAllowance

    if (userTier === 'free' && dailyAllowance[key]) {
      dailyAllowance = {
        ...dailyAllowance,
        [key]: { ...dailyAllowance[key], spent: dailyAllowance[key].spent + 1 },
      }
    }

    // Increment global budget
    const newSpent   = +(s.budget.spentUSD + cost).toFixed(4)
    const svcSpent   = +((s.budget.spentByService[service] ?? 0) + cost).toFixed(4)
    const shouldFreeze = newSpent >= s.budget.capUSD

    return {
      dailyAllowance,
      budget: {
        ...s.budget,
        spentUSD:   newSpent,
        spentByService: { ...s.budget.spentByService, [service]: svcSpent },
        callsThisMonth: s.budget.callsThisMonth + 1,
        mockMode:   shouldFreeze ? true : s.budget.mockMode,
        frozenAt:   shouldFreeze && !s.budget.frozenAt ? nowISO() : s.budget.frozenAt,
      },
    }
  })
}
