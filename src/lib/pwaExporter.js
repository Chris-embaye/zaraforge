import { generateHTML } from './codeGenerator'

// ─── Icon generation ───────────────────────────────────────────────────────────
export function generateIcon(size, primaryColor = '#6366f1', letter = 'A') {
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Background rounded rect
  const r = size * 0.2
  ctx.fillStyle = primaryColor
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Subtle inner glow
  const grad = ctx.createRadialGradient(size * 0.35, size * 0.3, 0, size / 2, size / 2, size * 0.7)
  grad.addColorStop(0, 'rgba(255,255,255,0.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fill()

  // Letter
  const fontSize = Math.round(size * 0.52)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter.toUpperCase(), size / 2, size / 2 + size * 0.03)

  return canvas.toDataURL('image/png')
}

export function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = atob(b64)
  const arr   = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// ─── PWA bundle generation ─────────────────────────────────────────────────────
export function generatePWABundle(schema, appName = 'My App') {
  const theme       = schema.theme || {}
  const primary     = theme.primaryColor || '#6366f1'
  const safeName    = appName.trim() || 'My App'
  const slug        = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const firstLetter = safeName.charAt(0)

  // ── icons ──
  const icon192DataUrl = generateIcon(192, primary, firstLetter)
  const icon512DataUrl = generateIcon(512, primary, firstLetter)

  // ── manifest.json ──
  const manifest = JSON.stringify({
    name:             safeName,
    short_name:       safeName.slice(0, 12),
    description:      `${safeName} — built with NoCode Builder`,
    start_url:        './',
    display:          'standalone',
    orientation:      'portrait-primary',
    background_color: theme.pageBg    || '#ffffff',
    theme_color:      primary,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, null, 2)

  // ── service worker ──
  const sw = `// ${safeName} Service Worker — cache-first strategy
const CACHE = '${slug}-v1'
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png']

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
)

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
)

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (!res || res.status !== 200 || res.type === 'opaque') return res
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, clone))
      return res
    }))
  )
})
`

  // ── HTML with PWA meta tags ──
  const baseHtml = generateHTML(schema)
  const pwaHead  = `
  <!-- PWA Meta Tags -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="${primary}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${safeName}">
  <link rel="apple-touch-icon" href="icon-192.png">
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
    }
  <\/script>`

  const html = baseHtml.replace('</head>', `${pwaHead}\n</head>`)

  return {
    appName:       safeName,
    primaryColor:  primary,
    icon192DataUrl,
    icon512DataUrl,
    files: {
      'index.html':   { content: html,     mimeType: 'text/html' },
      'manifest.json':{ content: manifest, mimeType: 'application/json' },
      'sw.js':        { content: sw,       mimeType: 'application/javascript' },
      'icon-192.png': { dataUrl: icon192DataUrl, mimeType: 'image/png' },
      'icon-512.png': { dataUrl: icon512DataUrl, mimeType: 'image/png' },
    },
  }
}

export function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType })
    : content
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
