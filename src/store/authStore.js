import { create } from 'zustand'

const STORAGE_KEY = 'zf-auth-user'

function loadSavedUser() {
  try {
    // Admin sessions persist in localStorage across browser restarts
    const lsRaw = localStorage.getItem(STORAGE_KEY)
    if (lsRaw) return JSON.parse(lsRaw)
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Module-level timer so it never pollutes Zustand state ─────────────────────
let _syncTimer = null

// ── Mock cloud project library ────────────────────────────────────────────────
const now = Date.now()
const h = (n) => new Date(now - n * 3_600_000).toISOString()
const d = (n) => new Date(now - n * 86_400_000).toISOString()

export const MOCK_PROJECTS = [
  {
    id:         'proj-nexus',
    name:       'Nexus SaaS Dashboard',
    type:       'builder',
    prompt:     'SaaS startup homepage for Nexus with pricing',
    accent:     '#6366f1',
    pages:      1,
    components: 7,
    lastModified: h(2),
  },
  {
    id:         'proj-arias',
    name:       "Aria's Kitchen",
    type:       'builder',
    prompt:     "A restaurant booking site for Aria's Kitchen",
    accent:     '#e85d04',
    pages:      2,
    components: 6,
    lastModified: d(1),
  },
  {
    id:         'proj-zara-tour',
    name:       'Zara World Tour',
    type:       'studio',
    prompt:     null,
    accent:     '#9b5de5',
    tracks:     4,
    lastModified: d(3),
  },
  {
    id:         'proj-vitality',
    name:       'Vitality Wellness',
    type:       'builder',
    prompt:     'Health wellness clinic Vitality with appointment booking',
    accent:     '#10b981',
    pages:      1,
    components: 6,
    lastModified: d(5),
  },
  {
    id:         'proj-nexus-logo',
    name:       'Nexus Brand Identity',
    type:       'logo',
    prompt:     null,
    accent:     '#f472b6',
    lastModified: d(7),
  },
  {
    id:         'proj-apex',
    name:       'Apex Fashion Store',
    type:       'builder',
    prompt:     'Fashion ecommerce store for Apex',
    accent:     '#ec4899',
    pages:      3,
    components: 5,
    lastModified: d(10),
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user:        loadSavedUser(),
  isLoggedIn:  !!loadSavedUser(),

  // ── Auth modal UI state ───────────────────────────────────────────────────
  showAuthModal: false,
  authTab:       'login',   // 'login' | 'signup'

  // ── Cloud sync indicator ──────────────────────────────────────────────────
  cloudSync: 'saved',       // 'syncing' | 'saved'

  // ── Projects drawer ───────────────────────────────────────────────────────
  showProjectsDrawer: false,
  projects:           [...MOCK_PROJECTS],

  // ── Session restore flag (drives the overlay in App.jsx) ─────────────────
  sessionRestoring: false,

  // ── Actions ───────────────────────────────────────────────────────────────
  setShowAuthModal: (v, tab) =>
    set({ showAuthModal: v, ...(tab ? { authTab: tab } : {}) }),

  setAuthTab: (t) => set({ authTab: t }),

  setShowProjectsDrawer: (v) => set({ showProjectsDrawer: v }),

  login: (userData) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    // Admin sessions persist across browser restarts
    if (userData.isAdmin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    }
    set({
      user: userData,
      isLoggedIn: true,
      showAuthModal: false,
      cloudSync: 'saved',
      sessionRestoring: true,
    })
    setTimeout(() => set({ sessionRestoring: false }), 2400)
  },

  updateUser: (updates) => {
    const current = useAuthStore.getState().user
    const updated = { ...current, ...updates }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (updated.isAdmin) localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    set({ user: updated })
  },

  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
    clearTimeout(_syncTimer)
    set({ user: null, isLoggedIn: false, showProjectsDrawer: false, cloudSync: 'saved' })
  },

  triggerSync: () => {
    clearTimeout(_syncTimer)
    set({ cloudSync: 'syncing' })
    _syncTimer = setTimeout(() => set({ cloudSync: 'saved' }), 2000)
  },

  deleteProject: (id) =>
    set(s => ({ projects: s.projects.filter(p => p.id !== id) })),

  renameProject: (id, name) =>
    set(s => ({
      projects: s.projects.map(p => p.id === id ? { ...p, name } : p),
    })),
}))
