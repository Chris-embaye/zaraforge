#!/usr/bin/env node
'use strict'

// ── V8 Bytecode Compilation Pipeline ─────────────────────────────────────────
// Compiles Electron main + preload JS → V8 bytecode (.jsc) using bytenode.
// Run after `npm run build:web`:
//   node build/bytecode-plugin.js
//
// Output:
//   electron/main.jsc    ← compiled main process bytecode
//   electron/preload.jsc ← compiled preload bytecode
//
// In production, electron/bootstrap.js loads these .jsc files via bytenode.

const bytenode = require('bytenode')
const path     = require('path')
const fs       = require('fs')

const ROOT     = path.resolve(__dirname, '..')
const ELECTRON = ROOT

const TARGETS = [
  {
    src:  path.join(ELECTRON, 'main.js'),
    out:  path.join(ELECTRON, 'main.jsc'),
    name: 'Main Process',
  },
  {
    src:  path.join(ELECTRON, 'preload.js'),
    out:  path.join(ELECTRON, 'preload.jsc'),
    name: 'Preload Script',
  },
]

console.log('\n⚡ ZaraForge V8 Bytecode Compiler\n' + '─'.repeat(44))

let allOk = true

for (const { src, out, name } of TARGETS) {
  if (!fs.existsSync(src)) {
    console.error(`  ✗ ${name}: source not found — ${src}`)
    allOk = false
    continue
  }

  try {
    bytenode.compileFile({ filename: src, output: out, electron: true })
    const sizeKB = (fs.statSync(out).size / 1024).toFixed(1)
    console.log(`  ✅ ${name}: ${path.basename(src)} → ${path.basename(out)} (${sizeKB} KB)`)
  } catch (err) {
    console.error(`  ✗ ${name}: compilation failed — ${err.message}`)
    allOk = false
  }
}

// ── Write bootstrap.js — the new electron entry point ─────────────────────────
// electron-builder points "main" at bootstrap.js, not main.js
const bootstrapSrc = `'use strict'
// ── V8 Bytecode Bootstrap ─────────────────────────────────────────────────────
// Loads bytenode runtime, then executes compiled main process bytecode.
// This tiny file IS the entry point. main.jsc contains all app logic.
require('bytenode')
require('./main.jsc')
`
const bootstrapPath = path.join(ELECTRON, 'bootstrap.js')
fs.writeFileSync(bootstrapPath, bootstrapSrc, 'utf8')
console.log(`  ✅ Bootstrap:  bootstrap.js written (${bootstrapSrc.length} bytes)`)

// ── Generate ASAR integrity manifest ──────────────────────────────────────────
// This manifest is embedded in the package at build time.
// main.js reads it at startup and verifies app.asar SHA-256.
// (The actual asar hash is computed by the postPackage hook in forge.config.js)
const manifestPath = path.join(ROOT, 'dist', 'integrity-manifest.json')
const stub = {
  version:    require(path.join(ROOT, 'package.json')).version,
  builtAt:    new Date().toISOString(),
  asarSha256: '__REPLACED_BY_POSTPACKAGE_HOOK__',
}
fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
fs.writeFileSync(manifestPath, JSON.stringify(stub, null, 2))
console.log(`  ✅ Manifest:   integrity-manifest.json (stub — hash injected post-pack)`)

console.log('\n' + (allOk ? '✅ Bytecode compilation complete.' : '❌ Compilation had errors.') + '\n')
if (!allOk) process.exit(1)
