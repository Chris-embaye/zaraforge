'use strict'

// ── Electron Forge + Fuses Configuration ─────────────────────────────────────
// Handles packaging, fuse injection, code signing, and notarization.
// Install deps: npm install --save-dev @electron/fuses @electron-forge/cli
//               @electron-forge/maker-dmg @electron-forge/maker-squirrel
//               @electron-forge/maker-zip

const { FuseV1Options, FuseVersion } = require('@electron/fuses')
const path = require('path')
const crypto = require('crypto')
const fs   = require('fs')

module.exports = {
  packagerConfig: {
    name:        'ZaraForge',
    executableName: 'ZaraForge',
    appVersion:  '1.0.0',
    appBundleId: 'app.zaraforge.desktop',
    icon:        path.join(__dirname, '../public/zaraforge-logo'),

    // ── ASAR packaging ──────────────────────────────────────────────────────
    asar:        true,
    asarUnpack: ['**/node_modules/bytenode/**'],  // bytenode native module stays unpacked

    // ── macOS code signing (requires APPLE_ID + TEAM_ID env vars) ───────────
    osxSign: {
      identity:           process.env.APPLE_SIGNING_IDENTITY,  // 'Developer ID Application: ...'
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      entitlements:        path.join(__dirname, 'build/entitlements.mac.plist'),
      'entitlements-inherit': path.join(__dirname, 'build/entitlements.mac.plist'),
    },

    // ── macOS notarization ───────────────────────────────────────────────────
    osxNotarize: {
      tool:     'notarytool',
      appleId:              process.env.APPLE_ID,
      appleIdPassword:      process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId:               process.env.APPLE_TEAM_ID,
    },
  },

  // ── Rebuild native modules for Electron ───────────────────────────────────
  rebuildConfig: {},

  // ── Distribution makers ───────────────────────────────────────────────────
  makers: [
    // macOS: signed + notarized DMG
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: path.join(__dirname, 'build/dmg-background.png'),
        format:     'ULFO',
        name:       'ZaraForge',
      },
    },
    // macOS: zip for auto-updater
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // Windows: Squirrel installer (.exe)
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name:             'ZaraForge',
        setupExe:         'ZaraForge-Setup.exe',
        setupMsi:         'ZaraForge-Setup.msi',
        signWithParams:   process.env.WIN_SIGN_PARAMS,  // set by CI: /fd sha256 /tr ...
        certificateFile:  process.env.WIN_CERT_PATH,
        certificatePassword: process.env.WIN_CERT_PASSWORD,
        remoteReleases:   'https://releases.zaraforge.app/win',
      },
    },
  ],

  // ── Plugins: inject Electron Fuses after packaging ────────────────────────
  plugins: [
    {
      name: '@electron-forge/plugin-fuses',
      config: {
        version: FuseVersion.V1,

        // ── FUSE 1: Disable RunAsNode ────────────────────────────────────────
        // Prevents `ELECTRON_RUN_AS_NODE=1 ./ZaraForge main.js` attacks
        [FuseV1Options.RunAsNode]: false,

        // ── FUSE 2: ASAR Integrity Validation ────────────────────────────────
        // OS-level SHA-256 hash check of app.asar at startup.
        // Any file modification = instant termination.
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,

        // ── FUSE 3: Load App Only From ASAR ──────────────────────────────────
        // Blocks loading JS from any directory outside the sealed app.asar
        [FuseV1Options.OnlyLoadAppFromAsar]: true,

        // ── FUSE 4: Disable Node CLI Inspect ─────────────────────────────────
        // Blocks --inspect / --inspect-brk debugging flags
        [FuseV1Options.EnableNodeCliInspectArguments]: false,

        // ── FUSE 5: Cookie Encryption ─────────────────────────────────────────
        // Encrypts cookies stored by Chromium with OS keychain
        [FuseV1Options.EnableCookieEncryption]: true,

        // ── FUSE 6: No extra file protocol privileges ─────────────────────────
        [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
      },
    },
  ],

  // ── Post-package hook: inject real ASAR SHA-256 into integrity manifest ───
  hooks: {
    postPackage: async (config, buildResult) => {
      console.log('\n🔒 [PostPackage] Computing ASAR SHA-256...')

      for (const outputPath of buildResult.outputPaths) {
        const asarPath      = path.join(outputPath, 'resources', 'app.asar')
        const manifestPath  = path.join(outputPath, 'resources', 'integrity-manifest.json')

        if (!fs.existsSync(asarPath)) continue

        const hash = crypto
          .createHash('sha256')
          .update(fs.readFileSync(asarPath))
          .digest('hex')

        const manifest = {
          version:    config.packagerConfig.appVersion,
          builtAt:    new Date().toISOString(),
          asarSha256: hash,
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
        console.log(`  ✅ ASAR SHA-256: ${hash.slice(0, 16)}… → ${manifestPath}`)
      }
    },
  },
}
