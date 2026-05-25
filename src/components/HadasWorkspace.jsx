import { useState, useRef, useEffect } from 'react'
import { Send, ImagePlus, Volume2, Loader2 } from 'lucide-react'

const API = 'https://hadas-ai-server.onrender.com'

export default function HadasWorkspace() {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [speaking, setSpeaking]     = useState(null)
  const [slowWarn, setSlowWarn]     = useState(false)
  const [serverReady, setServerReady] = useState(false)
  const bottomRef                   = useRef(null)
  const fileRef                     = useRef(null)
  const slowTimer                   = useRef(null)

  // Wake up the server on mount so the first message is fast
  useEffect(() => {
    fetch(`${API}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '_ping', gender: 'MALE' }),
    }).then(() => setServerReady(true)).catch(() => setServerReady(true))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text, imageBase64 = null) {
    if (!text.trim() && !imageBase64) return
    const userMsg = { role: 'user', text, image: imageBase64 }
    const next    = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setSlowWarn(false)
    slowTimer.current = setTimeout(() => setSlowWarn(true), 5000)

    try {
      let reply, speak
      if (imageBase64) {
        const res  = await fetch(`${API}/api/vision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64, prompt: text || 'Analyze this image.' }),
        })
        const json = await res.json()
        reply = json.reply
        speak = json.speak
      } else {
        const history = next.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))
        const res  = await fetch(`${API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageHistory: history, gender: 'MALE' }),
        })
        const json = await res.json()
        reply = json.reply
        speak = json.speak
      }
      setMessages(prev => [...prev, { role: 'model', text: reply, speak }])
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'ናይ ራኸቢ ጸገም ኣጋጢሙ። (Connection error)', speak: '' }])
    } finally {
      clearTimeout(slowTimer.current)
      setLoading(false)
      setSlowWarn(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      send(input || '', base64)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function speakPhonetics(idx, text) {
    window.speechSynthesis.cancel()
    if (speaking === idx) { setSpeaking(null); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang  = 'en-US'
    utt.rate  = 0.8
    utt.onend = () => setSpeaking(null)
    setSpeaking(idx)
    window.speechSynthesis.speak(utt)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: '#02020a',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #111118',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#060610',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(52,211,153,0.12)',
          border: '1.5px solid rgba(52,211,153,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>ሓ</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>Hadas AI · ሓዳስ</p>
          <p style={{ fontSize: 11, color: '#334155' }}>Tigrinya language companion</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>ሓዳስ</div>
            {!serverReady ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: '#475569' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Waking up server…</span>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#334155' }}>Say hello in Tigrinya — or upload an image to analyze.</p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '72%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user'
                ? 'rgba(52,211,153,0.12)'
                : '#0c0c1a',
              border: `1px solid ${m.role === 'user' ? 'rgba(52,211,153,0.25)' : '#1a1a2e'}`,
            }}>
              {m.image && (
                <img
                  src={`data:image/jpeg;base64,${m.image}`}
                  alt="uploaded"
                  style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }}
                />
              )}
              <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {m.text}
              </p>
              {m.speak && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <button
                    onClick={() => speakPhonetics(i, m.speak)}
                    title="Play phonetic pronunciation"
                    style={{
                      flexShrink: 0,
                      background: speaking === i ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.08)',
                      border: '1px solid rgba(52,211,153,0.3)',
                      borderRadius: 6, padding: '3px 6px', cursor: 'pointer',
                      color: '#34d399', display: 'flex', alignItems: 'center',
                    }}>
                    <Volume2 size={11} />
                  </button>
                  <p style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
                    {m.speak}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              background: '#0c0c1a', border: '1px solid #1a1a2e',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={13} style={{ color: '#34d399', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#475569' }}>ሓዳስ is thinking…</span>
              </div>
              {slowWarn && (
                <p style={{ fontSize: 11, color: '#334155', marginLeft: 21 }}>
                  Server is waking up (free tier) — usually ready in ~30s
                </p>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid #111118',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: '#060610',
      }}>
        <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} style={{ display: 'none' }} />

        <button
          onClick={() => fileRef.current?.click()}
          title="Upload image for analysis"
          style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#34d399',
          }}>
          <ImagePlus size={15} />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type in Tigrinya or English…"
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '9px 12px',
            borderRadius: 10, fontSize: 13, lineHeight: 1.5,
            background: '#0c0c1a', border: '1px solid #1a1a2e',
            color: '#e2e8f0', outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: loading || !input.trim() ? 'rgba(52,211,153,0.04)' : 'rgba(52,211,153,0.15)',
            border: '1px solid rgba(52,211,153,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            color: '#34d399', opacity: loading || !input.trim() ? 0.4 : 1,
          }}>
          <Send size={14} />
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
