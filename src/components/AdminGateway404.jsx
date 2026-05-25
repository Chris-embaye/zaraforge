// ── AdminGateway404 ───────────────────────────────────────────────────────────
// Convincing "Not Found" decoy — rendered for wrong slugs or direct /admin
// attempts. Gives no indication an admin panel exists.

export default function AdminGateway404() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'system-ui, sans-serif',
      color: '#1a1a1a',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        <p style={{ fontSize: 120, fontWeight: 900, color: '#e5e7eb', lineHeight: 1, margin: 0 }}>
          404
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 8px' }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 28px' }}>
          The page you are looking for doesn't exist or has been moved.
          Check the URL and try again.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 24px', borderRadius: 8,
            background: '#111827', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
          Go back home
        </a>
      </div>
    </div>
  )
}
