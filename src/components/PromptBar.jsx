import { useState, useRef } from 'react'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore }   from '../store/toastStore'
import { promptToSchema }  from '../lib/promptEngine'

const EXAMPLES = [
  'A dark music portfolio for a DJ named Aria',
  'Modern restaurant landing page with a booking menu',
  'SaaS startup homepage with pricing and testimonials',
  'Health & wellness clinic with contact form',
  'E-commerce fashion brand with a bold hero',
]

export default function PromptBar() {
  const { setSchema } = useBuilderStore()
  const { showToast } = useToastStore()

  const [value,       setValue]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [showChips,   setShowChips]  = useState(false)
  const inputRef = useRef(null)

  const generate = () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setShowChips(false)

    // Simulate a brief "thinking" delay for perceived quality
    setTimeout(() => {
      try {
        const { schema, meta } = promptToSchema(trimmed)
        setSchema(schema)
        showToast({
          title: `✨ Generated "${meta.name}"`,
          body:  `${meta.count} components · ${meta.industry} layout`,
          type:  'success',
        })
      } catch {
        showToast({ title: 'Generation failed', body: 'Try a different prompt', type: 'error' })
      } finally {
        setLoading(false)
      }
    }, 420)
  }

  const pick = (ex) => {
    setValue(ex)
    setShowChips(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="relative px-4 py-2.5 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
      <div className="max-w-3xl mx-auto flex gap-2 items-center">

        <div className="relative flex-1">
          <Sparkles
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setShowChips(true)}
            onBlur={() => setTimeout(() => setShowChips(false), 150)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="Describe what you want to build…"
            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700
              rounded-lg text-sm text-white placeholder-gray-500 outline-none
              focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
          />

          {/* Example chips dropdown */}
          {showChips && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800 border border-gray-700
              rounded-xl shadow-2xl z-50 overflow-hidden">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest px-3 pt-2.5 pb-1.5 font-semibold">
                Examples
              </p>
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onMouseDown={() => pick(ex)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/60
                    hover:text-white flex items-center gap-2 transition-colors">
                  <ChevronDown size={12} className="text-indigo-400 rotate-[-90deg] flex-shrink-0" />
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={generate}
          disabled={!value.trim() || loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold
            bg-gradient-to-r from-indigo-600 to-violet-600
            hover:from-indigo-500 hover:to-violet-500
            text-white transition-all shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : <Sparkles size={13} />}
          Generate
        </button>
      </div>
    </div>
  )
}
