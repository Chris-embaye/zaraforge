'use strict'

// ── Server-Side Heartbeat Endpoint ───────────────────────────────────────────
// POST /api/v1/heartbeat
//
// Called every 60 s by the desktop client (via main process IPC) or web client.
// Validates:
//   1. HMAC signature (desktop) — confirms request came from our binary
//   2. Session cookie / JWT    — confirms user is authenticated
//   3. Subscription status     — fetches live plan from Stripe / DB
//
// Returns a short-lived signed JWT with granted feature keys.
// Premium UI ONLY activates from this real-time server response.
//
// Mount in Express app:
//   const heartbeatRouter = require('./heartbeat')
//   app.use('/api/v1', heartbeatRouter)

const express  = require('express')
const crypto   = require('crypto')
const jwt      = require('jsonwebtoken')
const router   = express.Router()

// ── Env vars (set in .env / deployment secrets) ───────────────────────────────
const HMAC_SECRET = process.env.HEARTBEAT_HMAC_SECRET  // shared with Electron binary
const JWT_SECRET  = process.env.HEARTBEAT_JWT_SECRET   // server signs response JWT
const JWT_EXPIRY  = 300  // 5-minute grant validity

// ── Feature map: plan → granted feature keys ──────────────────────────────────
const PLAN_FEATURES = {
  free:       ['cloudSync'],
  pro:        ['cloudSync', 'aiMorph', 'vectorizer', 'brandKit', 'beatSync'],
  enterprise: ['cloudSync', 'aiMorph', 'vectorizer', 'brandKit', 'beatSync',
               'videoExport', 'multiCam', 'admin'],
}

// ── Rate limit: max 6 heartbeat pings per 5-minute window per user ────────────
const _hbWindows = new Map()
function heartbeatRateCheck(userId) {
  const now    = Date.now()
  const window = 5 * 60_000
  const limit  = 6
  const hits   = (_hbWindows.get(userId) ?? []).filter(t => now - t < window)
  hits.push(now)
  _hbWindows.set(userId, hits)
  return hits.length <= limit
}

// ── HMAC signature verification (desktop clients only) ────────────────────────
function verifyDesktopHMAC(userId, email, timestamp, hmac) {
  if (!HMAC_SECRET) return true  // skip in dev if secret not set
  const maxAge = 30_000  // reject requests older than 30s
  if (Math.abs(Date.now() - Number(timestamp)) > maxAge) return false
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${userId}:${email}:${timestamp}`)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'))
}

// ── Subscription lookup (replace with your Stripe / DB query) ─────────────────
async function fetchSubscriptionPlan(userId, email) {
  // ── PRODUCTION: query your database ───────────────────────────────────────
  // const user = await db.users.findUnique({ where: { email } })
  // if (!user) return null
  // const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
  // if (sub.status !== 'active') return 'free'
  // return sub.metadata.plan  // 'pro' | 'enterprise'

  // ── DEVELOPMENT stub ─────────────────────────────────────────────────────
  if (email === process.env.OWNER_EMAIL) return 'enterprise'
  const DEV_PLANS = {
    'pro@test.com':        'pro',
    'enterprise@test.com': 'enterprise',
  }
  return DEV_PLANS[email] ?? 'free'
}

// ── POST /api/v1/heartbeat ────────────────────────────────────────────────────
router.post('/heartbeat', async (req, res) => {
  const { userId, email, sessionToken, timestamp, hmac } = req.body

  if (!userId || !email) {
    return res.status(400).json({ ok: false, error: 'Missing userId or email' })
  }

  // Rate limit
  if (!heartbeatRateCheck(userId)) {
    return res.status(429).json({ ok: false, error: 'Heartbeat rate limit exceeded' })
  }

  // HMAC check for desktop clients (hmac field present = desktop)
  if (hmac) {
    if (!verifyDesktopHMAC(userId, email, timestamp, hmac)) {
      console.warn(`[Heartbeat] HMAC validation failed — userId=${userId} ip=${req.ip}`)
      return res.status(401).json({ ok: false, error: 'Invalid request signature' })
    }
  } else {
    // Web client: validate session cookie via requireAuth middleware
    // (assumes requireAuth already ran and set req.user)
    if (!req.user || req.user.email !== email) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' })
    }
  }

  // Fetch live subscription from DB / Stripe
  const plan = await fetchSubscriptionPlan(userId, email)
  if (!plan) {
    return res.status(403).json({ ok: false, error: 'Account not found' })
  }

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free

  // Issue a short-lived signed grant JWT
  const grantPayload = {
    userId,
    email,
    plan,
    features,
    iat: Math.floor(Date.now() / 1000),
  }

  const token = jwt.sign(grantPayload, JWT_SECRET || 'dev-jwt-secret', {
    expiresIn:  JWT_EXPIRY,
    algorithm: 'HS256',
  })

  // Append to security_audit_logs
  // await db.securityAuditLogs.create({ data: { action: 'heartbeat.grant', actor: email, details: { plan } } })

  return res.json({ ok: true, token })
})

module.exports = router
