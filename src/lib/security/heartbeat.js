import { create } from 'zustand'

// ── Server Heartbeat Subscription Store ──────────────────────────────────────
// Replaces client-side boolean checks (user.isPro === true).
// Premium features ONLY activate when the server returns a valid signed grant.
//
// Flow:
//   1. App starts → ping() called immediately
//   2. Server validates session + subscription → returns signed JWT
//   3. JWT decoded → features[] stored here
//   4. UI gates check hasFeature('aiMorph') — if no valid grant → locked
//   5. Loop repeats every 60 s
//   6. 3 consecutive failures → status = 'locked' → premium UI disabled

const POLL_INTERVAL  = 60_000   // 60 seconds
const MAX_FAILURES   = 3
const GRANT_GRACE_MS = 90_000   // accept grants up to 90s old (network latency)

// Feature keys must match server JWT payload exactly
export const FEATURES = {
  AI_MORPH:       'aiMorph',
  VECTORIZER:     'vectorizer',
  VIDEO_EXPORT:   'videoExport',
  MULTI_CAM:      'multiCam',
  BEAT_SYNC:      'beatSync',
  CLOUD_SYNC:     'cloudSync',
  BRAND_KIT:      'brandKit',
  ADMIN:          'admin',
}

let _pollTimer = null

export const useHeartbeatStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  status:    'idle',       // 'idle' | 'checking' | 'active' | 'failed' | 'locked'
  plan:      null,         // 'free' | 'pro' | 'enterprise' | null
  features:  [],           // string[] from server JWT
  expiresAt: null,         // ms epoch — when the current grant expires
  failCount: 0,
  lastPing:  null,         // ms epoch
  lastError: null,

  // ── Core: check if a feature is currently granted ─────────────────────────
  hasFeature: (key) => {
    const { status, features, expiresAt } = get()
    if (status === 'locked' || status === 'failed') return false
    if (expiresAt && Date.now() > expiresAt + GRANT_GRACE_MS) return false
    return features.includes(key)
  },

  isPro:        () => ['pro', 'enterprise'].includes(get().plan),
  isEnterprise: () => get().plan === 'enterprise',

  // ── Ping the server heartbeat endpoint ────────────────────────────────────
  ping: async (user) => {
    if (!user?.email) return  // not signed in

    set({ status: 'checking' })

    try {
      let result

      if (typeof window !== 'undefined' && window.zaraforge?.heartbeat) {
        // ── Electron desktop: route through main process IPC ─────────────────
        // Main process signs the request with HMAC + validates the response JWT
        result = await window.zaraforge.heartbeat.ping({
          userId:       user.id ?? user.email,
          email:        user.email,
          sessionToken: sessionStorage.getItem('zf-admin-session') ?? 'none',
        })
      } else {
        // ── Web browser: direct fetch (dev / web app mode) ────────────────────
        const resp = await fetch('/api/v1/heartbeat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            userId: user.id ?? user.email,
            email:  user.email,
          }),
          credentials: 'include',   // sends HttpOnly session cookie
        })
        result = await resp.json()
      }

      if (!result?.ok) throw new Error(result?.error ?? 'Server rejected heartbeat')

      set({
        status:    'active',
        plan:      result.plan ?? 'free',
        features:  result.features ?? [],
        expiresAt: result.expiresAt ?? (Date.now() + 300_000),
        failCount: 0,
        lastPing:  Date.now(),
        lastError: null,
      })

    } catch (err) {
      const { failCount } = get()
      const newFailCount = failCount + 1
      const locked = newFailCount >= MAX_FAILURES

      set({
        status:    locked ? 'locked' : 'failed',
        failCount: newFailCount,
        lastError: err.message,
        lastPing:  Date.now(),
        // Keep previous features during transient failures — lock on 3rd fail
        features:  locked ? [] : get().features,
        plan:      locked ? null : get().plan,
      })

      if (locked) {
        console.error('[Heartbeat] 3 consecutive failures — premium features locked')
      }
    }
  },

  // ── Start background polling ───────────────────────────────────────────────
  startPolling: (user) => {
    get().ping(user)  // immediate first ping
    if (_pollTimer) clearInterval(_pollTimer)
    _pollTimer = setInterval(() => get().ping(user), POLL_INTERVAL)
  },

  stopPolling: () => {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
    set({ status: 'idle', plan: null, features: [] })
  },

  // ── Dev-mode bypass (only active when VITE_DEV_HEARTBEAT=bypass) ───────────
  devBypass: () => {
    if (import.meta.env.VITE_DEV_HEARTBEAT !== 'bypass') return
    set({
      status:    'active',
      plan:      'enterprise',
      features:  Object.values(FEATURES),
      expiresAt: Date.now() + 86_400_000,
      failCount: 0,
    })
  },
}))
