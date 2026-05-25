import { useEffect, useRef } from 'react'
import { useHeartbeatStore, FEATURES } from '../lib/security/heartbeat'
import { useAuthStore } from '../store/authStore'

// ── useHeartbeat ──────────────────────────────────────────────────────────────
// Starts / stops the subscription heartbeat tied to the auth session.
// Drop this in App.jsx (alongside useZaraForgeSession).
//
// Usage:
//   function App() {
//     useHeartbeat()
//     ...
//   }
//
// Gate a premium feature:
//   const { hasFeature } = useHeartbeatStore()
//   if (!hasFeature(FEATURES.AI_MORPH)) return <UpgradeBanner />

export function useHeartbeat() {
  const { user, isLoggedIn } = useAuthStore()
  const { startPolling, stopPolling, devBypass } = useHeartbeatStore()
  const startedRef = useRef(false)

  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_HEARTBEAT === 'bypass') {
      devBypass()
      return
    }

    if (isLoggedIn && user) {
      startPolling(user)
      startedRef.current = true
    } else if (startedRef.current) {
      stopPolling()
      startedRef.current = false
    }

    return () => {
      if (startedRef.current) stopPolling()
    }
  }, [isLoggedIn, user?.email])
}

// ── useFeatureGate ────────────────────────────────────────────────────────────
// Returns { granted, status, plan } for a specific feature key.
// Renders nothing / shows upgrade prompt if not granted.
//
// Usage:
//   function AIGenButton() {
//     const { granted } = useFeatureGate(FEATURES.AI_MORPH)
//     if (!granted) return <UpgradeBanner feature="AI Genre Morph" />
//     return <GenreMorphModal />
//   }

export function useFeatureGate(featureKey) {
  const { hasFeature, status, plan, features } = useHeartbeatStore()
  return {
    granted: hasFeature(featureKey),
    status,
    plan,
    features,
    locked: status === 'locked',
    checking: status === 'checking',
  }
}

export { FEATURES }
