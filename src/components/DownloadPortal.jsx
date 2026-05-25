import { useState, useEffect } from 'react'

// ── Release data ──────────────────────────────────────────────────────────────
const VERSION   = '1.0.0'
const BUILD     = '2026.05.19'
const BASE_URL  = 'https://releases.zaraforge.app'

const DOWNLOADS = {
  mac_arm:  { label: 'Apple Silicon (M1 / M2 / M3)',  ext: 'dmg', arch: 'arm64', file: `ZaraForge-${VERSION}-arm64.dmg`  },
  mac_intel:{ label: 'Mac Intel (x64)',                ext: 'dmg', arch: 'x64',   file: `ZaraForge-${VERSION}-x64.dmg`    },
  win_x64:  { label: 'Windows 64-bit',                 ext: 'exe', arch: 'x64',   file: `ZaraForge-Setup-${VERSION}.exe`  },
}

const RELEASE_NOTES = [
  { version: '1.0.0', date: 'May 19 2026', highlights: [
    'Initial public release — macOS + Windows native builds',
    'V8 bytecode protection + 6 Electron Fuses enabled',
    'HMAC-signed server heartbeat with 5-min JWT grants',
    'Multi-lingual NSIS installer (14 languages)',
    'First-boot hardware optimisation wizard',
    'ZaraForge AI Builder, Studio DAW, Video Editor, Vector Studio',
  ]},
]

const REQUIREMENTS = {
  mac: [
    { label: 'OS',      value: 'macOS 12 Monterey or later' },
    { label: 'CPU',     value: 'Apple Silicon (M1+) or Intel Core i5+' },
    { label: 'RAM',     value: '8 GB minimum · 16 GB recommended' },
    { label: 'Storage', value: '2 GB free disk space' },
    { label: 'GPU',     value: 'Metal-compatible GPU (for AI acceleration)' },
  ],
  win: [
    { label: 'OS',      value: 'Windows 10 (64-bit) version 1903 or later' },
    { label: 'CPU',     value: 'Intel Core i5 / AMD Ryzen 5 or better' },
    { label: 'RAM',     value: '8 GB minimum · 16 GB recommended' },
    { label: 'Storage', value: '2 GB free disk space' },
    { label: 'GPU',     value: 'DirectX 11-compatible GPU' },
    { label: 'Rights',  value: 'Administrator rights required for system-wide install' },
  ],
}

// ── OS detection ──────────────────────────────────────────────────────────────
function detectOS() {
  const ua = navigator.userAgent
  if (/Windows/.test(ua))                            return 'win'
  if (/Mac|Macintosh/.test(ua) && !/iPhone/.test(ua)) return 'mac'
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DownloadButton({ href, label, arch, ext, primary }) {
  const [hover, setHover] = useState(false)
  const isMac = ext === 'dmg'

  return (
    <a
      href={href}
      download
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 18px', borderRadius: 10, textDecoration: 'none',
        border: primary
          ? `1px solid ${hover ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.35)'}`
          : `1px solid ${hover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
        background: primary
          ? hover
            ? 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(99,102,241,0.18))'
            : 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(99,102,241,0.1))'
          : hover ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}>
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.06)',
        fontSize: 17,
      }}>
        {isMac ? '🍎' : '🪟'}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: primary ? '#e2e8f0' : '#94a3b8' }}>
          {label}
        </div>
        <div style={{ fontSize: 10.5, color: '#475569', marginTop: 1 }}>
          .{ext} · {arch} · v{VERSION}
        </div>
      </div>

      {/* Arrow */}
      <span style={{ fontSize: 14, color: primary ? '#00e5ff' : '#334155', flexShrink: 0 }}>↓</span>
    </a>
  )
}

function AccordionItem({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
          color: '#e2e8f0', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          textAlign: 'left',
        }}>
        {title}
        <span style={{
          fontSize: 16, color: '#475569',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s',
        }}>›</span>
      </button>
      <div style={{
        maxHeight: open ? 600 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ paddingBottom: 16 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, highlighted, os }) {
  const isMac = platform === 'mac'
  const accentColor = isMac ? '#00e5ff' : '#a78bfa'

  return (
    <div style={{
      flex: 1, minWidth: 0,
      borderRadius: 20, padding: '32px 28px',
      background: highlighted
        ? `linear-gradient(145deg, rgba(${isMac ? '0,229,255' : '167,139,250'},0.07), rgba(99,102,241,0.04))`
        : 'rgba(255,255,255,0.025)',
      border: highlighted
        ? `1.5px solid rgba(${isMac ? '0,229,255' : '167,139,250'},0.38)`
        : '1.5px solid rgba(255,255,255,0.07)',
      boxShadow: highlighted
        ? `0 0 60px rgba(${isMac ? '0,229,255' : '167,139,250'},0.08), 0 20px 60px rgba(0,0,0,0.4)`
        : '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(20px)',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.4s ease',
    }}>
      {/* Animated glow bar at top for highlighted card */}
      {highlighted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          animation: 'dlGlow 2.5s ease-in-out infinite',
        }} />
      )}

      {/* "Your System" badge */}
      {highlighted && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          padding: '3px 10px', borderRadius: 99,
          background: `rgba(${isMac ? '0,229,255' : '167,139,250'},0.12)`,
          border: `1px solid rgba(${isMac ? '0,229,255' : '167,139,250'},0.3)`,
          fontSize: 9.5, fontWeight: 800, color: accentColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          ● Your system
        </div>
      )}

      {/* OS icon */}
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>
        {isMac ? '🍎' : '🪟'}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        {isMac ? 'macOS' : 'Windows'}
      </h2>
      <p style={{ fontSize: 12.5, color: '#475569', margin: '0 0 28px', lineHeight: 1.5 }}>
        {isMac
          ? 'Signed & notarized · Hardened Runtime · Universal binary'
          : 'EV code-signed · System-wide install · NSIS setup wizard'}
      </p>

      {/* Download buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isMac ? (
          <>
            <DownloadButton
              href={`${BASE_URL}/${DOWNLOADS.mac_arm.file}`}
              label={DOWNLOADS.mac_arm.label}
              arch={DOWNLOADS.mac_arm.arch}
              ext="dmg"
              primary={highlighted}
            />
            <DownloadButton
              href={`${BASE_URL}/${DOWNLOADS.mac_intel.file}`}
              label={DOWNLOADS.mac_intel.label}
              arch={DOWNLOADS.mac_intel.arch}
              ext="dmg"
              primary={false}
            />
          </>
        ) : (
          <DownloadButton
            href={`${BASE_URL}/${DOWNLOADS.win_x64.file}`}
            label={DOWNLOADS.win_x64.label}
            arch={DOWNLOADS.win_x64.arch}
            ext="exe"
            primary={highlighted}
          />
        )}
      </div>

      {/* Integrity note */}
      <p style={{ fontSize: 10.5, color: '#1e293b', margin: '20px 0 0', lineHeight: 1.6 }}>
        {isMac
          ? 'SHA-256 checksum published on releases page · Apple Notarized'
          : 'DigiCert EV timestamped · SHA-256 · Windows SmartScreen approved'}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DownloadPortal() {
  const [detectedOS, setDetectedOS] = useState(null)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    setDetectedOS(detectOS())
    setMounted(true)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,255,0.08) 0%, transparent 60%), #02020a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>

      {/* ── Nav strip ───────────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 60,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(2,2,10,0.8)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/zaraforge-logo.png" alt="ZaraForge" style={{ height: 32 }} />
        </div>
        <a href="/"
          style={{
            fontSize: 12, fontWeight: 700, color: '#475569', textDecoration: 'none',
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
          ← Back to App
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header style={{ textAlign: 'center', padding: '80px 24px 56px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 14px', borderRadius: 99, marginBottom: 24,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.2)',
          fontSize: 11, fontWeight: 700, color: '#00e5ff',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          ⬇ Desktop Distribution · v{VERSION}
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, margin: '0 0 16px',
          letterSpacing: '-0.03em', lineHeight: 1.05,
          background: 'linear-gradient(135deg, #e2e8f0 30%, #00e5ff 70%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Download ZaraForge
        </h1>

        <p style={{ fontSize: 16, color: '#475569', margin: '0 auto', maxWidth: 520, lineHeight: 1.7 }}>
          The full creative platform — AI Builder, Studio DAW, Video Editor, and Vector Studio —
          native on macOS and Windows.
        </p>

        {/* OS detected badge */}
        {mounted && detectedOS && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 20, padding: '5px 14px', borderRadius: 99,
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            fontSize: 11, fontWeight: 700, color: '#34d399',
          }}>
            ✓ {detectedOS === 'mac' ? 'macOS' : 'Windows'} detected — best download highlighted below
          </div>
        )}
      </header>

      {/* ── Platform cards ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap',
          marginBottom: 56,
        }}>
          <PlatformCard platform="mac" highlighted={!mounted || detectedOS === 'mac'} os={detectedOS} />
          <PlatformCard platform="win" highlighted={mounted && detectedOS === 'win'}  os={detectedOS} />
        </div>

        {/* ── Accordion: Release Notes + System Requirements ──────────────── */}
        <div style={{
          borderRadius: 16, padding: '8px 28px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Release notes */}
          {RELEASE_NOTES.map(rel => (
            <AccordionItem key={rel.version} title={`Release Notes — v${rel.version} (${rel.date})`}>
              <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
                {rel.highlights.map((h, i) => (
                  <li key={i} style={{
                    fontSize: 12.5, color: '#64748b', marginBottom: 7,
                    paddingLeft: 16, position: 'relative', lineHeight: 1.5,
                  }}>
                    <span style={{ position: 'absolute', left: 0, color: '#00e5ff' }}>›</span>
                    {h}
                  </li>
                ))}
              </ul>
            </AccordionItem>
          ))}

          {/* macOS requirements */}
          <AccordionItem title="System Requirements — macOS">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {REQUIREMENTS.mac.map(r => (
                  <tr key={r.label}>
                    <td style={{ padding: '5px 0', fontSize: 11.5, fontWeight: 700, color: '#475569', width: 90 }}>
                      {r.label}
                    </td>
                    <td style={{ padding: '5px 0', fontSize: 12, color: '#64748b' }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AccordionItem>

          {/* Windows requirements */}
          <AccordionItem title="System Requirements — Windows">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {REQUIREMENTS.win.map(r => (
                  <tr key={r.label}>
                    <td style={{ padding: '5px 0', fontSize: 11.5, fontWeight: 700, color: '#475569', width: 90 }}>
                      {r.label}
                    </td>
                    <td style={{ padding: '5px 0', fontSize: 12, color: '#64748b' }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AccordionItem>

          {/* Checksum verification */}
          <AccordionItem title="Checksum Verification">
            <p style={{ fontSize: 12, color: '#475569', margin: '0 0 10px', lineHeight: 1.6 }}>
              All binaries are published with SHA-256 checksums. Verify before running:
            </p>
            <pre style={{
              fontSize: 11, color: '#64748b', margin: 0,
              background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px',
              overflowX: 'auto', lineHeight: 1.7,
            }}>
{`# macOS (Terminal)
shasum -a 256 ZaraForge-${VERSION}-arm64.dmg

# Windows (PowerShell)
Get-FileHash ZaraForge-Setup-${VERSION}.exe -Algorithm SHA256

# Compare against: releases.zaraforge.app/checksums.txt`}
            </pre>
          </AccordionItem>
        </div>

        {/* ── Footer strip ─────────────────────────────────────────────────── */}
        <p style={{ textAlign: 'center', fontSize: 11.5, color: '#1e293b', marginTop: 40 }}>
          Having issues? Visit{' '}
          <a href="https://zaraforge.app/support" style={{ color: '#334155', textDecoration: 'none' }}>
            zaraforge.app/support
          </a>
          {' '}or email support@zaraforge.app
        </p>
      </main>

      <style>{`
        @keyframes dlGlow {
          0%,100% { opacity: 0.6 }
          50%      { opacity: 1   }
        }
      `}</style>
    </div>
  )
}
