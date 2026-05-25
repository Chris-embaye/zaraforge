/**
 * pitchEngine.js
 * Browser-based pitch detection, correction, and audio export utilities.
 * All processing runs inside the Web Audio API — no external dependencies.
 */

// ─── Musical scale definitions ────────────────────────────────────────────────
// Each value is an array of semitone offsets (0 = C) within one octave.
export const SCALES = {
  'C Major':   [0, 2, 4, 5, 7, 9, 11],
  'G Major':   [7, 9, 11, 0, 2, 4, 6],
  'D Major':   [2, 4, 6, 7, 9, 11, 1],
  'A Major':   [9, 11, 1, 2, 4, 6, 8],
  'E Major':   [4, 6, 8, 9, 11, 1, 3],
  'F Major':   [5, 7, 9, 10, 0, 2, 4],
  'A Minor':   [9, 11, 0, 2, 4, 5, 7],
  'E Minor':   [4, 6, 7, 9, 11, 0, 2],
  'D Minor':   [2, 4, 5, 7, 9, 10, 0],
  'B Minor':   [11, 1, 2, 4, 6, 7, 9],
  'G Minor':   [7, 9, 10, 0, 2, 3, 5],
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ─── Frequency / MIDI helpers ─────────────────────────────────────────────────

export const freqToMidi = (freq) => 12 * Math.log2(freq / 440) + 69
export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12)
export const midiToName = (midi) => {
  if (midi == null || isNaN(midi)) return '—'
  const n = Math.round(midi)
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}

// ─── Signal utilities ─────────────────────────────────────────────────────────

export function calcRMS(samples) {
  let s = 0
  for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i]
  return Math.sqrt(s / samples.length)
}

// ─── Pitch detection — autocorrelation (YIN-inspired) ────────────────────────
// Returns the fundamental frequency in Hz, or null if undetected.
export function detectPitch(samples, sampleRate) {
  const SIZE = Math.min(samples.length, 2048)

  // Step 1 — normalised square difference function
  const nsdf = new Float32Array(SIZE)
  for (let lag = 0; lag < SIZE; lag++) {
    let acf = 0, energy = 0
    for (let i = 0; i < SIZE - lag; i++) {
      acf    += samples[i] * samples[i + lag]
      energy += samples[i] * samples[i] + samples[i + lag] * samples[i + lag]
    }
    nsdf[lag] = energy > 0 ? 2 * acf / energy : 0
  }

  // Step 2 — find peak after the first zero crossing
  let d = 1
  while (d < SIZE - 1 && nsdf[d] > 0) d++   // skip to first negative
  while (d < SIZE - 1 && nsdf[d] <= 0) d++   // then to next positive

  const minLag = Math.ceil(sampleRate / 1600) // 1600 Hz ceiling
  const maxLag = Math.floor(sampleRate / 60)  //   60 Hz floor

  let maxVal = -Infinity, maxPos = -1
  for (let i = Math.max(d, minLag); i < Math.min(SIZE - 1, maxLag); i++) {
    if (nsdf[i] > maxVal) { maxVal = nsdf[i]; maxPos = i }
  }

  if (maxPos < 0 || maxVal < 0.1) return null  // weak/no pitch

  // Step 3 — parabolic interpolation for sub-sample accuracy
  if (maxPos > 0 && maxPos < SIZE - 1) {
    const a = nsdf[maxPos - 1], b = nsdf[maxPos], c = nsdf[maxPos + 1]
    const denom = 2 * (2 * b - a - c)
    const offset = denom !== 0 ? (c - a) / denom : 0
    return sampleRate / (maxPos + offset)
  }
  return sampleRate / maxPos
}

// ─── Scale snapping ───────────────────────────────────────────────────────────
// Returns the frequency of the nearest scale note to `freq`.
export function findNearestScaleFreq(freq, scaleSemitones) {
  const midi     = freqToMidi(freq)
  const semInOct = ((midi % 12) + 12) % 12

  let minDist = Infinity, nearest = scaleSemitones[0]
  for (const s of scaleSemitones) {
    let d = Math.abs(semInOct - s)
    if (d > 6) d = 12 - d
    if (d < minDist) { minDist = d; nearest = s }
  }

  const octave = Math.floor(midi / 12)
  let targetMidi = octave * 12 + nearest
  if (Math.abs(targetMidi - midi) > 6) targetMidi += targetMidi < midi ? 12 : -12
  return midiToFreq(targetMidi)
}

// ─── Frame-level pitch shifter (time-preserving, overlap-add) ────────────────
// Shifts pitch by `ratio` (2^(cents/1200)) while keeping frame length constant.
function shiftFrame(frame, ratio) {
  const len = frame.length
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    // Hann window to eliminate clicking at frame boundaries
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)))
    const srcPos = i / ratio
    const lo = Math.floor(srcPos), hi = lo + 1
    const frac = srcPos - lo
    const s = hi < len
      ? frame[lo] * (1 - frac) + frame[hi] * frac
      : lo < len ? frame[lo] : 0
    out[i] = s * w
  }
  return out
}

// ─── Main auto-tune processor ─────────────────────────────────────────────────
/**
 * Applies pitch correction to inputBuffer frame-by-frame using overlap-add.
 * @param {AudioBuffer}  inputBuffer   — raw vocal recording
 * @param {AudioContext} audioCtx      — for creating the output buffer
 * @param {number[]}     scaleSemitones — target scale (from SCALES)
 * @param {number}       intensity     — 0–100 correction strength
 * @param {function}     onProgress    — called with 0–100 percent
 * @returns {Promise<AudioBuffer>}
 */
export async function processAutoTune(inputBuffer, audioCtx, scaleSemitones, intensity, onProgress) {
  const SR   = inputBuffer.sampleRate
  const chs  = inputBuffer.numberOfChannels
  const len  = inputBuffer.length
  const WINDOW = 2048
  const HOP    = 512
  const totalHops = Math.ceil(len / HOP)

  // Allocate output arrays
  const output = Array.from({ length: chs }, () => new Float32Array(len))
  let hopIdx = 0

  for (let pos = 0; pos < len; pos += HOP) {
    const frameEnd = Math.min(pos + WINDOW, len)

    for (let c = 0; c < chs; c++) {
      const inputData = inputBuffer.getChannelData(c)
      const frame = new Float32Array(inputData.subarray(pos, frameEnd))

      let ratio = 1.0
      const rms = calcRMS(frame)

      if (rms > 0.003 && intensity > 0) {
        const freq = detectPitch(frame, SR)
        if (freq && freq > 60 && freq < 2000) {
          const target = findNearestScaleFreq(freq, scaleSemitones)
          let cents = 1200 * Math.log2(target / freq) * (intensity / 100)

          // ≥ 85% intensity → hard semitone quantisation (T-Pain "robot" snap)
          if (intensity >= 85) {
            const hard = Math.round(cents / 100) * 100 * (intensity / 100)
            cents = hard * 0.7 + cents * 0.3
          }
          ratio = Math.pow(2, cents / 1200)
        }
      }

      const shifted = shiftFrame(frame, ratio)
      for (let i = 0; i < shifted.length && pos + i < len; i++) {
        output[c][pos + i] += shifted[i]
      }
    }

    hopIdx++
    if (hopIdx % 50 === 0) {
      onProgress(Math.round((hopIdx / totalHops) * 100))
      await new Promise(r => setTimeout(r, 0))  // yield to keep UI alive
    }
  }

  onProgress(100)

  // Build output AudioBuffer; normalise to prevent clipping
  const out = audioCtx.createBuffer(chs, len, SR)
  for (let c = 0; c < chs; c++) {
    const max = output[c].reduce((m, v) => Math.max(m, Math.abs(v)), 0)
    if (max > 1) for (let i = 0; i < len; i++) output[c][i] /= max
    out.copyToChannel(output[c], c)
  }
  return out
}

// ─── Mix & export ─────────────────────────────────────────────────────────────
/**
 * Renders vocal + backing into a single stereo WAV file and triggers download.
 */
export async function mixAndDownload({ vocalBuffer, backingBuffer, vocalGain, backingGain }) {
  const SR = (vocalBuffer || backingBuffer).sampleRate
  const totalLen = Math.max(vocalBuffer?.length ?? 0, backingBuffer?.length ?? 0)
  if (!totalLen) return

  const offline = new OfflineAudioContext(2, totalLen, SR)
  const master  = offline.createGain()
  master.connect(offline.destination)

  const addTrack = (buf, gainVal) => {
    const src  = offline.createBufferSource()
    const gain = offline.createGain()
    src.buffer = buf
    gain.gain.value = gainVal
    src.connect(gain)
    gain.connect(master)
    src.start(0)
  }

  if (vocalBuffer)  addTrack(vocalBuffer,  vocalGain)
  if (backingBuffer) addTrack(backingBuffer, backingGain)

  const rendered = await offline.startRendering()
  const wav      = encodeWAV(rendered)
  const url      = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
  const a        = Object.assign(document.createElement('a'), { href: url, download: 'vocal-mix.wav' })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ─── WAV encoder ──────────────────────────────────────────────────────────────
export function encodeWAV(buffer) {
  const chs        = buffer.numberOfChannels
  const SR         = buffer.sampleRate
  const numSamples = buffer.length
  const dataLen    = numSamples * chs * 2
  const view       = new DataView(new ArrayBuffer(44 + dataLen))

  const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, chs, true); view.setUint32(24, SR, true)
  view.setUint32(28, SR * chs * 2, true); view.setUint16(32, chs * 2, true)
  view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, dataLen, true)

  let off = 44
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < chs; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      off += 2
    }
  }
  return view.buffer
}
