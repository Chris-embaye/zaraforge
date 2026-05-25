'use strict'

// ── Preload Script ────────────────────────────────────────────────────────────
// This file is compiled to preload.jsc in production builds.
// It exposes a MINIMAL, typed IPC surface to the renderer via contextBridge.
// NO Node.js globals are leaked. NO arbitrary IPC channels are exposed.

const { contextBridge, ipcRenderer } = require('electron')

// ── Allowed IPC channels whitelist ───────────────────────────────────────────
const INVOKE_CHANNELS = new Set([
  'heartbeat:ping',
  'app:info',
  'prefs:get',
  'prefs:set',
])

function safeInvoke(channel, ...args) {
  if (!INVOKE_CHANNELS.has(channel)) {
    throw new Error(`[ZF Preload] Blocked IPC channel: "${channel}"`)
  }
  return ipcRenderer.invoke(channel, ...args)
}

// ── Expose to renderer (window.zaraforge) ────────────────────────────────────
contextBridge.exposeInMainWorld('zaraforge', {

  // Heartbeat — renderer calls this; main process signs + validates with server
  heartbeat: {
    ping: (payload) => safeInvoke('heartbeat:ping', payload),
  },

  // App metadata
  app: {
    info:   ()  => safeInvoke('app:info'),
    isDesktop: true,
  },

  // Platform detection (read-only, safe subset)
  platform: {
    os:     process.platform,   // 'darwin' | 'win32' | 'linux'
    arch:   process.arch,       // 'arm64'  | 'x64'
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  },

  // Persistent user preferences via electron-store (first-boot wizard + settings)
  // All reads/writes go through IPC — the renderer never touches the file directly.
  prefs: {
    get: (key)        => safeInvoke('prefs:get', key),
    set: (key, value) => safeInvoke('prefs:set', key, value),
  },
})

// ── Block prototype pollution on the bridge ───────────────────────────────────
Object.freeze(window.zaraforge ?? {})
