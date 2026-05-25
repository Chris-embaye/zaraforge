'use strict'

/**
 * aiCover.js — AI Cover Pipeline Service
 *
 * Orchestrates the 3-step vocal replacement pipeline:
 *   1. Stem separation  — Replicate htdemucs
 *   2. Voice conversion — Kits.ai RVC
 *   3. Audio merge      — ffmpeg amix
 *
 * Usage:
 *   const { VocalReplacementService } = require('./aiCover')
 *   await VocalReplacementService.processAICover(audioPath, voiceId, pitchShift, onProgress)
 *
 * Required env vars:
 *   REPLICATE_API_KEY   — from replicate.com
 *   KITS_API_KEY        — from kits.ai
 *   PUBLIC_BASE_URL     — your server's public URL (for Replicate to fetch files)
 */

const axios   = require('axios')
const ffmpeg  = require('fluent-ffmpeg')
const fs      = require('fs')
const path    = require('path')
const { downloadFile, uploadToPublic, TEMP_DIR } = require('./storageUtils')

// htdemucs model on Replicate — 4-stem separation (vocals, drums, bass, other)
const HTDEMUCS_VERSION = 'meta/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953'

const api = axios.create({
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Polling helper — retries until status === 'succeeded' or 'failed' ─────────
async function pollReplicate(predictionId, maxWaitMs = 300_000) {
  const start    = Date.now()
  const interval = 4_000  // check every 4 s

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval))

    const { data } = await api.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}` } },
    )

    if (data.status === 'succeeded') return data.output
    if (data.status === 'failed')
      throw new Error(`Replicate prediction failed: ${data.error || 'unknown'}`)
  }

  throw new Error('Replicate polling timed out (5 min)')
}

// ── Polling helper for Kits.ai ────────────────────────────────────────────────
async function pollKits(conversionId, maxWaitMs = 180_000) {
  const start    = Date.now()
  const interval = 3_000

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval))

    const { data } = await api.get(
      `https://api.kits.ai/api/ai-vocal-remover/v2/conversion/${conversionId}`,
      { headers: { Authorization: `Bearer ${process.env.KITS_API_KEY}` } },
    )

    if (data.status === 'completed') return data.output_url
    if (data.status === 'failed')
      throw new Error(`Kits.ai conversion failed: ${data.error || 'unknown'}`)
  }

  throw new Error('Kits.ai polling timed out (3 min)')
}

class VocalReplacementService {

  /**
   * Full pipeline entry point.
   *
   * @param {string}   audioPath   — local path to the source song
   * @param {string}   voiceId     — Kits.ai voice model ID
   * @param {number}   pitchShift  — semitones (-12 … +12)
   * @param {Function} onProgress  — called with (step, totalSteps, message)
   * @returns {string} outputPath  — local path of the final merged WAV
   */
  static async processAICover(audioPath, voiceId, pitchShift = 0, onProgress = () => {}) {
    const stamp = Date.now()
    const tmpVocal  = path.join(TEMP_DIR, `vocal_${stamp}.wav`)
    const tmpInst   = path.join(TEMP_DIR, `inst_${stamp}.wav`)
    const tmpCloned = path.join(TEMP_DIR, `cloned_${stamp}.wav`)
    const outputPath = path.join(TEMP_DIR, `final_${stamp}.wav`)

    try {
      // ── Step 1: Stem separation ─────────────────────────────────────────────
      onProgress(1, 3, 'Separating vocals from instrumental…')
      const { vocalsUrl, instrumentalUrl } = await this.separateStems(audioPath, stamp)

      await downloadFile(vocalsUrl,      tmpVocal)
      await downloadFile(instrumentalUrl, tmpInst)
      onProgress(1, 3, 'Stems separated — vocals & instrumental isolated')

      // ── Step 2: Voice-to-voice conversion ──────────────────────────────────
      onProgress(2, 3, `Converting vocals to voice model ${voiceId}…`)
      const clonedUrl = await this.convertVoice(tmpVocal, voiceId, pitchShift, stamp)
      await downloadFile(clonedUrl, tmpCloned)
      onProgress(2, 3, 'Voice conversion complete')

      // ── Step 3: Mix instrumental + cloned vocals ────────────────────────────
      onProgress(3, 3, 'Merging instrumental with converted vocals…')
      await this.mergeAudio(tmpInst, tmpCloned, outputPath)
      onProgress(3, 3, 'Final mix ready')

      return outputPath

    } finally {
      // Always clean up intermediates, even on error
      for (const f of [tmpVocal, tmpInst, tmpCloned]) {
        if (fs.existsSync(f)) fs.unlink(f, () => {})
      }
    }
  }

  // ── Step 1: Stem Separation (Replicate htdemucs) ───────────────────────────
  static async separateStems(audioPath, stamp) {
    // Upload source to publicly-accessible storage so Replicate can fetch it
    const publicUrl = await uploadToPublic(audioPath, `source_${stamp}.wav`)

    const { data: prediction } = await api.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: HTDEMUCS_VERSION,
        input: {
          audio:        publicUrl,
          stems:        'vocals,other',   // only split what we need
          output_format: 'wav',
        },
      },
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}` } },
    )

    const output = await pollReplicate(prediction.id)

    // htdemucs output is an object: { vocals: URL, other: URL, ... }
    return {
      vocalsUrl:       output.vocals ?? output.vocal,
      instrumentalUrl: output.other  ?? output.no_vocals ?? output.bass_drums_other,
    }
  }

  // ── Step 2: Voice Conversion (Kits.ai RVC) ─────────────────────────────────
  static async convertVoice(vocalPath, voiceId, pitchShift, stamp) {
    const publicUrl = await uploadToPublic(vocalPath, `vocal_input_${stamp}.wav`)

    const { data } = await api.post(
      'https://api.kits.ai/api/ai-vocal-remover/v2/conversion',
      {
        voice_model_id: voiceId,
        sound_file_url: publicUrl,
        pitch_shift:    pitchShift,
      },
      { headers: { Authorization: `Bearer ${process.env.KITS_API_KEY}` } },
    )

    return pollKits(data.id)
  }

  // ── Step 3: ffmpeg mix (instrumental + converted vocals) ───────────────────
  static async mergeAudio(instrumentalPath, vocalsPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(instrumentalPath)
        .input(vocalsPath)
        .complexFilter([
          // Normalize each stream individually before mixing
          '[0:a]loudnorm=I=-14:TP=-1:LRA=11[inst]',
          '[1:a]loudnorm=I=-14:TP=-1:LRA=11[vox]',
          '[inst][vox]amix=inputs=2:duration=first:dropout_transition=2[out]',
        ])
        .map('[out]')
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(44100)
        .save(outputPath)
        .on('end',   resolve)
        .on('error', reject)
    })
  }
}

module.exports = { VocalReplacementService }
