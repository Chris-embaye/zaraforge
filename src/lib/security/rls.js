// ── Row-Level Security (RLS) ──────────────────────────────────────────────────
// Ownership verification for every data access.
// Frontend: validates before rendering. Backend: validates before DB queries.
//
// OWASP A01 — Broken Access Control mitigation.

export class RLSViolation extends Error {
  constructor(msg, meta = {}) {
    super(msg)
    this.name   = 'RLSViolation'
    this.status = 403
    this.meta   = meta
  }
}

// ── Core ownership check ──────────────────────────────────────────────────────
export function checkOwnership(sessionUserId, resourceOwnerId, resourceType = 'resource') {
  if (!sessionUserId) {
    throw new RLSViolation('Unauthenticated: no session user_id present')
  }
  if (!resourceOwnerId) {
    throw new RLSViolation(`${resourceType} record has no owner field`)
  }
  if (String(sessionUserId) !== String(resourceOwnerId)) {
    console.error(
      `[RLS VIOLATION] user="${sessionUserId}" attempted access to ${resourceType} owned by "${resourceOwnerId}"`
    )
    throw new RLSViolation(`Forbidden: you do not own this ${resourceType}`, {
      sessionUserId,
      resourceOwnerId,
      resourceType,
      timestamp: new Date().toISOString(),
    })
  }
  return true
}

// ── Filter a record list to the current user only ─────────────────────────────
export function filterByOwner(records, sessionUserId, ownerField = 'userId') {
  if (!sessionUserId || !Array.isArray(records)) return []
  return records.filter(r => String(r[ownerField]) === String(sessionUserId))
}

// ── Safe single-record fetch ──────────────────────────────────────────────────
export function getOwnedRecord(records, id, sessionUserId, ownerField = 'userId') {
  const record = records.find(r => r.id === id)
  if (!record) throw new RLSViolation('Resource not found', { id })
  checkOwnership(sessionUserId, record[ownerField], record.constructor?.name ?? 'record')
  return record
}

// ── Backend Express middleware (copy to server/middleware/rls.js) ──────────────
// Usage:
//   router.get('/projects/:id', requireOwnership(
//     async (req) => db.projects.findUnique({ where: { id: req.params.id } })
//                               .then(p => p?.userId)
//   ), handler)
export function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      const sessionUserId = req.session?.user_id || req.user?.id
      const ownerId       = await getResourceOwnerId(req)
      checkOwnership(sessionUserId, ownerId, req.path)
      next()
    } catch (err) {
      if (err instanceof RLSViolation) {
        logRLSViolation(err, req)
        return res.status(403).json({ error: err.message })
      }
      next(err)
    }
  }
}

function logRLSViolation(err, req) {
  const entry = {
    type:      'rls_violation',
    ip:        req?.ip,
    path:      req?.path,
    userAgent: req?.get?.('user-agent')?.slice(0, 120),
    meta:      err.meta,
    at:        new Date().toISOString(),
  }
  console.error('[SECURITY]', JSON.stringify(entry))
  // Production: INSERT INTO security_audit_logs (type, ip, path, details, timestamp)
  //             VALUES ($1, $2, $3, $4::jsonb, NOW());
}

// ── PostgreSQL RLS policy (run on your DB) ────────────────────────────────────
export const RLS_SQL = `
-- Enable RLS on all user-data tables
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logos          ENABLE ROW LEVEL SECURITY;

-- Each user sees only their own rows
CREATE POLICY owner_isolation ON projects
  USING (user_id = auth.uid());

CREATE POLICY owner_isolation ON video_projects
  USING (user_id = auth.uid());

CREATE POLICY owner_isolation ON audio_tracks
  USING (user_id = auth.uid());

CREATE POLICY owner_isolation ON logos
  USING (user_id = auth.uid());

-- security_audit_logs: insert-only, no user reads
CREATE POLICY admin_insert_only ON security_audit_logs
  FOR INSERT WITH CHECK (true);
`
