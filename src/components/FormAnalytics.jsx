import { X, Download, Trash2, BarChart3, FileText } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'

export default function FormAnalytics() {
  const { formSubmissions, clearFormSubmissions, setShowFormAnalytics } = useBuilderStore()

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(formSubmissions, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'form-submissions.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const fmt = (ts) => {
    try { return new Date(ts).toLocaleString() } catch { return ts }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && setShowFormAnalytics(false)}>

      <div
        className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl"
        style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <BarChart3 size={15} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">Form Analytics</h2>
            <p className="text-[10px] text-gray-500">
              {formSubmissions.length} submission{formSubmissions.length !== 1 ? 's' : ''} captured
            </p>
          </div>
          <div className="flex items-center gap-2">
            {formSubmissions.length > 0 && (
              <>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                  <Download size={11} />
                  Export JSON
                </button>
                <button
                  onClick={clearFormSubmissions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors">
                  <Trash2 size={11} />
                  Clear
                </button>
              </>
            )}
            <button
              onClick={() => setShowFormAnalytics(false)}
              className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {formSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                <FileText size={22} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">No submissions yet</p>
              <p className="text-gray-700 text-xs max-w-xs leading-relaxed">
                Open Preview mode and submit your contact form — each submission is captured here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {[...formSubmissions].reverse().map((sub, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {sub.page || 'Unknown page'}
                    </span>
                    {sub.endpoint && (
                      <span className="text-[10px] text-gray-600 font-mono truncate max-w-xs">{sub.endpoint}</span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-600 flex-shrink-0">{fmt(sub.ts)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(sub.data || {}).map(([k, v]) => (
                      <div key={k} className="bg-gray-800/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{k}</p>
                        <p className="text-xs text-gray-300 truncate">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
