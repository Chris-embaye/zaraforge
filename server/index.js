'use strict'

/**
 * server/index.js — ZaraForge API server
 *
 * Start: node server/index.js
 * Env vars needed: REPLICATE_API_KEY, KITS_API_KEY, PUBLIC_BASE_URL
 *
 * The Vite dev server proxies /api/* → http://localhost:3001 (see vite.config.js)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { v4: uuidv4 } = require('uuid')
const { VocalReplacementService } = require('./aiCover')
const { TEMP_DIR } = require('./storageUtils')
const heartbeatRouter  = require('./heartbeat')
const { router: adminGWRouter } = require('./adminGateway')

const app  = express()
const PORT = process.env.API_PORT || 3001

app.use(express.json())

// ── Serve local temp files (dev only — so Replicate can fetch them) ───────────
app.use('/api/ai-cover/files', express.static(TEMP_DIR))

// ── Mount existing routers ─────────────────────────────────────────────────────
app.use('/api/v1', heartbeatRouter)
app.use('/api/v1', adminGWRouter)

// ── Multer: accept uploaded audio, save to temp/ ──────────────────────────────
const upload = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 200 * 1024 * 1024 },  // 200 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'video/mp4']
    cb(null, allowed.includes(file.mimetype))
  },
})

// ── In-memory job store ────────────────────────────────────────────────────────
// Each job: { status, step, totalSteps, message, outputPath, error, sseClients }
const jobs = new Map()

function broadcastJob(jobId, update) {
  const job = jobs.get(jobId)
  if (!job) return
  Object.assign(job, update)
  for (const res of job.sseClients) {
    res.write(`data: ${JSON.stringify({ ...update, jobId })}\n\n`)
    if (update.status === 'done' || update.status === 'error') {
      res.end()
    }
  }
}

// ── POST /api/ai-cover/generate ───────────────────────────────────────────────
app.post('/api/ai-cover/generate', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' })
  }

  const voiceId    = req.body.voiceId    || 'vc_default'
  const pitchShift = parseInt(req.body.pitchShift ?? '0', 10)
  const jobId      = uuidv4()

  jobs.set(jobId, {
    status:     'queued',
    step:       0,
    totalSteps: 3,
    message:    'Job queued…',
    outputPath: null,
    error:      null,
    sseClients: [],
  })

  // Acknowledge immediately — processing is async
  res.json({ jobId })

  // Run pipeline in the background
  setImmediate(async () => {
    const audioPath = req.file.path
    try {
      broadcastJob(jobId, { status: 'processing', step: 0, message: 'Starting pipeline…' })

      const outputPath = await VocalReplacementService.processAICover(
        audioPath,
        voiceId,
        pitchShift,
        (step, total, message) => {
          broadcastJob(jobId, { status: 'processing', step, totalSteps: total, message })
        },
      )

      jobs.get(jobId).outputPath = outputPath
      broadcastJob(jobId, {
        status:  'done',
        step:    3,
        message: 'AI Cover ready!',
        downloadUrl: `/api/ai-cover/download/${jobId}`,
      })

    } catch (err) {
      console.error(`[aiCover] Job ${jobId} failed:`, err.message)
      broadcastJob(jobId, { status: 'error', message: err.message || 'Pipeline failed' })
    } finally {
      // Clean up the uploaded source file
      if (fs.existsSync(audioPath)) fs.unlink(audioPath, () => {})
      // Remove job from memory after 10 minutes
      setTimeout(() => {
        const job = jobs.get(jobId)
        if (job?.outputPath && fs.existsSync(job.outputPath)) {
          fs.unlink(job.outputPath, () => {})
        }
        jobs.delete(jobId)
      }, 10 * 60 * 1000)
    }
  })
})

// ── GET /api/ai-cover/stream/:jobId — SSE progress feed ──────────────────────
app.get('/api/ai-cover/stream/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })

  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  // Send current state immediately
  res.write(`data: ${JSON.stringify({ status: job.status, step: job.step, totalSteps: job.totalSteps, message: job.message })}\n\n`)

  if (job.status === 'done' || job.status === 'error') {
    return res.end()
  }

  job.sseClients.push(res)
  req.on('close', () => {
    job.sseClients = job.sseClients.filter(c => c !== res)
  })
})

// ── GET /api/ai-cover/download/:jobId ────────────────────────────────────────
app.get('/api/ai-cover/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(404).json({ error: 'Output not ready or expired' })
  }
  res.download(job.outputPath, `ai_cover_${req.params.jobId}.wav`)
})

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

app.listen(PORT, () => {
  console.log(`[ZaraForge API] Listening on http://localhost:${PORT}`)
  console.log(`  REPLICATE_API_KEY : ${process.env.REPLICATE_API_KEY ? 'set' : 'MISSING'}`)
  console.log(`  KITS_API_KEY      : ${process.env.KITS_API_KEY      ? 'set' : 'MISSING'}`)
  console.log(`  PUBLIC_BASE_URL   : ${process.env.PUBLIC_BASE_URL   || '(dev: local files — set for production)'}`)
})
