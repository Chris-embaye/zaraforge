// ── Sliding-Window Rate Limiter ───────────────────────────────────────────────
// Client-side enforcement layer. Mirrors the backend Redis token-bucket logic.
// Key is typically the user's email or an IP string.

const _windows   = new Map()  // key → number[]  (request timestamps)
const _blocked   = new Map()  // key → unblockAt (ms epoch)
const _authFails = new Map()  // key → number[]  (auth-failure timestamps)

const WINDOW_MS      = 60_000      // 1-minute sliding window
const STD_LIMIT      = 60          // 60 requests per minute for standard users
const AI_LIMIT       = 10          // 10 AI requests per minute
const AUTH_FAIL_MAX  = 3           // 3 consecutive auth failures → block
const BLOCK_DURATION = 15 * 60_000 // 15-minute IP block

// ── Core rate check ───────────────────────────────────────────────────────────
export function checkRateLimit(key, limit = STD_LIMIT) {
  const now = Date.now()

  if (_blocked.has(key)) {
    const until = _blocked.get(key)
    if (now < until) {
      return {
        allowed: false,
        blocked: true,
        retryAfter: Math.ceil((until - now) / 1000),
        resetAt: new Date(until).toLocaleTimeString(),
      }
    }
    _blocked.delete(key)
  }

  const timestamps = (_windows.get(key) ?? []).filter(t => now - t < WINDOW_MS)
  timestamps.push(now)
  _windows.set(key, timestamps)

  if (timestamps.length > limit) {
    return { allowed: false, blocked: false, remaining: 0, retryAfter: 60 }
  }

  return { allowed: true, remaining: limit - timestamps.length, count: timestamps.length }
}

// Convenience: check AI endpoint quota (stricter)
export function checkAIRateLimit(key) {
  return checkRateLimit(`ai::${key}`, AI_LIMIT)
}

// ── Auth failure tracking ─────────────────────────────────────────────────────
export function recordAuthFailure(key) {
  const now   = Date.now()
  const fails = (_authFails.get(key) ?? []).filter(t => now - t < WINDOW_MS)
  fails.push(now)
  _authFails.set(key, fails)

  if (fails.length >= AUTH_FAIL_MAX) {
    const until = now + BLOCK_DURATION
    _blocked.set(key, until)
    _authFails.delete(key)
    return {
      blocked:  true,
      until:    new Date(until).toLocaleTimeString(),
      duration: '15 minutes',
    }
  }

  return { blocked: false, failCount: fails.length, remaining: AUTH_FAIL_MAX - fails.length }
}

export function clearAuthFailures(key) {
  _authFails.delete(key)
  _blocked.delete(key)
}

export function isBlocked(key) {
  const until = _blocked.get(key)
  if (!until) return false
  if (Date.now() >= until) { _blocked.delete(key); return false }
  return true
}

export function getBlockStatus(key) {
  const until = _blocked.get(key)
  if (!until || Date.now() >= until) return null
  return { until, retryAfter: Math.ceil((until - Date.now()) / 1000) }
}

// ── Backend Express middleware (copy to server) ───────────────────────────────
// Usage:  app.use('/api/ai', rateLimitMiddleware({ limit: 10, window: 60_000 }))
export function rateLimitMiddleware({ limit = STD_LIMIT, window = WINDOW_MS } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const result = checkRateLimit(key, limit)

    res.setHeader('X-RateLimit-Limit',     limit)
    res.setHeader('X-RateLimit-Remaining', result.remaining ?? 0)
    res.setHeader('X-RateLimit-Reset',     Math.ceil((Date.now() + window) / 1000))

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter)
      return res.status(429).json({
        error: result.blocked
          ? `Your IP is blocked until ${result.resetAt}. Contact support if this is an error.`
          : 'Too many requests. Please slow down.',
        retryAfter: result.retryAfter,
      })
    }
    next()
  }
}
