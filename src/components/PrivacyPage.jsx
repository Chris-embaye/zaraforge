const SECTIONS = [
  {
    title: '1. Information We Collect',
    items: [
      { label: 'Account information', desc: 'When you register, we collect your name and email address.' },
      { label: 'Payment information', desc: 'Payments are processed by Stripe. We never store your card number — Stripe handles all payment data under their own privacy policy.' },
      { label: 'Usage data', desc: 'We collect information about how you use the Service, including features accessed, pages visited, and actions taken within the builder.' },
      { label: 'Device information', desc: 'We collect browser type, operating system, and IP address for security and analytics purposes.' },
      { label: 'Content you create', desc: 'Projects, designs, and other content you create using ZaraForge are stored to provide the Service.' },
    ],
  },
  {
    title: '2. How We Use Your Information',
    items: [
      { label: 'Provide the Service', desc: 'To operate, maintain, and improve the ZaraForge platform and your experience.' },
      { label: 'Communications', desc: 'To send you account-related emails, product updates, and promotional messages. You may opt out of marketing emails at any time.' },
      { label: 'Security', desc: 'To detect, prevent, and respond to fraud, abuse, or security incidents.' },
      { label: 'Analytics', desc: 'To understand how users interact with the platform so we can improve it.' },
      { label: 'Legal compliance', desc: 'To comply with applicable laws, regulations, and legal processes.' },
    ],
  },
  {
    title: '3. Third-Party Services',
    items: [
      { label: 'Stripe', desc: 'Payment processing. Your payment data is governed by Stripe\'s Privacy Policy at stripe.com/privacy.' },
      { label: 'Ably', desc: 'Real-time messaging for the Live Device Mirror feature. Session data is transmitted through Ably\'s infrastructure.' },
      { label: 'Google Fonts', desc: 'Font files are loaded from Google\'s servers, which may log your IP address.' },
      { label: 'Analytics', desc: 'We may use privacy-respecting analytics tools to understand aggregate usage patterns. No personal data is sold to advertisers.' },
    ],
  },
  {
    title: '4. Data Sharing',
    body: `We do not sell, rent, or trade your personal information to third parties. We may share data with service providers who assist in operating the Service, subject to confidentiality obligations. We may disclose information if required by law or to protect the rights, property, or safety of ZaraForge or others.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your account information for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention).`,
  },
  {
    title: '6. Cookies',
    body: `We use essential cookies to keep you logged in and remember your preferences. We do not use third-party advertising cookies. You can disable cookies in your browser settings, though some features may not function correctly without them.`,
  },
  {
    title: '7. Your Rights',
    items: [
      { label: 'Access', desc: 'You may request a copy of the personal data we hold about you.' },
      { label: 'Correction', desc: 'You may request correction of inaccurate personal data.' },
      { label: 'Deletion', desc: 'You may request deletion of your account and personal data.' },
      { label: 'Portability', desc: 'You may request your data in a portable format.' },
      { label: 'Opt-out', desc: 'You may opt out of marketing communications at any time via the unsubscribe link in any email.' },
    ],
  },
  {
    title: '8. Children\'s Privacy',
    body: `ZaraForge is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.`,
  },
  {
    title: '9. Security',
    body: `We implement industry-standard security measures to protect your personal information, including HTTPS encryption, secure session management, and access controls. However, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the platform. Your continued use of the Service after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    body: `For privacy-related questions, requests, or concerns, contact us at:\n\nhello@zaraforge.app\n\nWe will respond within 5 business days.`,
  },
]

const EFFECTIVE = 'May 25, 2026'

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#09090b', color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/zaraforge-logo.png" alt="ZaraForge" style={{ height: 28, width: 'auto' }} />
        </a>
        <a href="/" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Back to home</a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 32px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#60a5fa', marginBottom: 16,
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)',
          }}>Legal</span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.028em', color: '#f1f5f9', lineHeight: 1.1, marginBottom: 16 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Effective date: {EFFECTIVE} &nbsp;·&nbsp; Last updated: {EFFECTIVE}
          </p>
        </div>

        {/* Intro */}
        <div style={{
          padding: '20px 24px', borderRadius: 14, marginBottom: 48,
          background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
        }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, margin: 0 }}>
            Your privacy matters to us. This policy explains what information ZaraForge collects, how we use it, and the choices you have. We will never sell your personal data.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <div key={i} style={{ marginBottom: 44 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em', marginBottom: 16 }}>
              {s.title}
            </h2>

            {s.body && (
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line' }}>
                {s.body}
              </p>
            )}

            {s.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#60a5fa',
                      flexShrink: 0, marginTop: 8,
                    }} />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{item.label}: </span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75 }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {i < SECTIONS.length - 1 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginTop: 44 }} />
            )}
          </div>
        ))}

        {/* Footer note */}
        <div style={{
          marginTop: 64, padding: '20px 24px', borderRadius: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>© 2026 ZaraForge. All rights reserved.</span>
          <a href="/terms" style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>Terms of Service →</a>
        </div>
      </div>
    </div>
  )
}
