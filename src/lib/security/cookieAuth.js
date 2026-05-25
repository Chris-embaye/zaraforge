// ── HttpOnly Cookie Authentication Middleware ─────────────────────────────────
// Copy this file to your backend (Express / Next.js API routes).
// NEVER import this file directly into the React frontend bundle.
//
// OWASP A02 — Cryptographic Failures / A07 — Identification & Auth mitigation.
//
// Usage (Express):
//   import { issueSessionCookie, requireAuth, requireAdmin } from './cookieAuth.js'
//
//   app.post('/api/auth/login', async (req, res) => {
//     const user = await verifyCredentials(req.body)
//     issueSessionCookie(res, { id: user.id, email: user.email, isAdmin: user.isAdmin })
//     res.json({ ok: true })
//   })
//
//   app.post('/api/auth/logout', (req, res) => {
//     clearSessionCookie(res)
//     res.json({ ok: true })
//   })
//
//   app.get('/api/me', requireAuth, (req, res) => res.json(req.user))

import jwt      from 'jsonwebtoken'
import { recordAuthFailure, isBlocked, clearAuthFailures } from './rateLimiter.js'

// __Host- prefix enforces: Secure flag, no Domain attribute, Path=/
// This is the strongest cookie security prefix available.
const COOKIE_NAME = '__Host-zf-session'

const COOKIE_OPTS = {
  httpOnly: true,   // JS cannot read this cookie — blocks XSS token theft
  secure:   true,   // Only sent over HTTPS
  sameSite: 'Strict', // Blocks CSRF — cookie not sent on cross-site requests
  path:     '/',
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days in ms
}

const JWT_ALGO = 'HS256'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET env var missing or too short (min 32 chars)')
  }
  return secret
}

// ── Issue a session cookie ────────────────────────────────────────────────────
export function issueSessionCookie(res, payload) {
  const token = jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    getSecret(),
    { expiresIn: '7d', algorithm: JWT_ALGO }
  )
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
}

// ── Clear on logout ───────────────────────────────────────────────────────────
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 })
}

// ── requireAuth middleware ────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress

  if (isBlocked(ip)) {
    const status = getBlockStatus(ip)
    return res.status(429).json({
      error:      'IP temporarily blocked due to repeated auth failures.',
      retryAfter: status?.retryAfter,
    })
  }

  const token = req.cookies?.[COOKIE_NAME]
  if (!token) {
    recordAuthFailure(ip)
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  try {
    req.user = jwt.verify(token, getSecret(), { algorithms: [JWT_ALGO] })
    clearAuthFailures(ip)  // successful auth clears failure counter
    next()
  } catch (err) {
    recordAuthFailure(ip)
    clearSessionCookie(res)
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please sign in again.'
      : 'Invalid session token.'
    return res.status(401).json({ error: msg })
  }
}

// ── requireAdmin middleware ───────────────────────────────────────────────────
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const isOwner = req.user?.email === process.env.OWNER_EMAIL
    const isAdmin = req.user?.isAdmin === true
    if (!isOwner && !isAdmin) {
      logAdminAttempt(req)
      return res.status(403).json({ error: 'Admin access required.' })
    }
    next()
  })
}

// ── requireAdminTOTP middleware ───────────────────────────────────────────────
// Additional MFA gate — verify the TOTP was completed for this session
export function requireAdminTOTP(req, res, next) {
  requireAdmin(req, res, () => {
    if (!req.session?.totpVerified) {
      return res.status(403).json({
        error:       'TOTP verification required for admin mutations.',
        requiresTOTP: true,
      })
    }
    next()
  })
}

function logAdminAttempt(req) {
  console.warn('[SECURITY][unauthorized_admin_attempt]', {
    ip:    req.ip,
    email: req.user?.email,
    path:  req.path,
    at:    new Date().toISOString(),
  })
}

// ── CSRF token helper (double-submit pattern) ─────────────────────────────────
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCSRFToken(req) {
  const headerToken = req.headers['x-csrf-token']
  const cookieToken = req.cookies?.['zf-csrf']
  return headerToken && cookieToken && headerToken === cookieToken
}

// ── Env variable checklist for deployment ────────────────────────────────────
export const REQUIRED_ENV = ['JWT_SECRET', 'OWNER_EMAIL', 'NODE_ENV']
export function checkEnv() {
  const missing = REQUIRED_ENV.filter(k => !process.env[k])
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`)
}
