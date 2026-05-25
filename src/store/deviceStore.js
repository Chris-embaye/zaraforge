import { create } from 'zustand'

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

let simTimeout = null

export const useDeviceStore = create((set, get) => ({
  showPanel:  false,
  connected:  false,
  connecting: false,
  deviceName: '',
  deviceOS:   '',
  latencyMs:  0,
  sessionId:  uid(),
  events:     [],
  unreadCount: 0,

  setShowPanel: (v) => set({ showPanel: v }),

  connectDevice: () => {
    set({ connecting: true })
    setTimeout(() => {
      const d = MOCK_DEVICES[Math.floor(Math.random() * MOCK_DEVICES.length)]
      set({ connected: true, connecting: false, deviceName: d.name, deviceOS: d.os, latencyMs: d.latency })
      get().pushEvent('connect', `Connected: ${d.name}`)
      get()._startSim()
    }, 2200)
  },

  disconnectDevice: () => {
    if (simTimeout) { clearTimeout(simTimeout); simTimeout = null }
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
