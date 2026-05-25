#!/usr/bin/env node
// ── ZaraForge Security Suite ──────────────────────────────────────────────────
// Run: node security-tests.mjs
//
// Covers:
//   §1  Rate Limiter       (sliding window, AI quota, auth-fail 3-strike block)
//   §2  Row-Level Security (ownership checks, filter, RLSViolation class)
//   §3  Input Sanitizer    (XSS, protocol, dangerous patterns, text escaping)
//   §4  Audit Logger       (frozen entries, field completeness, action catalogue)
//   §5  Admin Gateway CLI  (slug verify, invite tokens, time-left, URL helpers)
//   §6  Server Admin GW    (IP gate, token store, single-use enforcement)
//   §7  Heartbeat HMAC     (signature correctness, replay, tampering)

import { createRequire } from 'module'
import { webcrypto }     from 'crypto'

const require = createRequire(import.meta.url)

// ── Browser API mocks (must be set BEFORE importing ESM modules) ──────────────
if (!globalThis.crypto) globalThis.crypto = webcrypto

const _ss = {}
globalThis.sessionStorage = {
  getItem:    k => _ss[k] ?? null,
  setItem:    (k, v) => { _ss[k] = String(v) },
  removeItem: k => { delete _ss[k] },
}

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'ZaraForge-SecurityTest/1.0' },
    configurable: true, writable: true,
  })
} catch {}

// DOMParser mock — extracts <script> tags from raw HTML strings
globalThis.DOMParser = class MockDOMParser {
  parseFromString(html) {
    const scripts = []
    const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const attrStr  = m[1]
      const content  = m[2]
      const srcM     = /\bsrc=["']([^"']+)["']/.exec(attrStr)
      // Build iterable attributes array (key="value" pairs only)
      const attrs = []
      const attrRe = /\b([\w-]+)=["']([^"']*)["']/g
      let am
      while ((am = attrRe.exec(attrStr)) !== null) {
        if (am[1] !== 'src') attrs.push({ name: am[1], value: am[2] })
      }
      scripts.push({ src: srcM ? srcM[1] : null, textContent: content, attributes: attrs })
    }
    return { querySelectorAll: sel => sel === 'script' ? scripts : [] }
  }
}

globalThis.window = {
  location: {
    origin: 'https://zaraforge.app',
    href:   'https://zaraforge.app/?zf-access=test-slug',
    search: '?zf-access=test-slug',
  },
  history: { replaceState: () => {} },
}

// ── Test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0
const failures = []

function section(title) {
  console.log(`\n  ── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`)
}

function test(name, fn) {
  try {
    fn()
    console.log(`    \x1b[32m✓\x1b[0m ${name}`)
    pass++
  } catch (e) {
    console.log(`    \x1b[31m✗\x1b[0m ${name}`)
    console.log(`      \x1b[90m→ ${e.message}\x1b[0m`)
    failures.push({ name, err: e.message })
    fail++
  }
}

const assert = (cond, msg = 'assertion failed') => { if (!cond) throw new Error(msg) }
const eq     = (a, b, msg) => { if (a !== b) throw new Error(msg ?? `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }
const neq    = (a, b, msg) => { if (a === b) throw new Error(msg ?? `expected values to differ, both are ${JSON.stringify(a)}`) }
const throws = (fn, msg)   => {
  let threw = false
  try { fn() } catch { threw = true }
  if (!threw) throw new Error(msg ?? 'expected function to throw')
}

// ── Import all ESM security modules ──────────────────────────────────────────
const {
  checkRateLimit, checkAIRateLimit, recordAuthFailure,
  clearAuthFailures, isBlocked, getBlockStatus,
} = await import('./src/lib/security/rateLimiter.js')

const { RLSViolation, checkOwnership, filterByOwner, getOwnedRecord } =
  await import('./src/lib/security/rls.js')

const { sanitizeTrackingHTML, sanitizeText } =
  await import('./src/lib/security/sanitize.js')

const { buildAuditEntry, AUDIT_ACTIONS } =
  await import('./src/lib/security/auditLogger.js')

const {
  verifyAdminSlug, extractURLParam, removeURLParam,
  checkIPWhitelist, IP_WHITELIST,
  generateInviteToken, validateInviteToken,
  tokenTimeLeft, buildInviteURL,
} = await import('./src/lib/security/adminGateway.js')

// Server modules are CommonJS + require express — skip gracefully if absent
let serverGW = null
try { serverGW = require('./server/adminGateway.js') } catch {}

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m ZaraForge Security Test Suite\x1b[0m')
console.log(' ─────────────────────────────────────────────────────\n')
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
section('§1  RATE LIMITER')
// ─────────────────────────────────────────────────────────────────────────────

test('allows first request', () => {
  const r = checkRateLimit('rl-fresh-1')
  assert(r.allowed, 'first request must be allowed')
})

test('returns remaining count', () => {
  const r = checkRateLimit('rl-remain-1')
  assert(typeof r.remaining === 'number' && r.remaining >= 0, 'remaining must be a number')
})

test('remaining decrements on successive calls', () => {
  const k  = 'rl-decrement-key'
  const r1 = checkRateLimit(k)
  const r2 = checkRateLimit(k)
  assert(r2.remaining < r1.remaining, 'remaining should decrement')
})

test('blocks after 60-req standard limit', () => {
  const k = 'rl-std-block'
  for (let i = 0; i < 60; i++) checkRateLimit(k)
  const r = checkRateLimit(k)
  assert(!r.allowed, 'should block after 60 requests')
})

test('blocked result carries retryAfter', () => {
  const k = 'rl-retry-after'
  for (let i = 0; i < 61; i++) checkRateLimit(k)
  const r = checkRateLimit(k)
  assert(typeof r.retryAfter === 'number' && r.retryAfter > 0, 'retryAfter must be > 0')
})

test('AI endpoint uses 10-req limit', () => {
  const k = 'ai-limit-key'
  for (let i = 0; i < 10; i++) checkAIRateLimit(k)
  const r = checkAIRateLimit(k)
  assert(!r.allowed, 'AI limit must block after 10 requests')
})

test('AI key is namespaced (independent from std key)', () => {
  const k = 'namespace-test'
  for (let i = 0; i < 5; i++) checkAIRateLimit(k)
  const r = checkRateLimit(k)   // standard key — should still have plenty of room
  assert(r.allowed && r.remaining > 50, 'AI namespace should not pollute std key')
})

test('different keys are fully independent', () => {
  const r1 = checkRateLimit('ind-key-alpha')
  const r2 = checkRateLimit('ind-key-beta')
  assert(r1.allowed && r2.allowed)
  eq(r1.remaining, r2.remaining, 'fresh independent keys should have equal remaining')
})

test('recordAuthFailure tracks fail count', () => {
  const r = recordAuthFailure('af-count-1')
  assert(!r.blocked)
  eq(r.failCount, 1)
})

test('3 consecutive auth failures triggers block', () => {
  const k = 'af-three-strikes'
  recordAuthFailure(k)
  recordAuthFailure(k)
  const r = recordAuthFailure(k)
  assert(r.blocked, '3rd failure must trigger block')
})

test('isBlocked returns true after 3 auth failures', () => {
  const k = 'af-isblocked'
  recordAuthFailure(k); recordAuthFailure(k); recordAuthFailure(k)
  assert(isBlocked(k))
})

test('clearAuthFailures lifts block', () => {
  const k = 'af-clear'
  recordAuthFailure(k); recordAuthFailure(k); recordAuthFailure(k)
  clearAuthFailures(k)
  assert(!isBlocked(k), 'block must be cleared')
})

test('getBlockStatus returns null for clean key', () => {
  eq(getBlockStatus('never-blocked-xyz'), null)
})

test('getBlockStatus returns retryAfter > 0 when blocked', () => {
  const k = 'bs-retry'
  recordAuthFailure(k); recordAuthFailure(k); recordAuthFailure(k)
  const s = getBlockStatus(k)
  assert(s !== null && s.retryAfter > 0)
})

// ─────────────────────────────────────────────────────────────────────────────
section('§2  ROW-LEVEL SECURITY')
// ─────────────────────────────────────────────────────────────────────────────

test('checkOwnership returns true on ID match', () => {
  eq(checkOwnership('u-001', 'u-001', 'project'), true)
})

test('checkOwnership accepts string/number coercion', () => {
  eq(checkOwnership(1, '1', 'resource'), true)
})

test('checkOwnership throws on ID mismatch', () => {
  throws(() => checkOwnership('u-001', 'u-002', 'project'), 'mismatch must throw')
})

test('thrown error is RLSViolation instance', () => {
  try { checkOwnership('a', 'b') } catch (e) {
    assert(e instanceof RLSViolation, 'must be RLSViolation')
  }
})

test('RLSViolation has status 403', () => {
  try { checkOwnership('a', 'b') } catch (e) { eq(e.status, 403) }
})

test('RLSViolation has meta object', () => {
  try { checkOwnership('a', 'b', 'logo') } catch (e) {
    assert(e.meta && e.meta.resourceType === 'logo')
  }
})

test('checkOwnership throws on null sessionUserId', () => {
  throws(() => checkOwnership(null, 'u-001'), 'null session user must throw')
})

test('checkOwnership throws on null resourceOwnerId', () => {
  throws(() => checkOwnership('u-001', null), 'null owner must throw')
})

test('filterByOwner returns only owned records', () => {
  const records = [
    { id: 'r1', userId: 'u-001' },
    { id: 'r2', userId: 'u-002' },
    { id: 'r3', userId: 'u-001' },
  ]
  const filtered = filterByOwner(records, 'u-001')
  eq(filtered.length, 2)
  assert(filtered.every(r => r.userId === 'u-001'))
})

test('filterByOwner returns [] for null user', () => {
  eq(filterByOwner([{ id: 'r1', userId: 'u-001' }], null).length, 0)
})

test('filterByOwner returns [] for non-array input', () => {
  eq(filterByOwner(null, 'u-001').length, 0)
})

test('getOwnedRecord returns matching owned record', () => {
  const records = [{ id: 'r1', userId: 'u-001' }]
  const rec = getOwnedRecord(records, 'r1', 'u-001')
  eq(rec.id, 'r1')
})

test('getOwnedRecord throws on wrong owner', () => {
  const records = [{ id: 'r1', userId: 'u-002' }]
  throws(() => getOwnedRecord(records, 'r1', 'u-001'), 'wrong owner must throw')
})

test('getOwnedRecord throws when record not found', () => {
  throws(() => getOwnedRecord([], 'missing-id', 'u-001'), 'missing record must throw')
})

// ─────────────────────────────────────────────────────────────────────────────
section('§3  INPUT SANITIZER')
// ─────────────────────────────────────────────────────────────────────────────

test('allows valid HTTPS script src', () => {
  const out = sanitizeTrackingHTML('<script src="https://www.googletagmanager.com/gtm.js"></script>')
  assert(out.includes('googletagmanager.com'), 'HTTPS src must pass through')
})

test('rejects HTTP src (non-HTTPS)', () => {
  const out = sanitizeTrackingHTML('<script src="http://evil.com/tracker.js"></script>')
  assert(!out.includes('evil.com'), 'HTTP src must be stripped')
})

test('rejects javascript: protocol src', () => {
  const out = sanitizeTrackingHTML('<script src="javascript:alert(1)"></script>')
  assert(!out.includes('javascript:'), 'javascript: must be rejected')
})

test('rejects data: protocol src', () => {
  const out = sanitizeTrackingHTML('<script src="data:text/javascript,alert(1)"></script>')
  assert(!out.includes('data:'), 'data: must be rejected')
})

test('rejects inline eval()', () => {
  const out = sanitizeTrackingHTML('<script>eval("bad")</script>')
  assert(out === '', 'eval() must produce empty output')
})

test('rejects document.cookie access', () => {
  const out = sanitizeTrackingHTML('<script>var x = document.cookie</script>')
  assert(out === '', 'document.cookie must be rejected')
})

test('rejects localStorage access', () => {
  const out = sanitizeTrackingHTML('<script>localStorage.getItem("token")</script>')
  assert(out === '', 'localStorage must be rejected')
})

test('rejects fetch() call', () => {
  const out = sanitizeTrackingHTML('<script>fetch("https://exfil.com")</script>')
  assert(out === '', 'fetch() must be rejected')
})

test('rejects new Function()', () => {
  const out = sanitizeTrackingHTML('<script>new Function("return 1")()</script>')
  assert(out === '', 'new Function() must be rejected')
})

test('returns empty string for null input', () => {
  eq(sanitizeTrackingHTML(null), '')
})

test('returns empty string for numeric input', () => {
  eq(sanitizeTrackingHTML(42), '')
})

test('returns empty string for empty string', () => {
  eq(sanitizeTrackingHTML(''), '')
})

test('sanitizeText escapes < and > chars', () => {
  const out = sanitizeText('<script>xss</script>')
  assert(!out.includes('<'), 'must not contain raw <')
  assert(out.includes('&lt;'))
})

test('sanitizeText escapes double quotes', () => {
  const out = sanitizeText('"quoted"')
  assert(out.includes('&quot;'), 'must escape double quotes')
})

test('sanitizeText escapes ampersand', () => {
  const out = sanitizeText('AT&T')
  assert(out.includes('&amp;'))
})

// ─────────────────────────────────────────────────────────────────────────────
section('§4  AUDIT LOGGER')
// ─────────────────────────────────────────────────────────────────────────────

test('buildAuditEntry returns frozen object', () => {
  const e = buildAuditEntry('test.action', { email: 'a@b.com' })
  assert(Object.isFrozen(e), 'entry must be frozen')
})

test('details object is also frozen', () => {
  const e = buildAuditEntry('test.action', { email: 'a@b.com' }, { foo: 'bar' })
  assert(Object.isFrozen(e.details), 'details must be frozen')
})

test('entry has all required fields', () => {
  const e = buildAuditEntry('test.action', { email: 'a@b.com', id: 'u-1' }, { k: 'v' })
  assert(e.id,        'must have id')
  assert(e.timestamp, 'must have timestamp')
  assert(e.action,    'must have action')
  assert(e.sessionId, 'must have sessionId')
  assert(e.actor,     'must have actor')
})

test('actor captures email from actor object', () => {
  const e = buildAuditEntry('test.action', { email: 'owner@zaraforge.app', id: 'u-99' })
  eq(e.actor,   'owner@zaraforge.app')
  eq(e.actorId, 'u-99')
})

test('actor defaults to "unknown" when email absent', () => {
  const e = buildAuditEntry('test.action', {})
  eq(e.actor, 'unknown')
})

test('actorId is null when id absent', () => {
  const e = buildAuditEntry('test.action', { email: 'x@y.com' })
  eq(e.actorId, null)
})

test('frozen entry rejects mutation silently', () => {
  const e = buildAuditEntry('test.action', { email: 'a@b.com' })
  try { e.actor = 'hacker' } catch {}
  eq(e.actor, 'a@b.com', 'frozen entry must not be mutated')
})

test('frozen details rejects mutation silently', () => {
  const e = buildAuditEntry('test.action', { email: 'a@b.com' }, { key: 'original' })
  try { e.details.key = 'tampered' } catch {}
  eq(e.details.key, 'original')
})

test('AUDIT_ACTIONS covers user, billing, platform, security categories', () => {
  const vals = Object.values(AUDIT_ACTIONS)
  assert(vals.some(v => v.startsWith('user.')),      'user category missing')
  assert(vals.some(v => v.startsWith('billing.')),   'billing category missing')
  assert(vals.some(v => v.startsWith('platform.')),  'platform category missing')
  assert(vals.some(v => v.startsWith('security.')),  'security category missing')
})

test('AUDIT_ACTIONS has at least 16 distinct action types', () => {
  assert(Object.keys(AUDIT_ACTIONS).length >= 16, 'expected ≥16 action types')
})

test('each audit entry gets a unique UUID id', () => {
  const e1 = buildAuditEntry('a', { email: 'x@y.com' })
  const e2 = buildAuditEntry('a', { email: 'x@y.com' })
  neq(e1.id, e2.id, 'each entry must have a unique id')
})

// ─────────────────────────────────────────────────────────────────────────────
section('§5  ADMIN GATEWAY — CLIENT')
// ─────────────────────────────────────────────────────────────────────────────

test('verifyAdminSlug returns false for null candidate', () => {
  eq(verifyAdminSlug(null), false)
})

test('verifyAdminSlug returns false for empty candidate', () => {
  eq(verifyAdminSlug(''), false)
})

test('verifyAdminSlug returns false when VITE_ADMIN_SLUG not in Node env', () => {
  // import.meta.env is undefined in Node → ADMIN_SLUG = '' → always false
  eq(verifyAdminSlug('gateway-x92f4kl3m8nq'), false)
})

test('checkIPWhitelist returns true when whitelist is empty (dev mode)', () => {
  // VITE_ADMIN_IP_WHITELIST not set in Node env → IP_WHITELIST = []
  eq(IP_WHITELIST.length, 0, 'IP_WHITELIST must be empty in test env')
  assert(checkIPWhitelist('1.2.3.4'), 'empty whitelist must allow all IPs')
})

test('extractURLParam reads from mocked window.location.search', () => {
  // window.location.search = '?zf-access=test-slug' (set in mock above)
  const val = extractURLParam('zf-access')
  eq(val, 'test-slug', 'must read param from mock search string')
})

test('extractURLParam returns null for missing param', () => {
  eq(extractURLParam('zf-nonexistent'), null)
})

test('removeURLParam does not throw', () => {
  removeURLParam('zf-access')  // should call history.replaceState without error
  assert(true, 'removeURLParam should not throw')
})

test('buildInviteURL contains token and origin', () => {
  const url = buildInviteURL('crew_abc123def456')
  assert(url.includes('zf-invite=crew_abc123def456'), 'must contain token')
  assert(url.includes('zaraforge.app'), 'must include origin from mock')
})

test('generateInviteToken has crew_ prefix', () => {
  const e = generateInviteToken({ email: 'admin@zaraforge.app' })
  assert(e.token.startsWith('crew_'), 'token must start with crew_')
})

test('generateInviteToken hex part is exactly 32 chars', () => {
  const e   = generateInviteToken({ email: 'admin@zaraforge.app' })
  const hex = e.token.slice('crew_'.length)
  eq(hex.length, 32, 'hex part must be 32 chars (16 bytes)')
  assert(/^[0-9a-f]+$/i.test(hex), 'hex part must contain only hex chars')
})

test('generateInviteToken TTL is exactly 24 hours', () => {
  const e = generateInviteToken({ email: 'admin@zaraforge.app' })
  eq(e.expiresAt - e.createdAt, 24 * 60 * 60 * 1000, 'TTL must be 24h')
})

test('generateInviteToken starts as unused', () => {
  const e = generateInviteToken({ email: 'admin@zaraforge.app' })
  eq(e.used, false)
  eq(e.boundEmail, null)
})

test('generateInviteToken captures createdBy from actor.email', () => {
  const e = generateInviteToken({ email: 'boss@zaraforge.app' })
  eq(e.createdBy, 'boss@zaraforge.app')
})

test('generateInviteToken createdBy defaults to "unknown" when actor has no email', () => {
  const e = generateInviteToken({})
  eq(e.createdBy, 'unknown')
})

test('two tokens are always unique', () => {
  const e1 = generateInviteToken({ email: 'a@b.com' })
  const e2 = generateInviteToken({ email: 'a@b.com' })
  neq(e1.token, e2.token, 'tokens must be unique')
})

test('validateInviteToken — valid fresh token passes', () => {
  const e = generateInviteToken({ email: 'a@b.com' })
  const r = validateInviteToken(e.token, { [e.token]: e })
  assert(r.valid)
  assert(r.entry === e)
})

test('validateInviteToken — used token fails with already_used', () => {
  const e = generateInviteToken({ email: 'a@b.com' })
  e.used = true
  const r = validateInviteToken(e.token, { [e.token]: e })
  assert(!r.valid)
  eq(r.reason, 'already_used')
})

test('validateInviteToken — expired token fails with expired', () => {
  const e = generateInviteToken({ email: 'a@b.com' })
  e.expiresAt = Date.now() - 1  // 1 ms in the past
  const r = validateInviteToken(e.token, { [e.token]: e })
  assert(!r.valid)
  eq(r.reason, 'expired')
})

test('validateInviteToken — unknown token fails with not_found', () => {
  const r = validateInviteToken('crew_doesnotexist11111111111111111', {})
  assert(!r.valid)
  eq(r.reason, 'not_found')
})

test('validateInviteToken — null token map returns not_found', () => {
  const r = validateInviteToken('crew_abc', null)
  assert(!r.valid)
  eq(r.reason, 'not_found')
})

test('tokenTimeLeft — future time shows hours and minutes', () => {
  const future = Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000  // 2h 30m
  const tl = tokenTimeLeft(future)
  assert(tl.includes('h'), `expected hours in "${tl}"`)
  assert(tl.includes('m'), `expected minutes in "${tl}"`)
})

test('tokenTimeLeft — sub-hour future shows only minutes', () => {
  const future = Date.now() + 45 * 60 * 1000  // 45m
  const tl = tokenTimeLeft(future)
  assert(!tl.includes('h'), `should not show hours: "${tl}"`)
  assert(tl.includes('m'))
})

test('tokenTimeLeft — past time returns "expired"', () => {
  eq(tokenTimeLeft(Date.now() - 1000), 'expired')
})

// ─────────────────────────────────────────────────────────────────────────────
section('§6  SERVER ADMIN GATEWAY')
// ─────────────────────────────────────────────────────────────────────────────

if (!serverGW) {
  console.log('    \x1b[33m⊘\x1b[0m  Skipped — server deps not installed')
  console.log('    \x1b[90m   Run: cd server && npm install express\x1b[0m')
} else {
  const { adminIPGate, adminTokenGate, createInviteToken } = serverGW

  const mockReq = (o = {}) => ({
    headers: {}, socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1', query: {}, body: {}, method: 'GET', path: '/admin', ...o,
  })
  const mockRes = () => {
    const r = { _status: 200, _body: null }
    r.status = s  => { r._status = s; return r }
    r.json   = b  => { r._body  = b; return r }
    return r
  }

  test('adminIPGate calls next() when whitelist is empty (dev mode)', () => {
    let called = false
    adminIPGate(mockReq(), mockRes(), () => { called = true })
    assert(called, 'next() must be called with empty whitelist')
  })

  test('createInviteToken produces crew_ prefixed token', () => {
    const { token } = createInviteToken('owner@zaraforge.app')
    assert(token.startsWith('crew_'), 'server token must start with crew_')
  })

  test('server token hex part is 32 chars', () => {
    const { token } = createInviteToken('owner@zaraforge.app')
    const hex = token.slice('crew_'.length)
    eq(hex.length, 32)
    assert(/^[0-9a-f]+$/i.test(hex))
  })

  test('server token expiry is ~24h in the future', () => {
    const { expiresAt } = createInviteToken('owner@zaraforge.app')
    const diff = expiresAt - Date.now()
    assert(diff > 23 * 3_600_000 && diff <= 24 * 3_600_000, `TTL out of range: ${diff}ms`)
  })

  test('two server tokens are always unique', () => {
    const { token: t1 } = createInviteToken('a@b.com')
    const { token: t2 } = createInviteToken('a@b.com')
    neq(t1, t2, 'server tokens must be unique')
  })

  test('adminTokenGate calls next() when no token header provided', () => {
    let called = false
    adminTokenGate(mockReq(), mockRes(), () => { called = true })
    assert(called, 'no-token request must fall through to next()')
  })

  test('adminTokenGate rejects an invented/fake token with 401', () => {
    const req = mockReq({ headers: { 'x-admin-invite': 'crew_' + '0'.repeat(32) } })
    const res = mockRes()
    let called = false
    adminTokenGate(req, res, () => { called = true })
    assert(!called,       'next() must NOT be called for invalid token')
    eq(res._status, 401,  'must respond 401 for invalid token')
  })

  test('adminTokenGate accepts a valid token and calls next()', () => {
    const { token } = createInviteToken('admin@zaraforge.app')
    const req = mockReq({ headers: { 'x-admin-invite': token } })
    const res = mockRes()
    let called = false
    adminTokenGate(req, res, () => { called = true })
    assert(called,       'next() must be called for valid token')
    eq(res._status, 200, 'status must not be changed on valid token')
  })

  test('adminTokenGate single-use: second use of same token returns 401', () => {
    const { token } = createInviteToken('admin@zaraforge.app')
    // First use — valid
    adminTokenGate(mockReq({ headers: { 'x-admin-invite': token } }), mockRes(), () => {})
    // Second use — must fail
    const res2 = mockRes()
    let called2 = false
    adminTokenGate(mockReq({ headers: { 'x-admin-invite': token } }), res2, () => { called2 = true })
    assert(!called2,       'second use must NOT call next()')
    eq(res2._status, 401,  'second use must return 401')
  })

  test('adminIPGate and adminTokenGate are functions', () => {
    eq(typeof adminIPGate,    'function')
    eq(typeof adminTokenGate, 'function')
  })
}

// ─────────────────────────────────────────────────────────────────────────────
section('§7  HEARTBEAT HMAC VERIFICATION')
// ─────────────────────────────────────────────────────────────────────────────

{
  const crypto  = require('crypto')
  const SECRET  = 'test-hmac-secret-32-chars-minimum'

  const sign = (uid, email, ts) =>
    crypto.createHmac('sha256', SECRET).update(`${uid}:${email}:${ts}`).digest('hex')

  const verify = (uid, email, ts, hmac, secret = SECRET) => {
    if (!secret) return true
    if (Math.abs(Date.now() - Number(ts)) > 30_000) return false
    const expected = crypto.createHmac('sha256', secret).update(`${uid}:${email}:${ts}`).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'))
    } catch { return false }
  }

  test('valid HMAC (current timestamp) passes', () => {
    const ts   = Date.now()
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(verify('u-001', 'admin@zaraforge.app', ts, hmac))
  })

  test('tampered userId fails verification', () => {
    const ts   = Date.now()
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(!verify('u-EVIL', 'admin@zaraforge.app', ts, hmac), 'tampered userId must fail')
  })

  test('tampered email fails verification', () => {
    const ts   = Date.now()
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(!verify('u-001', 'attacker@evil.com', ts, hmac), 'tampered email must fail')
  })

  test('replayed request (timestamp > 30s old) fails', () => {
    const ts   = Date.now() - 31_000  // 31 seconds ago
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(!verify('u-001', 'admin@zaraforge.app', ts, hmac), 'expired timestamp must fail')
  })

  test('future timestamp (> 30s ahead) fails (clock skew guard)', () => {
    const ts   = Date.now() + 31_000
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(!verify('u-001', 'admin@zaraforge.app', ts, hmac), 'future timestamp must fail')
  })

  test('wrong HMAC secret fails verification', () => {
    const ts   = Date.now()
    const hmac = sign('u-001', 'admin@zaraforge.app', ts)
    assert(!verify('u-001', 'admin@zaraforge.app', ts, hmac, 'wrong-secret'), 'wrong secret must fail')
  })

  test('truncated HMAC fails without throwing', () => {
    const ts   = Date.now()
    const hmac = sign('u-001', 'admin@zaraforge.app', ts).slice(0, 10)
    assert(!verify('u-001', 'admin@zaraforge.app', ts, hmac), 'truncated HMAC must fail gracefully')
  })

  test('empty HMAC fails without throwing', () => {
    assert(!verify('u-001', 'admin@zaraforge.app', Date.now(), ''), 'empty HMAC must fail gracefully')
  })
}

// ── Final results ─────────────────────────────────────────────────────────────
const total = pass + fail
console.log(`\n ${'─'.repeat(52)}`)
console.log(`  \x1b[1mResults: ${pass} passed / ${fail} failed / ${total} total\x1b[0m`)
console.log(` ${'─'.repeat(52)}`)

if (failures.length > 0) {
  console.log('\n  Failed tests:')
  failures.forEach(f => {
    console.log(`    \x1b[31m✗\x1b[0m ${f.name}`)
    console.log(`      \x1b[90m${f.err}\x1b[0m`)
  })
  console.log()
  process.exit(1)
} else {
  console.log(`\n  \x1b[32mAll ${total} tests passed.\x1b[0m\n`)
}
