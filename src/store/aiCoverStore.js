import { create } from 'zustand'

/**
 * aiCoverStore — state for the AI Cover / Voice Replacement panel
 *
 * Pipeline states: idle → uploading → processing → done | error
 */
export const useAICoverStore = create((set, get) => ({
  // Input
  sourceFile:  null,   // File object from the file picker
  sourceUrl:   null,   // local object URL for preview
  voiceId:     null,   // selected Kits.ai voice model ID
  pitchShift:  0,      // semitones

  // Job tracking
  jobId:       null,
  status:      'idle', // idle | uploading | processing | done | error

  // Progress from SSE
  step:        0,
  totalSteps:  3,
  message:     '',

  // Output
  downloadUrl: null,   // relative URL to GET the final WAV
  resultBlob:  null,   // fetched Blob for in-browser playback

  // Error
  error: null,

  setSourceFile: (file) => {
    const prev = get().sourceUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ sourceFile: file, sourceUrl: file ? URL.createObjectURL(file) : null, status: 'idle', downloadUrl: null, resultBlob: null, error: null })
  },

  setVoiceId:    (id)  => set({ voiceId: id }),
  setPitchShift: (v)   => set({ pitchShift: v }),

  reset: () => {
    const prev = get().sourceUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ sourceFile: null, sourceUrl: null, voiceId: null, pitchShift: 0, jobId: null, status: 'idle', step: 0, message: '', downloadUrl: null, resultBlob: null, error: null })
  },

  // ── Start the pipeline ─────────────────────────────────────────────────────
  generate: async () => {
    const { sourceFile, voiceId, pitchShift } = get()
    if (!sourceFile || !voiceId) return

    set({ status: 'uploading', error: null, downloadUrl: null, resultBlob: null, step: 0, message: 'Uploading audio…' })

    try {
      // 1. Upload + kick off pipeline
      const form = new FormData()
      form.append('audio',      sourceFile)
      form.append('voiceId',    voiceId)
      form.append('pitchShift', String(pitchShift))

      const startRes = await fetch('/api/ai-cover/generate', { method: 'POST', body: form })
      if (!startRes.ok) throw new Error(`Server error: ${startRes.status}`)
      const { jobId } = await startRes.json()
      set({ jobId, status: 'processing', message: 'Pipeline started…' })

      // 2. Subscribe to SSE progress stream
      await new Promise((resolve, reject) => {
        const es = new EventSource(`/api/ai-cover/stream/${jobId}`)
        es.onmessage = (e) => {
          const d = JSON.parse(e.data)
          set({ step: d.step ?? 0, totalSteps: d.totalSteps ?? 3, message: d.message ?? '' })

          if (d.status === 'done') {
            set({ status: 'done', downloadUrl: d.downloadUrl })
            es.close()
            resolve()
          } else if (d.status === 'error') {
            es.close()
            reject(new Error(d.message || 'Pipeline failed'))
          }
        }
        es.onerror = () => {
          es.close()
          reject(new Error('Lost connection to server'))
        }
      })

      // 3. Pre-fetch the result so it plays in-browser without a download
      const wav  = await fetch(get().downloadUrl)
      const blob = await wav.blob()
      set({ resultBlob: blob })

    } catch (err) {
      set({ status: 'error', error: err.message || 'Something went wrong' })
    }
  },
}))
