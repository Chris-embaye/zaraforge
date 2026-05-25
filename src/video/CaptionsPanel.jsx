import { useState } from 'react'
import { useVideoStore } from '../store/videoStore'

const STEPS = [
  'Extracting audio stream…',
  'Running speech-to-text (Whisper v3)…',
  'Aligning words to timeline…',
  'Applying caption style…',
  '✓ Captions ready!',
]

const MOCK_WORDS = [
  { t: 0.0,  end: 0.4,  word: 'Welcome' },
  { t: 0.5,  end: 0.9,  word: 'back' },
  { t: 1.0,  end: 1.2,  word: 'to' },
  { t: 1.3,  end: 1.9,  word: 'another' },
  { t: 2.0,  end: 2.5,  word: 'video.' },
  { t: 3.2,  end: 3.8,  word: "Today" },
  { t: 3.9,  end: 4.1,  word: "we're" },
  { t: 4.2,  end: 4.9,  word: 'breaking' },
  { t: 5.0,  end: 5.3,  word: 'down' },
  { t: 5.4,  end: 5.8,  word: 'the' },
  { t: 5.9,  end: 6.6,  word: 'formula.' },
  { t: 7.5,  end: 7.9,  word: 'No' },
  { t: 8.0,  end: 8.5,  word: 'fluff,' },
  { t: 8.6,  end: 8.9,  word: 'just' },
  { t: 9.0,  end: 9.6,  word: 'results.' },
]

const PRESETS = [
  {
    id: 'hormozi',
    label: 'The Hormozi',
    desc: 'Bold yellow uppercase — high-impact hook style',
    preview: (
      <div style={{ background: '#000', padding: '6px 10px', borderRadius: 6, textAlign: 'center' }}>
        <span style={{
          fontFamily: 'Impact, Arial Black, sans-serif',
          fontSize: 13, fontWeight: 900,
          color: '#FFD600',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          textShadow: '2px 2px 0 #000, -2px -2px 0 #000',
          animation: 'capPop 0.25s ease',
        }}>WELCOME BACK</span>
      </div>
    ),
    color: '#FFD600',
  },
  {
    id: 'minimal',
    label: 'Clean Minimal',
    desc: 'White centered, soft shadow — polished & readable',
    preview: (
      <div style={{ background: 'rgba(0,0,0,0.6)', padding: '6px 10px', borderRadius: 6, textAlign: 'center' }}>
        <span style={{
          fontFamily: 'Inter, Helvetica, sans-serif',
          fontSize: 12, fontWeight: 600, color: '#ffffff',
          textShadow: '0 1px 8px rgba(0,0,0,0.9)',
          letterSpacing: '0.01em',
        }}>Welcome back to the channel</span>
      </div>
    ),
    color: '#e2e8f0',
  },
  {
    id: 'cyber',
    label: 'Cyber Glow',
    desc: 'Neon color-shifting outline — viral aesthetic',
    preview: (
      <div style={{ background: '#0a0015', padding: '6px 10px', borderRadius: 6, textAlign: 'center' }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 12, fontWeight: 800,
          color: '#00e5ff',
          textShadow: '0 0 8px #00e5ff, 0 0 20px #8b5cf6',
          letterSpacing: '0.08em',
          animation: 'cyberShift 2s linear infinite',
        }}>WELCOME BACK</span>
      </div>
    ),
    color: '#00e5ff',
  },
]

export default function CaptionsPanel() {
  const {
    captionStyle, setCaptionStyle,
    captionsEnabled, setCaptionsEnabled,
    captionsGenerating, setCaptionsGenerating,
    setCaptionWords,
  } = useVideoStore()

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  function generate() {
    if (captionsGenerating) return
    setCaptionsGenerating(true)
    setDone(false)
    setStep(0)

    let i = 0
    const tick = () => {
      i++
      setStep(i)
      if (i < STEPS.length - 1) {
        setTimeout(tick, 600 + Math.random() * 500)
      } else {
        setCaptionWords(MOCK_WORDS)
        setCaptionsEnabled(true)
        setCaptionsGenerating(false)
        setDone(true)
      }
    }
    setTimeout(tick, 500)
  }

  const activePreset = PRESETS.find(p => p.id === captionStyle) ?? PRESETS[0]

  return (
    <div style={{ padding: '10px 8px' }}>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 3 }}>
          🔤 AI Auto-Captions
        </div>
        <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5 }}>
          Whisper v3 speech transcription synced to your timeline. Tap a style then generate.
        </div>
      </div>

      {/* Style presets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Caption Style
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PRESETS.map(p => (
            <div
              key={p.id}
              onClick={() => setCaptionStyle(p.id)}
              style={{
                borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${captionStyle === p.id ? `${p.color}55` : 'rgba(255,255,255,0.07)'}`,
                background: captionStyle === p.id ? `${p.color}0d` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
              <div style={{ padding: '7px 8px 4px' }}>
                {p.preview}
              </div>
              <div style={{ padding: '5px 8px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: captionStyle === p.id ? p.color : '#64748b' }}>{p.label}</div>
                  <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>{p.desc}</div>
                </div>
                {captionStyle === p.id && (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${p.color}22`, border: `1.5px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: p.color, flexShrink: 0 }}>✓</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={captionsGenerating}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 8, marginBottom: 10,
          fontSize: 10, fontWeight: 800, cursor: captionsGenerating ? 'default' : 'pointer',
          fontFamily: 'inherit',
          background: captionsGenerating
            ? 'rgba(0,229,255,0.06)'
            : done
              ? 'linear-gradient(90deg, rgba(52,211,153,0.2), rgba(0,229,255,0.15))'
              : 'linear-gradient(90deg, rgba(139,92,246,0.25), rgba(0,229,255,0.18))',
          border: `1px solid ${captionsGenerating ? 'rgba(0,229,255,0.15)' : done ? 'rgba(52,211,153,0.35)' : 'rgba(139,92,246,0.4)'}`,
          color: captionsGenerating ? '#334155' : done ? '#34d399' : '#c4b5fd',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
        {captionsGenerating
          ? <><span style={{ animation: 'lsSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span> Generating…</>
          : done
            ? '✓ Re-Generate Captions'
            : '▶ Generate Dynamic Subtitles'}
      </button>

      {/* Progress steps */}
      {(captionsGenerating || done) && (
        <div style={{
          marginBottom: 10, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
              opacity: i <= step ? 1 : 0.2, transition: 'opacity 0.3s',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: i < step
                  ? '#34d399'
                  : i === step && captionsGenerating
                    ? '#00e5ff'
                    : 'rgba(255,255,255,0.1)',
                boxShadow: i === step && captionsGenerating ? '0 0 6px rgba(0,229,255,0.8)' : 'none',
                animation: i === step && captionsGenerating ? 'termBlink 1s ease-in-out infinite' : 'none',
              }} />
              <span style={{
                fontSize: 8.5, fontFamily: 'monospace',
                color: i === step && captionsGenerating ? '#00e5ff' : i < step ? '#34d399' : '#334155',
              }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Visibility toggle */}
      {done && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 9px', borderRadius: 7,
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: captionsEnabled ? activePreset.color : '#475569' }}>
              Show Captions on Monitor
            </div>
            <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>
              Renders on Program Monitor preview
            </div>
          </div>
          <div onClick={() => setCaptionsEnabled(!captionsEnabled)} style={{
            width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
            background: captionsEnabled ? `${activePreset.color}33` : 'rgba(255,255,255,0.08)',
            border: `1px solid ${captionsEnabled ? `${activePreset.color}55` : 'rgba(255,255,255,0.1)'}`,
            position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
              background: captionsEnabled ? activePreset.color : '#334155',
              left: captionsEnabled ? 16 : 2, transition: 'all 0.2s',
              boxShadow: captionsEnabled ? `0 0 6px ${activePreset.color}99` : 'none',
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes capPop { from{transform:scale(1.18)} to{transform:scale(1)} }
        @keyframes cyberShift { 0%{color:#00e5ff;text-shadow:0 0 8px #00e5ff} 50%{color:#c084fc;text-shadow:0 0 8px #c084fc} 100%{color:#00e5ff;text-shadow:0 0 8px #00e5ff} }
        @keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes lsSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
