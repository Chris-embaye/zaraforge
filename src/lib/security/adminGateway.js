'use strict'

// ── Admin Gateway: Client-Side Guards ────────────────────────────────────────
// Layer 1: Secret slug verification (constant-time)
// Layer 2: IP whitelist advisory check (server enforces authoritatively)
// Layer 3: Invite token generation + validation

const ADMIN_SLUG = import.meta.env?.VITE_ADMIN_SLUG ?? ''

// Constant-time comparison — guards against timing attacks on the slug
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const len = Math.max(a.length, b.length)
  let diff  = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

// ── Layer 1: Route Slug ───────────────────────────────────────────────────────
export function verifyAdminSlug(candidate) {
  if (!ADMIN_SLUG || !candidate) return false
  return timingSafeEqual(String(candidate), ADMIN_SLUG)
}

export function extractURLParam(key) {
  const params = new URLSearchParams(window.location.search)
  return params.get(key) ?? null
}

export function removeURLParam(key) {
  const url = new URL(window.location.href)
  url.searchParams.delete(key)
  window.history.replaceState({}, '', url.toString())
}

// ── Layer 2: IP Whitelist ─────────────────────────────────────────────────────
// Populate VITE_ADMIN_IP_WHITELIST with comma-separated IPs in production.
// Empty string = allow all (dev-only; server-side gate is authoritative).
const WHITELIST_RAW  = import.meta.env?.VITE_ADMIN_IP_WHITELIST ?? ''
export const IP_WHITELIST = WHITELIST_RAW
  ? WHITELIST_RAW.split(',').map(ip => ip.trim()).filter(Boolean)
  : []

export async function fetchClientIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) return null
    const d = await r.json()
    return typeof d.ip === 'string' ? d.ip : null
  } catch {
    return null
  }
}

export function checkIPWhitelist(ip) {
  if (!IP_WHITELIST.length) return true  // open when no whitelist configured
  return IP_WHITELIST.includes(ip)
}

// ── Layer 3: Invite Tokens ────────────────────────────────────────────────────
// crew_<32 hex chars> | 24 h TTL | single-use
// In production: server validates and consumes (see server/adminGateway.js).
// Client stores tokens for display only.

export function generateInviteToken(actor) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex   = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return {
    token:      `crew_${hex}`,
    createdBy:  actor?.email ?? 'unknown',
    createdAt:  Date.now(),
    expiresAt:  Date.now() + 24 * 60 * 60 * 1000,
    used:       false,
    boundEmail: null,
  }
}

export function validateInviteToken(token, tokens) {
  const entry = tokens?.[token]
  if (!entry)                       return { valid: false, reason: 'not_found' }
  if (entry.used)                   return { valid: false, reason: 'already_used' }
  if (Date.now() > entry.expiresAt) return { valid: false, reason: 'expired' }
  return { valid: true, entry }
}

export function buildInviteURL(token) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/?zf-invite=${token}`
}

export function tokenTimeLeft(expiresAt) {
  const ms  = expiresAt - Date.now()
  if (ms <= 0) return 'expired'
  const h   = Math.floor(ms / 3_600_000)
  const m   = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
