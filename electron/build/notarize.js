'use strict'

// ── macOS Notarization Hook ───────────────────────────────────────────────────
// Called by electron-builder after code-signing (afterSign hook).
// Uploads the signed app to Apple's notary service, waits for approval,
// then staples the notarization ticket into the app bundle.
//
// Required env vars (set in CI / GitHub Actions Secrets):
//   APPLE_ID                   your Apple Developer account email
//   APPLE_APP_SPECIFIC_PASSWORD  app-specific password from appleid.apple.com
//   APPLE_TEAM_ID              10-char team identifier from developer.apple.com
//
// Install: npm install --save-dev electron-notarize

const { notarize } = require('electron-notarize')
const path         = require('path')

module.exports = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') return

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env

  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.warn('\n⚠️  [Notarize] Skipping: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set.')
    console.warn('   Set these env vars in CI to enable notarization.\n')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  console.log(`\n🍎 [Notarize] Uploading ${appName}.app to Apple Notary Service…`)
  console.log(`   Apple ID:  ${APPLE_ID}`)
  console.log(`   Team ID:   ${APPLE_TEAM_ID}`)
  console.log(`   App path:  ${appPath}\n`)

  try {
    await notarize({
      tool:                   'notarytool',
      appPath,
      appleId:                APPLE_ID,
      appleIdPassword:        APPLE_APP_SPECIFIC_PASSWORD,
      teamId:                 APPLE_TEAM_ID,
    })
    console.log('   ✅ Notarization approved — ticket stapled into app bundle.\n')
  } catch (err) {
    console.error(`   ❌ Notarization failed: ${err.message}`)
    throw err  // fail the build
  }
}
