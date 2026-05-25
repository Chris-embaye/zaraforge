// ZaraForge Offline Engine v1.0
// Aggressive cache-first strategy: all assets + locale JSON → instant offline UI

const CACHE_NAME    = 'zaraforge-v1'
const LOCALE_CACHE  = 'zaraforge-locales-v1'
const FONT_CACHE    = 'zaraforge-fonts-v1'

// Static shell assets — cached on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/zaraforge-logo.png',
  '/manifest.json',
]

// Locale JSON packs — cached separately so they can be updated independently
const LOCALE_ASSETS = [
  '/locales/en.json',
  '/locales/tg.json',
  '/locales/es.json',
  '/locales/pt.json',
  '/locales/fr.json',
  '/locales/hi.json',
  '/locales/ar.json',
  '/locales/zh.json',
  '/locales/de.json',
  '/locales/ja.json',
  '/locales/am.json',
]

// Google Fonts for Tigrinya Ge'ez script (Noto Sans Ethiopic)
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]

// ── Install: pre-cache shell + locales ────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache =>
        cache.addAll(SHELL_ASSETS).catch(() => {})
      ),
      caches.open(LOCALE_CACHE).then(cache =>
        cache.addAll(LOCALE_ASSETS).catch(() => {})
      ),
    ])
  )
})

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  const valid = new Set([CACHE_NAME, LOCALE_CACHE, FONT_CACHE])
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !valid.has(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: tiered strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Locale JSON — cache-first, update in background
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(staleWhileRevalidate(request, LOCALE_CACHE))
    return
  }

  // Google Fonts — cache-first, long TTL
  if (FONT_ORIGINS.some(o => url.origin === o || request.url.startsWith(o))) {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  // Non-GET: skip service worker entirely
  if (request.method !== 'GET') return

  // Same-origin assets: cache-first with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      cacheFirst(request, CACHE_NAME).catch(() =>
        caches.match('/index.html')        // SPA fallback
      )
    )
    return
  }

  // Cross-origin API calls: network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})

// ── Helpers ───────────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const fresh = await fetch(request)
  if (fresh.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, fresh.clone())
  }
  return fresh
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone())
    return res
  }).catch(() => null)
  return cached ?? fetchPromise
}

// ── Offline broadcast: notify clients when going offline ─────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', online: true })
  }
})
