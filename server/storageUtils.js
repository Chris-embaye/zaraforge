'use strict'

/**
 * storageUtils.js
 *
 * Thin wrappers for file I/O used by the AI Cover pipeline.
 * In production swap uploadToPublic() for your Supabase / S3 bucket.
 *
 * For local dev the server exposes its temp/ folder at /api/ai-cover/files/:name
 * so Replicate can reach it — only works when running behind a tunnel (ngrok etc.)
 * or on a server with a public IP.
 */

const https   = require('https')
const http    = require('http')
const fs      = require('fs')
const path    = require('path')

const TEMP_DIR = path.join(__dirname, 'temp')
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

// ── Download any URL to a local path ─────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file  = fs.createWriteStream(destPath)
    proto.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        return reject(new Error(`Download failed: ${res.statusCode} — ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => { fs.unlink(destPath, () => {}); reject(err) })
  })
}

/**
 * Upload a local file to publicly-accessible storage.
 *
 * Dev mode: just returns a local file:// path (Replicate won't reach this —
 * set PUBLIC_BASE_URL env var to your ngrok/tunnel URL to make it work).
 *
 * Production: drop in Supabase Storage or AWS S3 upload here.
 */
async function uploadToPublic(localPath, fileName) {
  const baseUrl = process.env.PUBLIC_BASE_URL

  // ── Supabase Storage (uncomment and configure for production) ──────────────
  // const { createClient } = require('@supabase/supabase-js')
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  // const buffer   = fs.readFileSync(localPath)
  // const { data, error } = await supabase.storage
  //   .from('ai-covers')
  //   .upload(`temp/${fileName}`, buffer, { contentType: 'audio/wav', upsert: true })
  // if (error) throw error
  // return supabase.storage.from('ai-covers').getPublicUrl(`temp/${fileName}`).data.publicUrl

  // ── Local dev: serve via Express static route ──────────────────────────────
  if (!baseUrl) {
    console.warn('[storageUtils] PUBLIC_BASE_URL not set — Replicate may not reach local files.')
    return `file://${localPath}`
  }
  return `${baseUrl}/api/ai-cover/files/${fileName}`
}

module.exports = { downloadFile, uploadToPublic, TEMP_DIR }
