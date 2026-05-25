// ── Immutable Admin Audit Logger ──────────────────────────────────────────────
// Every admin mutation produces a frozen, timestamped, identity-signed entry.
// Frontend: writes to adminStore.securityAuditLog[]
// Backend:  INSERT INTO security_audit_logs (non-alterable via DB trigger)

let _sessionId = sessionStorage.getItem('zf-admin-session')
if (!_sessionId) {
  _sessionId = crypto.randomUUID()
  sessionStorage.setItem('zf-admin-session', _sessionId)
}

export function buildAuditEntry(action, actor, details = {}) {
  return Object.freeze({
    id:        crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor:     actor?.email ?? 'unknown',
    actorId:   actor?.id ?? null,
    action,
    details:   Object.freeze({ ...details }),
    sessionId: _sessionId,
    userAgent: navigator?.userAgent?.slice(0, 120) ?? '',
  })
}

// ── Action type catalogue ─────────────────────────────────────────────────────
export const AUDIT_ACTIONS = {
  // User management
  TIER_CHANGE:         'user.tier_change',
  ACCOUNT_FREEZE:      'user.account_freeze',
  ACCOUNT_UNFREEZE:    'user.account_unfreeze',
  IMPERSONATE_START:   'user.impersonation_start',
  IMPERSONATE_STOP:    'user.impersonation_stop',

  // Financial
  PRICE_UPDATE:        'billing.price_update',
  COUPON_MINT:         'billing.coupon_mint',
  COUPON_TOGGLE:       'billing.coupon_toggle',
  COUPON_REVOKE:       'billing.coupon_revoke',
  BUDGET_CAP_SET:      'billing.budget_cap_set',
  BUDGET_RESET:        'billing.budget_reset',

  // Platform
  FEATURE_TOGGLE:      'platform.feature_flag_toggle',
  MAINTENANCE_TOGGLE:  'platform.maintenance_toggle',
  BROADCAST_FIRE:      'platform.broadcast_fire',
  BROADCAST_CLEAR:     'platform.broadcast_clear',

  // Database
  DB_CELL_EDIT:        'database.cell_edit',

  // Security
  TOTP_VERIFIED:       'security.totp_verified',
  TOTP_FAILED:         'security.totp_failed',
  RLS_VIOLATION:       'security.rls_violation',
  AUTH_FAILURE:        'security.auth_failure',
  IP_BLOCKED:          'security.ip_blocked',

  // Admin access
  ADMIN_ACCESS_GRANT:  'security.admin_access_granted',
  ADMIN_ACCESS_DENY:   'security.admin_access_denied',
}

// ── PostgreSQL schema for backend ─────────────────────────────────────────────
export const AUDIT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp    TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  actor_email  TEXT        NOT NULL,
  actor_id     TEXT,
  action       TEXT        NOT NULL,
  details      JSONB,
  session_id   TEXT,
  user_agent   TEXT,
  ip_address   INET,
  CONSTRAINT   audit_logs_no_update CHECK (true)
);

-- Immutability: block all UPDATE and DELETE on this table
CREATE OR REPLACE RULE no_update_security_audit
  AS ON UPDATE TO security_audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_security_audit
  AS ON DELETE TO security_audit_logs DO INSTEAD NOTHING;

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON security_audit_logs (actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON security_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_ts       ON security_audit_logs (timestamp DESC);
`
