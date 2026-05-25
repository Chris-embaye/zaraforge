import { create } from 'zustand'
import { compileProject } from '../lib/compiler'
import { useBuilderStore } from './builderStore'

function uid() { return Math.random().toString(36).slice(2, 9) }

const MOCK_DEVICES = [
  { name: 'iPhone 15 Pro', os: 'iOS 17.4', latency: 18 },
  { name: 'Samsung Galaxy S24', os: 'Android 14', latency: 24 },
  { name: 'iPhone 14', os: 'iOS 16.7', latency: 31 },
  { name: 'Pixel 8 Pro', os: 'Android 14', latency: 22 },
  { name: 'iPad Pro M2', os: 'iPadOS 17', latency: 15 },
]

const SIMULATED_EVENTS = [
  { type: 'tap',    message: 'Button tapped: "Get Started"' },
  { type: 'form',   message: 'Form submitted successfully' },
  { type: 'scroll', message: 'Scrolled to Pricing section' },
  { type: 'tap',    message: 'CTA button clicked' },
  { type: 'form',   message: 'Contact form: new entry received' },
  { type: 'tap',    message: 'Nav link tapped: "Features"' },
  { type: 'scroll', message: 'Reached bottom of page' },
  { type: 'tap',    message: 'Pricing tier selected: Pro' },
  { type: 'form',   message: 'Email signup: new subscriber' },
  { type: 'tap',    message: 'Hero CTA pressed' },
]

let simTimeout   = null
let syncInterval = null
let ablyClient   = null
let ablyChannel  = null

// Returns a promise that resolves once the Ably channel is ready
function getAblyChannel(sessionId) {
  if (ablyChannel) return Promise.resolve(ablyChannel)
  const key = import.meta.env.VITE_ABLY_KEY
  if (!key) return Promise.resolve(null)

  return import('ably').then(({ Realtime }) => {
    if (!ablyClient) {
      ablyClient = new Realtime({ key, clientId: `builder-${uid()}` })
    }
    ablyChannel = ablyClient.channels.get(`zf-preview-${sessionId}`)
    return ablyChannel
  })
}

function buildPreviewHtml() {
  try {
    const { pages } = useBuilderStore.getState()
    const hasComponents = pages?.some(p => p.schema?.components?.length > 0)
    if (!hasComponents) {
      // Send a placeholder so the phone shows something
      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0}body{background:#09090b;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
.icon{font-size:48px;margin-bottom:16px}.title{font-size:22px;font-weight:900;letter-spacing:-0.03em;margin-bottom:10px}.sub{font-size:14px;color:rgba(255,255,255,.4);line-height:1.6}
</style></head><body><div class="icon">⚡</div><div class="title">ZaraForge Builder</div>
<div class="sub">Add components to your canvas<br>and they'll appear here live.</div></body></html>`
    }
    return compileProject(pages)
  } catch (_) {
    return null
  }
}

export const useDeviceStore = create((set, get) => ({
  showPanel:   false,
  connected:   false,
  connecting:  false,
  deviceName:  '',
  deviceOS:    '',
  latencyMs:   0,
  sessionId:   uid(),
  events:      [],
  unreadCount: 0,

  setShowPanel: (v) => set({ showPanel: v }),

  connectDevice: () => {
    set({ connecting: true })
    const sessionId = get().sessionId

    // Pre-warm the Ably connection immediately
    getAblyChannel(sessionId).then(() => {
      // Channel is ready — if we're already connected, push first canvas now
      if (get().connected) get()._pushCanvas()
    })

    setTimeout(() => {
      const d = MOCK_DEVICES[Math.floor(Math.random() * MOCK_DEVICES.length)]
      set({ connected: true, connecting: false, deviceName: d.name, deviceOS: d.os, latencyMs: d.latency })
      get().pushEvent('connect', `Connected: ${d.name}`)
      get()._startSim()
      get()._startSync()
    }, 2200)
  },

  disconnectDevice: () => {
    if (simTimeout)   { clearTimeout(simTimeout);    simTimeout   = null }
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
    if (ablyChannel)  { ablyChannel = null }
    if (ablyClient)   { ablyClient.close(); ablyClient = null }
    set({ connected: false, connecting: false, deviceName: '', deviceOS: '', latencyMs: 0 })
  },

  pushEvent: (type, message) => {
    const ev = { id: uid(), type, message, ts: Date.now() }
    set(s => ({
      events:      [ev, ...s.events].slice(0, 30),
      unreadCount: s.unreadCount + 1,
    }))
  },

  clearUnread: () => set({ unreadCount: 0 }),
  clearEvents: () => set({ events: [], unreadCount: 0 }),

  _pushCanvas: () => {
    const sessionId = get().sessionId
    getAblyChannel(sessionId).then(ch => {
      if (!ch) return
      const html = buildPreviewHtml()
      if (html) ch.publish('canvas', { html }).catch(() => {})
    })
  },

  _startSync: () => {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
    // Push immediately then every 4s
    get()._pushCanvas()
    syncInterval = setInterval(() => {
      if (!get().connected) return
      get()._pushCanvas()
    }, 4000)
  },

  _startSim: () => {
    if (simTimeout) { clearTimeout(simTimeout); simTimeout = null }
    function schedule() {
      simTimeout = setTimeout(() => {
        if (!get().connected) return
        const ev = SIMULATED_EVENTS[Math.floor(Math.random() * SIMULATED_EVENTS.length)]
        get().pushEvent(ev.type, ev.message)
        schedule()
      }, 3500 + Math.random() * 8000)
    }
    schedule()
  },
}))
