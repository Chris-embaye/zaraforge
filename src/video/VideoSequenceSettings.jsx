import { useVideoStore } from '../store/videoStore'

const FPS_OPTIONS    = [23.976, 24, 25, 29.97, 30, 48, 59.94, 60]
const RESOLUTION_PRESETS = [
  { label: '720p HD',   width: 1280,  height: 720  },
  { label: '1080p FHD', width: 1920,  height: 1080 },
  { label: '2K DCI',    width: 2048,  height: 1080 },
  { label: '2K QHD',    width: 2560,  height: 1440 },
  { label: '4K UHD',    width: 3840,  height: 2160 },
  { label: '4K DCI',    width: 4096,  height: 2160 },
  { label: 'Custom',    width: null,  height: null  },
]
const SAMPLE_RATES = [44100, 48000, 96000]
const PIXEL_AR     = ['Square', 'D1/DV NTSC', 'D1/DV PAL', 'Anamorphic 2:1', 'HD Anamorphic']
const CODECS       = ['H.264', 'H.265 / HEVC', 'ProRes 422 HQ', 'DNxHD 185x', 'AV1']

function Label({ children }) {
  return <div style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5 }}>{children}</div>
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
      <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        flex: 1, padding: '5px 8px', borderRadius: 5,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#e2e8f0', fontSize: 10, outline: 'none', fontFamily: 'inherit',
      }}>
        {options.map(o => (
          <option key={typeof o === 'object' ? o.value ?? o.label : o}
            value={typeof o === 'object' ? (o.value ?? o.label) : o}
            style={{ background: '#0f0f1a' }}>
            {typeof o === 'object' ? o.label : o}
          </option>
        ))}
      </select>
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
      <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(+e.target.value)}
        style={{ width: 90, padding: '5px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 10, outline: 'none', fontFamily: 'monospace' }} />
      {suffix && <span style={{ fontSize: 9.5, color: '#475569' }}>{suffix}</span>}
    </div>
  )
}

export default function VideoSequenceSettings() {
  const { sequenceSettings, setSequenceSettings, setShowSequenceSettings } = useVideoStore()
  const ss = sequenceSettings

  const activeRes = RESOLUTION_PRESETS.find(r => r.width === ss.width && r.height === ss.height) ?? RESOLUTION_PRESETS[RESOLUTION_PRESETS.length - 1]

  function applyResPreset(label) {
    const preset = RESOLUTION_PRESETS.find(r => r.label === label)
    if (preset && preset.width) {
      setSequenceSettings('width',  preset.width)
      setSequenceSettings('height', preset.height)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 310,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 520, background: '#0f0f1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #111118' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Sequence Settings</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{ss.name}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowSequenceSettings(false)} style={{
            width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: 16, fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 24px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Sequence name */}
          <Label>Sequence Name</Label>
          <div style={{ marginBottom: 16 }}>
            <input value={ss.name} onChange={e => setSequenceSettings('name', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* Video */}
          <Label>Video</Label>

          {/* Resolution preset */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>Resolution Preset</span>
            <select value={activeRes.label} onChange={e => applyResPreset(e.target.value)} style={{
              flex: 1, padding: '5px 8px', borderRadius: 5,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', fontSize: 10, outline: 'none', fontFamily: 'inherit',
            }}>
              {RESOLUTION_PRESETS.map(r => (
                <option key={r.label} value={r.label} style={{ background: '#0f0f1a' }}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Width / Height side-by-side */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9.5, color: '#475569', display: 'block', marginBottom: 4 }}>Width (px)</span>
              <input type="number" value={ss.width} min={128} max={8192} step={2}
                onChange={e => setSequenceSettings('width', +e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a5b4fc', fontSize: 10, outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9.5, color: '#475569', display: 'block', marginBottom: 4 }}>Height (px)</span>
              <input type="number" value={ss.height} min={128} max={4320} step={2}
                onChange={e => setSequenceSettings('height', +e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a5b4fc', fontSize: 10, outline: 'none', fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* Aspect ratio display */}
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#475569' }}>Aspect ratio:</span>
            <span style={{ fontSize: 9.5, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>
              {ss.width && ss.height ? (() => {
                const g = (a, b) => b ? g(b, a % b) : a
                const d = g(ss.width, ss.height)
                return `${ss.width / d}:${ss.height / d}`
              })() : '—'}
            </span>
            <span style={{ fontSize: 9, color: '#334155', marginLeft: 8 }}>
              {ss.width}×{ss.height}
            </span>
          </div>

          {/* Frame rate */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>Frame Rate</span>
            <select value={ss.fps} onChange={e => setSequenceSettings('fps', +e.target.value)} style={{
              flex: 1, padding: '5px 8px', borderRadius: 5,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', fontSize: 10, outline: 'none', fontFamily: 'inherit',
            }}>
              {FPS_OPTIONS.map(f => (
                <option key={f} value={f} style={{ background: '#0f0f1a' }}>{f} fps</option>
              ))}
            </select>
          </div>

          <SelectRow label="Pixel Aspect Ratio" value={ss.pixelAR}
            onChange={v => setSequenceSettings('pixelAR', v)}
            options={PIXEL_AR} />

          <SelectRow label="Codec" value={ss.codec}
            onChange={v => setSequenceSettings('codec', v)}
            options={CODECS} />

          {/* Divider */}
          <div style={{ borderTop: '1px solid #111118', margin: '14px 0' }} />

          {/* Audio */}
          <Label>Audio</Label>

          <SelectRow label="Sample Rate"
            value={ss.sampleRate}
            onChange={v => setSequenceSettings('sampleRate', +v)}
            options={SAMPLE_RATES.map(r => ({ label: `${r / 1000} kHz`, value: r }))} />

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>Bit Depth</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[16, 24, 32].map(b => (
                <button key={b} onClick={() => setSequenceSettings('bitDepth', b)} style={{
                  padding: '4px 12px', borderRadius: 5, border: '1px solid',
                  borderColor: ss.bitDepth === b ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)',
                  background: ss.bitDepth === b ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: ss.bitDepth === b ? '#a5b4fc' : '#475569',
                  fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {b}-bit
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10 }}>
            <span style={{ fontSize: 10, color: '#475569', width: 110, flexShrink: 0 }}>Audio Channels</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Stereo', '5.1 Surround', '7.1 Surround'].map(ch => (
                <button key={ch} onClick={() => setSequenceSettings('audioChannels', ch)} style={{
                  padding: '4px 12px', borderRadius: 5, border: '1px solid',
                  borderColor: ss.audioChannels === ch ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)',
                  background: ss.audioChannels === ch ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
                  color: ss.audioChannels === ch ? '#34d399' : '#475569',
                  fontSize: 9.5, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Summary box */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sequence Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 0' }}>
              {[
                ['Resolution', `${ss.width}×${ss.height}`],
                ['Frame Rate', `${ss.fps} fps`],
                ['Codec', ss.codec],
                ['Sample Rate', `${(ss.sampleRate / 1000).toFixed(1)} kHz`],
                ['Pixel AR', ss.pixelAR],
                ['Bit Depth', `${ss.bitDepth || 24}-bit`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 24 }}>
                  <span style={{ fontSize: 9, color: '#475569' }}>{k}</span>
                  <span style={{ fontSize: 9, color: '#a5b4fc', fontFamily: 'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #111118' }}>
          <button onClick={() => setShowSequenceSettings(false)} style={{
            flex: 1, padding: '9px 0', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: '#475569',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={() => setShowSequenceSettings(false)} style={{
            flex: 2, padding: '9px 0', borderRadius: 7, border: '1px solid rgba(99,102,241,0.4)',
            background: 'linear-gradient(90deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',
            color: '#e2e8f0', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>OK — Apply Settings</button>
        </div>
      </div>
    </div>
  )
}
