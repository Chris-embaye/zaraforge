import { useEffect, Component } from 'react'
import { I18nProvider } from './i18n'
import { sanitizeTrackingHTML } from './lib/security/sanitize'
import {
  verifyAdminSlug, extractURLParam, removeURLParam,
  validateInviteToken, checkIPWhitelist, fetchClientIP, IP_WHITELIST,
} from './lib/security/adminGateway'

class VideoEditorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace', fontSize: 13, background: '#0a0a0f', flex: 1 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>Video Editor crashed</div>
        <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{String(this.state.err)}{'\n\n'}{this.state.err?.stack}</pre>
      </div>
    )
    return this.props.children
  }
}
import { useBuilderStore }     from './store/builderStore'
import { useMarketingStore }   from './store/marketingStore'
import { useVibeStore }        from './store/vibeStore'
import { useCVStore }          from './store/codeViewStore'
import { useAuthStore }        from './store/authStore'
import { useZaraForgeSession } from './hooks/useZaraForgeSession'
import { useHeartbeat }        from './hooks/useHeartbeat'
import { ThemeProvider }       from './context/ThemeContext'
import TopBar                  from './components/TopBar'
import Toast                   from './components/Toast'
import ExportModal             from './components/ExportModal'
import PWAModal                from './components/PWAModal'
import FormAnalytics           from './components/FormAnalytics'
import VersionHistory          from './components/VersionHistory'
import ChatAssistant           from './components/ChatAssistant'
import DeployModal             from './components/DeployModal'
import SecurityAuditModal      from './components/SecurityAuditModal'
import CodeEditorPanel         from './components/CodeEditorPanel'
import MobileEventToast        from './components/MobileEventToast'
import VectorStudioWorkspace   from './components/VectorStudioWorkspace'
import AssetTransferOverlay    from './components/AssetTransferOverlay'
import AuthModal               from './components/AuthModal'
import ProjectsDrawer          from './components/ProjectsDrawer'
import LandingPage             from './components/LandingPage'
import GlobalBroadcastBanner  from './components/GlobalBroadcastBanner'
import AdminCommandCenter     from './admin/AdminCommandCenter'
import { useAdminStore }      from './admin/adminStore'
import CreditBlockedModal     from './components/CreditBlockedModal'
import DownloadPortal         from './components/DownloadPortal'
import FirstBootSetup         from './components/FirstBootSetup'
import { useFirstBoot }       from './hooks/useFirstBoot'

import SignupGate    from './components/SignupGate'
import PhonePreview  from './components/PhonePreview'

// Video Editor mode
import VideoLeftSidebar       from './video/VideoLeftSidebar'
import VideoRightSidebar      from './video/VideoRightSidebar'
import VideoMonitors          from './video/VideoMonitors'
import VideoTimeline          from './video/VideoTimeline'
import VideoExportPanel       from './video/VideoExportPanel'
import VideoSequenceSettings  from './video/VideoSequenceSettings'
import VideoAudioMixer        from './video/VideoAudioMixer'
import { useVideoStore }      from './store/videoStore'

// Studio mode
import DAWCanvas       from './daw/DAWCanvas'
import DAWLeftSidebar  from './daw/DAWLeftSidebar'
import DAWRightSidebar from './daw/DAWRightSidebar'

// Builder mode
import Canvas       from './components/Canvas'
import RightSidebar from './components/RightSidebar'

// Hadas AI mode
import HadasWorkspace from './components/HadasWorkspace'

// ── Script injector — reads trackingScripts from marketingStore, injects into <head>
function ScriptInjector() {
  const trackingScripts = useMarketingStore(s => s.trackingScripts)

  useEffect(() => {
    // Remove any previously injected pixel tags
    document.querySelectorAll('[data-zf-pixel]').forEach(el => el.remove())
    if (!trackingScripts.trim()) return

    // Sanitize first — strips XSS, forces HTTPS src, rejects dangerous patterns
    const sanitized = sanitizeTrackingHTML(trackingScripts)
    if (!sanitized.trim()) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html><head>${sanitized}</head></html>`,
      'text/html'
    )
    Array.from(doc.querySelectorAll('script')).forEach(s => {
      const el = document.createElement('script')
      el.setAttribute('data-zf-pixel', '1')
      if (s.src) {
        el.src   = s.src
        el.async = true
      } else if (s.textContent.trim()) {
        el.textContent = s.textContent
      } else {
        return
      }
      Array.from(s.attributes).forEach(attr => {
        if (['src', 'async', 'defer'].includes(attr.name)) return
        try { el.setAttribute(attr.name, attr.value) } catch {}
      })
      document.head.appendChild(el)
    })
  }, [trackingScripts])

  return null
}

// ── Session-restore overlay ────────────────────────────────────────────────────
function SessionRestoreOverlay({ user }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20,
      background: 'rgba(2,2,10,0.92)', backdropFilter: 'blur(10px)',
      animation: 'sroFadeIn 0.3s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: user?.avatarBg ?? 'rgba(0,229,255,0.12)',
        border: `2px solid ${user?.accentColor ?? '#00e5ff'}`,
        boxShadow: `0 0 24px ${user?.accentColor ?? '#00e5ff'}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, color: user?.accentColor ?? '#00e5ff',
      }}>
        {user?.initials ?? 'U'}
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>
          Welcome back, {user?.name?.split(' ')[0] ?? 'Creator'}!
        </p>
        <p style={{ fontSize: 12, color: '#475569' }}>Restoring your workspace from the cloud…</p>
      </div>

      {/* Animated progress bar */}
      <div style={{
        width: 240, height: 3, borderRadius: 99,
        background: '#111118', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: `linear-gradient(90deg, ${user?.accentColor ?? '#00e5ff'}, #8b5cf6)`,
          animation: 'sroBar 2.2s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      </div>

      <style>{`
        @keyframes sroFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sroBar    { from{width:0%}  to{width:100%} }
      `}</style>
    </div>
  )
}


export default function App() {
  const { showExport, showPWA, showFormAnalytics, showVersionHistory, previewMode, appMode, setAppMode, appEntered, onboardingStep } = useBuilderStore()
  const { showDeploy, showSecurityAudit } = useVibeStore()
  const { showExportPanel, showSequenceSettings, showAudioMixer } = useVideoStore()
  const { viewMode } = useCVStore()
  const { showAuthModal, showProjectsDrawer, sessionRestoring, user } = useAuthStore()
  const { inviteTokens, consumeInviteToken } = useAdminStore()
  const { checking, needsSetup, markComplete } = useFirstBoot()

  // Activate the session hook — subscribes to schema changes and handles restore
  useZaraForgeSession()

  // Activate server heartbeat — gates premium features on real-time server grants
  useHeartbeat()

  // ── Admin gateway: URL slug + invite token listener ─────────────────────────
  useEffect(() => {
    const slug   = extractURLParam('zf-access')
    const invite = extractURLParam('zf-invite')

    if (slug) {
      removeURLParam('zf-access')  // always clear from URL — never leave slug in history
      if (verifyAdminSlug(slug)) {
        // Optional IP whitelist advisory check
        if (IP_WHITELIST.length) {
          fetchClientIP().then(ip => {
            if (checkIPWhitelist(ip)) setAppMode('admin')
          })
        } else {
          setAppMode('admin')
        }
      }
    }

    if (invite) {
      removeURLParam('zf-invite')  // consume from URL regardless of validity
      const result = validateInviteToken(invite, inviteTokens)
      if (result.valid) {
        consumeInviteToken(invite)
        setAppMode('admin')
      }
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enter admin mode when user logs in as admin
  useEffect(() => {
    if (user?.isAdmin && appMode !== 'admin') setAppMode('admin')
  }, [user?.isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const isStudio  = appMode === 'studio'
  const isBuilder = appMode === 'builder'
  const isLogo    = appMode === 'logo'
  const isBGR     = appMode === 'bgremover'
  const isVideo   = appMode === 'video'
  const isAdmin   = appMode === 'admin'
  const isHadas   = appMode === 'hadas'

  // ── Phone live mirror — bypasses the entire app shell ───────────────────────
  const _phoneSession = new URLSearchParams(window.location.search).get('phoneSession')
  if (_phoneSession) return <PhonePreview sessionId={_phoneSession} />

  // ── Standalone download portal — bypasses the entire app shell ──────────────
  if (window.location.pathname === '/download') return <DownloadPortal />

  // ── First-boot setup wizard (desktop Electron only) ─────────────────────────
  if (checking) return null
  if (needsSetup) return <FirstBootSetup onComplete={markComplete} />

  if (!appEntered) return <I18nProvider><LandingPage /></I18nProvider>

  return (
    <I18nProvider>
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden"
        style={{
          background: [
            'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(109,40,217,0.18) 0%, transparent 60%)',
            'radial-gradient(ellipse 55% 35% at 85% 5%,  rgba(0,229,255,0.07)   0%, transparent 50%)',
            'radial-gradient(ellipse 40% 30% at 15% 10%, rgba(167,139,250,0.06) 0%, transparent 50%)',
            '#02020a',
          ].join(', '),
          color: '#e2e8f0',
        }}>

        <TopBar />
        <GlobalBroadcastBanner />

        {/* ── Admin Command Center ────────────────────────────────────────── */}
        {isAdmin && <AdminCommandCenter />}

        {/* ── Studio mode (DAW) ───────────────────────────────────────────── */}
        {isStudio && (
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <DAWCanvas />
            <DAWLeftSidebar />
            <DAWRightSidebar />
          </div>
        )}

        {/* ── AI Vector Studio (Logo Maker + BG Remover unified) ─────────── */}
        {(isLogo || isBGR) && <VectorStudioWorkspace />}

        {/* ── Video Editor ────────────────────────────────────────────────── */}
        {isVideo && (
          <VideoEditorBoundary>
          <div className="flex-1 min-h-0" style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 200px',
            gridTemplateRows: '1fr',
            overflow: 'hidden',
            background: [
              'radial-gradient(ellipse 50% 40% at 25% 30%, rgba(109,40,217,0.09) 0%, transparent 55%)',
              'radial-gradient(ellipse 40% 30% at 75% 70%, rgba(0,229,255,0.05) 0%, transparent 50%)',
              '#08080d',
            ].join(', '),
          }}>
            <VideoLeftSidebar />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              <VideoMonitors />
              <VideoTimeline />
            </div>
            <VideoRightSidebar />
          </div>
          </VideoEditorBoundary>
        )}

        {/* ── Hadas AI mode ───────────────────────────────────────────────── */}
        {isHadas && <HadasWorkspace />}

        {/* ── Builder mode ────────────────────────────────────────────────── */}
        {isBuilder && (
          <div className="flex flex-1 min-h-0 overflow-hidden" style={{ position: 'relative' }}>
            {/* Signup gate overlay — shown mid-generation */}
            {onboardingStep === 'signup_gate' && <SignupGate />}

            {/* Left: AI Chat + Components + InfraPanel */}
            {!previewMode && <ChatAssistant />}

            {viewMode === 'code' ? (
              /* Pro Developer Code View */
              <CodeEditorPanel />
            ) : (
              <>
                {/* Centre: Canvas (Design / Data modes) */}
                <Canvas />

                {/* Right: Component Inspector */}
                {!previewMode && <RightSidebar />}
              </>
            )}
          </div>
        )}

        {/* ── Modals ──────────────────────────────────────────────────────── */}
        {showExport         && <ExportModal />}
        {showPWA            && <PWAModal />}
        {showDeploy         && <DeployModal />}
        {showSecurityAudit  && <SecurityAuditModal />}
        {showFormAnalytics  && <FormAnalytics />}
        {showVersionHistory && <VersionHistory />}

        {/* ── Video Editor panels ─────────────────────────────────────────── */}
        {showExportPanel      && <VideoExportPanel />}
        {showSequenceSettings && <VideoSequenceSettings />}
        {showAudioMixer       && <VideoAudioMixer />}

        <ScriptInjector />
        <CreditBlockedModal />
        <Toast />
        <MobileEventToast />
        <AssetTransferOverlay />

        {/* ── Auth & Session ──────────────────────────────────────────────── */}
        {showAuthModal     && <AuthModal />}
        {showProjectsDrawer && <ProjectsDrawer />}
        {sessionRestoring  && <SessionRestoreOverlay user={user} />}
      </div>
    </ThemeProvider>
    </I18nProvider>
  )
}
