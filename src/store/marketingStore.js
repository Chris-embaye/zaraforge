import { create } from 'zustand'

// ── Default landing page copy (mirrors LandingPage.jsx initial text) ──────────
export const DEFAULT_COPY = {
  heroHeadline:    'Consider yourself\nlimitless.',
  heroSubheadline: 'If you can describe it, you can build it. ZaraForge turns natural language into full-stack applications, professional audio mixes, logos, and perfect assets.',
  builderSub:  'Describe it. Ship it.',
  studioSub:   'AI-Powered DAW',
  videoSub:    'Hollywood-grade NLE',
  logoSub:     'SVG Vector Studio',
  bgrSub:      'ML Segmentation',
}

// ── Default landing page pricing (separate from adminStore billing config) ────
export const DEFAULT_MARKETING_PRICING = {
  free:       { name: 'Free',       monthly: 0,  annual: 0  },
  pro:        { name: 'Pro',        monthly: 29, annual: 23 },
  enterprise: { name: 'Enterprise', monthly: 99, annual: 79 },
}

// ── Coupon validation — import this in your checkout router ───────────────────
export function validateCoupon(code, coupons) {
  if (!code?.trim()) return { valid: false, pct: 0, coupon: null }
  const found = coupons.find(
    c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active
  )
  if (!found) return { valid: false, pct: 0, coupon: null }
  return { valid: true, pct: found.pct, coupon: found }
}

// ─────────────────────────────────────────────────────────────────────────────
export const useMarketingStore = create((set, get) => ({

  // ── Landing page copy ──────────────────────────────────────────────────────
  landingCopy:     { ...DEFAULT_COPY },
  copyDraft:       { ...DEFAULT_COPY },
  copyDirty:       false,
  copyPublishedAt: null,

  setCopyDraft: (key, value) => set(s => ({
    copyDraft: { ...s.copyDraft, [key]: value },
    copyDirty: true,
  })),

  publishCopy: () => set(s => ({
    landingCopy:     { ...s.copyDraft },
    copyDirty:       false,
    copyPublishedAt: new Date().toISOString(),
  })),

  revertCopy: () => set(s => ({
    copyDraft: { ...s.landingCopy },
    copyDirty: false,
  })),

  // ── Landing page pricing ───────────────────────────────────────────────────
  marketingPricing:   { ...DEFAULT_MARKETING_PRICING },
  pricingDraft:       {
    free:       { ...DEFAULT_MARKETING_PRICING.free },
    pro:        { ...DEFAULT_MARKETING_PRICING.pro },
    enterprise: { ...DEFAULT_MARKETING_PRICING.enterprise },
  },
  pricingDirty:       false,
  pricingPublishedAt: null,

  setPricingDraft: (tier, field, value) => set(s => ({
    pricingDraft: {
      ...s.pricingDraft,
      [tier]: { ...s.pricingDraft[tier], [field]: Number(value) || 0 },
    },
    pricingDirty: true,
  })),

  publishPricing: () => set(s => ({
    marketingPricing:   {
      free:       { ...s.pricingDraft.free },
      pro:        { ...s.pricingDraft.pro },
      enterprise: { ...s.pricingDraft.enterprise },
    },
    pricingDirty:       false,
    pricingPublishedAt: new Date().toISOString(),
  })),

  revertPricing: () => set(s => ({
    pricingDraft: {
      free:       { ...s.marketingPricing.free },
      pro:        { ...s.marketingPricing.pro },
      enterprise: { ...s.marketingPricing.enterprise },
    },
    pricingDirty: false,
  })),

  // ── Discount coupon minting engine ─────────────────────────────────────────
  coupons: [
    { id: 'c1', code: 'ERITREA20', pct: 20, active: true,  created: '2026-05-01' },
    { id: 'c2', code: 'LAUNCH50',  pct: 50, active: true,  created: '2026-04-15' },
    { id: 'c3', code: 'BETA10',    pct: 10, active: false, created: '2026-03-01' },
  ],

  couponDraft: { code: '', pct: 10, active: true },

  setCouponDraft: (field, value) => set(s => ({
    couponDraft: { ...s.couponDraft, [field]: value },
  })),

  mintCoupon: () => {
    const { couponDraft, coupons } = get()
    const code = couponDraft.code.trim().toUpperCase()
    if (!code) return
    if (coupons.find(c => c.code === code)) return
    set({
      coupons: [
        {
          id:      `c${Date.now()}`,
          code,
          pct:     Math.min(100, Math.max(1, Number(couponDraft.pct) || 10)),
          active:  couponDraft.active,
          created: new Date().toISOString().split('T')[0],
        },
        ...coupons,
      ],
      couponDraft: { code: '', pct: 10, active: true },
    })
  },

  toggleCoupon: (id) => set(s => ({
    coupons: s.coupons.map(c => c.id === id ? { ...c, active: !c.active } : c),
  })),

  revokeCoupon: (id) => set(s => ({
    coupons: s.coupons.filter(c => c.id !== id),
  })),

  // ── Marketing pixel / script injector ─────────────────────────────────────
  // trackingScripts holds the sanitized, committed script block injected into <head>
  trackingScripts:  '',
  scriptDraft:      '',
  scriptDirty:      false,
  scriptInjectedAt: null,

  setScriptDraft: (v) => set({ scriptDraft: v, scriptDirty: true }),

  injectScripts: () => set(s => ({
    trackingScripts:  s.scriptDraft,
    scriptDirty:      false,
    scriptInjectedAt: new Date().toISOString(),
  })),

  clearScripts: () => set({
    trackingScripts:  '',
    scriptDraft:      '',
    scriptDirty:      false,
    scriptInjectedAt: null,
  }),
}))
