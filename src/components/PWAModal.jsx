import { useState, useEffect, useRef } from 'react'
import { X, Smartphone, Download, CheckCircle2, Info } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore }   from '../store/toastStore'
import { generatePWABundle, dataUrlToBlob, downloadFile } from '../lib/pwaExporter'

const FILE_ROWS = [
  { key: 'index.html',    label: 'index.html',    desc: 'Full page with PWA meta + SW hook' },
  { key: 'manifest.json', label: 'manifest.json', desc: 'App name, icons, display mode' },
  { key: 'sw.js',         label: 'sw.js',         desc: 'Cache-first service worker' },
  { key: 'icon-192.png',  label: 'icon-192.png',  desc: 'Home-screen icon (192×192)' },
  { key: 'icon-512.png',  label: 'icon-512.png',  desc: 'Splash / store icon (512×512)' },
]

export default function PWAModal() {
  const { schema, setShowPWA } = useBuilderStore()
  const { showToast } = useToastStore()

  const [appName,    setAppName]    = useState(schema?.theme?.brand || 'My App')
  const [bundle,     setBundle]     = useState(null)
  const [downloaded, setDownloaded] = useState(new Set())
  const iconRef = useRef(null)

  // Build bundle whenever appName changes
  useEffect(() => {
    try {
      const b = generatePWABundle(schema, appName)
      setBundle(b)
      setDownloaded(new Set())
    } catch {}
  }, [appName, schema])

  const downloadOne = (key) => {
    if (!bundle) return
    const file = bundle.files[key]
    if (file.dataUrl) {
      downloadFile(key, dataUrlToBlob(file.dataUrl), file.mimeType)
    } else {
      downloadFile(key, file.content, file.mimeType)
    }
    setDownloaded(prev => new Set([...prev, key]))
  }

  const downloadAll = () => {
    FILE_ROWS.forEach(({ key }) => downloadOne(key))
    showToast({ title: '📱 PWA bundle downloaded!', body: 'Place all 5 files in the same folder and host via HTTPS.', type: 'success' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
            <Smartphone size={18} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">Generate Mobile App</h2>
            <p className="text-xs text-gray-500">Download your design as an installable PWA</p>
          </div>
          <button
            onClick={() => setShowPWA(false)}
            className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* App name */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              App Name
            </label>
            <input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="My App"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                text-sm text-white placeholder-gray-500 outline-none
                focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Icon preview */}
          {bundle && (
            <div className="flex items-center gap-4">
              <img
                ref={iconRef}
                src={bundle.icon192DataUrl}
                alt="App icon preview"
                className="w-16 h-16 rounded-2xl shadow-lg border border-gray-700"
              />
              <div>
                <p className="text-sm font-semibold text-white">{bundle.appName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Auto-generated icon from your brand color</p>
              </div>
            </div>
          )}

          {/* Files list */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Files
            </label>
            <div className="space-y-1.5">
              {FILE_ROWS.map(({ key, label, desc }) => (
                <div key={key}
                  className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-700/50">
                  {downloaded.has(key)
                    ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    : <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-200">{label}</p>
                    <p className="text-[11px] text-gray-500 truncate">{desc}</p>
                  </div>
                  <button
                    onClick={() => downloadOne(key)}
                    disabled={!bundle}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                      bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed">
                    <Download size={11} />
                    {downloaded.has(key) ? 'Re-download' : 'Download'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment note */}
          <div className="flex gap-2.5 bg-indigo-950/50 border border-indigo-800/40 rounded-xl p-3.5">
            <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400 space-y-1">
              <p className="text-indigo-300 font-semibold">Deployment Instructions</p>
              <p>1. Place all 5 files in the <span className="font-mono text-gray-300">same folder</span>.</p>
              <p>2. Host on any HTTPS server (GitHub Pages, Netlify, Vercel).</p>
              <p>3. Open in Chrome/Safari → browser shows <span className="text-gray-300">"Add to Home Screen"</span>.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button
            onClick={() => setShowPWA(false)}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-400
              hover:text-white hover:bg-gray-800 transition-colors border border-gray-700">
            Cancel
          </button>
          <button
            onClick={downloadAll}
            disabled={!bundle}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl
              text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600
              hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-sm
              disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} />
            Download All (5 files)
          </button>
        </div>
      </div>
    </div>
  )
}
