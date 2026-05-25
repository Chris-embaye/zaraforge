import { useState, useEffect } from 'react'

// ── useFirstBoot ──────────────────────────────────────────────────────────────
// Detects whether the app is running for the first time after installation.
//
// Storage priority:
//   1. electron-store via IPC  (desktop: persistent across app restarts)
//   2. localStorage            (web fallback: clears on profile wipe)
//
// Returns:
//   { needsSetup, prefs, markComplete }
//
// The renderer never calls electron-store directly — it goes through
// window.zaraforge.prefs (contextBridge IPC, see preload.js + main.js).

const LS_KEY_DONE  = 'zf-first-boot-complete'
const LS_KEY_LANG  = 'zf-lang'
const LS_KEY_ACCEL = 'zf-hw-accel'

function isDesktopApp() {
  return typeof window !== 'undefined' && !!window.zaraforge?.prefs
}

async function readComplete() {
  if (isDesktopApp()) {
    try { return !!(await window.zaraforge.prefs.get('firstBootComplete')) }
    catch { return false }
  }
  return localStorage.getItem(LS_KEY_DONE) === 'true'
}

async function readPrefs() {
  if (isDesktopApp()) {
    try {
      const lang    = await window.zaraforge.prefs.get('lang')    ?? 'en'
      const hwAccel = await window.zaraforge.prefs.get('hwAccel') ?? true
      return { lang, hwAccel }
    } catch { return { lang: 'en', hwAccel: true } }
  }
  return {
    lang:    localStorage.getItem(LS_KEY_LANG)  ?? 'en',
    hwAccel: localStorage.getItem(LS_KEY_ACCEL) !== 'false',
  }
}

export function useFirstBoot() {
  // Only intercept in Electron context — web users skip straight to the app.
  // This prevents the setup wizard from appearing on zaraforge.app.
  const [checking,   setChecking]   = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [prefs,      setPrefs]      = useState({ lang: 'en', hwAccel: true })

  useEffect(() => {
    // Only check for Electron; skip immediately on web
    if (!isDesktopApp()) {
      setChecking(false)
      return
    }

    readComplete().then(done => {
      if (!done) {
        setNeedsSetup(true)
        setChecking(false)
      } else {
        readPrefs().then(p => {
          setPrefs(p)
          setChecking(false)
        })
      }
    })
  }, [])

  function markComplete(savedPrefs) {
    setPrefs(savedPrefs)
    setNeedsSetup(false)
    // Persistence is handled inside FirstBootSetup.savePrefs()
    // so we just update local React state here.
  }

  return { checking, needsSetup, prefs, markComplete }
}

// ── Exported pref reader (use anywhere to get saved preferences) ──────────────
export async function getUserPrefs() {
  return readPrefs()
}
