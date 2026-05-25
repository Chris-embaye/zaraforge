'use strict'

// ── Server-Side Admin Gateway ─────────────────────────────────────────────────
// Layer 2 (authoritative): IP whitelist enforcement
// Layer 3 (authoritative): Invite token validation + consumption
//
// Mount in your Express app:
//   const { adminIPGate, adminTokenGate, router: adminGWRouter } = require('./adminGateway')
//   app.use('/api/v1/admin', adminIPGate, requireAdminTOTP, adminGWRouter)

const crypto  = require('crypto')
const express = require('express')
const router  = express.Router()

// ── IP Whitelist ──────────────────────────────────────────────────────────────
// ADMIN_IP_WHITELIST: comma-separated IPs in your deployment secrets.
// Empty = allow all (dev). Server logs every access attempt.
const ADMIN_IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST ?? '')
  .split(',').map(ip => ip.trim()).filter(Boolean)

function getClientIP(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown'
}

// Returns 404 (not 403) — reveals nothing about admin panel existence
const adminIPGate = function adminIPGate(req, res, next) {
  const ip = getClientIP(req)
  console.info(`[AdminGW] ${req.method} ${req.path} from ${ip}`)
  if (!ADMIN_IP_WHITELIST.length) return next()
  if (!ADMIN_IP_WHITELIST.includes(ip)) {
    console.warn(`[AdminGW] IP blocked: ${ip}`)
    return res.status(404).json({ error: 'Not found' })
  }
  next()
}

// ── Invite Token Store ────────────────────────────────────────────────────────
// In production: replace Map with DB queries.
// Map key = token string; value = { createdBy, createdAt, expiresAt, used, boundEmail }
const _tokens = new Map()

function createInviteToken(createdBy) {
  const token     = `crew_${crypto.randomBytes(16).toString('hex')}`
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000
  _tokens.set(token, {
    token, createdBy, createdAt: Date.now(), expiresAt, used: false, boundEmail: null,
  })
  return { token, expiresAt }
}

function lookupToken(token) {
  const entry = _tokens.get(token)
  if (!entry)                       return { valid: false, reason: 'not_found' }
  if (entry.used)                   return { valid: false, reason: 'already_used' }
  if (Date.now() > entry.expiresAt) return { valid: false, reason: 'expired' }
  return { valid: true, entry }
}

// ── Invite Token Middleware ───────────────────────────────────────────────────
// Pass token via X-Admin-Invite header or zf-invite query param.
// If no token header → fall through (owner uses slug flow instead).
const adminTokenGate = function adminTokenGate(req, res, next) {
  const token = req.headers['x-admin-invite'] ?? req.query['zf-invite']
  if (!token) return next()
  const result = lookupToken(token)
  if (!result.valid) {
    console.warn(`[AdminGW] Token rejected: ${result.reason} — ${String(token).slice(0, 12)}…`)
    return res.status(401).json({ ok: false, error: `Invite token ${result.reason}` })
  }
  result.entry.used = true
  req.inviteToken   = result.entry
  next()
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/v1/admin/invite — generate a new token (owner-only, mount behind requireAdmin)
router.post('/invite', (req, res) => {
  const actor = req.user?.email ?? 'unknown'
  const { token, expiresAt } = createInviteToken(actor)
  const origin = req.headers.origin ?? `https://zaraforge.app`
  const url    = `${origin}/?zf-invite=${token}`
  res.json({ ok: true, token, url, expiresAt, expiresIn: '24h' })
})

// POST /api/v1/admin/invite/validate — peek at a token without consuming it
router.post('/invite/validate', (req, res) => {
  const { token } = req.body ?? {}
  if (!token) return res.status(400).json({ valid: false, reason: 'missing_token' })
  const result = lookupToken(token)
  if (!result.valid) return res.json({ valid: false, reason: result.reason })
  res.json({ valid: true, createdBy: result.entry.createdBy, expiresAt: result.entry.expiresAt })
})

// POST /api/v1/admin/invite/consume — validate + consume (marks as used)
router.post('/invite/consume', (req, res) => {
  const { token, boundEmail } = req.body ?? {}
  if (!token) return res.status(400).json({ ok: false, error: 'missing_token' })
  const result = lookupToken(token)
  if (!result.valid) return res.status(401).json({ ok: false, error: result.reason })
  result.entry.used       = true
  result.entry.boundEmail = boundEmail ?? null
  res.json({ ok: true, createdBy: result.entry.createdBy })
})

module.exports = { adminIPGate, adminTokenGate, router }
