import { useEffect, useState, useRef } from 'react'

export default function PhonePreview({ sessionId }) {
  const [html, setHtml]           = useState(null)
  const ablyRef                   = useRef(null)
  const channelRef                = useRef(null)

  useEffect(() => {
    const key = import.meta.env.VITE_ABLY_KEY
    if (!key) return

    import('ably').then(({ Realtime }) => {
      const client  = new Realtime({ key, clientId: `phone-${sessionId}` })
      ablyRef.current = client

      const channel = client.channels.get(`zf-preview-${sessionId}`)
      channelRef.current = channel

      channel.subscribe('canvas', msg => setHtml(msg.data.html))
    })

    return () => {
      channelRef.current?.unsubscribe()
      ablyRef.current?.close()
    }
  }, [sessionId])

  if (!html) {
    return (
      <div style={{
        minHeight: '100svh', background: '#09090b',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff',
        textAlign: 'center', padding: '0 24px',
      }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>⚡</div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>ZaraForge</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 40 }}>
          Live Device Mirror<br />Open the builder on desktop to start mirroring
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%', background: '#10b981',
              animation: `zfDot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes zfDot{0%,80%,100%{opacity:.2;transform:scale(.75)}40%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={html}
      style={{ width: '100%', height: '100svh', border: 'none', display: 'block' }}
      sandbox="allow-scripts allow-same-origin allow-forms"
      title="ZaraForge Live Preview"
    />
  )
}
