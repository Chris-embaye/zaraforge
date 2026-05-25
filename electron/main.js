'use strict'

// ── V8 Bytecode: In packaged builds this file is replaced by main.jsc ─────────
// bootstrap.js loads bytenode then requires main.jsc.
// During development this file runs as plain JS.

const { app, BrowserWindow, ipcMain, session, dialog } = require('electron')
const path   = require('path')
const crypto = require('crypto')
const jwt    = require('jsonwebtoken')
const Store  = require('electron-store')

// ── Constants ─────────────────────────────────────────────────────────────────
const IS_PACKAGED   = app.isPackaged
const IS_DEV        = !IS_PACKAGED
const API_BASE      = process.env.ZARAFORGE_API_URL ?? 'https://api.zaraforge.app'
const HB_SECRET     = process.env.HEARTBEAT_HMAC_SECRET ?? ''  // injected at build time
const HB_JWT_SECRET = process.env.HEARTBEAT_JWT_SECRET  ?? ''  // server public key / shared secret
const HB_INTERVAL   = 60_000   // 60-second heartbeat cycle

// ── 1. SINGLE INSTANCE LOCK ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }

// ── 2. ASAR INTEGRITY PRE-CHECK ──────────────────────────────────────────────
// In production, verify our own executable hash matches the build manifest.
// If tampered, terminate immediately before any window opens.
if (IS_PACKAGED) {
  try {
    const manifestPath = path.join(process.resourcesPath, 'integrity-manifest.json')
    const manifest     = JSON.parse(require('fs').readFileSync(manifestPath, 'utf8'))
    const asarPath     = path.join(process.resourcesPath, 'app.asar')
    const asarBuf      = require('fs').readFileSync(asarPath)
    const actualHash   = crypto.createHash('sha256').update(asarBuf).digest('hex')

    if (actualHash !== manifest.asarSha256) {
      dialog.showErrorBox(
        'Integrity Check Failed',
        'Application files have been modified. ZaraForge cannot start.\n\nPlease reinstall from zaraforge.app.'
      )
      app.exit(1)
    }
  } catch (e) {
    // manifest missing = tampered package
    dialog.showErrorBox('Integrity Check Failed', 'Cannot verify application integrity.')
    app.exit(1)
  }
}

// ── 3. DISABLE DEVTOOLS IN PRODUCTION ────────────────────────────────────────
app.on('web-contents-created', (_, contents) => {
  if (IS_PACKAGED) {
    contents.on('devtools-opened', () => contents.closeDevTools())
  }

  // Block navigation to external URLs (prevents open-redirect attacks)
  contents.on('will-navigate', (e, url) => {
    const allowed = IS_DEV
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5183']
      : [`file://${path.join(__dirname, '../dist')}`]
    if (!allowed.some(a => url.startsWith(a))) e.preventDefault()
  })

  // Block new windows entirely
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})

// ── 4. MAIN WINDOW ───────────────────────────────────────────────────────────
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1440,
    height:          900,
    minWidth:        960,
    minHeight:       600,
    titleBarStyle:   'hiddenInset',
    icon:            path.join(__dirname, '../public/zaraforge-logo.png'),
    webPreferences: {
      preload:                    path.join(__dirname, IS_PACKAGED ? 'preload.jsc' : 'preload.js'),
      nodeIntegration:            false,   // never expose Node to renderer
      contextIsolation:           true,    // strict boundary between preload + renderer
      sandbox:                    true,    // OS-level process sandbox
      webSecurity:                true,
      allowRunningInsecureContent: false,
      experimentalFeatures:       false,
      spellcheck:                 false,
    },
  })

  // ── Content Security Policy ──────────────────────────────────────────────
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https:",
            `connect-src 'self' ${API_BASE} https://fonts.googleapis.com`,
            "frame-src 'none'",
            "object-src 'none'",
          ].join('; '),
        ],
        'X-Frame-Options':        ['DENY'],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy':        ['strict-origin-when-cross-origin'],
      },
    })
  })

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5183')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── 5. IPC: HEARTBEAT HANDLER ─────────────────────────────────────────────────
// The renderer sends { userId, email, sessionToken } via preload IPC.
// Main process signs the request with HMAC, sends to server, validates
// the response JWT, and returns the feature-grant payload.

ipcMain.handle('heartbeat:ping', async (_, payload) => {
  try {
    const { userId, email, sessionToken } = payload
    const timestamp = Date.now()

    // HMAC-sign the request body so the server can verify it came from our binary
    const message = `${userId}:${email}:${timestamp}`
    const hmac    = crypto.createHmac('sha256', HB_SECRET || 'dev-secret')
                          .update(message)
                          .digest('hex')

    const response = await fetch(`${API_BASE}/api/v1/heartbeat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, email, sessionToken, timestamp, hmac }),
    })

    if (!response.ok) {
      return { ok: false, status: response.status, features: [] }
    }

    const { token } = await response.json()

    // Verify the server-returned JWT — must be signed with our shared secret
    const decoded = jwt.verify(token, HB_JWT_SECRET || 'dev-jwt-secret', {
      algorithms: ['HS256'],
    })

    return {
      ok:       true,
      plan:     decoded.plan,
      features: decoded.features ?? [],
      expiresAt: decoded.exp * 1000,
    }
  } catch (err) {
    return { ok: false, error: err.message, features: [] }
  }
})

// ── 6. IPC: PERSISTENT USER PREFS (electron-store) ────────────────────────────
// Stores first-boot setup choices (language, hardware acceleration) and any
// future user settings. File lives in the OS user-data directory — never inside
// the app bundle, so it survives app updates.

const userPrefs = new Store({
  name: 'zf-user-prefs',
  defaults: {
    firstBootComplete: false,
    lang:              'en',
    hwAccel:           true,
  },
  // Encrypt the store with a machine-specific key in production
  // encryptionKey: IS_PACKAGED ? crypto.randomBytes(32).toString('hex') : undefined,
})

ipcMain.handle('prefs:get', (_, key)        => userPrefs.get(key))
ipcMain.handle('prefs:set', (_, key, value) => { userPrefs.set(key, value) })

// Apply hardware acceleration preference before any window is created.
// electron-store is synchronous, so this is safe to call during startup.
if (!userPrefs.get('hwAccel')) {
  app.disableHardwareAcceleration()
}

// ── 7. IPC: APP INFO ──────────────────────────────────────────────────────────
ipcMain.handle('app:info', () => ({
  version:  app.getVersion(),
  platform: process.platform,
  arch:     process.arch,
}))

// ── 7. APP LIFECYCLE ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── 8. SECURITY: Block dangerous protocols ────────────────────────────────────
app.on('web-contents-created', (_, wc) => {
  wc.session.setPermissionRequestHandler((_, permission, cb) => {
    const allowed = ['notifications', 'clipboard-sanitized-write']
    cb(allowed.includes(permission))
  })
})
