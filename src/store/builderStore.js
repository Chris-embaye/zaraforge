import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_THEME } from '../context/ThemeContext'
import { PALETTES } from '../lib/palettes'
import { useAuthStore } from './authStore'

const deepCopy = (x) => JSON.parse(JSON.stringify(x))

// ─── LocalStorage keys ────────────────────────────────────────────────────────
const WORKSPACE_KEY  = 'zf-workspace'
const VERSIONS_KEY   = 'zf-versions'
const GEN_COUNT_KEY  = 'zf-gen-count'

function loadGenCount() {
  try { return parseInt(localStorage.getItem(GEN_COUNT_KEY) || '0', 10) } catch { return 0 }
}
function saveGenCount(n) {
  try { localStorage.setItem(GEN_COUNT_KEY, String(n)) } catch {}
}

// ─── Section component defaults ───────────────────────────────────────────────
const DEFAULTS = {
  Navbar: {
    brand: 'MyBrand', bgColor: '#0f172a', textColor: '#ffffff',
    accentColor: '#6366f1', links: ['Home', 'About', 'Features', 'Pricing', 'Contact'],
    showCTA: true, ctaText: 'Get Started', ctaUrl: '#'
  },
  Hero: {
    headline: 'Build Something Amazing', bgGradient: true,
    subheadline: 'Create stunning websites and web apps without writing a single line of code. Drag, drop, and deploy in minutes.',
    primaryCTA: 'Start Building Free', primaryCTAUrl: '#',
    secondaryCTA: 'Watch Demo', secondaryCTAUrl: '#',
    bgColor: '#0f172a', textColor: '#ffffff', accentColor: '#6366f1',
    badge: '🚀 Now in Public Beta', showBadge: true
  },
  Features: {
    sectionTitle: 'Everything You Need to Ship Fast',
    sectionSubtitle: 'Powerful features engineered for creators, developers, and teams who move fast.',
    bgColor: '#ffffff', textColor: '#0f172a', accentColor: '#6366f1',
    features: [
      { id: '1', icon: '⚡', title: 'Lightning Performance', desc: 'Sub-second load times with optimized output on every device.' },
      { id: '2', icon: '🎨', title: 'Pixel-Perfect Design', desc: 'Professional templates crafted by world-class designers.' },
      { id: '3', icon: '🔒', title: 'Enterprise Security', desc: 'SOC 2 Type II compliant with end-to-end encryption.' },
      { id: '4', icon: '📱', title: 'Fully Responsive', desc: 'Every component adapts beautifully to any screen size.' },
      { id: '5', icon: '🔧', title: 'Deep Customization', desc: 'Tweak every property visually without writing code.' },
      { id: '6', icon: '🚀', title: 'One-Click Export', desc: 'Export clean, production-ready HTML and deploy anywhere.' }
    ]
  },
  Testimonials: {
    sectionTitle: 'Loved by 50,000+ Creators',
    sectionSubtitle: "Don't take our word for it — here's what builders around the world say.",
    bgColor: '#f8fafc', textColor: '#0f172a', accentColor: '#6366f1',
    testimonials: [
      { id: '1', name: 'Sarah Johnson', role: 'Founder @ TechCo', avatar: 'SJ', avatarColor: '#6366f1', text: 'This platform completely changed how we ship products. We went from weeks to hours.', rating: 5 },
      { id: '2', name: 'Marcus Thompson', role: 'Lead Dev @ StartupX', avatar: 'MT', avatarColor: '#10b981', text: 'I was skeptical about no-code tools, but the exported code is genuinely production-ready. Saved our team 3 weeks.', rating: 5 },
      { id: '3', name: 'Amy Liu', role: 'Creative Director', avatar: 'AL', avatarColor: '#f59e0b', text: 'Finally a no-code tool that designers love. The component quality is exceptional.', rating: 5 }
    ]
  },
  Pricing: {
    sectionTitle: 'Simple, Transparent Pricing',
    sectionSubtitle: 'Start free, scale as you grow. No hidden fees. Cancel anytime.',
    bgColor: '#ffffff', textColor: '#0f172a', accentColor: '#6366f1',
    plans: [
      { id: '1', name: 'Starter', price: '$0', period: '/month', description: 'Perfect for individuals and hobby projects', features: ['5 Projects', '10 GB Storage', 'Community Support', 'Core Components', 'HTML Export'], highlighted: false, cta: 'Get Started Free' },
      { id: '2', name: 'Pro', price: '$29', period: '/month', description: 'For professionals and growing teams', features: ['Unlimited Projects', '100 GB Storage', 'Priority Support', 'All Components', 'Custom Domain', 'Team Collaboration'], highlighted: true, cta: 'Start Free Trial' },
      { id: '3', name: 'Enterprise', price: '$99', period: '/month', description: 'For large teams and organizations', features: ['Everything in Pro', 'Unlimited Storage', '24/7 Support', 'SSO & SAML', 'SLA Guarantee'], highlighted: false, cta: 'Contact Sales' }
    ]
  },
  CTA: {
    headline: 'Ready to Build Your Dream Site?',
    subheadline: 'Join 50,000+ creators shipping faster. Start free — no credit card required.',
    primaryCTA: 'Start Building Free', primaryCTAUrl: '#',
    secondaryCTA: 'Book a Demo', secondaryCTAUrl: '#',
    bgColor: '#6366f1', bgGradient: true, textColor: '#ffffff', accentColor: '#a5b4fc'
  },
  ContactForm: {
    sectionTitle: 'Get In Touch',
    sectionSubtitle: "Have a question? We'd love to hear from you. We'll respond within 24 hours.",
    bgColor: '#f8fafc', textColor: '#0f172a', accentColor: '#6366f1',
    email: 'hello@mybrand.com', phone: '+1 (555) 000-0000',
    address: '123 Innovation St, San Francisco, CA 94105',
    submitText: 'Send Message',
    formEndpoint: '',   // ← API endpoint binding
  },
  Footer: {
    brand: 'MyBrand',
    tagline: 'Building the future, one component at a time.',
    bgColor: '#0f172a', textColor: '#94a3b8', accentColor: '#6366f1',
    copyright: `© ${new Date().getFullYear()} MyBrand. All rights reserved.`,
    columns: {
      Product:   ['Features', 'Pricing', 'Changelog', 'Roadmap'],
      Company:   ['About', 'Blog', 'Careers', 'Press'],
      Resources: ['Docs', 'API Reference', 'Status', 'Community'],
      Legal:     ['Privacy Policy', 'Terms of Service', 'Cookie Policy']
    }
  },
  VocalStudio: {
    title: 'Vocal Studio', bgColor: '#07070d',
    accentColor: '#00ff88', defaultKey: 'C Major', defaultIntensity: 50,
  },
  StripeCard: {
    productName: 'Pro Plan', price: '$29', currency: 'USD', billingPeriod: 'monthly',
    ctaText: 'Get Started', highlighted: true,
    stripeProductId: '', stripePriceId: '', stripeMode: 'subscription', aiWebhooks: true,
    bgColor: '#0f172a', accentColor: '#6366f1',
  },
  BuyButton: {
    productName: 'Premium Access', price: '$49', currency: 'USD',
    buttonText: 'Buy Now',
    stripeProductId: '', stripePriceId: '', stripeMode: 'payment', aiWebhooks: true,
    bgColor: '#0f172a', accentColor: '#6366f1',
  },
}

const ATOMIC_DEFAULTS = {
  Row: { bgColor: null, columns: 2, gap: 6, paddingY: 48, paddingX: 24, align: 'center' },
  Heading: { text: 'Your Heading Here', level: 'h2', color: null, size: '3xl', weight: 'bold', align: 'left' },
  Image: { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', alt: 'Image description', borderRadius: null, aspectRatio: '16/9', objectFit: 'cover' },
  Button: {
    text: 'Click Me', href: '#', variant: 'primary', size: 'md',
    bgColor: null, textColor: '#ffffff', borderRadius: null, fullWidth: false,
    targetPage: '',   // ← page navigation link
  },
}

const ATOMIC_TYPES    = new Set(['Heading', 'Image', 'Button'])
const CONTAINER_TYPES = new Set(['Row'])

function findById(components, id) {
  for (const comp of components) {
    if (comp.id === id) return { item: comp, parent: null }
    if (comp.children) {
      for (const child of comp.children) {
        if (child.id === id) return { item: child, parent: comp }
      }
    }
  }
  return { item: null, parent: null }
}

// ─── Page helpers ─────────────────────────────────────────────────────────────
const DEFAULT_PAGE_ID = 'page-home'
const emptySchema = () => ({ id: 'canvas', theme: deepCopy(DEFAULT_THEME), components: [] })

// Sync active schema mutation back into pages array
function _updateActive(state, schemaUpdater) {
  const newSchema = schemaUpdater(state.schema)
  return {
    schema: newSchema,
    pages: state.pages.map(p =>
      p.id === state.activePageId ? { ...p, schema: newSchema } : p
    ),
  }
}

// ─── Load persisted workspace ─────────────────────────────────────────────────
function loadWorkspace() {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const _saved = loadWorkspace()
const _initPages = _saved?.pages ?? [{
  id: DEFAULT_PAGE_ID, name: 'Home', schema: emptySchema(),
}]
const _initActiveId = _saved?.activePageId ?? DEFAULT_PAGE_ID
const _initSchema = _initPages.find(p => p.id === _initActiveId)?.schema ?? emptySchema()
const _initAppMode   = _saved?.appMode ?? 'studio'
const _appEntered    = localStorage.getItem('zf-entered') === 'true'

// ─── Store ────────────────────────────────────────────────────────────────────
export const useBuilderStore = create((set, get) => ({
  // Multi-page state
  pages:        _initPages,
  activePageId: _initActiveId,
  schema:       _initSchema,   // always mirrors pages[activePageId].schema

  selectedId:  null,
  previewMode: false,
  showExport:  false,
  appMode:     _initAppMode,
  setAppMode:  (m) => set({ appMode: m }),

  // ── Landing gate — false until user clicks "Start building" ───────────────
  appEntered:    _appEntered,
  enterApp: (mode = 'builder') => {
    localStorage.setItem('zf-entered', 'true')
    set({ appEntered: true, appMode: mode })
  },

  // ── Form Analytics ─────────────────────────────────────────────────────────
  formSubmissions:    [],
  showFormAnalytics:  false,
  setShowFormAnalytics: (v) => set({ showFormAnalytics: v }),
  addFormSubmission: (sub) => set(s => ({
    formSubmissions: [{ id: Date.now(), ...sub }, ...s.formSubmissions].slice(0, 200),
  })),
  clearFormSubmissions: () => set({ formSubmissions: [] }),

  // ── Version History modal ──────────────────────────────────────────────────
  showVersionHistory:  false,
  setShowVersionHistory: (v) => set({ showVersionHistory: v }),

  // ── Page Management ────────────────────────────────────────────────────────
  setActivePage: (id) => {
    const s = get()
    const target = s.pages.find(p => p.id === id)
    if (!target) return
    set({ activePageId: id, schema: target.schema, selectedId: null })
  },

  addPage: (name) => {
    const id     = `page-${uuidv4().slice(0, 8)}`
    const schema = emptySchema()
    set(s => ({
      pages:        [...s.pages, { id, name, schema }],
      activePageId: id,
      schema,
      selectedId:   null,
    }))
  },

  removePage: (id) => {
    const s = get()
    if (s.pages.length <= 1) return
    const newPages = s.pages.filter(p => p.id !== id)
    const newActiveId = s.activePageId === id ? newPages[0].id : s.activePageId
    const newSchema   = newPages.find(p => p.id === newActiveId)?.schema ?? emptySchema()
    set({ pages: newPages, activePageId: newActiveId, schema: newSchema, selectedId: null })
  },

  renamePage: (id, name) => set(s => ({
    pages: s.pages.map(p => p.id === id ? { ...p, name } : p),
  })),

  // ── Theme ──────────────────────────────────────────────────────────────────
  updateTheme: (updates) => set(s => _updateActive(s, schema => ({
    ...schema, theme: { ...schema.theme, ...updates },
  }))),

  // ── Component CRUD ─────────────────────────────────────────────────────────
  addComponent: (type) => {
    const { schema, selectedId } = get()

    if (ATOMIC_TYPES.has(type)) {
      const child = { id: uuidv4(), type, props: deepCopy(ATOMIC_DEFAULTS[type]) }
      const selectedComp = schema.components.find(c => c.id === selectedId)
      if (selectedComp?.type === 'Row') {
        return set(s => ({
          ...(_updateActive(s, sc => ({
            ...sc,
            components: sc.components.map(c =>
              c.id === selectedId
                ? { ...c, children: [...(c.children || []), child] }
                : c
            ),
          }))),
          selectedId: child.id,
        }))
      }
      const row = { id: uuidv4(), type: 'Row', props: { ...deepCopy(ATOMIC_DEFAULTS.Row), columns: 1 }, children: [child] }
      return set(s => ({
        ...(_updateActive(s, sc => ({ ...sc, components: [...sc.components, row] }))),
        selectedId: child.id,
      }))
    }

    if (CONTAINER_TYPES.has(type)) {
      const c = { id: uuidv4(), type, props: deepCopy(ATOMIC_DEFAULTS[type] || {}), children: [] }
      return set(s => ({
        ...(_updateActive(s, sc => ({ ...sc, components: [...sc.components, c] }))),
        selectedId: c.id,
      }))
    }

    const c = { id: uuidv4(), type, props: deepCopy(DEFAULTS[type] || {}) }
    set(s => ({
      ...(_updateActive(s, sc => ({ ...sc, components: [...sc.components, c] }))),
      selectedId: c.id,
    }))
  },

  addChildToRow: (rowId, childType) => {
    if (!ATOMIC_TYPES.has(childType)) return
    const child = { id: uuidv4(), type: childType, props: deepCopy(ATOMIC_DEFAULTS[childType]) }
    set(s => ({
      ...(_updateActive(s, sc => ({
        ...sc,
        components: sc.components.map(c =>
          c.id === rowId ? { ...c, children: [...(c.children || []), child] } : c
        ),
      }))),
      selectedId: child.id,
    }))
  },

  removeComponent: (id) => set(s => {
    const filtered = s.schema.components.filter(c => c.id !== id)
    if (filtered.length < s.schema.components.length) {
      return {
        ...(_updateActive(s, sc => ({ ...sc, components: filtered }))),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }
    }
    return {
      ...(_updateActive(s, sc => ({
        ...sc,
        components: sc.components.map(c =>
          c.children ? { ...c, children: c.children.filter(ch => ch.id !== id) } : c
        ),
      }))),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }
  }),

  selectComponent: (id) => set({ selectedId: id }),
  deselectAll:     ()   => set({ selectedId: null }),

  updateProps: (id, updates) => set(s => _updateActive(s, sc => ({
    ...sc,
    components: sc.components.map(comp => {
      if (comp.id === id) return { ...comp, props: { ...comp.props, ...updates } }
      if (comp.children) {
        return {
          ...comp,
          children: comp.children.map(ch =>
            ch.id === id ? { ...ch, props: { ...ch.props, ...updates } } : ch
          ),
        }
      }
      return comp
    }),
  }))),

  moveUp: (id) => set(s => {
    const ch = [...s.schema.components]
    const i = ch.findIndex(c => c.id === id)
    if (i <= 0) return {}
    ;[ch[i - 1], ch[i]] = [ch[i], ch[i - 1]]
    return _updateActive(s, sc => ({ ...sc, components: ch }))
  }),

  moveDown: (id) => set(s => {
    const ch = [...s.schema.components]
    const i = ch.findIndex(c => c.id === id)
    if (i >= ch.length - 1) return {}
    ;[ch[i], ch[i + 1]] = [ch[i + 1], ch[i]]
    return _updateActive(s, sc => ({ ...sc, components: ch }))
  }),

  clearCanvas: () => set(s => ({
    ...(_updateActive(s, sc => ({ ...sc, components: [] }))),
    selectedId: null,
  })),

  togglePreview: () => set(s => ({ previewMode: !s.previewMode, selectedId: null })),
  setShowExport: (v) => set({ showExport: v }),

  setSchema: (newSchema) => set(s => ({
    ...(_updateActive(s, () => newSchema)),
    selectedId: null,
  })),

  showPWA:        false,
  setShowPWA:     (v) => set({ showPWA: v }),
  showPublish:    false,
  setShowPublish: (v) => set({ showPublish: v }),

  viewport: 'desktop',
  setViewport: (v) => set({ viewport: v }),

  restyle: () => {
    const currentPrimary = get().schema.theme.primaryColor
    const pool = PALETTES.filter(p => p.primaryColor !== currentPrimary)
    const { name, emoji, tag, ...themeProps } = (pool.length > 0 ? pool : PALETTES)[
      Math.floor(Math.random() * (pool.length > 0 ? pool.length : PALETTES.length))
    ]
    set(s => _updateActive(s, sc => ({ ...sc, theme: { ...sc.theme, ...themeProps } })))
    return { name, emoji, tag }
  },

  getSelected: () => {
    const { schema, selectedId } = get()
    if (!selectedId) return null
    const { item } = findById(schema.components, selectedId)
    return item
  },

  getParentId: (childId) => {
    const { schema } = get()
    const { parent } = findById(schema.components, childId)
    return parent?.id ?? null
  },

  // ── Generation Blueprint & Onboarding State Machine ───────────────────────
  genPhase:      'idle',           // 'idle' | 'running' | 'done'
  genTaskIdx:    -1,               // -1=idle, 0-4=active task, 5=all done
  onboardingStep: 'idle',          // 'idle' | 'running_tasks' | 'signup_gate' | 'delivered'
  freeGenCount:  loadGenCount(),   // persisted across sessions
  showProGate:   false,

  openProGate:  () => set({ showProGate: true }),
  resetProGate: () => set({ showProGate: false }),

  // Upgrade: called when Stripe redirects back with ?plan=pro
  activatePro: () => {
    const { user, updateUser } = useAuthStore.getState()
    if (user) updateUser({ plan: 'Pro' })
    set({ showProGate: false })
  },

  startGeneration: () => {
    const { freeGenCount } = get()
    const { user } = useAuthStore.getState()
    const isPro = user?.plan === 'Pro'
    const isLoggedIn = !!user

    if (isLoggedIn && !isPro && freeGenCount >= 3) {
      set({ showProGate: true })
      return
    }

    // Increment and persist count
    const newCount = freeGenCount + 1
    saveGenCount(newCount)
    set({ freeGenCount: newCount })

    set({ genPhase: 'running', genTaskIdx: 0, onboardingStep: 'running_tasks' })
    const DURATIONS = [800, 1100, 1000, 900, 1000]
    let idx = 0
    function advance() {
      idx++
      if (idx === 2) {
        // Tasks 0 & 1 done — pause and show signup gate
        set({ genTaskIdx: 2, onboardingStep: 'signup_gate' })
        return
      }
      if (idx < DURATIONS.length) {
        set({ genTaskIdx: idx })
        setTimeout(advance, DURATIONS[idx])
      } else {
        set({ genPhase: 'done', genTaskIdx: DURATIONS.length, onboardingStep: 'delivered' })
      }
    }
    setTimeout(advance, DURATIONS[0])
  },

  // Called after the user completes signup — resumes tasks 3, 4, 5
  resumeAfterSignup: () => {
    set({ onboardingStep: 'running_tasks' })
    const RESUME = [1000, 900, 1000]   // durations for task idx 2→3, 3→4, 4→done
    let local = 0
    function advance() {
      local++
      const newIdx = 2 + local
      if (newIdx <= 4) {
        set({ genTaskIdx: newIdx })
        setTimeout(advance, RESUME[local])
      } else {
        set({ genPhase: 'done', genTaskIdx: 5, onboardingStep: 'delivered' })
      }
    }
    setTimeout(advance, RESUME[0])
  },

  resetGeneration: () => set({ genPhase: 'idle', genTaskIdx: -1, onboardingStep: 'idle' }),

  // ── Time Machine: create a named snapshot immediately ─────────────────────
  // type: 'auto' | 'manual' | 'publish'
  commitSnapshot: (label, type = 'manual') => {
    const state = get()
    try {
      const raw  = localStorage.getItem(VERSIONS_KEY)
      const hist = raw ? JSON.parse(raw) : []
      const last = hist[hist.length - 1]

      const compCount  = state.schema?.components?.length ?? 0
      const pageCount  = state.pages.length
      const lastCount  = last?.componentCount ?? compCount
      const lastPages  = last?.pageCount      ?? pageCount

      const autoLabel = (() => {
        if (type === 'publish') return '🚀 Published to ZaraForge Cloud'
        if (pageCount > lastPages)           return `Added page`
        if (pageCount < lastPages)           return `Removed page`
        const delta = compCount - lastCount
        if (delta > 0)  return `Added ${delta} block${delta > 1 ? 's' : ''}`
        if (delta < 0)  return `Removed ${Math.abs(delta)} block${Math.abs(delta) > 1 ? 's' : ''}`
        return 'Edited design'
      })()

      hist.push({
        id:             Date.now(),
        ts:             new Date().toISOString(),
        label:          label ?? autoLabel,
        type,
        pageCount,
        componentCount: compCount,
        activePage:     state.pages.find(p => p.id === state.activePageId)?.name ?? 'Home',
        pages:          deepCopy(state.pages),
        activePageId:   state.activePageId,
      })
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(hist.slice(-50)))
    } catch {}
  },
}))

// ─── Auto-save & Version History (debounced) ──────────────────────────────────
let _saveTimer    = null
let _versionTimer = null

useBuilderStore.subscribe(state => {
  // Workspace save — 1.2s debounce
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
        pages:        state.pages,
        activePageId: state.activePageId,
        appMode:      state.appMode,
      }))
    } catch {}
  }, 1200)

  // Version snapshot — 12s debounce (creates at most one entry per editing burst)
  clearTimeout(_versionTimer)
  _versionTimer = setTimeout(() => {
    useBuilderStore.getState().commitSnapshot(undefined, 'auto')
  }, 12_000)
})
