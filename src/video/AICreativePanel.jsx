import { useState, useRef } from 'react'
import { useVideoStore } from '../store/videoStore'

// ── Shared ────────────────────────────────────────────────────────────────────
function SubHeader({ emoji, title, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', flex: 1 }}>{title}</span>
      {badge && (
        <span style={{
          fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: '#00e5ff',
          letterSpacing: '0.06em',
        }}>{badge}</span>
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />
}

function ProgressBar({ value, color = '#00e5ff' }) {
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}88)`,
        width: `${value}%`, transition: 'width 0.15s linear',
      }} />
    </div>
  )
}

// ── Feature 1 — AI Video Generator ───────────────────────────────────────────
const GEN_STEPS = [
  '🔍 Parsing semantic scene tokens…',
  '🏗️ Building photorealistic base layers…',
  '💡 Rendering lighting & particle systems…',
  '🌊 Applying temporal consistency filter…',
  '🎞️ Encoding 4K/60fps output frames…',
]

function AIVideoGenerator() {
  const { aiGenPrompt, setAiGenPrompt, aiGenState, aiGenProgress, runAiGenerate, resetAiGen } = useVideoStore()
  const isGenerating = aiGenState === 'generating'
  const isDone       = aiGenState === 'done'

  const stepIdx = isDone ? GEN_STEPS.length : Math.floor((aiGenProgress / 100) * GEN_STEPS.length)

  return (
    <div>
      <SubHeader emoji="🤖" title="AI Video Generator" badge="VEO 3" />
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
        Describe a visual sequence and Veo 3 generates photorealistic video layers on your timeline.
      </div>

      {/* Prompt box */}
      <textarea
        value={aiGenPrompt}
        onChange={e => setAiGenPrompt(e.target.value)}
        placeholder="Describe your visual sequence… e.g. 'Cinematic drone shot over a neon city at night with rain reflections'"
        disabled={isGenerating}
        style={{
          width: '100%', minHeight: 62, resize: 'none', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8', fontSize: 10, padding: '8px 10px', fontFamily: 'inherit',
          lineHeight: 1.5, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />

      {/* Generate button */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          onClick={runAiGenerate}
          disabled={isGenerating || !aiGenPrompt.trim()}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            fontSize: 10.5, fontWeight: 800, cursor: (isGenerating || !aiGenPrompt.trim()) ? 'default' : 'pointer',
            fontFamily: 'inherit',
            background: isDone
              ? 'linear-gradient(90deg, rgba(52,211,153,0.2), rgba(0,229,255,0.12))'
              : isGenerating
                ? 'rgba(0,229,255,0.06)'
                : 'linear-gradient(90deg, rgba(34,197,94,0.25), rgba(0,229,255,0.18))',
            border: `1px solid ${isDone ? 'rgba(52,211,153,0.4)' : isGenerating ? 'rgba(0,229,255,0.2)' : 'rgba(34,197,94,0.45)'}`,
            color: isDone ? '#34d399' : isGenerating ? '#334155' : '#4ade80',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'all 0.2s',
          }}>
          {isGenerating
            ? <><span style={{ animation: 'aiSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span> Generating…</>
            : isDone ? '✓ Re-Generate' : '[ Generate ]'}
        </button>
        {isDone && (
          <button onClick={resetAiGen} style={{
            padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: '#334155', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
          }}>Reset</button>
        )}
      </div>

      {/* Progress card */}
      {(isGenerating || isDone) && (
        <div style={{
          marginTop: 10, padding: '10px 11px', borderRadius: 9,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,229,255,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#00e5ff', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              🤖 Veo 3 Engine {isDone ? '— COMPLETE' : `generating… ${aiGenProgress}%`}
            </span>
            {isDone && <span style={{ fontSize: 9, color: '#34d399', fontWeight: 800 }}>4 clips placed ✓</span>}
          </div>
          <ProgressBar value={aiGenProgress} color={isDone ? '#34d399' : '#00e5ff'} />
          <div style={{ marginTop: 8 }}>
            {GEN_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
                opacity: i <= stepIdx ? 1 : 0.2, transition: 'opacity 0.3s',
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: i < stepIdx || isDone ? '#34d399' : i === stepIdx ? '#00e5ff' : 'rgba(255,255,255,0.1)',
                  boxShadow: i === stepIdx && !isDone ? '0 0 6px rgba(0,229,255,0.8)' : 'none',
                }} />
                <span style={{ fontSize: 8.5, fontFamily: 'monospace', color: i < stepIdx || isDone ? '#34d399' : i === stepIdx ? '#00e5ff' : '#1e3a5f' }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Feature 2 — AI Audio-to-Video ─────────────────────────────────────────────
const ATOV_STEPS = [
  'Decoding audio waveform…',
  'Detecting beat transients & tempo grid…',
  'Mapping frequency bands to visual motifs…',
  'Generating thematic scene descriptors…',
  'Placing clips on Video Layer 1…',
  '✓ 6 synced video segments placed',
]

function AIAudioToVideo() {
  const { audioToVideoState, setAudioToVideoState, runAudioToVideo } = useVideoStore()
  const [dragOver, setDragOver]     = useState(false)
  const [fileName, setFileName]     = useState('')
  const [analyzeStep, setStep]      = useState(0)
  const fileInputRef                = useRef(null)
  const isAnalyzing                 = audioToVideoState === 'analyzing'
  const isDone                      = audioToVideoState === 'done'

  function startAnalysis(name) {
    setFileName(name)
    setStep(0)
    runAudioToVideo()
    let i = 0
    const tick = () => {
      i++
      setStep(i)
      if (i < ATOV_STEPS.length - 1) setTimeout(tick, 560 + Math.random() * 400)
    }
    setTimeout(tick, 500)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('audio/'))
    if (file) startAnalysis(file.name)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (file) startAnalysis(file.name)
    e.target.value = ''
  }

  return (
    <div>
      <SubHeader emoji="🔮" title="AI Audio-to-Video" badge="SONIC AI" />
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
        Drop a music or voice track. The sonic parser maps frequency peaks to thematic video clips synced to the beat.
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          borderRadius: 9, border: `1.5px dashed ${dragOver ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.3)'}`,
          background: dragOver ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.04)',
          padding: '14px 10px', cursor: 'pointer', textAlign: 'center',
          transition: 'all 0.18s', marginBottom: 10,
        }}>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 18, marginBottom: 5 }}>{dragOver ? '🎵' : '🎤'}</div>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: dragOver ? '#a78bfa' : '#475569' }}>
          {isDone ? `✓ ${fileName}` : 'Drop audio or click to browse'}
        </div>
        {!isDone && <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 2 }}>MP3 · WAV · AAC · OGG</div>}
      </div>

      {/* Analysis animation */}
      {(isAnalyzing || isDone) && (
        <div style={{
          padding: '9px 11px', borderRadius: 9,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)',
        }}>
          {/* Frequency bars */}
          {isAnalyzing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28, marginBottom: 8 }}>
              {Array.from({ length: 32 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  background: 'rgba(139,92,246,0.6)',
                  animation: `atovBar 0.7s ${(i % 5) * 0.14}s ease-in-out infinite alternate`,
                  minHeight: 3,
                }} />
              ))}
            </div>
          )}
          {ATOV_STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
              opacity: i <= analyzeStep ? 1 : 0.2, transition: 'opacity 0.3s',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: i < analyzeStep || isDone ? '#34d399' : i === analyzeStep ? '#a78bfa' : 'rgba(255,255,255,0.1)',
              }} />
              <span style={{ fontSize: 8.5, fontFamily: 'monospace', color: i < analyzeStep || isDone ? '#34d399' : '#475569' }}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Feature 3 — Smart Short Clip ──────────────────────────────────────────────
const DURATION_CHIPS = [
  { id: 'auto', label: '[ Auto ]' },
  { id: '30',   label: '[ <30s ]' },
  { id: '60',   label: '[ 30–60s ]' },
  { id: '90',   label: '[ 60–90s ]' },
]

function SmartShortClip() {
  const { shortClipEnabled, setShortClipEnabled, shortClipDuration, setShortClipDuration } = useVideoStore()

  return (
    <div>
      <SubHeader emoji="✂️" title="Smart Short Clip" badge="9:16" />
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
        Shows a 9:16 mobile crop silhouette over the Program Monitor and partitions long timelines into viral-ready shorts.
      </div>

      {/* Enable toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 8, marginBottom: 10,
        background: shortClipEnabled ? 'rgba(251,146,60,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${shortClipEnabled ? 'rgba(251,146,60,0.3)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: shortClipEnabled ? '#fb923c' : '#475569' }}>
            9:16 Crop Overlay
          </div>
          <div style={{ fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>Shows on Program Monitor</div>
        </div>
        <div onClick={() => setShortClipEnabled(!shortClipEnabled)} style={{
          width: 32, height: 18, borderRadius: 99, cursor: 'pointer',
          background: shortClipEnabled ? 'rgba(251,146,60,0.35)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${shortClipEnabled ? 'rgba(251,146,60,0.6)' : 'rgba(255,255,255,0.1)'}`,
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, borderRadius: '50%', width: 12, height: 12,
            background: shortClipEnabled ? '#fb923c' : '#334155',
            left: shortClipEnabled ? 16 : 2, transition: 'all 0.2s',
            boxShadow: shortClipEnabled ? '0 0 8px rgba(251,146,60,0.8)' : 'none',
          }} />
        </div>
      </div>

      {/* Duration chips */}
      <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        Clip Duration Target
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {DURATION_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setShortClipDuration(chip.id)}
            style={{
              padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
              fontSize: 9.5, fontWeight: 800, fontFamily: 'monospace',
              background: shortClipDuration === chip.id ? 'rgba(251,146,60,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${shortClipDuration === chip.id ? 'rgba(251,146,60,0.45)' : 'rgba(255,255,255,0.08)'}`,
              color: shortClipDuration === chip.id ? '#fb923c' : '#475569',
              transition: 'all 0.15s',
            }}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Virality score */}
      <div style={{
        padding: '8px 10px', borderRadius: 8,
        background: 'linear-gradient(90deg, rgba(239,68,68,0.08), rgba(251,146,60,0.06))',
        border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>🔥</span>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#f87171' }}>Virality Hook Potential Score</div>
          <div style={{ fontSize: 9, color: '#34d399', fontWeight: 700, marginTop: 1 }}>
            ● Nominal — High engagement window detected
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature 6 — AI Translation ────────────────────────────────────────────────
const LANGUAGES = [
  { flag: '🇪🇸', lang: 'Español',         code: 'es' },
  { flag: '🇫🇷', lang: 'Français',         code: 'fr' },
  { flag: '🇩🇪', lang: 'Deutsch',          code: 'de' },
  { flag: '🇯🇵', lang: '日本語',            code: 'ja' },
  { flag: '🇨🇳', lang: '中文 (普通话)',     code: 'zh' },
  { flag: '🇵🇹', lang: 'Português',        code: 'pt' },
  { flag: '🇮🇹', lang: 'Italiano',         code: 'it' },
  { flag: '🇷🇺', lang: 'Русский',          code: 'ru' },
  { flag: '🇸🇦', lang: 'العربية',          code: 'ar' },
  { flag: '🇰🇷', lang: '한국어',            code: 'ko' },
  { flag: '🇮🇳', lang: 'हिन्दी',           code: 'hi' },
  { flag: '🇹🇷', lang: 'Türkçe',           code: 'tr' },
  { flag: '🇳🇱', lang: 'Nederlands',       code: 'nl' },
  { flag: '🇵🇱', lang: 'Polski',           code: 'pl' },
  { flag: '🇸🇪', lang: 'Svenska',          code: 'sv' },
  { flag: '🇻🇳', lang: 'Tiếng Việt',       code: 'vi' },
  { flag: '🇹🇭', lang: 'ภาษาไทย',         code: 'th' },
  { flag: '🇮🇩', lang: 'Bahasa Indonesia', code: 'id' },
  { flag: '🇮🇱', lang: 'עברית',            code: 'he' },
  { flag: '🇬🇷', lang: 'Ελληνικά',         code: 'el' },
  { flag: '🇺🇦', lang: 'Українська',       code: 'uk' },
  { flag: '🇨🇿', lang: 'Čeština',          code: 'cs' },
  { flag: '🇷🇴', lang: 'Română',           code: 'ro' },
]

const TRANS_STEPS = [
  'Isolating vocal stems from mix…',
  'Running speech recognition (Whisper v3)…',
  'Translating transcript to target language…',
  'Synthesizing voice clone in target language…',
  'Processing lip-sync movement matrices…',
  'Encoding localized audio track…',
  '✓ Localized vocal track ready',
]

function AITranslation() {
  const { translationLang, setTranslationLang, translationState, runTranslation } = useVideoStore()
  const [transStep, setTransStep] = useState(0)
  const isProcessing = translationState === 'processing'
  const isDone       = translationState === 'done'
  const selectedLang = LANGUAGES.find(l => l.code === translationLang)

  function handleTranslate() {
    if (!translationLang || isProcessing) return
    setTransStep(0)
    runTranslation()
    let i = 0
    const tick = () => {
      i++
      setTransStep(i)
      if (i < TRANS_STEPS.length - 1) setTimeout(tick, 680 + Math.random() * 320)
    }
    setTimeout(tick, 400)
  }

  return (
    <div>
      <SubHeader emoji="🗣️" title="AI Translation" badge="LIP-SYNC" />
      <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
        Select a target language. AI voice-clones the narrator and synchronizes generative lip-movement layers.
      </div>

      {/* Language selector */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Target Language
        </div>
        <div style={{
          maxHeight: 130, overflowY: 'auto',
          borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.2)',
          scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent',
        }}>
          {LANGUAGES.map(l => (
            <div
              key={l.code}
              onClick={() => setTranslationLang(l.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                cursor: 'pointer',
                background: translationLang === l.code ? 'rgba(0,229,255,0.08)' : 'transparent',
                borderLeft: `2px solid ${translationLang === l.code ? '#00e5ff' : 'transparent'}`,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (translationLang !== l.code) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (translationLang !== l.code) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: 14 }}>{l.flag}</span>
              <span style={{ fontSize: 10, fontWeight: translationLang === l.code ? 800 : 600, color: translationLang === l.code ? '#00e5ff' : '#64748b' }}>
                {l.lang}
              </span>
              {translationLang === l.code && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#00e5ff' }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Translate button */}
      <button
        onClick={handleTranslate}
        disabled={!translationLang || isProcessing}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 8, marginBottom: 10,
          fontSize: 10, fontWeight: 800, cursor: (!translationLang || isProcessing) ? 'default' : 'pointer',
          fontFamily: 'inherit',
          background: isDone
            ? 'linear-gradient(90deg, rgba(52,211,153,0.2), rgba(0,229,255,0.12))'
            : isProcessing
              ? 'rgba(0,229,255,0.05)'
              : 'linear-gradient(90deg, rgba(0,229,255,0.18), rgba(99,102,241,0.15))',
          border: `1px solid ${isDone ? 'rgba(52,211,153,0.35)' : isProcessing ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.3)'}`,
          color: isDone ? '#34d399' : isProcessing ? '#334155' : '#00e5ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'all 0.2s',
        }}>
        {isProcessing
          ? <><span style={{ animation: 'aiSpin 0.7s linear infinite', display: 'inline-block' }}>◌</span> Processing…</>
          : isDone
            ? `✓ ${selectedLang?.flag ?? ''} Track ready — Re-Process`
            : `🗣️ Translate to ${selectedLang?.lang ?? '—'}`}
      </button>

      {/* Processing terminal */}
      {(isProcessing || isDone) && (
        <div style={{
          padding: '9px 11px', borderRadius: 9,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,229,255,0.15)',
        }}>
          {isProcessing && (
            <div style={{
              fontSize: 9, color: '#00e5ff', fontFamily: 'monospace', fontWeight: 800,
              marginBottom: 8, lineHeight: 1.5, borderBottom: '1px solid rgba(0,229,255,0.1)', paddingBottom: 6,
            }}>
              Synchronizing localized vocal tracks and processing generative lip-movement matching layers…
            </div>
          )}
          {/* Audio lock indicator */}
          {isProcessing && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              padding: '5px 8px', borderRadius: 6,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
            }}>
              <span style={{ animation: 'aiSpin 0.7s linear infinite', display: 'inline-block', fontSize: 10 }}>⏳</span>
              <span style={{ fontSize: 8.5, color: '#fbbf24', fontWeight: 700 }}>Master Audio Track — LOCKED</span>
            </div>
          )}
          {TRANS_STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
              opacity: i <= transStep ? 1 : 0.18, transition: 'opacity 0.3s',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: i < transStep || isDone ? '#34d399' : i === transStep ? '#00e5ff' : 'rgba(255,255,255,0.1)',
              }} />
              <span style={{ fontSize: 8.5, fontFamily: 'monospace', color: i < transStep || isDone ? '#34d399' : '#475569' }}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AICreativePanel() {
  return (
    <div style={{ padding: '12px 10px' }}>
      <AIVideoGenerator />
      <Divider />
      <AIAudioToVideo />
      <Divider />
      <SmartShortClip />
      <Divider />
      <AITranslation />

      <style>{`
        @keyframes aiSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes atovBar { from{height:15%} to{height:90%} }
      `}</style>
    </div>
  )
}
